const { expect } = require("chai");

const globals = require("./test_globals");
const trading = require("./trading");
const utils = require("./utils");
const widget = require("./widget");

const ORDERS_TITLE = "Orders";
const WIDGET = { [ORDERS_TITLE]: "orders-widget" };

const ALL = "ALL";
const ACTIVE = "ACTIVE";
const FINISHED = "FINISHED";
const BASIC = "BASIC";
const EXPANDED = "EXPANDED";
const CANCEL = "CANCEL";
const DELETE = "DELETE";

const ACTIVE_STATUS = [ACTIVE, "PARTIALLY FILLED"];

const ORDERS_WIDGET = ".orders-widget";
const ORDERS_HEADER = `${ORDERS_WIDGET} .orderPanel-header`;
const ORDERS_BODY = `${ORDERS_WIDGET} .orderPanel-body`;
const ORDERS_FOOTER = `${ORDERS_WIDGET} .orderPanel-footer`;
const VIEW_SELECTOR = `${ORDERS_HEADER} button.icon--expand`;
const ORDERS_EXPANDED = `${ORDERS_BODY} .panel`;
const ORDERS_BASIC = `${ORDERS_BODY} .order`;

const ORDER_TYPES = {
  LIMIT: "LIMIT",
  MARKET: "MARKET",
  "MAN OFFSET": "MAN OFFSET",
  "STOP LIMIT": "STOP WITH LIMIT",
  "STOP MARKET": "STOP WITH MARKET",
  ICEBERG: "ICEBERG",
  OCO: ["LIMIT", "STOP WITH MARKET"],
  "RE TRADE": "RE_TRADE",
};

async function popout(page, opts = {}) {
  return await widget.popoutWidget(page, ORDERS_TITLE, ORDERS_TITLE, {
    viewport: { height: 500, width: 500 },
    ...opts,
  });
}

async function selectPanel(page, panel, options = {}) {
  if (await page.$(`${ORDERS_HEADER} .current`)) {
    const currentId = await page.innerText(`${ORDERS_HEADER} .current`);
    if (currentId && currentId.toUpperCase() === panel.toUpperCase()) {
      return true;
    }
  }
  let selector;
  if (panel.toUpperCase() === ACTIVE) {
    selector = `${ORDERS_HEADER} #todasLeftTab`;
  } else if (panel.toUpperCase() === FINISHED) {
    selector = `${ORDERS_HEADER} button:nth-child(2)`;
  } else if (panel.toUpperCase() === ALL) {
    selector = `${ORDERS_HEADER} #propiasTab`;
  } else {
    utils.debug(`selectPanel: unknown panel ${panel}`);
    return false;
  }
  const clickRet = await utils.click(page, selector);
  await utils.sleep(options.wait || 200);
  return clickRet;
}

async function isExpandedView(page) {
  return (await basicViewOnly(page))
    ? false
    : (await page.$(ORDERS_EXPANDED)) !== null;
}

async function isBasicView(page) {
  return (await basicViewOnly(page))
    ? true
    : (await page.$(ORDERS_BASIC)) !== null;
}

async function basicViewOnly(page) {
  return (await page.$(VIEW_SELECTOR)) === null;
}

async function selectView(page, view, options = {}) {
  if (!(await isExpandedView(page)) && !(await isBasicView(page))) {
    utils.debug(`selectView:  cannot detect view, no visible orders`);
    return false;
  }
  const expanded = view === EXPANDED;
  const basic = view === BASIC;
  if (!expanded && !basic) {
    utils.debug(`selectView: unknown view ${view}`);
    return false;
  }
  return await utils.timer(
    async () => {
      if (
        (basic && (await isBasicView(page))) ||
        (expanded && (await isExpandedView(page)))
      ) {
        return true;
      }
      await utils.click(page, VIEW_SELECTOR);
      await utils.sleep(options.wait || 100);
      return false;
    },
    {
      timeout: options.timeout || 3000,
      message: `selectView: ${view} timed out`,
    }
  );
}

async function orderSelectorIndex(page, panel, tradeId) {
  let lastTradeId,
    moreOrders = true;
  await utils.scrollToTop(page, ORDERS_BODY);
  let allOrders = [];
  while (moreOrders) {
    const orders = await ordersDetails(page, {
      continueFromPosition: true,
      limit: 20,
      pageLimit: 1,
      panel: panel,
    });
    for (let order of orders) {
      if (!allOrders.find((obj) => obj.tradeId === order.tradeId)) {
        allOrders.push(order);
      }
    }
    const idx = orders.findIndex((obj) => obj.tradeId === tradeId);
    if (idx !== -1) {
      return idx + 1;
    }
    if (
      !orders.length ||
      lastTradeId === (lastTradeId = orders.slice(-1)[0].tradeId)
    ) {
      moreOrders = false;
    }
  }
  await utils.scrollToTop(page, ORDERS_BODY);
  utils.debug(
    `orderSelectorIndex: failed to find ${tradeId}, allOrders=${JSON.stringify(
      allOrders
    )}`
  );
  return 0;
}

async function editOrder(page, panel, tradeId, options = {}) {
  if (!(await selectPanel(page, panel))) {
    utils.debug(`editOrder: cannot select panel ${panel}`);
    return false;
  }
  let editSelector, amountSelector, priceSelector, confirmSelector;
  if (options.view && !(await selectView(page, options.view))) {
    utils.debug(`editOrder: cannot select view ${options.view}`);
    return false;
  }
  const idx = await orderSelectorIndex(page, panel, tradeId);
  if (!idx) {
    utils.debug(`editOrder: cannot find idx for ${tradeId}`);
    return false;
  }
  if (await isBasicView(page)) {
    editSelector = `${ORDERS_BODY} .order:nth-child(${idx}) .fa-pencil-alt`;
    amountSelector = `${ORDERS_BODY} .order:nth-child(${idx}) .quantity`;
    priceSelector = `${ORDERS_BODY} .order:nth-child(${idx}) .price`;
    const confirm = options.confirm === false ? "cancel" : "confirm";
    confirmSelector = `${ORDERS_BODY} .order:nth-child(${idx}) .${confirm}`;
  } else if (await isExpandedView(page)) {
    editSelector = `${ORDERS_BODY} .panel:nth-child(${idx}) .panel__head .panel__action-button`;
    amountSelector = "#offer-ammount";
    priceSelector = "#offer-price_price";
    confirmSelector =
      options.confirm === false
        ? "#offerForm .cancel-modal"
        : "#offerForm .submit-button";
  } else {
    utils.debug(
      `editOrder: view ${options.view} not visible ${await isBasicView(
        page
      )} ${await isExpandedView(page)}`
    );
    return false;
  }
  const orderStatus = await status(page, idx);
  if (
    orderStatus &&
    orderStatus.toUpperCase() === ACTIVE &&
    (await utils.click(page, editSelector)) &&
    (!options.amount ||
      (await trading.fillAmount(page, amountSelector, options.amount))) &&
    (await trading.fillPrice(page, priceSelector, options))
  ) {
    return await utils.click(page, confirmSelector);
  }
  utils.debug(
    `editOrder: ${orderStatus} failed to click, fill amount or price ${JSON.stringify(
      options
    )}`
  );
  return false;
}

async function cancelDeleteOrder(page, panel, tradeId, type, confirm) {
  if (!(await selectPanel(page, panel))) {
    utils.debug(`cancelDeleteOrder: cannot select panel ${panel}`);
    return false;
  }
  const button = confirm ? ".btn-confirm" : ".btn-cancel";
  const idx = await orderSelectorIndex(page, panel, tradeId);
  if (!idx) {
    return false;
  }
  const orderStatus = await status(page, idx);
  const statusTest =
    orderStatus &&
    (type === CANCEL
      ? ACTIVE_STATUS.includes(orderStatus.toUpperCase())
      : orderStatus.toUpperCase() !== ACTIVE);
  let selector;
  if (await isBasicView(page)) {
    selector = `${ORDERS_BODY} .order:nth-child(${idx}) .fa-times-circle`;
  } else if (await isExpandedView(page)) {
    const activeSuffix = type === CANCEL ? ":nth-child(3)" : "";
    selector = `${ORDERS_BODY} .panel:nth-child(${idx}) .panel__head .panel__action-button${activeSuffix}`;
  }
  if (idx && statusTest && (await utils.click(page, selector))) {
    const confirmSelector = `.jconfirm-box-container ${button}`;
    if (await page.$(confirmSelector)) {
      return await utils.click(page, confirmSelector, { timeout: 2000 });
    }
    return true;
  }
  utils.debug(`cancelDeleteOrder: failed ${tradeId} ${orderStatus} idx ${idx}`);
  return false;
}

async function cancelOrder(page, panel, tradeId, confirm = true) {
  return await cancelDeleteOrder(page, panel, tradeId, CANCEL, confirm);
}

async function deleteOrder(page, panel, tradeId) {
  return await cancelDeleteOrder(page, panel, tradeId, DELETE);
}

async function cancelAllOrders(page) {
  return await utils.click(page, `${ORDERS_FOOTER} .cancel-button`);
}

async function clearAllOrders(page, options = {}) {
  return await utils.timer(
    async () => {
      return (
        (await selectPanel(page, ALL)) &&
        (await utils.click(page, `${ORDERS_HEADER} .icon--clear`)) &&
        (await page.$$(`${ORDERS_BODY} > div > div > div > div`)).length === 0
      );
    },
    {
      timeout: options.timeout || 3000,
      delay: options.wait || 100,
      message: "clearAllOrders: timed out",
    }
  );
}

async function tradeId(page, idx = 1) {
  const basicSelector = `${ORDERS_BODY} div:nth-child(${idx}) .order-body`;
  const expandedSelector = `${ORDERS_EXPANDED}:nth-child(${idx}) .panel__footer span.id`;
  if ((await isExpandedView(page)) && (await page.$(expandedSelector))) {
    return await utils.innerText(page, expandedSelector, { timeout: 2000 });
  } else if ((await isBasicView(page)) && (await page.$(basicSelector))) {
    const bodyText = await utils.innerText(page, basicSelector, {
      timeout: 2000,
    });
    if (bodyText && bodyText.split("\n").length > 2) {
      return bodyText.split("\n")[2];
    }
  }
  return null;
}

async function status(page, idx = 1) {
  let details;

  if (await isExpandedView(page)) {
    details = await orderExpandedDetails(page, idx);
  } else if (await isBasicView(page, idx)) {
    details = await orderBasicDetails(page, idx);
  }
  if (details) {
    return details.status;
  }
  return null;
}

async function waitForOrderTrade(page, prevId, options = {}) {
  let tradeIdOrder = 0;
  return (await selectPanel(page, options.panel || ALL)) &&
    (await utils.timer(
      async () => {
        return (tradeIdOrder = utils.tradeId(await tradeId(page))) > prevId;
      },
      {
        timeout: options.timeout || 5000,
        message: `waitForOrderTrade: ${prevId} timed out`,
      }
    ))
    ? tradeIdOrder
    : 0;
}

async function orderRemoved(page, panel, tradeId, options = {}) {
  return await utils.timer(
    async () => {
      return !(await orderSelectorIndex(page, panel, tradeId));
    },
    {
      timeout: options.timeout || 3000,
      message: `orderRemoved: ${panel} ${tradeId} timed out`,
    }
  );
}

async function ordersDetails(page, options = {}) {
  const limit = options.limit || 5;
  const panel = options.panel || ALL;
  let allResults = [];
  let selector;
  let detailFunction;

  if (!(await selectPanel(page, panel))) {
    utils.debug(`ordersDetails: cannot select orders panel ${panel}`);
    return allResults;
  }
  if (options.view && !(await selectView(page, options.view))) {
    utils.debug(`ordersDetails: cannot select view ${options.view}`);
    return allResults;
  }

  if (await isExpandedView(page)) {
    selector = ORDERS_EXPANDED;
    detailFunction = orderExpandedDetails;
  } else if (await isBasicView(page)) {
    selector = ORDERS_BASIC;
    detailFunction = orderBasicDetails;
  } else {
    utils.debug(`ordersDetails: no expandedSelector or basicSelector found`);
    return allResults;
  }

  if (!options.continueFromPosition) {
    await utils.scrollToTop(page, ORDERS_BODY);
  }
  let nextOrder,
    numPages = 1,
    moreOrders = true;
  while (moreOrders && (await page.$(selector))) {
    moreOrders = false;
    let idx = 1;
    while ((nextOrder = await detailFunction(page, idx))) {
      if (!allResults.find((obj) => obj.tradeId === nextOrder.tradeId)) {
        allResults.push(nextOrder);
        moreOrders = true;
      }
      if (allResults.length >= limit) {
        moreOrders = false;
      }
      idx += 1;
    }
    if (moreOrders && numPages < (options.pageLimit || numPages + 1)) {
      await utils.scrollByPage(page, ORDERS_BODY, 1);
      numPages += 1;
    }
  }
  if (!options.continueFromPosition) {
    await utils.scrollToTop(page, ORDERS_BODY);
  }
  return allResults;
}

async function orderBasicDetails(page, idx) {
  const selector = `${ORDERS_BASIC}:nth-child(${idx}) .order-body`;
  let selectorText;
  if (
    !(await page.$(selector)) ||
    !(selectorText = await utils.innerText(page, selector, { timeout: 300 }))
  ) {
    return null;
  }

  let amount, rate;
  const lines = selectorText.split("\n");

  const lMatch = lines[1].match(/ \d/);
  let status = lines[1].split(" ")[0];
  if (lMatch) {
    status = lines[1].slice(0, lMatch.index);
    const splitChar = lines[1].includes("@") ? "@" : "/";
    amount = lines[1].slice(lMatch.index).split(splitChar)[0].trim();
    rate = lines[1].slice(lMatch.index).split(splitChar)[1].trim();
  }

  return {
    type: BASIC,
    status: status,
    symbol: lines[0].split(" ")[0],
    tenor: lines[0].split(" ")[1],
    side: lines[0].split(" ")[2],
    amount: amount,
    rate: rate,
    orderType: lines[0].split(" ").splice(3).join(" "),
    tradeId: lines[2],
  };
}

async function orderExpandedDetails(page, idx) {
  let selector, selectorText, line, status, reqRate;
  const orderSelector = `${ORDERS_EXPANDED}:nth-child(${idx})`;

  selector = `${orderSelector} .panel__head`;
  if (
    !(await page.$(selector)) ||
    !(selectorText = await utils.innerText(page, selector, { timeout: 300 }))
  ) {
    return null;
  }
  let panelHead = selectorText.split("\n")[0];
  const symbol = panelHead.split(" ").slice(0, 3).join(" ");
  const tenor = panelHead.split(" ").slice(3, -1).join(" ");
  const side = panelHead.split(" ").slice(-1)[0];

  selector = `${orderSelector} .panel__head span span`;
  if (
    !(await page.$(selector)) ||
    !(status = await utils.innerText(page, selector, { timeout: 300 }))
  ) {
    return null;
  }

  selector = `${orderSelector} .panel__body`;
  if (
    !(await page.$(selector)) ||
    !(selectorText = await utils.innerText(page, selector, { timeout: 300 }))
  ) {
    return null;
  }
  const orderDetails = selectorText.split("\n");
  line = orderDetails[3].split(" ");
  const reqAmount = line[0];
  const reqCcy = line[1].split("@")[0];
  if (line[1].includes("@")) {
    reqRate = line[1].split("@")[1];
  }
  line = orderDetails[4].split(" ");
  const fillAmount = line[0];
  const fillCcy = line[1].split("@")[0];
  const fillRate = line[1].split("@")[1];
  const reqTime = orderDetails[7];
  const fillTime = orderDetails[7];

  selector = `${orderSelector} .panel__footer span.limit`;
  if (
    !(selectorText = await utils.innerText(page, selector, { timeout: 300 }))
  ) {
    return null;
  }
  const orderType = selectorText.split(" ").slice(0, -1).join(" ");
  const tif = selectorText.split(" ").slice(-1)[0];

  return {
    type: EXPANDED,
    status: status,
    symbol: symbol,
    tenor: tenor,
    side: side,
    reqAmount: reqAmount,
    reqCcy: reqCcy,
    reqTime: reqTime,
    reqRate: reqRate,
    fillAmount: fillAmount,
    fillCcy: fillCcy,
    fillRate: fillRate,
    fillTime: fillTime,
    orderType: orderType,
    tif: tif,
    tradeId: await tradeId(page, idx),
  };
}

async function expectOrderDetails(page, index, prevId, options = {}) {
  const views = (await basicViewOnly(page))
    ? [BASIC]
    : options.views || [EXPANDED, BASIC];
  const panel = options.panel || ALL;
  const limit = index + 1;
  for (let view of views) {
    expect(
      await waitForOrderTrade(page, prevId, { panel: panel }),
      "waitForOrderTrade"
    ).to.not.equal(0);
    const allOrderDetails = await ordersDetails(page, {
      panel: panel,
      limit: limit,
      view: view,
    });
    expect(
      allOrderDetails.length,
      JSON.stringify(allOrderDetails),
      "allOrderDetails"
    ).to.be.at.least(limit);
    expect(await isBasicView(page), "isBasicView").to.equal(view === BASIC);
    expect(await isExpandedView(page), "isExpandedView").to.equal(
      view === EXPANDED
    );
    expectDetails(allOrderDetails[index], options);
  }
}

function expectDetails(orderDetail, options = {}) {
  const statusRegex = new RegExp(
    options.status.toString().toUpperCase().replaceAll("/", "")
  );

  const errMessage = `options=${JSON.stringify(
    options
  )} orderDetail=${JSON.stringify(orderDetail)} `;

  expect(orderDetail, "orderDetail").to.not.be.undefined;
  expect(orderDetail.status.toUpperCase(), errMessage).to.match(statusRegex);
  expect(
    orderDetail.symbol.replaceAll(" ", "").toUpperCase(),
    errMessage
  ).to.equal(options.symbol.toUpperCase());
  if (options.tenor.toUpperCase() === "SPOT") {
    expect(orderDetail.tenor.toUpperCase(), errMessage).to.be.oneOf([
      trading.tenorOpt(options.tenor).toUpperCase(),
      "SPOT",
    ]);
  } else {
    expect(orderDetail.tenor.toUpperCase(), errMessage).to.equal(
      trading.tenorOpt(options.tenor).toUpperCase()
    );
  }
  expect(orderDetail.side.toUpperCase(), errMessage).to.equal(
    utils.side(options.side, options.termSymbol).toUpperCase()
  );
  expect(
    ORDER_TYPES[options.orderType.replaceAll("_", " ").toUpperCase()],
    errMessage
  ).to.contain(orderDetail.orderType);

  if (orderDetail.reqAmount) {
    if (
      parseFloat(orderDetail.reqAmount) -
        parseFloat(options.amount.toLocaleString(globals.LOCALE)) >
      1
    ) {
      expect(orderDetail.reqAmount, errMessage).to.equal(
        options.amount.toLocaleString(globals.LOCALE)
      );
    }
  }

  if (orderDetail.reqCcy) {
    const reqCcy = options.termSymbol
      ? options.symbol.split("/")[1]
      : options.symbol.split("/")[0];
    expect(orderDetail.reqCcy.toUpperCase(), errMessage).to.equal(
      reqCcy.toUpperCase()
    );
    expect(orderDetail.fillCcy.toUpperCase(), errMessage).to.equal(
      reqCcy.toUpperCase()
    );
  }

  if (orderDetail.tif) {
    expect(orderDetail.tif.toUpperCase(), errMessage).to.equal(
      options.tif.toUpperCase()
    );
  }
}

module.exports = {
  ACTIVE,
  ALL,
  BASIC,
  EXPANDED,
  FINISHED,
  ORDER_TYPES,
  WIDGET,
  basicViewOnly,
  cancelOrder,
  cancelAllOrders,
  clearAllOrders,
  deleteOrder,
  editOrder,
  expectDetails,
  expectOrderDetails,
  ordersDetails,
  orderRemoved,
  popout,
  selectPanel,
  selectView,
  status,
  waitForOrderTrade,
};

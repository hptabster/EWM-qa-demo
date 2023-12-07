const { expect } = require("chai");

const orders = require("./orders");
const trading = require("./trading");
const utils = require("./utils");
const widget = require("./widget");

const BLOTTER_TITLE = "Blotter";
const WIDGET = { [BLOTTER_TITLE]: "blotter-widget" };

const EXPORT_FORMATS = ["csv"];
const EXPORT_TO_FORMATS = ["csv", "pdf"];
const TRADES = "TRADES";
const YESTERDAY = "YESTERDAY";
const TODAY_ORDERS = "TODAY_ORDERS";
const HISTORY = "HISTORY";
const BLOTTER_WIDGET = ".blotter-widget";
const NO_ROWS = `${BLOTTER_WIDGET} .ag-overlay-no-rows-center`;
const VIEWS = {
  TRADES: `${BLOTTER_WIDGET} .blotter__settings a:nth-child(1)`,
  YESTERDAY: `${BLOTTER_WIDGET} .blotter__settings a:nth-child(2)`,
  TODAY_ORDERS: `${BLOTTER_WIDGET} .blotter__settings a:nth-child(3)`,
  HISTORY: `${BLOTTER_WIDGET} .blotter__settings a:nth-child(4)`,
};

async function popout(page, opts = {}) {
  return await widget.popoutWidget(page, BLOTTER_TITLE, BLOTTER_TITLE, {
    viewport: { height: 1000, width: 1500 },
    ...opts,
  });
}

async function resetView(page, view) {
  utils.debug(`resetView: ${view}`);
  if (!(await selectView(page, view)) || !(await selectColumns(page))) {
    utils.debug(`resetView: Failed to selectView or selectColumns`);
    return false;
  }
  // FXPRO-2023 - Blotter - Unable to reset the columns
  return true;
  // const viewport = `${BLOTTER_WIDGET} .ag-header-viewport`;
  // const sections = await utils.viewportSections(page, viewport);
  // await utils.shiftToLeft(page, viewport);
  // for (let i = 0; i < sections; i++) {
  //   if (
  //     (await utils.click(
  //       page,
  //       `//div[contains(@class, "blotter-widget")] //span[contains(text(), 'ID')] /../..//span[contains(@class,"ag-header-cell-menu-button")]`
  //     )) &&
  //     (await utils.click(page, "//span[contains(text(), 'Reset Columns')]"))
  //   ) {
  //     utils.debug(`resetView: Resetting columns`);
  //     await utils.shiftToLeft(page, viewport);
  //     return true;
  //   }
  //   await utils.shiftBySections(page, viewport, 1);
  // }
  // utils.debug(`resetView: Failed to reset the columns`);
  // return false;
}

async function selectView(page, view) {
  return (
    view in VIEWS &&
    (await utils.click(page, VIEWS[view], { delay: 50, timeout: 3000 }))
  );
}

async function historyDateRange(page, from, to) {
  try {
    await page.fill(".blotter__settings [name=initial]", from, {
      timeout: 1000,
    });
    await page.fill(".blotter__settings [name=final]", to, { timeout: 1000 });
  } catch (err) {
    return false;
  }
  return true;
}

function cdateToDate(cdate) {
  let t = 0;
  return cdate.replace(/ /g, (m) => (++t === 2 ? "." : m));
}

async function waitForBlotterTrade(page, prevTradeDate, timeout = 5000) {
  let tradeDate = 0;
  await utils.timer(
    async () => {
      const allDetails = await tradesDetails(page, { limit: 1 });
      tradeDate =
        allDetails.length && "creationDate" in allDetails[0]
          ? new Date(cdateToDate(allDetails[0].creationDate))
          : 0;
      return tradeDate > prevTradeDate;
    },
    {
      timeout: timeout,
      delay: 50,
      message: `waitForBlotterTrade: ${prevTradeDate} timed out`,
    }
  );
  return tradeDate;
}

async function selectColumns(page, columns = ["ALL"]) {
  utils.debug(`selectColumns: ${columns}`);
  const selector = `${BLOTTER_WIDGET} select[class="column-select"]`;
  await page.click(selector);
  return utils.selectOption(page, selector, columns, { timeout: 1000 });
}

async function exportTo(page, format, path) {
  format = format.toLowerCase();
  const savedPath = path
    ? path
    : utils.urlFile(page, { extension: format, prefix: "/tmp/" });
  let downloadCompleted = false;

  page.once("dialog", async (dialog) => {
    utils.debug(dialog.message);
    await dialog.dismiss();
  });

  page.once("download", async (download) => {
    utils.debug(`download savedPath: ${savedPath}`);
    await download.saveAs(savedPath);
    await download.path();
    utils.debug(`download completed`);
    downloadCompleted = true;
  });

  const els = await page.$$(
    `${BLOTTER_WIDGET} .blotter__settings .column-select`
  );
  if (
    els.length > 1 &&
    EXPORT_TO_FORMATS.includes(format) &&
    (await els[1].click({ timeout: 1000 })) === undefined &&
    (await els[1].selectOption(format, { delay: 50, timeout: 1000 })).includes(
      format
    )
  ) {
    await utils.sleep(2000);
    return downloadCompleted ? savedPath : null;
  }
  return null;
}

async function exportAllRows(page, format, path, opts = {}) {
  format = format.toLowerCase();
  const idx = EXPORT_FORMATS.findIndex((o) => o === format);
  const savedPath = path
    ? path
    : utils.urlFile(page, { extension: format, prefix: "/tmp/" });
  let downloadCompleted = false;

  page.once("download", async (download) => {
    utils.debug(`download savedPath: ${savedPath}`);
    await download.saveAs(savedPath);
    const path = await download.path();
    utils.debug(`download completed ${path}`);
    downloadCompleted = true;
  });

  if (
    (await utils.click(page, ".ag-row-first", {
      button: "right",
      delay: opts.delay || 50,
    })) &&
    (await utils.click(
      page,
      ".ag-popup div:nth-child(6) .ag-menu-option-text",
      {
        delay: 50,
        timeout: 1000,
      }
    )) &&
    idx >= 0 &&
    (await utils.click(
      page,
      `.blotter__table div:nth-child(7) :nth-child(${
        idx + 2
      }) .ag-menu-option-text`,
      { delay: 50, timeout: 1000 }
    ))
  ) {
    await utils.sleep(2000);
    return downloadCompleted ? savedPath : null;
  }
  return null;
}

async function copyToClipboard(page, opts = {}) {
  if (
    (await utils.click(page, ".ag-row-first", {
      button: "right",
      delay: opts.delay || 50,
    })) &&
    (await utils.sleep(opts.wait || 0)) === undefined &&
    (await utils.click(page, ".ag-popup div:nth-child(3) .ag-menu-option-text"))
  ) {
    return await page.evaluate(async () => {
      return navigator.clipboard.readText();
    });
  }
  return "";
}

async function selectTrades(page, trades = "ALL") {
  return (
    typeof trades === "string" &&
    trades.toUpperCase() === "ALL" &&
    (await utils.selectCheckbox(
      page,
      `${BLOTTER_WIDGET} .ag-header-select-all .ag-checkbox-input`,
      true
    ))
  );
}

async function copyAllTrades(page, timeout = 3000) {
  if (await page.$(NO_ROWS)) {
    return [];
  }
  const selector = `${BLOTTER_WIDGET} .ag-header-select-all .ag-checkbox-input`;
  let clipText = "";
  const delay = 50;
  await utils.timer(
    async () => {
      return (
        (await utils.selectCheckbox(page, selector, true)) &&
        (clipText = await copyToClipboard(page, { delay: delay })) &&
        (await utils.selectCheckbox(page, selector, false)) &&
        clipText.length >= 10
      );
    },
    { timeout: timeout, delay: delay, message: "copyAllTrades: timed out" }
  );
  return clipText.split("\n");
}

function blotterDetails(orderHeader, orderValues) {
  const header = orderHeader.replace("\r", "").split("\t");
  const values = orderValues.replace("\r", "").split("\t");
  let retVal = {};
  for (const headerName of header) {
    if (headerName === "B/S") {
      retVal.side = values[header.indexOf("B/S")];
    } else if (headerName.includes("Amount")) {
      const amountArr = values[header.indexOf(headerName)].split(" ");
      retVal[headerName.toCamelCase()] = amountArr[0];
      if (amountArr.length > 1) {
        retVal[headerName.toCamelCase() + "Ccy"] = amountArr[1];
      }
    } else {
      retVal[headerName.toCamelCase()] = values[header.indexOf(headerName)];
    }
  }
  return retVal;
}

async function tradesDetails(page, opts = {}) {
  let tradesDetails = [];
  const allTrades = await copyAllTrades(page);
  const header = allTrades[0];
  for (let trade of allTrades.slice(1)) {
    tradesDetails.push(blotterDetails(header, trade));
  }
  tradesDetails = tradesDetails.sort((a, b) => b.creationDate - a.creationDate);
  return tradesDetails.slice(0, opts.limit);
}

async function lastTradeDate(page) {
  const lastTrade = await tradesDetails(page, { limit: 1 });
  let t = 0;
  if (!lastTrade.length || !("creationDate" in lastTrade[0])) {
    utils.debug(
      `lastTradeDate: no creationDate in lastTrade=${JSON.stringify(lastTrade)}`
    );
    return new Date();
  }
  utils.debug(`lastTradeDate: ${lastTrade[0].creationDate}`);
  return new Date(
    lastTrade[0].creationDate.replace(/ /g, (m) => (++t === 2 ? "." : m))
  );
}

async function expectBlotterDetails(page, index, prevTradeDate, opts = {}) {
  const view = opts.view || TODAY_ORDERS;
  const limit = opts.limit || index + 1;
  const statusRegex = new RegExp(
    opts.status.toString().toUpperCase().replaceAll("/", "")
  );

  expect(await selectView(page, view), "selectView");
  expect(await selectColumns(page), "selectColumns");
  expect(
    await waitForBlotterTrade(page, prevTradeDate),
    "waitForBlotterTrade"
  ).to.not.equal(0);
  const allDetails = await tradesDetails(page, { limit: limit });
  const blotterDetail = allDetails[index];
  const error = `opts=${JSON.stringify(opts)} blotterDetail=${JSON.stringify(
    blotterDetail
  )}`;

  expect(blotterDetail.status.toUpperCase(), error).to.match(statusRegex);
  expect(blotterDetail.side, error).to.equal(
    utils.side(opts.side, opts.termSymbol)
  );
  expect(blotterDetail.symbol, error).to.equal(opts.symbol);
  expect(utils.volToAmount(blotterDetail.requestedAmount), error).to.equal(
    opts.amount
  );
  const reqCcy = opts.termSymbol
    ? opts.symbol.split("/")[1]
    : opts.symbol.split("/")[0];
  expect(blotterDetail.requestedAmountCcy, error).to.equal(reqCcy);
  expect(
    orders.ORDER_TYPES[opts.orderType.replaceAll("_", " ").toUpperCase()],
    error
  ).to.contain(blotterDetail.orderType.toUpperCase());
  if (opts.tenor.toUpperCase() === "SPOT") {
    expect(blotterDetail.tenor.toUpperCase(), error).to.be.oneOf([
      trading.tenorOpt(opts.tenor).toUpperCase(),
      "SPOT",
    ]);
  } else {
    expect(blotterDetail.tenor.toUpperCase(), error).to.equal(
      trading.tenorOpt(opts.tenor).toUpperCase()
    );
  }
  expect(blotterDetail.tif, error).to.equal(opts.tif);
  if (opts.username) {
    expect(blotterDetail.username.toLowerCase(), error).to.equal(
      opts.username.toLowerCase()
    );
  }
  const fillAmount = opts.termSymbol
    ? Math.abs(utils.volToAmount(blotterDetail.termAmount))
    : Math.abs(utils.volToAmount(blotterDetail.baseAmount));
  if (blotterDetail.requestedAmount === fillAmount) {
    expect(fillAmount, error).to.equal(opts.amount());
  }
}

module.exports = {
  HISTORY,
  TODAY_ORDERS,
  TRADES,
  YESTERDAY,
  WIDGET,
  expectBlotterDetails,
  exportAllRows,
  exportTo,
  historyDateRange,
  lastTradeDate,
  popout,
  resetView,
  selectTrades,
  selectColumns,
  selectView,
  tradesDetails,
  waitForBlotterTrade,
};

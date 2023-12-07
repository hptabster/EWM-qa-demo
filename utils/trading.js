const { expect } = require("chai");

const misc = require("./misc");
const utils = require("./utils");
const widget = require("./widget");

const TRADING_TITLE = "Trading";
const WIDGET = { [TRADING_TITLE]: "trading-widget" };

const SETTINGS = ".trading__header .icon--settings";
const TRADING_WIDGET = ".trading-widget";
const TRADING_TOP = `${TRADING_WIDGET} .trading__tops`;
const TRADING_VIEW = `${TRADING_TOP} .trading__tops-spread-button`;
const TIER_HEADER = `${TRADING_WIDGET} .trading__table-header`;
const BID_TIERS = `${TRADING_WIDGET} .trading__table-bid-container`;
const OFFER_TIERS = `${TRADING_WIDGET} .trading__table-ask-container`;
const TIER_VWAP = `${TRADING_WIDGET} .trading__table-vwap`;
const TIER_CONTAINER = `${TRADING_WIDGET} .trading__table-container`;
const POPOUT = ".trading-box";
const MODAL = ".order-modal";
const BIDOFFER_MODAL_CONFIRM = `${MODAL} [class^="submit-button"]`;
const BIDOFFER_MODAL_CONFIRM_DISABLED = `${MODAL} [class="submit-button-disabled"]`;
const BIDOFFER_POPOUT_CONFIRM = `${POPOUT} [class^="confirm"]`;
const BIDOFFER_MODAL_CLOSE = ".order-modal .close-modal img";
const BIDOFFER_MODAL_CANCEL = `${MODAL} [class^="cancel"]`;
const BIDOFFER_POPOUT_CANCEL = `${POPOUT} [class^="cancel"]`;
const BIDOFFER_MODAL_WARNING = `${MODAL} [class="input--warning"]`;
const BIDOFFER_POPOUT_WARNING = `${POPOUT} [data-testid="rateOffMarketWarning"]`;
const BIDOFFER_MODAL_SUBMIT_WARNING = `${MODAL} [class="submit-button submit-button-warning"]`;
const TENOR_OPTS =
  ".trading__header .trading__header-left-tenor .instrument_select";
const TRADING_AMOUNT = ".trading__body #tradingInput";
const INPUT_ERROR = '[class="input--error"]';

async function popout(page, opts = {}) {
  return await widget.popoutWidget(page, TRADING_TITLE, TRADING_TITLE, {
    wait: 2000,
    viewport: { height: 500, width: 500 },
    ...opts,
  });
}

async function resetSettings(page) {
  return await settings(page, {
    doubleClickOrder: true,
    showSource: false,
    showPeggOnTop: true,
    tradableLevels: true,
  });
}

async function closeSettings(page) {
  return await utils.clickAndHide(page, ".trading__settings > button");
}

async function waitForSettings(page, timeout = 5000) {
  await page.waitForSelector(SETTINGS, { state: "attached", timeout: timeout });
}

async function settings(page, settingopts) {
  if (!(await utils.click(page, SETTINGS, { timeout: 2000 }))) {
    utils.debug(`settings: cannot open settings panel`);
    return (await closeSettings(page)) && false;
  }

  for (let [option, val] of Object.entries(settingopts)) {
    const selector = `input[name="${option}"]`;
    if (await page.$(selector)) {
      if (!(await utils.selectCheckbox(page, selector, val))) {
        utils.debug(`settings: cannot select ${option}`);
        return (await closeSettings(page)) && false;
      }
    }
  }
  return await closeSettings(page);
}

async function tradingViews(page) {
  const tradingViews = [];
  let view;
  while ((view = await utils.innerText(page, TRADING_VIEW))) {
    if (tradingViews.length && view === tradingViews[0]) {
      break;
    }
    tradingViews.push(view);
    await utils.click(page, TRADING_VIEW);
  }
  utils.debug(`tradingViews: ${tradingViews}`);
  return tradingViews;
}

async function selectTradingView(page, tradingView) {
  utils.debug(`selectTradingView: ${tradingView}`);
  return await utils.timer(
    async () => {
      return (
        (await utils.innerText(page, TRADING_VIEW)) === tradingView ||
        ((await utils.click(page, TRADING_VIEW)) && false)
      );
    },
    { timeout: 3000, message: `selectTradingView: ${tradingView} timed out` }
  );
}

async function fillAmount(page, selector, amount, expectAmountError = false) {
  utils.debug(`fillAmount: ${amount} expectAmountError=${expectAmountError}`);
  if (amount === -1) {
    return true;
  }
  const ret = await utils.fillAmount(page, selector, amount);
  let error =
    (await page.isVisible(".trading__tops-error")) ||
    (await page.isVisible(INPUT_ERROR));
  if (expectAmountError) {
    expect(error, `fillAmount ${amount} error`).to.be.true;
    error = false;
  }
  return ret & !error;
}

async function expirationTime(page, opts, expectTimeError = false) {
  const selector = (await page.$("#offerForm #expireDate"))
    ? "#offerForm #expireDate"
    : "#offerForm > div.grid-dates > div > div > div > input";
  const ret = await utils.fillTime(page, selector, opts);
  let error = await page.isVisible(INPUT_ERROR);
  if (expectTimeError) {
    expect(error, `expirationTime: ${JSON.stringify(opts)} error`).to.be.true;
    error = false;
  }
  return ret & !error;
}

async function startingTime(page, opts, expectTimeError = false) {
  const ret =
    (await page.$("//span[contains(text(), 'Starting Date')]")) &&
    (await utils.selectCheckbox(
      page,
      "#offerForm .checkbox-field input[type=checkbox]"
    )) &&
    (await utils.fillTime(
      page,
      "#offerForm > div.grid-dates > div:nth-child(1) > div > div > input",
      opts
    ));
  let error = await page.isVisible(INPUT_ERROR);
  if (expectTimeError) {
    expect(error, `expectTimeError: ${JSON.stringify(opts)} error`).to.be.true;
    error = false;
  }
  return ret & !error;
}

async function changeCurrency(page, ccy) {
  utils.debug(`changeCurrency: ${ccy}`);
  return await utils.timer(
    async () => {
      if (
        (await utils.innerText(
          page,
          ".trading__tops > .trading__tops-amount-field > label"
        )) === ccy
      ) {
        return true;
      }
      await utils.click(page, ".trading__tops-amount-field svg", {
        delay: 100,
      });
      return false;
    },
    { timeout: 3000, delay: 500, message: `changeCurrency: ${ccy} timed out` }
  );
}

async function symbols(page) {
  const instruments = await utils.innerText(
    page,
    ".trading__header #select_symbol"
  );
  return instruments && instruments.split("\n").length
    ? instruments.split("\n").filter((val) => val.includes("/"))
    : [];
}

async function termSymbol(page, symbol) {
  return await changeCurrency(page, symbol.split("/")[1]);
}

async function resetSymbol(page, symbol) {
  return await changeCurrency(page, symbol.split("/")[0]);
}

async function selectSymbol(page, symbol) {
  return await utils.selectSymbol(
    page,
    ".trading__header #select_symbol",
    symbol
  );
}

async function checkTif(page, tif) {
  return !((await page.$(`option[value="${tif}"]`)) === null);
}

async function selectTif(page, tif) {
  utils.debug(`selectTif: ${tif}`);
  const selector = (await page.$("#order-lifetime"))
    ? "#order-lifetime"
    : ".order-options .smaller";
  return await utils.selectOption(page, selector, tif), { timeout: 1000 };
}

async function checkOrderType(page, orderType) {
  return !((await page.$(`option[value="${orderType}"]`)) === null);
}

async function selectOrderType(page, orderType) {
  utils.debug(`selectOrderType: ${orderType}`);
  const selector = (await page.$("#order-type"))
    ? "#order-type"
    : ".order-options .bigger";
  return await utils.selectOption(page, selector, orderType, { timeout: 1000 });
}

async function instrumentMaxAmount(page, symbol, tenor) {
  let amt = 0;
  if (
    !(await selectSymbol(page, symbol)) ||
    !(await selectTenor(page, tenor))
  ) {
    return amt;
  }
  await fillAmount(page, TRADING_AMOUNT, 99000000);
  const errorText = await utils.innerText(
    page,
    ".trading__body .trading__tops-error"
  );
  try {
    amt = parseInt(errorText.split("(")[1].split(")")[0].replaceAll(",", ""));
  } catch {
    void 0;
  }
  return amt;
}

function tenorOpt(tenor) {
  const tenors = {
    SPOT: "sp",
  };

  return tenor.toUpperCase() in tenors
    ? tenors[tenor.toUpperCase()]
    : tenor.split(" ").slice(-1)[0].toLowerCase();
}

async function instrumentInfo(page, symbol) {
  let tenorText,
    views,
    instrumentList = [];
  if (
    !(await selectSymbol(page, symbol)) ||
    !(views = await tradingViews(page)) ||
    !(tenorText = await utils.innerText(
      page,
      ".trading__header .trading__header-left-tenor"
    ))
  ) {
    return [];
  }
  for (const tenor of tenorText
    .split("\n")
    .filter((val) => !val.includes("Tenor"))) {
    const maxAmount = await instrumentMaxAmount(page, symbol, tenor);
    await fillAmount(page, TRADING_AMOUNT, Math.min(maxAmount, 1000000));
    let hasBuyRate = false;
    let hasSellRate = false;
    for (const view of views) {
      await selectTradingView(page, view);
      const info = await tradingInfo(page, { timeout: 250 });
      hasBuyRate = hasBuyRate || (info !== null && !isNaN(info[`buyPrice`]));
      hasSellRate = hasSellRate || (info !== null && !isNaN(info[`sellPrice`]));
    }
    instrumentList.push({
      symbol: symbol,
      tenor: tenor,
      maxAmount: maxAmount,
      hasBuyRate: hasBuyRate,
      hasSellRate: hasSellRate,
      views: views,
    });
  }
  return instrumentList;
}

async function checkCurrentTenor(page, tenor) {
  if (await page.$(TENOR_OPTS)) {
    return (await page.$eval(TENOR_OPTS, (el) => el.value)) === tenor;
  }
  return (
    (await utils.innerText(
      page,
      ".trading__header .trading__header-left-tenor"
    )) === tenor
  );
}

async function selectTenor(page, tenor) {
  utils.debug(`selectTenor: ${tenor}`);
  if (!(await checkCurrentTenor(page, tenor))) {
    return await utils.selectOption(page, TENOR_OPTS, tenorOpt(tenor));
  }
  return true;
}

async function closeBidOffer(page) {
  utils.debug("closeBidOffer");
  return await utils.timer(
    async () => {
      return (
        !(await utils.isVisible(page, BIDOFFER_MODAL_CLOSE)) ||
        (await utils.clickAndHide(page, BIDOFFER_MODAL_CLOSE))
      );
    },
    { timeout: 1000, delay: 10, message: `closeBidOffer: timed out` }
  );
}

async function cancelBidOffer(page) {
  utils.debug("cancelBidOffer");
  const selector = (await page.$(BIDOFFER_MODAL_CANCEL))
    ? BIDOFFER_MODAL_CANCEL
    : BIDOFFER_POPOUT_CANCEL;
  return (
    (await page.$(selector)) !== null &&
    (await utils.clickAndHide(page, selector))
  );
}

async function fillPrice(page, selector, price, opts = {}) {
  utils.debug(`fillPrice: ${JSON.stringify(price)}`);
  const origPrice = await misc.getOfferPrice(page, selector, opts);
  if (!origPrice) {
    utils.debug(`fillPrice: no origPrice`);
    return 0;
  }
  let offerPrice = origPrice;
  if (price.price) {
    offerPrice = price.price;
  } else if (price.offset) {
    offerPrice = (parseFloat(origPrice) + price.offset).toFixed(5);
  } else if (price.offsetPct) {
    offerPrice = (
      parseFloat(origPrice) +
      (parseFloat(origPrice) * price.offsetPct) / 100
    ).toFixed(5);
  }
  utils.debug(`fillPrice: origPrice=${origPrice} offerPrice=${offerPrice}`);
  return (await utils.fill(page, selector, offerPrice.toString(), {
    timeout: 1000,
  }))
    ? offerPrice
    : 0;
}

async function fillStopPrice(page, price) {
  const selector = (await page.$("#offer-price_stop_price"))
    ? "#offer-price_stop_price"
    : 'input[name="stop_price"]';
  return (await page.$(selector)) ? await fillPrice(page, selector, price) : 0;
}

async function fillRatePrice(page, price) {
  const selector = (await page.$("#offer-price_price"))
    ? "#offer-price_price"
    : 'input[name="price"]';
  return (await page.$(selector)) ? await fillPrice(page, selector, price) : 0;
}

async function fillTakeProfitPrice(page, price) {
  const selector = (await page.$("#offer-price_take_profit"))
    ? "#offer-price_take_profit"
    : "input[name='takeProfit']";
  return (await page.$(selector)) ? await fillPrice(page, selector, price) : 0;
}

async function ifDone(page, opts) {
  const selector = "//span[contains(text(), 'If Done')]";
  const checkbox =
    "#offerForm > div.checkbox-field-left > input[type=checkbox]";
  return (
    (await page.$(selector)) &&
    ((await utils.selectCheckbox(page, checkbox)) ||
      (await utils.click(page, selector))) &&
    (await fillTakeProfitPrice(page, {
      price: opts.takeProfitRatePrice,
      offset: opts.takeProfitRateOffset,
      offsetPct: opts.takeProfitRateOffsetPct,
    })) &&
    (await fillStopPrice(page, {
      price: opts.stopLossPrice,
      offset: opts.stopLossRateOffset,
      offsetPct: opts.stopLossRateOffsetPct,
    }))
  );
}

async function bidOfferInfo(page) {
  let info;
  try {
    info = await page.innerText("#offerForm .info-msg", { timeout: 200 });
  } catch (err) {
    return null;
  }

  let infoDetails = {};
  const separators = ["-", "@", "|"];
  const tokens = info.replace(/\s+/g, " ").trim().split(" ");
  for (const [idx, token] of Object.entries(tokens)) {
    const prevToken = idx > 0 ? tokens[idx - 1] : null;
    if (token === "-") {
      infoDetails.orderType = `${tokens.slice(0, idx).join(" ")}`;
      infoDetails.side = null;
      continue;
    }
    if (prevToken === "-") {
      infoDetails.side = token;
      continue;
    }
    if (!separators.includes(token)) {
      if (infoDetails.side) {
        if (!infoDetails.rate && token.includes(".")) {
          infoDetails.rate = token;
        } else if (!infoDetails.amount && utils.volToAmount(token)) {
          infoDetails.amount = token;
        } else if (!infoDetails.ccy) {
          infoDetails.ccy = token;
        } else if (prevToken === "|" && token.includes(".")) {
          infoDetails.limitRate = token;
        }
      }
    }
  }
  return infoDetails;
}

async function bidOfferPopup(page, amount, orderType, opts = {}) {
  utils.debug(`bidOfferPopup: ${amount} ${orderType} ${JSON.stringify(opts)}`);
  let selector;
  if (
    !(await utils.timer(
      async () => {
        return (
          (await page.$(BIDOFFER_MODAL_CONFIRM)) !== null ||
          (await page.$(BIDOFFER_POPOUT_CONFIRM)) !== null
        );
      },
      { timeout: 3000, delay: 10, message: `bidOfferPopup: timed out` }
    ))
  ) {
    return false;
  }

  if (!(await checkOrderType(page, orderType))) {
    utils.debug(`bidOfferPopup: checkOrderType ${orderType} failed`);
    return (await closeBidOffer(page)) && false;
  }

  if (!(await selectOrderType(page, orderType))) {
    utils.debug(`bidOfferPopup: selectOrderType ${orderType} failed`);
    return (await closeBidOffer(page)) && false;
  }

  if (opts.tif) {
    if (!(await checkTif(page, opts.tif))) {
      utils.debug(`bidOfferPopup: checkTif ${opts.tif} failed`);
      return (await closeBidOffer(page)) && false;
    }
    if (!(await selectTif(page, opts.tif))) {
      utils.debug(`bidOfferPopup: selectTif ${opts.tif} failed`);
      return (await closeBidOffer(page)) && false;
    }
  }

  if (opts.expiryOffsetMs || opts.expiryTime) {
    if (
      !(await expirationTime(page, {
        offsetMs: opts.expiryOffsetMs,
        time: opts.expiryTime,
      }))
    ) {
      utils.debug(`bidOfferPopup: expirationTime failed`);
      return (await closeBidOffer(page)) && false;
    }
  }

  if (opts.startOffsetMs || opts.startTime) {
    if (
      !(await startingTime(page, {
        offsetMs: opts.startOffsetMs,
        time: opts.startTime,
      }))
    ) {
      utils.debug(`bidOfferPopup: startingTime failed`);
      return (await closeBidOffer(page)) && false;
    }
  }

  if (
    (opts.ratePrice || opts.rateOffset || opts.rateOffsetPct) &&
    !(await fillRatePrice(page, {
      price: opts.ratePrice,
      offset: opts.rateOffset,
      offsetPct: opts.rateOffsetPct,
    }))
  ) {
    utils.debug(`bidOfferPopup: fillRatePrice failed`);
    return (await closeBidOffer(page)) && false;
  }

  if (
    (opts.stopPrice || opts.stopOffset || opts.stopOffsetPct) &&
    !(await fillStopPrice(page, {
      price: opts.stopPrice,
      offset: opts.stopOffset,
      offsetPct: opts.stopOffsetPct,
    }))
  ) {
    utils.debug(`bidOfferPopup: fillStopPrice failed`);
    return (await closeBidOffer(page)) && false;
  }

  selector = (await page.$(".total-amount #offer-ammount"))
    ? ".total-amount #offer-ammount"
    : ".order-options div:nth-child(1) > div:nth-child(1) > input";
  if (!(await fillAmount(page, selector, amount, opts.expectAmountError))) {
    utils.debug(`bidOfferPopup: fillAmount ${amount} failed for ${selector}`);
    return (await closeBidOffer(page)) && false;
  }

  if (opts.expectAmountError) {
    return await closeBidOffer(page);
  }

  if (opts.showAmount) {
    selector = (await page.$(
      '[class="field offer-ammount iceberg"] #offer-ammount'
    ))
      ? '[class="field offer-ammount iceberg"] #offer-ammount'
      : ".order-options div:nth-child(2) > div:nth-child(2) > input";
    if (
      !(await fillAmount(
        page,
        selector,
        opts.showAmount,
        opts.expectAmountError
      ))
    ) {
      utils.debug(
        `bidOfferPopup: fillAmount iceberg ${opts.showAmount} failed`
      );
      return (await closeBidOffer(page)) && false;
    }
  }

  if (opts.ifDone && !(await ifDone(page, opts.ifDone))) {
    utils.debug(`bidOfferPopup: ifDone failed`);
    return (await closeBidOffer(page)) && false;
  }

  selector = (await page.$(BIDOFFER_MODAL_WARNING))
    ? BIDOFFER_MODAL_WARNING
    : BIDOFFER_POPOUT_WARNING;
  if (opts.expectOffMarketWarning && !(await page.$(selector))) {
    utils.debug(`bidOfferPopup: offMarketWarning failed`);
    return (
      (await closeBidOffer(page)) &&
      expect(true, "No off market warning").to.be.false
    );
  }

  if (opts.confirm === false) {
    return await cancelBidOffer(page);
  }

  selector = (await page.$(BIDOFFER_MODAL_CONFIRM))
    ? BIDOFFER_MODAL_CONFIRM
    : BIDOFFER_POPOUT_CONFIRM;
  await utils.clickAndHide(page, selector, { timeout: 2000 });
  const warnSelector = (await page.$(BIDOFFER_MODAL_SUBMIT_WARNING))
    ? BIDOFFER_MODAL_SUBMIT_WARNING
    : BIDOFFER_POPOUT_CONFIRM;
  if (await page.$(warnSelector)) {
    if (opts.offMarketWarningCancel) {
      return await cancelBidOffer(page);
    }
    return await utils.clickAndHide(page, warnSelector, { timeout: 2000 });
  } else {
    if (opts.expectOffMarketWarning) {
      utils.debug(`bidOfferPopup: offMarketWarning visible in second confirm`);
      expect(true, "Off market warning in second confirm").to.be.false;
    }
  }

  if (
    (await page.$(INPUT_ERROR)) ||
    (await page.$(".row.danger")) ||
    (await utils.isVisible(page, BIDOFFER_MODAL_CONFIRM_DISABLED))
  ) {
    utils.debug(`bidOfferPopup: submit input error failed`);
    return (await closeBidOffer(page)) && false;
  }
  return await closeBidOffer(page);
}

async function termResetSymbol(page, symbol, termSym) {
  utils.debug(`termResetSymbol: ${symbol} ${termSym}`);
  if (
    (termSym && !(await termSymbol(page, symbol))) ||
    (!termSym && !(await resetSymbol(page, symbol)))
  ) {
    return false;
  }
  return true;
}

async function tierInfo(page) {
  function headerValue(header, line, prefix = "") {
    return header.reduce(
      (o, k, i) => ({ ...o, [`${prefix}${k}`]: line[i] }),
      {}
    );
  }

  let tiers = [];
  const tradingContainer = (await page.$(TIER_VWAP))
    ? TIER_VWAP
    : TIER_CONTAINER;
  if (!(await page.$(TIER_HEADER)) && !(await page.$(tradingContainer))) {
    return tiers;
  }
  if ((await utils.innerText(page, TRADING_VIEW)) === "TOP") {
    const tierHeaderLine = await utils.innerText(page, TIER_HEADER);
    if (!tierHeaderLine) {
      return tiers;
    }
    const tierHeader = tierHeaderLine.split("\n");
    const bidTierText = await utils.innerText(page, BID_TIERS);
    const offerTierText = await utils.innerText(page, OFFER_TIERS);
    const tierHeaderSize = tierHeader.length / 2;
    const bidTier = bidTierText.split("\n");
    const offerTier = offerTierText.split("\n");
    for (let idx = 0; idx < bidTier.length; idx += tierHeaderSize) {
      tiers.push({
        ...headerValue(
          tierHeader.slice(0, tierHeaderSize),
          bidTier.slice(idx),
          "SELL_"
        ),
        ...headerValue(
          tierHeader.slice(tierHeaderSize),
          offerTier.slice(idx),
          "BUY_"
        ),
      });
    }
  } else {
    const vwapText = await utils.innerText(page, TIER_VWAP);
    if (!vwapText) {
      return tiers;
    }
    const vwapHeader = vwapText.split("\n")[0].split("\t");
    for (const tierLine of vwapText.split("\n").slice(1)) {
      tiers.push(headerValue(vwapHeader, tierLine.split("\t")));
    }
  }

  return tiers;
}

async function tradingInfo(page, opts = {}) {
  let infoArr;
  if (
    !(await utils.timer(
      async () => {
        const infoText = await utils.innerText(page, TRADING_TOP);
        infoArr = infoText ? infoText.split("\n") : [];
        return (
          infoArr.length >= 10 &&
          !infoArr[2].includes("-") &&
          !infoArr[7].includes("-")
        );
      },
      { timeout: opts.timeout || 1500, message: "tradingInfo: timed out" }
    ))
  ) {
    return null;
  }
  utils.debug(`tradingInfo: ${infoArr}`);
  const buySell = infoArr[0].split(" ")[0];
  const leftSide = buySell === "BUY" ? "buy" : "sell";
  const rightSide = buySell === "BUY" ? "sell" : "buy";
  return {
    amount: await page.inputValue(TRADING_AMOUNT),
    [`${leftSide}Ccy`]: infoArr[0].split(" ")[1],
    [`${leftSide}Volume`]: infoArr[1],
    [`${leftSide}Price`]: infoArr[2] + infoArr[3],
    view: infoArr[4],
    spread: infoArr[5],
    [`${rightSide}Ccy`]: infoArr[6].split(" ")[1],
    [`${rightSide}Volume`]: infoArr[9],
    [`${rightSide}Price`]: infoArr[7] + infoArr[8],
  };
}

async function tradingSelect(page, symbol, tradingView, amount, opts = {}) {
  const termSymbol = opts.termSymbol || false;
  const tenor = opts.tenor || "SPOT";
  const noAmount = opts.noAmount || false;

  utils.debug(
    `tradingSelect: ${amount} ${symbol} ${tenor} ${tradingView} ${JSON.stringify(
      opts
    )}`
  );
  return (
    (await selectSymbol(page, symbol)) &&
    (!opts.resetSettings || (await resetSettings(page))) &&
    (!opts.settings || (await settings(page, opts.settings))) &&
    (await selectTenor(page, tenor)) &&
    (await selectTradingView(page, tradingView)) &&
    (await termResetSymbol(page, symbol, termSymbol)) &&
    (noAmount || (await fillAmount(page, TRADING_AMOUNT, amount)))
  );
}

async function tradingOrder(
  page,
  side,
  amount,
  symbol,
  tradingView,
  orderType,
  opts = {}
) {
  const tenor = opts.tenor || "SPOT";

  utils.debug(
    `tradingOrder: ${side} ${amount} ${symbol} ${tenor} ${tradingView} ${JSON.stringify(
      opts
    )}`
  );

  const selector =
    side === "BUY"
      ? ".trading__buttons-block button.bid-button.trading-button"
      : ".trading__buttons-block button.offer-button.trading-button";
  return (
    (await tradingSelect(page, symbol, tradingView, amount, {
      noAmount: true,
      ...opts,
    })) &&
    (await utils.click(page, selector, { delay: 100, timeout: 1000 })) &&
    (await bidOfferPopup(page, amount, orderType, opts))
  );
}

async function tradingOrderFromLowerLevel(
  page,
  side,
  symbol,
  tradingView,
  opts = {}
) {
  let selector;
  const level = opts.level || 1;
  const termSymbol = opts.termSymbol || false;
  const clickCount = opts.clickCount || 2;
  const tenor = opts.tenor || "SPOT";

  utils.debug(
    `tradingOrderFromLowerLevel: ${side} ${symbol} ${tenor} ${tradingView} ${JSON.stringify(
      opts
    )}`
  );
  if (!(await tradingSelect(page, symbol, tradingView, -1, opts))) {
    utils.debug(`tradingOrderFromLowerLevel: tradingSelect failed`);
    return 0;
  }
  await utils.sleep(100);

  if ((side === "BUY" && !termSymbol) || (side === "SELL" && termSymbol)) {
    selector =
      tradingView === "TOP"
        ? `.trading__table-ask-container > li:nth-child(${level}) > span.trading__table-body-price.tradable`
        : `.trading__body > table > tbody > tr:nth-child(${level}) > td.td-price.td-price-last > button`;
  } else {
    selector =
      tradingView === "TOP"
        ? `.trading__table-bid-container > li:nth-child(${level}) > span.trading__table-body-price.tradable`
        : `.trading__body > table > tbody > tr:nth-child(${level}) > td:nth-child(2) > button`;
  }

  const tiers = await tierInfo(page);
  utils.debug(`tradingOrderFromLowerLevel: tiers=${JSON.stringify(tiers)}`);

  if (!tiers.length || tiers.length < level - 1) {
    return 0;
  }

  if (
    !(await utils.waitForSelector(page, selector, { timeout: 2000 })) ||
    !(await utils.click(page, selector, { clickCount: clickCount, delay: 100 }))
  ) {
    utils.debug(`tradingOrderFromLowerLevel: waitForSelector or click failed`);
    return 0;
  }

  const volPrefix = tradingView === "TOP" ? `${side}_` : "";

  return utils.volToAmount(tiers[level - 1][`${volPrefix}VOL`]);
}

async function tradingOrderFromPrice(
  page,
  side,
  symbol,
  tradingView,
  opts = {}
) {
  const amount = opts.amount || 1000000;
  const termSymbol = opts.termSymbol || false;
  const clickCount = opts.clickCount || 2;
  const tenor = opts.tenor || "SPOT";

  utils.debug(
    `tradingOrderFromPrice: ${side} ${amount} ${symbol} ${tenor} ${tradingView} ${JSON.stringify(
      opts
    )}`
  );
  if (!(await tradingSelect(page, symbol, tradingView, amount, opts))) {
    utils.debug(`tradingOrderFromPrice: tradingSelect failed`);
    return 0;
  }
  await utils.sleep(100);

  const info = await tradingInfo(page);
  utils.debug(`tradingOrderFromPrice: tradingInfo=${JSON.stringify(info)}`);
  if (!info || utils.volToAmount(info.amount) !== amount) {
    utils.debug(`tradingOrderFromPrice: tradingInfo failed`);
    return 0;
  }

  const volAmount = side === "BUY" ? info.buyVolume : info.sellVolume;
  const sidePos =
    (side === "BUY" && !termSymbol) || (side === "SELL" && termSymbol) ? 3 : 1;

  if (
    !utils.volToAmount(volAmount) ||
    !(await utils.click(
      page,
      `.trading__tops-buttons > button:nth-child(${sidePos})`,
      { clickCount: clickCount }
    ))
  ) {
    utils.debug(
      `tradingOrderFromPrice: volToAmount ${volAmount} or click failed`
    );
    return 0;
  }

  return tradingView === "TOP"
    ? Math.min(utils.volToAmount(volAmount), amount)
    : amount;
}

module.exports = {
  WIDGET,
  bidOfferInfo,
  bidOfferPopup,
  cancelBidOffer,
  closeBidOffer,
  fillAmount,
  fillPrice,
  instrumentInfo,
  instrumentMaxAmount,
  popout,
  resetSymbol,
  resetSettings,
  settings,
  selectSymbol,
  selectOrderType,
  selectTenor,
  selectTif,
  selectTradingView,
  symbols,
  tenorOpt,
  termSymbol,
  tierInfo,
  tradingInfo,
  tradingOrder,
  tradingOrderFromLowerLevel,
  tradingOrderFromPrice,
  tradingSelect,
  tradingViews,
  waitForSettings,
};

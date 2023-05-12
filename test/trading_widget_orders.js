const { expect } = require("chai");

const globals = require("../utils/test_globals");
const misc = require("../utils/misc");
const orders = require("../utils/orders");
const trading = require("../utils/trading");
const utils = require("../utils/utils");

const TEST_INSTRUMENTS = process.env.TEST_INSTRUMENTS === "true";

function offMarketWarning() {
  return (
    globals.URL.includes("latam") ||
    process.env.TEST_OFF_MARKET_WARNING === "true"
  );
}

function majorInstrument(instruments) {
  const majorPairs = [...globals.G7_PAIRS, "USD/MXN"];
  const instrument = utils.randomElement(
    instruments.filter((i) => majorPairs.includes(i.symbol))
  );
  return {
    symbol: instrument.symbol,
    tenor: utils.randomElement(instrument.tenors).tenor,
  };
}

describe(`Trading orders tests - ${globals.URL}`, function () {
  let browser, context, page, ordersPage, tradingPage, prevTradeId;
  const status = /ACTIVE|FILLED|CANCELED|REJECTED|EXPIRED/;
  const instruments = [];
  const instrumentsWithPrice = [];

  before(async function () {
    const widgets = {
      ...orders.WIDGET,
      ...trading.WIDGET,
    };

    [browser, context] = await misc.launchChrome(); // eslint-disable-line no-unused-vars
    expect(browser).is.not.null;
    expect(context).is.not.null;
    page = await misc.userSession(globals.URL, globals.USER, globals.PASS, {
      context: context,
      clearBrowserMemory: true,
      setLanguage: true,
      platformSettings: { tradeNotification: false },
      clearCanvas: true,
      widgets: widgets,
    });
    expect(page).is.not.null;
    tradingPage = await trading.popout(page);
    expect(tradingPage).is.not.null;
    ordersPage = await orders.popout(page);
    expect(ordersPage).is.not.null;
    this.timeout(90000);
    for (const symbol of await trading.symbols(tradingPage)) {
      const tenors = await trading.symbolTenorInfo(tradingPage, symbol);
      instruments.push({
        symbol: symbol,
        tenors: tenors,
      });
      const tenorsWithPrice = tenors.filter(
        (t) => t.hasBuyRate || t.hasSellRate
      );
      if (tenorsWithPrice.length) {
        instrumentsWithPrice.push({
          symbol: symbol,
          tenors: tenorsWithPrice,
        });
      }
    }

    if (globals.SCREENSHOT) {
      await utils.takeScreenshot(page);
    }
    expect(instrumentsWithPrice).is.not.empty;
  });

  after(async function () {
    await misc.browserClose(browser, page);
  });

  beforeEach(async function () {
    const existingOrders = await orders.ordersDetails(ordersPage);
    prevTradeId = existingOrders.length
      ? utils.tradeId(existingOrders[0].tradeId)
      : 0;
    await misc.cancelAll(page);
    await orders.clearAllOrders(ordersPage);
  });

  afterEach(async function () {
    expect(await trading.closeBidOffer(tradingPage)).to.be.true;
  });

  it("Sell Top order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "TOP";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell VWAP order single click - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const clickCount = 1;
    const options = {
      tenor: tenor,
      clickCount: clickCount,
      settings: { amount: amount, doubleClickOrder: false },
    };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell VWAP order term symbol - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const termSymbol = true;
    const options = {
      tenor: tenor,
      amount: amount,
      termSymbol: termSymbol,
      resetSettings: true,
    };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell FOK order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell Market order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell Top low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "TOP";
    const options = { tenor: tenor, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell VWAP low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const options = { tenor: tenor, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell VWAP low level order term symbol - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const level = 3;
    const termSymbol = true;
    const options = {
      tenor: tenor,
      level: level,
      termSymbol: termSymbol,
      resetSettings: true,
    };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell FOK low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell FOK low level order single click term symbol - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const level = 2;
    const termSymbol = true;
    const clickCount = 1;
    const options = {
      tenor: tenor,
      level: level,
      termSymbol: termSymbol,
      clickCount: clickCount,
      settings: { doubleClickOrder: false },
    };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Sell Market low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const level = 2;
    const options = { tenor: tenor, level: level, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy Top order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "TOP";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy VWAP order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy FOK order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy FOK order single click - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const clickCount = 1;
    const options = {
      tenor: tenor,
      amount: amount,
      clickCount: clickCount,
      termSymbol: false,
      settings: { doubleClickOrder: false },
    };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy FOK order term symbol - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const termSymbol = true;
    const options = {
      tenor: tenor,
      amount: amount,
      termSymbol: termSymbol,
      resetSettings: true,
    };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy Market order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 250) * 10000;
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !(amount = await trading.tradingOrderFromPrice(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy Top low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "TOP";
    const level = 2;
    const options = { tenor: tenor, level: level, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy VWAP low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const options = { tenor: tenor, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy FOK low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy Market low level order - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const level = 1;
    const options = { tenor: tenor, level: level, resetSettings: true };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Buy Market low level order term symbol - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const level = 2;
    const termSymbol = true;
    const options = {
      tenor: tenor,
      level: level,
      termSymbol: termSymbol,
      resetSettings: true,
    };
    let amount;

    if (
      !(amount = await trading.tradingOrderFromLowerLevel(
        tradingPage,
        side,
        symbol,
        tradingView,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order VWAP Limit - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    const orderOptions = { tenor: tenor, tif: tif, rateOffsetPct: -0.2 };
    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order VWAP Limit Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.sellPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 1.04).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Bid order VWAP Limit Off market no cancel - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.sellPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 1.05).toFixed(5)),
          expectOffMarketWarning: true,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order VWAP Exceed Max amount", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = 99000000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      rateOffsetPct: -2,
      expectAmountError: true,
    };
    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
  });

  it("Bid order VWAP Cancel", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      rateOffsetPct: -2,
      confirm: false,
    };
    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
  });

  it("Bid order MARKET Stop Loss Market - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "STOP_MARKET";
    const tif = "GTC";
    const orderOptions = { tenor: tenor, tif: tif, stopOffsetPct: -2 };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order MARKET Stop Loss Limit - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "STOP_LIMIT";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      rateOffsetPct: -2,
      stopOffsetPct: 2,
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order MARKET Stop Loss Limit Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "STOP_LIMIT";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.sellPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 1.03).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Bid order VWAP Iceberg - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = 10000000;
    const showAmount = 1200000;
    const tradingView = "VWAP";
    const orderType = "ICEBERG";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      rateOffsetPct: -2,
      showAmount: showAmount,
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Bid order VWAP Iceberg Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = 10000000;
    const showAmount = 1200000;
    const tradingView = "VWAP";
    const orderType = "ICEBERG";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.sellPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          showAmount: showAmount,
          ratePrice: parseFloat((price * 1.05).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Bid order TOP Limit GIS - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "TOP";
    const orderType = "LIMIT";
    const tif = "GIS";
    const orderOptions = { tenor: tenor, tif: "SESSION", rateOffsetPct: -2 };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order MARKET Limit GTT - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "LIMIT";
    const tif = "GTT";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      expiryOffsetMs: globals.ONE_HOUR_MS,
      rateOffsetPct: 2,
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order FOK Limit GTT Start Time - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "FOK";
    const orderType = "LIMIT";
    const tif = "GTT";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      expiryOffsetMs: 2 * globals.ONE_HOUR_MS,
      startOffsetMs: globals.ONE_HOUR_MS,
      rateOffsetPct: 2,
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order VWAP Limit - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    const orderOptions = { tenor: tenor, tif: tif, rateOffsetPct: 2 };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order VWAP Limit Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.buyPrice) : null;
      if (!isNaN(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 0.94).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Offer order VWAP Limit Off market term symbol - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const tif = "GTC";
    const options = { tenor: tenor, termSymbol: true };
    let skip = true;
    if (
      await trading.tradingSelect(
        tradingPage,
        symbol,
        tradingView,
        amount,
        options
      )
    ) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.buyPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 0.97).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Offer order VWAP Man Offset - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "MAN_OFFSET";
    const tif = "GTC";
    const orderOptions = { tenor: tenor, tif: tif, rateOffsetPct: 2 };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: "LIMIT",
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order VWAP Man Offset Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "MAN_OFFSET";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.buyPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 0.99).toFixed(5)),
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Offer order MARKET OCO - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "OCO";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      rateOffsetPct: -0.1,
      stopOffsetPct: -1,
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        orderOptions
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );

    await orders.expectOrderDetails(
      ordersPage,
      1,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order MARKET OCO Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "MARKET";
    const orderType = "OCO";
    const tif = "GTC";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.sellPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          tif: tif,
          ratePrice: parseFloat((price * 1.05).toFixed(5)),
          stopOffsetPct: 1,
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("Offer order VWAP Market - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "MARKET";
    const tif = "IOC";
    const options = { tenor: tenor, amount: amount };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        options
      ))
    ) {
      this.skip();
    }
    const expectOrderOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
    };
    await orders.expectOrderDetails(
      ordersPage,
      0,
      prevTradeId,
      expectOrderOptions
    );
  });

  it("Offer order Limit If Done - Orders", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    const options = {
      tenor: tenor,
      amount: amount,
      rateOffsetPct: 1,
      ifDone: { takeProfitRateOffsetPct: -1, stopLossRateOffsetPct: 1 },
    };

    if (
      !(await trading.tradingOrder(
        tradingPage,
        side,
        amount,
        symbol,
        tradingView,
        orderType,
        options
      ))
    ) {
      this.skip();
    }
  });

  it("Offer order Limit If Done Off market - Orders", async function () {
    if (!offMarketWarning()) {
      this.skip();
    }
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 250) * 10000;
    const tradingView = "VWAP";
    const orderType = "LIMIT";
    let skip = true;
    if (await trading.tradingSelect(tradingPage, symbol, tradingView, amount)) {
      const tradeInfo = await trading.tradingInfo(tradingPage);
      const price = tradeInfo ? parseFloat(tradeInfo.buyPrice) : null;
      if (utils.checkPrice(price)) {
        const orderOptions = {
          tenor: tenor,
          amount: amount,
          ratePrice: parseFloat((price * 0.99).toFixed(5)),
          ifDone: { takeProfitRateOffsetPct: -1, stopLossRateOffsetPct: 1 },
          expectOffMarketWarning: true,
          confirm: false,
        };
        skip = !(await trading.tradingOrder(
          tradingPage,
          side,
          amount,
          symbol,
          tradingView,
          orderType,
          orderOptions
        ));
      }
    }
    if (skip) {
      this.skip();
    }
  });

  it("All instruments", async function () {
    let errors = [];
    if (!TEST_INSTRUMENTS) {
      this.skip();
    }
    this.timeout(240000);
    let numOrders = 0;
    for (const { symbol, tenors } of instrumentsWithPrice) {
      for (const tenor of tenors) {
        const side = utils.randomElement(["BUY", "SELL"]);
        const factor = side === "BUY" ? -1 : 1;
        const orderOpt = {
          side: side,
          amount:
            utils.randomInteger(1, 5) * Math.min(1000000, tenor.maxAmount / 5),
          tradingView: "VWAP",
          orderType: "LIMIT",
          opts: {
            tenor: tenor.tenor,
            tif: "GTC",
            rateOffsetPct: factor * utils.randomInteger(1, 6),
          },
        };
        utils.debug(
          `Placing ${orderOpt.side} order for ${symbol} ${tenor.tenor}`
        );
        if (
          await trading.tradingOrder(
            tradingPage,
            orderOpt.side,
            orderOpt.amount,
            symbol,
            orderOpt.tradingView,
            orderOpt.orderType,
            orderOpt.opts
          )
        ) {
          numOrders += 1;
          const expectOrderOptions = {
            status: status,
            symbol: symbol,
            side: orderOpt.side,
            amount: orderOpt.amount,
            tenor: tenor.tenor,
            orderType: orderOpt.orderType,
            tif: orderOpt.opts.tif,
          };
          try {
            await orders.expectOrderDetails(
              ordersPage,
              0,
              prevTradeId,
              expectOrderOptions
            );
            const existingOrders = await orders.ordersDetails(ordersPage);
            prevTradeId = existingOrders.length
              ? utils.tradeId(existingOrders[0].tradeId)
              : 0;
            expect(prevTradeId).to.not.equal(0);
          } catch (err) {
            utils.debug(`${symbol} ${tenor.tenor} order failed`);
            errors.push(err);
          }
        } else {
          utils.debug(`Skipped symbol ${symbol}, cannot place order`);
        }
        expect(await trading.closeBidOffer(tradingPage)).to.be.true;
      }
    }
    if (!numOrders) {
      this.skip();
    }
    expect(errors, JSON.stringify(errors)).to.have.length(0);
  });
});

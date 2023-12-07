const { expect } = require("chai");

const blotter = require("../utils/blotter");
const globals = require("../utils/test_globals");
const misc = require("../utils/misc");
const trading = require("../utils/trading");
const utils = require("../utils/utils");

const TEST_INSTRUMENTS = process.env.TEST_INSTRUMENTS === "true";

function majorInstrument(instruments) {
  const majorPairs = [...globals.G7_PAIRS, "USD/MXN"];
  return utils.randomElement(
    instruments.filter((i) => majorPairs.includes(i.symbol))
  );
}

describe(`Trading blotter tests - ${globals.URL}`, function () {
  let browser,
    context,
    page,
    blotterPage,
    tradingPage,
    prevTradeDate = new Date();
  const status = /Active|Filled|Canceled|Rejected|Expired/;
  const instruments = [];
  const instrumentsWithPrice = [];

  before(async function () {
    const widgets = {
      ...blotter.WIDGET,
      ...trading.WIDGET,
    };

    [browser, context] = await misc.launchChrome({ height: 1500, width: 1500 }); // eslint-disable-line no-unused-vars
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
    blotterPage = await blotter.popout(page, {
      viewport: { height: 1000, width: 1500 },
    });
    expect(blotterPage).is.not.null;
    await utils.sleep(500);
    expect(await blotter.resetView(blotterPage, blotter.TODAY_ORDERS)).is.true;

    this.timeout(180000);
    for (const symbol of await trading.symbols(tradingPage)) {
      const instrumentInfo = await trading.instrumentInfo(tradingPage, symbol);
      instruments.push(...instrumentInfo);
      const instrumentWithPrice = instrumentInfo.filter(
        (i) => i.hasBuyRate || i.hasSellRate
      );
      if (instrumentWithPrice.length) {
        instrumentsWithPrice.push(...instrumentInfo);
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
    prevTradeDate = await blotter.lastTradeDate(blotterPage);
    await misc.cancelAll(page);
  });

  afterEach(async function () {
    await trading.cancelBidOffer(tradingPage);
  });

  it("Sell Top order - Blotter", async function () {
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
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Sell Top order term symbol - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "TOP";
    const termSymbol = true;
    const options = {
      tenor: tenor,
      amount: amount,
      termSymbol: termSymbol,
      resetSettings: true,
    };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
      termSymbol: termSymbol,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Sell FOK order - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Sell Market order - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Buy VWAP order - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "LIMIT";
    const tif = "IOC";
    const tradingView = "VWAP";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Buy FOK order - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "LIMIT";
    const tif = "FOK";
    const tradingView = "FOK";
    const options = { tenor: tenor, amount: amount, resetSettings: true };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Buy Market order term symbol - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    let amount = utils.randomInteger(1, 25) * 10000;
    const orderType = "MARKET";
    const tif = "IOC";
    const tradingView = "MARKET";
    const termSymbol = true;
    const options = {
      tenor: tenor,
      amount: amount,
      termSymbol: termSymbol,
      resetSettings: true,
    };

    if (
      !instrument.views.includes(tradingView) ||
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      termSymbol: termSymbol,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Bid order Limit - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "LIMIT";
    const tif = "GTC";
    const orderOptions = {
      tif: tif,
      rateOffsetPct: -2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Bid order Man Offset - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "MAN_OFFSET";
    const tif = "GTC";
    const orderOptions = {
      tif: tif,
      rateOffsetPct: -2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Bid order Stop Loss Market - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "STOP_MARKET";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      stopOffsetPct: -2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Bid order Stop Loss Limit - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "STOP_LIMIT";
    const tif = "GTC";
    const orderOptions = {
      tif: tif,
      rateOffsetPct: -2,
      stopOffsetPct: 2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Bid order Iceberg - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = 10000000;
    const showAmount = 1000000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "ICEBERG";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      rateOffsetPct: -2,
      showAmount: showAmount,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Offer order Limit GIS - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "LIMIT";
    const tif = "GIS";
    const orderOptions = {
      tenor: tenor,
      tif: "SESSION",
      rateOffsetPct: 2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Offer order Limit GTT - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "SELL";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "LIMIT";
    const tif = "GTT";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      expiryOffsetMs: globals.ONE_HOUR_MS,
      rateOffsetPct: 2,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("Offer order OCO - Blotter", async function () {
    const instrument = majorInstrument(instrumentsWithPrice);
    const symbol = instrument.symbol;
    const tenor = instrument.tenor;
    const side = "BUY";
    const amount = utils.randomInteger(1, 25) * 10000;
    const tradingView = utils.randomElement(instrument.views);
    const orderType = "OCO";
    const tif = "GTC";
    const orderOptions = {
      tenor: tenor,
      tif: tif,
      rateOffsetPct: -2,
      stopOffsetPct: -0.3,
      resetSettings: true,
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
    const expectBlotterOptions = {
      status: status,
      symbol: symbol,
      side: side,
      amount: amount,
      tenor: tenor,
      orderType: orderType,
      tif: tif,
      username: globals.USER,
    };
    await blotter.expectBlotterDetails(
      blotterPage,
      0,
      prevTradeDate,
      expectBlotterOptions
    );
  });

  it("All instruments", async function () {
    const errors = [];
    if (!TEST_INSTRUMENTS) {
      this.skip();
    }
    this.timeout(240000);
    let numOrders = 0;

    for (const instrument of instrumentsWithPrice) {
      const symbol = instrument.symbol;
      const tenor = instrument.tenor;
      const side = utils.randomElement(["BUY", "SELL"]);
      let amount =
        utils.randomInteger(1, 5) * Math.min(1000000, instrument.maxAmount / 5);
      const tradingView = utils.randomElement(instrument.views);
      const orderType = tradingView === "MARKET" ? "MARKET" : "LIMIT";
      const tif = tradingView === "FOK" ? "FOK" : "IOC";
      utils.debug(
        `Placing ${side} ${amount} order for ${symbol} ${instrument.tenor} ${tradingView} ${orderType} ${tif}`
      );
      if (
        (amount = await trading.tradingOrderFromPrice(
          tradingPage,
          side,
          symbol,
          tradingView,
          { amount: amount, tenor: tenor }
        ))
      ) {
        numOrders += 1;

        const expectBlotterOptions = {
          status: status,
          symbol: symbol,
          side: side,
          amount: amount,
          tenor: tenor,
          orderType: orderType,
          tif: tif,
          username: globals.USER,
        };

        try {
          await blotter.expectBlotterDetails(
            blotterPage,
            0,
            prevTradeDate,
            expectBlotterOptions
          );
          prevTradeDate = await blotter.lastTradeDate(blotterPage);
          expect(prevTradeDate).to.not.equal(0);
        } catch (err) {
          let myErr = err;
          utils.debug(`${symbol} ${tenor} order failed ${err}`);
          if (!Object.keys(err).length) {
            myErr = {
              name: "empty err",
              expectBlotterOptions: expectBlotterOptions,
              err: err,
            };
          }
          errors.push(myErr);
        }
      } else {
        utils.debug(`Skipped symbol ${symbol}, cannot place order`);
      }
    }
    if (!numOrders) {
      this.skip();
    }
    expect(errors, JSON.stringify(errors)).to.have.length(0);
  });
});

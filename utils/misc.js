const { expect } = require("chai");
const { spawn } = require("child_process");
const path = require("path");
const { chromium } = require("playwright");

const globals = require("./test_globals");
const utils = require("./utils");

const LOG_WS = process.env.TEST_LOG_WS === "true";
let wsEvents = {};

const IS_WINDOWS = process.platform === "win32";
const IS_OSX = process.platform === "darwin";

const OPENFIN = process.env.TEST_OPENFIN === "true" && IS_WINDOWS;
const OPENFIN_CONFIG_URL =
  process.env.TEST_OPENFIN_CONFIG_URL ||
  "https://uat.edgefx.pro/trader-rest-service/v1/fin-manifest/uat.edgefx.pro";
const REMOTE_DEBUGGING_PORT = 12565;
const OPENFIN_DIR = path.join(process.env.LOCALAPPDATA || "", "OpenFin");
const OPENFIN_EXE = path.join(OPENFIN_DIR, "OpenFinRVM.exe");
let OPENFIN_PROC;

const WIDTH = parseInt(process.env.TEST_WIDTH) || 1300;
const HEIGHT = parseInt(process.env.TEST_HEIGHT) || 800;

const SYSTEM_CHROME = IS_WINDOWS
  ? path.join(
      process.env.PROGRAMFILES,
      "Google",
      "Chrome",
      "Application",
      "chrome.exe"
    )
  : IS_OSX
  ? path.join(
      "/",
      "Applications",
      "Google Chrome.app",
      "Contents",
      "MacOS",
      "Google Chrome"
    )
  : null;
const BROWSER_ARG =
  process.env.TEST_SYSTEM_BROWSER === "true" ? "executablePath" : "_zzz_";

const TEST_TRACE = process.env.TEST_TRACE;

const LOGIN_SELECTOR = "#root > .main-login";
const USER_SELECTOR = 'span[class="user-name"]';
// const OPENFIN_LOGIN_SELECTOR = "//span[starts-with(text(), 'OpenFin')]";

async function launchChrome(opts = {}) {
  utils.debug(`launchChrome: opts=${JSON.stringify(opts)}`);
  if (OPENFIN) {
    return await launchOpenFin(opts);
  }
  utils.debug(`launchChrome: browser_arg=${BROWSER_ARG} ${SYSTEM_CHROME}`);
  const browser = await chromium.launch({
    headless: globals.HEADLESS,
    args: ["--mute-audio"],
    [BROWSER_ARG]: SYSTEM_CHROME,
  });
  const context = await newContext(browser, opts);
  if (TEST_TRACE) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }
  return [browser, context];
}

async function newContext(browser, opts = {}) {
  const width = opts.width || WIDTH;
  const height = opts.height || HEIGHT;
  utils.debug(`newContext: setting viewport/window to ${width}x${height}`);
  return await browser.newContext({
    acceptDownloads: true,
    permissions: ["clipboard-read"],
    viewport: { width: width, height: height },
  });
}

async function newPage(context) {
  return OPENFIN ? await context.pages()[0] : await context.newPage();
}

function pageId(page) {
  return JSON.stringify(page["_guid"]).replaceAll('"', "").replace("page@", "");
}

function pageLogging(page) {
  page.on("popup", async (popup) => {
    try {
      const title = await popup.title();
      utils.debug(`page popup: ${pageId(popup)} ${title}`);
      wsLogging(popup);
    } catch (err) {
      utils.debug(`page popup: ${pageId(popup)} not accessible`);
    }
  });
  page.on("close", (close) => {
    utils.debug(`page close: ${pageId(close)}`);
  });
  wsLogging(page);
}

function isWSProtovolV1(message) {
  return message.search(/[^{]/) === 1;
}

function parseWSMessage(message) {
  let messageObj;
  const textStart = message.search(/[^(\d+)]/);
  if (textStart < 0) {
    return { code: parseInt(message), obj: [null] };
  }
  try {
    messageObj = JSON.parse(message.slice(textStart));
  } catch (err) {
    messageObj = [message.slice(textStart)];
  }
  return {
    code: isWSProtovolV1(message)
      ? messageObj.body.msg_type
      : parseInt(message.slice(0, Math.min(textStart, 2))),
    obj: messageObj,
  };
}

function initWsEvents(id) {
  if (!(id in wsEvents)) {
    wsEvents[id] = {
      opened: 0,
      closed: 0,
      socketerror: 0,
      framesSent: { total: 0 },
      framesReceived: { total: 0 },
    };
  }
}

function wsLogging(page) {
  if (!LOG_WS) {
    return;
  }
  const _pageId = pageId(page);
  utils.debug(`wsLogging(${_pageId}): logging enabled for websockets`);
  page.on("websocket", (ws) => {
    utils.debug(`WS opened(${_pageId}): ${ws.url()}>`);
    for (const id of ["total", _pageId]) {
      initWsEvents(id);
      wsEvents[id].opened += 1;
    }
    ws.on("framesent", (event) => {
      const message = parseWSMessage(event.payload);
      utils.debug(`WS framesent(${_pageId}): ${JSON.stringify(message)})`);
      for (const id of ["total", _pageId]) {
        const total = wsEvents[id];
        total.framesSent.total += 1;
        if (!(message.code in total.framesSent)) {
          total.framesSent[message.code] = isWSProtovolV1(event.payload)
            ? 0
            : {};
        }
        if (isWSProtovolV1(event.payload)) {
          total.framesSent[message.code] += 1;
        } else {
          if (!(message.obj[0] in total.framesSent[message.code])) {
            total.framesSent[message.code][message.obj[0]] = 0;
          }
          total.framesSent[message.code][message.obj[0]] += 1;
        }
      }
    });
    ws.on("framereceived", (event) => {
      const message = parseWSMessage(event.payload);
      utils.debug(`WS framereceived(${_pageId}): ${JSON.stringify(message)}`);
      for (const id of ["total", _pageId]) {
        const total = wsEvents[id];
        total.framesReceived.total += 1;
        if (!(message.code in total.framesReceived)) {
          total.framesReceived[message.code] = isWSProtovolV1(event.payload)
            ? 0
            : {};
        }
        if (isWSProtovolV1(event.payload)) {
          total.framesReceived[message.code] += 1;
        } else {
          if (!(message.obj[0] in total.framesReceived[message.code])) {
            total.framesReceived[message.code][message.obj[0]] = 0;
          }
          total.framesReceived[message.code][message.obj[0]] += 1;
        }
      }
    });
    ws.on("close", () => {
      utils.debug(`wsEvents closed(${_pageId}): ${ws.url()}>`);
      for (const id of ["total", _pageId]) {
        wsEvents[id].closed += 1;
      }
    });
    ws.on("socketerror", () => {
      utils.debug(`wsEvents socketerror(${_pageId}): ${ws.url()}>`);
      for (const id of ["total", _pageId]) {
        wsEvents[id].socketerror += 1;
      }
    });
  });
}

function wsUsage() {
  if (LOG_WS) {
    console.log(JSON.stringify(wsEvents, null, 2));
  }
}

async function userSession(url, user, pass, opts = {}) {
  utils.debug(
    `userSession: url=${url} user=${user} opts=${JSON.stringify(opts)}`
  );
  const context = opts.browser
    ? await newContext(opts.browser, opts)
    : opts.context;
  const page = context ? await newPage(context) : opts.page;
  utils.debug(`userSession: page=${JSON.stringify(page)}`);
  pageLogging(page);

  const settings = require("./settings");
  if (
    !page ||
    !(await waitForLogin(page, url, user, pass)) ||
    (opts.clearBrowserMemory &&
      !(
        (await settings.clearBrowserMemory(page)) &&
        (await waitForLogin(page, url, user, pass))
      )) ||
    (opts.resetPlatformSettings &&
      !(await settings.resetPlatformSettings(page))) ||
    (opts.setLanguage && !(await settings.setLanguage(page))) ||
    (opts.platformSettings &&
      !(await settings.platformSettings(page, opts.platformSettings))) ||
    (opts.cancelAll && !(await cancelAll(page))) ||
    (opts.clearCanvas && !(await clearCanvas(page))) ||
    (opts.widgets && !(await settings.addWidgetsToCanvas(page, opts.widgets)))
  ) {
    return null;
  }
  return page;
}

// async function openFinLogin(page, user, pass) {
//   await page.click(OPENFIN_LOGIN_SELECTOR);
//   await page.fill('[id$="username"]', user);
//   await page.fill('[id$="password"]', pass);
//   await page.click('//button[starts-with(text(), "Login")]');
//   await utils.sleep(5000);
//   await connectCDP();
//   return [null, null];
// }

async function connectCDP(port = REMOTE_DEBUGGING_PORT, timeout = 5000) {
  let browser;

  return (await utils.timer(
    async () => {
      try {
        browser = await chromium.connectOverCDP({
          endpointURL: `http://localhost:${port}`,
        });
        return true;
      } catch (err) {} // eslint-disable-line no-empty
      return false;
    },
    { timeout: timeout, message: `connectCDP: ${port} timed out` }
  ))
    ? browser
    : null;
}

async function launchOpenFin(opts = {}) {
  const width = opts.width || WIDTH;
  const height = opts.height || HEIGHT;
  const openFinArgs = [
    `--config=${OPENFIN_CONFIG_URL}`,
    `--runtime-arguments=--remote-debugging-port=${REMOTE_DEBUGGING_PORT}`,
    `--working-dir=${OPENFIN_DIR}`,
  ];
  utils.debug(`launchOpenFin: ${OPENFIN_EXE} ${openFinArgs}`);
  OPENFIN_PROC = spawn(OPENFIN_EXE, openFinArgs, {
    stdio: ["pipe", "ignore", "pipe"],
    detached: false,
  });
  const browser = await connectCDP();
  utils.debug(
    `launchOpenFin: contexts=${JSON.stringify(await browser.contexts())}`
  );
  const context = await browser.contexts()[0];
  if (TEST_TRACE) {
    await context.tracing.start({ screenshots: true, snapshots: true });
  }
  await context.grantPermissions(["clipboard-read"]);
  utils.debug(`launchOpenFin: pages=${JSON.stringify(await context.pages())}`);
  const page = await context.pages()[0];
  await utils.sleep(1000);
  await page.evaluate(
    async ([width, height]) => {
      await (await fin.Window.getCurrent()).resizeTo(width, height); //  eslint-disable-line
    },
    [width, height]
  );
  return [browser, context];
}

async function browserClose(browser, page) {
  if (TEST_TRACE) {
    console.log(
      `Generating trace file, play it back as: npx playwright show-trace ${TEST_TRACE}`
    );
    const context = page.context();
    await context.tracing.stop({ path: TEST_TRACE });
  }
  if (OPENFIN) {
    try {
      return await page.evaluate(() => {
        fin.System.exit(); //  eslint-disable-line
      });
    } catch (err) {
      spawn("taskkill", ["/pid", OPENFIN_PROC.pid, "/f", "/t"]);
    }
  }
  const ret = await browser.close();
  wsUsage();
  return ret;
}

async function contextClose(context, page) {
  if (OPENFIN) {
    return await page.evaluate(() => {
      fin.desktop.System.exit(); //  eslint-disable-line
    });
  }
  return await context.close();
}

async function login(page, url, user, pass, retries = 5) {
  utils.debug(`login page URL: ${page.url()}`);
  for (let i = 0; i <= retries; i++) {
    if (page.url() != url) {
      try {
        await page.goto(url);
        break;
      } catch (err) {
        utils.debug(`login: attempt ${i + 1} to goto page failed`);
        continue;
      }
    }
  }
  await page.fill('[id$="username"]', user);
  await page.fill('[id$="password"]', pass);
  await page.click('[type="submit"]');
}

async function waitForLogin(page, url, user, pass, retries = 5) {
  await login(page, url, user, pass, retries);
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(USER_SELECTOR);
  return true;
}

async function waitForLogout(page) {
  await logout(page);
  await page.waitForNavigation({ waitUntil: "networkidle" });
}

async function logout(page) {
  await userProfile(page);
  await page.click(".header__nav .user-info .user-menu__options .fa-power-off");
}

async function clearCanvas(page, timeout = 20000) {
  const selector = ".lm_item .lm_stack .lm_controls .lm_close";
  return await utils.timer(
    async () => {
      if (!(await page.$(selector))) {
        return true;
      }
      await utils.click(page, selector);
      return false;
    },
    { timeout: timeout, message: "clearCanvas: timed out" }
  );
}

async function cancelAll(page) {
  return await utils.click(page, ".btn_cancel_all span");
}

async function rateEngine(page) {
  return await utils.click(page, "//button[contains(text(), 'Rate engine')]");
}

async function getOfferPrice(page, selector, opts = {}) {
  let offerPrice = "";
  return (await utils.timer(
    async () => {
      function checkPrice(price) {
        return !isNaN(price) && offerPrice !== "";
      }
      await page.click(selector);
      offerPrice = await utils.selectorAttr(page, selector, "value");
      if (!checkPrice(offerPrice)) {
        offerPrice = await utils.selectorAttr(page, selector, "placeholder");
      }
      return checkPrice(offerPrice);
    },
    { timeout: opts.timeout || 3000, message: "getOfferPrice: timed out" }
  ))
    ? parseFloat(offerPrice)
    : 0;
}

async function creditLimit(page, timeout = 10000) {
  const selector = ".credit_check";
  let limit = {};
  try {
    await page.waitForSelector(selector, { timeout: timeout });
  } catch (err) {
    return limit;
  }
  const credit = await page.innerText(selector);
  const creditSplit = credit.split(" ");
  for (const [idx, val] of Object.entries(creditSplit)) {
    if (["BUY", "SELL"].includes(val.toUpperCase())) {
      limit[val.toUpperCase()] = creditSplit[parseInt(idx) + 1];
    }
  }
  return limit;
}

async function userProfile(page) {
  await page.waitForSelector(USER_SELECTOR);
  await page.click(USER_SELECTOR);
}

async function changePassword(page, oldPass, newPass, change = true) {
  await userProfile(page);
  await page.click("#userMenu > div > ul > li:nth-child(1) > button");
  await page.fill("#change-pw-modal #currentPw", oldPass);
  await page.fill("#change-pw-modal #newPw", newPass);
  await page.fill("#change-pw-modal #newPwConfirm", newPass);
  if (change) {
    await page.click("#change-pw-modal .button-submit");
    await page.waitForNavigation({ waitUntil: "networkidle" });
  } else {
    await page.click("#change-pw-modal .button-cancel");
  }
}

async function tradingEnabled(page) {
  return (await page.$(".trading-disabled")) === null;
}

async function enableTrading(page, enable = true) {
  utils.debug(`enableTrading: ${enable}`);
  if (
    (enable && (await tradingEnabled(page))) ||
    (!enable && !(await tradingEnabled(page)))
  ) {
    return true;
  }
  if (!(await utils.click(page, ".fa-lock"))) {
    utils.debug(`enableTrading: failed to click lock`);
    return false;
  }
  return await utils.timer(
    async () => {
      return (
        (enable && (await tradingEnabled(page))) ||
        (!enable && !(await tradingEnabled(page)))
      );
    },
    { timeout: 3000, delay: 50, message: `enableTrading: ${enable} timed out` }
  );
}

async function expectTradingEnabled(page, enable = true) {
  expect(await tradingEnabled(page)).to.equal(enable);
}

async function expectClickable(
  page,
  selector,
  clickable = true,
  timeout = 2000
) {
  let error = null;
  try {
    await page.click(selector, { timeout: timeout });
  } catch (err) {
    error = err;
  }
  utils.debug(`expectClickable: error=${JSON.stringify(error)}`);

  if (clickable) {
    expect(error).to.be.null;
  } else {
    expect(error).to.not.be.null;
    if (error.name) {
      expect(error.name).to.equal("TimeoutError");
    }
  }
}

async function expectImages(page, selectors) {
  for (const selector of selectors) {
    const element = await page.$(selector);
    expect(await element.getAttribute("src")).to.not.be.null;
  }
}

async function expectElements(page, selectors) {
  for (const selector of selectors) {
    await page.waitForSelector(selector);
    expect(await page.$(selector)).to.not.be.null;
  }
}

async function expectClocks(page, showClocks) {
  const clocks = await page.$$("#root > div > footer span.country");
  expect(clocks.length === 0).to.not.equal(showClocks);
}

async function expectLoginPage(page, loginDisplayed = true) {
  const loginForm = await page.$$(LOGIN_SELECTOR);
  expect(loginForm.length === 0).to.not.equal(loginDisplayed);
}

async function expectMainPage(page, mainDisplayed = true) {
  const userElements = await page.$$(USER_SELECTOR);
  expect(userElements.length === 0).to.not.equal(mainDisplayed);
}

async function expectUser(page, user) {
  expect(await page.innerText(".header__nav .user-info .user-name")).to.equal(
    user.toUpperCase()
  );
}

module.exports = {
  browserClose,
  cancelAll,
  changePassword,
  clearCanvas,
  contextClose,
  creditLimit,
  enableTrading,
  expectClickable,
  expectClocks,
  expectElements,
  expectImages,
  expectLoginPage,
  expectMainPage,
  expectTradingEnabled,
  expectUser,
  getOfferPrice,
  launchChrome,
  rateEngine,
  userSession,
  waitForLogin,
  waitForLogout,
  wsLogging,
};

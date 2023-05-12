String.prototype.capitalize = function () {
  return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
};

String.prototype.toCamelCase = function () {
  return this.valueOf()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

Date.prototype.toDateTimeString = function () {
  return (
    this.getFullYear() +
    "-" +
    zeroPad(this.getMonth() + 1) +
    "-" +
    zeroPad(this.getDate()) +
    "T" +
    zeroPad(this.getHours()) +
    ":" +
    zeroPad(this.getMinutes()) +
    ":" +
    zeroPad(this.getSeconds())
  );
};

async function timer(condition, opts = {}) {
  const delay = opts.delay || 0;
  const timeout = opts.timeout || 3000;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await sleep(delay);
  }
  if (opts.message) {
    debug(opts.message);
  } else {
    debug(`timer: timedout ${timeout} ${delay}`);
  }
  return false;
}

function debug(message) {
  const globals = require("./test_globals");
  if (globals.DEBUG && message) {
    console.log(`${new Date().toISOString()} ${message}`);
  }
}

function randomInteger(min, max) {
  return Math.round(Math.floor(Math.random() * (max - min + 1)) + min);
}

function randomElement(arr) {
  return arr[randomInteger(0, arr.length - 1)];
}

function zeroPad(num, places = 2) {
  return String(num).padStart(places, "0");
}

function volToAmount(vol) {
  if (typeof vol === "number") {
    return vol;
  }
  if (typeof vol === "undefined" || vol === null) {
    return 0;
  }
  const newVol = vol.replaceAll(",", "");
  const unit = newVol.slice(-1);
  if (!isNaN(parseFloat(unit))) {
    return parseFloat(newVol);
  }
  let volNoUnit = newVol.substring(0, newVol.length - 1);
  if (unit === "M") {
    return volNoUnit * 1000000;
  }
  if (unit === "K") {
    return volNoUnit * 1000;
  }
}

function amountToVol(amount) {
  if (amount < 1000) {
    return amount.toString();
  }
  if (amount < 1000000) {
    return `${Math.round((amount.toString() * 10) / 1000) / 10}K`;
  }
  return `${Math.round((amount.toString() * 10) / 1000000) / 10}M`;
}

function urlFile(page, opts) {
  const prefix = opts.prefix ? opts.prefix : "";
  const suffix = opts.suffix ? `_${opts.suffix}` : "";
  const extension = opts.extension ? `.${opts.extension}` : "";
  const pageUrl = page.url();
  const pageFormat = pageUrl
    .split("?")[0]
    .replace(/http.*:\/\//, "")
    .replace(/[\W_]+/g, "_");
  const nowFormat = new Date().toISOString().replace(/[\W_]+/g, "_");
  return `${prefix}${pageFormat}${suffix}_${nowFormat}${extension}`;
}

async function takeScreenshot(page, prefix, suffix) {
  const screenshot = urlFile(page, {
    extension: "png",
    prefix: prefix,
    suffix: suffix,
  });
  console.log("Screenshot of " + page.url() + " saved to " + screenshot);
  await page.screenshot({ path: screenshot });
  return true;
}

async function selectOption(page, selector, selections, opts = {}) {
  return await timer(
    async () => {
      debug(
        `selectOption: ${JSON.stringify(selections)} ${JSON.stringify(opts)}`
      );
      try {
        if (opts.click) {
          await click(page, selector);
        }
        await page.selectOption(selector, selections, {
          timeout: opts.timeout || 200,
        });
        return true;
      } catch (err) {
        debug(`selectOption: ${JSON.stringify(selections)}\n ${err}`);
        return false;
      }
    },
    {
      timeout: opts.timeout ? opts.timeout * 3 : 2000,
      delay: opts.wait || 0,
      message: `selectOption: ${JSON.stringify(selections)} timed out`,
    }
  );
}

async function selectCheckbox(page, selector, check = true) {
  try {
    if (check) {
      await page.check(selector, { timeout: 2000 });
    } else {
      await page.uncheck(selector, { timeout: 2000 });
    }
    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}

async function click(page, selector, opts = {}) {
  const retries = opts.retries || 0;
  let timeout = opts.timeout || 5000;
  let delay = opts.delay || 20;
  let error;
  await sleep(opts.wait || 0);
  for (let i = 0; i <= retries; i++) {
    try {
      await page.click(selector, {
        force: true,
        ...opts,
        timeout: timeout,
        delay: delay,
      });
      return true;
    } catch (err) {
      error = err;
      timeout += 25;
      delay += 25;
    }
  }
  debug(error);
  return false;
}

async function clickAndHide(page, selector, opts) {
  return (
    (await click(page, selector, opts)) &&
    (await waitForSelector(page, selector, {
      ...opts,
      state: "hidden",
    }))
  );
}

async function focus(page, selector, opts = {}) {
  try {
    await page.focus(selector, { timeout: 200, ...opts });
    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}

async function innerText(page, selector, opts = {}) {
  const retries = opts.retries || 0;
  for (let i = 0; i <= retries; i++) {
    try {
      return await page.innerText(selector, { timeout: 200, ...opts });
    } catch (err) {
      debug(err);
    }
  }
  return null;
}

async function fill(page, selector, value, opts = {}) {
  if (opts.clear) {
    return await clearAndFill(page, selector, value, {
      timeout: 1000,
      ...opts,
    });
  }
  try {
    await page.fill(selector, value, { timeout: 200, ...opts });
    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}

async function clearAndFill(page, selector, value, opts = {}) {
  const element = await page.$(selector);
  // Clear field before filling it in.
  try {
    await element.click(opts);
    await element.focus();
    await element.click({ clickCount: 3 });
    await element.press("Backspace");
    await element.fill(value.toString(), opts);
  } catch (err) {
    debug(err);
    return false;
  }
  return true;
}

async function type(page, selector, value, opts = {}) {
  if (opts.clear) {
    return await clearAndType(page, selector, value, {
      timeout: 1000,
      ...opts,
    });
  }
  try {
    await page.type(selector, value.toString(), { timeout: 200, ...opts });
    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}

async function clearAndType(page, selector, value, opts = {}) {
  const element = await page.$(selector);
  // Clear field before filling it in.
  try {
    await element.click();
    await element.focus();
    await element.click({ clickCount: 3 });
    await element.press("Backspace");
    await element.type(value.toString(), opts);
  } catch (err) {
    debug(err);
    return false;
  }
  return true;
}

async function isVisible(page, selector, opts = {}) {
  try {
    return await page.isVisible(selector, { ...opts });
  } catch (err) {
    debug(err);
    return false;
  }
}

async function waitForSelector(page, selector, opts = {}) {
  try {
    await page.waitForSelector(selector, { timeout: 2000, ...opts });
    return true;
  } catch (err) {
    debug(err);
    return false;
  }
}

async function waitForPage(context, url, opts = {}) {
  const timeout = opts.timeout || 5000;
  const navState = opts.navState || "load";
  let page;
  return (await timer(
    async () => {
      for (page of await context.pages()) {
        if (page.url().includes(url)) {
          await page.waitForLoadState(navState, { timeout: timeout });
          return true;
        }
      }
      return false;
    },
    { timeout: timeout, delay: 50, message: `waitForPage: ${url} timed out` }
  ))
    ? page
    : null;
}

/* eslint-disable no-unused-vars */
async function scrollBy(page, selector, location) {
  await page.$eval(selector, (el, args) => el.scrollBy(args[0], args[1]), [
    location.x || 0,
    location.y || 0,
  ]);
}

async function scrollTo(page, selector, location) {
  await page.$eval(selector, (el, args) => el.scrollTo(args[0], args[1]), [
    location.x || 0,
    location.y || 0,
  ]);
}

async function scrollByPage(page, selector, pages) {
  await scrollBy(page, selector, {
    y: pages * (await selectorAttr(page, selector, "clientHeight")),
  });
}

async function viewportPages(page, selector, pages) {
  const pageHeight = await selectorAttr(page, selector, "clientHeight");
  const totalHeight = await selectorAttr(page, selector, "scrollHeight");
  if (!pageHeight) {
    return 0;
  }
  return Math.ceil(totalHeight / pageHeight);
}

async function scrollToTop(page, selector) {
  await scrollTo(page, selector, { y: 0 });
}

async function scrollToBottom(page, selector) {
  await scrollTo(page, selector, {
    y: await selectorAttr(page, selector, "scrollHeight"),
  });
}

async function shiftBySections(page, selector, sectionShifts) {
  await scrollBy(page, selector, {
    x: sectionShifts * (await selectorAttr(page, selector, "clientWidth")),
  });
}

async function viewportSections(page, selector) {
  const sectionWidth = await selectorAttr(page, selector, "clientWidth");
  const totalWidth = await selectorAttr(page, selector, "scrollWidth");
  if (!sectionWidth) {
    return 0;
  }
  return Math.ceil(totalWidth / sectionWidth);
}

async function shiftToLeft(page, selector) {
  await scrollTo(page, selector, { x: 0 });
}

async function shiftToRight(page, selector) {
  await scrollTo(page, selector, {
    x: await selectorAttr(page, selector, "scrollWidth"),
  });
}

/* eslint-enable no-unused-vars */

function side(side, termSymbol = false) {
  return (side.toUpperCase() === "BUY" && !termSymbol) ||
    (side.toUpperCase() === "SELL" && termSymbol)
    ? "BUY"
    : "SELL";
}

function tradeId(id) {
  if (id === null || id === "") {
    return 0;
  }
  const idParts = id.split(":");
  const leadPart = idParts[0].split("-").slice(-1)[0];
  const remPart =
    idParts.length > 1
      ? isNaN(Number(idParts[1]))
        ? Number(`0x${idParts[1]}`)
        : idParts[1]
      : 0;
  return Number(BigInt(leadPart) + BigInt(remPart));
}

async function selectSymbol(page, selector, symbol, timeout = 3000) {
  return await timer(
    async () => {
      try {
        return (
          (await selectOption(page, selector, symbol, {
            click: true,
            timeout: 1000,
          })) && (await page.inputValue(selector)) === symbol
        );
      } catch {
        return false;
      }
    },
    { timeout: timeout, message: `selectSymbol: ${symbol} timed out` }
  );
}

async function fillTime(page, selector, options) {
  debug(`fillTime: ${JSON.stringify(options)}`);
  if (!(await page.$(selector))) {
    return false;
  }
  let expiryTime;
  if (options.offsetMs) {
    expiryTime = new Date();
    expiryTime.setMilliseconds(options.offsetMs);
  } else if (options.time) {
    expiryTime = new Date(options.time);
  } else {
    return false;
  }
  debug(`fillTime: expiryTime=${expiryTime}`);
  return (await page.fill(selector, expiryTime.toDateTimeString())) && true;
}

async function selectorAttr(page, selector, attr = "value") {
  return (await page.$(selector))
    ? await page.$eval(selector, (el, attr) => el[attr], attr)
    : null;
}

async function checkAmount(page, selector, amount) {
  return volToAmount(await page.inputValue(selector)) === amount;
}

async function fillAmount(page, selector, amount, opts = {}) {
  const timeout = opts.timeout || 3000;
  let delay = (opts.delay || 0) - 25;

  return await timer(
    async () => {
      delay += 25;
      return (
        (await checkAmount(page, selector, amount)) ||
        ((await clearAndType(page, selector, amount, { delay: delay })) &&
          false)
      );
    },
    {
      timeout: timeout,
      delay: delay,
      message: `fillAmount: ${amount} timed out`,
    }
  );
}

function setDateTime(myDate, options = {}) {
  const hours = options.hours !== undefined ? options.hours : myDate.getHours();
  const minutes =
    options.minutes !== undefined ? options.minutes : myDate.getMinutes();
  const seconds =
    options.seconds !== undefined ? options.seconds : myDate.getSeconds();
  const date = options.date !== undefined ? options.date : myDate.getDate();
  const month = options.month !== undefined ? options.month : myDate.getMonth();
  const year =
    options.year !== undefined
      ? options.year + myDate.getFullYear()
      : myDate.getFullYear();
  if (options.dayOfWeek !== undefined) {
    myDate.setDate(
      myDate.getDate() + ((options.dayOfWeek + 7 - myDate.getDay()) % 7)
    );
  } else {
    myDate.setFullYear(year, month, date);
  }
  myDate.setHours(hours, minutes, seconds);
}

function checkPrice(price) {
  return price !== null && price !== "" && !isNaN(price) && price > 0;
}

function tzDiffMins(tz = "America/New_York") {
  return Math.floor(
    (new Date() -
      new Date(new Date().toLocaleString("en-US", { timeZone: tz }))) /
      1000 /
      60
  );
}

const sleep = (waitTimeInMs) =>
  new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

module.exports = {
  amountToVol,
  checkPrice,
  click,
  clickAndHide,
  debug,
  fill,
  fillAmount,
  fillTime,
  focus,
  innerText,
  isVisible,
  randomInteger,
  randomElement,
  selectCheckbox,
  selectOption,
  setDateTime,
  scrollBy,
  scrollByPage,
  scrollTo,
  scrollToBottom,
  scrollToTop,
  selectSymbol,
  selectorAttr,
  shiftBySections,
  shiftToLeft,
  shiftToRight,
  side,
  sleep,
  takeScreenshot,
  timer,
  tradeId,
  tzDiffMins,
  type,
  urlFile,
  viewportPages,
  viewportSections,
  volToAmount,
  waitForPage,
  waitForSelector,
};

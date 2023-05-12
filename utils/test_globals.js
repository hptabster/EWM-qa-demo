const DEBUG = process.env.TEST_DEBUG === "true";
const URL = process.env.TEST_URL || "https://uat.latamfx.pro/";
const USER = process.env.TEST_USER || "qa_demo";
const PASS = process.env.TEST_PASS || "a12345Z!";
const HEADLESS = process.env.TEST_HEADLESS === "true";
const SCREENSHOT = process.env.TEST_SCREENSHOT === "true";
const LOCALE = process.env.TEST_LOCALE || "en";
const ONE_MINUTE_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
const ONE_DAY_MS = ONE_HOUR_MS * 24;
let POPOUTS = {};
const G7_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/CHF",
  "USD/JPY",
  "AUD/USD",
  "NZD/USD",
  "USD/CAD",
];

const popouts = process.env.TEST_POPOUTS ? process.env.TEST_POPOUTS : "";
for (const popout of popouts.split(",")) {
  POPOUTS[popout.toLowerCase()] = true;
}

module.exports = {
  DEBUG,
  G7_PAIRS,
  HEADLESS,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  ONE_MINUTE_MS,
  LOCALE,
  PASS,
  POPOUTS,
  SCREENSHOT,
  URL,
  USER,
};

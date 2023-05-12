const { expect } = require("chai");

const utils = require("./utils");

const SETTINGS = ".settings-button .fas";
const CLOSE = ".settings-modal > .modal__head > a > img";
const STARTING_ORDER_NOTIFICATION =
  "#modal--settings > fieldset:nth-child(1) > div:nth-child(2) > label > input";
const EXPIRATION_ORDERS_SECS = "#modal--settings #buy-sell-number";
const LANGUAGE = "#modal--settings #buy-sell-form-select";
const THEME = "#modal--settings #select_theme";
const TRADE_NOTIFICATION =
  "#modal--settings > fieldset:nth-child(1) > div:nth-child(6) > label > input";
const SOUND_ON_TRADE =
  "#modal--settings > fieldset:nth-child(1) > div:nth-child(7) > label > input";
const SHOW_CLOCKS =
  "#modal--settings > fieldset:nth-child(1) > div:nth-child(8) > label > input";
const STOP_ORDER_TRIGGER =
  "#modal--settings > fieldset:nth-child(2) > div > label > input";
const PLATFORM = "//button[starts-with(text(), 'Plat')]";
const DESIGN =
  "//button[starts-with(text(), 'Des') or starts-with(text(), 'Dis')]";
const VIEWERS_NOTIFICATIONS =
  "#modal--settings > fieldset:nth-child(1) > fieldset > div:nth-child(2) > label > input";
const PERMANENT_VIEWERS_NOTIFICATIONS =
  "#modal--settings > fieldset:nth-child(1) > fieldset > div:nth-child(3) > label > input";
const SOUND_ON_VIEWERS_TRADES =
  "#modal--settings > fieldset:nth-child(1) > fieldset > div:nth-child(4) > label > input";

async function waitForSettingsButton(page) {
  return await utils.waitForSelector(page, SETTINGS);
}

async function openSettings(page) {
  return await utils.click(page, SETTINGS);
}

async function closeSettings(page) {
  return await utils.clickAndHide(page, CLOSE);
}

async function platformTab(page) {
  return (await openSettings(page)) && (await utils.click(page, PLATFORM));
}

async function designTab(page) {
  return (await openSettings(page)) && (await utils.click(page, DESIGN));
}

async function savePlatformChanges(page) {
  return await utils.clickAndHide(
    page,
    ".modal__body.settings-body div:nth-child(3) button.primary"
  );
}

async function saveDesignChanges(page) {
  return await utils.clickAndHide(
    page,
    ".modal__body.settings-body > div:nth-child(2) > div > div > button"
  );
}

async function clearBrowserMemory(page, confirm = true) {
  utils.debug(`clearBrowserMemory: ${confirm}`);
  return (
    (await platformTab(page)) &&
    (await utils.click(
      page,
      ".modal__body.settings-body div:nth-child(3) button.secondary",
      { wait: 500 }
    )) &&
    (await confirmPrompt(page, confirm))
  );
}

async function confirmPrompt(page, confirm) {
  const confirmCancel = confirm
    ? ".jconfirm-buttons > button.btn.btn-confirm"
    : ".jconfirm-buttons > button.btn.btn-cancel";
  return (
    (await utils.waitForSelector(page, confirmCancel)) &&
    (await utils.clickAndHide(page, confirmCancel, { wait: 100 }))
  );
}

async function getSettings(page) {
  await platformTab(page);
  const settings = {
    startingOrderNotification:
      (await page.$(STARTING_ORDER_NOTIFICATION)) !== null &&
      (await page.isChecked(STARTING_ORDER_NOTIFICATION)),
    expirationOrdersSecs: await page.inputValue(EXPIRATION_ORDERS_SECS),
    language: await utils.selectorAttr(page, LANGUAGE),
    theme: await utils.selectorAttr(page, THEME),
    tradeNotification:
      (await page.$(TRADE_NOTIFICATION)) !== null &&
      (await page.isChecked(TRADE_NOTIFICATION)),
    soundOnTrade:
      (await page.$(SOUND_ON_TRADE)) !== null &&
      (await page.isChecked(SOUND_ON_TRADE)),
    showClocks:
      (await page.$(SHOW_CLOCKS)) !== null &&
      (await page.isChecked(SHOW_CLOCKS)),
    stopOrderTrigger:
      (await page.$(STOP_ORDER_TRIGGER)) !== null &&
      (await page.isChecked(STOP_ORDER_TRIGGER)),
  };
  if (await page.$(VIEWERS_NOTIFICATIONS)) {
    settings.viewersNotifications = await page.isChecked(VIEWERS_NOTIFICATIONS);
  }
  if (await page.$(PERMANENT_VIEWERS_NOTIFICATIONS)) {
    settings.permanentViewersNotifications = await page.isChecked(
      PERMANENT_VIEWERS_NOTIFICATIONS
    );
  }
  if (await page.$(SOUND_ON_VIEWERS_TRADES)) {
    settings.soundOnViewersTrade = await page.isChecked(
      SOUND_ON_VIEWERS_TRADES
    );
  }
  return (await closeSettings(page)) ? settings : {};
}

async function startingOrderNotification(page, choice) {
  return await utils.selectCheckbox(page, STARTING_ORDER_NOTIFICATION, choice);
}

async function expirationOrdersSecs(page, expireSecs) {
  return await utils.fill(page, EXPIRATION_ORDERS_SECS, expireSecs.toString());
}

async function selectLanguage(page, lang, delay = 2000) {
  return (
    (await utils.selectOption(page, LANGUAGE, lang)) &&
    (await utils.sleep(delay)) === undefined
  );
}

async function getTheme(page) {
  return await utils.selectorAttr(page, THEME);
}

async function getDefaultTheme(page) {
  for (let idx = 1; ; idx++) {
    const selector = `${THEME} > option:nth-child(${idx})`;
    const theme = await page.$(selector);
    if (!theme) {
      break;
    }
    if ((await theme.innerText()) === "Default") {
      return await utils.selectorAttr(page, selector);
    }
  }
}

async function selectTheme(page, theme) {
  utils.debug(`selectTheme: ${theme}`);
  return await utils.selectOption(page, THEME, theme);
}

async function tradeNotification(page, choice) {
  utils.debug(`tradeNotification: ${choice}`);
  return await utils.selectCheckbox(page, TRADE_NOTIFICATION, choice);
}

async function soundOnTrade(page, choice) {
  utils.debug(`soundOnTrade: ${choice}`);
  return await utils.selectCheckbox(page, SOUND_ON_TRADE, choice);
}

async function showClocks(page, choice) {
  utils.debug(`showClocks: ${choice}`);
  return await utils.selectCheckbox(page, SHOW_CLOCKS, choice);
}

async function stopOrderTrigger(page, choice) {
  utils.debug(`stopOrderTrigger: ${choice}`);
  return (
    (await page.$(STOP_ORDER_TRIGGER)) === null ||
    (await utils.selectCheckbox(page, STOP_ORDER_TRIGGER, choice))
  );
}

async function viewersNotifications(page, choice) {
  utils.debug(`viewersNotifications: ${choice}`);
  return (
    (await page.$(VIEWERS_NOTIFICATIONS)) === null ||
    (await utils.selectCheckbox(page, VIEWERS_NOTIFICATIONS, choice))
  );
}

async function permanentViewersNotifications(page, choice) {
  utils.debug(`permanentViewersNotifications: ${choice}`);
  return (
    (await page.$(PERMANENT_VIEWERS_NOTIFICATIONS)) === null ||
    (await utils.selectCheckbox(page, PERMANENT_VIEWERS_NOTIFICATIONS, choice))
  );
}

async function soundOnViewersTrade(page, choice) {
  utils.debug(`soundOnViewersTrade: ${choice}`);
  return (
    (await page.$(SOUND_ON_VIEWERS_TRADES)) === null ||
    (await utils.selectCheckbox(page, SOUND_ON_VIEWERS_TRADES, choice))
  );
}

async function defaultLayout(page, confirm = true) {
  utils.debug(`defaultLayout: ${confirm}`);
  const selector =
    ".modal__body.settings-body > div:nth-child(2) > div > button";
  return (
    (await designTab(page)) &&
    (await utils.click(page, selector)) &&
    (await confirmPrompt(page, confirm))
  );
}

async function setLanguage(page, lang = "en") {
  utils.debug(`setLanguage: ${lang}`);
  return (
    (await platformTab(page)) &&
    (await selectLanguage(page, lang)) &&
    (await savePlatformChanges(page))
  );
}

async function setTradeNotification(page, enable = true) {
  return (
    (await platformTab(page)) &&
    (await tradeNotification(page, enable)) &&
    (await savePlatformChanges(page))
  );
}

async function setTheme(page, theme) {
  utils.debug(`setTheme: ${theme}`);
  return (
    (await getTheme(page)) === theme ||
    ((await platformTab(page)) &&
      (await selectTheme(page, theme)) &&
      (await waitForSettingsButton(page)))
  );
}

async function resetPlatformSettings(page) {
  return await platformSettings(page, {
    startingOrderNotification: false,
    expirationOrdersSecs: 5,
    language: "en",
    theme: await getDefaultTheme(page),
    tradeNotification: true,
    soundOnTrade: true,
    showClocks: true,
    stopOrderTrigger: false,
    viewersNotifications: true,
    permanentViewersNotifications: false,
    soundOnViewersTrade: true,
  });
}

async function platformSettings(page, options) {
  utils.debug(`platformSettings: ${JSON.stringify(options)}`);
  return (
    (await platformTab(page)) &&
    (!("startingOrderNotification" in options) ||
      (await startingOrderNotification(
        page,
        options.startingOrderNotification
      ))) &&
    (!("expirationOrdersSecs" in options) ||
      (await expirationOrdersSecs(page, options.expirationOrdersSecs))) &&
    (!options.language || (await selectLanguage(page, options.language))) &&
    (!("tradeNotification" in options) ||
      (await tradeNotification(page, options.tradeNotification))) &&
    (!("soundOnTrade" in options) ||
      (await soundOnTrade(page, options.soundOnTrade))) &&
    (!("showClocks" in options) ||
      (await showClocks(page, options.showClocks))) &&
    (!("stopOrderTrigger" in options) ||
      (await stopOrderTrigger(page, options.stopOrderTrigger))) &&
    (!("viewersNotifications" in options) ||
      (await viewersNotifications(page, options.viewersNotifications))) &&
    (!(
      "permanentViewersNotifications" in options && options.viewersNotifications
    ) ||
      (await permanentViewersNotifications(
        page,
        options.permanentViewersNotifications
      ))) &&
    (!("soundOnViewersTrade" in options) ||
      (await soundOnViewersTrade(page, options.soundOnViewersTrade))) &&
    (await savePlatformChanges(page)) &&
    (!options.theme || (await setTheme(page, options.theme))) &&
    (await waitForSettingsButton(page))
  );
}

async function addWidgetsToCanvas(page, widgets, delayOptions = {}) {
  utils.debug(`addWidgetsToCanvas: ${JSON.stringify(widgets)}`);
  const delayStart = delayOptions.start || 100;
  const delayEnd = delayOptions.end || 400;
  const delayIncrement = delayOptions.increment || 25;
  const sleepMs = delayOptions.sleepMs || 100;
  if (!(await designTab(page))) {
    return false;
  }

  const widget = require("./widget");
  for (const title of Object.keys(widgets)) {
    const canvasWidgets = await widget.activeWidgetElements(page);
    const widgetSelector = `div > #enabled_widgets_holder #${widgets[title]}`;
    let curWidgets = canvasWidgets;
    let delay = delayStart;
    while (canvasWidgets.length === curWidgets.length) {
      if (delay >= delayEnd) {
        break;
      }
      await utils.click(page, widgetSelector, { delay: delay });
      await utils.sleep(sleepMs);
      delay += delayIncrement;
      curWidgets = await widget.activeWidgetElements(page);
    }
    if (!(await widget.isWidgetVisible(page, title))) {
      utils.debug(`addWidgetsToCanvas: widget ${title} is not visible`);
      return (await closeSettings(page)) && false;
    }
  }
  return await closeSettings(page);
}

async function expectSettings(page, settings, shouldEqual = true) {
  const currentSettings = await getSettings(page);
  if (shouldEqual) {
    expect(currentSettings).to.deep.equal(settings);
  } else {
    expect(currentSettings).to.not.deep.equal(settings);
  }
}

module.exports = {
  addWidgetsToCanvas,
  clearBrowserMemory,
  closeSettings,
  defaultLayout,
  designTab,
  expectSettings,
  getDefaultTheme,
  getSettings,
  platformSettings,
  platformTab,
  resetPlatformSettings,
  saveDesignChanges,
  setLanguage,
  setTheme,
  setTradeNotification,
  waitForSettingsButton,
};

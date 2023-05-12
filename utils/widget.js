const { expect } = require("chai");

const globals = require("./test_globals");
const utils = require("./utils");

async function selectTab(page, title) {
  return await utils.click(page, `.lm_tabs [title*="${title}"]`);
}

async function close(page, title) {
  return await utils.click(page, `.lm_tabs [title*="${title}"] .lm_close_tab`);
}

async function maximize(page, title) {
  return (
    (await selectTab(page, title)) &&
    (await utils.click(page, `.lm_tabs [title*="${title}"] .lm_maximise`))
  );
}

async function isWidgetVisible(page, title) {
  return (await page.$(`.lm_tabs [title*="${title}"]`)) !== null;
}

async function waitForWidgets(page, titles, timeout = 5000) {
  const widgetTitles = typeof titles === "string" ? [titles] : titles;
  for (const title of widgetTitles) {
    if (
      !(await utils.timer(
        async () => {
          return await isWidgetVisible(page, title);
        },
        {
          timeout: timeout,
          delay: 10,
          message: `waitForWidgets: ${title} timed out`,
        }
      ))
    ) {
      return false;
    }
  }
  return true;
}

async function closePage(page, timeout = 5000) {
  const context = page.context();
  await page.close({ runBeforeUnload: true });
  return await utils.timer(
    async () => {
      for (const contextPage of context.pages()) {
        if (contextPage._guid === page._guid) {
          return false;
        }
      }
      return true;
    },
    {
      timeout: timeout,
      delay: 50,
      message: `closePage: ${JSON.stringify(page)} timed out`,
    }
  );
}

async function closePopouts(mainPage) {
  utils.debug(`closePopouts`);
  const context = mainPage.context();
  let allPages = await context.pages();
  let retVal = true;
  while (allPages.length > 1) {
    for (const page of allPages) {
      if (!(page === mainPage)) {
        retVal = retVal && (await closePage(page));
      }
    }
    allPages = await context.pages();
  }
  return retVal;
}

async function findPopouts(mainPage, title, opts = {}) {
  const popoutsFound = [];
  utils.debug(`findPopouts: title=${title} opts=${JSON.stringify(opts)}`);
  await utils.timer(
    async () => {
      const context = mainPage.context();
      const selector = "div[data-id]";
      let selectorElements,
        popoutFound = false;
      for (const page of context.pages()) {
        utils.debug(
          `findPopouts: page=${JSON.stringify(page)} mainPage=${JSON.stringify(
            mainPage
          )}`
        );
        if (page === mainPage) {
          continue;
        }
        await page.waitForSelector(".body-layout-poput", {
          state: "attached",
          timeout: 10000,
        });

        if (opts.selector && (await page.$(opts.selector))) {
          popoutFound = true;
        } else if (await page.$(selector)) {
          const attributeName = opts.mccyTrading ? "class" : "data-id";
          selectorElements = await page.$$eval(
            selector,
            (elements) =>
              elements.map((el, attributeName) =>
                el.attributes[attributeName].value.toLowerCase().trim()
              ),
            attributeName
          );
          utils.debug(`findPopouts: selectorElements=${selectorElements}`);
          popoutFound = selectorElements.includes(
            title.split(" ")[0].toLowerCase().trim()
          );
        }
        if (popoutFound) {
          if (opts.close) {
            await closePage(page);
          }
          popoutsFound.push(page);
          popoutFound = false;
        }
      }
      return popoutsFound.length !== 0;
    },
    {
      timeout: opts.timeout || 5000,
      delay: 50,
      message: `findPopouts timed out`,
    }
  );

  return popoutsFound;
}

async function activeWidgetElements(page, title = null) {
  if (title) {
    return await page.$$(`.lm_tabs [title*="${title}"]`);
  }
  return await page.$$(".lm_item .lm_stack .lm_tab");
}

async function isWidgetPoppedOut(page, title, opts = {}) {
  await utils.sleep(opts.delay || 0);
  const widgetIdx = await widgetIndex(page, title);
  const elements = await page.$$(".lm_stack .lm_content");
  utils.debug(
    `isWidgetPoppedOut: title=${title} widgetIdx=${widgetIdx}, opts=${JSON.stringify(
      opts
    )}`
  );
  return (
    widgetIdx &&
    utils.debug(
      `isWidgetPoppedOut: innerText=${await elements[
        widgetIdx - 1
      ].innerText()}`
    ) === undefined &&
    (await elements[widgetIdx - 1].innerText()).match(/in popout/) !== null
  );
}

async function widgetIndex(page, title) {
  for (const [idx, tab] of (await page.$$(".lm_tab")).entries()) {
    if (
      (await tab.getAttribute("title")).toLowerCase() === title.toLowerCase()
    ) {
      return idx + 1;
    }
  }
  return 0;
}

async function popoutWidget(page, widgetName, widgetTitle, opts = {}) {
  utils.debug(
    `popoutWidget: widgetName=${widgetName} widgetTitle=${widgetTitle} opts=${JSON.stringify(
      opts
    )}`
  );
  if (
    opts.popout ||
    "all" in globals.POPOUTS ||
    globals.POPOUTS[widgetName.toLowerCase()]
  ) {
    await utils.sleep(opts.wait || 500);
    await popout(page, widgetTitle);
    const widgetPage = (await findPopouts(page, widgetTitle, opts))[0];
    utils.debug(`popoutWidget: widgetPage=${JSON.stringify(widgetPage)}`);
    if (widgetPage === undefined) {
      utils.debug(
        `popoutWidget: failed to find poppped out page ${widgetTitle}`
      );
      return null;
    }
    if (opts.viewport) {
      await widgetPage.setViewportSize(opts.viewport);
    }
    utils.debug(
      `popoutWidget: new page for widgetName=${widgetName} widgetTitle=${widgetTitle} page=${JSON.stringify(
        widgetPage
      )}`
    );
    return widgetPage;
  }
  return page;
}

async function popout(page, title, timeout = 10000) {
  utils.debug(`popout: page=${JSON.stringify(page)} title=${title}`);
  const widgetIdx = await widgetIndex(page, title);
  if (!widgetIdx) {
    utils.debug(`popout: failed to find widgetIndex ${title}`);
    return false;
  }
  if (await isWidgetPoppedOut(page, title)) {
    utils.debug(`popout: ${title} already popped out`);
    return true;
  }
  await selectTab(page, title);
  const selectors = await page.$$(
    ".lm_stack .lm_header .lm_controls .lm_popout"
  );
  await selectors[widgetIdx - 1].click({ delay: 50 });
  return await utils.timer(
    async () => {
      return await isWidgetPoppedOut(page, title);
    },
    { timeout: timeout, message: `popout: ${title} timed out` }
  );
}

async function popin(page, title, opts = {}) {
  const timeout = opts.timeout || 5000;
  let findopts = {};
  for (const [key, value] of Object.entries(opts)) {
    findopts[key] = value;
  }
  findopts.close = true;
  return await utils.timer(
    async () => {
      if (await isWidgetPoppedOut(page, title)) {
        return false;
      }
      await findPopouts(page, title, findopts);
    },
    { timeout: timeout, message: `popin: ${title} timed out` }
  );
}

async function expectWidget(page, title, present = true, opts = {}) {
  expect(await isWidgetVisible(page, title)).to.equal(present);

  if ("poppedOut" in opts) {
    expect(await isWidgetPoppedOut(page, title)).to.equal(opts.poppedOut);
    if (opts.poppedOut) {
      const popoutTitle = opts.popoutTitle || title;
      expect(opts.context).to.not.be.null;
      expect(await findPopouts(page, popoutTitle)).to.not.be.empty;
    }
  }
}

// async function dragAndDrop(page, from, to) {
//   const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
//   await page.dispatchEvent(from, 'dragstart', { dataTransfer });
//   await page.dispatchEvent(to, 'drop', { dataTransfer });
// }

module.exports = {
  activeWidgetElements,
  close,
  closePage,
  closePopouts,
  // dragAndDrop,
  expectWidget,
  findPopouts,
  isWidgetPoppedOut,
  isWidgetVisible,
  maximize,
  popin,
  popout,
  popoutWidget,
  selectTab,
  waitForWidgets,
};

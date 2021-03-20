const puppeteer = require('puppeteer');

const OpenBrowser = async () => {
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox"]
  });
  return browser;
}

const CloseBrowser = async (browser) => {
  await browser.close();
}

const AddPage = async (browser, url) => {
  const page = await browser.newPage();
  await page.goto(url);
  return page;
}

module.exports = {
  OpenBrowser,
  CloseBrowser,
  AddPage
};
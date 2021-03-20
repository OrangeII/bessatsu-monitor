const Monitor = require('./Monitor.js');
const Browser = require('./Browser.js');


const TryScraper = async (parameters) => {
  let browser = await Browser.OpenBrowser();
  let page = await Browser.AddPage(browser, parameters.url);
  let result = await Monitor.Lookup(page, parameters.lookupText, parameters.htmlQuery);
  await Browser.CloseBrowser(browser)
  return result;
}

module.exports = { TryScraper };
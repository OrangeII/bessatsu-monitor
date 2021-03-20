const puppeteer = require('puppeteer');
const $ = require('cheerio');
const events = require('events');
const CronJob = require('cron').CronJob;
const { ReadConfig, PrettyTaskList } = require('./Config.js');

var _browser = null;
var _cronJobs = [];
var MonitorEvents = new events.EventEmitter();

const StartMonitoring = async () => {
  //read config
  let config = await ReadConfig();
  MonitorLog(`starting monitor on config found:\n${await PrettyTaskList()}`, true);

  //open browser
  _browser = await OpenBrowser();

  _cronJobs = [];
  for (let i = 0; i < config.tasks.length; i++) {
    let taskConfig = config.tasks[i];
    let task = {
      ...taskConfig,
      page: null,
      job: null
    };

    //open page in browser
    MonitorLog(`loading page ${taskConfig.url}`);
    let page = await AddPage(_browser, taskConfig.url);
    task.page = page;

    //create CronJob
    let job = new CronJob(taskConfig.crontab, function () {
      TaskCheckPage(task);
    });
    task.job = job;

    //add to list of tasks
    _cronJobs.push(task);
  }

  StartJobs(_cronJobs);

}

const StopMonitoring = async () => {
  if (!_browser)
    return;

  MonitorLog(`stopping monitor`, true);
  StopJobs(_cronJobs);
  await CloseBrowser(_browser);
  _browser = null;
}

const StartJobs = (cronJobs) => {
  if (!cronJobs)
    return;
  //start CronJobs
  cronJobs.forEach(cronJob => {
    if (!cronJob.job.running) {
      MonitorLog(`starting task '${cronJob.title}'`, true);
      cronJob.job.start();
    }
  });
}

const StopJobs = (cronJobs) => {
  if (!cronJobs)
    return;
  //stop CronJobs
  cronJobs.forEach(cronJob => {
    if (cronJob.job.running) {
      MonitorLog(`stopping task '${cronJob.title}'`, true);
      cronJob.job.stop();
    }
  });
}

const TaskCheckPage = async (task) => {
  let success = await Lookup(task.page, task.lookupText, task.htmlQuery);
  if (!success) return;
  MonitorLog(`'${task.lookupText}' was found at ${task.url}`, true);
}

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

const Lookup = async (page, lookupText, htmlQuery) => {
  await page.reload();
  let html = await page.evaluate(() => document.body.innerHTML);
  let products = [];
  $(htmlQuery, html).each((i, result) => {
    products[i] = $(result).text();
  });
  for (let i = 0; i < products.length; i++) {
    if (products[i].toLowerCase().includes(lookupText.toLowerCase())) return true;
  }
  return false;
}

const MonitorLog = (text, broadcast) => {
  console.log(text);
  if (broadcast)
    MonitorEvents.emit('BroadcastMessage', text);
}

module.exports = {
  StartMonitoring,
  StopMonitoring,
  MonitorEvents
};


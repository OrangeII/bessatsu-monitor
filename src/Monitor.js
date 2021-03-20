const Browser = require('./Browser.js');
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
  _browser = await Browser.OpenBrowser();

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
    let page = await Browser.AddPage(_browser, taskConfig.url);
    task.page = page;

    //create CronJob
    let job = new CronJob(taskConfig.crontab, function () {
      PerformCheck(task);
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
  await Browser.CloseBrowser(_browser);
  _browser = null;
}

const StartJobs = (cronJobs) => {
  if (!cronJobs)
    return;
  //start CronJobs
  cronJobs.forEach(cronJob => {
    if (!cronJob.job.running) {
      MonitorLog(`starting task '${cronJob.title}'`);
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
      MonitorLog(`stopping task '${cronJob.title}'`);
      cronJob.job.stop();
    }
  });
}

const PerformCheck = async (task) => {
  let success = await Lookup(task.page, task.lookupText, task.htmlQuery);
  if (!success) return;
  MonitorLog(`'${task.lookupText}' was found at ${task.url}`, true);
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

const GetTaskInfo = (index) => {
  if (index >= _cronJobs.length) return null;
  let task = _cronJobs[index];
  return {
    index: index,
    url: task.url,
    title: task.title,
    isRunning: task.job.running,
    lastRun: task.job.lastDate(),
    nextRun: task.job.nextDate()
  };
}

module.exports = {
  StartMonitoring,
  StopMonitoring,
  Lookup,
  GetTaskInfo,
  MonitorEvents
};


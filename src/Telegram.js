const Config = require('./Config.js');
const TelegramBot = require('node-telegram-bot-api');
const Monitor = require('./Monitor.js');
const ScraperTryout = require('./ScraperTryout.js');

const bot = new TelegramBot(Config.Environment.TELEGRAM_API_TOKEN, { polling: true });

Monitor.MonitorEvents.addListener('BroadcastMessage', (text) => {
  BroadcastMessage(text);
});

const BroadcastMessage = (text) => {
  if (Config.Environment.TELEGRAM_BROADCAST_CHAT_ID == 0) return;
  bot.sendMessage(Config.Environment.TELEGRAM_BROADCAST_CHAT_ID, text);
};

bot.onText(/\/tasks\s*(\-m)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  let response = "";
  console.log(match);
  if (match.length > 1 && match[1] == '-m')
    response = `tasks in loaded config:\n${await Monitor.PrettyTaskList()}`;
  else
    response = `tasks in remote config:\n${await Config.PrettyTaskList()}`;
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/task\s*(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const index = Number(match[1]);
  const task = await Config.GetTask(index);
  let response = "";
  if (!task)
    response = `there is no task at index ${index}`;
  else {
    response = JSON.stringify(task, null, 2);
  }
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/addTask\s*(.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let newTask = await Config.GetTaskTemplate();
  newTask.title = match[1];
  const index = await Config.AddTask(newTask);
  let response = `new task '${newTask.title}' was created at index ${index}`;
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/deleteTask\s*(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const index = Number(match[1]);
  let response = "";
  if (!await Config.DeleteTask(index))
    response = `there is no task at index ${index}`;
  else {
    response = `task deleted, remaining tasks:\n${await Config.PrettyTaskList()}`;
  }
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/updateTask\s*(\d+) (\w+) (.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const index = Number(match[1]);
  let task = await Config.UpdateTask(index, match[2], match[3]);
  let response = "";
  if (!task)
    response = "update failed! check your arguments.";
  else {
    response = `task ${index} updated:\n${JSON.stringify(task, null, 2)}`;
  }
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/restartMonitor/, async (msg) => {
  const chatId = msg.chat.id;
  let response = "restarting...";

  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });

  await Monitor.StopMonitoring();
  await Monitor.StartMonitoring();

  response = "restart successful";
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/taskStatus\s*(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const index = Number(match[1]);

  let info = Monitor.GetTaskInfo(index);
  let response = "";
  if (!info)
    response = `there is no task at index ${index}`;
  else {
    response = `url: ${info.url}\nStatus: ${info.isRunning ? 'running' : 'not running'}\nLast check: ${info.lastRun}\nNext check: ${info.nextRun}`;
  }

  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/tryScraper\s*(.+)/gms, async (msg, match) => {
  const chatId = msg.chat.id;
  let response = "";
  let parameters = null;
  try {
    parameters = JSON.parse(match[1]);
  }
  catch (err) {
    response = 'malformed request, make sure parameters are in a valid JSON';
  }

  if (parameters) {
    if (!('url' in parameters)
      || !('lookupText' in parameters)
      || !('htmlQuery' in parameters)) {
      response = 'parameters must contain "url", "lookupText" and "htmlQuery" fields';
    } else {
      bot.sendMessage(chatId, 'handling request...', { reply_to_message_id: msg.message_id });
      if (await ScraperTryout.TryScraper(parameters)) {
        response = 'The text was found';
      } else {
        response = 'The text was not found';
      }
    }
  }
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

module.exports = {
  bot
};
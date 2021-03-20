const Config = require('./Config.js');
const TelegramBot = require('node-telegram-bot-api');
const Monitor = require('./Monitor.js');

const bot = new TelegramBot(Config.Environment.TELEGRAM_API_TOKEN, { polling: true });

Monitor.MonitorEvents.addListener('BroadcastMessage', (text) => {
  BroadcastMessage(text);
});

const BroadcastMessage = (text) => {
  bot.sendMessage(Config.Environment.TELEGRAM_BROADCAST_CHAT_ID, text);
};

bot.onText(/\/tasks/, async (msg) => {
  const chatId = msg.chat.id;
  let response = await Config.PrettyTaskList();
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/task (\d+)/, async (msg, match) => {
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

bot.onText(/\/addTask (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  let newTask = await Config.GetTaskTemplate();
  newTask.title = match[1];
  const index = await Config.AddTask(newTask);
  let response = `new task '${newTask.title}' was created at index ${index}`;
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});

bot.onText(/\/deleteTask (\d+)/, async (msg, match) => {
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

bot.onText(/\/updateTask (\d+) (\w+) (.*)/, async (msg, match) => {
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

  await Monitor.StopMonitoring();
  await Monitor.StartMonitoring();

  let response = "restart successful";
  bot.sendMessage(chatId, response, { reply_to_message_id: msg.message_id });
});


module.exports = {
  bot
};
const axios = require('axios');
const dotenv = require('dotenv');
require('dotenv').config();

dotenv.config({ path: './config/config.env' }); //path is relative to index.js

const Environment = {
  CONFIG_FILE: process.env.CONFIG_FILE,
  TELEGRAM_API_TOKEN: process.env.TELEGRAM_API_TOKEN,
  TELEGRAM_BROADCAST_CHAT_ID: process.env.TELEGRAM_BROADCAST_CHAT_ID
};


const ReadConfig = async () => {
  try {
    let response = await axios.get(Environment.CONFIG_FILE)
    return response.data;
  }
  catch (error) {
    console.log(error.response.body);
  }
}

const SaveConfig = (config) => {
  //remote editing not available at this time
  /*
  fs.writeFileSync(Environment.config_file, JSON.stringify(config, null, 2), err => {
    if (err) {
      console.log(err);
    }
  });
  */
}

const AddTask = async (newTask) => {
  let config = await ReadConfig();
  config.tasks.push(newTask);
  SaveConfig(config);
  return config.tasks.length - 1;
}

const GetTask = async (index) => {
  let config = await ReadConfig();
  if (index >= config.tasks.length)
    return null;
  return config.tasks[index];
}

const UpdateTask = async (index, field, newValue) => {
  let config = await ReadConfig();
  if (index >= config.tasks.length)
    return null;
  let task = config.tasks[index];
  if (!(field in task))
    return null;
  task[field] = newValue;
  SaveConfig(config);
  return task;
}

const DeleteTask = async (index) => {
  let config = await ReadConfig();
  if (index >= config.tasks.length)
    return null;
  config.tasks.splice(index, 1);
  SaveConfig(config);
  return config;
}

const GetTaskTemplate = () => {
  return {
    title: "",
    url: "",
    lookupText: "",
    htmlQuery: "",
    crontab: ""
  };
}

const PrettyTaskList = async () => {
  const config = await ReadConfig();
  let ret = "";
  for (let i = 0; i < config.tasks.length; i++) {
    ret += `${i}: ${config.tasks[i].title}\n`;
  }
  return ret;
};


module.exports = {
  ReadConfig,
  AddTask,
  GetTask,
  DeleteTask,
  UpdateTask,
  GetTaskTemplate,
  PrettyTaskList,
  Environment
};

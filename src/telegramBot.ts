require("dotenv").config();
const process = require("process");
const TelegramBot = require("node-telegram-bot-api");

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(telegramBotToken, { polling: true });

import {
  chatGptThreePointFive,
  transcriptions,
  transcriptionsVideo,
} from "./chatgpt_api";

// Matches "/echo [whatever]"

export const start = async () => {
  bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
  });

  // Listen for any kind of message. There are different kinds of
  // messages.
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    console.log("reviced tg msg : ", msg.text);

    const text = await chatGptThreePointFive({
      content: msg.text,
      model: "gpt-3.5-turbo",
      webSearch: false,
      role: "user",
    });

    await bot.sendMessage(chatId, text);
  });
};

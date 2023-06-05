// Environment variables
require("dotenv").config();
const qrcode = require("qrcode-terminal");

// const process = require("process");
// const ffmpeg = require("fluent-ffmpeg");
// const moment = require("moment");
// const fs = require("fs");

import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";

import { ChatGPTClient } from "@waylaidwanderer/chatgpt-api";
const Keyv = require("keyv");
const { KeyvFile } = require("keyv-file");

import {
  chatGptThreePointFive,
  transcriptions,
  transcriptionsVideo,
} from "./chatgpt_api";

import { pollyTextToSpeech } from "./aws_polly";
import { azureTextToSpeech } from "./azure-text-to-speech";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  },
});

// Entrypoint
export const start = async () => {
  client.on("qr", (qr: string) => {
    console.log("[Whatsapp] Scan this QR code in whatsapp to log in:");
    qrcode.generate(qr, { small: true });
  });

  // Whatsapp ready
  client.on("ready", () => {
    console.log("[Whatsapp] Browser Client is ready!");
  });

  // client.on("message_create", async (message: any) => {
  //   // Fired on all message creations, including your own
  //   if (!message.fromMe) return;
  //   if (message.body.length == 0 && message.hasMedia) {
  //     console.log("received voice msg for your self");
  //     message.reply("you can not send voice to your self");
  //   }
  // });

  // Whatsapp message
  client.on("message", async (message: any) => {
    // if (message.body.length == 0) return;
    if (message.from == "status@broadcast") return;

    if (message.body.startsWith("!chat")) {
      // Get the rest of the message
      const dePrefix = message.body.substring(6);
      if (!dePrefix) {
        return;
      }
      await handleGptweb(message, dePrefix);
    }

    if (message.body.startsWith("!gpt")) {
      // Get the rest of the message
      const dePrefix = message.body.substring(5);
      if (!dePrefix) {
        return;
      }
      await handleMessage(message, dePrefix);
    } else if (message.body.length == 0 && message.hasMedia) {
      // mimetype: 'audio/ogg; codecs=opus',
      handleMedia(message);
    }
  });

  client.initialize();
};

const handleGptweb = async (message: any, prompt: string) => {
  try {
    const text = await chatGptThreePointFive({
      content: prompt,
      model: "gpt-3.5-turbo",
      webSearch: false,
      role: "user",
    });
    message.reply(text);
  } catch (error: any) {
    console.error("An error occured", error);
    message.reply(
      "An error occured, please contact the administrator. (" +
        error.message +
        ")"
    );
  }
};

let messagesInfo = {
  conversationId: "",
  messageId: "",
};

const handleMessage = async (message: any, prompt: any) => {
  if (!prompt) {
    return;
  }

  const clientOptions = {
    // (Optional) Support for a reverse  proxy for the completions endpoint (private API server).
    // Warning: This will expose your `openaiApiKey` to a third-party. Consider the risks before using this.
    // reverseProxyUrl: "https://api.openai.com/v1/completions",
    // reverseProxyUrl: "https://chatgpt.hato.ai/completions",
    // reverseProxyUrl: "https://api.openai.com/v1/chat/completions",
    // (Optional) Parameters as described in https://platform.openai.com/docs/api-reference/completions
    modelOptions: {
      // You can override the model name and any other parameters here.
      // model: 'text-chat-davinci-002-20221122',
      // model: "text-davinci-002-render",
      // model: "text-davinci-003",
      // temperature:1
    },
    // (Optional) Set custom instructions instead of "You are ChatGPT...".
    // promptPrefix: 'You are Bob, a cowboy in Western times...',
    promptPrefix: "",
    // (Optional) Set a custom name for the user
    // userLabel: 'User',
    // (Optional) Set a custom name for ChatGPT
    // chatGptLabel: 'ChatGPT',
    // (Optional) Set to true to enable `console.debug()` logging
    debug: true,
  };

  const cacheOptions = {
    // Options for the Keyv cache, see https://www.npmjs.com/package/keyv
    // This is used for storing conversations, and supports additional drivers (conversations are stored in memory by default)
    // For example, to use a JSON file (`npm i keyv-file`) as a database:
    store: new KeyvFile({ filename: "cache.json" }),
  };

  try {
    const chatGptClient = new ChatGPTClient(
      process.env.OPENAI_ACCESS_TOKEN,
      clientOptions,
      cacheOptions
    );

    // const chatGptClient = new ChatGPTClient(
    //   process.env.OPENAI_API_KEY,
    //   clientOptions,
    //   cacheOptions
    // );

    const response = await chatGptClient.sendMessage(prompt, {
      conversationId: messagesInfo.conversationId ?? "",
      parentMessageId: messagesInfo.messageId ?? "",
    });

    messagesInfo = response;
    console.log(response); // { response: 'Hi! How can I help you today?', conversationId: '...', messageId: '...' }

    message.reply(response.response);
  } catch (error: any) {
    console.error("An error occured", error);
    message.reply(
      "An error occured, please contact the administrator. (" +
        error.message +
        ")"
    );
  }
};

const handleMedia = async (message: any) => {
  try {
    const media = await message.downloadMedia();
    let transcriptionText = "";

    // if (
    //   !media.mimetype.includes("audio") ||
    //   !media.mimetype.includes("video")
    // ) {
    //   console.log("media.mimetype is not a voice or video");
    //   console.log("media data :", media);
    //   return;
    // }

    if (media.mimetype.includes("video")) {
      transcriptionText = await transcriptionsVideo(media.data, "fasterWhiper");
    } else if (media.mimetype.includes("audio")) {
      transcriptionText = await transcriptions(media.data, "fasterWhiper");
    } else {
      console.log("media.mimetype is not a voice or video");
      console.log("media mimetype :", media.mimetype);
      // message.reply("media.mimetype is not a voice or video");
      return;
    }

    // console.log("dd", message);
    // console.log("media data :", media);
    // console.log("transcriptionText :", transcriptionText);

    if (transcriptionText === "") {
      message.reply("received message empty");
      return;
    }

    const chatGptWebAns = await chatGptThreePointFive({
      content: transcriptionText,
      model: "gpt-3.5-turbo",
      webSearch: false,
      role: "user",
    });

    const textmsg =
      "Received voice message : \n" +
      transcriptionText +
      "\nChatgpt answer:\n" +
      chatGptWebAns;

    // const azurePath = await azureTextToSpeech(chatGptWebAns);
    // const azureVoice = MessageMedia.fromFilePath(azurePath);
    // await message.reply(azureVoice);

    const pollyPath = await pollyTextToSpeech(chatGptWebAns ?? "什麼都沒有");
    const pollyVoice = MessageMedia.fromFilePath(pollyPath);
    await message.reply(pollyVoice);

    // var bitmap = fs.readFileSync(pollyPath, {
    //   encoding: "base64",
    // });
    // const pollyVoice = new MessageMedia("audio/ogg", bitmap);
    // await message.reply(pollyVoice);

    await message.reply(textmsg);
  } catch (error) {
    console.error("An error occured", error);
    message.reply("An error occured (" + error.message + ")");
  }
};

// Environment variables
require("dotenv").config();

const process = require("process");
const qrcode = require("qrcode-terminal");
const Keyv = require("keyv");
const { KeyvFile } = require("keyv-file");

import { Client, LocalAuth, MessageMedia } from "whatsapp-web.js";
import { ChatGPTClient } from "@waylaidwanderer/chatgpt-api";

// const { MessageMedia } = require("whatsapp-web.js");

import { chatGptThreePointFive } from "./chatgpt_api";
import { getModels, setModel, text2img, pngInfo } from "./stable_diffusion_api";

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

const command = [
  { id: 0, name: "!getcmd", description: "get Command " },
  { id: 1, name: "!gpt", description: "chat to gpt " },
  { id: 2, name: "!chat", description: "chat to chatgpt " },
  { id: 3, name: "!sdimg", description: "stable-diffusion text2img" },
];

// Prefix check
// const prefixEnabled = process.env.PREFIX_ENABLED == "true";
// const prefix = "!gpt";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  },
});

// Entrypoint
export const start = async () => {
  // Ensure the API is properly authenticated
  //   try {
  //     await api.initSession();
  //   } catch (error: any) {
  //     console.error(
  //       "[Whatsapp ChatGPT] Failed to authenticate with the ChatGPT API: " +
  //         error.message
  //     );
  //     process.exit(1);
  //   }

  // Whatsapp auth
  client.on("qr", (qr: string) => {
    console.log("[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:");
    qrcode.generate(qr, { small: true });
  });

  // Whatsapp ready
  client.on("ready", () => {
    console.log("[Whatsapp ChatGPT] Browser Client is ready!");
  });

  client.on("message_create", async (message: any) => {
    // Fired on all message creations, including your own
    if (!message.fromMe) return;

    wsCommand(message);

    //message is send by me and with prefix !gpt
    // const prompt = filterMessage(message.body);

    // if (!prompt) return;
    // await handleMessage(message, prompt);
  });

  // Whatsapp message
  client.on("message", async (message: any) => {
    if (message.body.length == 0) return;
    if (message.from == "status@broadcast") return;
    wsCommand(message);
  });

  client.initialize();
};

const wsCommand = async (message: any) => {
  if (message.body.startsWith("!getcmd")) {
    let text = "";
    command.forEach((element) => {
      text +=
        "command_name:" +
        element.name +
        "\n" +
        "command_description:" +
        element.description +
        "\n\n";
    });
    message.reply(text);
  }

  if (message.body.startsWith("!sdimg")) {
    const dePrefix = message.body.substring(7);
    await imgProcess(message, dePrefix);
  }

  if (message.body.startsWith("!gpt")) {
    // Get the rest of the message
    const dePrefix = message.body.substring(5);

    await handleMessage(message, dePrefix);
  }

  if (message.body.startsWith("!chat")) {
    // Get the rest of the message
    const dePrefix = message.body.substring(6);

    if (!dePrefix) {
      return;
    }

    await handleGptweb(message, dePrefix);
  }
};

const imgProcess = async (message: any, dePrefix: string) => {
  const imgData: any = await text2img({
    prompt: dePrefix,
    batch_size: 1,
    cfg_scale: 7,
    steps: 55,
    styles: ["common_1"],
    width: 480,
    height: 720,
    restore_faces: true,
    sampler_index: "DPM++ SDE Karras",
  });

  // const imgArray: any = [];

  try {
    imgData.images.forEach((image) => {
      const media = new MessageMedia("image/png", image);
      message.reply(media);
    });
  } catch (error: any) {
    console.error("An error occured", error);
    message.reply(
      "An error occured, please contact the administrator. (" +
        error.message +
        ")"
    );
  }
};

// const filterMessage = (text: string): any => {
//   if (!prefixEnabled) return text;
//   if (!text.startsWith(prefix)) return;

//   return text.substring(prefix.length + 1);
// };

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

  // const response2 = await chatGptClient.sendMessage(
  //   "Write a poem about cats.",
  //   {
  //     conversationId: response.conversationId,
  //     parentMessageId: response.messageId,
  //   }
  // );
  // console.log(response2.response); // Cats are the best pets in the world.

  // const response3 = await chatGptClient.sendMessage("Now write it in French.", {
  //   conversationId: response2.conversationId,
  //   parentMessageId: response2.messageId,
  //   // If you want streamed responses, you can set the `onProgress` callback to receive the response as it's generated.
  //   // You will receive one token at a time, so you will need to concatenate them yourself.
  //   onProgress: (token) => console.log(token),
  // });
  // console.log(response3.response); // Les chats sont les meilleurs animaux de compagnie du monde.
};

// const text2img = async (message: any, prompt: string) => {
//   try {
//     console.log("whatsapp msg get:", prompt);
//     const urlTxt2img = `http://host.docker.internal:7860/sdapi/v1/txt2img`;

//     const requestTxt2imgData = {
//       prompt: prompt,
//       negative_prompt: "",
//       steps: 25, //採樣
//       cfg_scale: 7, // prompt 符合程度
//       batch_size: 1, // item of img
//       restore_faces: true, //面部修復
//       face_restoration_model: "GFPGAN", //面部修復 模型
//       sampler_index: "DPM++ SDE Karras", //模型計算方式 "DPM++ SDE Karras" "DDIM" "DPM2 Karras"
//       styles: ["common_1"], //預設 prompt
//       width: 480,
//       height: 720,
//     };

//     // 5 min timeout:
//     // const controller = new AbortController();
//     // const timeoutId = setTimeout(() => controller.abort(), 500000);

//     const Txt2imgResponse = await fetch(urlTxt2img, {
//       method: "POST", // *GET, POST, PUT, DELETE, etc.
//       headers: {
//         "Content-Type": "application/json",
//       },
//       referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
//       body: JSON.stringify(requestTxt2imgData), // body data type must match "Content-Type" header
//       // signal: controller.signal,
//     });
//     // clearTimeout(timeoutId);

//     const results = await Txt2imgResponse.json();

//     const outputjson = {
//       info: results.parameters,
//       parameters: JSON.parse(results.info),
//     };

//     console.log("Txt2imgResponse_parameters", outputjson);

//     results.images.forEach((image) => {
//       const media = new MessageMedia("image/png", image);
//       message.reply(media);
//       // pngInfo(message, image); pass
//     });
//   } catch (error: any) {
//     console.error("An error occured", error);
//     message.reply(
//       "An error occured, please contact the administrator. (" +
//         error.message +
//         ")"
//     );
//   }
// };

/*
export const start = async () => {
  const chatGptClient = new ChatGPTClient(
    process.env.OPENAI_ACCESS_TOKEN,
    clientOptions,
    cacheOptions
  );

  const response = await chatGptClient.sendMessage("Hello!");
  console.log(response); // { response: 'Hi! How can I help you today?', conversationId: '...', messageId: '...' }

  const response2 = await chatGptClient.sendMessage(
    "Write a poem about cats.",
    {
      conversationId: response.conversationId,
      parentMessageId: response.messageId,
    }
  );
  console.log(response2.response); // Cats are the best pets in the world.

  const response3 = await chatGptClient.sendMessage("Now write it in French.", {
    conversationId: response2.conversationId,
    parentMessageId: response2.messageId,
    // If you want streamed responses, you can set the `onProgress` callback to receive the response as it's generated.
    // You will receive one token at a time, so you will need to concatenate them yourself.
    onProgress: (token) => console.log(token),
  });
  console.log(response3.response); // Les chats sont les meilleurs animaux de compagnie du monde.
};
*/

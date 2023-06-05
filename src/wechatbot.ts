import { WechatyBuilder } from "wechaty";

const QRCode = require("qrcode-terminal");

const bot = WechatyBuilder.build({
  name: "wechat-assistant", // generate xxxx.memory-card.json and save login data for the next login
});
import {
  chatGptThreePointFive,
  transcriptions,
  transcriptionsVideo,
} from "./chatgpt_api";

export const start = async () => {
  const initializedAt = Date.now();
  bot
    .on("scan", async (qrcode, status) => {
      const url = `https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}`;
      console.log(`Scan QR Code to login: ${status}\n${url}`);

      QRCode.generate(qrcode, { small: true });
    })
    .on("login", async (user) => {
      console.log(`User ${user} logged in`);
    })
    .on("message", async (message) => {
      if (message.date().getTime() < initializedAt) {
        return;
      }

      if (message.type() === 2) {
        console.log("message voice", message);
      }
      if (message.text().startsWith("/gpt")) {
        console.log(`/gpt Message text: ${message.text()}`);

        const dePrefix = message.text().substring(4);

        if (dePrefix.length < 1) {
          return;
        }

        console.log(`dePrefix: ${dePrefix}`);

        // await message.say("pong");
        const text = await chatGptThreePointFive({
          content: dePrefix,
          model: "gpt-3.5-turbo",
          webSearch: false,
          role: "user",
        });

        message.say(text);

        return;
      }
    });
  try {
    await bot.start();
  } catch (e) {
    console.error(
      `⚠️ Bot start failed, can you log in through wechat on the web?: ${e}`
    );
  }
};

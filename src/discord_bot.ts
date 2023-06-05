require("dotenv").config();

import {
  chatGptThreePointFive,
  fasterWhiperTranscriptions,
  toBasse64strTranscriptions,
  transcriptions,
} from "./chatgpt_api";
import {
  getModels,
  setModel,
  text2img,
  img2img,
  pngInfo,
  getSamplers,
  saveImg,
} from "./stable_diffusion_api";

import { getCommand } from "./discord_bot_command";

import { pollyTextToSpeech } from "./aws_polly";
import { azureTextToSpeech } from "./azure-text-to-speech";

import { ChatGPTClient } from "@waylaidwanderer/chatgpt-api";
import { ConsoleLoggingListener } from "microsoft-cognitiveservices-speech-sdk/distrib/lib/src/common.browser/ConsoleLoggingListener";
import { checkSendfileSize, convertToMp3, makeid } from "./common";

const process = require("process");

const imageToBase64 = require("image-to-base64");

const prism = require("prism-media");

const { createWriteStream } = require("node:fs");

// const { pipeline } = require("node:stream");

const ffmpeg = require("fluent-ffmpeg");

const fs = require("fs");

const axios = require("axios");

const {
  Client,
  Events,
  GatewayIntentBits,
  AttachmentBuilder,
  Partials,
  MessageEmbed,
  REST,
  Routes,
  Collection,
} = require("discord.js");

const {
  generateDependencyReport,
  entersState,
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  EndBehaviorType,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
  StreamType,
  AudioPlayerStatus,
} = require("@discordjs/voice");

let timeoutId: NodeJS.Timeout | null;

let playingStatus = "";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    // GatewayIntentBits.MessageContent,
    // GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message],
});
/* Collection to store voice state */
client.voiceManager = new Collection();

const discordToken = process.env.DISCORD_TOKEN;
const discordCilentId = process.env.CLIENT_ID;
const discordCilentSecret = process.env.CLIENT_SECRET;

const Keyv = require("keyv");
const { KeyvFile } = require("keyv-file");

const currentDateString = new Date().toLocaleDateString("en-us", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const gptClientOptions = {
  // (Optional) Support for a reverse  proxy for the completions endpoint (private API server).
  // Warning: This will expose your `openaiApiKey` to a third-party. Consider the risks before using this.
  // reverseProxyUrl: "https://api.openai.com/v1/completions",
  // reverseProxyUrl: "https://chatgpt.hato.ai/completions",
  // (Optional) Parameters as described in https://platform.openai.com/docs/api-reference/completions
  modelOptions: {
    // You can override the model name and any other parameters here.
    // model: 'text-chat-davinci-002-20221122',
    // model: "text-davinci-002-render",
    // model: "text-davinci-003",
    // model: "gpt-3.5-turbo",
    // temperature:1
  },
  // (Optional) Set custom instructzions instead of "You are ChatGPT...".
  // promptPrefix: 'You are Bob, a cowboy in Western times...',
  promptPrefix:
    "你是Space_bot,你可以做任何事\n" + "今天是 :" + currentDateString,
  // (Optional) Set a custom name for the user
  userLabel: "",
  // (Optional) Set a custom name for ChatGPT
  chatGptLabel: "Space_bot",
  // (Optional) Set to true to enable `console.debug()` logging
  debug: true,
};

const cacheOptions = {
  // Options for the Keyv cache, see https://www.npmjs.com/package/keyv
  // This is used for storing conversations, and supports additional drivers (conversations are stored in memory by default)
  // For example, to use a JSON file (`npm i keyv-file`) as a database:
  store: new KeyvFile({ filename: "discordGptCache.json" }),
};

export const start = async () => {
  const rest = new REST({ version: "10" }).setToken(discordToken);

  (async () => {
    try {
      console.log("Started refreshing application (/) commands.");

      const commands = await getCommand();

      console.log("Successfully reloaded application (/) commands.");

      // await rest.put(Routes.applicationCommands(discordCilentId)

      await rest.put(Routes.applicationCommands(discordCilentId), {
        body: commands,
      });
    } catch (error) {
      console.error(error);
    }
  })();

  // client.once(Events.ClientReady, () => {
  // 	console.log(`Logged in as ${client.user.tag}!`);
  //     console.log(new Date())
  // });

  client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(currentDateString);
    console.log("generateDependencyReport :", generateDependencyReport());
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (!interaction.guildId) {
      await interaction.reply("Please use this bot in a server");
      return;
    }

    const { commandName } = interaction;

    if (commandName === "del-msg") {
      await handleDeleteMessage(interaction);
    }

    if (commandName === "gpt-voice") {
      gptClientOptions.userLabel = interaction.user.username;
      await handleVoice(interaction);
    }

    if (commandName === "gpt") {
      gptClientOptions.userLabel = interaction.user.username;

      interaction.deferReply();

      await handleMessage(
        interaction.options.getString("question"),
        interaction
      );
    }

    if (commandName === "gpt-web") {
      interaction.deferReply();
      await handleGptWeb(
        interaction,
        interaction.options.getString("gpt-web-question")
      );
    }

    if (commandName === "sd-change-model") {
      // interaction.deferReply();
      const text = interaction.options.getString("model-name");
      const user = `<@${interaction.user.id}>`;
      await interaction.reply(`${user}\nmodel change to:${text}`);
      await setModel(text);
    }

    if (commandName === "sd-img-img") {
      // console.log(interaction.options);
      await interaction.deferReply();
      await imgToImgProcess(interaction);
    }

    if (commandName === "sd-text-img") {
      await interaction.deferReply();
      await textToImgProcess(interaction);
    }
  });

  client.login(discordToken);
};

const handleVoice = async (interaction: any) => {
  const textChannelId = interaction.channelId;
  const target = interaction.options.getUser("target");
  const voiceChannel = interaction.member.voice.channel;

  console.log("target", target);
  console.log("voiceChannel", voiceChannel);

  await interaction.deferReply();

  let connection = client.voiceManager.get(interaction.channel.guild.id);

  console.log("connection", connection);

  if (!connection) {
    if (!voiceChannel) {
      await interaction.followUp(
        "You must be in a voice channel to use this command!"
      );
      return;
    }

    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
      // debug: true,
    });

    // connection.on("debug", (m) => {
    //   console.log("Voice Debug:", m);
    // });

    client.voiceManager.set(interaction.channel.guild.id, connection);
    await entersState(connection, VoiceConnectionStatus.Ready, 20e3);
    const receiver = connection.receiver;
    // // /* When user speaks in vc*/

    receiver.speaking.on("start", async (userId) => {
      if (userId !== target.id) return;
      if (playingStatus === "playing") return;
      /* create live stream to save audio */

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      await createListeningStream(receiver, userId);
    });

    receiver.speaking.on("end", async (userId) => {
      if (userId !== target.id) return;
      if (playingStatus === "playing") return;

      console.log(`🎤 User ${userId} stopped speaking`);
      console.log(`🕒 Checking if user ${userId} is still speaking`);
      // 设置定时器，在 2 秒后检查是否有再次讲话
      timeoutId = setTimeout(async () => {
        // 如果在 2 秒内用户没有再次讲话
        if (!connection.receiver.connectionData.speaking) {
          console.log(`🎤 User ${userId} did not speak again`);

          // 处理用户停止讲话的情况
          try {
            const pcmfilePath = `src/discord/recordings/${userId}.pcm`;
            const filePath = `src/discord/recordings/${userId}.mp3`;

            await convertToMp3(pcmfilePath, filePath);

            // if (!checkSendfileSize(filePath, 20)) {
            //   return;
            // }

            const revicedText = await toBasse64strTranscriptions(filePath);
            // const revicedText = await fasterWhiperTranscriptions(filePath);
            // fs.unlinkSync(filePath);
            // console.log(`✅ unlinkSync ${filePath}`);

            if (revicedText.includes("Stop talking")) {
              await interaction.followUp(` <@${target.id}> :${revicedText}`);
              await interaction.followUp(`ok 收到 👌！`);

              connection.destroy();
              client.voiceManager.delete(interaction.channel.guild.id);
              return;
            }

            if (revicedText === "") {
              await interaction.followUp(`<@${userId}>我沒有收到你的資訊`);
              return;
            }

            await interaction.followUp(`<@${userId}>:${revicedText}`);
            const chatGptClient = new ChatGPTClient(
              process.env.OPENAI_ACCESS_TOKEN,
              gptClientOptions
              // cacheOptions
            );

            const gptResponse = await chatGptClient.sendMessage(
              revicedText
              //    {
              //   conversationId: messagesInfo.conversationId ?? "",
              //   parentMessageId: messagesInfo.messageId ?? "",
              // }
            );

            // messagesInfo = gptResponse;
            console.log("gptResponse", gptResponse);

            await interaction.followUp(
              `<@${discordCilentId}> :${
                gptResponse.response ?? "對不起,我唔知道(no response)"
              }`
            );
            await handlePlayer(gptResponse, connection, userId);
          } catch (error) {
            // await interaction.followUp(`error :${error}`);
            console.log(error);
          }
        }
      }, 2000);
    });

    await interaction.editReply(
      `🎤 join chat room :${voiceChannel.name} ,chat with <@${target.id}>`
    );
  } else if (connection) {
    await interaction.editReply(`🎤 please try again later`);
    connection.destroy();
    client.voiceManager.delete(interaction.channel.guild.id);
  }
};

async function handlePlayer(gptResponse, connection, userId) {
  try {
    const gptAnwser = gptResponse.response ?? "對不起,我唔知道(no response)";
    const customOutPutPath = `src/discord/voiceToUser/${userId}.ogg`;

    const pollyPath = await pollyTextToSpeech(gptAnwser, customOutPutPath);

    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause,
      },
    });
    const resource = createAudioResource(pollyPath, {
      inputType: StreamType.OggOpus,
    });
    player.play(resource);
    const subscription = connection.subscribe(player);

    player.on(AudioPlayerStatus.Playing, () => {
      console.log("The audio player has started playing!");
    });

    player.addListener("stateChange", (oldOne, newOne) => {
      console.log("stateChange:", newOne.status);
      playingStatus = newOne.status;

      if (newOne.status == "idle") {
        console.log("The player finished unsubscribe player");
        subscription.unsubscribe(player);
        fs.unlinkSync(pollyPath);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

async function createListeningStream(receiver, userId) {
  const opusStream = receiver.subscribe(userId, {
    end: {
      behavior: EndBehaviorType.AfterSilence,
      duration: 100,
    },
  });

  const oggStream = new prism.opus.OggLogicalBitstream({
    opusHead: new prism.opus.OpusHead({
      channelCount: 2,
      sampleRate: 48000,
    }),
    pageSizeControl: {
      maxPackets: 1000,
    },
  });

  const filename = `src/discord/recordings/${userId}.pcm`;
  const out = createWriteStream(filename, { flags: "a" });
  console.log(`👂 Started recording ${filename}`);

  try {
    await opusStream.pipe(oggStream).pipe(out);
    console.log(`✅ Recorded ${filename}`);
  } catch (err) {
    console.log(`❌ Error recording file ${filename} - ${err.message}`);
  }
}

const handleDeleteMessage = async (interaction: any) => {
  const author = interaction.options.getUser("author");
  const channelId = interaction.channelId;

  let countDelRecord = 0;

  try {
    console.log("author", author.id);
    console.log("channelId", channelId);

    if (author.id !== discordCilentId && interaction.guildId === null) {
      await interaction.reply({
        content: `delete msg  author: ${author} \n status: fail \n reason: channel type is dm and author is not bot`,
        ephemeral: true,
      });
      return;
    }

    // await interaction.channel.send(
    //   `delete msg  author: ${author} \n status: success`
    // );

    // for (let i = 0; i < 24; i++) {
    //   await interaction.channel.send(`${i}`);
    // }

    await client.channels.fetch(channelId).then(async (channel) => {
      console.log("channel", channel);

      const msg = await channel.messages.fetch();

      await msg.forEach(async (value, index) => {
        // console.log(`The value at index ${index} is ${value}`);
        if (value.author.id === author.id) {
          console.log(`author is in target ${value.author.id}`);
          countDelRecord++;
          await channel.messages.delete(index);

          console.log("countDelRecord :", countDelRecord);
        } else {
          console.log(`author is not in target  ${value.author.id}`);
        }
      });
    });

    // await interaction.deferReply();
    // await interaction.channel.send(
    //   `delete msg  author: ${author} \n status: success`
    // );

    await interaction.reply({
      content: `delete msg  author: ${author} \nnumber of record: ${countDelRecord} \n status: success`,
      ephemeral: true,
    });
  } catch (error) {
    console.log("has_error: \n", error);
    await interaction.reply({
      content: `delete msg  author: ${author} \nnumber of record: ${countDelRecord} \n status: fail  \n reason: ${error}`,
      ephemeral: true,
    });
  }
};

const imgToImgProcess = async (interaction) => {
  try {
    // const attachment = interaction.options.getAttachment("uploadimg")
    // const name = attachment.name
    // const url = attachment.url
    // const proxyURL = attachment.proxyURL

    // const base64str = await imageToBase64(getAttachment.attachment);
    // console.log(base64str);

    // var fs = require("fs");
    // var bitmap = fs.readFileSync(getattachment.attachment, {
    //   encoding: "base64",
    // });
    // const img = Buffer.from(bitmap).toString("base64");
    // console.log(img);

    const getAttachment = interaction.options.getAttachment("uploadimg");
    console.log(getAttachment);

    const base64str = await imageToBase64(getAttachment.attachment);

    const attachmentsArray: any[] = [];

    const requestTxt2imgData = {
      init_images: [base64str],
      prompt: interaction.options.getString("prompt") ?? "",
      negative_prompt: interaction.options.getString("negative_prompt") ?? "",
      denoising_strength:
        interaction.options.getString("denoising_strength") ?? 0.75,
      cfg_scale: interaction.options.getString("cfg_scale") ?? 7,
      width: interaction.options.getString("width") ?? 512,
      height: interaction.options.getString("height") ?? 512,
      batch_size: interaction.options.getString("batch_size") ?? 1,
      steps: interaction.options.getString("steps") ?? 20,
      sampler_index: interaction.options.getString("sampler"),
      seed: interaction.options.getString("seed") ?? -1,
      styles: [interaction.options.getString("styles") ?? "common_1"],
      restore_faces:
        interaction.options.getString("restore_faces") === "true"
          ? true
          : false,
    };

    // await interaction.editReply({
    //   content: "geted request!.......",
    // });

    const imgToimgResult = await img2img(requestTxt2imgData);

    // // const beforeImgbuffer = Buffer.from(base64str, "base64");
    // const beforeImg: any = new AttachmentBuilder(base64str.attachment, {
    //   name: "beforeImg.png",
    // });
    // attachmentsArray.push(beforeImg);

    const beforeImg: any = new AttachmentBuilder(getAttachment.attachment, {
      name: "beforeImg.png",
    });
    attachmentsArray.push(beforeImg);

    imgToimgResult.images.forEach((image) => {
      const imgbuffer = Buffer.from(image, "base64");
      const sendattachments: any = new AttachmentBuilder(imgbuffer, {
        name: "imgToImg.png",
      });
      attachmentsArray.push(sendattachments);
    });

    const outputjson = {
      info: JSON.parse(imgToimgResult.info),
      parameters: imgToimgResult.parameters,
    };

    attachmentsArray.push(
      new AttachmentBuilder(Buffer.from(JSON.stringify(outputjson, null, 4)), {
        name: "outputjson.json",
      })
    );
    const allowed_mentions = {
      users: [interaction.user.id],
    };

    const contents = `<@${interaction.user.id}>`;

    await interaction.editReply({
      content: contents,
      allowed_mentions: allowed_mentions,
      files: attachmentsArray,
    });
  } catch (error) {
    console.log("has_error: \n", error);
    await interaction.editReply(error.message);
  }
};

const textToImgProcess = async (interaction) => {
  try {
    const option = interaction.options;
    console.log("discord msg get:", option);

    const requestTxt2imgData = {
      prompt: interaction.options.getString("prompt") ?? "",
      negative_prompt: interaction.options.getString("negative_prompt") ?? "",
      cfg_scale: interaction.options.getString("cfg_scale") ?? 7,
      width: interaction.options.getString("width") ?? 512,
      height: interaction.options.getString("height") ?? 512,
      batch_size: interaction.options.getString("batch_size") ?? 1,
      steps: interaction.options.getString("steps") ?? 20,
      sampler_index: interaction.options.getString("sampler"),
      seed: interaction.options.getString("seed") ?? -1,
      styles: [interaction.options.getString("styles") ?? "common_1"],
      restore_faces:
        interaction.options.getString("restore_faces") === "true"
          ? true
          : false,
    };

    const responeText2imgData: any = await text2img(requestTxt2imgData);

    const attachmentsArray: any[] = [];
    responeText2imgData.images.forEach(async (image) => {
      const buffer = Buffer.from(image, "base64");
      const attachment = new AttachmentBuilder(buffer, {
        name: "textToImg.png",
      });
      attachmentsArray.push(attachment);
      // await pngInfo(image);
    });

    const outputjson = {
      info: JSON.parse(responeText2imgData.info),
      parameters: responeText2imgData.parameters,
    };

    attachmentsArray.push(
      new AttachmentBuilder(Buffer.from(JSON.stringify(outputjson, null, 4)), {
        name: "outputjson.json",
      })
    );

    const contents = `<@${interaction.user.id}>`;

    await interaction.editReply({
      content: contents,
      files: attachmentsArray,
    });
  } catch (error: any) {
    console.log("has_error: \n", error);
    await interaction.editReply(error.message);
  }
};

let messagesInfo = {
  conversationId: "",
  messageId: "",
};

const handleGptWeb = async (interaction: any, prompt: string) => {
  try {
    const data = {
      content: prompt,
      model: "gpt-3.5-turbo",
      webSearch: false,
      role: "user",
    };
    const text = await chatGptThreePointFive(data);
    // interaction.editReply(text);
    await interaction.editReply(` <@${interaction.user.id}> \n` + text);
  } catch (error: any) {
    console.log("has_error: \n", error.message);
    await interaction.editReply(error.message);
  }
};

const handleMessage = async (prompt: any, interaction: any) => {
  try {
    const chatGptClient = new ChatGPTClient(
      process.env.OPENAI_ACCESS_TOKEN,
      gptClientOptions,
      cacheOptions
    );

    const response = await chatGptClient.sendMessage(prompt, {
      conversationId: messagesInfo.conversationId ?? "",
      parentMessageId: messagesInfo.messageId ?? "",
    });

    messagesInfo = response;
    console.log(response); // { response: 'Hi! How can I help you today?', conversationId: '...', messageId: '...' }

    const text = response.response;

    await interaction.editReply(` <@${interaction.user.id}> \n` + text);
  } catch (error: any) {
    console.log("has_error: \n", error.message);
    await interaction.editReply(error.message);
  }
};

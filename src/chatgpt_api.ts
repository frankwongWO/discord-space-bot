import { makeid } from "./common";

require("dotenv").config();
const process = require("process");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const ffmpeg = require("fluent-ffmpeg");

const openAiToken = process.env.OPENAI_ACCESS_TOKEN;
// const openAiToken = process.env.OPENAI_API_KEY;

interface Data {
  content?: any;
  role?: string;
  model?: string;
  webSearch?: boolean;
}

enum Service {
  FASTER_WHIPER = "fasterWhiper",
  OPEN_AI = "openAi",
}
enum VoiceType {
  video = "video",
  voice = "voice",
}

export const transcriptionsVideo = async (
  VideoData: string,
  useService: string
) => {
  console.log("call  transcriptions");
  const outputFile = await base64DataConversion(VideoData, VoiceType.video);
  // const result = openAiTranscriptions(outputFile);

  // const result = await fasterWhiperTranscriptions(outputFile);

  let result = "";

  useService === Service.FASTER_WHIPER
    ? (result = await fasterWhiperTranscriptions(outputFile))
    : (result = await openAiTranscriptions(outputFile));

  console.log("transcriptions result text", result);

  return result;
  // const currentDate = new Date().toISOString().slice(0, 10);

  // const videoDataDir = `src/whatsapp/video/${currentDate}`;
  // if (!fs.existsSync(videoDataDir)) {
  //   try {
  //     fs.mkdirSync(videoDataDir, { recursive: true });
  //     console.log(`Created directory ${videoDataDir}`);
  //   } catch (error) {
  //     console.error(`Error creating directory ${videoDataDir}: ${error}`);
  //     return error.message;
  //   }
  // }

  // const receivedVoiceFile = `${videoDataDir}/${makeid(5)}-received_video.mp4`;
  // fs.writeFileSync(receivedVoiceFile, VideoData, "base64");

  // formData.append("file", fs.createReadStream(receivedVoiceFile));
  // formData.append("model", model);

  // const headers = {
  //   "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
  //   Authorization: `Bearer ${openAiToken}`,
  // };

  // try {
  //   const results = await axios.post(url, formData, {
  //     headers: headers,
  //     timeout: 30000,
  //   });
  //   const transcriptionsText = results.data.text;

  //   console.log(`Transcriptions result: ${transcriptionsText}`);

  //   return transcriptionsText;
  // } catch (error) {
  //   console.error(`Error transcribing audio: ${error.message}`);
  //   return "";
  // }
};

export const base64DataConversion = async (voiceData: string, type: string) => {
  const currentDate = new Date().toISOString().slice(0, 10);
  const id = makeid(5);
  const voiceDataDir = `src/whatsapp/${type}/${currentDate}`;
  if (!fs.existsSync(voiceDataDir)) {
    try {
      fs.mkdirSync(voiceDataDir, { recursive: true });
      console.log(`Created directory ${voiceDataDir}`);
    } catch (error) {
      console.error(`Error creating directory ${voiceDataDir}: ${error}`);
      return error.message;
    }
  }

  const receivedVoiceFile = `${voiceDataDir}/${id}-received_${type}.opus`;
  fs.writeFileSync(receivedVoiceFile, voiceData, "base64");

  const outputFile = `src/whatsapp/${type}/${currentDate}/${id}-ffmpeg_voice.${
    type === "voice" ? "mp3" : "mp4"
  }`;

  await new Promise<void>((resolve, reject) => {
    ffmpeg(fs.createReadStream(receivedVoiceFile))
      .toFormat("mp3")
      .on("error", (error) => {
        console.error(`Error converting audio: ${error}`);
        reject(error);
      })
      .on("end", () => {
        console.log(
          `Audio conversion to mp3 complete! Output file: ${outputFile}`
        );
        resolve();
      })
      .pipe(fs.createWriteStream(outputFile));
  });

  return outputFile;
};

export const openAiTranscriptions = async (path: string) => {
  console.log("sending request to openAiTranscriptions");
  const url = "https://api.openai.com/v1/audio/transcriptions";

  const formData = new FormData();
  const model = "whisper-1";

  formData.append("file", fs.createReadStream(path));
  formData.append("model", model);

  const headers = {
    "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    Authorization: `Bearer ${openAiToken}`,
  };

  try {
    const results = await axios.post(url, formData, {
      headers: headers,
      timeout: 30000,
    });
    const transcriptionsText = results.data.text;

    console.log(`openAiTranscriptions result: ${transcriptionsText}`);

    return transcriptionsText;
  } catch (error) {
    console.error(`Error transcribing audio: ${error.message}`);
    // return error.message;
    return "";
  }
};

export const toBasse64strTranscriptions = async (filePath) => {
  try {
    const base64String = await new Promise((resolve, reject) => {
      // Read the file into a buffer
      fs.readFile(filePath, (err, data) => {
        if (err) reject(err);
        // Convert the buffer to a base64 string
        // console.log(base64String);
        resolve(data.toString("base64"));
      });
    });

    if (!base64String) {
      console.log(`❌ to base64String fail  ${filePath}`);
      return;
    }

    console.log("file converted to base64 string~!");

    fs.unlinkSync(filePath);
    console.log(`✅ unlinkSync ${filePath}`);

    const fasterWhiperUrl =
      process.env.FASTER_WHIPER_TRANSCRIPTIONS_API_URL +
      "/base64DataTranscribe";
    const requsetData = {
      file: base64String,
      model_size: "large-v2",
      compute_type: "float16",
      beam_size: 5,
    };

    const headers = {
      "Content-Type": "application/json",
    };

    console.log("sending request to base64Transcriptions");

    const results = await axios.post(fasterWhiperUrl, requsetData, {
      headers: headers,
      timeout: 30000,
    });
    const transcriptionsText = results.data.text;
    console.log(`toBasse64strTranscriptions result: ${transcriptionsText}`);
    return transcriptionsText;
  } catch (error) {
    console.error(`Error toBasse64strTranscriptions audio: ${error.message}`);
    return "";
  }
};

export const fasterWhiperTranscriptions = async (path: string) => {
  console.log("sending request to fasterWhiperTranscriptions");

  const fasterWhiperUrl =
    process.env.FASTER_WHIPER_TRANSCRIPTIONS_API_URL + "/transcribe";

  const formData = new FormData();
  const model_size = "large-v2";
  // large-v2
  // medium
  // tiny
  const device = "cuda";
  const compute_type = "int8";

  // const to_lang = "zh-TW";
  // formData.append("to_lang", to_lang);

  formData.append("file", fs.createReadStream(path));
  formData.append("model_size", model_size);
  formData.append("device", device);
  formData.append("compute_type", compute_type);

  const headers = {
    "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
  };

  try {
    const results = await axios.post(fasterWhiperUrl, formData, {
      headers: headers,
      timeout: 30000,
    });
    const transcriptionsText = results.data.text;

    console.log(`fasterWhiperTranscriptions result: ${transcriptionsText}`);

    return transcriptionsText;
  } catch (error) {
    console.error(`Error transcribing audio: ${error.message}`);
    // return error.message;
    return "";
  }
};

export const transcriptions = async (voiceData: string, useService: string) => {
  console.log("call  transcriptions");
  const outputFile = await base64DataConversion(voiceData, VoiceType.voice);
  // const result = openAiTranscriptions(outputFile);

  // const result = await fasterWhiperTranscriptions(outputFile);

  let result = "";

  useService === Service.FASTER_WHIPER
    ? (result = await fasterWhiperTranscriptions(outputFile))
    : (result = await openAiTranscriptions(outputFile));

  console.log("transcriptions result text", result);

  return result;

  // const url = "https://api.openai.com/v1/audio/transcriptions";

  // const formData = new FormData();
  // const model = "whisper-1";
  // const currentDate = new Date().toISOString().slice(0, 10);
  // const id = makeid(5);

  // const voiceDataDir = `src/whatsapp/voice/${currentDate}`;
  // if (!fs.existsSync(voiceDataDir)) {
  //   try {
  //     fs.mkdirSync(voiceDataDir, { recursive: true });
  //     console.log(`Created directory ${voiceDataDir}`);
  //   } catch (error) {
  //     console.error(`Error creating directory ${voiceDataDir}: ${error}`);
  //     return error.message;
  //   }
  // }

  // const receivedVoiceFile = `${voiceDataDir}/${id}-received_voice.opus`;
  // fs.writeFileSync(receivedVoiceFile, voiceData, "base64");

  // const outputFile = `src/whatsapp/voice/${currentDate}/${id}-ffmpeg_voice.mp3`;

  // await new Promise<void>((resolve, reject) => {
  //   ffmpeg(fs.createReadStream(receivedVoiceFile))
  //     .toFormat("mp3")
  //     .on("error", (error) => {
  //       console.error(`Error converting audio: ${error}`);
  //       reject(error);
  //     })
  //     .on("end", () => {
  //       console.log(
  //         `Audio conversion to mp3 complete! Output file: ${outputFile}`
  //       );
  //       resolve();
  //     })
  //     .pipe(fs.createWriteStream(outputFile));
  // });

  // formData.append("file", fs.createReadStream(outputFile));
  // formData.append("model", model);

  // const headers = {
  //   "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
  //   Authorization: `Bearer ${openAiToken}`,
  // };

  // try {
  //   const results = await axios.post(url, formData, {
  //     headers: headers,
  //     timeout: 30000,
  //   });
  //   const transcriptionsText = results.data.text;

  //   console.log(`Transcriptions result: ${transcriptionsText}`);

  //   return transcriptionsText;
  // } catch (error) {
  //   console.error(`Error transcribing audio: ${error.message}`);
  //   return error.message;
  // }
};

export const chatGptThreePointFive = async (parameters: Data) => {
  if (!parameters.content) {
    return;
  }

  console.log("sending request to chatgpt");

  const url = "https://api.openai.com/v1/chat/completions";

  //   const freeurl = "https://chatgpt-api.shn.hk/v1/";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAiToken}`,
  };

  let webSearchText = "";

  if (parameters.webSearch) {
    webSearchText = await webSearchApi(parameters.content, 3, "hongkong");
  }

  const requsetData = {
    model: parameters.model ?? "gpt-3.5-turbo",
    // gpt-3.5-turbo
    // gpt-4-32k
    messages: [
      {
        role: "system",
        content: "你是一個語音助理，你所有的對話必須以廣東話口語形式回答",
      },

      // {
      //   role: "system",
      //   content: "All your answers must be in json format  "text":{<your text>},  ",
      // },
      {
        role: parameters.role ?? "user",
        content:
          parameters.webSearch === true ? webSearchText : parameters.content,
      },
    ],
  };

  try {
    const results = await axios.post(url, requsetData, {
      headers: headers,
    });

    const chatMessages = results.data.choices[0].message.content.trim();
    console.log("chatGptWeb_result: ", results.data);
    console.log("chatGptWeb_message: ", chatMessages);
    return chatMessages;
  } catch (error) {
    console.log("chatGptWeb_error: ", error.message);
  }
};

export const webSearchApi = async (
  query?: string,
  numResults?: number,
  region?: string
) => {
  let url =
    `https://ddg-webapp-aagd.vercel.app/search?` +
    `max_results=${numResults ?? 3}` +
    `&q=${query}` +
    // + `&time=`
    `&region=${region ?? "hongkong"}`;

  // const response = await fetch(url);

  const results = await axios.get(url);

  const result = results.data;

  let resultText = "";

  console.log("webSearchApi_url: ", url);
  results.data.forEach((data, index: number) => {
    resultText += `[${index + 1}]"${data.body}"\nURL:${data.href}\n`;
    // console.log(`[${index+1}]"${result.body}"\nURL:${result.href}`)
  });

  const Instructions =
    "Web search results:\n" +
    resultText +
    "\nQuery:" +
    query +
    "\nUsing the provided web search results, write a comprehensive reply to the given query. Make sure to cite results using [[number](URL)] notation after the reference. If the provided search results refer to multiple subjects with the same name, write separate answers for each subject." +
    "\nReply in 中文";

  console.log("Instructions", Instructions);
  return Instructions;
};

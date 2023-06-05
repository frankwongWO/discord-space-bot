require("dotenv").config();

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { makeid, convertToMp3, convertToOgg, mkDateDir } from "./common";

const subscriptionKey = process.env.AZURE_SUBSCRIPTIONKEY ?? "";
const region = process.env.AZURE_REGION ?? "";

export const azureTextToSpeech = async (text: string): Promise<string> => {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    subscriptionKey,
    region
  );

  // 将输出语音设置为粤语
  speechConfig.speechSynthesisLanguage = "zh-HK	";
  speechConfig.speechSynthesisVoiceName = "zh-HK-WanLungNeural";

  // speechConfig.speechSynthesisLanguage = "en-US";
  // speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

  const uid = makeid(5);
  const audioOutputPath = `${mkDateDir("azure")}/${uid}.wav`;
  const audioConfig = sdk.AudioConfig.fromAudioFileOutput(audioOutputPath);

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

  const completed = await new Promise<string>((resolve, reject) => {
    synthesizer.speakTextAsync(
      text,
      async (result: sdk.SpeechSynthesisResult) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          console.log("Speech synthesis completed.");
          resolve(audioOutputPath);
        } else {
          reject(result.errorDetails);
        }
        synthesizer.close();
      },
      (err: any) => {
        console.error("Speech synthesis error: " + err);
        reject(err);
        synthesizer.close();
      }
    );
  });

  // wav
  // return completed;
  // mp3
  // const convertmp3 = await convertToMp3(completed, uid);
  // ogg
  const convertogg = await convertToOgg("azure", completed, uid);
  return convertogg;
};

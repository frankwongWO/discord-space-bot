require("dotenv").config();
import process from "process";
import { makeid, convertToMp3, convertToOgg, mkDateDir } from "./common";
// const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
import AWS from "aws-sdk";

// const moment = require("moment");

const region = process.env.AWS_DEFAULT_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

export const pollyTextToSpeech = async (
  textData: string,
  outPath?: string,
  OutputFormat?: string
) => {
  const ranID = makeid(5);

  AWS.config.update({
    region: region,
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  });

  const polly = new AWS.Polly();

  const params = {
    OutputFormat: OutputFormat ?? "ogg_vorbis",
    SampleRate: "24000",
    Text: textData,
    TextType: "text",
    Engine: "neural",
    LanguageCode: "yue-CN",
    VoiceId: "Hiujin",
  };

  //   {
  //     "Engine": "string",
  //     "LanguageCode": "string",
  //     "LexiconNames": [ "string" ],
  //     "OutputFormat": "string",
  //     "SampleRate": "string",
  //     "SpeechMarkTypes": [ "string" ],
  //     "Text": "string",
  //     "TextType": "string",
  //     "VoiceId": "string"
  //  }

  // await polly.synthesizeSpeech(params, (err, data) => {
  //   if (err) {
  //     console.log(err);
  //   } else if (data.AudioStream instanceof Buffer) {
  //     fs.writeFile(outPutDir, data.AudioStream, function (err) {
  //       if (err) {
  //         console.log(err);
  //       } else {
  //         console.log("File saved successfully.");
  //       }
  //     });
  //   }
  // });

  const outPutDir =
    outPath ?? `${mkDateDir("aws")}/${ranID}.${OutputFormat ?? "ogg"}`;

  await new Promise<void>((resolve, reject) => {
    polly.synthesizeSpeech(params, (err, data) => {
      if (err) {
        console.log(err);
      } else if (data.AudioStream instanceof Buffer) {
        fs.writeFile(outPutDir, data.AudioStream, function (err) {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            console.log("Polly File saved successfully.");
            resolve();
          }
        });
      }
    });
  });

  // const oggPath = await convertToOgg("aws", outPutDir, ranID);
  return outPutDir;
};

// const convertToOgg = async (inputPath: string, ranID: string) => {
//   const outputPath = `${mkDateDir()}/${ranID}-polly.ogg`;

//   await new Promise<void>((resolve, reject) => {
//     ffmpeg(fs.createReadStream(inputPath))
//       .toFormat("ogg")
//       .audioCodec("opus")
//       .on("error", (error) => {
//         console.error(`Error converting audio: ${error}`);
//         reject(error);
//       })
//       .on("end", () => {
//         console.log(
//           `Audio conversion to ogg complete! Output file: ${outputPath}`
//         );
//         resolve();
//       })
//       .pipe(fs.createWriteStream(outputPath));
//   });

//   return outputPath;
// };

// const mkDateDir = () => {
//   const formattedDate = moment(new Date()).format("YYYY-MM-DD");

//   const dateDir = `src/aws/${formattedDate}`;

//   if (!fs.existsSync(dateDir)) {
//     fs.mkdirSync(dateDir, function (err) {
//       if (err) {
//         return console.error(err);
//       }
//       console.log(`make dir for date ${dateDir}`);
//     });
//   }

//   return dateDir;
// };

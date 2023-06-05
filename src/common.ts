const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const moment = require("moment");

export const makeid = (length: number) => {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
};

export async function convertToMp3(input, outputFilename) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .toFormat("mp3")
      .on("error", (err) => {
        reject(`An error occurred while converting ${input}: ${err.message}`);
      })
      .on("end", () => {
        console.log(`✅ ${input} has been converted to ${outputFilename}`);
        fs.unlinkSync(input);
        console.log(`✅ unlinkSync ${input}`);
        resolve(outputFilename);
      })
      .save(outputFilename);
  });
}

export const convertToOgg = async (
  path: string,
  audioFilePath: string,
  uid: string
) => {
  const mp3OutputPath = `${mkDateDir(path)}/${uid}.ogg`;

  return new Promise<string>((resolve, reject) => {
    ffmpeg(audioFilePath)
      .toFormat("ogg")
      .audioCodec("opus")
      .on("error", (err) => {
        console.error("Error converting audio: " + err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("Audio conversion complete! Output file: " + mp3OutputPath);
        resolve(mp3OutputPath);
      })
      .save(mp3OutputPath);
  });
};

export const mkDateDir = (type: string) => {
  const formattedDate = moment(new Date()).format("YYYY-MM-DD");

  const dateDir = `src/${type}/${formattedDate}`;

  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log(`make dir for date ${dateDir}`);
    });
  }

  return dateDir;
};

export const checkSendfileSize = (path, siezOfKb) => {
  const stats = fs.statSync(path);
  const fileSizeInBytes = stats.size;
  const fileSizeInKB = fileSizeInBytes / 1024;
  if (fileSizeInKB < siezOfKb) {
    console.log(`❌ size < ${siezOfKb}kb `);
    return false;
  }
  console.log(`✅ size > ${siezOfKb}kb `);
  return true;
};

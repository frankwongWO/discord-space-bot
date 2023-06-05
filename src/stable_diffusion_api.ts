require("dotenv").config();

import { makeid } from "./common";
const process = require("process");
const axios = require("axios");
const fs = require("fs");
const moment = require("moment");

const stableDiffusionApiUrl = process.env.STABLE_DIFFUSION_API_URL;
const isSaveImg = process.env.STABLE_DIFFUSION_SAVE_IMG;
const imgToImgDir = "src/stable-difusion/output/img-to-img";
const TextToImgDir = "src/stable-difusion/output/text-to-img";

export const currentDateString = new Date().toLocaleDateString("en-us", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

interface text2imgInput {
  prompt?: string;
  negative_prompt?: string;
  cfg_scale?: number; // prompt 符合程度
  width?: number;
  height?: number;
  n_iter?: number; // time of img
  batch_size?: number; // item of img
  steps?: number; //採樣
  sampler_index?: string; //模型計算方式  //模型計算方式  "DPM++ SDE Karras" "DDIM" "DPM2 Karras" "Euler a"
  seed?: number; // 種子
  restore_faces?: boolean; //面部修復
  styles?: string[]; //預設 prompt
  // override_settings?: {};
}

interface img2imgInput {
  init_images: string[]; //輸入img
  prompt?: string;
  negative_prompt?: string;
  denoising_strength?: number; //重畫
  cfg_scale?: number; // prompt 符合程度
  width?: number;
  height?: number;
  n_iter?: number; // time of img
  batch_size?: number; // item of img
  steps?: number; //採樣
  sampler_index?: string; //模型計算方式  //模型計算方式  "DPM++ SDE Karras" "DDIM" "DPM2 Karras" "Euler a"
  seed?: number; // 種子
  restore_faces?: boolean; //面部修復
  styles?: string[];
  // override_settings?: {};
}

interface SaveImgInput {
  path: string;
  base64str: string;
}

export const saveImg = async (parameter: SaveImgInput) => {
  if (!isSaveImg) {
    return;
  }

  var formattedDate = moment(new Date()).format("YYYY-MM-DD");
  var formattedHMS = moment(new Date()).format("HH-MM-SS");
  // const dateNow = new Date().toISOString().substring(0, 10);

  // const Imgbuffer = Buffer.from(parameter.base64str, "base64");

  // Pipes an image with "new-path.jpg" as the name.
  // fs.writeFileSync(
  //   `${parameter.path}/${currentDateString}/${makeid(5)}.png`,
  //   Imgbuffer
  // );

  const dateDir = `${parameter.path}/${formattedDate}`;

  if (!fs.existsSync(dateDir)) {
    fs.mkdirSync(dateDir, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log(`make dir for date ${parameter.path}/${formattedDate}`);
    });
  }

  const imgfile = `${parameter.path}/${formattedDate}/${formattedHMS}-${makeid(
    5
  )}.png`;

  console.log("imgfile path:", imgfile);

  fs.writeFileSync(imgfile, parameter.base64str, "base64", function (err) {
    console.log(err);
  });
};

export const img2img = async (parameter: img2imgInput) => {
  const img2imgApiUrl = `${stableDiffusionApiUrl}/sdapi/v1/img2img`;

  console.log("api_call_img2img :", img2imgApiUrl);

  const requestimg2imgData = {
    init_images: parameter.init_images,
    prompt: parameter.prompt ?? "",
    negative_prompt: parameter.negative_prompt ?? "",
    denoising_strength: parameter.denoising_strength ?? 0.75,
    steps: parameter.steps ?? 20,
    cfg_scale: parameter.cfg_scale ?? 7,
    batch_size: parameter.batch_size ?? 1,
    restore_faces: parameter.restore_faces ?? false,
    sampler_index: parameter.sampler_index ?? "Euler a",
    styles: parameter.styles ?? null,
    width: parameter.width ?? 512,
    height: parameter.height ?? 512,
    seed: parameter.seed ?? -1,
    // override_settings: {},
  };

  // console.log("parameter :", parameter);
  console.log("parameter :", {
    prompt: parameter.prompt ?? "",
    negative_prompt: parameter.negative_prompt ?? "",
    denoising_strength: parameter.denoising_strength ?? 0.75,
    steps: parameter.steps ?? 20,
    cfg_scale: parameter.cfg_scale ?? 7,
    batch_size: parameter.batch_size ?? 1,
    restore_faces: parameter.restore_faces ?? false,
    sampler_index: parameter.sampler_index ?? "Euler a",
    styles: parameter.styles ?? null,
    width: parameter.width ?? 512,
    height: parameter.height ?? 512,
    seed: parameter.seed ?? -1,
    // override_settings: {},
  });

  try {
    const results = await axios.post(img2imgApiUrl, requestimg2imgData, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 900000,
    });
    // console.log("resultsresults", results);

    results.data.images.forEach((image) => {
      saveImg({
        path: imgToImgDir,
        base64str: image,
      });
    });

    return results.data;
  } catch (error) {
    console.error("api_call_text2img An error occured", error.message);
  }
};

export const text2img = async (parameter: text2imgInput) => {
  const text2imgApiUrl = `${stableDiffusionApiUrl}/sdapi/v1/txt2img`;

  console.log("api_call_text2img :", text2imgApiUrl);
  console.log("parameter :", parameter);

  const requestTxt2imgData = {
    prompt: parameter.prompt ?? "",
    negative_prompt: parameter.negative_prompt ?? "",
    steps: parameter.steps ?? 20, //採樣
    cfg_scale: parameter.cfg_scale ?? 7, // prompt 符合程度
    batch_size: parameter.batch_size ?? 1, // item of img
    restore_faces: parameter.restore_faces ?? false, //面部修復
    sampler_index: parameter.sampler_index ?? "Euler a",
    styles: parameter.styles ?? null,
    width: parameter.width ?? 512,
    height: parameter.height ?? 512,
    seed: parameter.seed ?? -1,
    // override_settings: {},
  };

  try {
    const results = await axios.post(text2imgApiUrl, requestTxt2imgData, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 900000,
    });

    const outputjson = {
      info: results.data.parameters,
      parameters: JSON.parse(results.data.info),
    };

    console.log("outputjson:", outputjson);

    results.data.images.forEach((image) => {
      saveImg({
        path: TextToImgDir,
        base64str: image,
      });
    });

    return results.data;
  } catch (error) {
    console.error("api_call_text2img An error occured", error.message);
  }
};

export const pngInfo = async (image: string) => {
  const pngInfoapiUrl = `${stableDiffusionApiUrl}/sdapi/v1/png-info`;
  console.error("api_call_pngInfo:", pngInfoapiUrl);

  const requestTxt2imgData = {
    image: "data:image/png;base64," + image,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 900000,
  };

  try {
    const results = await axios.post(pngInfoapiUrl, requestTxt2imgData, {});

    console.log("api_call_pngInfo_results:", results.data);
    return results.data;
  } catch (error) {
    console.error("api_call_pngInfo An error occured", error.message);
  }
};

export const getModels = async () => {
  const getModelsApiUrl = `${stableDiffusionApiUrl}/sdapi/v1/sd-models`;
  console.log("api_call_sd-models(getModels):", getModelsApiUrl);

  try {
    const results = await axios.get(getModelsApiUrl);

    const mappedResults = results.data.map((model) => ({
      name: model.title,
      value: model.title,
    }));
    // console.log("getModels_mappedResultss", mappedResults);
    console.log("getModels_has:", mappedResults.length);
    return mappedResults;
  } catch (error) {
    console.error(
      "api_call_sd-models(getModels) An error occured",
      error.message
    );
    return [];
  }
};

export const getSamplers = async () => {
  const getsamplerssamplersApiUrl = `${stableDiffusionApiUrl}/sdapi/v1/samplers`;
  console.log("api_call_getSamplers(getSamplers):", getsamplerssamplersApiUrl);

  try {
    const results = await axios.get(getsamplerssamplersApiUrl);

    const mappedResults = results.data.map((model) => ({
      name: model.name,
      value: model.name,
    }));
    // console.log("getSamplers_mappedResults:", mappedResults);
    console.log("getSamplers_has:", mappedResults.length);
    return mappedResults;
  } catch (error) {
    console.error(
      "api_call_getSamplers(getSamplers) An error occured:",
      error.message
    );
    return [];
  }
};

export const setModel = async (modelName: string) => {
  const setModelApiUrl = `${stableDiffusionApiUrl}/sdapi/v1/options`;
  console.log("api_call_options(setModel):", setModelApiUrl);

  const request = {
    sd_model_checkpoint: modelName,
  };

  try {
    const results = await axios.post(setModelApiUrl, request, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 900000,
    });

    console.log(
      "setModel_results",
      results.data === null
        ? "results.data is null maybe sucess"
        : "results.data is notnull maybe error"
    );
    return results.data;
  } catch (error) {
    console.error("api_call_options(setModel) An error occured", error.message);
  }
};

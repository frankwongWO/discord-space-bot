import {
  getModels,
  setModel,
  text2img,
  pngInfo,
  getSamplers,
} from "./stable_diffusion_api";
//3 string
//6 user
//5 bloolen
//4 number
const commands = [
  {
    name: "gpt",
    description: "chat to gpt",
    options: [
      {
        name: "question",
        description: "Your question",
        type: 3,
        required: true,
      },
    ],
  },

  {
    name: "gpt-voice",
    description: "chat to gpt",
    options: [
      {
        name: "target",
        description: "Your target",
        type: 6,
        required: true,
      },
    ],
  },

  {
    name: "del-msg",
    description: "del-msg",
    options: [
      {
        name: "author",
        description: "author",
        type: 6,
        required: true,
      },
    ],
  },

  {
    name: "gpt-web",
    description: "chat to gpt-Web",
    options: [
      {
        name: "gpt-web-question",
        description: "Your question...",
        type: 3,
        required: true,
      },
    ],
  },

  {
    name: "sd-text-img",
    description: "stable-diffusion-text-to-img",
    options: [
      {
        name: "prompt",
        description: "prompt...",
        type: 3,
        required: false,
      },
      {
        name: "negative_prompt",
        description: "negative_prompt...",
        type: 3,
        required: false,
      },
      {
        name: "cfg_scale",
        description: "cfg_scale (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "batch_size",
        description: "batch_size (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "width",
        description: "width (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "height",
        description: "height (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "sampler",
        description: "sampler ",
        type: 3,
        required: false,
        choices: [],
      },
      {
        name: "steps",
        description: "steps  (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "seed",
        description: "seed (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "styles",
        description: "styles",
        type: 3,
        required: false,
      },
      {
        name: "restore_faces",
        description: "restore_faces",
        type: 3,
        required: false,
        choices: [
          {
            name: "true",
            value: "true",
          },
          {
            name: "false",
            value: "false",
          },
        ],
      },
    ],
  },
  {
    name: "sd-img-img",
    description: "stable-diffusion-img-to-img",
    options: [
      {
        name: "uploadimg",
        description: "uploadimg",
        type: 11,
        required: true,
      },
      {
        name: "prompt",
        description: "prompt...",
        type: 3,
        required: false,
      },
      {
        name: "negative_prompt",
        description: "negative_prompt...",
        type: 3,
        required: false,
      },
      {
        name: "denoising_strength",
        description: "denoising_strength",
        type: 3,
        required: false,
      },
      {
        name: "cfg_scale",
        description: "cfg_scale (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "batch_size",
        description: "batch_size (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "width",
        description: "width (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "height",
        description: "height (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "sampler",
        description: "sampler ",
        type: 3,
        required: false,
        choices: [],
      },
      {
        name: "steps",
        description: "steps  (must be a number)",
        type: 3,
        required: false,
      },
      {
        name: "seed",
        description: "seed",
        type: 3,
        required: false,
      },
      {
        name: "styles",
        description: "styles",
        type: 3,
        required: false,
      },
      {
        name: "restore_faces",
        description: "restore_faces",
        type: 3,
        required: false,
        choices: [
          {
            name: "true",
            value: "true",
          },
          {
            name: "false",
            value: "false",
          },
        ],
      },
    ],
  },
];

export const getCommand = async () => {
  // the max options lenght is 25
  const models = (await getModels()) ?? [];
  const trimmedModels = models.slice(0, 25);
  // console.log(trimmedModels);

  commands.push({
    name: "sd-change-model",
    description: "change stable-diffusion model",
    options: [
      {
        name: "model-name",
        description: "server model",
        type: 3,
        required: false,
        choices: trimmedModels,
      },
    ],
  });

  const samplers = (await getSamplers()) ?? [];
  // text to img
  commands[4].options[6].choices = samplers;
  // img to img
  commands[5].options[8].choices = samplers;

  // console.log(commands);
  return commands;
};

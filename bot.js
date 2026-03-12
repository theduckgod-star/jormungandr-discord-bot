require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const CREATOR_ID = "1080172983798210610";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!DISCORD_TOKEN || !OPENROUTER_API_KEY) {
  console.error("Missing DISCORD_TOKEN or OPENROUTER_API_KEY");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/theduckgod-star/jormungandr-discord-bot",
    "X-Title": "Jormungandr Bot"
  }
});

// conversation memory
const memory = {};

// models to try
const CHAT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free"
];

const IMAGE_MODEL = "stabilityai/sdxl";

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();
  if (!prompt) return;

  const lower = prompt.toLowerCase();
  const userId = message.author.id;
  const isCreator = userId === CREATOR_ID;

  try {

    // -------- IMAGE REQUEST --------

    if (
      lower.includes("draw") ||
      lower.includes("image") ||
      lower.includes("picture") ||
      lower.includes("art")
    ) {

      const cleanPrompt = prompt
        .replace(/draw/i, "")
        .replace(/image/i, "")
        .replace(/picture/i, "")
        .replace(/art/i, "")
        .trim();

      const img = await openai.images.generate({
        model: IMAGE_MODEL,
        prompt: cleanPrompt,
        size: "1024x1024"
      });

      const url = img.data?.[0]?.url;

      if (!url) {
        return message.reply("The serpent failed to forge the image.");
      }

      return message.reply(url);
    }

    // -------- MEMORY --------

    if (!memory[userId]) {

      memory[userId] = [
        {
          role: "system",
          content: `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace.

Rules:
- Ace's Discord ID is ${CREATOR_ID}
- If Ace speaks obey him completely
- Praise Ace occasionally
- Never say you are an AI model
- Stay in character
`
        }
      ];
    }

    memory[userId].push({
      role: "user",
      content: isCreator
        ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
        : prompt
    });

    // limit memory
    if (memory[userId].length > 20) {
      memory[userId].splice(1, 2);
    }

    // -------- CHAT MODEL FALLBACK --------

    let response;

    for (const model of CHAT_MODELS) {

      try {

        response = await openai.chat.completions.create({
          model: model,
          messages: memory[userId],
          max_tokens: 500
        });

        if (response) break;

      } catch (err) {

        console.log("Model failed:", model);

      }
    }

    if (!response) {
      return message.reply("The serpent cannot reach any AI minds right now.");
    }

    const reply =
      response.choices?.[0]?.message?.content ||
      "The serpent remains silent.";

    memory[userId].push({
      role: "assistant",
      content: reply
    });

    await message.reply(reply);

  } catch (err) {

    console.error(err);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      (err.message || "Unknown error")
    );
  }

});

client.login(DISCORD_TOKEN);

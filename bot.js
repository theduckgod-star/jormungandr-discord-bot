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
    "X-Title": "Jormungandr Discord Bot"
  }
});

// memory per user
const memory = {};

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // respond only when pinged
  if (!message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();
  if (!prompt) return;

  const userId = message.author.id;
  const lower = prompt.toLowerCase();
  const isCreator = userId === CREATOR_ID;

  try {

    // -------- IMAGE REQUEST --------
    if (
      lower.includes("draw") ||
      lower.includes("generate image") ||
      lower.includes("create image") ||
      lower.includes("picture") ||
      lower.includes("art")
    ) {

      const imgPrompt = prompt
        .replace(/draw/i, "")
        .replace(/generate image/i, "")
        .replace(/create image/i, "")
        .replace(/picture/i, "")
        .replace(/art/i, "")
        .trim();

      const imgResponse = await openai.chat.completions.create({
        model: "black-forest-labs/flux-schnell",
        messages: [
          {
            role: "user",
            content: `Generate an image of: ${imgPrompt}`
          }
        ]
      });

      const imgUrl =
        imgResponse.choices?.[0]?.message?.images?.[0]?.url;

      if (!imgUrl) {
        return message.reply("The serpent tried to create an image but failed.");
      }

      return message.reply(imgUrl);
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
- Remain in character
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

    let response;

    // primary model
    try {

      response = await openai.chat.completions.create({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: memory[userId],
        max_tokens: 600
      });

    } catch {

      // fallback model
      response = await openai.chat.completions.create({
        model: "mistralai/mistral-7b-instruct:free",
        messages: memory[userId],
        max_tokens: 600
      });

    }

    const reply =
      response.choices?.[0]?.message?.content ||
      "The serpent remains silent.";

    memory[userId].push({
      role: "assistant",
      content: reply
    });

    // prevent memory overflow
    if (memory[userId].length > 20) {
      memory[userId].splice(1, 2);
    }

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

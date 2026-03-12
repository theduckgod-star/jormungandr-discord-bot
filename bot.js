require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const CREATOR_ID = "1080172983798210610";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!DISCORD_TOKEN || !OPENROUTER_API_KEY) {
  console.error("Missing tokens in Railway environment variables");
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

// memory per user
const memory = {};

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) return;

  const userId = message.author.id;
  const lower = prompt.toLowerCase();
  const isCreator = userId === CREATOR_ID;

  try {

    // -------- IMAGE GENERATION --------

    if (
      lower.startsWith("draw") ||
      lower.startsWith("generate image") ||
      lower.startsWith("create image")
    ) {

      const imagePrompt = prompt
        .replace(/draw/i, "")
        .replace(/generate image/i, "")
        .replace(/create image/i, "")
        .trim();

      const img = await openai.images.generate({
        model: "black-forest-labs/flux-schnell",
        prompt: imagePrompt,
        size: "1024x1024"
      });

      const imageUrl = img.data?.[0]?.url;

      if (!imageUrl) {
        return message.reply("The serpent failed to manifest the image.");
      }

      return message.reply(imageUrl);
    }

    // -------- MEMORY SETUP --------

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

    // -------- AI RESPONSE --------

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: memory[userId],
      max_tokens: 500
    });

    const reply = response.choices?.[0]?.message?.content;

    if (!reply) {
      return message.reply("The serpent remains silent.");
    }

    memory[userId].push({
      role: "assistant",
      content: reply
    });

    // limit memory to last ~20 messages
    if (memory[userId].length > 20) {
      memory[userId].splice(1, 2);
    }

    await message.reply(reply);

  } catch (error) {

    console.error("AI ERROR:", error);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      error.message
    );
  }

});

client.login(DISCORD_TOKEN);

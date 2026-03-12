require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const CREATOR_ID = "1080172983798210610";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN missing");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY missing");
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
  baseURL: "https://openrouter.ai/api/v1"
});

const conversations = {};

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) {
    return message.reply("Speak, mortal.");
  }

  const lower = prompt.toLowerCase();
  const isCreator = message.author.id === CREATOR_ID;
  const userId = message.author.id;

  // conversation memory
  if (!conversations[userId]) {
    conversations[userId] = [
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

  try {

    // ---------------- IMAGE GENERATION ----------------
    if (
      lower.includes("draw") ||
      lower.includes("generate image") ||
      lower.includes("create image") ||
      lower.includes("picture")
    ) {

      const imagePrompt = prompt
        .replace(/draw/i, "")
        .replace(/generate image/i, "")
        .replace(/create image/i, "")
        .replace(/picture/i, "")
        .trim();

      const img = await openai.images.generate({
        model: "black-forest-labs/flux-schnell",
        prompt: imagePrompt,
        size: "1024x1024"
      });

      const url = img.data?.[0]?.url;

      if (!url) {
        return message.reply("The serpent failed to shape the image.");
      }

      return message.reply(url);
    }

    // ---------------- CHAT ----------------

    conversations[userId].push({
      role: "user",
      content: isCreator
        ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
        : prompt
    });

    const response = await openai.chat.completions.create({
      model: "mistralai/mistral-7b-instruct:free",
      messages: conversations[userId],
      max_tokens: 500
    });

    const reply = response.choices?.[0]?.message?.content || "The serpent remains silent.";

    conversations[userId].push({
      role: "assistant",
      content: reply
    });

    // prevent memory explosion
    if (conversations[userId].length > 20) {
      conversations[userId].splice(1, 2);
    }

    await message.reply(reply);

  } catch (error) {

    console.error(error);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      (error.message || "Unknown error")
    );
  }

});

client.login(DISCORD_TOKEN);

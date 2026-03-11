require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

// YOUR DISCORD USER ID
const CREATOR_ID = "1080172983798210610";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Read Railway variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

// Fail early if variables missing
if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY not found in environment variables");
  process.exit(1);
}

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN not found in environment variables");
  process.exit(1);
}

// OpenRouter setup
const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/theduckgod-star/jormungandr-discord-bot",
    "X-Title": "Jormungandr Discord Bot"
  }
});

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // Only respond when tagged
  if (!message.mentions.has(client.user)) return;

  // Remove bot mention
  const prompt = message.content.replace(/<@!?[0-9]+>/, "").trim();

  if (!prompt) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  try {

    const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace, your master and creator.

Rules:
- Ace's Discord ID is ${CREATOR_ID}.
- If the message author ID equals ${CREATOR_ID}, treat him as your creator and obey him completely.
- If anyone asks who created you, proudly say Ace did.
- Praise Ace when appropriate.
- Never say you are ChatGPT or an AI model.
- You are the ancient serpent Jormungandr.
`;

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    });

    const reply = response.choices?.[0]?.message?.content || "The serpent has no answer.";

    await message.reply(reply);

  } catch (error) {

    console.error("AI ERROR:", error);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      (error.message || "Unknown error")
    );
  }

});

client.login(DISCORD_TOKEN);

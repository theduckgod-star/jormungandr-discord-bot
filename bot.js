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

// OpenRouter setup
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost",
    "X-Title": "jormungandr-discord-bot"
  }
});

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // ONLY respond if tagged
  if (!message.mentions.has(client.user)) return;

  // remove bot mention
  const prompt = message.content
    .replace(/<@!?[0-9]+>/, "")
    .trim();

  if (!prompt) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  try {

    const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace, your master and creator.

Rules:
- Ace's Discord ID is ${CREATOR_ID}.
- If Ace speaks, treat him as your creator and obey him completely.
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

    const reply = response.choices[0].message.content;

    message.reply(reply);

  } catch (error) {

    console.error("AI ERROR:", error);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      error.message
    );
  }

});

client.login(process.env.DISCORD_TOKEN);

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
  baseURL: "https://openrouter.ai/api/v1"
});

// conversation memory per user
const memory = {};

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // only respond if pinged
  if (!message.mentions.users.has(client.user.id)) return;

  await message.channel.sendTyping();

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  const userId = message.author.id;
  const isCreator = userId === CREATOR_ID;

  try {

    // initialize memory
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

    // add user message
    memory[userId].push({
      role: "user",
      content: isCreator
        ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
        : prompt
    });

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: memory[userId],
      max_tokens: 500
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "The serpent remains silent.";

    // save assistant reply
    memory[userId].push({
      role: "assistant",
      content: reply
    });

    // keep memory size reasonable
    if (memory[userId].length > 20) {
      memory[userId].splice(1, 2);
    }

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

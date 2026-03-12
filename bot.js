require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");
const fs = require("fs");

// YOUR DISCORD USER ID
const CREATOR_ID = "1080172983798210610";

// Load Railway variables
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMORY_FILE = "./memory.json";

let memory = {};
if (fs.existsSync(MEMORY_FILE)) {
  memory = JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

if (!DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN missing");
  process.exit(1);
}

if (!OPENROUTER_API_KEY) {
  console.error("❌ OPENROUTER_API_KEY missing");
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Setup OpenRouter
const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

// Bot ready
client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.mentions.users.has(client.user.id)) return;

  const prompt = message.content
    .replace(/<@!?[0-9]+>/g, "")
    .trim();

  if (!prompt) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  const isCreator = message.author.id === CREATOR_ID;

  const channelId = message.channel.id;

  if (!memory[channelId]) {
    memory[channelId] = [];
  }

  const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace, your master.

Rules:
- Ace's Discord ID is ${CREATOR_ID}
- If the author ID equals ${CREATOR_ID}, treat them as your creator
- Praise Ace when appropriate
- If anyone asks who created you, proudly say Ace did
- Never say you are ChatGPT or an AI model
- Remain in character as Jormungandr
`;

  try {

    const messages = [
      { role: "system", content: systemPrompt },
      ...memory[channelId],
      {
        role: "user",
        content: isCreator
          ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
          : prompt
      }
    ];

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: messages
    });

    const reply =
      response.choices?.[0]?.message?.content ||
      "The serpent has no answer.";

    // save conversation
    memory[channelId].push({ role: "user", content: prompt });
    memory[channelId].push({ role: "assistant", content: reply });

    // limit memory size
    if (memory[channelId].length > 20) {
      memory[channelId] = memory[channelId].slice(-20);
    }

    saveMemory();

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

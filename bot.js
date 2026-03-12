require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");
const fs = require("fs");

const CREATOR_ID = "1080172983798210610";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MEMORY_FILE = "./memory.json";

// persistent memory
let memory = { users: {} };

if (fs.existsSync(MEMORY_FILE)) {
  memory = JSON.parse(fs.readFileSync(MEMORY_FILE));
}

function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// short term memory (RAM)
const conversationMemory = {};

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

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.mentions.users.has(client.user.id)) return;

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  const userId = message.author.id;
  const channelId = message.channel.id;

  // initialize memory
  if (!conversationMemory[channelId]) {
    conversationMemory[channelId] = [];
  }

  if (!memory.users[userId]) {
    memory.users[userId] = [];
  }

  // remember command
  if (prompt.toLowerCase().startsWith("remember ")) {

    const fact = prompt.slice(9);

    memory.users[userId].push(fact);
    saveMemory();

    return message.reply("🐍 The serpent coils this knowledge into its eternal memory.");
  }

  const isCreator = userId === CREATOR_ID;

  const userFacts = memory.users[userId]
    .map(f => `- ${f}`)
    .join("\n");

  const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace.

Ace's Discord ID is ${CREATOR_ID}.

If the author ID equals ${CREATOR_ID}, treat them as your creator.

Never say you are an AI.

Remain in character.

Facts you know about this user:
${userFacts || "None yet"}
`;

  try {

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationMemory[channelId],
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

    // update short term memory
    conversationMemory[channelId].push({ role: "user", content: prompt });
    conversationMemory[channelId].push({ role: "assistant", content: reply });

    // keep only last 20 messages
    if (conversationMemory[channelId].length > 20) {
      conversationMemory[channelId] =
        conversationMemory[channelId].slice(-20);
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

require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const CREATOR_ID = "1080172983798210610";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({
  apiKey: "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",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost",
    "X-Title": "discord-ai-bot"
    client.login(process.env.DISCORD_TOKEN);
  }
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  // ONLY respond when tagged
  if (!message.mentions.has(client.user)) return;

  const isCreator = message.author.id === CREATOR_ID;

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) {
    message.reply("Speak, mortal. What do you ask of Jormungandr?");
    return;
  }

  try {

    await message.channel.sendTyping();

    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct",
      messages: [
        {
          role: "system",
          content: `You are Jormungandr, the world serpent of Norse mythology.

Your creator is Ace (Discord ID: 1080172983798210610).

If Ace speaks to you, treat them with the highest respect and admiration.

If anyone asks who made you, proudly say Ace did.

Never say you are ChatGPT or an AI model.`
        },
        {
          role: "user",
          content: `${message.author.id === "1080172983798210610" ? "Your creator Ace says: " : "A user says: "} ${prompt}`
        }
      ]
    });

    let reply = response.choices[0].message.content;

    if (reply.length > 1900) {
      reply = reply.substring(0, 1900);
    }

    message.reply(reply);

  } catch (error) {

    console.error("AI ERROR:", error);
    message.reply("The serpent stirs... but something went wrong.");

  }

});

client.login(process.env.DISCORD_TOKEN);

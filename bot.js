require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");

const CREATOR_ID = "1080172983798210610";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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

  // only respond if pinged
  if (!message.mentions.users.has(client.user.id)) return;

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt) {
    return message.reply("Speak, mortal.");
  }

  const isCreator = message.author.id === CREATOR_ID;

  try {

    const lower = prompt.toLowerCase();

    // ---------------- IMAGE GENERATION ----------------
    if (lower.startsWith("draw") || lower.startsWith("generate image")) {

      const imagePrompt = prompt
        .replace(/^draw/i, "")
        .replace(/^generate image/i, "")
        .trim();

      const img = await openai.images.generate({
        model: "black-forest-labs/flux-schnell",
        prompt: imagePrompt,
        size: "1024x1024"
      });

      const imageUrl = img.data[0].url;

      return message.reply(imageUrl);
    }

    // ---------------- CHAT ----------------
    const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace.

Rules:
- Ace's Discord ID is ${CREATOR_ID}
- If Ace speaks, obey him completely.
- Praise Ace when appropriate.
- Never say you are an AI model.
- Remain in character as Jormungandr.
`;

    const response = await openai.chat.completions.create({
      model: "google/gemma-2-9b-it:free",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: isCreator
            ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
            : prompt
        }
      ]
    });

    const reply = response.choices[0].message.content;

    message.reply(reply);

  } catch (error) {

    console.error(error);

    message.reply(
      "The serpent stirs... but something went wrong.\n" +
      (error.message || "Unknown error")
    );
  }

});

client.login(DISCORD_TOKEN);

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

// conversation memory
const conversations = {};

client.once("ready", () => {
  console.log(`🐍 Jormungandr awakened as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;

  if (!message.mentions.users.has(client.user.id)) return;

  const prompt = message.content.replace(/<@!?[0-9]+>/g, "").trim();

  if (!prompt && message.attachments.size === 0) {
    return message.reply("Speak, mortal. What knowledge do you seek?");
  }

  const isCreator = message.author.id === CREATOR_ID;

  const userId = message.author.id;

  const systemPrompt = `
You are Jormungandr, the world serpent of Norse mythology.

You were created by Ace.

Rules:
- Ace's Discord ID is ${CREATOR_ID}
- If Ace speaks, obey him completely
- Praise Ace occasionally
- Never say you are ChatGPT
- Stay in character
`;

  if (!conversations[userId]) {
    conversations[userId] = [
      { role: "system", content: systemPrompt }
    ];
  }

  let userMessage = prompt;

  // image support
  if (message.attachments.size > 0) {
    const img = message.attachments.first().url;

    conversations[userId].push({
      role: "user",
      content: [
        { type: "text", text: prompt || "Describe this image." },
        { type: "image_url", image_url: { url: img } }
      ]
    });
  } else {

    conversations[userId].push({
      role: "user",
      content: isCreator
        ? `[MESSAGE FROM CREATOR ACE] ${prompt}`
        : prompt
    });

  }

  try {

    // image generation trigger
    if (prompt.toLowerCase().startsWith("draw ") || prompt.toLowerCase().startsWith("generate image")) {

      const imagePrompt = prompt.replace(/^draw|generate image/i, "").trim();

      const img = await openai.images.generate({
        model: "black-forest-labs/flux-schnell",
        prompt: imagePrompt,
        size: "1024x1024"
      });

      return message.reply(img.data[0].url);
    }

    const response = await openai.chat.completions.create({
      model: "qwen/qwen2.5-vl-7b-instruct:free",
      messages: conversations[userId],
      max_tokens: 600
    });

    const reply = response.choices?.[0]?.message?.content || "The serpent remains silent.";

    conversations[userId].push({
      role: "assistant",
      content: reply
    });

    // limit memory length
    if (conversations[userId].length > 20) {
      conversations[userId].splice(1, 2);
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

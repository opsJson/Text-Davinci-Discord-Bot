const {Client, GatewayIntentBits} = require("discord.js");
const fetch = require("node-fetch");

const client = new Client({intents:[
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
]});

const DiscordToken = "discord-token";
const OpenAIToken = "openai-token";
const MaxLength = 5000;
let ChannelID;

client.on("ready", () => {
	client.application.commands.create({
		name: "channel",
		description: "Set bot channel",
		options: [{
			name: "id",
			description: "Channel ID",
			type: 3,
			required: true
		}]
	});
	console.log("Text Davinci Bot online!");
});

client.on("interactionCreate", async (interaction) => {
	const channelID = interaction.options.getString("id").trim();
	const channel = await client.channels.cache.get(channelID);
	
	if (channel) {
		ChannelID = channelID;
		interaction.reply({
			content: `Now listening in <#${channelID}>`,
			ephemeral: true
		});
	}
	else {
		interaction.reply({
			content: `Could not find channel **${channelID}**`,
			ephemeral: true
		});
	}
});

client.on("messageCreate", async (message) => {
	if (message.channel.id != ChannelID) return;
	if (message.author.id == client.user.id) return;
	
	const messages = await message.channel.messages.fetch();
	let prompt = "";
	let lock = false;
	
	messages.forEach(message => {
		const role = message.author.id == client.user.id ? "BOT" : "USER";
		const content = message.content;
		const chunk = `${role}: ${content}
`;
		
		if (prompt.length + chunk.length + "BOT:".length >= MaxLength) lock = true;
		if (lock) return;
		prompt = chunk + prompt;
	});
	
	prompt += "BOT:";
	
	message.channel.sendTyping();
	
	try {
		const response = await fetch("htftps://api.openai.com/v1/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${OpenAIToken}`
			},
			body: JSON.stringify({
				model: "text-davinci-003",
				prompt: prompt,
				temperature: 0.7,
				max_tokens: 2048
			})
		});
		
		if (response.status != 200) {
			message.channel.send(JSON.stringify(response));
			return;
		}
		
		let r = await response.json();
		r = r.choices[0].text;
		r = r.match(/[\s\S]{1,2000}/g);
		
		r.forEach(chunk => {
			message.channel.send(chunk);
		});
	}
	catch (e) {
		message.channel.send("Internal Error.");
	}
});

client.login(DiscordToken);
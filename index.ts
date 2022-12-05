import DiscordJS, {
	Client,
	GatewayIntentBits,
	Collection,
	Interaction,
	CommandInteraction,
	SlashCommandBuilder,
	InteractionType,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import fs from "fs";
import dotenv from "dotenv";
import { dbConnect } from "./helpers";
dotenv.config();

interface Command {
	data: SlashCommandBuilder;
	execute: (Interaction: CommandInteraction) => void;
}

interface IClient extends Client {
	commands?: Collection<string, Command>;
}

const client: IClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const commandFiles = fs
	.readdirSync("./commands")
	.filter(file => file.endsWith(".ts"));

const commands: Command[] = [];

client.commands = new Collection();

commandFiles.forEach(async file => {
	const { command } = await import(`./commands/${file}`);
	commands.push(command.data.toJSON());
	client.commands?.set(command.data.name, command);
});

client.once("ready", async () => {
	await dbConnect(process.env.MONGO_URI!);
	console.log("ready");

	if (!client.user) {
		console.log("client.user is null");
		return;
	}

	const CLIENT_ID = client.user.id;

	const rest = new REST({
		version: "10",
	}).setToken(process.env.TOKEN!);

	(async () => {
		try {
			if (process.env.ENV === "production") {
				await rest.put(Routes.applicationCommands(CLIENT_ID), {
					body: commands,
				});
				console.log("commands updated");
			} else {
				for (const guildId of process.env.GUILD_IDS!.split(" ")) {
					await rest.put(
						Routes.applicationGuildCommands(CLIENT_ID, guildId),
						{
							body: commands,
						}
					);
				}
				console.log("commands updated locally");
			}
		} catch (err) {
			if (err) console.error(err);
		}
	})();
});

client.on("interactionCreate", async (interaction: Interaction) => {
	if (!(interaction.type === InteractionType.ApplicationCommand)) return;

	const command = client.commands?.get(interaction.commandName);

	if (!command) return;
	/**
	 * @TODO add cooldowns and check for missing fields to create automatically
	 */
	try {
		command.execute(interaction);
	} catch (err) {
		console.error(err);

		await interaction.reply({
			content: "An error occured while executing this command.",
			ephemeral: true,
		});
	}
});

client.on("error", console.error);
client.on("warning", console.warn);

client.login(process.env.TOKEN!);

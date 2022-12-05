import {
	APIEmbedField,
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
	SlashCommandUserOption,
} from "discord.js";

import { User } from "../models";
import axios from "axios";
import Chatbot from "../chatbot";

export const command = {
	data: new SlashCommandBuilder()
		.setName("chat")
		.setDescription("Chat with the bot")
		.addStringOption(option => {
			return option
				.setName("message")
				.setDescription("The message to send")
				.setRequired(true);
		}),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const message = interaction.options.getString("message")!;
		let user = await User.findOne({ userId: interaction.user.id });
		if (user === null) {
			user = await User.create({
				userId: interaction.user.id,
				conversationId: "none",
				parentId: "none",
			});
		}
		const bot = new Chatbot(
			{
				Authorization: process.env.AUTHORIZATION!,
				SessionToken: process.env.SESSION_TOKEN!,
			},
			user.conversationId === "none" ? null : user.conversationId,
			user.parentId === "none" ? null : user.parentId
		);

		const timeStart = performance.now();
		await bot.refreshSession();
		// const res = await axios
		// 	.get(`http://localhost:3000/chat?q=${message}`)
		// 	.catch(console.error);
		const res = await bot.getChatResponse(message);
		const timeEnd = performance.now();
		const timeElapsed = ((timeEnd - timeStart) / 1000).toFixed(2);

		if (!res || typeof res === "string")
			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(`Something went wrong (${timeElapsed}ms)`)
						.setDescription(res)
						.setColor("#ff0000"),
				],
			});

		user.conversationId = res.conversationId ?? "none";
		user.parentId = res.parentId ?? "none";
		await user.save();
		try {
			console.log(res.message);
			// split message into chunks of 1024 characters
			const chunks = splitText(res.message, 1024);
			console.log(chunks);
			const embed = new EmbedBuilder()
				.setTitle(interaction.options.getString("message")!)
				.addFields(
					chunks.map((chunk, index) => {
						return {
							name: index === 0 ? "Response" : "\u200b",
							value: chunk,
						} as APIEmbedField;
					})
				)
				.setColor("#68bb59");
			await interaction.editReply({ embeds: [embed] });
		} catch (e) {
			console.error(e);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle(`Something went wrong, please try again`)
						.setColor("#ff0000"),
				],
			});
		}
	},
};

const splitText = (text: string, limit: number) => {
	var lines = [];

    let codeSectionClosed = true;
	while (text.length > limit) {
		var chunk = text.substring(0, limit);
		var lastWhiteSpace = chunk.lastIndexOf(" ");

		if (lastWhiteSpace !== -1) limit = lastWhiteSpace;
        /**
         * @TODO fix code section splitting
         */
		lines.push(chunk.substring(0, limit));
		text = text.substring(limit + 1);
	}

	lines.push(text);

	return lines;
};

import {
	APIEmbedField,
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
	SlashCommandUserOption,
} from "discord.js";

import { User } from "../models.js";
import axios from "axios";
import { ChatGPTAPI } from "chatgpt";

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

		const api = new ChatGPTAPI({
			sessionToken: process.env.SESSION_TOKEN!,
		});
		try {
			await api.ensureAuth();
		} catch (err) {
			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("An Error Occurred")
						.setDescription(
							`Session token expired <:blue_surprised:965626683317178458>${"<:blue_cry:958448874593329172>".repeat(
								2
							)}`
						)
						.setColor("#ff0000"),
				],
			});
		}
		const conversation = api.getConversation({
			conversationId:
				user.conversationId === "none"
					? undefined
					: user.conversationId,
			parentMessageId:
				user.parentId === "none" ? undefined : user.parentId,
		});
		const timeStart = performance.now();
		let res: string;
		try {
			res = await conversation.sendMessage(message, {
				timeoutMs: 2 * 60 * 1000,
			});
		} catch (rawError) {
			const err = rawError as string;
			console.error(err);
			return await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setTitle("An Error Occurred")
						.setDescription(err)
						.setColor("#ff0000"),
				],
			});
		}
		const timeEnd = performance.now();
		const timeElapsed = ((timeEnd - timeStart) / 1000).toFixed(2);
		const { conversationId, parentMessageId } = conversation;
		user.conversationId = conversationId ?? "none";
		user.parentId = parentMessageId ?? "none";
		await user.save();
		try {
			console.log(res);
			console.log();
			// split message into chunks of 1024 characters
			const chunks = splitText(res, 1024);
			// console.log(chunks);
			const embed = new EmbedBuilder()
				.setTitle(interaction.options.getString("message")!)
				.addFields(
					chunks.map((chunk, index) => {
						return {
							name:
								index === 0
									? `Response (${timeElapsed}ms)`
									: "\u200b",
							value: chunk,
						} as APIEmbedField;
					})
				)
				.setColor("#68bb59");
			await interaction.editReply({ embeds: [embed] });
		} catch (e) {
			console.error(e);
			console.log();
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

import {
	APIEmbedField,
	ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
	SlashCommandUserOption,
} from "discord.js";

import { User } from "../models";

export const command = {
	data: new SlashCommandBuilder()
		.setName("resetthread")
		.setDescription("Reset the conversation thread"),
	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply({ ephemeral: true });
		let user = await User.findOne({ userId: interaction.user.id });

		if (!user) {
			user = await User.create({
				userId: interaction.user.id,
				conversationId: "none",
				parentId: "none",
			});
		}
		user.conversationId = "none";
		user.parentId = "none";
		await user.save();

		const embed = new EmbedBuilder()
			.setTitle("Conversation thread reset")
			.setColor("#68bb59");
		await interaction.editReply({
			embeds: [embed],
		});
	},
};

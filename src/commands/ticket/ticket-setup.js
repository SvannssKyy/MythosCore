const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setGuildConfig } = require('../../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription('ბილეთების სისტემის დაყენება')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('არხი სადაც გამოჩნდება ღილაკი').setRequired(true))
    .addRoleOption(opt => opt.setName('support_role').setDescription('სპორტ როლი').setRequired(false))
    .addChannelOption(opt => opt.setName('category').setDescription('კატეგორია ბილეთებისთვის').addChannelTypes(ChannelType.GuildCategory).setRequired(false))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('ლოგ არხი').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const supportRole = interaction.options.getRole('support_role');
    const category = interaction.options.getChannel('category');
    const logChannel = interaction.options.getChannel('log_channel');

    if (supportRole) setGuildConfig(interaction.guild.id, 'ticket_support_role', supportRole.id);
    if (category) setGuildConfig(interaction.guild.id, 'ticket_category', category.id);
    if (logChannel) setGuildConfig(interaction.guild.id, 'ticket_log_channel', logChannel.id);

    const embed = new EmbedBuilder()
      .setTitle('🎫 მხარდაჭერა — Mythos Core')
      .setDescription('**ბილეთის გასახსნელად დააჭირეთ ღილაკს ქვემოთ.**\n\nჩვენი გუნდი მზადაა თქვენს დასახმარებლად. გთხოვთ, არ ბოროტად გამოიყენოთ ეს სისტემა.')
      .setColor('#5865F2')
      .setFooter({ text: 'Mythos Core • ბილეთების სისტემა' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_create').setLabel('📩 ბილეთის გახსნა').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ ბილეთების სისტემა დაყენდა ${channel}-ში.`, ephemeral: true });
  }
};

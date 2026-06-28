const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { setGuildConfig } = require('../../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply-setup')
    .setDescription('განაცხადის სისტემის დაყენება')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('არხი სადაც გამოჩნდება ფორმა').setRequired(true))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('ლოგ არხი განაცხადებისთვის').setRequired(true)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    const logChannel = interaction.options.getChannel('log_channel');

    setGuildConfig(interaction.guild.id, 'apply_channel', channel.id);
    setGuildConfig(interaction.guild.id, 'apply_log_channel', logChannel.id);

    const embed = new EmbedBuilder()
      .setTitle('📝 განაცხადი — Mythos Core')
      .setDescription(
        '**გსურთ ჩვენი გუნდის ნაწილი გახდეთ?**\n\n' +
        'დააჭირეთ ღილაკს ქვემოთ, შეავსეთ ფორმა და ჩვენი გუნდი განიხილავს თქვენს განაცხადს.\n\n' +
        '📌 **მოთხოვნები:**\n' +
        '• სულ მცირე 14 წლის ასაკი\n' +
        '• სერვერზე ყოფნა სულ მცირე 7 დღე\n' +
        '• პასუხისმგებლობა და პატიოსნება\n\n' +
        '⚠️ ყალბი ინფორმაცია გამოიწვევს დასჯას.'
      )
      .setColor('#5865F2')
      .setFooter({ text: 'Mythos Core • განაცხადი სისტემა' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('apply_open').setLabel('📝 განაცხადის გაგზავნა').setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ განაცხადის სისტემა დაყენდა ${channel}-ში. ლოგები: ${logChannel}`, ephemeral: true });
  }
};

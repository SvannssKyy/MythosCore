const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { setGuildConfig, getGuildConfig } = require('../../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('ბოტის კონფიგურაცია')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName('join')
      .setDescription('შემოსვლის შეტყობინება')
      .addChannelOption(opt => opt.setName('channel').setDescription('არხი').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('შეტყობინება ({user}, {server}, {count})').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('leave')
      .setDescription('გასვლის შეტყობინება')
      .addChannelOption(opt => opt.setName('channel').setDescription('არხი').setRequired(true))
      .addStringOption(opt => opt.setName('message').setDescription('შეტყობინება ({user}, {server}, {count})').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('autorole')
      .setDescription('ავტო-როლი')
      .addRoleOption(opt => opt.setName('role').setDescription('როლი ახალი წევრებისთვის').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('view')
      .setDescription('მიმდინარე კონფიგურაცია')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'join') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      setGuildConfig(interaction.guild.id, 'join_channel', channel.id);
      if (message) setGuildConfig(interaction.guild.id, 'join_message', message);
      await interaction.reply({ content: `✅ შემოსვლის შეტყობინება დაყენდა: ${channel}`, ephemeral: true });

    } else if (sub === 'leave') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      setGuildConfig(interaction.guild.id, 'leave_channel', channel.id);
      if (message) setGuildConfig(interaction.guild.id, 'leave_message', message);
      await interaction.reply({ content: `✅ გასვლის შეტყობინება დაყენდა: ${channel}`, ephemeral: true });

    } else if (sub === 'autorole') {
      const role = interaction.options.getRole('role');
      setGuildConfig(interaction.guild.id, 'auto_role', role.id);
      await interaction.reply({ content: `✅ ავტო-როლი დაყენდა: ${role}`, ephemeral: true });

    } else if (sub === 'view') {
      const config = getGuildConfig(interaction.guild.id);
      const embed = new EmbedBuilder()
        .setTitle('⚙️ სერვერის კონფიგურაცია')
        .addFields(
          { name: '👋 შემოსვლა', value: config.join_channel ? `<#${config.join_channel}>` : 'დაყენებული არ არის', inline: true },
          { name: '🚪 გასვლა', value: config.leave_channel ? `<#${config.leave_channel}>` : 'დაყენებული არ არის', inline: true },
          { name: '🎭 ავტო-როლი', value: config.auto_role ? `<@&${config.auto_role}>` : 'დაყენებული არ არის', inline: true },
          { name: '🎫 ბილეთ კატეგ.', value: config.ticket_category ? `<#${config.ticket_category}>` : 'დაყენებული არ არის', inline: true },
          { name: '📋 ბილეთ ლოგი', value: config.ticket_log_channel ? `<#${config.ticket_log_channel}>` : 'დაყენებული არ არის', inline: true },
          { name: '📝 განაცხადი ლოგი', value: config.apply_log_channel ? `<#${config.apply_log_channel}>` : 'დაყენებული არ არის', inline: true },
        )
        .setColor('#5865F2')
        .setFooter({ text: 'Mythos Core • კონფიგურაცია' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};

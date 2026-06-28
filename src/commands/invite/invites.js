const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getInviteCount, getTopInviters } = require('../../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('მოწვევების სტატისტიკა')
    .addSubcommand(sub => sub
      .setName('check')
      .setDescription('მომხმარებლის მოწვევები')
      .addUserOption(opt => opt.setName('user').setDescription('მომხმარებელი').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('top')
      .setDescription('ლიდერბორდი')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'check') {
      const user = interaction.options.getUser('user') || interaction.user;
      const data = getInviteCount(interaction.guild.id, user.id);
      const total = data.real_count - data.left_count - data.fake_count + data.bonus;

      const embed = new EmbedBuilder()
        .setTitle(`📨 ${user.username}-ის მოწვევები`)
        .addFields(
          { name: '✅ სულ', value: String(total), inline: true },
          { name: '📥 რეალური', value: String(data.real_count), inline: true },
          { name: '📤 გავიდა', value: String(data.left_count), inline: true },
          { name: '🚫 ყალბი', value: String(data.fake_count), inline: true },
          { name: '🎁 ბონუსი', value: String(data.bonus), inline: true },
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setColor('#5865F2')
        .setFooter({ text: 'Mythos Core • მოწვევა ტრეკერი' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } else if (sub === 'top') {
      const top = getTopInviters(interaction.guild.id, 10);
      if (top.length === 0) {
        return interaction.reply({ content: '❌ ჯერ არ არის მოწვევის მონაცემი.', ephemeral: true });
      }

      const desc = top.map((row, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} <@${row.user_id}> — **${row.total}** მოწვევა`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setTitle('🏆 მოწვევების ლიდერბორდი')
        .setDescription(desc)
        .setColor('#FFD700')
        .setFooter({ text: 'Mythos Core • მოწვევა ტრეკერი' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  }
};

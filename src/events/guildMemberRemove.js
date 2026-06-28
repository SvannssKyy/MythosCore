const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, addLeftInvite, getJoinRecord } = require('../database/Database');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const config = getGuildConfig(member.guild.id);

    // Update invite counts (mark as left)
    const record = getJoinRecord(member.guild.id, member.id);
    if (record?.inviter_id) {
      addLeftInvite(member.guild.id, record.inviter_id);
    }

    if (!config.leave_channel) return;
    const channel = member.guild.channels.cache.get(config.leave_channel);
    if (!channel) return;

    const msg = (config.leave_message || 'მომხმარებელი {user} დატოვა სერვერი.')
      .replace('{user}', member.user.username)
      .replace('{username}', member.user.username)
      .replace('{server}', member.guild.name)
      .replace('{count}', member.guild.memberCount);

    const embed = new EmbedBuilder()
      .setTitle('👋 წევრი დატოვა სერვერი')
      .setDescription(msg)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setColor('#FF4444')
      .setFooter({ text: `Mythos Core • წევრი #${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  }
};

const { EmbedBuilder } = require('discord.js');
const { getGuildConfig, addInvite, recordJoin } = require('../database/Database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    const config = getGuildConfig(member.guild.id);

    // Auto-Role
    if (config.auto_role) {
      const role = member.guild.roles.cache.get(config.auto_role);
      if (role) {
        await member.roles.add(role).catch(() => {});
      }
    }

    // Invite Tracker
    try {
      const cachedInvites = client.inviteCache.get(member.guild.id) || new Map();
      const newInvites = await member.guild.invites.fetch();
      client.inviteCache.set(member.guild.id, new Map(newInvites.map(inv => [inv.code, inv.uses])));

      let usedInvite = null;
      for (const [code, uses] of newInvites) {
        const cached = cachedInvites.get(code) || 0;
        if (uses > cached) { usedInvite = newInvites.get(code); break; }
      }

      if (usedInvite?.inviter) {
        addInvite(member.guild.id, usedInvite.inviter.id);
        recordJoin(member.guild.id, member.id, usedInvite.inviter.id, usedInvite.code);
      }
    } catch {}

    // Join Message
    if (config.join_channel) {
      const channel = member.guild.channels.cache.get(config.join_channel);
      if (!channel) return;

      const msg = (config.join_message || 'მოგესალმებით, {user}! სერვერზე {server}')
        .replace('{user}', `<@${member.id}>`)
        .replace('{username}', member.user.username)
        .replace('{server}', member.guild.name)
        .replace('{count}', member.guild.memberCount);

      const embed = new EmbedBuilder()
        .setTitle('👋 ახალი წევრი შემოვიდა!')
        .setDescription(msg)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setColor('#00FF7F')
        .setFooter({ text: `Mythos Core • წევრი #${member.guild.memberCount}` })
        .setTimestamp();

      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }
};

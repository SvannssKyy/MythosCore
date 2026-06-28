module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    try {
      const invites = await guild.invites.fetch();
      client.inviteCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
    } catch {}
    console.log(`[სერვერი] დაემატა: ${guild.name} (${guild.id})`);
  }
};

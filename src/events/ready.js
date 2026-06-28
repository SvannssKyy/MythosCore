const { ActivityType } = require('discord.js');
const db = require('../database/Database');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`\n╔════════════════════════════════╗`);
    console.log(`║   Mythos Core ჩაიტვირთა!       ║`);
    console.log(`║   ${client.user.tag.padEnd(30)}║`);
    console.log(`║   სერვერები: ${String(client.guilds.cache.size).padEnd(19)}║`);
    console.log(`╚════════════════════════════════╝\n`);

    client.user.setActivity('Mythos Core | /help', { type: ActivityType.Watching });

    // Cache all invites
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();
        client.inviteCache.set(guild.id, new Map(invites.map(inv => [inv.code, inv.uses])));
      } catch {}
    }

    // Check active giveaways
    const { db: rawDb } = db;
    const activeGiveaways = rawDb.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
    for (const giveaway of activeGiveaways) {
      const remaining = giveaway.ends_at * 1000 - Date.now();
      if (remaining <= 0) {
        endGiveaway(client, giveaway);
      } else {
        const timer = setTimeout(() => endGiveaway(client, giveaway), remaining);
        client.giveawayTimers.set(giveaway.id, timer);
      }
    }
  }
};

async function endGiveaway(client, giveaway) {
  const { endGiveaway: endGW, getGiveawayEntries } = require('../database/Database');
  try {
    const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
    if (!channel) { endGW(giveaway.id, []); return; }

    const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
    const entries = getGiveawayEntries(giveaway.id);
    const winners = [];

    const pool = [...entries];
    for (let i = 0; i < giveaway.winner_count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }

    endGW(giveaway.id, winners);

    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    const winnerMentions = winners.length > 0
      ? winners.map(id => `<@${id}>`).join(', ')
      : 'გამარჯვებული არ არის (არ ყოფილა მონაწილე)';

    const endEmbed = new EmbedBuilder()
      .setTitle('🎉 გათამაშება დასრულდა!')
      .setDescription(`**პრიზი:** ${giveaway.prize}\n**გამარჯვებული(ები):** ${winnerMentions}\n**მონაწილეები:** ${entries.length}`)
      .setColor('#FFD700')
      .setFooter({ text: 'Mythos Core • გათამაშება' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gw_ended').setLabel('დასრულდა').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );

    if (message) await message.edit({ embeds: [endEmbed], components: [row] }).catch(() => {});

    if (winners.length > 0) {
      await channel.send({ content: `🎊 გილოცავთ ${winnerMentions}! გაიმარჯვეთ **${giveaway.prize}**-ში!` });
    }
  } catch (err) {
    console.error('[გათამაშება] შეცდომა:', err);
  }
}

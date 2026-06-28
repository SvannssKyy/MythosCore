const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createGiveaway, updateGiveawayMessage } = require('../../database/Database');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('გათამაშების მართვა')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub
      .setName('start')
      .setDescription('გათამაშების დაწყება')
      .addStringOption(opt => opt.setName('prize').setDescription('პრიზი').setRequired(true))
      .addStringOption(opt => opt.setName('duration').setDescription('ხანგრძლივობა (მაგ: 1h, 30m, 1d)').setRequired(true))
      .addIntegerOption(opt => opt.setName('winners').setDescription('გამარჯვებულთა რაოდენობა').setMinValue(1).setMaxValue(20).setRequired(false))
      .addChannelOption(opt => opt.setName('channel').setDescription('არხი').setRequired(false))
    )
    .addSubcommand(sub => sub
      .setName('end')
      .setDescription('გათამაშების ადრე დასრულება')
      .addIntegerOption(opt => opt.setName('id').setDescription('გათამაშების ID').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('reroll')
      .setDescription('გამარჯვებულის ხელახლა წამოღება')
      .addIntegerOption(opt => opt.setName('id').setDescription('გათამაშების ID').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const duration = interaction.options.getString('duration');
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const durationMs = ms(duration);
      if (!durationMs || durationMs < 10000) {
        return interaction.reply({ content: '❌ არასწორი ხანგრძლივობა. მაგ: `1h`, `30m`, `2d`', ephemeral: true });
      }

      const endsAt = Math.floor((Date.now() + durationMs) / 1000);
      const giveawayId = createGiveaway(interaction.guild.id, channel.id, prize, winnerCount, interaction.user.id, endsAt);

      const embed = new EmbedBuilder()
        .setTitle('🎉 გათამაშება!')
        .setDescription(`**პრიზი:** ${prize}`)
        .addFields(
          { name: '🏆 გამარჯვებელი', value: String(winnerCount), inline: true },
          { name: '👥 მონაწილეები', value: '0', inline: true },
          { name: '⏰ დასრულება', value: `<t:${endsAt}:R>`, inline: true },
          { name: '🎟️ ჰოსტი', value: `<@${interaction.user.id}>`, inline: true },
        )
        .setColor('#FFD700')
        .setFooter({ text: `Mythos Core • გათამაშება #${giveawayId}` })
        .setTimestamp(endsAt * 1000);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gw_enter').setLabel('🎟️ მონაწილეობა').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('gw_leave').setLabel('🚪 გამოსვლა').setStyle(ButtonStyle.Secondary),
      );

      const msg = await channel.send({ embeds: [embed], components: [row] });
      updateGiveawayMessage(giveawayId, msg.id);

      const timer = setTimeout(() => {
        const { endGiveaway: endGW, getGiveawayEntries } = require('../../database/Database');
        const giveaway = { id: giveawayId, prize, winner_count: winnerCount, channel_id: channel.id, message_id: msg.id };
        endGiveawayNow(client, giveaway);
      }, durationMs);
      client.giveawayTimers.set(giveawayId, timer);

      await interaction.reply({ content: `✅ გათამაშება #${giveawayId} დაიწყო ${channel}-ში!`, ephemeral: true });

    } else if (sub === 'end') {
      const id = interaction.options.getInteger('id');
      const { getGiveaway } = require('../../database/Database');
      const giveaway = getGiveaway(id);
      if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: '❌ გათამაშება ვერ მოიძებნა ან უკვე დასრულდა.', ephemeral: true });
      }
      if (client.giveawayTimers.has(id)) {
        clearTimeout(client.giveawayTimers.get(id));
        client.giveawayTimers.delete(id);
      }
      await endGiveawayNow(client, giveaway);
      await interaction.reply({ content: `✅ გათამაშება #${id} დასრულდა.`, ephemeral: true });

    } else if (sub === 'reroll') {
      const id = interaction.options.getInteger('id');
      const { getGiveaway, getGiveawayEntries } = require('../../database/Database');
      const giveaway = getGiveaway(id);
      if (!giveaway || !giveaway.ended) {
        return interaction.reply({ content: '❌ გათამაშება ვერ მოიძებნა ან ჯერ არ დასრულებულა.', ephemeral: true });
      }
      const entries = getGiveawayEntries(id);
      if (entries.length === 0) {
        return interaction.reply({ content: '❌ მონაწილეები არ ყოფილა.', ephemeral: true });
      }
      const winner = entries[Math.floor(Math.random() * entries.length)];
      const channel = interaction.guild.channels.cache.get(giveaway.channel_id);
      if (channel) {
        await channel.send({ content: `🎊 ხელახალი წამოღება! ახალი გამარჯვებულია: <@${winner}>! (${giveaway.prize})` });
      }
      await interaction.reply({ content: `✅ ახალი გამარჯვებელი: <@${winner}>`, ephemeral: true });
    }
  }
};

async function endGiveawayNow(client, giveaway) {
  const { endGiveaway: endGW, getGiveawayEntries } = require('../../database/Database');
  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    const winnerMentions = winners.length > 0 ? winners.map(id => `<@${id}>`).join(', ') : 'გამარჯვებული არ არის';
    const endEmbed = new EmbedBuilder()
      .setTitle('🎉 გათამაშება დასრულდა!')
      .setDescription(`**პრიზი:** ${giveaway.prize}\n**გამარჯვებული(ები):** ${winnerMentions}\n**მონაწილეები:** ${entries.length}`)
      .setColor('#FFD700').setFooter({ text: 'Mythos Core • გათამაშება' }).setTimestamp();
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gw_ended').setLabel('დასრულდა').setStyle(ButtonStyle.Secondary).setDisabled(true)
    );
    if (message) await message.edit({ embeds: [endEmbed], components: [row] }).catch(() => {});
    if (winners.length > 0) await channel.send({ content: `🎊 გილოცავთ ${winnerMentions}! **${giveaway.prize}**` });
  } catch (err) { console.error('[გათამაშება] შეცდომა:', err); }
}

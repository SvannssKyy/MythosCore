const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, getTicketByChannel, closeTicket, incrementTicketCount, createTicket,
  enterGiveaway, leaveGiveaway, getGiveawayByMessage, getGiveaway,
  createApplication, updateApplicationMessage, updateApplicationStatus, getGiveawayEntries } = require('../database/Database');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {

    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction, client);
      } catch (err) {
        console.error(`[შეცდომა] /${interaction.commandName}:`, err);
        const msg = { content: '❌ შეცდომა მოხდა ბრძანების შესრულებისას.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msg).catch(() => {});
        else await interaction.reply(msg).catch(() => {});
      }
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'apply_modal') {
        await handleApplyModal(interaction);
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'ticket_create') await handleTicketCreate(interaction, client);
      else if (id === 'ticket_close') await handleTicketClose(interaction, client);
      else if (id === 'ticket_transcript') await handleTicketTranscript(interaction, client);
      else if (id === 'apply_open') await handleApplyOpen(interaction);
      else if (id.startsWith('apply_accept_')) await handleApplyDecision(interaction, 'accepted');
      else if (id.startsWith('apply_reject_')) await handleApplyDecision(interaction, 'rejected');
      else if (id === 'gw_enter') await handleGiveawayEnter(interaction);
      else if (id === 'gw_leave') await handleGiveawayLeave(interaction);
    }
  }
};

// ─── TICKET ────────────────────────────────────────────────────────────────
async function handleTicketCreate(interaction, client) {
  const config = getGuildConfig(interaction.guild.id);
  await interaction.deferReply({ ephemeral: true });

  // Check if user already has open ticket
  const existing = interaction.guild.channels.cache.find(c =>
    c.topic === `ticket-${interaction.user.id}` && c.parentId === config.ticket_category
  );
  if (existing) {
    return interaction.editReply({ content: `❌ უკვე გაქვთ ღია ბილეთი: ${existing}` });
  }

  const count = incrementTicketCount(interaction.guild.id);
  const ticketName = `ბილეთი-${String(count).padStart(4, '0')}`;

  const overwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (config.ticket_support_role) {
    overwrites.push({ id: config.ticket_support_role, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const channel = await interaction.guild.channels.create({
    name: ticketName,
    parent: config.ticket_category || null,
    topic: `ticket-${interaction.user.id}`,
    permissionOverwrites: overwrites,
  });

  createTicket(interaction.guild.id, channel.id, interaction.user.id);

  const embed = new EmbedBuilder()
    .setTitle('🎫 ბილეთი გაიხსნა')
    .setDescription(`გამარჯობა, <@${interaction.user.id}>!\n\nდახმარება მალე მოვა. გთხოვთ, დეტალურად აღწეროთ თქვენი პრობლემა.`)
    .setColor('#5865F2')
    .setFooter({ text: 'Mythos Core • ბილეთი' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('ბილეთის დახურვა').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('ტრანსკრიფტი').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
  );

  await channel.send({ content: `<@${interaction.user.id}>${config.ticket_support_role ? ` <@&${config.ticket_support_role}>` : ''}`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ ბილეთი შეიქმნა: ${channel}` });
}

async function handleTicketClose(interaction, client) {
  const ticket = getTicketByChannel(interaction.channel.id);
  if (!ticket) return interaction.reply({ content: '❌ ეს არ არის ბილეთის არხი.', ephemeral: true });

  await interaction.deferReply();
  closeTicket(interaction.channel.id);

  const config = getGuildConfig(interaction.guild.id);
  const embed = new EmbedBuilder()
    .setTitle('🔒 ბილეთი დაიხურა')
    .setDescription(`ბილეთი დახურა: <@${interaction.user.id}>\nარხი წაიშლება 5 წამში...`)
    .setColor('#FF4444')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });

  if (config.ticket_log_channel) {
    const logChannel = interaction.guild.channels.cache.get(config.ticket_log_channel);
    if (logChannel) {
      await logChannel.send({ embeds: [
        new EmbedBuilder()
          .setTitle('📋 ბილეთი დაიხურა')
          .addFields(
            { name: 'ბილეთი', value: interaction.channel.name, inline: true },
            { name: 'გახსნილი', value: `<@${ticket.user_id}>`, inline: true },
            { name: 'დახურა', value: `<@${interaction.user.id}>`, inline: true },
          )
          .setColor('#FF4444')
          .setTimestamp()
      ]});
    }
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}

async function handleTicketTranscript(interaction, client) {
  await interaction.reply({ content: '📋 ტრანსკრიფტი ჩაიტვირთება...', ephemeral: true });
  const messages = await interaction.channel.messages.fetch({ limit: 100 });
  const content = [...messages.values()].reverse()
    .map(m => `[${new Date(m.createdTimestamp).toLocaleString('ka-GE')}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`)
    .join('\n');

  const { AttachmentBuilder } = require('discord.js');
  const buffer = Buffer.from(content, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });
  await interaction.editReply({ content: '✅ ტრანსკრიფტი მზადაა:', files: [attachment] });
}

// ─── APPLY ──────────────────────────────────────────────────────────────────
async function handleApplyOpen(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('apply_modal')
    .setTitle('📝 განაცხადის ფორმა — Mythos Core');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('apply_name').setLabel('სახელი და გვარი').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('მაგ: გიორგი ბერიძე')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('apply_age').setLabel('ასაკი').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('მაგ: 18')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('apply_experience').setLabel('გამოცდილება').setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('აღწერეთ თქვენი გამოცდილება...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('apply_reason').setLabel('რატომ გინდათ შემოსვლა?').setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder('მოტივაცია...')
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('apply_extra').setLabel('დამატებითი ინფორმაცია').setStyle(TextInputStyle.Paragraph).setRequired(false).setPlaceholder('სურვილისამებრ...')
    ),
  );

  await interaction.showModal(modal);
}

async function handleApplyModal(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const config = getGuildConfig(interaction.guild.id);

  const name = interaction.fields.getTextInputValue('apply_name');
  const age = interaction.fields.getTextInputValue('apply_age');
  const experience = interaction.fields.getTextInputValue('apply_experience');
  const reason = interaction.fields.getTextInputValue('apply_reason');
  const extra = interaction.fields.getTextInputValue('apply_extra') || '';

  const appId = createApplication(interaction.guild.id, interaction.user.id, { name, age, experience, reason, extra });

  if (config.apply_log_channel) {
    const logChannel = interaction.guild.channels.cache.get(config.apply_log_channel);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('📋 ახალი განაცხადი')
        .setDescription(`განაცხადი #${appId}`)
        .addFields(
          { name: '👤 მომხმარებელი', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: '📛 სახელი', value: name, inline: true },
          { name: '🎂 ასაკი', value: age, inline: true },
          { name: '💼 გამოცდილება', value: experience },
          { name: '❓ მოტივაცია', value: reason },
          { name: '📌 დამატებითი', value: extra || 'არ მითითებია' },
        )
        .setColor('#5865F2')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `Mythos Core • განაცხადი #${appId}` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`apply_accept_${appId}`).setLabel('✅ მიღება').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`apply_reject_${appId}`).setLabel('❌ უარი').setStyle(ButtonStyle.Danger),
      );

      const msg = await logChannel.send({ embeds: [embed], components: [row] });
      updateApplicationMessage(appId, msg.id);
    }
  }

  await interaction.editReply({ content: '✅ თქვენი განაცხადი წარმატებით გაიგზავნა! დაიცადეთ პასუხი.' });
}

async function handleApplyDecision(interaction, status) {
  const parts = interaction.customId.split('_');
  const appId = parseInt(parts[parts.length - 1]);
  updateApplicationStatus(appId, status);

  const label = status === 'accepted' ? '✅ მიღებულია' : '❌ უარყოფილია';
  const color = status === 'accepted' ? '#00FF7F' : '#FF4444';

  const embed = EmbedBuilder.from(interaction.message.embeds[0])
    .setColor(color)
    .setFooter({ text: `${label} — ${interaction.user.tag} | Mythos Core` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_done').setLabel(label).setStyle(status === 'accepted' ? ButtonStyle.Success : ButtonStyle.Danger).setDisabled(true)
  );

  await interaction.update({ embeds: [embed], components: [row] });
}

// ─── GIVEAWAY ───────────────────────────────────────────────────────────────
async function handleGiveawayEnter(interaction) {
  const giveaway = getGiveawayByMessage(interaction.message.id);
  if (!giveaway || giveaway.ended) {
    return interaction.reply({ content: '❌ ეს გათამაშება უკვე დასრულდა.', ephemeral: true });
  }

  const entered = enterGiveaway(giveaway.id, interaction.user.id);
  const entries = getGiveawayEntries(giveaway.id);

  if (!entered) {
    return interaction.reply({ content: '❌ თქვენ უკვე მონაწილეობთ ამ გათამაშებაში.', ephemeral: true });
  }

  // Update participant count in embed
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const fields = embed.data.fields || [];
  const idx = fields.findIndex(f => f.name === '👥 მონაწილეები');
  if (idx !== -1) fields[idx].value = String(entries.length);
  else embed.addFields({ name: '👥 მონაწილეები', value: String(entries.length), inline: true });

  await interaction.update({ embeds: [embed] });
  await interaction.followUp({ content: '✅ წარმატებით გაიარეთ სარეგისტრაციო!', ephemeral: true });
}

async function handleGiveawayLeave(interaction) {
  const giveaway = getGiveawayByMessage(interaction.message.id);
  if (!giveaway || giveaway.ended) {
    return interaction.reply({ content: '❌ ეს გათამაშება უკვე დასრულდა.', ephemeral: true });
  }

  const left = leaveGiveaway(giveaway.id, interaction.user.id);
  if (!left) {
    return interaction.reply({ content: '❌ თქვენ არ მონაწილეობდით ამ გათამაშებაში.', ephemeral: true });
  }

  const entries = getGiveawayEntries(giveaway.id);
  const embed = EmbedBuilder.from(interaction.message.embeds[0]);
  const fields = embed.data.fields || [];
  const idx = fields.findIndex(f => f.name === '👥 მონაწილეები');
  if (idx !== -1) fields[idx].value = String(entries.length);

  await interaction.update({ embeds: [embed] });
  await interaction.followUp({ content: '✅ გათამაშებიდან გამოხვედით.', ephemeral: true });
}

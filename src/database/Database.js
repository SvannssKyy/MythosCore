const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'mythos.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    join_channel TEXT,
    join_message TEXT DEFAULT 'მოგესალმებით, {user}! სერვერზე {server}',
    leave_channel TEXT,
    leave_message TEXT DEFAULT 'მომხმარებელი {user} დატოვა სერვერი.',
    auto_role TEXT,
    ticket_category TEXT,
    ticket_log_channel TEXT,
    ticket_support_role TEXT,
    apply_channel TEXT,
    apply_log_channel TEXT,
    apply_role TEXT,
    giveaway_role TEXT
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (unixepoch()),
    closed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS ticket_counter (
    guild_id TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS invites (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    inviter_id TEXT,
    code TEXT,
    joined_at INTEGER DEFAULT (unixepoch()),
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS invite_counts (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    real_count INTEGER DEFAULT 0,
    left_count INTEGER DEFAULT 0,
    fake_count INTEGER DEFAULT 0,
    bonus INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    winner_count INTEGER DEFAULT 1,
    host_id TEXT NOT NULL,
    ends_at INTEGER NOT NULL,
    ended INTEGER DEFAULT 0,
    winners TEXT
  );

  CREATE TABLE IF NOT EXISTS giveaway_entries (
    giveaway_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (giveaway_id, user_id),
    FOREIGN KEY (giveaway_id) REFERENCES giveaways(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message_id TEXT,
    name TEXT NOT NULL,
    age TEXT NOT NULL,
    experience TEXT NOT NULL,
    reason TEXT NOT NULL,
    extra TEXT,
    status TEXT DEFAULT 'pending',
    submitted_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT DEFAULT '#5865F2',
    footer TEXT,
    buttons TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

module.exports = {
  db,

  getGuildConfig(guildId) {
    let config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    if (!config) {
      db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)').run(guildId);
      config = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    }
    return config;
  },

  setGuildConfig(guildId, key, value) {
    db.prepare(`INSERT INTO guild_config (guild_id, ${key}) VALUES (?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET ${key} = excluded.${key}`).run(guildId, value);
  },

  getTicketCount(guildId) {
    const row = db.prepare('SELECT count FROM ticket_counter WHERE guild_id = ?').get(guildId);
    return row ? row.count : 0;
  },

  incrementTicketCount(guildId) {
    db.prepare(`INSERT INTO ticket_counter (guild_id, count) VALUES (?, 1)
      ON CONFLICT(guild_id) DO UPDATE SET count = count + 1`).run(guildId);
    return db.prepare('SELECT count FROM ticket_counter WHERE guild_id = ?').get(guildId).count;
  },

  createTicket(guildId, channelId, userId) {
    const result = db.prepare(
      'INSERT INTO tickets (guild_id, channel_id, user_id) VALUES (?, ?, ?)'
    ).run(guildId, channelId, userId);
    return result.lastInsertRowid;
  },

  getTicketByChannel(channelId) {
    return db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND status = ?').get(channelId, 'open');
  },

  closeTicket(channelId) {
    db.prepare("UPDATE tickets SET status = 'closed', closed_at = unixepoch() WHERE channel_id = ?").run(channelId);
  },

  getInviteCount(guildId, userId) {
    return db.prepare('SELECT * FROM invite_counts WHERE guild_id = ? AND user_id = ?').get(guildId, userId)
      || { real_count: 0, left_count: 0, fake_count: 0, bonus: 0 };
  },

  addInvite(guildId, inviterId) {
    db.prepare(`INSERT INTO invite_counts (guild_id, user_id, real_count) VALUES (?, ?, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET real_count = real_count + 1`).run(guildId, inviterId);
  },

  addLeftInvite(guildId, inviterId) {
    db.prepare(`INSERT INTO invite_counts (guild_id, user_id, left_count) VALUES (?, ?, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET left_count = left_count + 1`).run(guildId, inviterId);
  },

  recordJoin(guildId, userId, inviterId, code) {
    db.prepare(`INSERT OR REPLACE INTO invites (guild_id, user_id, inviter_id, code) VALUES (?, ?, ?, ?)`)
      .run(guildId, userId, inviterId, code);
  },

  getJoinRecord(guildId, userId) {
    return db.prepare('SELECT * FROM invites WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
  },

  createGiveaway(guildId, channelId, prize, winnerCount, hostId, endsAt) {
    const result = db.prepare(
      'INSERT INTO giveaways (guild_id, channel_id, prize, winner_count, host_id, ends_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(guildId, channelId, prize, winnerCount, hostId, endsAt);
    return result.lastInsertRowid;
  },

  updateGiveawayMessage(id, messageId) {
    db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(messageId, id);
  },

  getActiveGiveaways() {
    return db.prepare('SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= ?').all(Math.floor(Date.now() / 1000));
  },

  getAllActiveGiveaways(guildId) {
    return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0').all(guildId);
  },

  getGiveaway(id) {
    return db.prepare('SELECT * FROM giveaways WHERE id = ?').get(id);
  },

  getGiveawayByMessage(messageId) {
    return db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
  },

  enterGiveaway(giveawayId, userId) {
    try {
      db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)').run(giveawayId, userId);
      return true;
    } catch {
      return false;
    }
  },

  leaveGiveaway(giveawayId, userId) {
    const result = db.prepare('DELETE FROM giveaway_entries WHERE giveaway_id = ? AND user_id = ?').run(giveawayId, userId);
    return result.changes > 0;
  },

  getGiveawayEntries(giveawayId) {
    return db.prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?').all(giveawayId).map(r => r.user_id);
  },

  endGiveaway(id, winners) {
    db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?').run(JSON.stringify(winners), id);
  },

  createApplication(guildId, userId, data) {
    const result = db.prepare(
      'INSERT INTO applications (guild_id, user_id, name, age, experience, reason, extra) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(guildId, userId, data.name, data.age, data.experience, data.reason, data.extra || '');
    return result.lastInsertRowid;
  },

  updateApplicationMessage(id, messageId) {
    db.prepare('UPDATE applications SET message_id = ? WHERE id = ?').run(messageId, id);
  },

  updateApplicationStatus(id, status) {
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, id);
  },

  getGuildApplications(guildId) {
    return db.prepare('SELECT * FROM applications WHERE guild_id = ? ORDER BY submitted_at DESC').all(guildId);
  },

  getGuildTickets(guildId) {
    return db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
  },

  getTopInviters(guildId, limit = 10) {
    return db.prepare(`
      SELECT user_id, real_count, left_count, fake_count, bonus,
             (real_count - left_count - fake_count + bonus) as total
      FROM invite_counts WHERE guild_id = ?
      ORDER BY total DESC LIMIT ?
    `).all(guildId, limit);
  },

  // ─── Panels ───────────────────────────────────────────────────────────────
  createPanel(guildId, channelId, type, title, description, color, footer, buttons) {
    const result = db.prepare(
      'INSERT INTO panels (guild_id, channel_id, type, title, description, color, footer, buttons) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(guildId, channelId, type, title, description, color, footer || '', JSON.stringify(buttons));
    return result.lastInsertRowid;
  },

  updatePanelMessage(id, messageId) {
    db.prepare('UPDATE panels SET message_id = ? WHERE id = ?').run(messageId, id);
  },

  updatePanel(id, title, description, color, footer, buttons) {
    db.prepare('UPDATE panels SET title = ?, description = ?, color = ?, footer = ?, buttons = ? WHERE id = ?')
      .run(title, description, color, footer || '', JSON.stringify(buttons), id);
  },

  deletePanel(id) {
    db.prepare('DELETE FROM panels WHERE id = ?').run(id);
  },

  getGuildPanels(guildId) {
    return db.prepare('SELECT * FROM panels WHERE guild_id = ? ORDER BY created_at DESC').all(guildId)
      .map(p => ({ ...p, buttons: JSON.parse(p.buttons) }));
  },

  getPanel(id) {
    const p = db.prepare('SELECT * FROM panels WHERE id = ?').get(id);
    if (!p) return null;
    return { ...p, buttons: JSON.parse(p.buttons) };
  }
};
require('dotenv').config({ path: '/workspaces/MythosCore/.env' });
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const axios = require('axios');
const {
  getGuildConfig, setGuildConfig, getGuildApplications, getGuildTickets,
  getAllActiveGiveaways, getTopInviters,
  createPanel, updatePanel, updatePanelMessage, deletePanel, getGuildPanels, getPanel
} = require('../database/Database');

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3000;
const DASHBOARD_URL = process.env.DASHBOARD_URL || `http://localhost:${PORT}`;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'mythos-core-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: `${DASHBOARD_URL}/auth/callback`,
  scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
  profile.accessToken = accessToken;
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

function isAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

function buildDiscordButtons(buttons) {
  return (buttons || []).map(b => {
    const btn = {
      type: 2,
      label: b.label,
      style: { primary: 1, secondary: 2, success: 3, danger: 4 }[b.style] || 1,
      custom_id: b.custom_id,
    };
    if (b.emoji && b.emoji.trim()) btn.emoji = { name: b.emoji.trim() };
    return btn;
  });
}

function buildEmbed(title, description, color, footer) {
  return {
    title,
    description,
    color: parseInt((color || '#5865F2').replace('#', ''), 16),
    footer: { text: footer || 'Mythos Core' },
    timestamp: new Date().toISOString()
  };
}

// Auth Routes
app.get('/login', passport.authenticate('discord'));
app.get('/auth/callback', passport.authenticate('discord', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

// Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', isAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/dashboard/:guildId', isAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'guild.html')));

// API: User
app.get('/api/user', isAuth, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    discriminator: req.user.discriminator,
    avatar: req.user.avatar,
    guilds: req.user.guilds?.filter(g => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)) || []
  });
});

app.get('/api/guilds', isAuth, async (req, res) => {
  try {
    const userGuilds = req.user.guilds?.filter(g =>
      (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20)
    ) || [];
    res.json(userGuilds);
  } catch (err) {
    res.status(500).json({ error: 'შეცდომა' });
  }
});

// API: Config
app.get('/api/guild/:guildId/config', isAuth, (req, res) => {
  res.json(getGuildConfig(req.params.guildId));
});

app.post('/api/guild/:guildId/config', isAuth, (req, res) => {
  const { guildId } = req.params;
  const allowed = ['join_channel', 'join_message', 'leave_channel', 'leave_message',
    'auto_role', 'ticket_category', 'ticket_log_channel', 'ticket_support_role',
    'apply_channel', 'apply_log_channel', 'giveaway_role'];
  for (const [key, value] of Object.entries(req.body)) {
    if (allowed.includes(key) && value !== undefined) {
      setGuildConfig(guildId, key, value || null);
    }
  }
  res.json({ success: true });
});

// API: Discord Channels & Roles
app.get('/api/guild/:guildId/channels', isAuth, async (req, res) => {
  try {
    const r = await axios.get(`https://discord.com/api/v10/guilds/${req.params.guildId}/channels`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
    });
    res.json(r.data);
  } catch { res.status(500).json([]); }
});

app.get('/api/guild/:guildId/roles', isAuth, async (req, res) => {
  try {
    const r = await axios.get(`https://discord.com/api/v10/guilds/${req.params.guildId}/roles`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
    });
    res.json(r.data);
  } catch { res.status(500).json([]); }
});

// API: Data
app.get('/api/guild/:guildId/tickets', isAuth, (req, res) => res.json(getGuildTickets(req.params.guildId)));
app.get('/api/guild/:guildId/applications', isAuth, (req, res) => res.json(getGuildApplications(req.params.guildId)));
app.get('/api/guild/:guildId/giveaways', isAuth, (req, res) => res.json(getAllActiveGiveaways(req.params.guildId)));
app.get('/api/guild/:guildId/invites', isAuth, (req, res) => res.json(getTopInviters(req.params.guildId, 20)));

app.get('/api/stats', isAuth, (req, res) => {
  const { db } = require('../database/Database');
  res.json({
    totalTickets: db.prepare('SELECT COUNT(*) as c FROM tickets').get().c,
    openTickets: db.prepare("SELECT COUNT(*) as c FROM tickets WHERE status = 'open'").get().c,
    totalApplications: db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
    totalGiveaways: db.prepare('SELECT COUNT(*) as c FROM giveaways').get().c,
    activeGiveaways: db.prepare('SELECT COUNT(*) as c FROM giveaways WHERE ended = 0').get().c,
  });
});

// API: Panels
app.get('/api/guild/:guildId/panels', isAuth, (req, res) => {
  res.json(getGuildPanels(req.params.guildId));
});

app.post('/api/guild/:guildId/panels', isAuth, async (req, res) => {
  const { guildId } = req.params;
  const { channel_id, type, title, description, color, footer, buttons } = req.body;

  if (!channel_id || !type || !title || !description) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const embed = buildEmbed(title, description, color, footer || `Mythos Core • ${type}`);
  const discordButtons = buildDiscordButtons(buttons);
  const components = discordButtons.length > 0
    ? [{ type: 1, components: discordButtons.slice(0, 5) }]
    : [];

  try {
    const msgRes = await axios.post(
      `https://discord.com/api/v10/channels/${channel_id}/messages`,
      { embeds: [embed], components },
      { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    const panelId = createPanel(guildId, channel_id, type, title, description, color || '#5865F2', footer, buttons || []);
    updatePanelMessage(panelId, msgRes.data.id);
    res.json({ success: true, id: panelId });
  } catch (e) {
    console.error('[Panel] Send error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Discord API error: ' + (e.response?.data?.message || e.message) });
  }
});

app.put('/api/guild/:guildId/panels/:panelId', isAuth, async (req, res) => {
  const { panelId } = req.params;
  const { title, description, color, footer, buttons } = req.body;
  const panel = getPanel(panelId);
  if (!panel) return res.status(404).json({ error: 'not found' });

  const embed = buildEmbed(title, description, color, footer);
  const discordButtons = buildDiscordButtons(buttons);
  const components = discordButtons.length > 0
    ? [{ type: 1, components: discordButtons.slice(0, 5) }]
    : [];

  try {
    if (panel.message_id) {
      await axios.patch(
        `https://discord.com/api/v10/channels/${panel.channel_id}/messages/${panel.message_id}`,
        { embeds: [embed], components },
        { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' } }
      );
    }
    updatePanel(panelId, title, description, color, footer, buttons || []);
    res.json({ success: true });
  } catch (e) {
    console.error('[Panel] Edit error:', e.response?.data || e.message);
    res.status(500).json({ error: 'Discord API error: ' + (e.response?.data?.message || e.message) });
  }
});

app.delete('/api/guild/:guildId/panels/:panelId', isAuth, async (req, res) => {
  const { panelId } = req.params;
  const panel = getPanel(panelId);
  if (!panel) return res.status(404).json({ error: 'not found' });
  try {
    if (panel.message_id) {
      await axios.delete(
        `https://discord.com/api/v10/channels/${panel.channel_id}/messages/${panel.message_id}`,
        { headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` } }
      ).catch(() => {});
    }
    deletePanel(panelId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🌐 დეშბორდი გაეშვა: ${DASHBOARD_URL}`);
});
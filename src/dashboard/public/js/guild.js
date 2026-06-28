const guildId = location.pathname.split('/')[2];

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const pageTitles = {
  overview:     { title: 'მიმოხილვა',    desc: 'სერვერის სტატისტიკა' },
  panels:       { title: 'პანელები',      desc: 'Discord-ის ბილეთების პანელები' },
  tickets:      { title: 'ბილეთები',      desc: 'ყველა ბილეთის ისტორია' },
  giveaways:    { title: 'გათამაშებები',  desc: 'გათამაშებების სია' },
  invites:      { title: 'მოწვევები',     desc: 'მოწვევის ლიდერბორდი' },
  applications: { title: 'განაცხადები',   desc: 'შემოსული განაცხადები' },
  settings:     { title: 'პარამეტრები',   desc: 'სერვერის კონფიგურაცია' },
};

document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const tab = el.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item[data-tab]').forEach(n => n.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    el.classList.add('active');
    if (pageTitles[tab]) {
      document.getElementById('pageTitle').textContent = pageTitles[tab].title;
      document.getElementById('pageDesc').textContent = pageTitles[tab].desc;
    }
  });
});

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id)?.classList.add('active');
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('active');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const [userRes, configRes, ticketsRes, appsRes, giveawaysRes, invitesRes] = await Promise.all([
    fetch('/api/user'),
    fetch(`/api/guild/${guildId}/config`),
    fetch(`/api/guild/${guildId}/tickets`),
    fetch(`/api/guild/${guildId}/applications`),
    fetch(`/api/guild/${guildId}/giveaways`),
    fetch(`/api/guild/${guildId}/invites`),
  ]);

  const user      = await userRes.json();
  const config    = await configRes.json();
  const tickets   = await ticketsRes.json();
  const apps      = await appsRes.json();
  const giveaways = await giveawaysRes.json();
  const invites   = await invitesRes.json();

  // User info
  document.getElementById('userInfo').innerHTML = `
    <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64" alt="avatar" class="user-avatar">
    <div class="user-details">
      <div class="user-name">${user.username}</div>
      <div class="user-tag">ადმინი</div>
    </div>
  `;

  // Stats
  const openTickets  = tickets.filter(t => t.status === 'open').length;
  const totalInvites = invites.reduce((s, r) => s + Math.max(0, r.real_count - r.left_count - r.fake_count + r.bonus), 0);

  const statsEl = document.getElementById('guildStats');
  if (statsEl) {
    const cards  = statsEl.querySelectorAll('.stat-card');
    const values = [tickets.length, openTickets, apps.length, giveaways.length, totalInvites];
    cards.forEach((c, i) => {
      c.classList.remove('loading');
      c.querySelector('.stat-value').textContent = values[i] ?? '—';
    });
  }

  // Recent tickets
  document.getElementById('recentTickets').innerHTML = tickets.slice(0, 6).length
    ? tickets.slice(0, 6).map(t => `
        <div class="list-item">
          <span>🎫 ${t.user_id} — #${t.id}</span>
          <span class="badge ${t.status === 'open' ? 'badge-success' : 'badge-danger'}">${t.status === 'open' ? 'ღია' : 'დახურული'}</span>
        </div>`).join('')
    : '<div class="empty-state"><p>ბილეთები არ არის</p></div>';

  // Recent apps
  document.getElementById('recentApps').innerHTML = apps.slice(0, 6).length
    ? apps.slice(0, 6).map(a => `
        <div class="list-item">
          <span>📝 ${a.name} — #${a.id}</span>
          <span class="badge ${a.status === 'pending' ? 'badge-warning' : a.status === 'accepted' ? 'badge-success' : 'badge-danger'}">
            ${a.status === 'pending' ? 'განხილვაში' : a.status === 'accepted' ? 'მიღებული' : 'უარყოფილი'}
          </span>
        </div>`).join('')
    : '<div class="empty-state"><p>განაცხადები არ არის</p></div>';

  // Tickets table
  document.getElementById('ticketsTable').innerHTML = tickets.length
    ? `<table class="data-table">
        <thead><tr><th>#</th><th>მომხმარებელი</th><th>სტატუსი</th><th>შეიქმნა</th></tr></thead>
        <tbody>${tickets.map(t => `
          <tr>
            <td>#${t.id}</td>
            <td><code>${t.user_id}</code></td>
            <td><span class="badge ${t.status === 'open' ? 'badge-success' : 'badge-danger'}">${t.status === 'open' ? 'ღია' : 'დახურული'}</span></td>
            <td>${new Date(t.created_at * 1000).toLocaleString('ka-GE')}</td>
          </tr>`).join('')}
        </tbody>
      </table>`
    : '<div class="empty-state"><p>ბილეთები არ არის</p></div>';

  // Giveaways
  document.getElementById('giveawaysList').innerHTML = giveaways.length
    ? giveaways.map(g => `
        <div class="giveaway-card">
          <div class="giveaway-prize">🎉 ${g.prize}</div>
          <div class="giveaway-meta">
            <span>🏆 გამარჯვებლები: ${g.winner_count}</span>
            <span>⏰ ${new Date(g.ends_at * 1000).toLocaleString('ka-GE')}</span>
            <span>ID: #${g.id}</span>
          </div>
        </div>`).join('')
    : '<div class="empty-state"><p>🎉 აქტიური გათამაშება არ არის</p></div>';

  // Invites
  document.getElementById('invitesTable').innerHTML = invites.length
    ? `<table class="data-table">
        <thead><tr><th>ადგილი</th><th>მომხმარებელი</th><th>სულ</th><th>რეალური</th><th>გავიდა</th><th>ბონუსი</th></tr></thead>
        <tbody>${invites.map((row, i) => {
          const total = row.real_count - row.left_count - row.fake_count + row.bonus;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          return `<tr>
            <td>${medal}</td><td><code>${row.user_id}</code></td>
            <td><strong>${total}</strong></td><td>${row.real_count}</td>
            <td>${row.left_count}</td><td>${row.bonus}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`
    : '<div class="empty-state"><p>მოწვევის ჩანაწერი არ არის</p></div>';

  // Applications
  const statusLabel = s => s === 'pending' ? 'განხილვაში' : s === 'accepted' ? 'მიღებული' : 'უარყოფილი';
  const statusClass = s => s === 'pending' ? 'badge-warning' : s === 'accepted' ? 'badge-success' : 'badge-danger';
  document.getElementById('applicationsList').innerHTML = apps.length
    ? apps.map(a => `
        <div class="app-card">
          <div class="app-card-header">
            <div class="app-name">📝 ${a.name} <span style="font-weight:400;font-size:.8rem;color:var(--text-muted)">#${a.id}</span></div>
            <span class="badge ${statusClass(a.status)}">${statusLabel(a.status)}</span>
          </div>
          <div class="app-field"><div class="app-field-label">მომხმარებელი</div><div class="app-field-value"><code>${a.user_id}</code></div></div>
          <div class="app-field"><div class="app-field-label">ასაკი</div><div class="app-field-value">${a.age}</div></div>
          <div class="app-field"><div class="app-field-label">გამოცდილება</div><div class="app-field-value">${a.experience}</div></div>
          <div class="app-field"><div class="app-field-label">მოტივაცია</div><div class="app-field-value">${a.reason}</div></div>
          ${a.extra ? `<div class="app-field"><div class="app-field-label">დამატებითი</div><div class="app-field-value">${a.extra}</div></div>` : ''}
          <div style="margin-top:.6rem;font-size:.75rem;color:var(--text-muted)">${new Date(a.submitted_at * 1000).toLocaleString('ka-GE')}</div>
        </div>`).join('')
    : '<div class="empty-state"><p>📝 განაცხადები არ არის</p></div>';

  populateSettings(config);
  await loadPanels();
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function populateSettings(config) {
  const map = {
    'cfg-ticketCategoryId':          config.ticket_category,
    'cfg-ticketLogsChannelId':       config.ticket_log_channel,
    'cfg-ticketTranscriptChannelId': config.ticket_log_channel,
    'cfg-welcomeChannelId':          config.join_channel,
    'cfg-leaveChannelId':            config.leave_channel,
    'cfg-welcomeMessage':            config.join_message,
    'cfg-leaveMessage':              config.leave_message,
    'cfg-autoroleId':                config.auto_role,
  };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const data = {
    ticket_category:    document.getElementById('cfg-ticketCategoryId')?.value || '',
    ticket_log_channel: document.getElementById('cfg-ticketLogsChannelId')?.value || '',
    join_channel:       document.getElementById('cfg-welcomeChannelId')?.value || '',
    leave_channel:      document.getElementById('cfg-leaveChannelId')?.value || '',
    join_message:       document.getElementById('cfg-welcomeMessage')?.value || '',
    leave_message:      document.getElementById('cfg-leaveMessage')?.value || '',
    auto_role:          document.getElementById('cfg-autoroleId')?.value || '',
  };
  const res  = await fetch(`/api/guild/${guildId}/config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const json = await res.json();
  const msg  = document.getElementById('saveMsg');
  msg.textContent = json.success ? '✅ შენახულია!' : '❌ შეცდომა';
  msg.className   = json.success ? 'save-msg show-success' : 'save-msg show-error';
  setTimeout(() => { msg.textContent = ''; msg.className = 'save-msg'; }, 3000);
}

// ─── Panels ───────────────────────────────────────────────────────────────────
let panelButtons  = [];
let editingPanelId = null;
let allChannels   = [];

async function loadPanels() {
  const [panelsRes, chRes] = await Promise.all([
    fetch(`/api/guild/${guildId}/panels`),
    fetch(`/api/guild/${guildId}/channels`),
  ]);
  const panels = await panelsRes.json();
  allChannels  = await chRes.json();

  // Populate channel select in modal
  const chSelect = document.getElementById('pm-channel');
  if (chSelect && chSelect.tagName === 'SELECT') {
    const textChannels = allChannels
      .filter(c => c.type === 0)
      .sort((a, b) => a.position - b.position);
    chSelect.innerHTML = '<option value="">— აირჩიეთ არხი —</option>' +
      textChannels.map(c => `<option value="${c.id}">#${c.name}</option>`).join('');
  }

  renderPanels(panels);
}

function renderPanels(panels) {
  const container = document.getElementById('panelsList');
  if (!container) return;
  if (!panels.length) {
    container.innerHTML = '<div class="empty-state"><p>📋 პანელები არ არის</p></div>';
    return;
  }
  const typeIcon  = { ticket: '🎫', apply: '📝', giveaway: '🎉', custom: '✨', support: '🎫', report: '📩', order: '🛒' };
  const typeLabel = { ticket: 'ბილეთი', apply: 'განაცხადი', giveaway: 'გათამაშება', custom: 'სხვა', support: 'მხარდაჭერა', report: 'მოხსენება', order: 'შეკვეთა' };

  container.innerHTML = panels.map(p => {
    const chName   = allChannels.find(c => c.id === p.channel_id)?.name || p.channel_id;
    const btnCount = p.buttons?.length || 0;
    return `
      <div class="panel-card" style="border-left:4px solid ${p.color || '#dc2626'}">
        <div class="panel-card-header">
          <div>
            <span class="panel-type-badge">${typeIcon[p.type] || '✨'} ${typeLabel[p.type] || p.type}</span>
            <div class="panel-title">${p.title}</div>
            <div class="panel-meta">#${chName} • ${btnCount} ღილაკი</div>
          </div>
          <div class="panel-actions">
            <button class="btn btn-sm btn-secondary" onclick="openEditPanel(${p.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="deletePanelById(${p.id})">🗑️</button>
          </div>
        </div>
        <div class="discord-embed" style="border-left:4px solid ${p.color || '#dc2626'};margin-top:.8rem">
          <div class="embed-title">${p.title}</div>
          <div class="embed-desc">${p.description.substring(0, 100)}${p.description.length > 100 ? '...' : ''}</div>
          ${p.buttons?.length ? `<div class="embed-buttons">${p.buttons.map(b =>
            `<span class="embed-btn embed-btn-${b.style || 'primary'}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>`
          ).join('')}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ─── Template loader ──────────────────────────────────────────────────────────
const panelTemplates = {
  support: {
    title: '🎫 მხარდაჭერა',
    description: '**ბილეთის გასახსნელად დააჭირეთ ღილაკს ქვემოთ.**\n\nჩვენი გუნდი მზადაა თქვენს დასახმარებლად.',
    color: '#5865F2',
    footer: 'Mythos Core • ბილეთების სისტემა',
    buttons: [{ label: 'ბილეთის გახსნა', emoji: '📩', style: 'primary', custom_id: 'ticket_create' }]
  },
  report: {
    title: '📩 მოხსენება',
    description: '**გსურთ მოხსენება გამოაგზავნოთ?**\n\nდააჭირეთ ღილაკს და შეავსეთ ფორმა.',
    color: '#ED4245',
    footer: 'Mythos Core • მოხსენება',
    buttons: [{ label: 'მოხსენება', emoji: '📩', style: 'danger', custom_id: 'ticket_report' }]
  },
  order: {
    title: '🛒 შეკვეთა',
    description: '**შეკვეთის გასაკეთებლად დააჭირეთ ღილაკს.**\n\nჩვენი გუნდი დაგიკავშირდებათ.',
    color: '#57F287',
    footer: 'Mythos Core • შეკვეთა',
    buttons: [{ label: 'შეკვეთა', emoji: '🛒', style: 'success', custom_id: 'ticket_order' }]
  },
  giveaway: {
    title: '🎉 გათამაშება',
    description: '**მონაწილეობისთვის დააჭირეთ ღილაკს!**\n\nგამარჯვებული შემთხვევითად შეირჩევა.',
    color: '#FFD700',
    footer: 'Mythos Core • გათამაშება',
    buttons: [
      { label: 'მონაწილეობა', emoji: '🎉', style: 'success', custom_id: 'gw_enter' },
      { label: 'გამოსვლა',   emoji: '🚪', style: 'danger',  custom_id: 'gw_leave' }
    ]
  },
  apply: {
    title: '📝 განაცხადი',
    description: '**გსურთ ჩვენი გუნდის ნაწილი გახდეთ?**\n\nდააჭირეთ ღილაკს და შეავსეთ ფორმა.',
    color: '#57F287',
    footer: 'Mythos Core • განაცხადი',
    buttons: [{ label: 'განაცხადის გაგზავნა', emoji: '📝', style: 'success', custom_id: 'apply_open' }]
  },
};

function loadTemplate() {
  const type = document.getElementById('pm-type')?.value;
  const t = panelTemplates[type];
  if (!t) return;
  document.getElementById('pm-title').value       = t.title;
  document.getElementById('pm-description').value = t.description;
  document.getElementById('pm-color').value       = t.color;
  document.getElementById('pm-footer').value      = t.footer;
  panelButtons = [...t.buttons];
  renderButtonList();
  updatePreview();
}

function openCreatePanel() {
  editingPanelId = null;
  panelButtons   = [];
  document.getElementById('pm-title').value       = '';
  document.getElementById('pm-description').value = '';
  document.getElementById('pm-color').value       = '#dc2626';
  document.getElementById('pm-footer').value      = 'Mythos Core';
  document.getElementById('pm-type').value        = 'support';
  const ch = document.getElementById('pm-channel');
  if (ch) ch.value = '';
  // ტიპის მიხედვით template-ის ჩატვირთვა
  loadTemplate();
  renderButtonList();
  updatePreview();
  openModal('panelModal');
}

async function openEditPanel(id) {
  const res    = await fetch(`/api/guild/${guildId}/panels`);
  const panels = await res.json();
  const panel  = panels.find(p => p.id === id);
  if (!panel) return;

  editingPanelId = id;
  panelButtons   = panel.buttons || [];

  document.getElementById('pm-title').value       = panel.title;
  document.getElementById('pm-description').value = panel.description;
  document.getElementById('pm-color').value       = panel.color || '#dc2626';
  document.getElementById('pm-footer').value      = panel.footer || '';
  document.getElementById('pm-type').value        = panel.type;

  const ch = document.getElementById('pm-channel');
  if (ch) ch.value = panel.channel_id || '';

  renderButtonList();
  updatePreview();
  openModal('panelModal');
}

// ─── Buttons ──────────────────────────────────────────────────────────────────
function addButton(label, style, custom_id) {
  if (panelButtons.length >= 5) { alert('მაქსიმუმ 5 ღილაკი!'); return; }
  panelButtons.push({ label, style, custom_id, emoji: '' });
  renderButtonList();
  updatePreview();
}

function addCustomButton() {
  if (panelButtons.length >= 5) { alert('მაქსიმუმ 5 ღილაკი!'); return; }
  const label     = prompt('ღილაკის ტექსტი:');
  if (!label) return;
  const emoji     = prompt('ემოჯი (სურვილისამებრ, მაგ: 📩):') || '';
  const style     = prompt('სტილი (primary / secondary / success / danger):') || 'primary';
  const custom_id = prompt('Custom ID (მაგ: ticket_create):') || `btn_${Date.now()}`;
  panelButtons.push({ label, emoji, style, custom_id });
  renderButtonList();
  updatePreview();
}

function editButtonAt(i) {
  const b         = panelButtons[i];
  const label     = prompt('ღილაკის ტექსტი:', b.label);
  if (!label) return;
  const emoji     = prompt('ემოჯი:', b.emoji || '') || '';
  const style     = prompt('სტილი (primary/secondary/success/danger):', b.style) || 'primary';
  const custom_id = prompt('Custom ID:', b.custom_id) || b.custom_id;
  panelButtons[i] = { label, emoji, style, custom_id };
  renderButtonList();
  updatePreview();
}

function removeButtonAt(i) {
  panelButtons.splice(i, 1);
  renderButtonList();
  updatePreview();
}

function renderButtonList() {
  const container = document.getElementById('buttonList');
  if (!container) return;
  container.innerHTML = panelButtons.map((b, i) => `
    <div class="button-item">
      <div class="button-item-info">
        <span class="embed-btn embed-btn-${b.style}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>
        <small style="color:rgba(255,255,255,.4)">ID: ${b.custom_id}</small>
      </div>
      <div style="display:flex;gap:.3rem">
        <button class="btn btn-sm btn-secondary" onclick="editButtonAt(${i})">✏️</button>
        <button class="btn btn-sm btn-danger"    onclick="removeButtonAt(${i})">✕</button>
      </div>
    </div>
  `).join('') || '<div style="color:rgba(255,255,255,.3);font-size:.8rem;padding:.4rem">ღილაკები არ არის</div>';
}

function updatePreview() {
  const title  = document.getElementById('pm-title')?.value       || 'სათაური';
  const desc   = document.getElementById('pm-description')?.value || 'აღწერა...';
  const color  = document.getElementById('pm-color')?.value       || '#dc2626';
  const footer = document.getElementById('pm-footer')?.value      || 'Mythos Core';

  const preview = document.getElementById('embedPreview');
  if (preview) preview.style.borderLeftColor = color;
  const pt = document.getElementById('prev-title');  if (pt) pt.textContent = title;
  const pd = document.getElementById('prev-desc');   if (pd) pd.textContent = desc;
  const pf = document.getElementById('prev-footer'); if (pf) pf.textContent = footer;
  const pb = document.getElementById('prev-buttons');
  if (pb) pb.innerHTML = panelButtons.map(b =>
    `<span class="embed-btn embed-btn-${b.style}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>`
  ).join('');
}

async function savePanel() {
  const title       = document.getElementById('pm-title')?.value.trim();
  const description = document.getElementById('pm-description')?.value.trim();
  const color       = document.getElementById('pm-color')?.value;
  const footer      = document.getElementById('pm-footer')?.value.trim();
  const type        = document.getElementById('pm-type')?.value;
  const channel_id  = document.getElementById('pm-channel')?.value.trim();

  if (!title || !description) return alert('სათაური და აღწერა სავალდებულოა!');

  const saveBtn = document.querySelector('#panelModal .btn-primary');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ იგზავნება...'; }

  try {
    let res;
    if (editingPanelId) {
      res = await fetch(`/api/guild/${guildId}/panels/${editingPanelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, color, footer, buttons: panelButtons })
      });
    } else {
      if (!channel_id) {
        alert('აირჩიეთ არხი!');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '📤 Discord-ში გაგზავნა'; }
        return;
      }
      res = await fetch(`/api/guild/${guildId}/panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id, type, title, description, color, footer, buttons: panelButtons })
      });
    }
    const json = await res.json();
    if (json.success) {
      closeModal('panelModal');
      await loadPanels();
    } else {
      alert('შეცდომა: ' + json.error);
    }
  } catch (e) {
    alert('შეცდომა: ' + e.message);
  }

  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '📤 Discord-ში გაგზავნა'; }
}

async function deletePanelById(id) {
  if (!confirm('დარწმუნებული ხართ? Discord-შიც წაიშლება.')) return;
  const res  = await fetch(`/api/guild/${guildId}/panels/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.success) await loadPanels();
  else alert('შეცდომა: ' + json.error);
}

// ─── Giveaway Modal ──────────────────────────────────────────────────────────
async function createGiveaway() {
  const prize     = document.getElementById('gw-prize')?.value.trim();
  const winners   = parseInt(document.getElementById('gw-winners')?.value) || 1;
  const endsAt    = document.getElementById('gw-ends')?.value;
  const channelId = document.getElementById('gw-channel')?.value.trim();

  if (!prize || !endsAt || !channelId) return alert('ყველა ველი სავალდებულოა!');
  const durationMs = new Date(endsAt).getTime() - Date.now();
  if (durationMs < 10000) return alert('დასასრულის დრო სამომავლო უნდა იყოს!');

  const res  = await fetch(`/api/guild/${guildId}/giveaway`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prize, winner_count: winners, channel_id: channelId, ends_at: Math.floor(new Date(endsAt).getTime() / 1000) })
  });
  const json = await res.json();
  if (json.success) { closeModal('giveawayModal'); alert('✅ გათამაშება დაიწყო!'); }
  else alert('შეცდომა: ' + (json.error || 'უცნობი შეცდომა'));
}

init();
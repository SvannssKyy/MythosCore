const guildId = location.pathname.split('/')[2];

async function init() {
  const [userRes, configRes, ticketsRes, appsRes, giveawaysRes, invitesRes] = await Promise.all([
    fetch('/api/user'),
    fetch(`/api/guild/${guildId}/config`),
    fetch(`/api/guild/${guildId}/tickets`),
    fetch(`/api/guild/${guildId}/applications`),
    fetch(`/api/guild/${guildId}/giveaways`),
    fetch(`/api/guild/${guildId}/invites`),
  ]);

  const user = await userRes.json();
  const config = await configRes.json();
  const tickets = await ticketsRes.json();
  const apps = await appsRes.json();
  const giveaways = await giveawaysRes.json();
  const invites = await invitesRes.json();

  document.getElementById('userInfo').innerHTML = `
    <img src="https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64" alt="avatar" class="user-avatar">
    <div class="user-details">
      <div class="user-name">${user.username}</div>
      <div class="user-tag">ადმინი</div>
    </div>
  `;

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const pendingApps = apps.filter(a => a.status === 'pending').length;
  document.getElementById('overviewStats').innerHTML = `
    <div class="stat-card"><div class="stat-value">${tickets.length}</div><div class="stat-label">🎫 სულ ბილეთები</div></div>
    <div class="stat-card"><div class="stat-value">${openTickets}</div><div class="stat-label">🟢 ღია ბილეთები</div></div>
    <div class="stat-card"><div class="stat-value">${apps.length}</div><div class="stat-label">📝 განაცხადები</div></div>
    <div class="stat-card"><div class="stat-value">${pendingApps}</div><div class="stat-label">⏳ მოლოდინში</div></div>
    <div class="stat-card"><div class="stat-value">${giveaways.length}</div><div class="stat-label">🎉 გათამაშებები</div></div>
  `;

  const recentTickets = tickets.slice(0, 6);
  document.getElementById('recentTickets').innerHTML = recentTickets.length
    ? recentTickets.map(t => `
        <div class="list-item">
          <span>🎫 ${t.user_id} — #${t.id}</span>
          <span class="badge ${t.status === 'open' ? 'badge-success' : 'badge-danger'}">${t.status === 'open' ? 'ღია' : 'დახურული'}</span>
        </div>`).join('')
    : '<div class="empty-state"><p>ბილეთები არ არის</p></div>';

  const recentApps = apps.slice(0, 6);
  document.getElementById('recentApps').innerHTML = recentApps.length
    ? recentApps.map(a => `
        <div class="list-item">
          <span>📝 ${a.name} — #${a.id}</span>
          <span class="badge ${a.status === 'pending' ? 'badge-warning' : a.status === 'accepted' ? 'badge-success' : 'badge-danger'}">
            ${a.status === 'pending' ? 'განხილვაში' : a.status === 'accepted' ? 'მიღებული' : 'უარყოფილი'}
          </span>
        </div>`).join('')
    : '<div class="empty-state"><p>განაცხადები არ არის</p></div>';

  document.getElementById('ticketsTable').innerHTML = tickets.length
    ? tickets.map(t => `
        <tr>
          <td>#${t.id}</td>
          <td><code>${t.user_id}</code></td>
          <td><span class="badge ${t.status === 'open' ? 'badge-success' : 'badge-danger'}">${t.status === 'open' ? 'ღია' : 'დახურული'}</span></td>
          <td>${new Date(t.created_at * 1000).toLocaleString('ka-GE')}</td>
        </tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem">ბილეთები არ არის</td></tr>';

  document.getElementById('giveawaysList').innerHTML = giveaways.length
    ? giveaways.map(g => `
        <div class="giveaway-card">
          <div class="giveaway-prize">🎉 ${g.prize}</div>
          <div class="giveaway-meta">
            <span>🏆 გამარჯვებლები: ${g.winner_count}</span>
            <span>⏰ სრულდება: <strong>${new Date(g.ends_at * 1000).toLocaleString('ka-GE')}</strong></span>
            <span>ID: #${g.id}</span>
          </div>
        </div>`).join('')
    : '<div class="empty-state"><p>🎉 აქტიური გათამაშება არ არის</p></div>';

  document.getElementById('invitesTable').innerHTML = invites.length
    ? invites.map((row, i) => {
        const total = row.real_count - row.left_count - row.fake_count + row.bonus;
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        return `<tr>
          <td>${medal}</td>
          <td><code>${row.user_id}</code></td>
          <td><strong>${total}</strong></td>
          <td>${row.real_count}</td>
          <td>${row.left_count}</td>
          <td>${row.bonus}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem">მოწვევის ჩანაწერი არ არის</td></tr>';

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

  await populateSettings(config);
  await loadPanels();
}

async function populateSettings(config) {
  const form = document.getElementById('settingsForm');
  if (!form) return;

  const [chRes, rolesRes] = await Promise.all([
    fetch(`/api/guild/${guildId}/channels`),
    fetch(`/api/guild/${guildId}/roles`)
  ]);
  const channels = await chRes.json();
  const roles = await rolesRes.json();

  const textChannels = channels.filter(c => c.type === 0).sort((a, b) => a.position - b.position);
  const categories = channels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
  const filteredRoles = roles.filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position);

  function channelSelect(name, value) {
    return `<select name="${name}" class="form-select">
      <option value="">— არხი არ არის —</option>
      ${textChannels.map(c => `<option value="${c.id}" ${value == c.id ? 'selected' : ''}>#${c.name}</option>`).join('')}
    </select>`;
  }

  function categorySelect(name, value) {
    return `<select name="${name}" class="form-select">
      <option value="">— კატეგორია არ არის —</option>
      ${categories.map(c => `<option value="${c.id}" ${value == c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
    </select>`;
  }

  function roleSelect(name, value) {
    return `<select name="${name}" class="form-select">
      <option value="">— როლი არ არის —</option>
      ${filteredRoles.map(r => `<option value="${r.id}" ${value == r.id ? 'selected' : ''}>@${r.name}</option>`).join('')}
    </select>`;
  }

  const replacements = [
    { name: 'join_channel',        fn: channelSelect,  val: config.join_channel },
    { name: 'leave_channel',       fn: channelSelect,  val: config.leave_channel },
    { name: 'auto_role',           fn: roleSelect,     val: config.auto_role },
    { name: 'ticket_category',     fn: categorySelect, val: config.ticket_category },
    { name: 'ticket_log_channel',  fn: channelSelect,  val: config.ticket_log_channel },
    { name: 'ticket_support_role', fn: roleSelect,     val: config.ticket_support_role },
    { name: 'apply_log_channel',   fn: channelSelect,  val: config.apply_log_channel },
    { name: 'apply_channel',       fn: channelSelect,  val: config.apply_channel },
    { name: 'giveaway_role',       fn: roleSelect,     val: config.giveaway_role },
  ];

  for (const { name, fn, val } of replacements) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) el.outerHTML = fn(name, val);
  }

  const joinMsg = form.querySelector('[name="join_message"]');
  if (joinMsg && config.join_message) joinMsg.value = config.join_message;
  const leaveMsg = form.querySelector('[name="leave_message"]');
  if (leaveMsg && config.leave_message) leaveMsg.value = config.leave_message;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {};
    for (const el of form.querySelectorAll('input[name], select[name]')) {
      data[el.name] = el.value;
    }
    const res = await fetch(`/api/guild/${guildId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    const msg = document.getElementById('saveMsg');
    if (json.success) {
      msg.textContent = '✅ კონფიგურაცია შენახულია!';
      msg.className = 'save-msg show-success';
    } else {
      msg.textContent = '❌ შეცდომა შენახვისას';
      msg.className = 'save-msg show-error';
    }
    setTimeout(() => { msg.textContent = ''; msg.className = 'save-msg'; }, 3000);
  });
}

// ─── PANELS ──────────────────────────────────────────────────────────────────
let allChannels = [];
let editingPanelId = null;
let panelButtons = [];

async function loadPanels() {
  const [panelsRes, chRes] = await Promise.all([
    fetch(`/api/guild/${guildId}/panels`),
    fetch(`/api/guild/${guildId}/channels`)
  ]);
  const panels = await panelsRes.json();
  allChannels = await chRes.json();

  const textChannels = allChannels.filter(c => c.type === 0).sort((a, b) => a.position - b.position);

  // Populate channel select in panel form
  const chSelect = document.getElementById('panelChannel');
  if (chSelect) {
    chSelect.innerHTML = '<option value="">— აირჩიეთ არხი —</option>' +
      textChannels.map(c => `<option value="${c.id}">#${c.name}</option>`).join('');
  }

  renderPanels(panels);
}

function renderPanels(panels) {
  const container = document.getElementById('panelsList');
  if (!container) return;

  if (!panels.length) {
    container.innerHTML = '<div class="empty-state"><p>📋 პანელები არ არის. შექმენი პირველი!</p></div>';
    return;
  }

  const typeIcon = { ticket: '🎫', apply: '📝', giveaway: '🎉', custom: '✨' };
  const typeLabel = { ticket: 'ბილეთები', apply: 'განაცხადი', giveaway: 'გათამაშება', custom: 'სხვა' };

  container.innerHTML = panels.map(p => {
    const chName = allChannels.find(c => c.id === p.channel_id)?.name || p.channel_id;
    const btnCount = p.buttons?.length || 0;
    return `
      <div class="panel-card" style="border-left: 4px solid ${p.color || '#5865F2'}">
        <div class="panel-card-header">
          <div>
            <span class="panel-type-badge">${typeIcon[p.type] || '✨'} ${typeLabel[p.type] || p.type}</span>
            <div class="panel-title">${p.title}</div>
            <div class="panel-meta">#${chName} • ${btnCount} ღილაკი</div>
          </div>
          <div class="panel-actions">
            <button class="btn btn-sm btn-secondary" onclick="openEditPanel(${p.id})">✏️ რედაქტირება</button>
            <button class="btn btn-sm btn-danger" onclick="deletePanel(${p.id})">🗑️ წაშლა</button>
          </div>
        </div>
        <div class="panel-preview">
          <div class="discord-embed" style="border-left: 4px solid ${p.color || '#5865F2'}">
            <div class="embed-title">${p.title}</div>
            <div class="embed-desc">${p.description.substring(0, 120)}${p.description.length > 120 ? '...' : ''}</div>
            ${p.buttons?.length ? `<div class="embed-buttons">${p.buttons.map(b =>
              `<span class="embed-btn embed-btn-${b.style || 'primary'}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>`
            ).join('')}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCreatePanel() {
  editingPanelId = null;
  panelButtons = [];
  document.getElementById('panelModalTitle').textContent = '➕ პანელის შექმნა';
  document.getElementById('panelTitle').value = '';
  document.getElementById('panelDescription').value = '';
  document.getElementById('panelColor').value = '#5865F2';
  document.getElementById('panelFooter').value = 'Mythos Core';
  document.getElementById('panelType').value = 'ticket';
  document.getElementById('panelChannel').value = '';
  renderButtonList();
  document.getElementById('panelModal').classList.add('active');
  updatePreview();
}

async function openEditPanel(id) {
  const res = await fetch(`/api/guild/${guildId}/panels`);
  const panels = await res.json();
  const panel = panels.find(p => p.id === id);
  if (!panel) return;

  editingPanelId = id;
  panelButtons = panel.buttons || [];

  document.getElementById('panelModalTitle').textContent = '✏️ პანელის რედაქტირება';
  document.getElementById('panelTitle').value = panel.title;
  document.getElementById('panelDescription').value = panel.description;
  document.getElementById('panelColor').value = panel.color || '#5865F2';
  document.getElementById('panelFooter').value = panel.footer || '';
  document.getElementById('panelType').value = panel.type;

  renderButtonList();
  document.getElementById('panelModal').classList.add('active');
  updatePreview();
}

function closePanel() {
  document.getElementById('panelModal').classList.remove('active');
}

function loadTemplate() {
  const type = document.getElementById('panelType').value;
  const templates = {
    ticket: {
      title: '🎫 მხარდაჭერა',
      description: '**ბილეთის გასახსნელად დააჭირეთ ღილაკს ქვემოთ.**\n\nჩვენი გუნდი მზადაა თქვენს დასახმარებლად.',
      color: '#5865F2',
      footer: 'Mythos Core • ბილეთების სისტემა',
      buttons: [{ label: 'ბილეთის გახსნა', emoji: '📩', style: 'primary', custom_id: 'ticket_create' }]
    },
    apply: {
      title: '📝 განაცხადი',
      description: '**გსურთ ჩვენი გუნდის ნაწილი გახდეთ?**\n\nდააჭირეთ ღილაკს და შეავსეთ ფორმა.',
      color: '#57F287',
      footer: 'Mythos Core • განაცხადი სისტემა',
      buttons: [{ label: 'განაცხადის გაგზავნა', emoji: '📝', style: 'success', custom_id: 'apply_open' }]
    },
    giveaway: {
      title: '🎉 გათამაშება',
      description: '**მონაწილეობისთვის დააჭირეთ ღილაკს!**\n\nგამარჯვებული შემთხვევითად შეირჩევა.',
      color: '#FFD700',
      footer: 'Mythos Core • გათამაშება',
      buttons: [
        { label: 'მონაწილეობა', emoji: '🎟️', style: 'success', custom_id: 'gw_enter' },
        { label: 'გამოსვლა', emoji: '🚪', style: 'secondary', custom_id: 'gw_leave' }
      ]
    },
    custom: {
      title: '✨ სათაური',
      description: 'თქვენი აღწერა აქ...',
      color: '#5865F2',
      footer: 'Mythos Core',
      buttons: []
    }
  };

  const t = templates[type];
  if (!t) return;
  document.getElementById('panelTitle').value = t.title;
  document.getElementById('panelDescription').value = t.description;
  document.getElementById('panelColor').value = t.color;
  document.getElementById('panelFooter').value = t.footer;
  panelButtons = t.buttons;
  renderButtonList();
  updatePreview();
}

function renderButtonList() {
  const container = document.getElementById('buttonList');
  const styleLabel = { primary: '🔵 Primary', secondary: '⚫ Secondary', success: '🟢 Success', danger: '🔴 Danger' };
  container.innerHTML = panelButtons.map((b, i) => `
    <div class="button-item">
      <div class="button-item-info">
        <span class="embed-btn embed-btn-${b.style}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>
        <small style="color:var(--text-muted)">ID: ${b.custom_id}</small>
      </div>
      <div class="button-item-actions">
        <button class="btn btn-sm btn-secondary" onclick="editButton(${i})">✏️</button>
        <button class="btn btn-sm btn-danger" onclick="removeButton(${i})">✕</button>
      </div>
    </div>
  `).join('') || '<div style="color:var(--text-muted);font-size:.85rem;padding:.5rem">ღილაკები არ არის</div>';
}

function addButton() {
  if (panelButtons.length >= 5) {
    alert('მაქსიმუმ 5 ღილაკი შეიძლება!');
    return;
  }
  const label = prompt('ღილაკის ტექსტი:');
  if (!label) return;
  const emoji = prompt('ემოჯი (არასავალდებულო, მაგ: 📩):') || '';
  const style = prompt('სტილი (primary/secondary/success/danger):') || 'primary';
  const custom_id = prompt('Custom ID (მაგ: ticket_create):') || `btn_${Date.now()}`;
  panelButtons.push({ label, emoji, style, custom_id });
  renderButtonList();
  updatePreview();
}

function editButton(i) {
  const b = panelButtons[i];
  const label = prompt('ღილაკის ტექსტი:', b.label);
  if (!label) return;
  const emoji = prompt('ემოჯი:', b.emoji || '') || '';
  const style = prompt('სტილი (primary/secondary/success/danger):', b.style) || 'primary';
  const custom_id = prompt('Custom ID:', b.custom_id) || b.custom_id;
  panelButtons[i] = { label, emoji, style, custom_id };
  renderButtonList();
  updatePreview();
}

function removeButton(i) {
  panelButtons.splice(i, 1);
  renderButtonList();
  updatePreview();
}

function updatePreview() {
  const title = document.getElementById('panelTitle').value || 'სათაური';
  const desc = document.getElementById('panelDescription').value || 'აღწერა...';
  const color = document.getElementById('panelColor').value || '#5865F2';
  const footer = document.getElementById('panelFooter').value || 'Mythos Core';

  document.getElementById('previewEmbed').style.borderLeftColor = color;
  document.getElementById('previewTitle').textContent = title;
  document.getElementById('previewDesc').textContent = desc;
  document.getElementById('previewFooter').textContent = footer;
  document.getElementById('previewButtons').innerHTML = panelButtons.map(b =>
    `<span class="embed-btn embed-btn-${b.style}">${b.emoji ? b.emoji + ' ' : ''}${b.label}</span>`
  ).join('');
}

async function savePanel() {
  const title = document.getElementById('panelTitle').value.trim();
  const description = document.getElementById('panelDescription').value.trim();
  const color = document.getElementById('panelColor').value;
  const footer = document.getElementById('panelFooter').value.trim();
  const type = document.getElementById('panelType').value;
  const channel_id = document.getElementById('panelChannel')?.value;

  if (!title || !description) return alert('სათაური და აღწერა სავალდებულოა!');

  const saveBtn = document.getElementById('panelSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ იგზავნება...';

  try {
    let res;
    if (editingPanelId) {
      res = await fetch(`/api/guild/${guildId}/panels/${editingPanelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, color, footer, buttons: panelButtons })
      });
    } else {
      if (!channel_id) { saveBtn.disabled = false; saveBtn.textContent = '📤 გაგზავნა'; return alert('აირჩიეთ არხი!'); }
      res = await fetch(`/api/guild/${guildId}/panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id, type, title, description, color, footer, buttons: panelButtons })
      });
    }
    const json = await res.json();
    if (json.success) {
      closePanel();
      await loadPanels();
    } else {
      alert('შეცდომა: ' + json.error);
    }
  } catch (e) {
    alert('შეცდომა: ' + e.message);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = '📤 გაგზავნა';
}

async function deletePanel(id) {
  if (!confirm('დარწმუნებული ხართ? პანელი დისქორდშიც წაიშლება.')) return;
  const res = await fetch(`/api/guild/${guildId}/panels/${id}`, { method: 'DELETE' });
  const json = await res.json();
  if (json.success) await loadPanels();
  else alert('შეცდომა: ' + json.error);
}

function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  event.currentTarget?.classList.add('active');
}

init();
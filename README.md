# ⚡ Mythos Core — Discord ბოტი

Discord ბოტი ქართულ ენაზე, ყველა საჭირო ფუნქციით.

## ✨ ფუნქციები

| ფუნქცია | აღწერა |
|---|---|
| 🎫 **Ticket** | ბილეთების სისტემა ღილაკებით, ტრანსკრიფტი |
| 🎉 **Giveaway** | გათამაშებები ღილაკებით, ხელახალი წამოღება |
| 📨 **Invite Tracker** | მოწვევების ტრეკინგი, ლიდერბორდი |
| 👋 **Join/Leave** | კონფიგ. შემოსვლა/გასვლა შეტყობინებები |
| 🎭 **Auto-Role** | ავტომატური როლი ახალი წევრებისთვის |
| 📝 **Appy** | განაცხადი მოდალური ფორმით, მიღება/უარი |
| 🌐 **Web Dashboard** | ვებ-დეშბორდი Discord OAuth2-ით |

---

## 🚀 GitHub Codespaces-ში გაშვება

### 1. რეპო შექმნა

```bash
# გახსენით ეს საქაღალდე GitHub Codespace-ში
```

### 2. Dependencies დაყენება

```bash
npm install
```

### 3. გარემო ცვლადების დაყენება

```bash
cp .env.example .env
```

შემდეგ შეავსეთ `.env` ფაილი:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
CLIENT_SECRET=your_client_secret
DASHBOARD_URL=https://your-codespace-url-3000.preview.app.github.dev
SESSION_SECRET=any_random_string_here
DASHBOARD_PORT=3000
```

### 4. Discord Developer Portal

1. გადადით [discord.com/developers/applications](https://discord.com/developers/applications)
2. შექმენით ახალი Application → **New Application** → "Mythos Core"
3. **Bot** ჩანართი → **Add Bot** → დააკოპირეთ **Token** (→ `DISCORD_TOKEN`)
4. **OAuth2** → **General** → დააკოპირეთ **Client ID** და **Client Secret**
5. **OAuth2** → **Redirects** → დაამატეთ:
   ```
   https://your-codespace-url-3000.preview.app.github.dev/auth/callback
   ```
6. **Bot** → **Privileged Gateway Intents**:
   - ✅ Server Members Intent
   - ✅ Message Content Intent
   - ✅ Presence Intent

### 5. ბოტის ბრძანებების რეგისტრაცია

```bash
npm run deploy
```

### 6. ბოტის გაშვება

```bash
# ბოტი (terminal 1)
npm start

# დეშბორდი (terminal 2)  
npm run dashboard
```

---

## 📋 ბრძანებები

### ⚙️ კონფიგურაცია (Admin)
| ბრძანება | აღწერა |
|---|---|
| `/config join` | შემოსვლის შეტყობინება |
| `/config leave` | გასვლის შეტყობინება |
| `/config autorole` | ავტო-როლი |
| `/config view` | კონფიგ. ნახვა |
| `/ticket-setup` | ბილეთების დაყენება |
| `/apply-setup` | განაცხადის დაყენება |

### 🎉 გათამაშება (Manage Guild)
| ბრძანება | აღწერა |
|---|---|
| `/giveaway start` | გათამაშების დაწყება |
| `/giveaway end` | ადრე დასრულება |
| `/giveaway reroll` | ხელახალი წამოღება |

### 📨 მოწვევები
| ბრძანება | აღწერა |
|---|---|
| `/invites check` | მოწვევების შემოწმება |
| `/invites top` | ლიდერბორდი |

---

## 🔧 შეტყობინებების ცვლადები

| ცვლადი | მნიშვნელობა |
|---|---|
| `{user}` | მომხმარებლის მენშენი |
| `{username}` | მომხმარებლის სახელი |
| `{server}` | სერვერის სახელი |
| `{count}` | წევრთა რაოდენობა |

---

## 📁 სტრუქტურა

```
src/
├── index.js              # მთავარი ფაილი
├── deploy-commands.js    # ბრძანებების რეგისტრაცია
├── commands/             # Slash ბრძანებები
│   ├── ticket/
│   ├── giveaway/
│   ├── invite/
│   ├── config/
│   └── apply/
├── events/               # Discord ივენტები
├── handlers/             # Command/Event loaders
├── database/             # SQLite ბაზა
└── dashboard/            # ვებ-დეშბორდი
    ├── server.js
    └── public/
```

---

## 🌐 ვებ-დეშბორდი

დეშბორდი ხელმისაწვდომია: `http://localhost:3000` (ან Codespace URL)

**ფუნქციები:**
- Discord OAuth2 შესვლა
- ყველა სერვერის სია
- ბილეთების ისტორია
- განაცხადების ნახვა
- გათამაშებების მართვა
- მოწვევების სტატისტიკა
- ყველა პარამეტრის შეცვლა ბრაუზერიდან

---

**Mythos Core** — Discord ბოტი ქართულ ენაზე 🇬🇪

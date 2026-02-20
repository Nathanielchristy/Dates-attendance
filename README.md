# AttendTrack Pro — Web App

A full employee attendance web app with Supabase cloud database.

---

## 🚀 Setup in 5 Steps

### Step 1 — Create a Supabase Project (free)
1. Go to https://supabase.com and sign up
2. Click **New Project**, pick a name and region
3. Wait ~2 minutes for provisioning

### Step 2 — Set up the database
1. In Supabase → **SQL Editor → New Query**
2. Paste the entire contents of `supabase-setup.sql`
3. Click **Run** — tables, indexes, constraints, and RLS policies are all created

### Step 3 — Get your API keys
1. In Supabase → **Settings → API**
2. Copy your **Project URL** and **anon/public** key

### Step 4 — Configure the app
```bash
cp .env.example .env
# Fill in your values:
# VITE_SUPABASE_URL=https://xxxx.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Step 5 — Run the app
```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## 👤 Default Login
- **Username:** `admin`  **Password:** `Admin@123`

⚠️ Change this immediately — update the admin row in Supabase Table Editor.

---

## 🌐 Deploy (Free)

**Vercel (recommended):**
1. Push to GitHub → import on vercel.com
2. Add env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Deploy — you get a live URL

**Netlify:**
1. `npm run build` → drag `dist/` to netlify.com
2. Set the same env vars under Site Settings

---

## 🔒 Security Features

| Layer | Protection |
|---|---|
| **Password hashing** | PBKDF2-SHA256 with random salt, 200,000 iterations — never stored in plaintext |
| **Password strength** | Enforced: min 8 chars, uppercase, lowercase, digit |
| **Input sanitisation** | All user input stripped of HTML/script chars before use |
| **Input validation** | Per-field regex rules with inline error messages |
| **Input length limits** | maxLength enforced in both UI inputs and DB CHECK constraints |
| **Rate limiting** | Login locked for 15 min after 5 failed attempts |
| **Session integrity** | HMAC-SHA256 signed session — tampered devtools sessions are rejected |
| **Session expiry** | Sessions auto-expire after 8 hours |
| **Generic error messages** | Login never reveals whether username exists |
| **DB constraints** | CHECK constraints on all columns at database level |
| **Row Level Security** | Supabase RLS enabled on all tables |
| **Show/hide password** | Password toggle on all password fields |
| **No eval / innerHTML** | React JSX renders all user content safely |

---

## 🏗️ Project Structure
```
src/
├── lib/
│   ├── supabase.js     # Supabase client
│   ├── auth.jsx        # Auth context with rate limiting + session integrity
│   └── security.js     # sanitizeField, validators, hashPassword, rate limiter, session HMAC
├── pages/
│   ├── LoginPage.jsx   # Login with rate-limit feedback
│   ├── EmployeePage.jsx # Clock in/out + history
│   └── AdminPage.jsx   # Reports + add employee with strength meter
├── components/
│   └── Layout.jsx      # Collapsible sidebar
├── App.jsx / main.jsx
└── index.css
```

# ManifestHub - Backend Workflow & Requirements

This document describes the backend architecture, data flow, and setup requirements for ManifestHub.

---

## 1. Overview

The frontend is a static site (`index.html` + `profile.html`). All "backend" work happens through third-party services:

- **Supabase** — primary database, authentication, and realtime presence
- **Cloudflare Worker** — download bridge, deduplication, Discord alerts, and trending API
- **Google Apps Script** — backup download logger and legacy trending source (Google Sheets)

---

## 2. Architecture

```text
Frontend (static HTML/JS)
    │
    ├── Supabase JS Client ──────► Supabase (auth, download_history, RPC)
    │
    ├── Cloudflare Worker ◄──────► Cloudflare KV (dedup)
    │         │
    │         ├──► Discord Webhook (alerts)
    │         │
    │         ├──► Supabase REST (download_history insert + RPC)
    │         │
    │         └──► Google Apps Script Web App (backup log)
    │
    └── GitHub / Steam APIs (directly from browser)
```

---

## 3. Components

### 3.1 Supabase

**Role:** Primary database and auth provider.

**Tables / Functions:**
- `public.download_history` — one row per logged-in download
- `public.get_popular_downloads()` — RPC that returns top 50 games by count

**Auth:**
- Email/password with email confirmation
- Row Level Security (RLS) ensures users only read their own history
- A trigger keeps only the latest **50** downloads per user


**Setup:**
1. Create a Supabase project
2. Run `supabase.sql` in the SQL Editor
3. Enable **Email** provider in Auth settings
4. Note the **Project URL** and **anon/public** key (used in frontend)
5. Note the **Service Role** key (used in Cloudflare Worker)

---

### 3.2 Cloudflare Worker


**File:** `cloudflare-worker.js`

**Role:** The main backend bridge. It is the only server-side component that write-logs downloads.

**Endpoints:**

| Method | Path / Query | Description |
|--------|--------------|-------------|
| `GET` | `?top=true` | Calls Supabase RPC `get_popular_downloads()` and returns JSON for the Trending panel |
| `GET` | `?download={appId}&name={name}&uid={userId}` | Logs a download, deduplicates, alerts Discord, then redirects to GitHub |

**Environment Variables (secrets):**

| Name | Purpose |
|------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS for inserts) |
| `DOWNLOAD_WEBHOOK_URL` | Discord webhook URL for download alerts |
| `DOWNLOAD_SHEET_URL` | Google Apps Script web-app URL (backup logger) |
| `DEDUP_KV` | Cloudflare KV namespace binding (for 30s dedup) |


**Behavior on `?download=…`:**
1. Parse `appId`, `gameName`, `userId` from query params
2. Classify download type: `.manifest`, `.lua`, `ZIP`, or `Legacy`
3. **Deduplicate** using KV: if the same IP + appId + type was logged in the last 30s, skip
4. Fire-and-forget a background task that:
   - Sends a Discord embed/notification
   - Inserts a row into `public.download_history` (if `userId` is present)
   - POSTs to Google Apps Script as a backup
5. If the request is a CORS preflight/ping, return `200 Logged`
6. Otherwise, `302` redirect to:
   `https://codeload.github.com/SteamAutoCracks/ManifestHub/zip/refs/heads/{appId}`

**Deploy:**
1. `wrangler init` or use Cloudflare dashboard
2. Bind a **KV namespace** to `DEDUP_KV`
3. Set the secrets under **Settings → Variables**
4. Deploy and note the Worker URL (e.g. `https://manifesthub-bridge.trionine.workers.dev/`)

---

### 3.3 Google Apps Script

**File:** `manifesthub-record.gs`

**Role:** Backup download logger and legacy trending source.

**Why it exists:**
- Supabase is the source of truth for download history
- Google Sheets provides a human-readable backup and a fallback API

**Endpoints (deployed as a Web App):**

| Method | Params | Description |
|--------|--------|-------------|
| `POST` | JSON body | Logs a download row (`Timestamp`, `App ID`, `Game Name`, `Type`, `Real IP`) |
| `GET` | `action=top` | Returns top downloads from the `Stats` sheet (legacy trending) |
| `GET` | `ip={address}` | Returns last 50 downloads for a given IP (legacy per-user history) |

**Spreadsheet structure:**
- Sheet **Downloads** — raw log of every download event
- Sheet **Stats** — aggregated counts per AppID (used by legacy `top` endpoint)

**Deploy:**
1. Create a Google Sheet with tabs `Downloads` and `Stats`
2. Paste `manifesthub-record.gs` into the Apps Script editor
3. Deploy → **New deployment** → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or **Anyone with link** if used as a backup logger from Worker)
4. Copy the web-app URL into the Worker secret `DOWNLOAD_SHEET_URL`

---

## 4. Data Flow

### 4.1 Download Flow

```text
User clicks Download
       │
       ▼
Frontend builds Worker URL:
  ?download={appId}&name={gameName - .manifest}&uid={userId}
       │
       ▼
Cloudflare Worker
  ├─ Dedup check (KV, 30s TTL)
  ├─ Discord alert (best-effort)
  ├─ Supabase insert (logged-in users)
  ├─ Google Sheet insert (backup)
  └─ 302 Redirect → GitHub codeload ZIP
```

**Key points:**
- The redirect is always to GitHub; the Worker never proxies the file itself
- Deduplication prevents the same user/IP from spamming logs within 30 seconds
- Logging is fire-and-forget (`ctx.waitUntil`), so a slow Sheets write does not block the redirect

### 4.2 Trending / Popular Downloads Flow

```text
Frontend (index.html)
  └─ GET ?top=true to Worker
        │
        ▼
  Worker calls Supabase RPC:
    get_popular_downloads()
        │
        ▼
  Returns [{appId, gameName, count}, ...]
        │
        ▼
  Frontend renders "Popular Downloads"
```

**Fallback:**
- The site also loads `data/trending-data.json` as a cached fallback (populated by the daily GitHub Action)
- If the Worker RPC fails, the UI shows stale cached data instead of breaking

### 4.3 User Download History Flow

```text
Frontend (profile.html)
  └─ Supabase client query:
      SELECT * FROM download_history
      WHERE user_id = auth.uid()
      ORDER BY created_at DESC
```
- Results are cached in `localStorage` for instant subsequent loads
- A background re-fetch checks for updates and refreshes the cache

---

## 5. Requirements Checklist

| Component | Required Account / Service | Cost |
|-----------|---------------------------|------|
| **Frontend hosting** | Netlify / Vercel / GitHub Pages | Free tier works |
| **Supabase** | Free tier project | Free (up to 50k MAU, 500MB DB) |
| **Cloudflare Worker** | Free Cloudflare account | Free tier (100k requests/day) |
| **KV Namespace** | Cloudflare account | Free tier included |
| **Discord Webhook** | Any Discord server | Free |
| **Google Sheets** | Google account | Free |
| **GitHub** | Repo: `SteamAutoCracks/ManifestHub` | Free (public repo traffic) |

---

## 6. Secrets & Configuration Reference

### Frontend (`index.html`, `profile.html`)
- Supabase **anon/public** key — safe to expose in client-side code
- Supabase **Project URL** — safe to expose

### Cloudflare Worker (server-side only)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DOWNLOAD_WEBHOOK_URL`
- `DOWNLOAD_SHEET_URL`
- `DEDUP_KV` (binding)

### Google Apps Script
- No secrets required in code; the script runs under the deployer identity

---

## 7. Maintenance Notes

- **Trending staleness:** If both the Worker RPC and the cached JSON fail, the Trending panel stays empty or shows old data.
- **Supabase RLS:** The `download_history` table uses RLS. The Worker uses the **service role** key to bypass RLS for inserts; the frontend uses the **anon** key and is restricted to its own rows.
- **History pruning:** The DB trigger automatically keeps only the latest 50 rows per user.
- **Discord rate limits:** Discord webhooks have rate limits; very high traffic may drop alerts. This is non-critical.

---

## 8. File Map

```text
ManifestHub/
├── backend/
│   ├── cloudflare-worker.js      # Cloudflare Worker entry point
│   ├── manifesthub-record.gs     # Google Apps Script backup logger + legacy API
│   ├── supabase.sql               # Supabase schema + RLS + RPC
│   └── backend.md                 # This file
├── js/
│   ├── script.js                  # Frontend core (calls Worker + Supabase)
│   └── profile.js                 # Frontend profile (download history UI)
├── index.html                     # Main page
└── profile.html                   # Profile page
```

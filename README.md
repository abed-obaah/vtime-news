# Vtime News

A news site with an editorial newsroom behind it.

RSS feeds from outlets around the world are pulled in on a schedule and land in a
**moderation queue**. Nothing reaches readers automatically: an editor reads each
story, edits it if they want, and then publishes it — or rejects it. Readers get a
public site with sections, search, comments, likes, saves and ratings.

- **Front end** — React 19 + Vite + Tailwind 4 (`src/`)
- **Back end** — Laravel 12 + Sanctum + MySQL (`backend/`)

---

## Requirements

| Tool | Version |
|---|---|
| PHP | 8.2+ (with `pdo_mysql`, `dom`, `simplexml`, `mbstring`) |
| Composer | 2.x |
| MySQL / MariaDB | 5.7+ / 10.4+ |
| Node.js | 20+ |

---

## Setup

### 1. Start MySQL and create the database

If you use XAMPP, start MySQL from the XAMPP control panel, or:

```bash
sudo /Applications/XAMPP/xamppfiles/bin/mysql.server start
```

Then create the schema:

```bash
mysql -u root -e "CREATE DATABASE pulsenews CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. Back end

```bash
cd backend
composer install
cp .env.example .env          # already points at mysql / 127.0.0.1:3306 / pulsenews
php artisan key:generate
php artisan migrate --seed
php artisan serve             # http://localhost:8000
```

If your MySQL uses a password or a different port, edit `DB_*` in `backend/.env` first.

### 3. Front end

```bash
cd ..                         # project root
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000/api
npm run dev                   # http://localhost:5173
```

### 4. Email

Password resets and replies to reader feedback are sent by email. Out of the box
`MAIL_MAILER=log` writes each message to `backend/storage/logs/laravel.log`
instead of sending it — fine for local work, useless in production.

To send for real, set these in `backend/.env`:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=smtp.your-provider.com
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_SCHEME=tls
MAIL_FROM_ADDRESS="newsroom@yourdomain.com"
MAIL_FROM_NAME="Vtime News"
```

`SITE_URL` must also be your real domain — password-reset links are built from it.

### 5. Pull the news in

```bash
cd backend
php artisan rss:fetch --force
```

Or press **Fetch feeds now** on the admin Moderation screen. Fourteen feeds
(BBC, NPR, Al Jazeera, The Guardian, Ars Technica, Sky News, Science Daily) are
seeded and ready.

To keep it running by itself, add one cron entry — Laravel's scheduler runs
`rss:fetch` every 15 minutes, and each feed respects its own interval:

```cron
* * * * * cd /path/to/Vtime News-v2-main/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@pulsenews.com` | `admin123` |
| Editor | `editor@pulsenews.com` | `editor123` |
| Reader | `user@pulsenews.com` | `user123` |

Change these before putting anything on the internet.

The admin panel lives at **`/onlyadmindashboard`**. Admins and editors get in;
everyone else is redirected.

---

## Site pages

The static pages are plain data in **`src/content/policies.js`** — edit the text
there, no components to touch.

| Page | Route |
|---|---|
| About Us | `/about` |
| Editorial Standards | `/ethics` |
| Privacy Policy | `/privacy` |
| Terms of Service | `/terms` |
| Cookie Policy | `/cookies` |
| Accessibility | `/accessibility` |
| Contact | `/contact` |

> **The legal pages are a starting point, not legal advice.** Privacy, Terms,
> Cookies and Accessibility carry obligations that differ by jurisdiction
> (GDPR, UK GDPR, CCPA, ADA/WCAG). Have a lawyer review them, and fill in the
> real entity name, address and contact addresses in the `COMPANY` block at the
> top of that file, before you publish.

Footer social links come from `VITE_SOCIAL_*` in the root `.env`. Leave one
blank and that network is simply hidden — no dead links ship.

---

## Accounts and passwords

Readers sign up at `/register` and sign in at `/login`. A forgotten password is
handled end to end:

`/forgot-password` → emailed link → `/reset-password?token=…` → new password.

Reset links expire after 60 minutes, work once, and resetting revokes every
existing session on that account. The "did you forget your password" response is
worded identically whether or not the address is registered, so the endpoint
can't be used to discover who has an account. Suspended accounts can't reset
their way back in.

**Rate limits** are keyed by account *and* address, not address alone — one
person fumbling their password on an office or mobile connection never locks out
everyone behind the same IP:

| Endpoint | Per account + IP | Per IP |
|---|---|---|
| Sign in | 5 / min | 30 / min |
| Password reset | 3 / min | 20 / min |
| Comments | 20 / min per account | — |
| Feedback | 5 / min per account | — |

---

## How a story travels

```
RSS feed  ──fetch──►  status: pending  ──►  Moderation queue
                                              │
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                    Publish now      Proofread & edit          Reject
                          │                   │                   │
                          ▼                   ▼                   ▼
                    status: published   edit, then publish   status: rejected
                          │
                          ▼
                    Live on the public site
```

A feed can be set to **auto-publish** on the RSS Feeds screen if you trust it
enough to skip the desk. Everything else waits for a human.

---

## Admin screens

| Screen | What it does |
|---|---|
| Overview | Traffic, growth, what's waiting for you, recent activity |
| Moderation | The wire queue — read, edit, publish, reject, in bulk or one at a time |
| Posts | Every story in every state; search, filter, publish, unpublish, delete |
| Create Post | Write an original story |
| RSS Feeds | Add/pause/remove sources, fetch on demand, watch for failures |
| Categories | Sections, colours, slugs |
| Users | Roles, suspensions, deletions |
| Comments | Approve, flag, reject, delete; reader reports surface here |
| Ads | Campaigns per placement, with impressions, clicks and CTR |
| Analytics | Views/visitors over 7–90 days, section and source performance |
| Announcements | Site-wide notices |
| Feedback | The contact form inbox, with replies |

---

## SEO

A news site lives or dies on this, so it is handled on both sides.

**Server-rendered (works for every crawler, no JavaScript needed).** Laravel
serves the built SPA and writes per-URL metadata into the HTML before it goes
out — title, description, canonical, robots, Open Graph, Twitter card and
`NewsArticle` JSON-LD. This is what makes link previews work in Facebook, X,
LinkedIn, WhatsApp and Slack, none of which execute JS.

```bash
npm run build                 # in the project root
cd backend && php artisan serve
open http://localhost:8000    # the whole site, with SEO, on one origin
```

Set `SITE_URL` in `backend/.env` to your real domain — it is what canonical
URLs, sitemaps and OG tags are built from.

**Crawler endpoints:**

| URL | What it is |
|---|---|
| `/robots.txt` | Points at both sitemaps, keeps admin/account/search pages out |
| `/sitemap.xml` | Every published story, section and used tag |
| `/news-sitemap.xml` | Google News format, last 48 hours only |
| `/feed.xml` | Our own RSS 2.0 feed, so aggregators can subscribe to us |
| `/feed/{section}.xml` | Per-section feed, e.g. `/feed/technology.xml` |

**Client-side.** On in-app navigation React rewrites the same tags
(`src/lib/seo.js`), replacing the server's set rather than stacking a second
copy on it. Articles emit `NewsArticle` + `BreadcrumbList` JSON-LD; the home
page emits `WebSite` with a search action. Search, login, register, dashboard
and the admin panel are all `noindex, nofollow`.

**Deploying the two parts separately?** If you host the SPA on a static host
(Netlify, Vercel, S3) instead of behind Laravel, you lose the server-injected
tags and social previews go generic. Either serve it through Laravel as above,
or proxy `/`, `/article/*`, `/category/*`, `/tag/*`, `/robots.txt`,
`/sitemap.xml`, `/news-sitemap.xml` and `/feed*.xml` to the Laravel host.

---

## Commands

```bash
# Back end (from backend/)
php artisan serve                    # API on :8000
php artisan migrate:fresh --seed     # rebuild and reseed the database
php artisan rss:fetch --force        # pull every feed now
php artisan rss:fetch --source=3     # pull one feed
./vendor/bin/phpunit                 # 137 tests

# Front end (from the project root)
npm run dev                          # dev server on :5173
npm run build                        # production build into dist/
npm run lint                         # eslint
```

---

## Notes on how it works

**Auth** — Sanctum bearer tokens. The SPA stores the token in `localStorage` and
sends it as `Authorization: Bearer …`. A 401 from the API signs the user out.

**HTML safety** — Article bodies are rendered with `dangerouslySetInnerHTML`, and
much of the text comes from third parties, so every body is run through a
whitelist sanitizer (`App\Services\HtmlSanitizer`) before it is stored. Scripts,
iframes, event handlers and `javascript:` URLs never make it into the database.

**Deduplication** — Each imported item is fingerprinted by feed + GUID, so
re-fetching the same feed imports nothing twice.

**View counting** — One view per visitor per article per day, which also powers
the analytics charts.

**Roles** — `admin` and `editor` both reach the newsroom. The API refuses to
demote, suspend, or delete the last remaining admin.

**Feedback replies** — When an editor answers a message from the contact form,
the reply is emailed to the reader as well as stored. If the mailer fails the
reply is still saved, the admin is told it didn't send, and `reply_emailed_at`
stays empty so you can tell the two apart.

**Ads** — Five placements, all live on the reader site:

| Placement | Where it appears |
|---|---|
| `header-banner` | Strip under the hero on the home page |
| `sidebar` | Home, article and category sidebars |
| `inline` | Mid-article, mid-home, search and tag pages |
| `before-footer` | Full-width call-out above the footer |
| `popup` | Dismissible interstitial on any reader page, after 6s |

Each slot serves the highest-`priority` active ad whose schedule window is open.
Impressions are counted when a slot actually renders and clicks when the reader
follows the link, which is what drives the CTR column in the Ads manager.
A dismissed popup stays gone for that reader for 24 hours.

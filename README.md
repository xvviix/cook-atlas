# 🌍 CookAtlas — Full-Stack Recipe Website

One merged project: the **CookAtlas frontend** (500 dishes / 50 countries) served by a
**Django + Django REST Framework backend** (565 recipes total).

| URL | What it is |
|---|---|
| `/` | CookAtlas frontend (search, explore, favorites, surprise me, dark mode) |
| `/api/dishes/` | 500-dish catalogue as JSON (powers the frontend) |
| `/api/countries/` | 50-country index as JSON |
| `/api/recipes/` | Full recipe API — list, create, retrieve, update, delete (writes need login) |
| `/api/recipes/random_recipe/` | One random recipe |
| `/api/recipes/search_by_ingredients/?ingredients=egg,chicken` | Case-insensitive ingredient search |
| `/api/fridge/?ingredients=egg,tomato&max_missing=2` | 🧊 Smart fridge match — dishes ranked by what you already have |
| `/api/auth/register/` `login/` `logout/` `me/` | Token accounts (sign up, login, logout, profile) |
| `/api/favorites/` `toggle/` `sync/` | Server-side favorites for registered users |
| `/api/ratings/rate/` | Rate a dish 1–5 (one rating per user, re-rate to change) |
| `/api/ratings/top/?by=rating\|favorites` | Rankings: top-rated and most-favorited dishes |
| `/api/comments/` | Per-dish discussion (public read, login to post, delete own) |
| `/api/recipes/by-external/<dish-id>/` | One catalogue dish + live community stats |
| `/dashboard/` | Admin recipe table |
| `/admin/` | Django admin |

Data: 65 hand-entered recipes + the 500-dish CookAtlas dataset (story, ingredients,
steps, tips, sources each). The SQLite database ships **pre-loaded**, so the app
runs immediately.

## 🚀 Quickstart (development)

```bash
cd recipe_website
pip install -r requirements.txt
cd recipe_project
python manage.py runserver
```

Open http://127.0.0.1:8000/ — the CookAtlas site loads its data from `/api/dishes/`
and automatically falls back to the bundled static JSON if the API is unreachable.

Optional: create an admin user to add/edit recipes via API or `/admin/`:

```bash
python manage.py createsuperuser
```

## 🧊 Fridge Finder (smart ingredient search)

Users type the ingredients they actually have (chips UI with autocomplete, comma-paste, quick-add staples) and CookAtlas instantly ranks all 500 world dishes:

- **Fuzzy matching** — plurals and word forms (`egg` ⇄ `eggs`, `tomato` ⇄ `tomatoes`) and cross-language names (`zucchini` ⇄ `courgette`, `cilantro` ⇄ `coriander`, `shrimp` ⇄ `prawn`…).
- **Pantry-aware scoring** — salt, pepper, sugar, oil, water, ice count as free; every other ingredient line must be covered or it appears in the "Missing" list.
- **`⚡ Cook right now!` filter** — shows dishes you can make with zero shopping.
- **Match % bar per dish**, sorted by how many of *your* ingredients it uses, then coverage.
- **Instant + offline** — the whole catalogue is client-side (`fridge.js`); the identical algorithm is exposed as `GET /api/fridge/?ingredients=...&max_missing=N` for API users.
- Ingredients persist in `localStorage`, so a reload keeps your fridge.

## 💬 Community features

- **Accounts** — sign up / log in from the navbar (token auth, no passwords stored
  in plain text, Django password validators enforced).
- **Server favorites** — logged-in users' ❤️ saves sync to the server; browser-side
  favorites merge into the account on first login. Anonymous visitors keep
  localStorage-only favorites as before.
- **Ratings & rankings** — 1–5 stars per dish in the 💬 Community tab; the 🏆 Top
  rated & most loved homepage section shows live Top-10 rankings by rating or
  by favorites.
- **Comments** — discussion under every dish; anyone can read, members can post,
  authors can delete their own.

## 🗄️ Rebuilding the database from zero

```bash
cd recipe_project
rm -f db.sqlite3
python manage.py migrate
python db_populated.py        # 65 base recipes + ingredients
python manage.py import_cookatlas   # 500-dish CookAtlas dataset (idempotent)
```

## 📦 Static build — `npm run build` (no backend at all)

```bash
npm run build        # = python3 build_static.py → creates dist/ (~0.9 MB)
npm run serve        # local preview at http://localhost:8000
```

`dist/` is a pure static site: **no server, no database, no Python needed in
production**. Host it anywhere free and it never sleeps:

- **Netlify Drop** — drag the `dist/` folder onto app.netlify.com/drop → live URL in seconds
- **GitHub Pages** — push `dist/` contents to a `gh-pages` branch (all paths are relative, so sub-path sites like `user.github.io/repo/` work too)
- **Cloudflare Pages / Vercel** — point them at this repo with build command `npm run build` and output directory `dist`

**Everything works — on each visitor's device.** `localdb.js` embeds a complete
backend-in-the-browser: register/login (passwords SHA-256-hashed + salted, never
stored as plaintext), favorites, 1–5 star ratings, comments, owner-only delete,
live top-rankings and the Community tab — all through the *same API interface* the
Django server exposes, answered from one localStorage key. First visit is seeded
with a few demo ratings/comments so rankings aren't empty (sentinel usernames
ChefRosa, NonnaLidia, …). New users inherit the device's unsaved favorites on
register — identical to the Django site's merge-on-login behavior.

### 🌐 Option B — fully online: GitHub Pages + Supabase (recommended)

Want real global writes — every visitor's ratings, comments and favorites shared
live — with **no server to run**? Recreate the community database in Supabase
(free): Postgres + Auth + Row Level Security do everything the Django backend
did, and the static site talks to it directly.

1. Create a free project at [supabase.com](https://supabase.com)
2. **Authentication → Providers → Email → turn OFF "Confirm email"** (accounts
   use a username; the generated emails live in the reserved
   `@cookatlas.invalid` TLD and never receive mail)
3. **SQL Editor → New query** → paste the whole contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run (creates tables, the
   signup profile trigger, and all RLS policies)
4. **Project Settings → Data API** → copy the Project URL and the **anon public** key
5. `cp static/cookatlas/cloud-config.example.js static/cookatlas/cloud-config.js`
   and paste both values in. Build (`npm run build`) ships it automatically.
6. Push `dist/` to GitHub Pages → the Pages site now has a **live shared
   community**: rankings, threads and accounts sync across every device.

### ✅ Status — LIVE: https://xvviix.github.io/cook-atlas/ (deployed 2026-09-25)

The site is deployed to GitHub Pages (`xvviix/cook-atlas`, `main` branch = site root + Pages enabled)
and passes a 22-check browser suite against the production Supabase DB: multi-device
signup/rate/comment/favorite sync, RLS forgery rejection, logout, reload persistence.
Production data was reset to pristine (empty community — first visitor owns the rankings).

Steps 1–5 above are **done and verified on the real project**: `schema.sql`
applied (4 tables, 12 RLS policies, signup trigger), email confirmation
disabled, `static/cookatlas/cloud-config.js` filled with the project URL +
anon key, and `dist/` built with it. A 22-check browser suite passed against
the live database: multi-device signup/rating/comment/favorite sync, and RLS
rejected forged-as-another-user inserts, cross-user deletes and anonymous
writes. The community starts empty — the first cook to rate takes the leaderboard.

One platform fact discovered while testing: `*.supabase.co` refuses to render
**any** HTML document from any path (storage, buckets-as-website, edge
functions, even gzip-encoded bodies are sniffed and downgraded to
`text/plain`) — an anti-phishing policy of the shared domain. So keep the
*frontend* on GitHub Pages (push `dist/`) and the *community data* on this
Supabase project. A project custom domain would lift the restriction, but
Pages is free and already wired.

Asset mirror (JS/CSS/JSON of the current build) is also served by the deployed
`cookatlas` edge function at `/functions/v1/cookatlas/<file>` if you ever need
to hot-patch assets without a git push.

**Why the public anon key is genuinely safe:** every write is judged by the
Row Level Security policies inside Postgres — *anyone may read* the community,
*only the authenticated owner* may write or delete their own rating, favorite,
or comment, and nobody can edit comments at all. A stolen anon key can do
exactly what a signed-out visitor can. The `service_role` key never appears in
frontend code; keep it in your dashboard only.

**Mode rules:** with a reachable cloud the site skips the local demo seed
completely (real data only); if the project URL is unreachable at load time the
site logs a warning and keeps running on the local vault. The publishing
command below (Option A) is only needed if you skip Supabase. Supabase
free-tier caveat: a project with **no database activity for 7 days is paused**
(one-click restore; visitor queries count as activity — a sleepy personal site
can also be kept awake by a weekly GitHub Action that GETs
`<project-url>/rest/v1/profiles?select=id&limit=1`). Accounts can't be imported
from the SQLite file (password hashes aren't transferable) — the cloud
community starts fresh; the recipe catalogue and local favorites are unaffected.

### 🔄 Option A — offline publishing: ship the PythonAnywhere community as JSON (one-way sync)

Want the GitHub Pages visitors to see *everyone's* ratings/comments/rankings,
not just their own device? Publish a snapshot:

```bash
# on PythonAnywhere (or wherever the Django app runs):
python manage.py export_community          # writes static/cookatlas/community.json
git add static/cookatlas/community.json && git commit -m "publish community"
cd recipe_website && npm run build         # dist/ now ships the snapshot
```

The static site loads `community.json` on a visitor's **first** visit (it then
lives in their local vault; `CookAtlasLocal.reset()` re-syncs to the latest
published snapshot). No GitHub token ever goes in frontend code — the file is
read-only public data (same facts any visitor can already see on the site:
usernames, stars, comments — never emails/passwords).

The one trade-off vs PythonAnywhere: data is **per browser/device** — visitors
don't see each other's posts (a real shared DB needs a server). For owners:
`CookAtlasLocal.export()` prints the whole database JSON, `import(json)` restores
it, `reset()` wipes back to seed — handy for backups. Static mode is detected via
`window.COOKATLAS_STATIC`; the Django build never loads localdb.js and behaves exactly as before (regression-tested).

The two sites can coexist: full app on PythonAnywhere + static mirror on
Netlify/Pages. Rebuild `dist/` whenever JS or template files change.

## 🐍 Hosting on PythonAnywhere (free) — recommended path

**Account note:** your PythonAnywhere account must be on the new system image
(signups after Mar 2025) so Python **3.13** is available — Django 6.1 requires
Python ≥ 3.12. Check *Account → Configure → Upgrade image* if you signed up earlier.

1. **Upload the code.** Files tab → Upload a file → this zip. Then in a Bash
   console:
   ```bash
   cd ~ && unzip CookAtlas-final.zip && rm CookAtlas-final.zip
   ```
2. **Create the virtualenv** (Bash console):
   ```bash
   mkvirtualenv cookatlas --python=/usr/bin/python3.13
   pip install -r ~/recipe_website/requirements.txt
   deactivate
   ```
3. **Collect static files:**
   ```bash
   workon cookatlas
   cd ~/recipe_website/recipe_project
   python manage.py collectstatic --noinput
   ```
4. **Configure the Web tab** → *Add a new web app* → *Manual configuration* →
   Python **3.13**, then:
   | Field | Value |
   |---|---|
   | Source code | `/home/YOU/recipe_website/recipe_project` |
   | Virtualenv | `/home/YOU/.virtualenvs/cookatlas` |
   | Static files URL ` /static/ ` | directory `/home/YOU/recipe_website/recipe_project/staticfiles` (optional — WhiteNoise already covers it) |
5. **WSGI config file.** Click the WSGI link, delete its contents, paste
   `deploy/pythonanywhere/wsgi.py` from this repo and replace
   `YOUR_USERNAME` + the secret key (generate one:
   `python3.13 -c "import secrets; print(secrets.token_urlsafe(50))"`).
   That single file also sets `DJANGO_DEBUG=0`, allowed hosts, HTTPS redirect
   and hardening — nothing else to configure.
6. **Reload the web app** → open `https://YOU.pythonanywhere.com` 🎉
   The shipped `db.sqlite3` already contains all 565 recipes and an *empty*
   community (no users) — no `migrate` needed. Log in on the site, create your
   account, done.
7. **Housekeeping (free tier):**
   - Back up your users: Files tab → download `recipe_website/recipe_project/db.sqlite3`
     before every redeploy, upload it back after (redeploying wipes nothing, but
     re-uploading the zip would overwrite the DB with the shipped empty one).
     Better: keep data out of the zip — after first deploy run
     `python manage.py import_cookatlas` only if you deleted the DB.
   - Free accounts: click *Reload* at least once every 3 months or the web app
     pauses (your data stays).
   - Toggle **Force HTTPS** in the Web tab on (pairs with the secure cookies
     this app sets).

### Updating the site later
Zip → upload → in Bash: `unzip -o CookAtlas-final.zip` →
`workon cookatlas && cd ~/recipe_website/recipe_project && python manage.py migrate && python manage.py collectstatic --noinput`
→ Reload. Your SQLite data is untouched as long as `db.sqlite3` is not overwritten
(back it up first if you re-upload the whole zip).

## 🌐 Going online (production)

1. Install + collect static files:
   ```bash
   pip install -r requirements.txt
   cd recipe_project
   python manage.py collectstatic --noinput
   ```
2. Set environment variables on the host:

   | Variable | Example | Purpose |
   |---|---|---|
   | `DJANGO_DEBUG` | `0` | **required:** disables debug mode |
   | `DJANGO_SECRET_KEY` | long random string | **required:** production secret |
   | `DJANGO_ALLOWED_HOSTS` | `myrecipes.com,www.myrecipes.com` | **required:** your domain(s) |
   | `DJANGO_PROD_HARDENING` | `1` | secure cookies + HSTS (needs HTTPS) |
   | `DJANGO_SECURE_SSL_REDIRECT` | `1` | http→https redirect (enable once HTTPS works) |

   Generate a secret key with:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(50))"
   ```
3. Run with gunicorn (2–4 workers):
   ```bash
   gunicorn recipe_project.wsgi:application --bind 0.0.0.0:8000 --workers 3
   ```
   Static files are served by WhiteNoise — no nginx needed for small/medium traffic.

4. Sanity check on the server:
   ```bash
   DJANGO_DEBUG=0 DJANGO_PROD_HARDENING=1 DJANGO_SECURE_SSL_REDIRECT=1 \
   DJANGO_SECRET_KEY='<your-key>' python manage.py check --deploy
   ```
   Expected: `System check identified no issues (0 silenced).`

## 🗂️ Project layout

```
recipe_website/
├── requirements.txt          # pinned, verified dependency set
├── README.md
├── static/
│   ├── css|js|vendor|...    # dashboard theme assets
│   └── cookatlas/            # frontend: css/js + dishes.json/countries.json fallback
├── templates/
│   ├── recipe/list.html      # dashboard table
│   └── cookatlas/index.html  # CookAtlas single-page app
└── recipe_project/           # Django project
    ├── db.sqlite3            # pre-loaded: 565 recipes, 2276 ingredients, 2585 steps…
    ├── db_populated.py       # seed: 65 base recipes (fixed, idempotent)
    ├── manage.py
    ├── staticfiles/          # collectstatic output (regenerate on deploy)
    ├── foods/                # models, DRF API, compat endpoints, import command
    └── recipe_project/       # settings / urls / wsgi
```

## 👥 Credits

- Backend (Django + DRF + dashboard): friend's project, debugged & extended
- Frontend + 500-dish dataset: CookAtlas
- **Authors:** Zilola Egamberganova — [github.com/zilolaegamberganova](https://github.com/zilolaegamberganova) · xvviix — [github.com/xvviix](https://github.com/xvviix)
- Merge, data import, hardening: this repo state

## Discoverability (SEO / answer engines / AI)

- Every recipe is pre-rendered as a real HTML page at `/recipe/<id>.html` (500 pages) with Schema.org `Recipe` + `BreadcrumbList`, canonical URLs, per-page titles/descriptions and Open Graph cards — generated by `build_static.py`.
- Home page carries `WebSite`, `Organization`, `ItemList` and `FAQPage` JSON-LD plus a visible "Quick answers" section; the whole page deep-links via `index.html#dish:<id>`.
- `/robots.txt` welcomes all crawlers **including AI engines** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended…); `/sitemap.xml` lists all 502 URLs; `/llms.txt` is the machine guide for AI assistants.
- After deploying, submit `sitemap.xml` in Google Search Console (and Bing Webmaster Tools) once to kick off indexing.

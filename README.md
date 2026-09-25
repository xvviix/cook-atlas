# CookAtlas — live static site

565 enriched world recipes + Fridge Finder + a **live global community**.

- This repo = the static frontend (GitHub Pages: https://xvviix.github.io/cook-atlas/)
- Accounts, ratings, comments, favorites, rankings = **Supabase** (Postgres + Auth + RLS),
  configured in `cloud-config.js` (public anon key only — that is the correct, safe design)
- Build: generated from the full project via `npm run build` (see the project zip for source,
  Django/PythonAnywhere fallback mode included)

Built with ❤️ by Zilola Egamberganova & xvviix

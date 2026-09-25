/* CookAtlas Cloud — live community backend via Supabase (Postgres + Auth + RLS).
   Same routes and JSON shapes as the Django server / localdb.js, but the data
   lives in ONE shared database, so ratings, comments, favorites and rankings
   are global across every device — the static GitHub Pages site is fully online.

   Why this is safe with only a PUBLIC key: every write is checked by Row
   Level Security inside Postgres (supabase/schema.sql) — the server rejects
   anyone inserting/updating/deleting rows that don't belong to their own
   signed-in identity. Anonymous visitors can read everything, write nothing.

   Activated only when cloud-config.js defines window.COOKATLAS_CLOUD before
   this script; otherwise it loads as a no-op and localdb.js answers the API. */
(function () {
  'use strict';
  const cfg = window.COOKATLAS_CLOUD;
  const usable = cfg && typeof cfg.url === 'string' && /supabase|https?:\/\//.test(cfg.url) &&
                 typeof cfg.anonKey === 'string' && cfg.anonKey.length > 40 && cfg.enabled !== false;
  if (!usable) { return; } // stays a no-op; localdb mode takes over

  const BASE = String(cfg.url).replace(/\/+$/, '');
  const SKEY = 'cookatlas_cloud_session_v1';
  const TIMEOUT = 12000;

  let session = null; // {access_token, refresh_token, exp, uid, username}
  try { session = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { session = null; }
  if (session && !session.access_token) session = null;

  const persist = () => {
    try {
      if (session) localStorage.setItem(SKEY, JSON.stringify(session));
      else localStorage.removeItem(SKEY);
    } catch (e) {}
  };

  /* ---------- username → synthetic email (gotrue requires an email; nobody can
     ever receive mail at the RFC-6761 reserved .invalid TLD) ---------- */
  function emailFor(username) {
    let h = 0x811c9dc5;
    for (let i = 0; i < username.length; i++) { h ^= username.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'cook';
    return slug + '-' + h.toString(16) + '@cookatlas.invalid';
  }

  function jwtExp(tok) {
    try {
      const payload = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp ? payload.exp * 1000 : Date.now() + 3600e3;
    } catch (e) { return Date.now() + 3600e3; }
  }

  /* ---------- transport: one fetch helper for /auth/v1 and /rest/v1 ---------- */
  async function call(method, path, opts) {
    opts = opts || {};
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const headers = { 'apikey': cfg.anonKey, 'Accept': 'application/json' };
      if (session && session.access_token) headers['Authorization'] = 'Bearer ' + session.access_token;
      if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
      if (opts.prefer) headers['Prefer'] = opts.prefer;
      const url = BASE + path + (opts.q ? '?' + opts.q : '');
      const res = await fetch(url, {
        method, headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal
      });
      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch (e) { data = { message: text.slice(0, 200) }; } }
      return { status: res.status, data: data };
    } finally { clearTimeout(timer); }
  }
  const rest = (m, table, q, body, prefer) => call(m, '/rest/v1/' + table, { q, body, prefer });
  const auth = (m, path, body) => call(m, path, { body });

  const json = (status, data) => ({ status, ok: status >= 200 && status < 400, async json() { return data; } });

  /* ---------- session lifecycle ---------- */
  function adoptSession(r) {
    const u = (r && r.user) || {};
    session = r && r.access_token ? {
      access_token: r.access_token,
      refresh_token: r.refresh_token || '',
      exp: jwtExp(r.access_token),
      uid: u.id || '',
      username: (u.user_metadata && u.user_metadata.username) || ''
    } : null;
    persist();
    return !!session;
  }
  async function ensureFresh() {
    if (!session || !session.refresh_token) return;
    if (session.exp - Date.now() > 5 * 60e3) return; // still plenty valid
    const r = await auth('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    if (r.status === 200) { const old = session.username; adoptSession(r.data); if (old) session.username = old, persist(); }
    else { session = null; persist(); } // refresh failed → force re-login
  }

  /* ---------- catalogue + validators (identical rules to localdb.js) ---------- */
  const dishes = () => (typeof DISHES !== 'undefined' ? DISHES : []);
  const dishById = id => dishes().find(d => d.id === id);
  const validExtId = id => typeof id === 'string' && id.length > 0 && id.length <= 64;
  const num = (v, d, lo, hi) => { v = parseInt(v, 10); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); };
  const qsOf = qs => new URLSearchParams(qs || '');
  const enc = encodeURIComponent;

  async function profileNames() { // public data: uuid → username map
    const r = await rest('GET', 'profiles', 'select=id,username&limit=2000');
    const map = {};
    if (r.status === 200 && Array.isArray(r.data)) r.data.forEach(p => { map[p.id] = p.username; });
    return map;
  }

  const needSession = () => session && session.access_token ? null : json(401, { detail: 'Authentication credentials were not provided.' });

  /* ---------- the API (same surface as the Django server) ---------- */
  async function handle(path, opts) {
    opts = opts || {};
    const method = (opts.method || 'GET').toUpperCase();
    let body = {};
    try { body = opts.body ? JSON.parse(opts.body) : {}; } catch (e) {}
    await ensureFresh();
    const [route, qs] = path.split('?');
    const q = qsOf(qs);

    /* --- auth --- */
    if (route === '/api/auth/register/' && method === 'POST') {
      const u = String(body.username || '').trim();
      if (!/^[A-Za-z0-9_@.+-]{3,30}$/.test(u)) return json(400, { username: ['3-30 chars: letters, numbers, @ . + - _ only.'] });
      const pw = String(body.password || '');
      if (pw.length < 8) return json(400, { password: ['This password is too short — 8 characters minimum.'] });
      if (new TextEncoder().encode(pw).length > 72) return json(400, { password: ['Password too long (72 bytes max).'] });
      const clash = await rest('GET', 'profiles', 'select=id&username=eq.' + enc(JSON.stringify(u).slice(1, -1)) + '&limit=1');
      if (clash.status === 200 && Array.isArray(clash.data) && clash.data.length)
        return json(400, { username: ['A user with that username already exists.'] });
      const r = await auth('POST', '/auth/v1/signup', { email: emailFor(u), password: pw, data: { username: u } });
      if (r.status !== 200 || !adoptSession(r.data)) {
        const why = (r.data && (r.data.error_description || r.data.msg || r.data.error)) || '';
        if (/already registered/i.test(why)) return json(400, { username: ['A user with that username already exists.'] });
        return json(400, { detail: why ? ('Sign-up failed: ' + why)
          : '⚠️ Supabase still requires email confirmation — disable “Confirm email” under Authentication → Providers → Email, then retry.' });
      }
      session.username = u; persist();
      return json(201, { token: 'cloud', username: u });
    }
    if (route === '/api/auth/login/' && method === 'POST') {
      const u = String(body.username || '').trim();
      const r = await auth('POST', '/auth/v1/token?grant_type=password', { email: emailFor(u), password: String(body.password || '') });
      if (r.status !== 200 || !adoptSession(r.data))
        return json(400, { detail: 'No matching username/password. Accounts live in the shared cloud database — register first if this is your first visit.' });
      session.username = u; persist();
      return json(200, { token: 'cloud', username: u });
    }
    if (route === '/api/auth/logout/' && method === 'POST') {
      await auth('POST', '/auth/v1/logout').catch(() => {});
      session = null; persist();
      return json(200, { detail: 'Logged out' });
    }
    if (route === '/api/auth/me/') {
      const e = needSession(); if (e) return e;
      const [fav, rat] = await Promise.all([
        rest('GET', 'favorites', 'select=external_id&user_id=eq.' + session.uid + '&limit=5000'),
        rest('GET', 'ratings', 'select=external_id,value&user_id=eq.' + session.uid + '&limit=5000')
      ]);
      const ratings = {};
      if (rat.status === 200 && Array.isArray(rat.data)) rat.data.forEach(x => { ratings[x.external_id] = x.value; });
      if (!session.username) {
        const p = await rest('GET', 'profiles', 'select=username&id=eq.' + session.uid + '&limit=1');
        if (p.status === 200 && p.data && p.data[0]) session.username = p.data[0].username, persist();
      }
      return json(200, {
        username: session.username || 'cook', email: '',
        favorites: fav.status === 200 && Array.isArray(fav.data) ? fav.data.map(x => x.external_id) : [],
        ratings
      });
    }

    /* --- favorites --- */
    if (route === '/api/favorites/toggle/' && method === 'POST') {
      const e = needSession(); if (e) return e;
      const id = body.external_id;
      if (!validExtId(id)) return json(400, { external_id: ['Invalid dish id.'] });
      if (!dishById(id)) return json(404, { detail: 'Dish not found in catalogue.' });
      const mine = await rest('GET', 'favorites', 'select=external_id&user_id=eq.' + session.uid + '&external_id=eq.' + enc(id));
      const have = mine.status === 200 && Array.isArray(mine.data) && mine.data.length > 0;
      let w;
      if (have) w = await rest('DELETE', 'favorites', 'user_id=eq.' + session.uid + '&external_id=eq.' + enc(id));
      else w = await rest('POST', 'favorites', null, [{ user_id: session.uid, external_id: id }], 'return=minimal');
      if (w.status >= 400) return json(w.status, { detail: 'Could not sync favorite.' });
      const cnt = await rest('GET', 'favorites', 'select=external_id&external_id=eq.' + enc(id) + '&limit=5000');
      return json(have ? 200 : 201, { favorited: !have, favorites_count: Array.isArray(cnt.data) ? cnt.data.length : 0 });
    }
    if (route === '/api/favorites/sync/' && method === 'POST') {
      const e = needSession(); if (e) return e;
      if (!Array.isArray(body.external_ids)) return json(400, { external_ids: ['Expected a list of dish ids.'] });
      const mine = await rest('GET', 'favorites', 'select=external_id&user_id=eq.' + session.uid + '&limit=5000');
      const have = new Set((mine.data || []).map(x => x.external_id));
      const missing = [...new Set(body.external_ids.filter(id => validExtId(id) && dishById(id) && !have.has(id)))];
      if (missing.length) {
        const ins = await rest('POST', 'favorites', null, missing.map(id => ({ user_id: session.uid, external_id: id })), 'return=minimal,resolution=ignore-duplicates');
        if (ins.status >= 400) return json(ins.status, { detail: 'Favorite merge failed.' });
      }
      return json(200, { merged: missing.length, total: have.size + missing.length });
    }

    /* --- ratings --- */
    if (route === '/api/ratings/rate/' && method === 'POST') {
      const e = needSession(); if (e) return e;
      const id = body.external_id;
      if (!validExtId(id) || !dishById(id)) return json(400, { external_id: ['Invalid dish id.'] });
      const v = body.value;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5) return json(400, { value: ['Rating must be an integer 1-5.'] });
      const w = await rest('POST', 'ratings', null, [{ user_id: session.uid, external_id: id, value: v, updated_at: new Date().toISOString() }],
                           'return=minimal,resolution=merge-duplicates');
      if (w.status >= 400) return json(w.status, { detail: 'Could not save rating (server rejected it).' });
      const all = await rest('GET', 'ratings', 'select=value&external_id=eq.' + enc(id) + '&limit=10000');
      const vals = Array.isArray(all.data) ? all.data.map(x => x.value) : [];
      const avg = vals.length ? Math.round(vals.reduce((a, x) => a + x, 0) / vals.length * 10) / 10 : null;
      return json(200, { value: v, avg: avg, votes: vals.length });
    }
    if (route === '/api/ratings/top/') {
      const by = q.get('by') === 'favorites' ? 'favorites' : 'rating';
      const limit = num(q.get('limit'), 10, 1, 50);
      const minVotes = num(q.get('min_votes'), 0, 0, 1000);
      let rows = [];
      if (by === 'rating') {
        const all = await rest('GET', 'ratings', 'select=external_id,value&limit=10000');
        const agg = {};
        (Array.isArray(all.data) ? all.data : []).forEach(r => { (agg[r.external_id] || (agg[r.external_id] = [])).push(r.value); });
        for (const id in agg) {
          const vals = agg[id];
          const avg = Math.round(vals.reduce((a, x) => a + x, 0) / vals.length * 10) / 10;
          if (vals.length < minVotes) continue;
          const d = dishById(id);
          rows.push({ external_id: id, name: d ? d.title : id, cuisine: d ? d.cuisine : '', avg: avg, votes: vals.length });
        }
        rows.sort((a, b) => b.avg - a.avg || b.votes - a.votes || a.name.localeCompare(b.name));
      } else {
        const all = await rest('GET', 'favorites', 'select=external_id&limit=10000');
        const counts = {};
        (Array.isArray(all.data) ? all.data : []).forEach(r => { counts[r.external_id] = (counts[r.external_id] || 0) + 1; });
        for (const id in counts) {
          const d = dishById(id);
          rows.push({ external_id: id, name: d ? d.title : id, cuisine: d ? d.cuisine : '', favorites: counts[id] });
        }
        rows.sort((a, b) => b.favorites - a.favorites || a.name.localeCompare(b.name));
      }
      rows = rows.slice(0, limit).map((r, i) => { r.rank = i + 1; return r; });
      return json(200, { count: rows.length, results: rows });
    }

    /* --- comments --- */
    if (route === '/api/comments/' && method === 'GET') {
      const extId = q.get('external_id');
      if (!extId) return json(400, { external_id: ['Required: ?external_id=dish-id.'] });
      if (!dishById(extId)) return json(404, { detail: 'Dish not found.' });
      const limit = num(q.get('limit'), 20, 1, 100);
      const [rows, names] = await Promise.all([
        rest('GET', 'comments', 'select=id,user_id,body,created_at&external_id=eq.' + enc(extId) + '&order=id.desc&limit=' + limit),
        profileNames()
      ]);
      const list = (Array.isArray(rows.data) ? rows.data : []).map(c => ({
        id: c.id, user: names[c.user_id] || 'cook', text: c.body, created_at: c.created_at, recipe: 0
      }));
      return json(200, { count: list.length, results: list });
    }
    if (route === '/api/comments/' && method === 'POST') {
      const e = needSession(); if (e) return e;
      const id = body.external_id, text = String(body.text || '').trim();
      if (!validExtId(id) || !dishById(id)) return json(400, { external_id: ['Invalid dish id.'] });
      if (!text || text.length > 2000) return json(400, { text: ['Comment must be 1-2000 characters.'] });
      const w = await rest('POST', 'comments', 'select=id,created_at',
        [{ external_id: id, user_id: session.uid, body: text }], 'return=representation');
      if (w.status >= 400) return json(w.status, { detail: 'Could not post comment (server rejected it).' });
      const c = (w.data && w.data[0]) || {};
      return json(201, { id: c.id, user: session.username || 'cook', text: text, created_at: c.created_at || new Date().toISOString(), recipe: 0 });
    }
    const delM = /^\/api\/comments\/(\d+)\/$/.exec(route);
    if (delM && method === 'DELETE') {
      const e = needSession(); if (e) return e;
      const cid = parseInt(delM[1], 10);
      const found = await rest('GET', 'comments', 'select=id,user_id&id=eq.' + cid + '&limit=1');
      const row = Array.isArray(found.data) ? found.data[0] : null;
      if (!row) return json(404, { detail: 'Comment not found.' });
      if (row.user_id !== session.uid) return json(403, { detail: 'You may only delete your own comments.' });
      const w = await rest('DELETE', 'comments', 'id=eq.' + cid);
      if (w.status >= 400) return json(w.status, { detail: 'Could not delete comment.' });
      return json(204, {});
    }

    /* --- per-dish community payload (modal tab) --- */
    const byExt = /^\/api\/recipes\/by-external\/([^/]+)\/$/.exec(route);
    if (byExt) {
      const id = decodeURIComponent(byExt[1]);
      const d = dishById(id);
      if (!d) return json(404, { detail: 'Not found.' });
      const [rats, favsR, comR, mineR] = await Promise.all([
        rest('GET', 'ratings', 'select=value&external_id=eq.' + enc(id) + '&limit=10000'),
        rest('GET', 'favorites', 'select=external_id&external_id=eq.' + enc(id) + '&limit=10000'),
        rest('GET', 'comments', 'select=id&external_id=eq.' + enc(id) + '&limit=1000'),
        session ? rest('GET', 'ratings', 'select=value&external_id=eq.' + enc(id) + '&user_id=eq.' + session.uid + '&limit=1') : Promise.resolve(null)
      ]);
      const vals = Array.isArray(rats.data) ? rats.data.map(x => x.value) : [];
      const avg = vals.length ? Math.round(vals.reduce((a, x) => a + x, 0) / vals.length * 10) / 10 : null;
      return json(200, {
        id: 0, external_id: d.id, name: d.title, cuisine: d.cuisine, about: d.about,
        avg_rating: avg, rating_count: vals.length,
        favorites_count: Array.isArray(favsR.data) ? favsR.data.length : 0,
        comments_count: Array.isArray(comR.data) ? comR.data.length : 0,
        my_rating: mineR && Array.isArray(mineR.data) && mineR.data.length ? mineR.data[0].value : null,
        ingredients: d.ingredients, steps: d.steps.map(t => ({ text: t })),
        tips: d.tips.map(t => ({ text: t })), sources: d.sources
      });
    }

    return json(404, { detail: 'Not found in cloud API: ' + route });
  }

  /* ---------- boot: wait for the catalogue, then prove the cloud is real ---------- */
  window.COOKATLAS_CLOUD_READY = (async () => {
    let tries = 0;
    await new Promise(res => {
      const iv = setInterval(() => {
        tries++;
        if ((typeof DISHES !== 'undefined' && DISHES.length) || tries > 80) { clearInterval(iv); res(); }
      }, 100);
    });
    try {
      await ensureFresh();
      const probe = await rest('GET', 'profiles', 'select=id&limit=1');
      if (probe.status !== 200) return false; // reachable but wrong (bad keys?) → stay local
      window.COOKATLAS_CLOUD_MODE = true;
      try { document.body.classList.add('cloud-mode'); } catch (e) {}
      if (typeof console !== 'undefined') console.info('🌐 CookAtlas: live Supabase community enabled');
      return true;
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('CookAtlas cloud unreachable — falling back to the local vault.', e);
      return false;
    }
  })();

  window.CookAtlasCloud = { api: handle, active: () => !!window.COOKATLAS_CLOUD_MODE };
})();

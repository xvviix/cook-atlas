/* CookAtlas Local DB — a complete backend-in-the-browser for the static build.
   Speaks the exact same API as the Django server (same routes, same JSON,
   same validation), but stores everything in localStorage under ONE key, so
   accounts, favorites, ratings, comments and rankings all work with zero
   hosting. Data lives on this device — that is the trade-off, and it is the
   same place your local favorites already lived, just for everything. */
(function () {
  'use strict';
  const DBKEY = 'cookatlas_local_db_v1';
  const SEEDKEY = 'cookatlas_local_seed_v1';

  let db = null;
  try { db = JSON.parse(localStorage.getItem(DBKEY)); } catch (e) {}
  if (!db || !db.users) {
    db = { users: {}, tokens: {}, favorites: {}, ratings: {}, comments: [], nextCommentId: 1 };
  }
  const save = () => { try { localStorage.setItem(DBKEY, JSON.stringify(db)); } catch (e) {} };

  /* ---------- crypto helpers (SHA-256 when available, strong-else fallback) ---------- */
  function rndHex(bytes) {
    const a = new Uint8Array(bytes);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (let i = 0; i < bytes; i++) a[i] = Math.random() * 256 | 0;
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }
  async function hashPw(pw, salt) {
    const msg = salt + '\u0000' + pw;
    if (window.crypto && crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
        return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* http non-secure context: fall through */ }
    }
    let a = 0x9e3779b9, b = 0x243f6a88;
    for (let i = 0; i < msg.length; i++) {
      const c = msg.charCodeAt(i);
      a = (Math.imul(a ^ c, 2654435761)) >>> 0;
      b = (Math.imul(b + c + a, 1597334677)) >>> 0;
    }
    return ('00000000' + a.toString(16)).slice(-8) + ('00000000' + b.toString(16)).slice(-8);
  }

  /* ---------- catalogue helpers ---------- */
  const dishes = () => (typeof DISHES !== 'undefined' ? DISHES : []);
  const dishById = id => dishes().find(d => d.id === id);
  const validExtId = id => typeof id === 'string' && id.length > 0 && id.length <= 64;
  const num = (v, d, lo, hi) => { v = parseInt(v, 10); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); };

  function userFrom(req) {
    const auth = (req.headers && req.headers.Authorization) || '';
    const m = /^Token\s+([a-f0-9]+)$/i.exec(auth);
    return m ? db.tokens[m[1]] || null : null;
  }

  /* ---------- aggregate helpers ---------- */
  function ratingStats(extId) {
    const r = db.ratings[extId] || {};
    const vals = Object.values(r);
    if (!vals.length) return { avg: null, votes: 0 };
    return { avg: Math.round(vals.reduce((a, v) => a + v, 0) / vals.length * 10) / 10, votes: vals.length };
  }
  const favCount = extId => Object.values(db.favorites).reduce((n, list) => n + (list.indexOf(extId) >= 0 ? 1 : 0), 0);
  const commentCount = extId => db.comments.filter(c => c.external_id === extId).length;

  /* ---------- the API ---------- */
  async function handle(path, opts) {
    const method = (opts.method || 'GET').toUpperCase();
    let body = {};
    try { body = opts.body ? JSON.parse(opts.body) : {}; } catch (e) {}
    const user = userFrom(opts);
    const [route, qs] = path.split('?');
    const q = new URLSearchParams(qs || '');
    const json = (status, data) => ({ status, ok: status >= 200 && status < 400, async json() { return data; } });
    const seg = route.split('/').filter(Boolean); // ['api','auth','login'] etc
    const needAuth = () => user ? null : json(401, { detail: 'Authentication credentials were not provided.' });

    /* --- auth --- */
    if (route === '/api/auth/register/' && method === 'POST') {
      const u = String(body.username || '').trim();
      if (!/^[A-Za-z0-9_@.+-]{3,30}$/.test(u)) return json(400, { username: ['3-30 chars: letters, numbers, @ . + - _ only.'] });
      if (db.users[u]) return json(400, { username: ['A user with that username already exists.'] });
      const pw = String(body.password || '');
      if (pw.length < 8) return json(400, { password: ['This password is too short — 8 characters minimum.'] });
      const salt = rndHex(8);
      db.users[u] = { salt: salt, hash: await hashPw(pw, salt), email: String(body.email || '').slice(0, 254), joined: new Date().toISOString() };
      const token = rndHex(20);
      db.tokens[token] = u;
      save();
      return json(201, { token, username: u });
    }
    if (route === '/api/auth/login/' && method === 'POST') {
      const u = String(body.username || '').trim(), prof = db.users[u];
      if (!prof || prof.hash !== await hashPw(String(body.password || ''), prof.salt))
        return json(400, { detail: 'No matching username/password. Try again (demo data lives only on this device).' });
      const token = rndHex(20);
      db.tokens[token] = u;
      save();
      return json(200, { token, username: u });
    }
    if (route === '/api/auth/logout/' && method === 'POST') {
      const auth = ((opts.headers && opts.headers.Authorization) || '').replace(/^Token\s+/i, '');
      delete db.tokens[auth];
      save();
      return json(200, { detail: 'Logged out' });
    }
    if (route === '/api/auth/me/') {
      const e = needAuth(); if (e) return e;
      const ratings = {};
      for (const extId in db.ratings) if (db.ratings[extId][user] !== undefined) ratings[extId] = db.ratings[extId][user];
      return json(200, { username: user, email: db.users[user].email, favorites: db.favorites[user] || [], ratings });
    }

    /* --- favorites --- */
    if (route === '/api/favorites/' ) {
      const e = needAuth(); if (e) return e;
      return json(200, { results: (db.favorites[user] || []).map(id => ({ external_id: id })) });
    }
    if (route === '/api/favorites/toggle/' && method === 'POST') {
      const e = needAuth(); if (e) return e;
      const id = body.external_id;
      if (!validExtId(id)) return json(400, { external_id: ['Invalid dish id.'] });
      if (!dishById(id)) return json(404, { detail: 'Dish not found in catalogue.' });
      const list = db.favorites[user] || (db.favorites[user] = []);
      const at = list.indexOf(id);
      const favorited = at < 0;
      if (favorited) list.push(id); else list.splice(at, 1);
      save();
      return json(favorited ? 201 : 200, { favorited, favorites_count: favCount(id) });
    }
    if (route === '/api/favorites/sync/' && method === 'POST') {
      const e = needAuth(); if (e) return e;
      if (!Array.isArray(body.external_ids)) return json(400, { external_ids: ['Expected a list of dish ids.'] });
      const list = db.favorites[user] || (db.favorites[user] = []);
      let merged = 0;
      body.external_ids.forEach(id => {
        if (typeof id === 'string' && dishById(id) && list.indexOf(id) < 0) { list.push(id); merged++; }
      });
      save();
      return json(200, { merged, total: list.length });
    }

    /* --- ratings --- */
    if (route === '/api/ratings/rate/' && method === 'POST') {
      const e = needAuth(); if (e) return e;
      const id = body.external_id;
      if (!validExtId(id) || !dishById(id)) return json(400, { external_id: ['Invalid dish id.'] });
      const v = body.value;
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 5)
        return json(400, { value: ['Rating must be an integer 1-5.'] });
      (db.ratings[id] || (db.ratings[id] = {}))[user] = v;
      save();
      const st = ratingStats(id);
      return json(200, { value: v, avg: st.avg, votes: st.votes });
    }
    if (route === '/api/ratings/top/') {
      const by = q.get('by') === 'favorites' ? 'favorites' : 'rating';
      const limit = num(q.get('limit'), 10, 1, 50);
      const minVotes = num(q.get('min_votes'), 0, 0, 1000);
      let rows = [];
      if (by === 'rating') {
        for (const id in db.ratings) {
          const st = ratingStats(id);
          if (st.votes < minVotes) continue;
          const d = dishById(id);
          rows.push({ external_id: id, name: d ? d.title : id, cuisine: d ? d.cuisine : '', avg: st.avg, votes: st.votes });
        }
        rows.sort((a, b) => b.avg - a.avg || b.votes - a.votes || a.name.localeCompare(b.name));
      } else {
        const counts = {};
        for (const u in db.favorites) db.favorites[u].forEach(id => { counts[id] = (counts[id] || 0) + 1; });
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
      const rows = db.comments.filter(c => c.external_id === extId).slice(-limit).reverse()
        .map(c => ({ id: c.id, user: c.user, text: c.text, created_at: c.created_at, recipe: 0 }));
      return json(200, { count: rows.length, results: rows });
    }
    if (route === '/api/comments/' && method === 'POST') {
      const e = needAuth(); if (e) return e;
      const id = body.external_id, text = String(body.text || '').trim();
      if (!validExtId(id) || !dishById(id)) return json(400, { external_id: ['Invalid dish id.'] });
      if (!text || text.length > 2000) return json(400, { text: ['Comment must be 1-2000 characters.'] });
      const c = { id: db.nextCommentId++, user: user, text, external_id: id, created_at: new Date().toISOString() };
      db.comments.push(c);
      save();
      return json(201, { id: c.id, user: c.user, text: c.text, created_at: c.created_at, recipe: 0 });
    }
    const delM = /^\/api\/comments\/(\d+)\/$/.exec(route);
    if (delM && method === 'DELETE') {
      const e = needAuth(); if (e) return e;
      const cid = parseInt(delM[1], 10);
      const at = db.comments.findIndex(c => c.id === cid);
      if (at < 0) return json(404, { detail: 'Comment not found.' });
      if (db.comments[at].user !== user) return json(403, { detail: 'You may only delete your own comments.' });
      db.comments.splice(at, 1);
      save();
      return json(204, {});
    }

    /* --- per-dish community payload (modal tab) --- */
    const byExt = /^\/api\/recipes\/by-external\/([^/]+)\/$/.exec(route);
    if (byExt) {
      const id = decodeURIComponent(byExt[1]);
      const d = dishById(id);
      if (!d) return json(404, { detail: 'Not found.' });
      const st = ratingStats(id);
      return json(200, {
        id: 0, external_id: d.id, name: d.title, cuisine: d.cuisine, about: d.about,
        avg_rating: st.avg, rating_count: st.votes,
        favorites_count: favCount(id), comments_count: commentCount(id),
        my_rating: user && db.ratings[id] ? (db.ratings[id][user] || null) : null,
        ingredients: d.ingredients, steps: d.steps.map(t => ({ text: t })),
        tips: d.tips.map(t => ({ text: t })), sources: d.sources
      });
    }

    return json(404, { detail: 'Not found in local API: ' + route });
  }

  /* ---------- published snapshot (community.json committed in the repo) ---------- */
  async function fetchSnapshot() {
    try {
      const res = await fetch('./community.json', {cache: 'no-store'});
      if (!res.ok) return null;
      const data = await res.json();
      return (data && data.ratings && data.comments) ? data : null;
    } catch (e) { return null; } // no snapshot (or file:// preview) → local-only
  }
  function seedFromSnapshot(snap) {
    let n = 0;
    (snap.users || []).forEach(u => { if (!db.users[u]) db.users[u] = {salt: '!', hash: '!', snapshot: 1}; });
    for (const id in snap.ratings) (db.ratings[id] || (db.ratings[id] = {}), Object.assign(db.ratings[id], snap.ratings[id]), n++);
    for (const u in snap.favorites) { db.favorites[u] = (snap.favorites[u] || []).filter(validExtId); n++; }
    const maxId = db.comments.reduce((m, c) => Math.max(m, c.id), 0);
    (snap.comments || []).forEach(c => {
      if (validExtId(c.external_id) && c.text && c.user && c.id > maxId) {
        db.comments.push({id: c.id, user: String(c.user).slice(0, 40), text: String(c.text).slice(0, 2000),
                          external_id: c.external_id, created_at: c.created_at || new Date().toISOString()});
        n++;
      }
    });
    db.nextCommentId = Math.max(db.nextCommentId, ...db.comments.map(c => c.id + 1), 1);
    save();
    return n;
  }

  /* ---------- demo seed so the community feels alive on first visit ---------- */
  function seedOnce() {
    try { if (localStorage.getItem(SEEDKEY) || !dishes().length) return; } catch (e) { return; }
    const pick = (i) => dishes()[i];
    const demo = [ // [dishIndex, user, stars]
      [0, 'ChefRosa', 5], [0, 'NonnaLidia', 4], [0, 'UmamiUtah', 5],
      [5, 'PlovKing', 4], [7, 'SpiceTrader', 5], [12, 'ChefRosa', 3],
      [21, 'NonnaLidia', 4], [25, 'UmamiUtah', 2], [31, 'PlovKing', 5], [31, 'SpiceTrader', 4],
    ];
    demo.forEach(([di, who, v]) => {
      const d = pick(di); if (!d) return;
      (db.ratings[d.id] || (db.ratings[d.id] = {}))[who] = v;
    });
    const favs = { ChefRosa: [pick(0) && pick(0).id], PlovKing: [pick(31) && pick(31).id, pick(0) && pick(0).id] };
    for (const u in favs) db.favorites[u] = favs[u].filter(Boolean);
    const now = Date.now();
    [[0, 'ChefRosa', 'Made this for my family — the dough needs a hotter oven than the tip suggests! (demo comment)'],
     [0, 'NonnaLidia', 'San Marzano only. Everything else is a compromise 🙂 (demo comment)'],
     [31, 'PlovKing', 'Weeknight plov with the rice you already have. Trust me. (demo comment)']]
      .forEach(([di, who, text]) => {
        const d = pick(di); if (!d) return;
        db.comments.push({ id: db.nextCommentId++, user: who, text, external_id: d.id,
                           created_at: new Date(now - 86400000 * (2 + di % 5)).toISOString() });
      });
    save();
    try { localStorage.setItem(SEEDKEY, '1'); } catch (e) {}
  }

  window.COOKATLAS_DB_READY = (async () => {
    let tries = 0;
    await new Promise(res => {
      const iv = setInterval(() => {
        tries++;
        if ((typeof DISHES !== 'undefined' && DISHES.length) || tries > 80) { clearInterval(iv); res(); }
      }, 100);
    });
    try {
      if (window.COOKATLAS_CLOUD) return; // live Supabase configured — no local demo/snapshot seeding
      const fresh = !localStorage.getItem(SEEDKEY);
      const snap = await fetchSnapshot();
      if (snap && fresh) {                          // real published community wins
        seedFromSnapshot(snap);
        try { localStorage.setItem(SEEDKEY, '1'); } catch (e) {}
      }
      else if (!snap) { seedOnce(); }                  // demo seed for first visit without snapshot
    } catch (e) {}
  })();

  /* public tools for the brave: export / import / wipe the local database */
  window.CookAtlasLocal = {
    api: handle,
    export: () => JSON.stringify(db, null, 2),
    import: (text) => { try { const d = JSON.parse(text); if (d && d.users) { db = d; save(); return true; } } catch (e) {} return false; },
    reset: () => { try { localStorage.removeItem(DBKEY); localStorage.removeItem(SEEDKEY); } catch (e) {} location.reload(); }
  };
})();

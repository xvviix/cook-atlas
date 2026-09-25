/* CookAtlas community — accounts, server favorites, ratings, comments, rankings.
   Loaded AFTER enhance.js. Wraps openModal/cardEl, overrides switchTab. */

/* ---------- state ---------- */
let commToken = null, commUser = null;
let commServerFavs = new Set(), commMyRatings = {};
let commTopBy = 'rating';
let commCurrent = null; // {extId, detail, comments, count, loading, error}
const COMM_STATIC = !!window.COOKATLAS_STATIC; // built by build_static.py — no backend available
try {
  commToken = localStorage.getItem('cookatlas_token') || null;
  commUser = localStorage.getItem('cookatlas_user') || null;
} catch (e) {}

/* ---------- api helper ---------- */
async function commFetch(path, opts) {
  opts = opts || {};
  if (COMM_STATIC) { // static build: answered by Supabase (live) or localdb.js (local vault)
    await window.COOKATLAS_DB_READY;
    if (window.COOKATLAS_CLOUD_MODE) {
      await window.COOKATLAS_CLOUD_READY;
      return window.CookAtlasCloud.api(path, {method: opts.method, body: opts.body});
    }
    const authHeaders = Object.assign({}, opts.headers);
    if (commToken) authHeaders['Authorization'] = 'Token ' + commToken;
    return window.CookAtlasLocal.api(path, {method: opts.method, body: opts.body, headers: authHeaders});
  }
  const headers = {'Content-Type': 'application/json'};
  if (commToken) headers['Authorization'] = 'Token ' + commToken;
  const res = await fetch(path, {method: opts.method || 'GET', headers: headers, body: opts.body});
  if (res.status === 401 && commToken) commLogout(true);
  return res;
}
async function commJson(path, opts) {
  const res = await commFetch(path, opts);
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) { const err = new Error('request failed'); err.status = res.status; err.data = data; throw err; }
  return data;
}
function commErrMsg(err, fallback) {
  const d = (err && err.data) || {};
  const keys = ['detail', 'detail', 'username', 'password', 'email', 'text', 'value'];
  for (const k of keys) { if (d[k]) return Array.isArray(d[k]) ? d[k][0] : d[k]; }
  return fallback;
}

/* ---------- auth ---------- */
function commUpdateAuthUI() {
  const logged = !!commToken;
  $('authBtn').hidden = logged;
  $('userChip').hidden = !logged;
  if (logged) $('userName').textContent = commUser || '';
}
function commOpenAuth(mode) {
  $('authBackdrop').hidden = false;
  document.body.style.overflow = 'hidden';
  commAuthTab(mode === 'register' ? 'register' : 'login');
}
function commCloseAuth() {
  $('authBackdrop').hidden = true;
  if ($('modalBackdrop').hidden) document.body.style.overflow = '';
}
function commAuthTab(which) {
  const login = which !== 'register';
  $('tabLoginBtn').classList.toggle('on', login);
  $('tabRegisterBtn').classList.toggle('on', !login);
  $('loginForm').hidden = !login;
  $('registerForm').hidden = login;
  $('loginErr').hidden = true;
  $('regErr').hidden = true;
}
async function commAfterLogin(token, username, pushLocal) {
  commToken = token;
  commUser = username;
  try {
    localStorage.setItem('cookatlas_token', token);
    localStorage.setItem('cookatlas_user', username);
  } catch (e) {}
  if (pushLocal && favs.size) {
    try {
      await commJson('/api/favorites/sync/', {method: 'POST', body: JSON.stringify({external_ids: [...favs]})});
    } catch (e) { /* merge failed; local list stays */ }
  }
  await commRefreshMe();
  commCloseAuth();
  toast('👋 Welcome, ' + username + '!');
}
async function commRefreshMe() {
  try {
    const me = await commJson('/api/auth/me/');
    commServerFavs = new Set((me.favorites || []).filter(id => id.indexOf('recipe:') !== 0));
    commMyRatings = me.ratings || {};
    favs = new Set(commServerFavs);
    saveFavs();
    if (typeof DISHES !== 'undefined' && DISHES.length) renderDishes();
    if (!$('modalBackdrop').hidden) updateFavBtn();
  } catch (e) { /* offline: keep local state */ }
  commUpdateAuthUI();
}
function commLogout(silent) {
  if (commToken && !silent) commFetch('/api/auth/logout/', {method: 'POST'}).catch(() => {});
  commToken = null;
  commUser = null;
  commServerFavs = new Set();
  commMyRatings = {};
  try {
    localStorage.removeItem('cookatlas_token');
    localStorage.removeItem('cookatlas_user');
  } catch (e) {}
  commUpdateAuthUI();
  if (!$('modalBackdrop').hidden && modalId) commLoadDish(modalId);
  if (!silent) toast('Logged out');
}
async function commDoLogin(e) {
  e.preventDefault();
  const errBox = $('loginErr');
  errBox.hidden = true;
  try {
    const r = await commJson('/api/auth/login/', {method: 'POST', body: JSON.stringify({
      username: $('loginUser').value.trim(), password: $('loginPass').value})});
    $('loginPass').value = '';
    await commAfterLogin(r.token, r.username, true);
  } catch (err) {
    errBox.textContent = commErrMsg(err, 'Login failed.');
    errBox.hidden = false;
  }
}
async function commDoRegister(e) {
  e.preventDefault();
  const errBox = $('regErr');
  errBox.hidden = true;
  try {
    const r = await commJson('/api/auth/register/', {method: 'POST', body: JSON.stringify({
      username: $('regUser').value.trim(), email: $('regEmail').value.trim(), password: $('regPass').value})});
    $('regPass').value = '';
    await commAfterLogin(r.token, r.username, true);
  } catch (err) {
    errBox.textContent = commErrMsg(err, 'Registration failed.');
    errBox.hidden = false;
  }
}

/* ---------- favorites sync (invoked directly by the local toggle handlers;
   a document-level listener would miss quick-fav clicks — they call
   stopPropagation) ---------- */
function commSyncFav(id) {
  if (!id || !commToken) return; // anonymous: local only
  const shouldBeFav = favs.has(id); // the local handler already toggled it
  commJson('/api/favorites/toggle/', {method: 'POST', body: JSON.stringify({external_id: id})})
    .then(r => {
      if (r.favorited) commServerFavs.add(id); else commServerFavs.delete(id);
      if (r.favorited !== shouldBeFav) { // reconcile on mismatch
        if (r.favorited) favs.add(id); else favs.delete(id);
        saveFavs();
        renderDishes();
        if (!$('modalBackdrop').hidden) updateFavBtn();
      }
    })
    .catch(err => {
      if (err.status === 401) commOpenAuth('login');
      else toast('⚠️ Could not sync favorite with server');
    });
}

/* ---------- dish community data ---------- */
async function commLoadDish(extId) {
  commCurrent = {extId: extId, loading: true};
  commRenderCommunity();
  try {
    const [detail, comments] = await Promise.all([
      commJson('/api/recipes/by-external/' + encodeURIComponent(extId) + '/'),
      commJson('/api/comments/?external_id=' + encodeURIComponent(extId) + '&limit=50')
        .catch(() => ({results: [], count: 0}))
    ]);
    commCurrent = {extId: extId, loading: false, detail: detail,
                   comments: comments.results || [], count: comments.count || 0};
  } catch (e) {
    commCurrent = {extId: extId, loading: false, error: true};
  }
  if (modalId === extId) commRenderCommunity();
}
function commStars(avg) {
  if (avg === null || avg === undefined) return '☆☆☆☆☆';
  const full = Math.round(avg);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}
function commTimeAgo(iso) {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return s + 's ago';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 30) return d + 'd ago';
  return new Date(iso).toLocaleDateString();
}
function commRenderCommunity() {
  const box = $('commRate'), list = $('commList');
  box.innerHTML = '';
  list.innerHTML = '';
  const cur = commCurrent;
  $('commWall').hidden = !!commToken;
  $('commForm').hidden = !commToken;
  if (!cur || cur.loading) {
    box.innerHTML = '<p class="muted">Loading community…</p>';
    $('commCount').textContent = '';
    $('commTotal').textContent = '';
    return;
  }
  if (cur.error || !cur.detail) {
    box.innerHTML = '<p class="muted">⚠️ Community data unavailable.</p>';
    return;
  }
  const d = cur.detail;
  const avg = document.createElement('div');
  avg.className = 'rate-avg';
  const b = document.createElement('b');
  b.textContent = (d.avg_rating === null || d.avg_rating === undefined) ? '–' : Number(d.avg_rating).toFixed(1);
  const st = document.createElement('span');
  st.className = 'rate-stars';
  st.textContent = commStars(d.avg_rating);
  const sm = document.createElement('small');
  sm.textContent = (d.rating_count || 0) + ' vote' + (d.rating_count === 1 ? '' : 's') +
    ' · ❤️ ' + (d.favorites_count || 0) + ' saves';
  avg.append(b, st, sm);
  box.appendChild(avg);
  const pick = document.createElement('div');
  pick.className = 'rate-pick';
  if (!commToken) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-small';
    btn.textContent = '👤 Log in to rate';
    btn.onclick = () => commOpenAuth('login');
    pick.appendChild(btn);
  } else {
    const lab = document.createElement('span');
    lab.textContent = 'Your rating: ';
    pick.appendChild(lab);
    const mine = d.my_rating || 0;
    for (let v = 1; v <= 5; v++) {
      const s = document.createElement('button');
      s.type = 'button';
      s.textContent = '★';
      s.dataset.v = v;
      s.className = 'star' + (v <= mine ? ' lit' : '');
      s.setAttribute('aria-label', 'Rate ' + v + ' stars');
      s.onmouseenter = () => {
        pick.querySelectorAll('.star').forEach(x => x.classList.toggle('lit', +x.dataset.v <= v));
      };
      s.onmouseleave = () => {
        pick.querySelectorAll('.star').forEach(x => x.classList.toggle('lit', +x.dataset.v <= mine));
      };
      s.onclick = () => commSubmitRating(v);
      pick.appendChild(s);
    }
    if (mine) {
      const you = document.createElement('small');
      you.textContent = ' (you rated ' + mine + ')';
      pick.appendChild(you);
    }
  }
  box.appendChild(pick);
  $('commCount').textContent = cur.count ? '(' + cur.count + ')' : '';
  $('commTotal').textContent = cur.count ? '· ' + cur.count + ' comment' + (cur.count === 1 ? '' : 's') : '';
  if (!cur.comments.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No comments yet — start the discussion! 💬';
    list.appendChild(li);
  }
  cur.comments.forEach(c => {
    const li = document.createElement('li');
    const head = document.createElement('div');
    head.className = 'comm-head';
    const who = document.createElement('b');
    who.textContent = c.user;
    const when = document.createElement('span');
    when.textContent = commTimeAgo(c.created_at);
    head.append(who, when);
    if (commUser && c.user === commUser) {
      const del = document.createElement('button');
      del.className = 'mini-btn';
      del.textContent = '🗑';
      del.title = 'Delete my comment';
      del.onclick = () => commDeleteComment(c.id);
      head.appendChild(del);
    }
    const p = document.createElement('p');
    p.textContent = c.text;
    li.append(head, p);
    list.appendChild(li);
  });
}
async function commSubmitRating(value) {
  if (!commToken || !commCurrent) { commOpenAuth('login'); return; }
  try {
    const r = await commJson('/api/ratings/rate/', {method: 'POST', body: JSON.stringify({
      external_id: commCurrent.extId, value: value})});
    commCurrent.detail.avg_rating = r.avg;
    commCurrent.detail.rating_count = r.votes;
    commCurrent.detail.my_rating = r.value;
    commMyRatings[commCurrent.extId] = r.value;
    commRenderCommunity();
    commLoadTop(true);
    toast('⭐ Thanks for rating!');
  } catch (err) {
    if (err.status === 401) commOpenAuth('login');
    else toast('⚠️ Could not save rating');
  }
}
async function commSubmitComment(e) {
  e.preventDefault();
  const ta = $('commText');
  const text = ta.value.trim();
  if (!text || !commCurrent) return;
  try {
    const c = await commJson('/api/comments/', {method: 'POST', body: JSON.stringify({
      external_id: commCurrent.extId, text: text})});
    commCurrent.comments.unshift(c);
    commCurrent.count += 1;
    if (commCurrent.detail) commCurrent.detail.comments_count = commCurrent.count;
    ta.value = '';
    commRenderCommunity();
    toast('💬 Comment posted!');
  } catch (err) {
    if (err.status === 401) commOpenAuth('login');
    else toast('⚠️ ' + commErrMsg(err, 'Could not post comment'));
  }
}
async function commDeleteComment(id) {
  try {
    await commFetch('/api/comments/' + id + '/', {method: 'DELETE'});
    if (commCurrent) {
      commCurrent.comments = commCurrent.comments.filter(c => c.id !== id);
      commCurrent.count = Math.max(0, commCurrent.count - 1);
      commRenderCommunity();
    }
  } catch (e) {
    toast('⚠️ Could not delete comment');
  }
}

/* ---------- top rankings ---------- */
async function commLoadTop(silent) {
  const box = $('topList');
  if (!silent) box.innerHTML = '<p class="muted">Loading rankings…</p>';
  try {
    const data = await commJson('/api/ratings/top/?by=' + commTopBy + '&limit=10&catalogue_only=1');
    const rows = data.results || [];
    box.innerHTML = '';
    if (!rows.length) {
      box.innerHTML = commTopBy === 'rating'
        ? '<p class="muted">No ratings yet — open a dish and be the first to rate! ⭐</p>'
        : '<p class="muted">No favorites yet — tap 🤍 on any dish to love it! ❤️</p>';
      return;
    }
    rows.forEach(r => {
      const btn = document.createElement('button');
      btn.className = 'top-row';
      const medal = document.createElement('span');
      medal.className = 'medal';
      medal.textContent = r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : '#' + r.rank;
      const emo = document.createElement('span');
      emo.className = 'top-emoji';
      emo.textContent = foodEmoji(r.name);
      const main = document.createElement('span');
      main.className = 'top-main';
      const nm = document.createElement('b');
      nm.textContent = r.name;
      const cz = document.createElement('small');
      cz.textContent = (FLAGS[r.cuisine] || '🌍') + ' ' + (r.cuisine || '');
      main.append(nm, cz);
      const score = document.createElement('span');
      score.className = 'top-score';
      score.textContent = commTopBy === 'rating'
        ? '⭐ ' + r.avg + ' (' + r.votes + ')'
        : '❤️ ' + r.favorites;
      btn.append(medal, emo, main, score);
      btn.onclick = () => openModal(r.external_id);
      box.appendChild(btn);
    });
    $('topInfo').textContent = commTopBy === 'rating'
      ? 'Top ' + rows.length + ' by community rating — live rankings from registered cooks.'
      : 'Top ' + rows.length + ' most-favorited dishes — live results from registered cooks.';
  } catch (e) {
    if (!silent) box.innerHTML = '<p class="muted">⚠️ Rankings unavailable right now.</p>';
  }
}

/* ---------- wrappers over app/enhance functions ---------- */
/* NB: a top-level `function openModal` here would be hoisted BEFORE this
   script runs, so `const base = openModal` would capture the wrapper itself
   (infinite recursion). Capture window.* first, then reassign it. */
(function () {
  const baseOpenModal = window.openModal;
  window.openModal = function (id) {
    baseOpenModal(id);
    commLoadDish(id);
  };
})();
function switchTab(name) {
  document.querySelectorAll('.m-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  ['about', 'ing', 'steps', 'tips', 'community'].forEach(t => {
    $('tab' + t[0].toUpperCase() + t.slice(1)).hidden = t !== name;
  });
}

/* ---------- bindings + boot ---------- */
$('authBtn').onclick = () => commOpenAuth('login');
$('logoutBtn').onclick = () => commLogout(false);
$('authClose').onclick = commCloseAuth;
$('authBackdrop').addEventListener('click', e => { if (e.target.id === 'authBackdrop') commCloseAuth(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('authBackdrop').hidden) { e.stopPropagation(); commCloseAuth(); }
}, true);
$('tabLoginBtn').onclick = () => commAuthTab('login');
$('tabRegisterBtn').onclick = () => commAuthTab('register');
$('loginForm').onsubmit = commDoLogin;
$('registerForm').onsubmit = commDoRegister;
$('commLoginBtn').onclick = () => commOpenAuth('login');
$('commForm').onsubmit = commSubmitComment;
document.querySelectorAll('[data-topby]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-topby]').forEach(x => x.classList.toggle('on', x === b));
  commTopBy = b.dataset.topby;
  commLoadTop(false);
});
if (COMM_STATIC) {
  document.body.classList.add('static-mode');
  const h = document.querySelector('.auth-modal .hint');
  if (h) h.textContent = '🔒 Local vault: accounts & posts stay hashed in this browser — private to this device.';
  const cloudProbe = (window.COOKATLAS_CLOUD && window.COOKATLAS_CLOUD_READY) || Promise.resolve(false);
  cloudProbe.then(function (live) {
    if (live) { if (h) h.textContent = '🌐 Live community: one shared database — your posts sync across every device.'; }
    else if (window.COOKATLAS_CLOUD) document.body.classList.add('cloud-off');
    return window.COOKATLAS_DB_READY;
  }).then(() => {
    commUpdateAuthUI();
    commLoadTop(false);
    if (commToken) commRefreshMe();
  });
} else {
  commUpdateAuthUI();
  commLoadTop(false);
  if (commToken) commRefreshMe();
}

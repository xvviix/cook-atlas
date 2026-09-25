/* CookAtlas Fridge Finder — "what do I have?" smart ingredient matching.
   Runs entirely client-side against the already-loaded DISHES catalogue, so
   results are instant and it also works on the static fallback site.
   Loaded after app.js / enhance.js / community.js. */
(function () {
  'use strict';

  /* ---------- matching vocabulary (mirrors the /api/fridge/ backend) ---------- */
  var PANTRY = {salt: 1, pepper: 1, sugar: 1, water: 1, oil: 1, ice: 1};
  var UNITS = {};
  'g kg mg ml cl dl oz lb tsp tbsp tbs teaspoon teaspoons tablespoon tablespoons cup cups pinch dash handful handfuls stick sticks can cans jar jars package packages pack pack pack piece pieces slice slices fillet fillets sprig sprigs bunch bunches amount ltr gram grams ounce ounces pint quarts quart'
    .split(' ').forEach(function (w) { UNITS[w] = 1; });
  var FILLER = {};
  'fresh dried ground finely thinly coarsely lightly chopped fine minced diced sliced grated shredded crumbled smashed smashed melted softened room temperature cold warm boiling lukewarm large small medium regular olive vegetable sunflower canola neutral extra virgin sea kosher brown white dark light plain allpurpose red yellow green orange purple black white juice zest rind to taste for serving serve garnish optional dusting hydration plus more about approximately roughly divided split half thirds quarter soaked drained rinsed patted dry at in of the a an some any or and with without as per each about approx tbsp sized crumbly fluffy'
    .split(' ').forEach(function (w) { FILLER[w] = 1; });
  var SYN = {
    chili: ['chilli', 'chilies'], chilli: ['chili', 'chilies'],
    yogurt: ['yoghurt'], yoghurt: ['yogurt'],
    eggplant: ['aubergine'], aubergine: ['eggplant'],
    zucchini: ['courgette'], courgette: ['zucchini'],
    cilantro: ['coriander'], coriander: ['cilantro'],
    shrimp: ['prawn'], prawn: ['shrimp'],
    scallion: ['spring', 'onion'], onion: ['onions']
  };

  function stem(w) {
    if (w.length > 4 && w.slice(-2) === 'es') return w.slice(0, -2);
    if (w.length > 3 && w.slice(-1) === 's' && w.slice(-2) !== 'ss') return w.slice(0, -1);
    return w;
  }
  /* words that matter in an ingredient line -> {stem[], disp[]} */
  function sigWords(str) {
    var norm = String(str).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
    var st = [], disp = [];
    norm.split(/\s+/).forEach(function (w) {
      if (!w || w.length < 2) return;
      if (/^\d+([.,]\d+)?[a-z]{0,4}$/.test(w)) return;
      if (UNITS[w] || FILLER[w] || /^\d/.test(w)) return;
      st.push(stem(w));
      if (disp.indexOf(w) < 0) disp.push(w);
    });
    return {st: st, disp: disp};
  }
  var wordHit = function (a, b) {
    if (a === b) return true;
    if (SYN[a] && SYN[a].indexOf(b) >= 0) return true;
    if (SYN[b] && SYN[b].indexOf(a) >= 0) return true;
    return false;
  };

  /* ---------- state ---------- */
  var want = [];            // raw ingredient strings the user has
  var maxMissing = 99;
  var viewAll = false;
  var LINE_CACHE = null;    // per-dish parsed lines
  var VOCAB = [];           // autocomplete vocabulary
  var ready = false;

  /* ---------- data prep ---------- */
  function buildCache() {
    LINE_CACHE = DISHES.map(function (d) {
      return {
        dish: d,
        lines: d.ingredients.map(function (line) {
          var sw = sigWords(line);
          var pantry = !sw.st.length || sw.st.every(function (w) { return PANTRY[w]; });
          return {st: sw.st, disp: sw.disp.slice(0, 4).join(' '), pantry: pantry};
        })
      };
    });
    var freq = {};
    DISHES.forEach(function (d) {
      d.ingredients.forEach(function (line) {
        sigWords(line).disp.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
      });
    });
    VOCAB = Object.keys(freq).filter(function (w) { return freq[w] >= 10 && w.length > 3; })
      .sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 600);
    ready = true;
    runSearch();
  }

  /* ---------- engine ---------- */
  function matchDish(entry, terms) {
    var covered = 0, total = 0, missing = [], used = {};
    entry.lines.forEach(function (ln) {
      if (ln.pantry) return; // salt/oil/water: everyone has them
      total++;
      var ok = false;
      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var hit = t.st.every(function (tw) {
          return ln.st.some(function (lw) { return wordHit(lw, tw); });
        });
        if (hit) { ok = true; used[t.raw] = 1; }
      }
      if (ok) covered++; else missing.push(ln.disp || 'other ingredients');
    });
    if (!total) return null;
    var usedCount = Object.keys(used).length;
    if (!usedCount || missing.length > maxMissing) return null;
    return {
      d: entry.dish,
      pct: Math.round(100 * covered / total),
      used: Object.keys(used),
      missing: missing,
      total: total
    };
  }

  function runSearch() {
    var grid = $('fridgeResults'), info = $('fridgeInfo');
    if (!grid) return;
    viewAll = false;
    if (!ready) { info.textContent = 'Loading the 500-dish catalogue…'; grid.innerHTML = ''; $('fridgeMoreWrap').hidden = true; return; }
    if (!want.length) {
      grid.innerHTML = ''; $('fridgeMoreWrap').hidden = true;
      info.textContent = 'Type at least one ingredient — we rank 500 world dishes by how much of them you already have.';
      return;
    }
    var terms = want.map(function (t) { var sw = sigWords(t); return {raw: t, st: sw.st}; })
      .filter(function (t) { return t.st.length; });
    if (!terms.length) { info.textContent = 'Try real ingredients like “eggs”, “tomato”, “rice”…'; grid.innerHTML = ''; return; }

    var hits = [];
    LINE_CACHE.forEach(function (entry) {
      var r = matchDish(entry, terms);
      if (r) hits.push(r);
    });
    hits.sort(function (a, b) {
      return (b.used.length - a.used.length) || (b.pct - a.pct) ||
             (a.missing.length - b.missing.length) || (a.d.title.localeCompare(b.d.title));
    });

    var nowCount = hits.filter(function (h) { return h.missing.length === 0; }).length;
    info.innerHTML = '';
    if (!hits.length) {
      info.textContent = 'No matches yet — try common staples (eggs, onion, tomato, rice, chicken) or relax the “missing” filter.';
      grid.innerHTML = ''; $('fridgeMoreWrap').hidden = true; return;
    }
    var b1 = document.createElement('b'); b1.textContent = String(hits.length);
    info.append('🍳 ', b1, ' matching dishes · ');
    if (nowCount) { var b2 = document.createElement('b'); b2.textContent = String(nowCount); info.append('⚡ ', b2, ' cookable right now — nothing to buy!'); }
    else info.append('closest ones need shopping for only a few items.');
    renderGrid(hits);
  }

  function renderGrid(hits) {
    var grid = $('fridgeResults');
    grid.innerHTML = '';
    var shown = viewAll ? hits : hits.slice(0, 12);
    shown.forEach(function (h) {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'fridge-card' + (h.missing.length === 0 ? ' cook-now' : '');
      card.dataset.id = h.d.id;

      var art = document.createElement('div');
      art.className = 'fridge-art';
      art.style.background = gradFor(h.d.id);
      art.textContent = foodEmoji(h.d.title);

      var body = document.createElement('div');
      body.className = 'fridge-body';
      var cuisine = document.createElement('small');
      cuisine.className = 'fridge-cuisine';
      cuisine.textContent = (FLAGS[h.d.cuisine] || '🌍') + ' ' + h.d.cuisine;
      var title = document.createElement('h3');
      title.textContent = h.d.title;

      var bar = document.createElement('div');
      bar.className = 'fridge-bar';
      var fill = document.createElement('i');
      fill.style.width = h.pct + '%';
      bar.appendChild(fill);
      var pct = document.createElement('span');
      pct.className = 'fridge-pct';
      pct.textContent = h.pct === 100 ? '✓ all of it' : h.pct + '% covered';

      var have = document.createElement('p');
      have.className = 'fridge-have';
      have.textContent = '✔ You have: ' + h.used.join(', ');

      var miss = document.createElement('p');
      if (h.missing.length) {
        miss.className = 'fridge-missing';
        var lead = document.createElement('b');
        lead.textContent = h.missing.length === 1 ? 'Missing 1: ' : 'Missing ' + h.missing.length + ': ';
        miss.append(lead, ' ' + h.missing.slice(0, 3).join(', ') + (h.missing.length > 3 ? ' +' + (h.missing.length - 3) + ' more' : ''));
      } else {
        miss.className = 'fridge-missing zero';
        miss.textContent = '⚡ Nothing to buy — cook it tonight!';
      }

      var row = document.createElement('div');
      row.className = 'fridge-row';
      row.append(bar, pct);

      body.append(cuisine, title, row, have, miss);
      card.append(art, body);
      card.onclick = function () { openModal(h.d.id); };
      grid.appendChild(card);
    });
    $('fridgeMoreWrap').hidden = hits.length <= 12;
    $('fridgeMore').textContent = 'Show all ' + hits.length + ' matches';
    grid._hits = hits;
  }

  /* ---------- chip input UI ---------- */
  function renderChips() {
    var box = $('fridgeChips'), input = $('fridgeInput');
    box.querySelectorAll('.fchip').forEach(function (c) { c.remove(); });
    want.forEach(function (w) {
      var chip = document.createElement('span');
      chip.className = 'fchip';
      var label = document.createElement('i');
      label.textContent = w;
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'fchip-x'; x.setAttribute('aria-label', 'Remove ' + w);
      x.textContent = '✕';
      x.onclick = function (ev) { ev.stopPropagation(); removeTerm(w); };
      chip.append(label, x);
      box.insertBefore(chip, input);
    });
    runSearch();
  }
  function addTerm(text) {
    text = String(text || '').toLowerCase().replace(/[,;]+$/, '').trim();
    if (!text) return;
    if (/[,;]/.test(text)) { text.split(/[,;]+/).forEach(addTerm); return; }
    var st = sigWords(text).st;
    if (!st.length) return;
    if (st.every(function (w) { return PANTRY[w]; })) { toast('🧂 ' + text + ' is a pantry staple — we count it free!'); return; }
    var dup = want.some(function (t) {
      var b = sigWords(t).st;
      return b.length === st.length && b.every(function (w, i) { return w === st[i]; });
    });
    if (dup) { toast('You already added “' + text + '”'); return; }
    want.push(text);
    $('fridgeInput').value = '';
    hideSuggest();
    try { localStorage.setItem('cookatlas_fridge', JSON.stringify(want)); } catch (e) {}
    renderChips();
  }
  function removeTerm(w) {
    want = want.filter(function (t) { return t !== w; });
    try { localStorage.setItem('cookatlas_fridge', JSON.stringify(want)); } catch (e) {}
    renderChips();
  }

  /* ---------- autocomplete ---------- */
  var sugActive = -1, sugItems = [];
  function renderSuggest() {
    var box = $('fridgeSuggest'), input = $('fridgeInput');
    var q = stem(input.value.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/)[0] || '');
    box.innerHTML = ''; box.hidden = true; sugActive = -1; sugItems = [];
    if (q.length < 2 || !ready) return;
    var hits = [];
    for (var i = 0; i < VOCAB.length && hits.length < 7; i++) {
      var w = VOCAB[i];
      if (w.indexOf(q) === 0 && want.indexOf(w) < 0) hits.push(w);
    }
    if (!hits.length) return;
    hits.forEach(function (w) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'sug'; b.textContent = w;
      b.onmousedown = function (e) { e.preventDefault(); };
      b.onclick = function () { addTerm(w); };
      box.appendChild(b);
    });
    sugItems = [].slice.call(box.querySelectorAll('.sug'));
    box.hidden = false;
  }
  function hideSuggest() { $('fridgeSuggest').hidden = true; sugActive = -1; }

  /* ---------- bindings ---------- */
  var input = $('fridgeInput');
  var deb;
  input.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(renderSuggest, 90); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (sugActive >= 0 && sugItems[sugActive]) addTerm(sugItems[sugActive].textContent);
      else addTerm(input.value);
    } else if (e.key === 'Backspace' && !input.value && want.length) {
      removeTerm(want[want.length - 1]);
    } else if (e.key === 'ArrowDown' && !$('fridgeSuggest').hidden) {
      e.preventDefault(); sugActive = (sugActive + 1) % sugItems.length;
      sugItems.forEach(function (b, i) { b.classList.toggle('active', i === sugActive); });
    } else if (e.key === 'ArrowUp' && !$('fridgeSuggest').hidden) {
      e.preventDefault(); sugActive = (sugActive - 1 + sugItems.length) % sugItems.length;
      sugItems.forEach(function (b, i) { b.classList.toggle('active', i === sugActive); });
    } else if (e.key === 'Escape') { hideSuggest(); }
  });
  input.addEventListener('blur', function () { if (input.value.trim()) { addTerm(input.value); } hideSuggest(); });
  $('fridgeChips').addEventListener('paste', function (e) {
    var txt = (e.clipboardData || window.clipboardData).getData('text');
    if (/[,\n]/.test(txt)) {
      e.preventDefault();
      txt.split(/[,\n]+/).forEach(function (t) { addTerm(t); });
    }
  });
  document.querySelectorAll('#fridgeQuick .qchip').forEach(function (b) {
    b.onclick = function () { addTerm(b.dataset.ing); };
  });
  $('fridgeMax').onchange = function (e) { maxMissing = parseInt(e.target.value, 10); runSearch(); };
  $('fridgeClear').onclick = function () {
    want = [];
    try { localStorage.removeItem('cookatlas_fridge'); } catch (e) {}
    renderChips();
  };
  $('fridgeMore').onclick = function () { viewAll = true; renderGrid($('fridgeResults')._hits || []); };

  /* ---------- boot: wait for DISHES, restore chips, go ---------- */
  try { want = JSON.parse(localStorage.getItem('cookatlas_fridge') || '[]').slice(0, 12); } catch (e) {}
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    if (typeof DISHES !== 'undefined' && DISHES.length) {
      clearInterval(iv);
      buildCache();
      renderChips();
    } else if (tries > 150) { clearInterval(iv); }
  }, 100);
})();

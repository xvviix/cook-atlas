/* CookAtlas enhancements — theme, regions, tabs, scaler, autocomplete, ticker, dish-of-day.
   Loaded AFTER app.js. Function re-declarations below intentionally override app.js versions. */

/* ---------- Regions ---------- */
const REGIONS = {
  "Europe": ["Italy","Greece","Portugal","Spain","France","Serbia","Poland","Croatia","Hungary","Germany","Romania","Czech Republic","Bulgaria","Austria","Lithuania","Ukraine","Netherlands","England","Russia"],
  "Asia": ["Japan","China","Indonesia","India","Vietnam","Korea","Thailand","Philippines","Malaysia"],
  "Middle East": ["Türkiye","Lebanon","Georgia","Palestine","Iran","Syria","Saudi Arabia"],
  "Africa": ["Morocco","Egypt","Ethiopia","South Africa","Tunisia","Algeria"],
  "Americas": ["Peru","Mexico","United States","Brazil","Colombia","Argentina","Canada","Ecuador","Chile"]
};
const COUNTRY_REGION = {};
Object.entries(REGIONS).forEach(([r, list]) => list.forEach(c => { COUNTRY_REGION[c] = r; }));
function regionOf(c){ return COUNTRY_REGION[c] || "World"; }
let activeRegion = null;

/* ---------- Theme ---------- */
function setTheme(t){
  document.documentElement.dataset.theme = t;
  try{ localStorage.setItem("cookatlas_theme", t); }catch(e){}
  const b = document.getElementById("themeToggle");
  if(b) b.textContent = t === "dark" ? "☀️" : "🌙";
}

/* ---------- Filters (override: adds region) ---------- */
function filtered(){
  const q = ($("navSearch").value || $("heroSearch").value || "").trim().toLowerCase();
  let list = DISHES.filter(d => {
    if(activeRegion && regionOf(d.cuisine) !== activeRegion) return false;
    if(activeCountry && d.cuisine !== activeCountry) return false;
    if(favOnly && !favs.has(d.id)) return false;
    if(q && !(d.title + " " + d.cuisine + " " + d.about).toLowerCase().includes(q)) return false;
    return true;
  });
  if(sortMode === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
  return list;
}

/* ---------- Countries (override: rank badges + region dimming) ---------- */
function renderCountries(){
  countryGrid.innerHTML = "";
  COUNTRIES.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "country-card" + (activeCountry === c.name ? " active" : "") +
      ((activeRegion && regionOf(c.name) !== activeRegion) ? " dimmed" : "");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "Filter by " + c.name);
    const rank = document.createElement("span"); rank.className = "rank"; rank.textContent = "#" + (i + 1);
    const flag = document.createElement("span"); flag.className = "flag"; flag.textContent = FLAGS[c.name] || "🌍";
    const nm = document.createElement("b"); nm.textContent = c.name;
    const sm = document.createElement("small"); sm.textContent = `${c.dishes.length} dishes · ${regionOf(c.name)}`;
    card.append(rank, flag, nm, sm);
    const pick = () => {
      activeCountry = (activeCountry === c.name ? null : c.name);
      visible = 24; renderCountries(); renderDishes();
      $("clearCountry").hidden = !activeCountry;
      if(activeCountry) document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
    };
    card.onclick = pick;
    card.onkeydown = e => { if(e.key === "Enter" || e.key === " ") pick(); };
    countryGrid.appendChild(card);
  });
}

/* ---------- Dish cards (override: badges + quick fav + stagger) ---------- */
function cardEl(d, idx){
  const el = document.createElement("article");
  el.className = "dish-card"; el.tabIndex = 0;
  el.style.animationDelay = Math.min(idx || 0, 23) * 25 + "ms";
  const art = document.createElement("div");
  art.className = "dish-art"; art.style.background = gradFor(d.id);
  const emo = document.createElement("span"); emo.className = "dish-emoji"; emo.textContent = foodEmoji(d.title);
  const veil = document.createElement("span"); veil.className = "view-veil"; veil.textContent = "View recipe →";
  const fav = document.createElement("button");
  fav.className = "quick-fav"; fav.setAttribute("aria-label", "Toggle favorite"); fav.title = "Save to favorites";
  fav.textContent = favs.has(d.id) ? "❤️" : "🤍";
  fav.onclick = e => {
    e.stopPropagation();
    if(favs.has(d.id)){ favs.delete(d.id); fav.textContent = "🤍"; toast("Removed from favorites"); }
    else{ favs.add(d.id); fav.textContent = "❤️"; toast("❤️ Saved to favorites!"); }
    saveFavs();
    if(window.commSyncFav) window.commSyncFav(d.id);
    if(favOnly) renderDishes();
  };
  art.append(emo, veil, fav);
  const body = document.createElement("div"); body.className = "dish-body";
  const meta = document.createElement("div"); meta.className = "dish-meta";
  meta.textContent = `${FLAGS[d.cuisine] || "🌍"} ${d.cuisine}`;
  const h = document.createElement("h3"); h.textContent = d.title;
  const badges = document.createElement("div"); badges.className = "badges";
  badges.innerHTML = `<span>🧂 ${d.ingredients.length}</span><span>👩‍🍳 ${d.steps.length} steps</span>`;
  body.append(meta, h, badges);
  el.append(art, body);
  const open = () => openModal(d.id);
  el.onclick = open;
  el.onkeydown = e => { if(e.key === "Enter") open(); };
  return el;
}

/* ---------- Explorer render (override: empty state + end note) ---------- */
function renderDishes(){
  currentList = filtered();
  dishGrid.innerHTML = "";
  if(!currentList.length){
    const box = document.createElement("div");
    box.className = "empty";
    box.innerHTML = `<div class="empty-emoji">🍽️</div><h3>No dishes found</h3><p>Try a different search, or clear your filters.</p>`;
    const btn = document.createElement("button");
    btn.className = "btn btn-primary"; btn.textContent = "Clear all filters";
    btn.onclick = () => {
      activeCountry = null; activeRegion = null; favOnly = false;
      $("navSearch").value = ""; $("heroSearch").value = "";
      $("favToggle").setAttribute("aria-pressed", "false");
      $("clearCountry").hidden = true;
      document.querySelectorAll("#regionChips .chip").forEach(ch => ch.classList.toggle("active", !ch.dataset.region));
      visible = 24; renderCountries(); renderDishes();
    };
    box.appendChild(btn);
    dishGrid.appendChild(box);
  } else {
    currentList.slice(0, visible).forEach((d, i) => dishGrid.appendChild(cardEl(d, i)));
  }
  resultInfo.textContent = `Showing ${Math.min(visible, currentList.length)} of ${currentList.length} dishes` +
    (activeRegion ? ` · ${activeRegion}` : "") +
    (activeCountry ? ` · ${FLAGS[activeCountry] || ""} ${activeCountry}` : "") +
    (favOnly ? " · ❤ favorites" : "");
  const more = currentList.length > visible;
  $("loadMore").style.display = more ? "inline-block" : "none";
  $("endNote").hidden = !(currentList.length > 0 && !more && currentList.length > 12);
}

/* ---------- Modal helpers ---------- */
let currentScale = 1, doneSteps = new Set();
const FRAC = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1/3, "⅔": 2/3, "⅛": 0.125 };
function scaleQty(text, f){
  if(f === 1) return text;
  return text.replace(/^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?(?:\s*[–-]\s*\d+(?:[.,]\d+)?)?|[½¼¾⅓⅔⅛])/, m => {
    const fmt = n => {
      const r = Math.round(n * 100) / 100;
      return String(r >= 10 ? Math.round(r * 10) / 10 : r).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
    };
    m = m.trim();
    if(FRAC[m]) return fmt(FRAC[m] * f);
    if(m.includes("/")){ const [a, b] = m.split("/").map(Number); return (b ? fmt(a / b * f) : m); }
    if(/[-–]/.test(m)){
      const [a, b] = m.split(/[-–]/).map(x => parseFloat(x.replace(",", ".")));
      return fmt(a * f) + "–" + fmt(b * f);
    }
    return fmt(parseFloat(m.replace(",", ".")) * f);
  });
}
function renderIng(d){
  const ing = $("mIng"); ing.innerHTML = "";
  d.ingredients.forEach(t => {
    const li = document.createElement("li");
    li.textContent = scaleQty(t, currentScale);
    li.onclick = () => li.classList.toggle("done");
    ing.appendChild(li);
  });
  $("ingCount").textContent = d.ingredients.length;
}
function renderSteps(d){
  const st = $("mSteps"); st.innerHTML = ""; doneSteps = new Set();
  d.steps.forEach((t, i) => {
    const li = document.createElement("li"); li.tabIndex = 0;
    li.innerHTML = `<span class="step-num">${i + 1}</span><span class="step-txt"></span>`;
    li.querySelector(".step-txt").textContent = t;
    const toggle = () => {
      li.classList.toggle("done");
      li.classList.contains("done") ? doneSteps.add(i) : doneSteps.delete(i);
      updateStepProgress(d);
    };
    li.onclick = toggle;
    li.onkeydown = e => { if(e.key === "Enter" || e.key === " ") toggle(); };
    st.appendChild(li);
  });
  $("stepCount").textContent = d.steps.length;
  updateStepProgress(d);
}
function updateStepProgress(d){
  const n = doneSteps.size, total = d.steps.length;
  $("stepFill").style.width = (total ? (n / total * 100) : 0) + "%";
  $("stepLabel").textContent = n === 0
    ? `Tap a step when you've done it — 0 of ${total} complete`
    : (n === total ? `🎉 All ${total} steps done — enjoy your meal!` : `${n} of ${total} steps done — keep going!`);
}
function switchTab(name){
  document.querySelectorAll(".m-tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
  ["about", "ing", "steps", "tips"].forEach(t => {
    $("tab" + t[0].toUpperCase() + t.slice(1)).hidden = t !== name;
  });
}

/* ---------- Modal open (override: tabs + scaler + progress + meta) ---------- */
function openModal(id){
  const d = DISHES.find(x => x.id === id);
  if(!d) return;
  modalId = id; currentScale = 1;
  document.querySelectorAll("#scaleWrap button[data-scale]").forEach(b => b.classList.toggle("on", b.dataset.scale === "1"));
  $("mHero").style.background = gradFor(d.id);
  $("mEmoji").textContent = foodEmoji(d.title);
  $("mCuisine").textContent = `${FLAGS[d.cuisine] || "🌍"} ${d.cuisine} · ${regionOf(d.cuisine)}`;
  $("mTitle").textContent = d.title;
  $("mAbout").textContent = d.about;
  $("mMeta").innerHTML = `<span>🧂 ${d.ingredients.length} ingredients</span><span>👩‍🍳 ${d.steps.length} steps</span><span>💡 ${d.tips.length} tips</span><span>🔗 ${d.sources.length} sources</span>`;
  renderIng(d); renderSteps(d);
  const tp = $("mTips"); tp.innerHTML = "";
  d.tips.forEach(t => { const li = document.createElement("li"); li.textContent = t; tp.appendChild(li); });
  const sc = $("mSources"); sc.innerHTML = "";
  d.sources.forEach(s => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = s.text;
    li.appendChild(a); sc.appendChild(li);
  });
  switchTab("about");
  updateFavBtn();
  $("modalBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
  document.querySelector(".modal").scrollTop = 0;
}

/* ---------- Count-up stats ---------- */
function countUp(el, target, dur){
  dur = dur || 1400; if(!el) return;
  const t0 = performance.now();
  function fr(t){
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e).toLocaleString("en-US");
    if(p < 1) requestAnimationFrame(fr);
  }
  requestAnimationFrame(fr);
}

/* ---------- Ticker ---------- */
function buildTicker(){
  const track = $("tickerTrack");
  if(!track || !DISHES.length || track.childElementCount) return;
  const frag = document.createDocumentFragment();
  for(let r = 0; r < 2; r++) DISHES.forEach(d => {
    const s = document.createElement("span");
    s.className = "tick";
    s.textContent = `${foodEmoji(d.title)} ${d.title} · ${d.cuisine}   ✦   `;
    frag.appendChild(s);
  });
  track.appendChild(frag);
}

/* ---------- Dish of the day ---------- */
function dishOfDay(){
  if(!DISHES.length) return;
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const d = DISHES[seed % DISHES.length];
  $("todayDate").textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("todayArt").style.background = gradFor(d.id);
  $("todayEmoji").textContent = foodEmoji(d.title);
  $("todayTitle").textContent = d.title;
  $("todayCuisine").textContent = `${FLAGS[d.cuisine] || "🌍"} ${d.cuisine} · ${regionOf(d.cuisine)}`;
  $("todayAbout").textContent = d.about.length > 240 ? d.about.slice(0, 240).trim() + "…" : d.about;
  $("todayMeta").innerHTML = `<span>🧂 ${d.ingredients.length} ingredients</span><span>👩‍🍳 ${d.steps.length} steps</span>`;
  $("todayOpen").onclick = () => openModal(d.id);
}

/* ---------- Autocomplete ---------- */
let sugActive = -1;
function renderSuggest(){
  const box = $("suggest"), input = $("heroSearch");
  const q = input.value.trim().toLowerCase();
  box.innerHTML = ""; box.hidden = true; sugActive = -1;
  input.setAttribute("aria-expanded", "false");
  if(q.length < 2 || !DISHES.length) return;
  const hits = DISHES.filter(d => (d.title + " " + d.cuisine).toLowerCase().includes(q)).slice(0, 7);
  if(!hits.length) return;
  hits.forEach(d => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "sug"; b.dataset.id = d.id;
    b.setAttribute("role", "option");
    b.innerHTML = `<span class="sug-e"></span><span class="sug-t"></span><span class="sug-c"></span>`;
    b.querySelector(".sug-e").textContent = foodEmoji(d.title);
    b.querySelector(".sug-t").textContent = d.title;
    b.querySelector(".sug-c").textContent = `${FLAGS[d.cuisine] || ""} ${d.cuisine}`;
    b.onmousedown = e => e.preventDefault();
    b.onclick = () => { box.hidden = true; openModal(d.id); };
    box.appendChild(b);
  });
  box.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

/* ---------- Reveal on scroll ---------- */
const revealObs = ("IntersectionObserver" in window)
  ? new IntersectionObserver(es => es.forEach(en => {
      if(en.isIntersecting){ en.target.classList.add("in"); revealObs.unobserve(en.target); }
    }), { threshold: 0.1 })
  : null;
function initReveal(){
  document.querySelectorAll(".reveal").forEach(el => {
    revealObs ? revealObs.observe(el) : el.classList.add("in");
  });
}

/* ---------- Extra bindings ---------- */
$("themeToggle").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
$("heroSearch").addEventListener("input", renderSuggest);
$("heroSearch").addEventListener("keydown", e => {
  const box = $("suggest"), items = [...box.querySelectorAll(".sug")];
  if(box.hidden || !items.length) return;
  if(e.key === "ArrowDown" || e.key === "ArrowUp"){
    e.preventDefault();
    sugActive = (sugActive + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items.forEach((b, i) => b.classList.toggle("active", i === sugActive));
  } else if(e.key === "Enter" && sugActive >= 0){
    e.preventDefault(); box.hidden = true; openModal(items[sugActive].dataset.id);
  } else if(e.key === "Escape"){ box.hidden = true; }
});
document.addEventListener("click", e => { if(!e.target.closest(".hero-search")) $("suggest").hidden = true; });
document.querySelectorAll(".quick-tags button").forEach(b => b.onclick = () => {
  $("heroSearch").value = b.dataset.q; $("navSearch").value = b.dataset.q;
  $("suggest").hidden = true; visible = 24; renderDishes();
  document.getElementById("explore").scrollIntoView({ behavior: "smooth" });
});
document.querySelectorAll("#regionChips .chip").forEach(ch => ch.onclick = () => {
  document.querySelectorAll("#regionChips .chip").forEach(c => c.classList.remove("active"));
  ch.classList.add("active");
  activeRegion = ch.dataset.region || null;
  visible = 24; renderCountries(); renderDishes();
});
document.querySelectorAll(".m-tabs button").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
document.querySelectorAll("#scaleWrap button[data-scale]").forEach(b => b.onclick = () => {
  document.querySelectorAll("#scaleWrap button[data-scale]").forEach(x => x.classList.remove("on"));
  b.classList.add("on"); currentScale = parseFloat(b.dataset.scale);
  const d = DISHES.find(x => x.id === modalId);
  if(d) renderIng(d);
});
$("mPrint").onclick = () => {
  document.body.classList.add("print-recipe");
  window.print();
  setTimeout(() => document.body.classList.remove("print-recipe"), 600);
};
$("copyIng").onclick = () => {
  const d = DISHES.find(x => x.id === modalId);
  if(!d) return;
  const label = currentScale === 1 ? "" : ` (scaled ${currentScale}×)`;
  navigator.clipboard.writeText(`${d.title} — ingredients${label}:\n` + d.ingredients.map(t => "• " + scaleQty(t, currentScale)).join("\n"))
    .then(() => toast("📋 Ingredients copied!"))
    .catch(() => toast("Couldn't copy — select the list manually"));
};
$("surpriseDirect").onclick = () => { if(DISHES.length) openModal(DISHES[Math.floor(Math.random() * DISHES.length)].id); };
$("todayAlt").onclick = () => { if(DISHES.length) openModal(DISHES[Math.floor(Math.random() * DISHES.length)].id); };
$("toTop").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
window.addEventListener("scroll", () => {
  const y = window.scrollY;
  $("navbar").classList.toggle("scrolled", y > 10);
  $("toTop").classList.toggle("show", y > 600);
  const h = document.documentElement.scrollHeight - innerHeight;
  $("scrollProgress").style.width = (h > 0 ? (y / h * 100) : 0) + "%";
}, { passive: true });

/* ---------- Boot (runs once data arrives) ---------- */
setTheme(document.documentElement.dataset.theme || "light");
initReveal();
let bootTries = 0;
const bootIv = setInterval(() => {
  bootTries++;
  if(DISHES.length && COUNTRIES.length){
    clearInterval(bootIv);
    countUp($("statDishes"), DISHES.length);
    countUp($("statCountries"), COUNTRIES.length);
    countUp($("statSources"), DISHES.reduce((n, d) => n + d.sources.length, 0));
    buildTicker();
    dishOfDay();
  } else if(bootTries > 150){ clearInterval(bootIv); }
}, 100);

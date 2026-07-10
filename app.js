/* Senj útikalauz — alkalmazáslogika */
'use strict';

const SENJ = { lat: 44.9896, lng: 14.9058 }; // Senj központ (tartalék, ha nincs helymeghatározás)
const CAT = {
  strand:     { nev: 'Strandok',            szin: 'var(--c-strand)',    bg: 'rgba(56,189,248,.14)' },
  kilato_foto:{ nev: 'Kilátók és fotóhelyek', szin: 'var(--c-kilato)',  bg: 'rgba(255,180,84,.14)' },
  etterem:    { nev: 'Éttermek',             szin: 'var(--c-etterem)',  bg: 'rgba(251,113,133,.14)' },
  praktikus:  { nev: 'Praktikus',            szin: 'var(--c-praktikus)',bg: 'rgba(167,139,250,.14)' },
};
const ICONS = {
  strand: '<path d="M3 17c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 21c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="17" cy="6" r="3" fill="currentColor"/>',
  kilato_foto: '<path d="M4 20 12 5l8 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="11" r="2.2" fill="currentColor"/>',
  etterem: '<path d="M7 3v8m-2.5-8v5a2.5 2.5 0 0 0 5 0V3M7 11v10M16 3c-1.7 1.5-2.5 4-2.5 6.5 0 1.4 1.1 2.5 2.5 2.5V21M16 3v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  praktikus: '<path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8zM8 8V6a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  torony: '<path d="M9 21l1-13h4l1 13M8.5 8h7M9.5 5.5h5L12 3zM5 9l3-2m11 2-3-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  nap: '<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 8V5m5.5 4.5 2-2m-13 2-2-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  foto: '<rect x="3" y="7" width="18" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 7l1.5-2.5h5L16 7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="13" r="3.4" fill="none" stroke="currentColor" stroke-width="2"/>',
  csend: '<path d="M12 3a7 7 0 0 0-7 7c0 4 3 7.5 7 11 4-3.5 7-7 7-11a7 7 0 0 0-7-7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 10.5c.7 1 1.5 1.5 2.5 1.5s1.8-.5 2.5-1.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  reco: '<path d="M12 3l2.5 5.4 5.9.7-4.4 4 1.2 5.9L12 16l-5.2 3 1.2-5.9-4.4-4 5.9-.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};
const PRAKT = { bolt:'Boltok', pekseg:'Pékségek', gyogyszertar:'Gyógyszertárak', benzinkut:'Benzinkutak', piac:'Piacok', egyeb:'Termelői helyek' };
const PROFIL = { pizza:'Pizza', grill:'Grill', teszta:'Tészta', helyi_konyha:'Helyi konyha', kave_desszert:'Kávé & desszert', gyors:'Gyors', tengeri:'Tengeri', etterem_altalanos:'Étterem' };
const KEDVELT_PROFIL = ['pizza','grill','teszta','helyi_konyha'];

let DATA = [];
let pos = null;               // aktuális pozíció
let favs = new Set(JSON.parse(localStorage.getItem('senj_favs') || '[]'));
let islandsOn = localStorage.getItem('senj_islands') === '1';
let map = null, markerLayer = null, mapFilter = 'mind';
let listState = null;         // aktuális listanézet paraméterei
let currentSheetId = null;
let currentNavState = null;
let navDepth = 0, navEpoch = 0;
let navReady = false, applyingNav = false;
let scrollSaveTimer = null;

/* ---------- segédek ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function haversine(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180) * Math.cos(b.lat*Math.PI/180) * Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function distOf(p) {
  const from = pos || SENJ;
  if (p.lat != null) return haversine(from, { lat: p.lat, lng: p.lng });
  return p.tav_km != null ? p.tav_km + (pos ? haversine(pos, SENJ) * 0 : 0) : null; // koordináta nélkül: Senj-távolság becslésként
}
function kmTxt(d) { return d == null ? '' : (d < 10 ? d.toFixed(1) : Math.round(d)) + ' km'; }
function stars(v) { const f = Math.round(v); return '★'.repeat(f) + '☆'.repeat(5 - f); }
function datumTxt(d) {
  if (!d) return '';
  const [y, m] = d.split('-');
  const ho = ['','januári','februári','márciusi','áprilisi','májusi','júniusi','júliusi','augusztusi','szeptemberi','októberi','novemberi','decemberi'][+m];
  return `${y}. ${ho} állapot`;
}
function visible(p) { return islandsOn || !p.sziget_extra; }
function isReco(p) {
  if (p.kat !== 'etterem') return false;
  const prof = p.etel_profil || [];
  if (!prof.some(x => KEDVELT_PROFIL.includes(x))) return false;
  const r = p.ertekeles?.rating?.value;
  const top = (p.ertekeles?.cimkek || []).includes('top_rated') || (p.ertekeles?.cimkek || []).includes('well_rated');
  return (r != null && r >= 4.2) || top;
}
function catIcon(p) {
  if (p.facettak?.includes('vilagitotorony')) return ICONS.torony;
  return ICONS[p.kat] || ICONS.praktikus;
}

/* ---------- helysor ---------- */
function placeRow(p) {
  const c = CAT[p.kat];
  const d = distOf(p);
  const r = p.ertekeles?.rating?.value;
  const badges =
    (isReco(p) ? '<span class="badge reco">Neked ajánlott</span>' : '') +
    (p.jelzok.komp ? '<span class="badge komp">komp</span>' : '') +
    (p.jelzok.hegyi_szezonalis ? '<span class="badge hegy">hegyi</span>' : '');
  return `<button class="place" data-id="${p.id}" style="width:100%;background:none;border:none;color:inherit;text-align:left">
    <span class="dot" style="background:${c.bg};color:${c.szin}"><svg viewBox="0 0 24 24">${catIcon(p)}</svg></span>
    <span class="mid"><b>${esc(p.nev)}</b><span class="sub">${badges}${esc(p.zona)}</span></span>
    <span class="right"><span class="km">${kmTxt(d)}</span>${r ? `<div class="star">★ ${r}</div>` : ''}</span>
  </button>`;
}
function renderRows(el, arr, empty) {
  el.innerHTML = arr.length ? arr.map(placeRow).join('') : `<div class="empty">${empty || 'Nincs találat.'}</div>`;
}
function sortByDist(arr) { return [...arr].sort((a, b) => (distOf(a) ?? 9e9) - (distOf(b) ?? 9e9)); }

/* ---------- FELFEDEZÉS ---------- */
function renderHome() {
  const vis = DATA.filter(visible);
  $('#catgrid').innerHTML = Object.entries(CAT).map(([k, c]) => {
    const n = vis.filter(p => p.kat === k).length;
    return `<button class="catcard" data-cat="${k}">
      <span class="cic" style="background:${c.bg};color:${c.szin}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></span>
      <b>${c.nev}</b><span>${n} hely</span></button>`;
  }).join('');

  const reco = sortByDist(vis.filter(isReco)).sort((a, b) => (b.ertekeles?.rating?.value ?? 0) - (a.ertekeles?.rating?.value ?? 0)).slice(0, 10);
  $('#reco').innerHTML = reco.map(p => {
    const r = p.ertekeles?.rating;
    return `<button class="recocard" data-id="${p.id}">
      <b>${esc(p.nev)}</b>
      <span class="sub">${esc(p.zona)} · ${kmTxt(distOf(p))}</span>
      <span class="sub" style="color:var(--amber)">${r?.value ? `★ ${r.value}` : ''}${r?.count ? ` · ${r.count} vélemény` : ''}</span>
      <span class="sub">${(p.etel_profil || []).filter(x => x !== 'etterem_altalanos').map(x => PROFIL[x]).join(' · ')}</span>
    </button>`;
  }).join('') || '<div class="empty" style="min-width:100%">Nincs elérhető ajánlat.</div>';

  $('#nearhint').textContent = pos ? 'a jelenlegi helyedtől' : 'Senj központjától';
  renderRows($('#nearlist'), sortByDist(vis.filter(p => p.lat != null)).slice(0, 6));
}

/* ---------- LISTA nézet ---------- */
function openList(state) {
  const source = document.querySelector('.bottomnav button.active')?.dataset.tab || 'home';
  const nextList = { chip: 'mind', source, ...state };
  navigateTo({ screen: 'list', list: nextList, scrollY: 0 });
}
function listChipDefs() {
  const s = listState;
  if (s.tipus === 'cat' && s.cat === 'etterem')
    return [['mind','Mind'],['pizza','Pizza'],['grill','Grill'],['teszta','Tészta'],['helyi_konyha','Helyi konyha'],['kave_desszert','Kávé & desszert'],['reco','Neked ajánlott']];
  if (s.tipus === 'cat' && s.cat === 'praktikus')
    return [['mind','Mind'], ...Object.entries(PRAKT)];
  if (s.tipus === 'cat' && s.cat === 'kilato_foto')
    return [['mind','Mind'],['vilagitotorony','Világítótornyok'],['naplemente','Naplemente'],['fotos_hely','Fotós helyek']];
  if (s.tipus === 'cat' && s.cat === 'strand')
    return [['mind','Mind'],['navig','Egy koppintás oda'],['csendes','Csendesebb']];
  return [['mind','Mind']];
}
function listItems() {
  const s = listState;
  let arr = DATA.filter(visible);
  if (s.tipus === 'cat') arr = arr.filter(p => p.kat === s.cat);
  if (s.tipus === 'coll') {
    const coll = COLLS.find(c => c.id === s.coll);
    arr = coll ? arr.filter(coll.szuro) : [];
  }
  const c = s.chip;
  if (c && c !== 'mind') {
    if (c === 'reco') arr = arr.filter(isReco);
    else if (c === 'navig') arr = arr.filter(p => p.lat != null);
    else if (c === 'csendes') arr = arr.filter(p => p.ertekeles?.zsufoltsag === 'alacsony' || (p.ertekeles?.cimkek || []).some(t => t.startsWith('low_crowds')));
    else if (PRAKT[c]) arr = arr.filter(p => p.praktikus_tipus === c);
    else if (PROFIL[c]) arr = arr.filter(p => (p.etel_profil || []).includes(c));
    else arr = arr.filter(p => (p.facettak || []).includes(c));
  }
  arr = sortByDist(arr);
  if (s.tipus === 'cat' && s.cat === 'etterem') {
    const pref = arr.filter(p => !((p.etel_profil || []).includes('tengeri') && !(p.etel_profil || []).some(x => KEDVELT_PROFIL.includes(x))));
    const rest = arr.filter(p => !pref.includes(p));
    arr = [...pref, ...rest]; // tengeri-központú helyek a lista végére
  }
  return arr;
}
function renderList() {
  const defs = listChipDefs();
  $('#listchips').innerHTML = defs.map(([k, l]) =>
    `<button class="chip ${listState.chip === k ? 'on' : ''}" data-chip="${k}">${l}</button>`).join('');
  renderRows($('#listbody'), listItems());
}

/* ---------- GYŰJTEMÉNYEK ---------- */
const COLLS = [
  { id:'torony', cim:'Világítótornyok', sub:'Fények a Kvarner fölött', ic:ICONS.torony, szin:'var(--amber)', bg:'rgba(255,180,84,.14)', szuro: p => p.facettak?.includes('vilagitotorony') },
  { id:'nap', cim:'Naplemente', sub:'Az esti órák legszebb pontjai', ic:ICONS.nap, szin:'var(--amber)', bg:'rgba(255,180,84,.14)', szuro: p => p.facettak?.includes('naplemente') },
  { id:'foto', cim:'Fotós helyek', sub:'Panorámák és képeslap-nézetek', ic:ICONS.foto, szin:'var(--c-praktikus)', bg:'rgba(167,139,250,.14)', szuro: p => p.facettak?.includes('fotos_hely') },
  { id:'reco', cim:'Neked ajánlott éttermek', sub:'Grill, pizza, tészta — jól értékelve', ic:ICONS.reco, szin:'var(--c-etterem)', bg:'rgba(251,113,133,.14)', szuro: isReco },
  { id:'csend', cim:'Csendesebb strandok', sub:'Ahol főszezonban is van hely', ic:ICONS.csend, szin:'var(--accent)', bg:'rgba(55,211,192,.14)', szuro: p => p.kat === 'strand' && (p.ertekeles?.zsufoltsag === 'alacsony' || (p.ertekeles?.cimkek || []).some(t => t.startsWith('low_crowds'))) },
];
function renderColls() {
  const vis = DATA.filter(visible);
  $('#collbody').innerHTML = COLLS.map(c => `
    <button class="collcard" data-coll="${c.id}">
      <span class="cic" style="background:${c.bg};color:${c.szin}"><svg viewBox="0 0 24 24">${c.ic}</svg></span>
      <span><b>${c.cim}</b><span>${c.sub}</span></span>
      <span class="cnt">${vis.filter(c.szuro).length}</span>
    </button>`).join('');
}

/* ---------- KEDVENCEK ---------- */
function renderFavs() {
  const arr = sortByDist(DATA.filter(p => favs.has(p.id)));
  renderRows($('#favbody'), arr, 'Még nincsenek kedvenceid.<br>A helyek adatlapján a szív gombbal mentheted őket.');
}
function toggleFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  localStorage.setItem('senj_favs', JSON.stringify([...favs]));
}

/* ---------- ADATLAP ---------- */
function openSheet(id) {
  if (!DATA.some(x => x.id === id)) return;
  const underlay = captureNavState();
  delete underlay.sheetId;
  delete underlay.underlay;
  navigateTo({ ...underlay, sheetId: id, underlay });
}
function renderSheet(id) {
  const p = DATA.find(x => x.id === id);
  if (!p) return;
  currentSheetId = id;
  const c = CAT[p.kat];
  const d = distOf(p);
  const e = p.ertekeles;
  let html = `<h2>${esc(p.nev)}</h2>
    <button class="favbtn ${favs.has(id) ? 'on' : ''}" id="sheetfav">${favs.has(id) ? '♥' : '♡'}</button>
    <div class="metachips">
      <span class="mchip cat" style="color:${c.szin}">${c.nev}</span>
      <span class="mchip">${esc(p.zona)}</span>
      ${d != null ? `<span class="mchip km">${kmTxt(d)}${pos ? ' tőled' : ' Senjtől'}</span>` : ''}
      ${isReco(p) ? '<span class="mchip" style="color:var(--amber)">Neked ajánlott</span>' : ''}
    </div>`;

  if (p.utvonal_figyelmeztetes) html += `<div class="callout">⚠️ <span>${esc(p.utvonal_figyelmeztetes)}</span></div>`;
  if (p.szezon_jegyzet) html += `<div class="callout">🏔 <span>${esc(p.szezon_jegyzet)}</span></div>`;
  if (p.megkozelites_jegyzet) html += `<div class="callout info">🥾 <span>${esc(p.megkozelites_jegyzet)}</span></div>`;
  if (p.foto_jegyzet) html += `<div class="callout photo">📷 <span>${esc(p.foto_jegyzet)}</span></div>`;

  if (e) {
    const r = e.rating;
    html += `<div class="ratingblock">`;
    if (r?.value) {
      html += `<div class="rrow"><span class="rval">${r.value}</span><span class="rstars">${stars(r.value)}</span>
        <span class="rmeta">${r.count ? r.count + ' vélemény' : ''}${r.rank ? ' · ' + esc(r.rank) : ''}${r.source ? ' · ' + esc(cap(r.source)) : ''}</span></div>`;
    }
    if (e.zsufoltsag) html += `<span class="crowd ${e.zsufoltsag}">Zsúfoltság: ${e.zsufoltsag}</span>`;
    if (e.jelek_hu?.length) html += `<ul class="signals">${e.jelek_hu.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
    html += `<span class="rdate">${datumTxtSafe(e)}</span></div>`;
  }

  const tags = (p.cimkek || []).slice(0, 8);
  if (tags.length) html += `<div class="tagrow">${tags.map(esc).join(' · ')}</div>`;

  const navUrl = p.utvonal_url || p.kereses_url;
  html += `<div class="actions">
    <a class="btn" href="${navUrl}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M12 2 4.5 21 12 17l7.5 4z" fill="currentColor"/></svg>
      Útvonal indítása</a>
    ${p.lat != null ? `<button class="btn sec" id="sheetmap">Térképen</button>` : ''}
  </div>`;

  $('#sheetbody').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  $('#sheetback').classList.remove('hidden');
  $('#sheetfav').onclick = () => { toggleFav(id); renderSheet(id); renderFavs(); saveCurrentNav(); };
  const mbtn = $('#sheetmap');
  if (mbtn) mbtn.onclick = () => openMapFromSheet(p);
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function datumTxtSafe(e) {
  const d = e.rating?.captured_at || e.datum;
  return d ? datumTxt(d) : '';
}
function hideSheet() {
  currentSheetId = null;
  $('#sheet').classList.add('hidden');
  $('#sheetback').classList.add('hidden');
}
function closeSheet() {
  if (currentSheetId && navReady && navDepth > 0) history.back();
  else hideSheet();
}

/* ---------- TÉRKÉP ---------- */
function initMap() {
  if (map) return;
  map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([44.95, 14.9], 10);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap, © CARTO', maxZoom: 18,
  }).addTo(map).on('tileerror', () => { if (!navigator.onLine) $('#mapoffline').classList.remove('hidden'); });
  markerLayer = L.layerGroup().addTo(map);
  if (pos) L.circleMarker([pos.lat, pos.lng], { radius: 7, color: '#fff', weight: 2, fillColor: '#37d3c0', fillOpacity: 1 }).addTo(map);
  map.on('moveend', () => { if (navReady && !applyingNav) saveCurrentNav(); });
  renderMarkers();
}
const MAPSZIN = { strand:'#38bdf8', kilato_foto:'#ffb454', etterem:'#fb7185', praktikus:'#a78bfa' };
function renderMarkers() {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  DATA.filter(p => p.lat != null && visible(p) && (mapFilter === 'mind' || p.kat === mapFilter)).forEach(p => {
    L.circleMarker([p.lat, p.lng], {
      radius: 8, color: '#0a0c0f', weight: 2, fillColor: MAPSZIN[p.kat], fillOpacity: .95,
    }).addTo(markerLayer).on('click', () => openSheet(p.id));
  });
}
function focusOnMap(p) { initMap(); map.setView([p.lat, p.lng], 14); openSheet(p.id); }
function openMapFromSheet(p) {
  const origin = captureNavState();
  saveCurrentNav(origin);
  navigateTo({
    screen: 'map',
    mapFilter,
    mapView: { lat: p.lat, lng: p.lng, zoom: 14 },
    sheetId: p.id,
    underlay: origin,
    scrollY: 0,
  });
}
function renderMapChips() {
  const defs = [['mind','Mind'], ...Object.entries(CAT).map(([k, c]) => [k, c.nev])];
  $('#mapchips').innerHTML = defs.map(([k, l]) =>
    `<button class="chip ${mapFilter === k ? 'on' : ''}" data-mapchip="${k}">${l}</button>`).join('');
}

/* ---------- KERESÉS ---------- */
function runSearch(q) {
  const nq = norm(q.trim());
  const wrap = $('.searchwrap');
  if (!nq) {
    wrap.classList.remove('hasq');
    $('#search-results').classList.add('hidden');
    $('#home-content').classList.remove('hidden');
    return;
  }
  wrap.classList.add('hasq');
  const hits = sortByDist(DATA.filter(visible).filter(p =>
    norm(p.nev).includes(nq) || norm(p.zona).includes(nq) || (p.cimkek || []).some(t => norm(t).includes(nq))
  )).slice(0, 40);
  $('#home-content').classList.add('hidden');
  const res = $('#search-results');
  res.classList.remove('hidden');
  res.innerHTML = `<div class="reshead">${hits.length} találat</div>` +
    (hits.map(placeRow).join('') || '<div class="empty">Nincs találat. Próbáld másképp — pl. „pizza", „naplemente", „Krk".</div>');
}
function handleSearchInput(q) {
  const hasQuery = !!norm(q.trim());
  const wasSearching = !!norm(currentNavState?.search || '');
  if (!navReady) return runSearch(q);
  if (hasQuery && !wasSearching) {
    saveCurrentNav({ ...(currentNavState || { screen: 'home' }), search: '', scrollY: window.scrollY || 0 });
    navigateTo({ screen: 'home', search: q, scrollY: 0 }, { preserveCurrent: false });
  } else if (hasQuery) {
    runSearch(q);
    saveCurrentNav({ ...captureNavState(), search: q });
  } else if (wasSearching && navDepth > 0) {
    history.back();
  } else {
    runSearch('');
    saveCurrentNav({ screen: 'home', search: '', scrollY: 0 });
  }
}

/* ---------- nézetváltás ---------- */
function setActiveTab(t) {
  document.querySelectorAll('.bottomnav button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === t));
}
function showView(v, keepTab) {
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  $('#view-' + v).classList.add('active');
  if (!keepTab) setActiveTab(v);
  window.scrollTo(0, 0);
}
function renderTab(t) {
  hideSheet();
  showView(t);
  if (t === 'map') { initMap(); renderMapChips(); setTimeout(() => map.invalidateSize(), 60); if (!navigator.onLine) $('#mapoffline').classList.remove('hidden'); }
  if (t === 'fav') renderFavs();
  if (t === 'coll') renderColls();
  if (t === 'home') renderHome();
}
function cleanNavState(state) {
  let s;
  try { s = JSON.parse(JSON.stringify(state || {})); } catch (err) { s = {}; }
  if (!['home','map','coll','fav','list'].includes(s.screen)) s = { screen: 'home' };
  if (s.screen === 'list' && !s.list) s = { screen: 'home' };
  if (s.sheetId && !DATA.some(p => p.id === s.sheetId)) {
    return cleanNavState(s.underlay || { screen: s.screen, list: s.list, mapFilter: s.mapFilter });
  }
  s.scrollY = Number.isFinite(s.scrollY) ? Math.max(0, s.scrollY) : 0;
  return s;
}
function captureNavState() {
  const active = document.querySelector('.view.active')?.id?.replace('view-', '') || 'home';
  const state = { screen: active, scrollY: window.scrollY || 0 };
  if (active === 'list' && listState) state.list = { ...listState };
  if (active === 'home') state.search = $('#search').value;
  if (active === 'map') {
    state.mapFilter = mapFilter;
    if (map) {
      const center = map.getCenter();
      state.mapView = { lat: center.lat, lng: center.lng, zoom: map.getZoom() };
    }
  }
  if (currentSheetId) {
    state.sheetId = currentSheetId;
    if (currentNavState?.sheetId === currentSheetId && currentNavState.underlay)
      state.underlay = currentNavState.underlay;
  }
  return cleanNavState(state);
}
function persistNavState(state) {
  localStorage.setItem('senj_nav_state', JSON.stringify(cleanNavState(state)));
}
function saveCurrentNav(state = captureNavState()) {
  if (!navReady) return;
  const clean = cleanNavState(state);
  currentNavState = clean;
  history.replaceState({ senj: true, epoch: navEpoch, depth: navDepth, nav: clean }, '', location.href);
  persistNavState(clean);
}
function applyNavState(state) {
  const clean = cleanNavState(state);
  applyingNav = true;
  hideSheet();

  if (clean.screen === 'list') {
    listState = { chip: 'mind', source: 'home', ...clean.list };
    $('#listtitle').textContent = listState.cim || 'Helyek';
    renderList();
    showView('list', true);
    setActiveTab(listState.source || 'home');
  } else if (clean.screen === 'home') {
    renderTab('home');
    $('#search').value = clean.search || '';
    runSearch(clean.search || '');
  } else {
    renderTab(clean.screen);
  }

  if (clean.screen === 'map') {
    mapFilter = clean.mapFilter || 'mind';
    renderMapChips();
    renderMarkers();
    const mv = clean.mapView;
    if (mv && Number.isFinite(mv.lat) && Number.isFinite(mv.lng) && Number.isFinite(mv.zoom))
      map.setView([mv.lat, mv.lng], mv.zoom);
    setTimeout(() => map.invalidateSize(), 60);
  }
  if (clean.sheetId) renderSheet(clean.sheetId);

  currentNavState = clean;
  persistNavState(clean);
  requestAnimationFrame(() => window.scrollTo(0, clean.scrollY || 0));
  applyingNav = false;
}
function navigateTo(state, { preserveCurrent = true } = {}) {
  if (!navReady) return applyNavState(state);
  if (preserveCurrent) saveCurrentNav();
  const clean = cleanNavState(state);
  navDepth += 1;
  currentNavState = clean;
  history.pushState({ senj: true, epoch: navEpoch, depth: navDepth, nav: clean }, '', location.href);
  applyNavState(clean);
}
function showTab(t) {
  if (!['home','map','coll','fav'].includes(t)) return;
  navEpoch += 1;
  navDepth = 0;
  const next = { screen: t, scrollY: 0 };
  currentNavState = next;
  history.replaceState({ senj: true, epoch: navEpoch, depth: 0, nav: next }, '', location.href);
  applyNavState(next);
}
function isInternalNav(state) {
  return state.screen === 'list' || !!norm(state.search || '') || !!state.sheetId;
}
function initNavigation() {
  let restored = null;
  try { restored = cleanNavState(JSON.parse(localStorage.getItem('senj_nav_state') || 'null')); } catch (err) {}
  const home = { screen: 'home', search: '', scrollY: 0 };
  navEpoch = Date.now();
  history.replaceState({ senj: true, guard: true, epoch: navEpoch, depth: -1 }, '', location.href);
  history.pushState({ senj: true, epoch: navEpoch, depth: 0, nav: isInternalNav(restored || home) ? home : (restored || home) }, '', location.href);
  navDepth = 0;
  navReady = true;
  if (restored && isInternalNav(restored)) {
    navDepth = 1;
    history.pushState({ senj: true, epoch: navEpoch, depth: 1, nav: restored }, '', location.href);
    applyNavState(restored);
  } else {
    applyNavState(restored || home);
  }
}
window.addEventListener('popstate', e => {
  if (!navReady) return;
  const h = e.state;
  if (!h?.senj || h.guard || h.epoch !== navEpoch) {
    history.forward();
    return;
  }
  navDepth = h.depth || 0;
  applyNavState(h.nav || { screen: 'home' });
});

/* ---------- események ---------- */
document.addEventListener('click', e => {
  const nav = e.target.closest('.bottomnav button');
  if (nav) return showTab(nav.dataset.tab);
  const goto = e.target.closest('[data-goto]');
  if (goto) return showTab(goto.dataset.goto);
  const cat = e.target.closest('[data-cat]');
  if (cat) return openList({ tipus: 'cat', cat: cat.dataset.cat, cim: CAT[cat.dataset.cat].nev });
  const coll = e.target.closest('[data-coll]');
  if (coll) { const c = COLLS.find(x => x.id === coll.dataset.coll); return openList({ tipus: 'coll', coll: c.id, cim: c.cim }); }
  const chip = e.target.closest('[data-chip]');
  if (chip) { listState.chip = chip.dataset.chip; renderList(); saveCurrentNav(); return; }
  const mchip = e.target.closest('[data-mapchip]');
  if (mchip) { mapFilter = mchip.dataset.mapchip; renderMapChips(); renderMarkers(); saveCurrentNav(); return; }
  const pl = e.target.closest('[data-id]');
  if (pl) return openSheet(pl.dataset.id);
});
$('#listback').onclick = () => { if (navDepth > 0) history.back(); };
$('#sheetback').onclick = closeSheet;
$('#sheet').addEventListener('touchstart', e => { window._ty = e.touches[0].clientY; }, { passive: true });
$('#sheet').addEventListener('touchend', e => {
  if ($('#sheet').scrollTop <= 0 && e.changedTouches[0].clientY - (window._ty || 0) > 90) closeSheet();
}, { passive: true });
$('#search').addEventListener('input', e => handleSearchInput(e.target.value));
$('#searchclear').onclick = () => { $('#search').value = ''; handleSearchInput(''); };
$('#islands').checked = islandsOn;
$('#islands').addEventListener('change', e => {
  islandsOn = e.target.checked;
  localStorage.setItem('senj_islands', islandsOn ? '1' : '0');
  renderHome(); renderColls(); renderMarkers();
  if (listState) renderList();
  saveCurrentNav();
});
window.addEventListener('scroll', () => {
  clearTimeout(scrollSaveTimer);
  scrollSaveTimer = setTimeout(() => { if (navReady && !applyingNav) saveCurrentNav(); }, 120);
}, { passive: true });

/* ---------- telepítési tipp (iOS) ---------- */
(function installTip() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!standalone && isIOS && !localStorage.getItem('senj_tip_ok')) {
    setTimeout(() => $('#installtip').classList.remove('hidden'), 2500);
  }
  $('#installdismiss').onclick = () => { $('#installtip').classList.add('hidden'); localStorage.setItem('senj_tip_ok', '1'); };
})();

/* ---------- indulás ---------- */
async function boot() {
  try {
    const resp = await fetch('data.json');
    DATA = (await resp.json()).helyek;
  } catch (err) {
    $('#home-content').innerHTML = '<div class="empty">Nem sikerült betölteni a helyeket.<br>Ellenőrizd a kapcsolatot, majd frissítsd az oldalt.</div>';
    return;
  }
  initNavigation();
  navigator.geolocation?.getCurrentPosition(
    g => {
      pos = { lat: g.coords.latitude, lng: g.coords.longitude };
      renderHome();
      if (currentNavState?.search) runSearch(currentNavState.search);
      if (listState) renderList();
      if (map && !map._posDot) { }
    },
    () => {}, { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
  );
}
boot();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => {});

/* Senj útikalauz — alkalmazáslogika */
'use strict';

const SENJ = { lat: 44.9896, lng: 14.9058 }; // Senj központ (tartalék, ha nincs helymeghatározás)
const CAT = {
  strand:     { nev: 'Strandok',            szin: 'var(--c-strand)',    bg: 'rgba(0,127,123,.12)' },
  kilato_foto:{ nev: 'Kilátók és fotóhelyek', szin: 'var(--amber-ink)',  bg: 'rgba(233,169,35,.14)' },
  etterem:    { nev: 'Éttermek',             szin: 'var(--c-etterem)',  bg: 'rgba(233,93,93,.12)' },
  praktikus:  { nev: 'Praktikus',            szin: 'var(--c-praktikus)',bg: 'rgba(132,120,196,.14)' },
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
const PRAKT = { bolt:'Boltok', pekseg:'Pékségek', gyogyszertar:'Gyógyszertár', drogeria:'Drogéria', benzinkut:'Benzinkutak', piac:'Piacok', egyeb:'Termelői helyek' };
const PROFIL = { pizza:'Pizza', grill:'Grill', teszta:'Tészta', helyi_konyha:'Helyi konyha', kave_desszert:'Kávé & desszert', gyors:'Gyors', tengeri:'Tengeri', etterem_altalanos:'Étterem' };
const FACET = { vilagitotorony:'Világítótornyok', naplemente:'Naplemente', fotos_hely:'Fotós helyek' };
const KEDVELT_PROFIL = ['pizza','grill','teszta','helyi_konyha'];
const FALUSI_STRAND_ZONAK = ['sveti juraj','lukovo','klada','starigrad','bunica','vratarusa','ujca','planikovac','sibinj','smokvica','klenovica','povile','stinica','jablanac','cesarica','ribarica','metajna','karlobag','lopar','stara baska'];

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (err) {
    return [];
  }
}
function readStoredObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (err) {
    return {};
  }
}

let DATA = [];
let pos = null;               // aktuális pozíció
let favs = new Set(readStoredArray('senj_favs'));
let islandsOn = localStorage.getItem('senj_islands') === '1';
let listState = null;         // aktuális listanézet paraméterei
let currentSheetId = null;
let currentNavState = null;
let navDepth = 0, navEpoch = 0;
let navReady = false, applyingNav = false;
let scrollSaveTimer = null;
let sheetOpener = null, pendingSheetOpener = null, highwayOpener = null;

/* ---------- segédek ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function panelFocusables(panel) {
  return [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length);
}
function focusPanel(panel) {
  requestAnimationFrame(() => (panelFocusables(panel)[0] || panel).focus());
}
function restoreFocus(opener) {
  requestAnimationFrame(() => {
    if (opener instanceof HTMLElement && opener.isConnected && !opener.closest('.hidden')) opener.focus();
  });
}
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
function publicTags(p) { return [...(p.cimkek_publikus || []), ...(p.cimkek || [])].map(norm); }
function isCityBeach(p) { return p.kat === 'strand' && publicTags(p).includes('varosi strand'); }
function isVillageBeach(p) {
  return p.kat === 'strand' && (publicTags(p).includes('falusi strand') || FALUSI_STRAND_ZONAK.some(z => norm(p.zona).includes(z)));
}
function isCoveBeach(p) { return p.kat === 'strand' && publicTags(p).some(t => t.includes('obol')); }
function isPhotoSpot(p) { return (p.facettak || []).some(f => f === 'fotos_hely' || f === 'vilagitotorony'); }
function isLargeShopping(p) {
  return p.praktikus_tipus === 'bolt' && (publicTags(p).includes('nagy bevasarlashoz') || /\b(lidl|plodine|spar|tommy|konzum)\b/.test(norm(p.nev)));
}
function isSmallShopping(p) { return p.praktikus_tipus === 'bolt' && !isLargeShopping(p); }
function placeLabels(p) {
  const add = (labels, label) => { if (label && !labels.includes(label)) labels.push(label); };
  if (p.kat === 'etterem') {
    const profiles = new Set(p.etel_profil || []);
    const raw = publicTags(p);
    const labels = [];
    if (profiles.has('grill')) add(labels, 'Grill');
    if (raw.some(t => t.includes('husos etelek'))) add(labels, 'Húsos ételek');
    for (const [key, label] of [['pizza','Pizza'],['teszta','Tészta'],['helyi_konyha','Helyi konyha'],['tengeri','Tengeri'],['kave_desszert','Kávé & desszert']]) {
      if (profiles.has(key)) add(labels, label);
    }
    add(labels, profiles.has('gyors') ? 'Gyors' : 'Ráérős');
    return labels.slice(0, 3);
  }
  if (p.kat === 'praktikus') {
    const type = p.praktikus_tipus === 'bolt'
      ? (isLargeShopping(p) ? 'Nagy bevásárlás' : 'Kis bevásárlás')
      : ({ pekseg:'Pékség', gyogyszertar:'Gyógyszertár', drogeria:'Drogéria', benzinkut:'Benzinkút', piac:'Piac', egyeb:'Helyi termékek' }[p.praktikus_tipus] || 'Praktikus hely');
    const extras = (p.cimkek_publikus || []).filter(tag => {
      const t = norm(tag);
      return !['kisbolt','gyors bevasarlas','nagy bevasarlashoz','bevasarlas','gyogyszertar','pekseg','benzinkut','piac'].includes(t);
    });
    return [...new Set([type, ...extras])].slice(0, 3);
  }
  if (p.kat === 'strand') {
    const raw = publicTags(p), labels = [];
    if (isCoveBeach(p)) add(labels, 'Öböl');
    else if (isCityBeach(p)) add(labels, 'Városi strand');
    else if (isVillageBeach(p)) add(labels, 'Falusi strand');
    for (const [term, label] of [['homokos','Homokos'],['kavicsos','Kavicsos'],['sziklas','Sziklás'],['csaladbarat','Családbarát'],['csendes','Csendes'],['nyugodt','Nyugodt'],['snorkeling','Snorkeling'],['arnyekos','Árnyékos'],['naplemente','Naplemente']]) {
      if (raw.some(tag => tag.includes(term))) add(labels, label);
    }
    add(labels, 'Strand');
    return labels.slice(0, 3);
  }
  if (p.kat === 'kilato_foto') {
    const raw = publicTags(p), facets = p.facettak || [], labels = [];
    if (facets.includes('vilagitotorony')) add(labels, 'Világítótorony');
    if (facets.includes('naplemente')) add(labels, 'Naplemente');
    if (facets.includes('fotos_hely')) add(labels, 'Fotós hely');
    for (const [term, label] of [['kilatopont','Kilátópont'],['panorama','Panoráma'],['rovid seta','Rövid séta'],['tura','Túra'],['autoval elerheto','Autóval elérhető']]) {
      if (raw.some(tag => tag.includes(term))) add(labels, label);
    }
    add(labels, 'Kilátó');
    return labels.slice(0, 3);
  }
  return [CAT[p.kat]?.nev || 'Hely'];
}
function placeTags(p, className = 'placetags') {
  const labels = placeLabels(p);
  return labels.length ? `<span class="${className}">${labels.map(label => `<i>${esc(label)}</i>`).join('')}</span>` : '';
}
function catIcon(p) {
  if (p.facettak?.includes('vilagitotorony')) return ICONS.torony;
  return ICONS[p.kat] || ICONS.praktikus;
}
const PRAKT_TIPUS_KEP = { pekseg: 'images/categories/pekseg.webp', gyogyszertar: 'images/categories/pill.webp' };
function praktikusKep(p) {
  const nev = norm(p.nev);
  let src = 'images/categories/bolt.webp';
  if (/\bdm\b/.test(nev)) src = 'images/categories/dm.webp';
  else if (/\bbipa\b/.test(nev)) src = 'images/categories/bipa.webp';
  else if (PRAKT_TIPUS_KEP[p.praktikus_tipus]) src = PRAKT_TIPUS_KEP[p.praktikus_tipus];
  return { borito: src, belyegkep: src, alt_hu: p.nev };
}
function imageOf(p) {
  if (p.kat === 'etterem') return null;
  if (p.kat === 'praktikus') return praktikusKep(p);
  if (!p.kepek?.borito) return null;
  return p.kepek;
}

/* ---------- helysor ---------- */
function placeRow(p) {
  const c = CAT[p.kat];
  const d = distOf(p);
  const r = p.ertekeles?.rating?.value;
  const img = imageOf(p);
  const badges =
    (isReco(p) ? '<span class="badge reco">Neked ajánlott</span>' : '') +
    (p.jelzok.komp ? '<span class="badge komp">komp</span>' : '') +
    (p.jelzok.hegyi_szezonalis ? '<span class="badge hegy">hegyi</span>' : '') +
    (p.lat == null ? '<span class="badge nomap">nincs térképpont</span>' : '');
  const media = img
    ? `<span class="dot photo"><img src="${esc(img.belyegkep || img.borito)}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="dot" style="background:${c.bg};color:${c.szin}"><svg viewBox="0 0 24 24">${catIcon(p)}</svg></span>`;
  return `<button class="place cat-${p.kat}" data-id="${p.id}" style="width:100%;background:none;border:none;color:inherit;text-align:left">
    ${media}
    <span class="mid"><b>${esc(p.nev)}</b><span class="sub">${badges}${esc(p.zona)}</span>${placeTags(p)}</span>
    <span class="right"><span class="km">${kmTxt(d)}</span>${r ? `<div class="star">★ ${r}</div>` : ''}</span>
  </button>`;
}
function renderRows(el, arr, empty) {
  el.innerHTML = arr.length ? arr.map(placeRow).join('') : `<div class="empty">${empty || 'Nincs találat.'}</div>`;
}
function placeGridCard(p) {
  const img = imageOf(p);
  const media = img
    ? `<span class="gridmedia"><img src="${esc(img.belyegkep || img.borito)}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="gridmedia gridicon"><svg viewBox="0 0 24 24">${catIcon(p)}</svg></span>`;
  return `<button class="placegridcard cat-${p.kat}" data-id="${p.id}">
    ${media}<span class="gridcopy"><b>${esc(p.nev)}</b><span class="gridzone">${esc(p.zona)}</span>${placeTags(p, 'gridtags')}<span class="gridkm">${kmTxt(distOf(p))}</span></span>
  </button>`;
}
function sortByDist(arr) { return [...arr].sort((a, b) => (distOf(a) ?? 9e9) - (distOf(b) ?? 9e9)); }
function refreshPosition() {
  if (!navigator.geolocation) {
    renderNear();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    g => {
      pos = { lat: g.coords.latitude, lng: g.coords.longitude };
      renderHome();
      renderNear();
      if (listState) renderList();
    },
    () => { renderNear(); },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
  );
}

/* ---------- FELFEDEZÉS ---------- */
function renderHome() {
  const vis = DATA.filter(visible);
  $('#catgrid').innerHTML = Object.entries(CAT).map(([k, c]) => {
    const n = vis.filter(p => p.kat === k).length;
    return `<button class="catcard" data-cat="${k}" style="background-image:url('images/categories/${k}.webp')">
      <span class="catcard-scrim"></span>
      <span class="cic" style="background:${c.bg};color:${c.szin}"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></span>
      <span class="catcard-copy"><b>${c.nev}</b><span>${n} hely</span></span></button>`;
  }).join('');


}

/* ---------- KÖZELEMBEN ---------- */
function renderNear() {
  const body = $('#nearbody');
  if (!body) return;
  if (!pos) {
    body.innerHTML = `<section class="nearrequest"><b>Engedélyezd a helyzetedet</b><p>Így kategóriánként a valóban hozzád legközelebbi helyeket mutatom.</p><button class="btn" type="button" data-nearlocation>Helyzet frissítése</button></section>`;
    return;
  }
  const vis = DATA.filter(p => visible(p) && p.lat != null);
  body.innerHTML = Object.entries(CAT).map(([kat, cat]) => {
    const places = sortByDist(vis.filter(p => p.kat === kat)).slice(0, 3);
    return `<section class="nearsection">
      <div class="nearhead"><span class="nearlabel"><i style="background:${cat.bg};color:${cat.szin}"><svg viewBox="0 0 24 24">${ICONS[kat]}</svg></i>${cat.nev}</span><small>${places.length} legközelebbi</small></div>
      <div class="nearrows">${places.map(placeRow).join('') || '<div class="empty">Nincs térképponttal rendelkező hely.</div>'}</div>
    </section>`;
  }).join('');
}

/* ---------- LISTA nézet ---------- */
function openList(state) {
  const source = document.querySelector('.bottomnav button.active')?.dataset.tab || 'home';
  const nextList = { chip: 'mind', source, ...state };
  navigateTo({ screen: 'list', list: nextList, scrollY: 0 });
}
function listChipDefs() {
  const s = listState;
  if (s.tipus === 'terv') return [];
  if (s.tipus === 'cat' && s.cat === 'etterem')
    return [['mind','Mind'],['pizza','Pizza'],['grill','Grill'],['teszta','Tészta'],['helyi_konyha','Helyi konyha'],['kave_desszert','Kávé & desszert'],['reco','Neked ajánlott']];
  if (s.tipus === 'cat' && s.cat === 'praktikus')
    return [['mind','Mind'],['kis_bevasarlas','Kis bevásárlás'],['nagy_bevasarlas','Nagy bevásárlás'],['pekseg','Pékségek'],['gyogyszertar','Gyógyszertár'],['drogeria','Drogéria'],['benzinkut','Benzinkutak'],['piac','Piacok'],['egyeb','Termelői helyek']];
  if (s.tipus === 'cat' && s.cat === 'kilato_foto')
    return [['mind','Mind'],['naplemente','Naplemente'],['fotos_hely','Fotós helyek']];
  if (s.tipus === 'cat' && s.cat === 'strand')
    return [['mind','Mind'],['strand_varos','Városi strand'],['strand_falu','Falusi strand'],['strand_obol','Öböl']];
  return [['mind','Mind']];
}
function listItems() {
  const s = listState;
  if (s.tipus === 'terv') { return tervStopsFor(s.nap); }
  let arr = DATA.filter(visible);
  if (s.tipus === 'cat') arr = arr.filter(p => p.kat === s.cat);
  if (s.tipus === 'coll') {
    const coll = COLLS.find(c => c.id === s.coll);
    arr = coll ? arr.filter(coll.szuro) : [];
  }
  const c = s.chip;
  if (c && c !== 'mind') {
    if (c === 'reco') arr = arr.filter(isReco);
    else if (c === 'strand_varos') arr = arr.filter(isCityBeach);
    else if (c === 'strand_falu') arr = arr.filter(isVillageBeach);
    else if (c === 'strand_obol') arr = arr.filter(isCoveBeach);
    else if (c === 'kis_bevasarlas') arr = arr.filter(isSmallShopping);
    else if (c === 'nagy_bevasarlas') arr = arr.filter(isLargeShopping);
    else if (c === 'fotos_hely') arr = arr.filter(isPhotoSpot);
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
  const body = $('#listbody');
  body.classList.toggle('placegrid', listState.tipus === 'cat');
  if (listState.tipus === 'terv') {
    renderTervList();
    return;
  } else {
    const defs = listChipDefs();
    $('#listchips').innerHTML = defs.map(([k, l]) =>
      `<button class="chip ${listState.chip === k ? 'on' : ''}" data-chip="${k}">${l}</button>`).join('');
  }
  const items = listItems();
  if (listState.tipus === 'cat') {
    body.innerHTML = items.length ? items.map(placeGridCard).join('') : '<div class="empty">Nincs találat.</div>';
  } else {
    renderRows(body, items);
  }
}

/* ---------- GYŰJTEMÉNYEK ---------- */
const COLLS = [
  { id:'torony', cim:'Világítótornyok', sub:'Fények a Kvarner fölött', ic:ICONS.torony, szin:'var(--amber-ink)', bg:'rgba(233,169,35,.14)', szuro: p => p.facettak?.includes('vilagitotorony') },
  { id:'nap', cim:'Naplemente', sub:'Az esti órák legszebb pontjai', ic:ICONS.nap, szin:'var(--amber-ink)', bg:'rgba(233,169,35,.14)', szuro: p => p.facettak?.includes('naplemente') },
  { id:'foto', cim:'Fotós helyek', sub:'Panorámák és képeslap-nézetek', ic:ICONS.foto, szin:'var(--praktikus-ink)', bg:'rgba(132,120,196,.14)', szuro: p => p.facettak?.includes('fotos_hely') },
  { id:'reco', cim:'Neked ajánlott éttermek', sub:'Grill, pizza, tészta — jól értékelve', ic:ICONS.reco, szin:'var(--coral-ink)', bg:'rgba(233,93,93,.12)', szuro: isReco },
  { id:'csend', cim:'Csendesebb strandok', sub:'Ahol főszezonban is van hely', ic:ICONS.csend, szin:'var(--teal-ink)', bg:'rgba(0,127,123,.12)', szuro: p => p.kat === 'strand' && (p.ertekeles?.zsufoltsag === 'alacsony' || (p.ertekeles?.cimkek || []).some(t => t.startsWith('low_crowds'))) },
];

/* ---------- ÚTITERV (napi tervező) ---------- */
const NAPOK = ['hetfo', 'kedd', 'szerda', 'csutortok'];
const NAP_CIM = { hetfo: 'Hétfő', kedd: 'Kedd', szerda: 'Szerda', csutortok: 'Csütörtök' };
let tervDays = readStoredObject('senj_terv_days');
for (const nap of NAPOK) if (!Array.isArray(tervDays[nap])) tervDays[nap] = [];
function persistTervDays() {
  try { localStorage.setItem('senj_terv_days', JSON.stringify(tervDays)); } catch (err) {}
}
function tervStopsFor(nap) {
  const byId = new Map(DATA.map(p => [p.id, p]));
  return (tervDays[nap] || []).map(id => byId.get(id)).filter(p => p && visible(p));
}
function toggleTervDay(nap, id) {
  const arr = tervDays[nap];
  const i = arr.indexOf(id);
  if (i === -1) arr.push(id); else arr.splice(i, 1);
  persistTervDays();
}
function removeTervStop(nap, id) {
  tervDays[nap] = tervDays[nap].filter(x => x !== id);
  persistTervDays();
}
function dayCardHTML(nap) {
  const stops = tervStopsFor(nap);
  const perc = stops.reduce((s, p) => s + (p.tervezes?.latogatasi_ido_perc || 0), 0);
  const idol = perc ? ` · ~${idoTxt(perc)}` : '';
  const ic = stops.slice(0, 6).map(p =>
    `<span class="tstopic" style="color:${CAT[p.kat].szin};background:${CAT[p.kat].bg}"><svg viewBox="0 0 24 24">${catIcon(p)}</svg></span>`).join('');
  return `<button class="daycard" data-terv="${nap}">
    <div class="dayhead"><span class="daytitle"><b>${NAP_CIM[nap]}</b></span></div>
    ${stops.length ? `<div class="daystops">${ic}</div>` : ''}
    <div class="daymeta">${stops.length ? `${stops.length} hely${idol}` : 'Még nincs hozzáadva semmi'}</div>
  </button>`;
}
function renderTerv() {
  $('#tervbody').innerHTML = NAPOK.map(dayCardHTML).join('');
}
function tervStopRow(p, nap) {
  return `<div class="tervstop">${placeRow(p)}
    <button class="tervremove" type="button" data-tervremove="${esc(p.id)}" data-tervremoveday="${nap}" aria-label="${esc(p.nev)} eltávolítása erről a napról">−</button></div>`;
}
function tervFavAdder(nap, stops) {
  const ids = new Set(stops.map(p => p.id));
  const available = sortByDist(DATA.filter(p => favs.has(p.id) && visible(p) && !ids.has(p.id)));
  if (!available.length) return `<section class="tervfavs"><b>Mentett helyek</b><p>Nincs hozzáadható mentett hely. A Böngészőben az adatlap szív gombjával ments helyeket.</p></section>`;
  return `<details class="tervfavs"><summary>Mentett hely hozzáadása (${available.length})</summary><div class="tervfavlist">${available.map(p =>
    `<button type="button" class="tervfav" data-tervadd="${esc(p.id)}" data-tervaddday="${nap}"><span><b>${esc(p.nev)}</b><small>${esc(p.zona)}</small>${placeTags(p)}</span><i>+</i></button>`).join('')}</div></details>`;
}
function renderTervList() {
  const nap = listState.nap;
  const stops = tervStopsFor(nap);
  $('#listchips').innerHTML = '';
  $('#listbody').innerHTML =
    (stops.length ? stops.map(p => tervStopRow(p, nap)).join('') : '<div class="empty">Nincs még hely ezen a napon. Keress rá valamire, vagy nyisd meg a Gyűjtőt, és onnan add hozzá.</div>') +
    tervFavAdder(nap, stops);
}

/* ---------- KEDVENCEK ---------- */
function renderFavs() {
  const arr = sortByDist(DATA.filter(p => favs.has(p.id)));
  renderRows($('#favbody'), arr, 'Még nincsenek kedvenceid.<br>A helyek adatlapján a szív gombbal mentheted őket.');
}
function toggleFav(id) {
  favs.has(id) ? favs.delete(id) : favs.add(id);
  try { localStorage.setItem('senj_favs', JSON.stringify([...favs])); } catch (err) {}
}

/* ---------- ADATLAP ---------- */
function openSheet(id, opener) {
  if (!DATA.some(x => x.id === id)) return;
  pendingSheetOpener = opener || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const underlay = captureNavState();
  delete underlay.sheetId;
  delete underlay.underlay;
  navigateTo({ ...underlay, sheetId: id, underlay });
}
/* stat-csempe + szolgáltatás ikonok és származtatás */
const SIC = {
  pin:'<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/>',
  car:'<path d="M6 11l1.6-4A2 2 0 0 1 9.5 6h5a2 2 0 0 1 1.9 1.3L18 11M4 11h16v6H4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="17.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="17.5" r="1.5" fill="currentColor"/>',
  clock:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  star:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 5.9L12 16.9 6.7 19.3l1.2-5.9L3.4 9.3l6-.7z" fill="currentColor"/>',
  ticket:'<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M13 6.5v11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="1.5 3"/>',
  hike:'<circle cx="13.5" cy="5" r="1.7" fill="currentColor"/><path d="M12 21l1.2-5.5-2.7-2.2L11.5 9l3 2.2 2.3.9M10.8 13.3 8.5 21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  wave:'<path d="M3 9c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0M3 15c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
};
const AIC = {
  park:'<rect x="4" y="4" width="16" height="16" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9.5 17V7.5h3a2.75 2.75 0 0 1 0 5.5h-3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  cup:'<path d="M5 8h11v3.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M16 9h2.2a2 2 0 0 1 0 4H16M4.5 20h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  shower:'<path d="M4 12h16M12 12V7.5a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8 15.5v1.5M12 15.5v2.5M16 15.5v1.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  mask:'<path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h7A2.5 2.5 0 0 1 16 9.5v1A4.5 4.5 0 0 1 11.5 15h-3A4.5 4.5 0 0 1 4 10.5z" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M16 10h1.5a2 2 0 0 1 2 2v6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  family:'<circle cx="8" cy="7" r="2.1" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="16" cy="8" r="1.7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 20v-3a4.5 4.5 0 0 1 9 0v3M13.5 20v-2.2a3.2 3.2 0 0 1 6.4 0V20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  boat:'<path d="M4.5 14h15l-2 5H6.5zM12 4v9M12 4.5l4.5 2.8L12 9.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  walk:'<circle cx="12.5" cy="4.5" r="1.7" fill="currentColor"/><path d="M12 8l-1.8 4 1.3 1.6V20M12 8l3 1.8 2.2 1M10.2 12 8 17.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
};
function idoTxt(m) { return m == null ? '' : (m >= 90 ? `${(m / 60).toFixed(1).replace('.0', '').replace('.', ',')} óra` : `${m} perc`); }
function beachType(p) {
  const tags = (p.cimkek || []).map(norm);
  for (const [k, l] of [['kavicsos', 'Kavicsos'], ['homokos', 'Homokos'], ['sziklas', 'Sziklás'], ['betonozott', 'Betonozott']])
    if (tags.some(x => x.includes(k))) return l;
  return null;
}
function statTiles(p, d, plan, e) {
  const out = [];
  if (p.lat != null && d != null) out.push({ ic: SIC.pin, val: kmTxt(d), lab: 'Távolság' });
  if (plan.autozas_senjbol_perc != null) out.push({ ic: SIC.car, val: `${plan.autozas_senjbol_perc} perc`, lab: 'Autóval' });
  if (plan.latogatasi_ido_perc != null) out.push({ ic: SIC.clock, val: idoTxt(plan.latogatasi_ido_perc), lab: 'Ott-lét' });
  if (e?.rating?.value != null) out.push({ ic: SIC.star, val: `${e.rating.value}`, lab: 'Értékelés' });
  if (plan.belepo_eur != null) out.push({ ic: SIC.ticket, val: plan.belepo_eur === 0 ? 'Ingyenes' : `${plan.belepo_eur} €`, lab: 'Belépő' });
  const part = beachType(p);
  if (out.length < 4 && part) out.push({ ic: SIC.wave, val: part, lab: 'Part' });
  const akt = AKTIVITAS[plan.aktivitas_szint];
  if (out.length < 4 && akt && (p.kat === 'strand' || p.kat === 'kilato_foto'))
    out.push({ ic: SIC.hike, val: akt, lab: 'Nehézség' });
  return out.slice(0, 4);
}
const AKTIVITAS = { konnyu: 'Könnyű', kozepes: 'Közepes', nehez: 'Nehéz' };
const HELYSZINI_PARKOLAS = /^(helyszini|uzleti|kemping|benzinkut|kilatoponti|trznica|zavizan|utvonal_kezdopont|biztonsagos)/;
function amenities(p, plan) {
  const has = s => (p.cimkek || []).some(x => norm(x).includes(s));
  const parkol = has('parkol') || HELYSZINI_PARKOLAS.test(plan.parkolas?.tipus || '');
  return [
    parkol && { ic: AIC.park, lab: 'Parkolás' },
    (has('bufe') || has('kave') || has('bisztro')) && { ic: AIC.cup, lab: 'Büfé' },
    has('zuhany') && { ic: AIC.shower, lab: 'Zuhany' },
    (has('vizisport') || has('kajak') || has('sup')) && { ic: AIC.wave, lab: 'Vízisport' },
    (has('snorkel') || has('buvar')) && { ic: AIC.mask, lab: 'Snorkeling' },
    has('csaladbarat') && { ic: AIC.family, lab: 'Családbarát' },
    (has('hajo') || has('csonak')) && { ic: AIC.boat, lab: 'Hajó' },
    has('gyalogos') && { ic: AIC.walk, lab: 'Gyalog' },
  ].filter(Boolean).slice(0, 6);
}
function renderSheet(id) {
  const p = DATA.find(x => x.id === id);
  if (!p) return;
  if (pendingSheetOpener) {
    sheetOpener = pendingSheetOpener;
    pendingSheetOpener = null;
  }
  currentSheetId = id;
  const c = CAT[p.kat];
  const d = distOf(p);
  const e = p.ertekeles;
  const img = imageOf(p);
  const plan = p.tervezes || {};
  const attrib = img ? (img.szerzo || (img.forras_oldal || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) : '';
  const hero = img ? `<div class="sheet-hero">
      <img src="${esc(img.borito)}" alt="${esc(img.alt_hu || p.nev)}" decoding="async">
      <div class="hero-grad"></div>
      ${attrib ? `<span class="hero-cap">${esc(attrib)}</span>` : ''}
      <span class="hero-dots"><i class="hdot on"></i></span>
    </div>` : '';
  const tiles = statTiles(p, d, plan, e);
  const amens = amenities(p, plan);
  const hivatalos = p.nev_hivatalos && p.nev_hivatalos !== p.nev
    ? `<div class="sheet-official">${esc(p.nev_hivatalos)}</div>` : '';
  let html = hero +
    `<h2 id="sheettitle">${esc(p.nev)}</h2>${hivatalos}
    <button class="favbtn ${favs.has(id) ? 'on' : ''}" id="sheetfav" aria-label="${favs.has(id) ? 'Eltávolítás a mentettek közül' : 'Mentés a kedvencek közé'}" aria-pressed="${favs.has(id)}">${favs.has(id) ? '♥' : '♡'}</button>
    <div class="metachips">
      <span class="mchip cat" style="color:${c.szin}">${c.nev}</span>
      <span class="mchip">${esc(p.zona)}</span>
      ${d != null ? `<span class="mchip km">${kmTxt(d)}${pos && p.lat != null ? ' tőled' : ' Senjtől'}</span>` : ''}
      ${p.lat == null ? '<span class="mchip nomap">Nincs térképpont</span>' : ''}
      ${isReco(p) ? '<span class="mchip" style="color:var(--amber)">Neked ajánlott</span>' : ''}
    </div>` +
    (tiles.length ? `<div class="stattiles">${tiles.map(tl =>
      `<div class="stat"><span class="stat-ic"><svg viewBox="0 0 24 24">${tl.ic}</svg></span><b>${esc(tl.val)}</b><span>${esc(tl.lab)}</span></div>`).join('')}</div>` : '') +
    (amens.length ? `<div class="amensec"><div class="amenhead">Szolgáltatások</div><div class="amenrow">${amens.map(a =>
      `<div class="amen"><span class="amen-ic"><svg viewBox="0 0 24 24">${a.ic}</svg></span><span>${esc(a.lab)}</span></div>`).join('')}</div></div>` : '');

  if (p.utvonal_figyelmeztetes) html += `<div class="callout">⚠️ <span>${esc(p.utvonal_figyelmeztetes)}</span></div>`;
  if (p.szezon_jegyzet) html += `<div class="callout">🏔 <span>${esc(p.szezon_jegyzet)}</span></div>`;
  if (p.megkozelites_jegyzet) html += `<div class="callout info">🥾 <span>${esc(p.megkozelites_jegyzet)}</span></div>`;
  if (p.foto_leiras) html += `<div class="callout photo">📷 <span>${esc(p.foto_leiras)}</span></div>`;

  if (e) {
    const r = e.rating;
    html += `<div class="ratingblock">`;
    if (r?.value) {
      html += `<div class="rrow"><span class="rval">${r.value}</span><span class="rstars">${stars(r.value)}</span>
        <span class="rmeta">${r.count ? r.count + ' vélemény' : ''}${r.rank ? ' · ' + esc(rankTxt(r.rank)) : ''}${r.source ? ' · ' + esc(r.source) : ''}</span></div>`;
    }
    if (e.zsufoltsag) html += `<span class="crowd ${e.zsufoltsag}">Zsúfoltság: ${e.zsufoltsag}</span>`;
    if (e.jelek_hu?.length) html += `<ul class="signals">${e.jelek_hu.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;
    html += `<span class="rdate">${datumTxtSafe(e)}</span></div>`;
  }

  const tags = (p.cimkek_publikus || []).slice(0, 6);
  if (tags.length) html += `<div class="tagrow">${tags.map(esc).join(' · ')}</div>`;

  const navUrl = p.utvonal_url || p.kereses_url;
  const tervChoices = NAPOK.map(nap => {
    const on = tervDays[nap].includes(p.id);
    return `<button type="button" class="sheetplanchoice ${on ? 'on' : ''}" data-sheettervadd="${nap}">
      <span>${NAP_CIM[nap]}</span><i>${on ? '✓' : '+'}</i></button>`;
  }).join('');
  html += `<div class="actions">
    <a class="btn" href="${navUrl}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M12 2 4.5 21 12 17l7.5 4z" fill="currentColor"/></svg>
      Útvonal Google Térképen</a>
    <button class="btn sec" id="sheetplan" type="button" aria-expanded="false" aria-controls="sheetplanchoices">Tervezőhöz adom</button>
  </div>`;
  html += `<section class="sheetplanchoices hidden" id="sheetplanchoices" aria-label="Nap kiválasztása">
    <b>Válassz napot</b><span id="sheetplanstatus" class="sheetplanstatus" role="status"></span>
    <div>${tervChoices}</div>
  </section>`;

  $('#sheetbody').innerHTML = html;
  $('#sheet').dataset.category = p.kat;
  $('#sheet').classList.remove('hidden');
  $('#sheetback').classList.remove('hidden');
  $('#sheetfav').onclick = () => {
    toggleFav(id); renderSheet(id); renderFavs();
    if (listState?.tipus === 'terv') renderTervList();
    saveCurrentNav();
  };
  $('#sheetplan').onclick = () => {
    const choices = $('#sheetplanchoices');
    const open = choices.classList.toggle('hidden');
    $('#sheetplan').setAttribute('aria-expanded', String(!open));
  };
  focusPanel($('#sheet'));
}
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
function rankTxt(rank) {
  const m = /^#(\d+)\/(\d+)\s*(.*)$/.exec(rank || '');
  return m ? `${m[1]}. hely a ${m[2]} közül${m[3] ? ' · ' + m[3] : ''}` : rank;
}
function datumTxtSafe(e) {
  const d = e.rating?.captured_at || e.datum;
  return d ? datumTxt(d) : '';
}
function hideSheet() {
  const opener = sheetOpener;
  sheetOpener = null;
  currentSheetId = null;
  $('#sheet').classList.add('hidden');
  $('#sheetback').classList.add('hidden');
  restoreFocus(opener);
}
function closeSheet() {
  if (currentSheetId && navReady && navDepth > 0) history.back();
  else hideSheet();
}

/* ---------- KERESÉS ---------- */
function searchTerms(p) {
  return [
    p.nev,
    p.nev_hivatalos,
    p.zona,
    ...(p.cimkek || []),
    ...(p.cimkek_publikus || []),
    CAT[p.kat]?.nev,
    p.kat,
    ...(p.etel_profil || []).flatMap(x => [PROFIL[x], x]),
    PRAKT[p.praktikus_tipus],
    p.praktikus_tipus,
    ...(p.facettak || []).flatMap(x => [FACET[x], x]),
  ].filter(Boolean);
}
function runSearch(q) {
  const nq = norm(q.trim());
  const wrap = $('.searchwrap');
  if (!nq) {
    wrap.classList.remove('hasq');
    $('#search-results').classList.add('hidden');
    $('#home-content').classList.remove('hidden');
    updateScrollLock();
    return;
  }
  wrap.classList.add('hasq');
  const allHits = sortByDist(DATA.filter(visible).filter(p =>
    searchTerms(p).some(term => norm(term).includes(nq))
  ));
  const hits = allHits.slice(0, 40);
  $('#home-content').classList.add('hidden');
  const res = $('#search-results');
  res.classList.remove('hidden');
  res.innerHTML = `<div class="reshead">${allHits.length} találat${allHits.length > hits.length ? ' · az első 40 látható' : ''}</div>` +
    (hits.map(placeRow).join('') || '<div class="empty">Nincs találat. Próbáld másképp — pl. „pizza", „naplemente", „Krk".</div>');
  updateScrollLock();
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
function updateScrollLock() {
  const homeActive = $('#view-home').classList.contains('active');
  const searching = !$('#search-results').classList.contains('hidden');
  document.body.classList.toggle('home-lock', homeActive && !searching);
}
function showView(v, keepTab) {
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  $('#view-' + v).classList.add('active');
  if (!keepTab) setActiveTab(v);
  window.scrollTo(0, 0);
  updateScrollLock();
}
function renderTab(t) {
  hideSheet();
  showView(t);
  if (t === 'near') renderNear();
  if (t === 'fav') renderFavs();
  if (t === 'terv') renderTerv();
  if (t === 'home') renderHome();
}
function cleanNavState(state) {
  let s;
  try { s = JSON.parse(JSON.stringify(state || {})); } catch (err) { s = {}; }
  if (!['home','near','terv','fav','list'].includes(s.screen)) s = { screen: 'home' };
  if (s.screen === 'list' && !s.list) s = { screen: 'home' };
  if (s.sheetId && !DATA.some(p => p.id === s.sheetId)) {
    return cleanNavState(s.underlay || { screen: s.screen, list: s.list });
  }
  s.scrollY = Number.isFinite(s.scrollY) ? Math.max(0, s.scrollY) : 0;
  return s;
}
function captureNavState() {
  const active = document.querySelector('.view.active')?.id?.replace('view-', '') || 'home';
  const state = { screen: active, scrollY: window.scrollY || 0 };
  if (active === 'list' && listState) state.list = { ...listState };
  if (active === 'home') state.search = $('#search').value;
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
  if (!['home','near','terv','fav'].includes(t)) return;
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
  if (e.target.closest('[data-nearlocation]')) return refreshPosition();
  const cat = e.target.closest('[data-cat]');
  if (cat) return openList({ tipus: 'cat', cat: cat.dataset.cat, cim: CAT[cat.dataset.cat].nev });
  const coll = e.target.closest('[data-coll]');
  if (coll) { const c = COLLS.find(x => x.id === coll.dataset.coll); return openList({ tipus: 'coll', coll: c.id, cim: c.cim }); }
  const terv = e.target.closest('[data-terv]');
  if (terv) return openList({ tipus: 'terv', nap: terv.dataset.terv, cim: NAP_CIM[terv.dataset.terv] });
  const tervRemove = e.target.closest('[data-tervremove]');
  if (tervRemove && listState?.tipus === 'terv') {
    removeTervStop(tervRemove.dataset.tervremoveday, tervRemove.dataset.tervremove);
    renderTervList(); renderTerv(); saveCurrentNav(); return;
  }
  const tervAdd = e.target.closest('[data-tervadd]');
  if (tervAdd && listState?.tipus === 'terv') {
    toggleTervDay(tervAdd.dataset.tervaddday, tervAdd.dataset.tervadd);
    renderTervList(); renderTerv(); saveCurrentNav(); return;
  }
  const sheetTervAdd = e.target.closest('[data-sheettervadd]');
  if (sheetTervAdd) {
    const nap = sheetTervAdd.dataset.sheettervadd;
    const wasOn = tervDays[nap].includes(currentSheetId);
    toggleTervDay(nap, currentSheetId);
    sheetTervAdd.classList.toggle('on', !wasOn);
    const icon = sheetTervAdd.querySelector('i');
    if (icon) icon.textContent = wasOn ? '+' : '✓';
    const status = $('#sheetplanstatus');
    if (status) status.textContent = wasOn ? `${NAP_CIM[nap]}: eltávolítva.` : `${NAP_CIM[nap]}: hozzáadva.`;
    if (listState?.tipus === 'terv') renderTervList();
    renderTerv();
    saveCurrentNav();
    return;
  }
  const chip = e.target.closest('[data-chip]');
  if (chip) { listState.chip = chip.dataset.chip; renderList(); saveCurrentNav(); return; }
  const pl = e.target.closest('[data-id]');
  if (pl) return openSheet(pl.dataset.id, pl);
});
$('#listback').onclick = () => { if (navDepth > 0) history.back(); };
$('#sheetback').onclick = closeSheet;
$('#sheet').addEventListener('touchstart', e => { window._ty = e.touches[0].clientY; }, { passive: true });
$('#sheet').addEventListener('touchend', e => {
  if ($('#sheet').scrollTop <= 0 && e.changedTouches[0].clientY - (window._ty || 0) > 90) closeSheet();
}, { passive: true });
document.addEventListener('keydown', e => {
  const highwayOpen = !$('#highwaysheet').classList.contains('hidden');
  const sheetOpen = !$('#sheet').classList.contains('hidden');
  if (e.key === 'Escape') {
    if (highwayOpen) { e.preventDefault(); closeHighway(); }
    else if (sheetOpen) { e.preventDefault(); closeSheet(); }
    return;
  }
  if (e.key !== 'Tab') return;
  const panel = highwayOpen ? $('#highwaysheet') : (sheetOpen ? $('#sheet') : null);
  if (!panel) return;
  const items = panelFocusables(panel);
  if (!items.length) { e.preventDefault(); panel.focus(); return; }
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$('#search').addEventListener('input', e => handleSearchInput(e.target.value));
$('#searchclear').onclick = () => { $('#search').value = ''; handleSearchInput(''); };
$('#islands').checked = islandsOn;
$('#islands').addEventListener('change', e => {
  islandsOn = e.target.checked;
  localStorage.setItem('senj_islands', islandsOn ? '1' : '0');
  renderHome(); renderMarkers();
  if (listState) renderList();
  saveCurrentNav();
});


/* ---------- autópálya-segédlet ---------- */
function openHighway(opener) {
  highwayOpener = opener || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const panel = $('#highwaysheet');
  panel.scrollTop = 0;
  panel.classList.remove('hidden');
  $('#highwayback').classList.remove('hidden');
  focusPanel(panel);
}
function closeHighway() {
  const opener = highwayOpener;
  highwayOpener = null;
  $('#highwaysheet').classList.add('hidden');
  $('#highwayback').classList.add('hidden');
  restoreFocus(opener);
}
$('#openhighway').onclick = e => openHighway(e.currentTarget);
$('#closehighway').onclick = closeHighway;
$('#highwayback').onclick = closeHighway;
$('#highwaysheet').addEventListener('touchstart', e => { window._hwyTy = e.touches[0].clientY; }, { passive: true });
$('#highwaysheet').addEventListener('touchend', e => {
  if ($('#highwaysheet').scrollTop <= 0 && e.changedTouches[0].clientY - (window._hwyTy || 0) > 90) closeHighway();
}, { passive: true });
document.querySelectorAll('[data-highway-target]').forEach(btn => {
  btn.addEventListener('click', () => {
    const panel = $('#highwaysheet');
    const target = document.getElementById(btn.dataset.highwayTarget);
    if (!target) return;
    const delta = target.getBoundingClientRect().top - panel.getBoundingClientRect().top - 66;
    panel.scrollTo({ top: panel.scrollTop + delta, behavior: 'smooth' });
  });
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
    const resp = await fetch('data.json?v=4');
    DATA = (await resp.json()).helyek;
  } catch (err) {
    $('#home-content').innerHTML = '<div class="empty">Nem sikerült betölteni a helyeket.<br>Ellenőrizd a kapcsolatot, majd frissítsd az oldalt.</div>';
    return;
  }
  initNavigation();
  refreshPosition();
}
boot();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(reg => reg.update()).catch(() => {});

// Interactive tools: path finder, seniority board, vacancy simulator, callsign lookup, rank translator.
// All data comes from the wiki content already published on this site.
(() => {
'use strict';

const $ = id => {
  const el = document.getElementById(id);
  if (!el) throw new Error('tools.js: missing element #' + id);
  return el;
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const key = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const pgNum = pg => {
  const m = /^([EO])-(\d+)$/.exec(pg);
  if (!m) throw new Error('tools.js: bad paygrade ' + pg);
  return (m[1] === 'O' ? 100 : 0) + Number(m[2]);
};
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

/* ---------- Ladder data ---------- */

const s = (pg, rank, job, cs = [], radio = false) => ({ pg, rank, job, cs, radio });
const gap = text => ({ gap: true, job: text, cs: [] });

const GEN = s('O-7', 'Brigadier General / Rear Admiral (Lower)', 'First general officer rank, senior staff. No named job on the wiki.');
const SEAT = {
  ccdr: s('O-10', 'General / Admiral', 'Combatant Commander', ['OBELISK 6']),
  cos: s('O-8', 'Major General / RADM-UH', 'Chief of Staff', ['OBELISK 1']),
  land: s('O-8', 'Major General', 'Land Component Commander', ['ORION 6']),
  air: s('O-8', 'Major General', 'Air Component Commander', ['OVERWATCH 6']),
  sea: s('O-8', 'Rear Admiral (Upper)', 'Maritime Component Commander', ['OCEAN 6']),
  soc: s('O-9', 'Lieutenant General / Vice Admiral', 'SOC Component Commander', ['OUTRIDER 6'])
};
const SEAT_ORDER = ['land', 'air', 'sea', 'soc', 'cos'];

const nums = (unit, ...n) => n.map(x => unit + '-' + x);

const LINES = [
  { id: 'army', name: 'Army Infantry', color: '#6f8f5a', feeder: 'land', bridge: [GEN], steps: [
    s('E-1', 'Private', 'Recruit (no branch)'),
    s('E-3', 'Private First Class', 'Rifleman'),
    s('E-4', 'Corporal', 'Rifleman'),
    s('E-5', 'Sergeant', 'Rifleman / Automatic Rifleman'),
    s('E-7', 'Sergeant First Class', 'Platoon Sergeant', [...nums('ARROW', 4, 5), ...nums('BAYONET', 4, 5), 'ATTACK 1-7'], true),
    s('O-2', '1st Lieutenant', 'Platoon Leader', [...nums('ARROW', 2, 3), ...nums('BAYONET', 2, 3), 'ATTACK 1-6']),
    s('O-3', 'Captain', 'Company / Troop Commander', ['ARROW-6', 'BAYONET-6', 'ATTACK 6', 'BATTLE 6']),
    s('O-5', 'Lieutenant Colonel', 'Battalion Commander', ['CHIEF-6', 'COMBAT-6', 'SHERPA 6']),
    s('O-6', 'Colonel', 'Brigade / Division Commander', ['DAGGER-6', 'WARRIOR 6'])
  ] },
  { id: 'marines', name: 'Marines', color: '#4f86c6', feeder: 'land', bridge: [GEN], steps: [
    s('E-1', 'Private', 'Recruit (no branch)'),
    s('E-3', 'Private First Class', 'Rifleman'),
    s('E-4', 'Corporal', 'Rifleman'),
    s('E-5', 'Sergeant', 'Rifleman'),
    s('E-7', 'Gunnery Sergeant', 'Platoon Sergeant', [...nums('APACHE', 4, 5), ...nums('BLACKFOOT', 4, 5)], true),
    s('O-2', '1st Lieutenant', 'Platoon Leader', [...nums('APACHE', 2, 3), ...nums('BLACKFOOT', 2, 3)]),
    s('O-3', 'Captain', 'Company Commander', ['APACHE-6', 'BLACKFOOT-6']),
    s('O-5', 'Lieutenant Colonel', 'Battalion Commander'),
    s('O-6', 'Colonel', 'Regiment Commander')
  ] },
  { id: 'mp', name: 'Military Police', color: '#6f8f5a', feeder: 'land', bridge: [GEN], steps: [
    s('E-4', 'Corporal', 'Military Policeman'),
    s('E-6', 'Staff Sergeant', 'Squad Leader', nums('MARSHAL', 2, 3, 4)),
    s('O-3', 'Captain', 'Company Commander', ['MARSHAL-6']),
    s('O-4', 'Major', 'Provost Marshal', ['SHERIFF']),
    gap('No O-5 job listed on this ladder.'),
    s('O-6', 'Colonel', 'Base Commander (assumed next step, the wiki does not link these jobs)')
  ] },
  { id: 'sf', name: 'Army Special Forces', color: '#6f8f5a', feeder: 'soc', bridge: [GEN, gap('No O-8 job on this line. The SOC Commander seat is O-9.')], steps: [
    s('E-4', 'Corporal', 'Automatic Rifleman · Marksman · Civil Affairs Specialist', ['TRIBUNE-4']),
    s('E-5', 'Sergeant', 'Civil Affairs Specialist', ['TRIBUNE-3']),
    s('E-6', 'Staff Sergeant', 'ODA Weapons / Medical / Engineering Sergeant', nums('TITAN', 2, 3, 4)),
    s('E-7', 'Sergeant First Class', 'Platoon Sergeant · Civil Affairs First Sergeant', [...nums('TOMBSTONE', 4, 5), 'TRIBUNE-2'], true),
    s('O-2', '1st Lieutenant', 'Ranger Assault / Weapons Platoon Leader', nums('TOMBSTONE', 2, 3)),
    s('O-3', 'Captain', 'Ranger Co Cdr · ODA Commander · Civil Affairs Co Cdr', ['TOMBSTONE-6', 'TITAN-6', 'TRIBUNE-6']),
    s('O-6', 'Colonel', 'Task Force Commander', ['TANGO-6'])
  ] },
  { id: 'specops', name: 'Special Ops (Navy & Air)', color: '#46b3c9', feeder: 'soc', bridge: [gap('No O-6 to O-8 job listed on this ladder.')], steps: [
    s('E-4', 'Senior Airman', 'Pararescue Operator', ['ANGEL-4']),
    s('E-5', 'Operator 2nd Class / SSgt', 'Pararescue Operator · EOD', ['ANGEL-3', 'EXPLOSIVE-4']),
    s('E-6', 'Operator 1st Class / TSgt', 'Operator · EOD', ['EXPLOSIVE-3']),
    s('E-8', 'Senior Chief / Master Sgt', 'Platoon Chief · First Sergeant · EOD', ['TRIDENT-3', 'TRIDENT 2-7', 'ANGEL-2', 'EXPLOSIVE-2']),
    s('O-3', 'Lieutenant / Captain', 'SEAL / SBT Platoon Cdr · Pararescue and Engineer Flight Cdr', ['TRIDENT 1', 'TRIDENT 2', 'ANGEL-6', 'EXPLOSIVE-6']),
    s('O-5', 'Commander / Lt Cdr', 'NSWU-8 Commanding Officer · 26th STS Squadron Commander', ['TACTICS-6'])
  ] },
  { id: 'aviation', name: 'Aviation', color: '#46b3c9', feeder: 'air', bridge: [gap('No O-6 or O-7 job listed on this ladder.')], steps: [
    s('E-5', 'Sergeant', 'Weapons Sergeant', nums('TALON', 11, 12, 13, 14)),
    s('E-6', 'Staff Sergeant', 'Crew Chief', nums('TALON', 7, 8, 9, 10)),
    s('O-2', '1st Lieutenant', 'Rescue Pilot', nums('JOLLY', 4, 5)),
    s('O-3', 'Captain', 'Platoon Commander · Flight Commander', [...nums('TALON', 2, 3, 4, 5), ...nums('JOLLY', 2, 3)]),
    s('O-5', 'Lieutenant Commander', 'Squadron Commander', ['TALON-6', 'JOLLY-6'])
  ] },
  { id: 'medical', name: 'Naval Medical', color: '#4f86c6', feeder: 'sea', bridge: [gap('No O-6 or O-7 job listed. Link to the Maritime seat is assumed from "naval line".')], steps: [
    s('E-7', 'Chief Petty Officer', 'Hospital Corpsman'),
    s('E-8', 'Senior Chief Petty Officer', 'Hospital Corpsman'),
    s('O-2', 'Lt Junior Grade', 'Surgeon'),
    s('O-3', 'Lieutenant', 'Field Surgeon'),
    s('O-4', 'Lieutenant Commander', 'Clinical / Readiness Director'),
    s('O-5', 'Commander', 'Commanding Officer')
  ] }
];
const lineById = id => {
  const l = LINES.find(x => x.id === id);
  if (!l) throw new Error('tools.js: unknown line ' + id);
  return l;
};

const READINGS = {
  A: 'Reading A: Combatant Commander page',
  B: 'Reading B: AFRICOM structure table'
};
let reading = 'B';

// Which seats promote into which, under each wiki reading.
const FEEDS = {
  A: { ccdr: ['land', 'sea', 'air', 'soc'] },
  B: { ccdr: ['soc', 'land', 'cos'], cos: ['air'] }
};

function moves(seat, r) {
  if (seat === 'ccdr') return 0;
  for (const [up, list] of Object.entries(FEEDS[r])) {
    if (list.includes(seat)) {
      const m = moves(up, r);
      if (m !== null) return m + 1;
    }
  }
  return null;
}
function routeText(seat, r) {
  const chain = [SEAT[seat].cs[0]];
  let cur = seat;
  while (cur !== 'ccdr') {
    const up = Object.keys(FEEDS[r]).find(k => FEEDS[r][k].includes(cur));
    if (!up) return null;
    chain.push(SEAT[up].cs[0]);
    cur = up;
  }
  return chain.join(' → ');
}

function route(line, r) {
  const steps = [...line.steps, ...line.bridge, SEAT[line.feeder]];
  if (line.feeder === 'sea' && r === 'B') {
    return { steps, end: 'Reading B stops here: Maritime is the top of the naval line.' };
  }
  if (line.feeder === 'air' && r === 'B') steps.push(SEAT.cos);
  steps.push(SEAT.ccdr);
  return { steps, end: null };
}

const CS_INDEX = new Map();
LINES.forEach(l => l.steps.forEach(st => st.cs.forEach(c => CS_INDEX.set(key(c), st))));
Object.values(SEAT).forEach(st => st.cs.forEach(c => CS_INDEX.set(key(c), st)));

/* ---------- Rank parsing ---------- */

const ALIASES = {
  'private': 'E-1', 'pvt': 'E-1',
  'pfc': 'E-3', 'private first class': 'E-3',
  'cpl': 'E-4', 'corporal': 'E-4', 'sra': 'E-4', 'senior airman': 'E-4',
  'sgt': 'E-5', 'sergeant': 'E-5', 'ssgt': 'E-5', 'operator 2nd class': 'E-5',
  'ssg': 'E-6', 'tsgt': 'E-6', 'technical sergeant': 'E-6', 'operator 1st class': 'E-6',
  'sfc': 'E-7', 'sergeant first class': 'E-7', 'gysgt': 'E-7', 'gunnery sergeant': 'E-7', 'gunny': 'E-7',
  'cpo': 'E-7', 'chief': 'E-7', 'chief petty officer': 'E-7',
  'msg': 'E-8', 'msgt': 'E-8', 'master sergeant': 'E-8', 'senior chief': 'E-8', 'scpo': 'E-8', 'senior chief petty officer': 'E-8',
  '1lt': 'O-2', '1st lt': 'O-2', 'first lieutenant': 'O-2', '1st lieutenant': 'O-2', 'ltjg': 'O-2', 'lt jg': 'O-2', 'lieutenant junior grade': 'O-2',
  'cpt': 'O-3',
  'maj': 'O-4', 'major': 'O-4',
  'ltc': 'O-5', 'lt col': 'O-5', 'lieutenant colonel': 'O-5', 'cdr': 'O-5', 'commander': 'O-5',
  'col': 'O-6', 'colonel': 'O-6',
  'bg': 'O-7', 'brig gen': 'O-7', 'brigadier general': 'O-7', 'rdml': 'O-7', 'radm lh': 'O-7', 'radm lower': 'O-7', 'rear admiral lower': 'O-7',
  'mg': 'O-8', 'maj gen': 'O-8', 'major general': 'O-8', 'radm': 'O-8', 'radm uh': 'O-8', 'radm upper': 'O-8', 'rear admiral': 'O-8', 'rear admiral upper': 'O-8',
  'ltg': 'O-9', 'lt gen': 'O-9', 'lieutenant general': 'O-9', 'vadm': 'O-9', 'vice admiral': 'O-9',
  'gen': 'O-10', 'general': 'O-10', 'adm': 'O-10', 'admiral': 'O-10'
};

// These titles mean different paygrades depending on the ladder.
function contextual(name, line) {
  const navalOfficers = line.id === 'medical' || line.id === 'specops';
  const wikiLcdrIsO5 = line.id === 'aviation' || line.id === 'specops';
  switch (name) {
    case 'captain':
    case 'capt':
      return line.id === 'medical'
        ? { pg: 'O-6', note: 'On a Navy ladder, Captain means O-6.' }
        : { pg: 'O-3', note: 'Read as Army-style Captain (O-3). A Navy Captain is O-6.' };
    case 'lieutenant':
    case 'lt':
      return navalOfficers
        ? { pg: 'O-3', note: 'On this ladder, Lieutenant means O-3.' }
        : { pg: 'O-2', note: 'Read as 1st Lieutenant (O-2). A Navy Lieutenant is O-3.' };
    case 'lcdr':
    case 'lt cdr':
    case 'lieutenant commander':
      return wikiLcdrIsO5
        ? { pg: 'O-5', note: 'The wiki lists Lt Commander as O-5 on this ladder.' }
        : { pg: 'O-4', note: '' };
    case 'staff sergeant':
      return line.id === 'specops' ? { pg: 'E-5', note: 'Air Force Staff Sergeant is E-5.' } : { pg: 'E-6', note: '' };
    default:
      return null;
  }
}

function parseRank(raw, line) {
  const name = raw.toLowerCase().replace(/\./g, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const grade = /^([eo]) ?(\d{1,2})$/.exec(name);
  if (grade) {
    const letter = grade[1].toUpperCase();
    const n = Number(grade[2]);
    if (n < 1 || n > (letter === 'E' ? 9 : 10)) return null;
    return { num: pgNum(letter + '-' + n), label: letter + '-' + n, note: '' };
  }
  const ctx = contextual(name, line);
  if (ctx) return { num: pgNum(ctx.pg), label: ctx.pg, note: ctx.note };
  if (ALIASES[name]) return { num: pgNum(ALIASES[name]), label: ALIASES[name], note: '' };
  return null;
}

/* ---------- Callsign index, read from the Callsigns tab so there is one source ---------- */

function expandCallsign(text) {
  const range = /^(.+?)[- ](\d+)…(\d+)$/.exec(text);
  if (range) {
    const out = [];
    for (let i = Number(range[2]); i <= Number(range[3]); i++) out.push(range[1] + '-' + i);
    return out;
  }
  const pair = /^(.+?)[- ](\d+) ?\/ ?(\d+)$/.exec(text);
  if (pair) return [pair[1] + '-' + pair[2], pair[1] + '-' + pair[3]];
  return text.split(' / ').map(x => x.trim());
}

const DIRECTORY = [];
const BY_KEY = new Map();
document.querySelectorAll('.ucard').forEach(card => {
  const unit = card.querySelector('h2').textContent;
  const unitDetail = card.querySelector('.u').textContent;
  const branch = card.querySelector('.tag').textContent;
  const color = card.style.getPropertyValue('--c');
  let leaderKey = null;
  card.querySelectorAll('tr').forEach(tr => {
    const [csCell, jobCell, rankCell] = tr.children;
    const text = csCell.textContent.trim();
    if (text.startsWith('(')) return;
    const keys = expandCallsign(text).map(key);
    if (!leaderKey) leaderKey = keys[0];
    const entry = {
      callsign: text, keys, unit, unitDetail, branch, color,
      job: jobCell.textContent, rank: rankCell.textContent,
      onWiki: csCell.classList.contains('w'),
      seen: csCell.classList.contains('seen'),
      confirmed: csCell.classList.contains('confirmed'),
      leaderKey
    };
    DIRECTORY.push(entry);
    keys.forEach(k => { if (!BY_KEY.has(k)) BY_KEY.set(k, entry); });
  });
});

// Units whose non-leader rows report to the first row of their card.
const ROLLUP = new Set(['ARROW', 'BAYONET', 'ATTACK', 'APACHE', 'BLACKFOOT', 'MARSHAL', 'TOMBSTONE', 'TITAN', 'TRIBUNE', 'TACTICS / ANGEL', 'EXPLOSIVE', 'JOLLY', 'TALON']);
const REPORTS = {
  OBELISK1: 'OBELISK6', OBELISK12: 'OBELISK1', OBELISK16: 'OBELISK1', OBELISK18: 'OBELISK1', DEUS: 'OBELISK6',
  ORION6: 'OBELISK6', OVERWATCH6: 'OBELISK6', OCEAN6: 'OBELISK6', OUTRIDER6: 'OBELISK6',
  OUTRIDER2: 'OUTRIDER6', OUTRIDER3: 'OUTRIDER6', OVERWATCH2: 'OVERWATCH6',
  DAGGER6: 'ORION6', CHIEF6: 'DAGGER6', COMBAT6: 'DAGGER6',
  ARROW6: 'COMBAT6', BAYONET6: 'COMBAT6', APACHE6: 'ORION6', BLACKFOOT6: 'ORION6', MARSHAL6: 'ORION6',
  TANGO6: 'OUTRIDER6', TOMBSTONE6: 'TANGO6', TITAN6: 'TANGO6', TRIBUNE6: 'TANGO6',
  TRIDENT1: 'OUTRIDER6', TRIDENT2: 'OUTRIDER6', TRIDENT3: 'TRIDENT1', TRIDENT27: 'TRIDENT2',
  TACTICS6: 'OUTRIDER6', ANGEL6: 'TACTICS6', EXPLOSIVE6: 'TACTICS6',
  TALON6: 'OVERWATCH6', JOLLY6: 'OVERWATCH6'
};
function parentKey(entry) {
  const own = entry.keys[0];
  if (REPORTS[own]) return REPORTS[own];
  if (ROLLUP.has(entry.unit) && own !== entry.leaderKey) return entry.leaderKey;
  return null;
}
function chainOf(entry) {
  const chain = [];
  let cur = entry;
  for (let guard = 0; guard < 12; guard++) {
    const k = parentKey(cur);
    if (!k) break;
    const next = BY_KEY.get(k);
    if (!next) throw new Error('tools.js: reporting chain points at unknown callsign ' + k);
    chain.push(next);
    cur = next;
  }
  return chain;
}

/* ---------- Shared reading selector ---------- */

const readingSelects = [...document.querySelectorAll('.reading')];
readingSelects.forEach(sel => {
  sel.innerHTML = Object.entries(READINGS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  sel.value = reading;
  sel.addEventListener('change', () => {
    reading = sel.value;
    readingSelects.forEach(o => { o.value = reading; });
    renderPath();
    resetVacancy();
  });
});

/* ---------- Path finder ---------- */

const pfRank = $('pf-rank'), pfLine = $('pf-line'), pfOut = $('pf-out');
pfLine.innerHTML = LINES.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');

function message(html) { pfOut.innerHTML = `<div class="note">${html}</div>`; }

function stepHtml(st, isMe, atTop) {
  const arrow = atTop ? '' : '<div class="arr">▲</div>';
  if (st.gap) return `<div class="step gap"><div class="pg">gap</div><div><div class="n">${esc(st.job)}</div></div></div>${arrow}`;
  const cs = st.cs.length ? ' · <i>' + esc(st.cs.join(' / ')) + '</i>' : '';
  const radio = st.radio ? ' · radio unlocks' : '';
  const me = isMe ? '<span class="me-tag">YOU</span>' : '';
  return `<div class="step${isMe ? ' me' : ''}"><div class="pg">${esc(st.pg)}</div><div><div class="t">${esc(st.rank)}${me}</div><div class="n">${esc(st.job)}${cs}${radio}</div></div></div>${arrow}`;
}

function renderPath() {
  const raw = pfRank.value.trim();
  if (!raw) { message('Type a rank above, for example <b>CPT</b>, <b>O-5</b>, <b>Maj Gen</b> or <b>TALON-2</b>.'); return; }

  let line = lineById(pfLine.value);
  let r = route(line, reading);
  let idx = -1;
  const notes = [];
  const hit = CS_INDEX.get(key(raw));

  if (hit) {
    if (!r.steps.includes(hit)) {
      const alt = LINES.find(l => route(l, reading).steps.includes(hit));
      if (!alt) {
        const other = reading === 'A' ? 'B' : 'A';
        message(`<b>${esc(hit.cs[0])}</b> (${esc(hit.job)}) is not on any route under ${esc(READINGS[reading])}. Switch to Reading ${other} to see it.`);
        return;
      }
      line = alt;
      pfLine.value = alt.id;
      r = route(line, reading);
    }
    idx = r.steps.indexOf(hit);
  } else {
    const parsed = parseRank(raw, line);
    if (!parsed) {
      const known = BY_KEY.get(key(raw));
      if (known) {
        const detail = known.keys[0] === 'DEUS' ? 'The Command Chaplain does not promote.' : 'The wikis list no route from this job to O-10.';
        message(`<b>${esc(known.callsign)}</b> is ${esc(known.job)} (${esc(known.unitDetail)}). ${detail}`);
      } else {
        message(`No rank or callsign matches <b>${esc(raw)}</b>. Try a paygrade like <b>O-5</b>, a rank like <b>Maj Gen</b>, or a callsign like <b>TALON-2</b>.`);
      }
      return;
    }
    if (parsed.note) notes.push(parsed.note);
    idx = r.steps.findIndex(st => !st.gap && pgNum(st.pg) >= parsed.num);
    if (idx === -1) {
      message(`<b>${esc(parsed.label)}</b> is above every job on the ${esc(line.name)} route under ${esc(READINGS[reading])}. ${r.end ? esc(r.end) : ''}`);
      return;
    }
    const found = r.steps[idx];
    if (pgNum(found.pg) !== parsed.num) {
      notes.push(idx === 0
        ? `This ladder starts at ${found.pg}, so that is your entry point.`
        : `${parsed.label} has no job on this ladder. Showing the next job up: ${found.pg}.`);
    }
  }

  const left = r.steps.slice(idx + 1).filter(st => !st.gap);
  const next = left[0];
  const top = r.steps[r.steps.length - 1];
  let summary;
  if (r.end && idx === r.steps.length - 1) summary = `<b>End of the documented route.</b> ${esc(r.end)}`;
  else if (r.end) summary = `<b>${plural(left.length, 'move')} to ${esc(top.cs[0])}.</b> No documented route to O-10 under this reading.`;
  else if (!left.length) summary = '<b>Top of the ladder.</b> Only POTUS or SecDef are above this, during events.';
  else summary = `<b>${plural(left.length, 'move')} to O-10.</b> Next: ${esc(next.job)} (${esc(next.pg)}).`;

  let html = `<div class="pf-sum">${summary}</div>`;
  if (notes.length) html += `<div class="note">${notes.map(esc).join(' ')}</div>`;
  html += `<div class="card pf-card" style="--c:${line.color}"><h2>${esc(line.name)}</h2><div class="u">${esc(READINGS[reading])} · highest rank at the top</div>`;
  if (r.end) html += `<div class="step gap"><div class="pg">end</div><div><div class="n">${esc(r.end)}</div></div></div><div class="arr">▲</div>`;
  for (let i = r.steps.length - 1; i >= idx; i--) html += stepHtml(r.steps[i], i === idx, i === idx);
  html += '</div>';
  pfOut.innerHTML = html;
}
pfRank.addEventListener('input', renderPath);
pfLine.addEventListener('change', renderPath);

/* ---------- Seniority: head to head and standings ---------- */

const seatLabel = k => `${SEAT[k].job} (${SEAT[k].cs[0]})`;
const h2hA = $('h2h-a'), h2hB = $('h2h-b'), h2hOut = $('h2h-out');
[h2hA, h2hB].forEach(sel => {
  sel.innerHTML = SEAT_ORDER.map(k => `<option value="${k}">${esc(seatLabel(k))}</option>`).join('');
});
h2hA.value = 'land';
h2hB.value = 'air';

function verdict(a, b, r) {
  const ma = moves(a, r), mb = moves(b, r);
  const nameA = SEAT[a].cs[0], nameB = SEAT[b].cs[0];
  const describe = k => {
    return routeText(k, r) || `${SEAT[k].cs[0]}: no documented route to O-10`;
  };
  const routes = `<span>${esc(describe(a))}<br>${esc(describe(b))}</span>`;
  let line;
  if (ma === null && mb === null) line = 'Neither seat has a documented route to O-10.';
  else if (ma === null) line = `${nameB} goes first. ${nameA} has no documented route.`;
  else if (mb === null) line = `${nameA} goes first. ${nameB} has no documented route.`;
  else if (ma === mb) {
    line = `Tie on route: both are ${plural(ma, 'move')} from O-10. Whoever has served longest goes first.`;
    if (SEAT[a].pg !== SEAT[b].pg) {
      const senior = pgNum(SEAT[a].pg) > pgNum(SEAT[b].pg) ? nameA : nameB;
      line += ` ${senior} outranks the other, but the wiki's rule is time served, not rank.`;
    }
  } else {
    const first = ma < mb ? nameA : nameB;
    line = `${first} goes first: ${plural(Math.min(ma, mb), 'move')} from O-10, against ${plural(Math.max(ma, mb), 'move')}.`;
  }
  return `<li><b>${esc(READINGS[r])}</b><br>${esc(line)}<br>${routes}</li>`;
}
function renderH2H() {
  const a = h2hA.value, b = h2hB.value;
  h2hOut.innerHTML = a === b
    ? '<li><span>Pick two different seats.</span></li>'
    : verdict(a, b, 'A') + verdict(a, b, 'B');
}
h2hA.addEventListener('change', renderH2H);
h2hB.addEventListener('change', renderH2H);

const moveText = m => (m === null ? 'no route' : plural(m, 'move'));
$('standings').innerHTML = '<tr><th>Seat</th><th>Rank</th><th>Reading A</th><th>Reading B</th></tr>' +
  SEAT_ORDER.map(k => `<tr><td class="cs w">${esc(SEAT[k].cs[0])}</td><td>${esc(SEAT[k].pg)}</td><td>${moveText(moves(k, 'A'))}</td><td>${moveText(moves(k, 'B'))}</td></tr>`).join('');

/* ---------- Vacancy simulator ---------- */

const LOWER = {
  land: [
    { label: 'DAGGER-6', job: 'Army Brigade Commander (O-6)' },
    { label: 'WARRIOR 6', job: 'Division Commander (O-6)' },
    { label: 'Marine Regiment Commander', job: 'O-6' },
    { label: 'Base Commander', job: 'O-6' }
  ],
  air: [
    { label: 'TALON-6', job: 'Aviation Squadron Commander (O-5)' },
    { label: 'JOLLY-6', job: 'Rescue Squadron Commander (O-5)' }
  ],
  sea: [
    { label: 'Naval Medical Center CO', job: 'Commander (O-5)' }
  ],
  soc: [
    { label: 'TANGO-6', job: 'Task Force Commander (O-6)' },
    { label: 'NSWU-8 Commanding Officer', job: 'Commander (O-5)' },
    { label: 'TACTICS-6', job: 'STS Squadron Commander (O-5)' }
  ]
};
const vacSeat = $('vac-seat'), vacOut = $('vac-out');
vacSeat.innerHTML = ['ccdr', ...SEAT_ORDER].map(k => `<option value="${k}">${esc(seatLabel(k))}</option>`).join('');
let vacChain = ['ccdr'];

function candidates(seat) {
  const feeders = FEEDS[reading][seat];
  if (feeders) return feeders.map(k => ({ seat: k, label: SEAT[k].cs[0], job: SEAT[k].job + ' (' + SEAT[k].pg + ')' }));
  return LOWER[seat] || [];
}
function resetVacancy() {
  vacChain = [vacSeat.value];
  renderVacancy();
}
function renderVacancy() {
  let html = `<div class="u">${esc(READINGS[reading])}</div>`;
  vacChain.forEach((link, i) => {
    const isLast = i === vacChain.length - 1;
    if (typeof link !== 'string') {
      html += `<div class="step"><div class="pg">final</div><div><div class="t">${esc(link.label)} moves up</div><div class="n">${esc(link.job)}. Their old seat opens next. Use Path finder for the ladder below it.</div></div></div>`;
      return;
    }
    const seat = SEAT[link];
    html += `<div class="step"><div class="pg">${esc(seat.pg)}</div><div><div class="t">${esc(seat.cs[0])} opens</div><div class="n">${esc(seat.job)}</div></div></div>`;
    if (!isLast) return;
    const cands = candidates(link);
    if (!cands.length) {
      html += `<div class="note">${esc(READINGS[reading])} names no one who feeds this seat.</div>`;
      return;
    }
    const inferred = !FEEDS[reading][link];
    html += `<div class="vac-q">Who has served longest?${inferred ? ' <span>Candidates inferred from the line this seat heads. The wiki gives no order.</span>' : ''}</div><div class="vac-btns">`;
    cands.forEach((c, n) => { html += `<button class="tbtn" data-i="${n}"><b>${esc(c.label)}</b><span>${esc(c.job)}</span></button>`; });
    html += '</div>';
  });
  html += '<button class="tbtn reset" data-reset="1">Start over</button>';
  vacOut.innerHTML = html;
}
vacSeat.addEventListener('change', resetVacancy);
vacOut.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  if (btn.dataset.reset) { resetVacancy(); return; }
  const c = candidates(vacChain[vacChain.length - 1])[Number(btn.dataset.i)];
  vacChain.push(c.seat || { label: c.label, job: c.job });
  renderVacancy();
});

/* ---------- Callsign lookup ---------- */

const csIn = $('cs-q'), csOut = $('cs-out');
const CS_LIMIT = 12;

function statusOf(e) {
  if (e.confirmed) return 'Callsign, job and rank confirmed in game';
  if (e.seen) return 'Callsign seen on the in-game radio. Job and rank are inferred';
  if (e.onWiki) return 'Written on the wiki';
  if (/-6$/.test(e.callsign)) return 'Commander: number 6 set by the site owner, not on the wiki';
  return /\d/.test(e.callsign) ? 'Number is a guess, assigned by seniority' : 'Name from the wiki rank tables';
}
function entryCard(e) {
  const chain = chainOf(e);
  const chainHtml = chain.length
    ? `<li><b>Reports to</b> ${chain.map(x => `<i>${esc(x.callsign)}</i>`).join(' → ')}</li>`
    : '<li><span>No reporting chain documented.</span></li>';
  return `<div class="card" style="--c:${esc(e.color)}"><span class="tag">${esc(e.branch)}</span><h2>${esc(e.callsign)}</h2><div class="u">${esc(e.unitDetail)}</div><ul><li><b>Job</b> ${esc(e.job)}</li><li><b>Rank</b> ${esc(e.rank)}</li>${chainHtml}<li><span>${esc(statusOf(e))}</span></li></ul></div>`;
}
function renderLookup() {
  const raw = csIn.value.trim();
  if (!raw) { csOut.innerHTML = ''; return; }
  const k = key(raw), low = raw.toLowerCase();
  let hits = k ? DIRECTORY.filter(e => e.keys.includes(k)) : [];
  if (!hits.length) {
    hits = DIRECTORY.filter(e => (k && e.keys.some(x => x.includes(k))) || e.job.toLowerCase().includes(low) || e.unitDetail.toLowerCase().includes(low));
  }
  if (!hits.length) {
    csOut.innerHTML = `<div class="note">Nothing matches <b>${esc(raw)}</b>.</div>`;
    return;
  }
  const more = hits.length > CS_LIMIT ? `<div class="note">Showing ${CS_LIMIT} of ${hits.length}. Type more to narrow it.</div>` : '';
  csOut.innerHTML = more + `<div class="grid">${hits.slice(0, CS_LIMIT).map(entryCard).join('')}</div>`;
}
csIn.addEventListener('input', renderLookup);

/* ---------- Rank translator ---------- */

const TRANSLATE = [
  ['O-10', 'General', 'Admiral', '—', 'Combatant Commander'],
  ['O-9', 'Lieutenant General', 'Vice Admiral', '—', 'SOC Component Commander'],
  ['O-8', 'Major General', 'Rear Admiral (Upper)', 'Major General', 'Component Commanders · Chief of Staff'],
  ['O-7', 'Brigadier General', 'Rear Admiral (Lower)', '—', 'Senior staff'],
  ['O-6', 'Colonel', 'Captain', '—', 'Division · Brigade · Regiment · Base · Task Force Commander'],
  ['O-5', 'Lieutenant Colonel', 'Commander', 'Lt Commander*', 'Battalion · Squadron Commander'],
  ['O-4', 'Major', 'Lt Commander', '—', 'Provost Marshal · Clinical Director'],
  ['O-3', 'Captain', 'Lieutenant', 'Captain', 'Company Commander · ODA · Flight Commander'],
  ['O-2', '1st Lieutenant', 'Lt Junior Grade', '1st Lieutenant', 'Platoon Leader · Rescue Pilot · Surgeon'],
  ['E-8', 'Master Sergeant', 'Senior Chief', 'Master Sgt', 'Platoon Chief · First Sergeant'],
  ['E-7', 'SFC / Gunnery Sgt', 'Chief Petty Officer', '—', 'Platoon Sergeant'],
  ['E-6', 'Staff Sergeant', 'Operator 1st Class', 'Technical Sgt', 'Squad Leader · Crew Chief · ODA Sergeant'],
  ['E-5', 'Sergeant', 'Operator 2nd Class', 'Staff Sgt', 'Rifleman · Weapons Sergeant'],
  ['E-4', 'Corporal', '—', 'Senior Airman', 'Rifleman · Military Policeman'],
  ['E-3', 'Private First Class', '—', '—', 'Rifleman'],
  ['E-1', 'Private', '—', '—', 'Recruit']
];
const rtTable = $('rt-table'), rtIn = $('rt-q');
rtTable.innerHTML = '<tr><th>Grade</th><th>Army / Marines</th><th>Navy</th><th>Air units</th><th>Typical jobs</th></tr>' +
  TRANSLATE.map(row => `<tr class="rt-row">${row.map((c, i) => `<td${i === 0 ? ' class="cs w"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('');
const rtRows = [...rtTable.querySelectorAll('.rt-row')];
rtIn.addEventListener('input', () => {
  const t = rtIn.value.trim().toLowerCase();
  rtRows.forEach(tr => tr.classList.toggle('hide', !!t && !tr.textContent.toLowerCase().includes(t)));
});

/* ---------- First paint ---------- */

renderPath();
renderH2H();
renderVacancy();
})();

// MixItUp – UI (téma Čistá, WheresTheApp)
'use strict';

const TAURI = window.__TAURI__;
const IS_APP = !!TAURI;
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = tag === 'svg' ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.setAttribute('class', v);
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ------------------------------------------------------------------ ikony (16×16, stroke)
const P = {
  home: '<path d="M2.75 10V8a5.25 5.25 0 0 1 10.5 0v2"/><rect x="2" y="9.5" width="3" height="4.25" rx="1.2"/><rect x="11" y="9.5" width="3" height="4.25" rx="1.2"/>',
  apps: '<rect x="2" y="2" width="5" height="5" rx="1.4"/><rect x="9" y="2" width="5" height="5" rx="1.4"/><rect x="2" y="9" width="5" height="5" rx="1.4"/><rect x="9" y="9" width="5" height="5" rx="1.4"/>',
  shield: '<path d="M8 1.75 13 3.5v4c0 3.2-2.1 5.6-5 6.75C5.1 13.1 3 10.7 3 7.5v-4Z"/><path d="m5.75 8 1.6 1.6L10.5 6.4"/>',
  gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>',
  chat: '<path d="M2.5 4.25a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2H7l-3 2.75v-2.75h0a1.5 1.5 0 0 1-1.5-1.5Z"/><path d="M5.5 5.75h5M5.5 8h3"/>',
  game: '<path d="M4.6 4.5h6.8a3 3 0 0 1 2.95 2.45l.6 3.3a1.6 1.6 0 0 1-2.75 1.4L10.6 10H5.4l-1.6 1.65a1.6 1.6 0 0 1-2.75-1.4l.6-3.3A3 3 0 0 1 4.6 4.5Z"/><path d="M5.5 6.5v2M4.5 7.5h2M10.5 7h.01M11.5 8.25h.01"/>',
  out: '<path d="M2.5 6v4h2.5L8.5 13V3L5 6Z"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.75 3.75a6 6 0 0 1 0 8.5"/>',
  mic: '<rect x="5.5" y="1.75" width="5" height="8" rx="2.5"/><path d="M3.25 7.75a4.75 4.75 0 0 0 9.5 0M8 12.5v1.75"/>',
  power: '<path d="M8 2v5.5"/><path d="M4.6 4.2a5 5 0 1 0 6.8 0"/>',
  boot: '<rect x="2" y="2.5" width="12" height="9" rx="1.6"/><path d="M5.5 14h5M8 11.5V14M6.5 6.25 8 7.75l2.5-2.5"/>',
  layers: '<path d="m8 2 6 3-6 3-6-3Z"/><path d="m2 8 6 3 6-3M2 11l6 3 6-3"/>',
  wheel: '<circle cx="8" cy="8" r="6.25"/><circle cx="8" cy="8" r="2.2"/><path d="M8 1.75v4.05M8 10.2v4.05M1.75 8h4.05M10.2 8h4.05"/>',
  refresh: '<path d="M13.25 8a5.25 5.25 0 1 1-1.55-3.7"/><path d="M13.25 2.75v3h-3"/>',
  check: '<path d="m3.5 8.5 3 3 6-7"/>',
  warn: '<path d="M8 2 14.5 13.5h-13Z"/><path d="M8 6.5v3M8 11.75v.01"/>',
  x: '<path d="m4 4 8 8M12 4l-8 8"/>',
  chev: '<path d="m6 3.5 4.5 4.5L6 12.5"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  dash: '<path d="M4 8h8"/>',
  undo: '<path d="M5 4 2.5 6.5 5 9"/><path d="M2.5 6.5h7a3.5 3.5 0 0 1 0 7H7"/>',
  sparkle: '<path d="M8 1.5c.6 3.4 1.9 4.9 5.5 5.5-3.6.6-4.9 2.1-5.5 5.5-.6-3.4-1.9-4.9-5.5-5.5 3.6-.6 4.9-2.1 5.5-5.5Z"/>',
  down: '<path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10"/>',
  folder: '<path d="M2 4.5V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6.5 3.5H3a1 1 0 0 0-1 1Z"/>',
};
const icon = (n, cls = 'i') => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('class', cls); s.innerHTML = P[n] || ''; return s; };

// ------------------------------------------------------------------ mená aplikácií
const NAMES = {
  discord: 'Discord', discordptb: 'Discord PTB', discordcanary: 'Discord Canary', vesktop: 'Vesktop', legcord: 'Legcord',
  teamspeak: 'TeamSpeak', ts3client_win64: 'TeamSpeak 3', ts3client_win32: 'TeamSpeak 3', teamspeak6: 'TeamSpeak 6',
  mumble: 'Mumble', 'ms-teams': 'Microsoft Teams', teams: 'Teams (classic)', zoom: 'Zoom', slack: 'Slack', skype: 'Skype',
  whatsapp: 'WhatsApp', telegram: 'Telegram', guilded: 'Guilded', element: 'Element',
  javaw: 'Minecraft (Java)', minecraft: 'Minecraft', chrome: 'Chrome', msedge: 'Edge', firefox: 'Firefox', waterfox: 'Waterfox',
  opera: 'Opera', brave: 'Brave', spotify: 'Spotify', vlc: 'VLC', obs64: 'OBS', steam: 'Steam', steamwebhelper: 'Steam',
  resolve: 'DaVinci Resolve', fxaudio: 'FxSound', fxsound: 'FxSound', valorant: 'Valorant', 'cs2': 'Counter-Strike 2',
  robloxplayerbeta: 'Roblox', fortniteclient: 'Fortnite', 'fortniteclient-win64-shipping': 'Fortnite', lunarclient: 'Lunar Client',
};
const pretty = a => NAMES[a] || (a.length <= 3 ? a.toUpperCase() : a.charAt(0).toUpperCase() + a.slice(1));
const hue = a => { let x = 0; for (const c of a) x = (x * 31 + c.charCodeAt(0)) % 360; return x; };
const avatar = a => h('span', { class: 'av', style: `--hue:${hue(a)}` }, pretty(a).charAt(0));

// ------------------------------------------------------------------ náhľad v prehliadači (bez Tauri)
const mock = {
  cfg: { battery_alert: true, battery_alert_at: 15, chat: ['discord', 'ms-teams', 'mumble', 'skype', 'slack', 'teams', 'teamspeak', 'telegram', 'ts3client_win64', 'vesktop', 'whatsapp', 'zoom'], ignore: [], swap: false, output_id: '', all_outputs: false, setup_done: !/wizard/.test(location.hash) },
  engine: true, autostart: true, gg: true, ggStart: true, sonar: true, outSonar: true,
  endpoints() {
    const e = [
      { id: 'e1', name: 'Slúchadlá (SteelSeries Arctis Nova 5X)', flow: 'render', default: !this.outSonar, default_comm: !this.outSonar, sonar: false, arctis: true },
      { id: 'e2', name: 'Reproduktory (Realtek(R) Audio)', flow: 'render', default: false, default_comm: false, sonar: false, arctis: false },
      { id: 'c1', name: 'Analogue 1 + 2 (Focusrite USB Audio)', flow: 'capture', default: true, default_comm: !this.sonar, sonar: false, arctis: false },
      { id: 'c3', name: 'Mikrofón (SteelSeries Arctis Nova 5X)', flow: 'capture', default: false, default_comm: false, sonar: false, arctis: true },
    ];
    if (this.sonar) e.push(
      { id: 'e3', name: 'SteelSeries Sonar - Gaming', flow: 'render', default: this.outSonar, default_comm: this.outSonar, sonar: true, arctis: false },
      { id: 'e4', name: 'SteelSeries Sonar - Chat', flow: 'render', default: false, default_comm: false, sonar: true, arctis: false },
      { id: 'c2', name: 'SteelSeries Sonar - Microphone', flow: 'capture', default: false, default_comm: true, sonar: true, arctis: false });
    return e;
  },
};
const invoke = IS_APP ? TAURI.core.invoke : async (cmd, a) => {
  await new Promise(r => setTimeout(r, cmd.startsWith('ss_') ? 500 : 50));
  const m = mock;
  switch (cmd) {
    case 'app_state': return { version: '0.1.0', config: JSON.parse(JSON.stringify(m.cfg)), engine: m.engine, autostart: m.autostart, data_dir: 'C:\\Users\\Alex\\AppData\\Roaming\\MixItUp' };
    case 'config_save': m.cfg = JSON.parse(JSON.stringify(a.cfg)); return;
    case 'engine_set': m.engine = a.on; return a.on;
    case 'autostart_set': m.autostart = a.on; return a.on;
    case 'headset_now': return mockHs;
    case 'audio_snapshot': {
      const g = mockHs.game / 100, c = mockHs.chat / 100, chat = x => m.cfg.chat.includes(x);
      const s = (app, ep, active = true) => ({ app, endpoint_id: ep, active, volume: ep === 'e1' && !m.cfg.ignore.includes(app) ? (chat(app) ? c : g) : 1 });
      return { endpoints: m.endpoints(), targets: ['e1'], sessions: [s('discord', 'e1'), s('javaw', 'e1'), s('waterfox', 'e1'), s('steamwebhelper', 'e1', false), s('spotify', 'e2')] };
    }
    case 'ss_report': {
      const eps = m.endpoints();
      return { gg_installed: m.gg, gg_path: 'C:\\Program Files\\SteelSeries\\GG\\SteelSeriesGG.exe',
        running: m.gg ? ['SteelSeriesGG.exe', 'SteelSeriesGGClient.exe', 'SteelSeriesSonar.exe'] : [],
        startup: [{ kind: 'hkcu', name: 'SteelSeriesGG', command: 'C:\\Program Files\\SteelSeries\\GG\\SteelSeriesGG.exe -silent', enabled: m.ggStart }],
        sonar_present: m.sonar, sonar_outputs: m.sonar ? ['SteelSeries Sonar - Gaming', 'SteelSeries Sonar - Chat'] : [],
        default_output: eps.find(e => e.flow === 'render' && e.default), default_input: eps.find(e => e.flow === 'capture' && e.default),
        output_is_sonar: m.outSonar && m.sonar, input_is_sonar: m.sonar, endpoints: eps };
    }
    case 'ss_startup': m.ggStart = a.enabled; return 1;
    case 'ss_stop': m.gg = false; return;
    case 'ss_sonar_devices': m.sonar = a.enabled; if (!a.enabled) m.outSonar = false; return;
    case 'set_default_device': if (a.id === 'e1') m.outSonar = false; return;
    case 'reset_volumes': return 5;
    case 'overlay_preview': window.open('overlay.html?pct=' + a.pct, '_blank', 'width=420,height=130'); return;
    case 'update_check': return { current: '0.1.0', latest: '0.1.0', available: false, notes: '', url: '', page: '' };
  }
  return null;
};
let mockHs = { present: true, connected: true, product: 'SteelSeries Arctis Nova 5X', pid: 0x2253, game: 100, chat: 62, battery: 80, charging: false };

// ------------------------------------------------------------------ stav
const S = { app: null, hs: { present: false, game: -1, chat: -1, battery: -1 }, snap: null, ss: null, view: 'home', busy: {} };
const cfg = () => S.app.config;
async function saveCfg() {
  try { await invoke('config_save', { cfg: cfg() }); }
  catch (e) { toast(String(e), true); }
}
/** game/chat tak, ako ich uplatňuje engine (s ohľadom na otočenie kolieska) */
function mix() {
  const { game, chat } = S.hs;
  if (game < 0 || chat < 0) return null;
  return cfg().swap ? { game: chat, chat: game } : { game, chat };
}
const channelOf = app => cfg().ignore.includes(app) ? 'ignore' : cfg().chat.includes(app) ? 'chat' : 'game';
function setChannel(app, ch) {
  const c = cfg();
  c.chat = c.chat.filter(x => x !== app);
  c.ignore = c.ignore.filter(x => x !== app);
  if (ch === 'chat') c.chat.push(app);
  if (ch === 'ignore') c.ignore.push(app);
  saveCfg();
  repaintApps();
}

// ------------------------------------------------------------------ navigácia
const VIEWS = [['home', 'Prehľad', 'home'], ['apps', 'Aplikácie', 'apps'], ['ss', 'SteelSeries', 'shield'], ['settings', 'Nastavenia', 'gear']];
function buildNav() {
  const nav = $('#nav');
  for (const [id, label, ic] of VIEWS)
    nav.append(h('button', { 'data-v': id, onclick: () => go(id) }, icon(ic), label, id === 'ss' ? h('span', { class: 'badge amber', id: 'ssBadge', hidden: true }, '!') : null));
}
function go(id) {
  S.view = id;
  for (const [v] of VIEWS) $('#v-' + v).hidden = v !== id;
  const btns = [...document.querySelectorAll('#nav button')];
  btns.forEach(b => b.classList.toggle('on', b.dataset.v === id));
  const b = btns.find(b => b.dataset.v === id);
  $('#navInd').style.transform = `translateY(${b.offsetTop}px)`;
  $('#main').scrollTop = 0;
  if (id === 'home') renderHome();
  if (id === 'apps') renderApps();
  if (id === 'ss') renderSS();
  if (id === 'settings') renderSettings();
}

// ------------------------------------------------------------------ ovládacie prvky
function sw(get, set, label) {
  const t = h('button', { class: 'sw', role: 'switch', 'aria-label': label });
  const paint = () => { const on = !!get(); t.classList.toggle('on', on); t.setAttribute('aria-checked', on); };
  t.addEventListener('click', async () => { await set(!get()); paint(); });
  paint();
  return t;
}
function segment(opts, get, set, cls = '') {
  const wrap = h('div', { class: 'seg ' + cls }, h('i', { class: 'knob' }));
  const btns = opts.map(([v, l]) => h('button', { onclick: () => { set(v); paint(); } }, l));
  wrap.append(...btns);
  const paint = () => {
    const cur = get();
    btns.forEach((b, i) => b.classList.toggle('on', opts[i][0] === cur));
    requestAnimationFrame(() => {
      const on = btns.find(b => b.classList.contains('on'));
      const k = wrap.querySelector('.knob');
      k.style.opacity = on ? 1 : 0;
      if (on) { k.style.width = on.offsetWidth + 'px'; k.style.transform = `translateX(${on.offsetLeft - 2}px)`; }
    });
  };
  paint();
  return wrap;
}
function popMenu(anchor, items) {
  const r = anchor.getBoundingClientRect();
  const menu = h('div', { class: 'pop-menu' });
  for (const it of items) {
    if (it === '-') { menu.append(h('div', { class: 'sep' })); continue; }
    const [ic, label, fn, on, sub] = it;
    menu.append(h('button', { class: on ? 'on' : '', onclick: () => { close(); fn(); } }, ic ? icon(ic) : h('span', { class: 'ic0' }), h('span', {}, label), sub ? h('small', {}, sub) : null));
  }
  const scrim = h('div', { class: 'menuscrim', onclick: () => close() });
  const close = () => { menu.classList.add('out'); setTimeout(() => { menu.remove(); scrim.remove(); }, 150); };
  document.body.append(scrim, menu);
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  menu.style.left = Math.min(r.left, innerWidth - mw - 8) + 'px';
  menu.style.top = (r.bottom + 6 + mh > innerHeight - 8 ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
}
function modal(content, buttons) {
  const box = h('div', { class: 'modal', role: 'dialog' }, content);
  const scrim = h('div', { class: 'scrim' }, box);
  const close = () => { scrim.classList.add('out'); setTimeout(() => scrim.remove(), 180); };
  if (buttons.length) box.append(h('div', { class: 'acts' }, ...buttons.map(([l, fn, cls]) =>
    h('button', { class: 'btn ' + (cls || ''), onclick: () => fn ? fn() : close() }, l))));
  if (buttons.length) scrim.addEventListener('click', e => e.target === scrim && close());
  document.body.append(scrim);
  return { close, box, scrim };
}
function confirmBox(title, text, okLabel, okCls = 'primary') {
  return new Promise(res => {
    const m = modal(h('div', {}, h('h3', {}, title), h('p', {}, text)),
      [['Zrušiť', () => { m.close(); res(false); }], [okLabel, () => { m.close(); res(true); }, okCls]]);
  });
}
function toast(text, err = false) {
  const t = h('div', { class: 'toast' + (err ? ' err' : '') }, icon(err ? 'warn' : 'check', 'i' + (err ? '' : ' check')), text);
  $('#toasts').append(t);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, err ? 4200 : 2200);
}
function battery(b, charging) {
  if (b < 0) return null;
  return h('span', { class: 'batt', title: charging ? 'Nabíja sa' : 'Batéria' }, h('span', { class: 'cell', style: `--b:${clamp(b, 4, 100)}%` }, h('i')), `${b} %${charging ? ' ⚡' : ''}`);
}

// ------------------------------------------------------------------ slúchadlá (SVG)
function phonesSvg() {
  const s = h('svg', { class: 'phones', viewBox: '0 0 250 200', 'aria-hidden': 'true' });
  s.innerHTML = `
    <path class="band" d="M55 116 V96 A70 70 0 0 1 195 96 V116"/>
    <path class="band2" d="M55 116 V96 A70 70 0 0 1 195 96 V116"/>
    <path class="wave wl" d="M16 128 a34 34 0 0 0 0 44"/>
    <path class="wave wr" d="M234 128 a34 34 0 0 1 0 44"/>
    <rect class="cup" x="28" y="110" width="54" height="78" rx="24"/>
    <rect class="pad" x="39" y="120" width="32" height="58" rx="16"/>
    <ellipse class="glow gl" cx="55" cy="149" rx="11" ry="20"/>
    <rect class="cup" x="168" y="110" width="54" height="78" rx="24"/>
    <rect class="pad" x="179" y="120" width="32" height="58" rx="16"/>
    <ellipse class="glow gr" cx="195" cy="149" rx="11" ry="20"/>
    <circle class="dialring" cx="221" cy="182" r="13"/>
    <g class="dial"><circle cx="221" cy="182" r="9.5"/><line x1="221" y1="182" x2="221" y2="174"/></g>`;
  return s;
}

// ------------------------------------------------------------------ prehľad
let homeRefs = null;
function renderHome() {
  const v = $('#v-home');
  v.innerHTML = '';
  const master = h('div', { class: 'master' }, 'ChatMix', sw(() => S.app.engine, async on => {
    try { S.app.engine = await invoke('engine_set', { on }); toast(S.app.engine ? 'ChatMix beží' : 'ChatMix vypnutý – hlasitosti sú späť'); }
    catch (e) { toast(String(e), true); }
    paintStatus(); paintHome();
  }, 'ChatMix'));
  v.append(h('div', { class: 'head' },
    h('div', {}, h('h1', {}, 'Prehľad'), h('p', {}, 'Koliesko na slúchadlách mieša hru a chat. Bez Sonaru, bez virtuálnych zariadení.')),
    h('div', { class: 'actions' }, master)));

  const svg = phonesSvg();
  const knob = h('i', { class: 'knob' });
  const track = h('div', { class: 'track' }, h('span', { class: 'mid' }), knob, icon('chat'), icon('game'));
  const L = { num: h('div', { class: 'num' }), lvl: h('div', { class: 'lvl' }, h('i')), apps: h('div', { class: 'apps' }) };
  const R = { num: h('div', { class: 'num' }), lvl: h('div', { class: 'lvl' }, h('i')), apps: h('div', { class: 'apps' }) };
  const left = h('div', { class: 'side-read' }, h('div', { class: 'lbl' }, icon('chat'), 'Chat'), L.num, L.lvl, L.apps);
  const right = h('div', { class: 'side-read r' }, h('div', { class: 'lbl' }, 'Hra', icon('game')), R.num, R.lvl, R.apps);
  const name = h('span', { class: 'name' });
  const badges = h('div', { class: 'badges' });
  const hint = h('div', { class: 'hint' }, h('span', {}, 'viac chatu'), h('span', { class: 'hstate' }), h('span', {}, 'viac hry'));
  const hero = h('div', { class: 'card hero land' },
    h('div', { class: 'top' }, h('span', { class: 'dot', id: 'heroDot' }), name, badges),
    left, svg, right,
    h('div', { class: 'balance' }, track, hint));
  v.append(hero);

  const chatCard = h('div', { class: 'card chan land', style: '--i:1' });
  const gameCard = h('div', { class: 'card chan land', style: '--i:2' });
  const outCard = h('div', { class: 'card chan out land wide', style: '--i:3' });
  v.append(h('h2', { class: 'sec' }, 'Čo práve hrá'), h('div', { class: 'grid2' }, chatCard, gameCard, outCard));
  homeRefs = { svg, knob, track, L, R, left, right, name, badges, hint, chatCard, gameCard, outCard };
  addEventListener('resize', paintHome);
  paintHome();
  repaintApps();
}

let lastMix = null;
function paintHome() {
  const r = homeRefs;
  if (!r || S.view !== 'home' || !document.contains(r.svg)) return;
  const hs = S.hs, m = mix(), on = S.app.engine && hs.present && m;
  r.name.textContent = hs.present ? hs.product.replace(/^SteelSeries\s+/i, '') : 'Slúchadlá nenájdené';
  const dot = $('#heroDot');
  dot.className = 'dot ' + (!hs.present ? 'amber' : !hs.connected ? 'amber' : 'mint');
  r.badges.innerHTML = '';
  if (hs.present && !hs.connected) r.badges.append(h('span', { class: 'badge amber' }, 'Slúchadlá sú vypnuté'));
  if (!hs.present) r.badges.append(h('span', { class: 'badge amber' }, 'Zapoj USB dongle'));
  const b = battery(hs.battery, hs.charging);
  if (b && hs.connected) r.badges.append(h('span', { class: 'badge' + (hs.battery <= 20 && !hs.charging ? ' amber' : '') }, b));
  if (!S.app.engine) r.badges.append(h('span', { class: 'badge' }, 'ChatMix vypnutý'));

  const g = m ? m.game : 100, c = m ? m.chat : 100;
  r.L.num.innerHTML = m ? `${c}<small>%</small>` : '–';
  r.R.num.innerHTML = m ? `${g}<small>%</small>` : '–';
  r.L.lvl.style.setProperty('--v', c / 100);
  r.R.lvl.style.setProperty('--v', g / 100);
  r.left.classList.toggle('dim', !on);
  r.right.classList.toggle('dim', !on);
  r.svg.classList.toggle('off', !on);
  r.svg.querySelector('.gl').style.setProperty('--o', on ? .06 + .8 * (c / 100) ** 2 : 0);
  r.svg.querySelector('.gr').style.setProperty('--o', on ? .06 + .8 * (g / 100) ** 2 : 0);
  r.svg.querySelector('.dial').style.transform = `rotate(${(g - c) * .75}deg)`;
  r.track.classList.toggle('off', !on);
  const pos = (g - c + 100) / 200;
  r.knob.style.setProperty('--x', Math.round(pos * Math.max(0, r.track.offsetWidth - 34)) + 'px');
  r.hint.querySelector('.hstate').textContent = !hs.present ? '' : !m ? 'Otoč kolieskom na slúchadlách' : g === c ? 'Vyrovnané' : '';
  const key = m ? g + '/' + c : '';
  if (lastMix !== null && key !== lastMix && on) {
    r.svg.classList.remove('bump'); void r.svg.offsetWidth; r.svg.classList.add('bump');
    const lg = $('#logo'); lg.classList.add('bump'); clearTimeout(paintHome.t); paintHome.t = setTimeout(() => lg.classList.remove('bump'), 300);
  }
  lastMix = key;
}

function appRow(s, showVol = true) {
  const pct = Math.round(s.volume * 100);
  return h('div', { class: 'arow', title: 'Klikni a presuň do iného kanála', onclick: e => appMenu(e.currentTarget, s.app) },
    avatar(s.app),
    h('div', { class: 'n' }, pretty(s.app), h('small', {}, s.active ? 'práve hrá' : 'ticho')),
    h('div', { class: 'vol' }, h('span', { class: 'live' + (s.active ? ' on' : '') }),
      showVol ? h('div', { class: 'lvl' }, h('i', { style: `--v:${s.volume}` })) : null, `${pct} %`));
}
function appMenu(anchor, app) {
  const ch = channelOf(app);
  popMenu(anchor, [
    ['chat', 'Chat', () => setChannel(app, 'chat'), ch === 'chat'],
    ['game', 'Hra', () => setChannel(app, 'game'), ch === 'game'],
    '-',
    ['x', 'Nechať tak (ChatMix na ňu nesiahne)', () => setChannel(app, 'ignore'), ch === 'ignore'],
  ]);
}
function uniqueSessions(list) {
  const m = new Map();
  for (const s of list) { const o = m.get(s.app); if (!o || (s.active && !o.active)) m.set(s.app, s); }
  return [...m.values()];
}
function repaintApps() {
  if (S.view === 'home' && homeRefs && S.snap) {
    const r = homeRefs, sn = S.snap, m = mix();
    const onT = uniqueSessions(sn.sessions.filter(s => sn.targets.includes(s.endpoint_id)));
    const offT = uniqueSessions(sn.sessions.filter(s => !sn.targets.includes(s.endpoint_id) && !onT.some(o => o.app === s.app)));
    const chat = onT.filter(s => channelOf(s.app) === 'chat'), game = onT.filter(s => channelOf(s.app) === 'game');
    const ign = onT.filter(s => channelOf(s.app) === 'ignore');
    const fill = (card, ic, title, pct, list, empty) => {
      card.innerHTML = '';
      card.append(h('div', { class: 'ch' }, h('div', { class: 'ic' }, icon(ic)), h('h3', {}, title), pct != null ? h('span', { class: 'pct' }, pct) : null),
        list.length ? h('div', { class: 'applist' }, list.map(s => appRow(s))) : h('div', { class: 'empty' }, empty));
    };
    fill(r.chatCard, 'chat', 'Chat', m ? m.chat + ' %' : null, chat, 'Žiadna chat aplikácia práve nehrá do slúchadiel.');
    fill(r.gameCard, 'game', 'Hra a všetko ostatné', m ? m.game + ' %' : null, game, 'Nič ďalšie práve nehrá do slúchadiel.');
    const outList = [...ign, ...offT];
    const target = sn.endpoints.find(e => sn.targets.includes(e.id));
    fill(r.outCard, 'out', 'Mimo ChatMixu', null, outList,
      target ? 'Všetko ide cez slúchadlá.' : 'Nenašiel som výstup slúchadiel – vyber ho v Nastaveniach.');
    if (outList.length) r.outCard.append(h('div', { class: 'empty' }, 'Tieto aplikácie hrajú na inom výstupe alebo ich ChatMix necháva tak – majú svoju hlasitosť.'));
    r.L.apps.textContent = chat.map(s => pretty(s.app)).join(', ');
    r.R.apps.textContent = game.map(s => pretty(s.app)).join(', ');
  }
  if (S.view === 'apps') paintAppsView();
}

// ------------------------------------------------------------------ aplikácie
let appsList = null;
function renderApps() {
  const v = $('#v-apps');
  v.innerHTML = '';
  v.append(h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Aplikácie'),
    h('p', {}, 'Čo patrí do chatu a čo do hry. Všetko, čo nie je v chate, ChatMix berie ako hru.'))));
  appsList = h('div', { class: 'card list land' });
  v.append(h('h2', { class: 'sec' }, 'Aplikácie so zvukom'), appsList);
  const chips = h('div', { class: 'chips2', style: 'margin-top:0' });
  const inp = h('input', { class: 'txt', placeholder: 'napr. guilded alebo Guilded.exe', maxlength: 60 });
  const add = () => {
    const n = inp.value.trim().toLowerCase().replace(/\.exe$/, '');
    if (!n) return inp.focus();
    setChannel(n, 'chat'); inp.value = ''; paintChips();
  };
  inp.addEventListener('keydown', e => e.key === 'Enter' && add());
  const paintChips = () => {
    chips.innerHTML = '';
    for (const a of [...cfg().chat].sort())
      chips.append(h('button', { class: 'chip on', title: 'Odobrať zo zoznamu', onclick: () => { setChannel(a, 'game'); paintChips(); } }, avatar(a), pretty(a), icon('x')));
  };
  paintChips();
  v.append(h('h2', { class: 'sec' }, 'Zoznam chat aplikácií'),
    h('div', { class: 'card land', style: '--i:1;padding:16px 18px' },
      h('p', { style: 'color:var(--muted);font-size:12.5px;margin-bottom:12px' }, 'Tieto aplikácie idú do chatu, keď spustíš. Kliknutím ich zo zoznamu odoberieš.'),
      chips,
      h('div', { class: 'addrow' }, inp, h('button', { class: 'btn', onclick: add }, icon('plus'), 'Pridať'))));
  paintAppsView();
}
function paintAppsView() {
  if (!appsList || !S.snap) return;
  const sn = S.snap;
  const seen = uniqueSessions(sn.sessions);
  const extra = cfg().ignore.filter(a => !seen.some(s => s.app === a)).map(app => ({ app, endpoint_id: '', volume: 1, active: false, gone: true }));
  const all = [...seen, ...extra].sort((a, b) => (b.active - a.active) || pretty(a.app).localeCompare(pretty(b.app)));
  appsList.innerHTML = '';
  if (!all.length) { appsList.append(h('div', { class: 'empty', style: 'padding:14px' }, 'Práve žiadna aplikácia nehrá zvuk. Spusti hru alebo Discord a objaví sa tu.')); return; }
  for (const s of all) {
    const ep = sn.endpoints.find(e => e.id === s.endpoint_id);
    const where = s.gone ? 'nebeží' : sn.targets.includes(s.endpoint_id) ? 'hrá do slúchadiel' : `hrá na: ${ep ? ep.name : 'inom výstupe'}`;
    appsList.append(h('div', { class: 'setrow' }, avatar(s.app),
      h('div', {}, h('div', { class: 't' }, pretty(s.app)), h('div', { class: 's' }, where)),
      h('div', { class: 'r' }, segment([['chat', 'Chat'], ['game', 'Hra'], ['ignore', 'Nechať tak']], () => channelOf(s.app), ch => setChannel(s.app, ch)))));
  }
}

// ------------------------------------------------------------------ SteelSeries
const ssIssues = r => !r ? 0 : (r.running.length ? 1 : 0) + (r.startup.some(s => s.enabled) ? 1 : 0) + (r.output_is_sonar ? 1 : 0) + (r.input_is_sonar ? 1 : 0);
async function loadSS() {
  try { S.ss = await invoke('ss_report'); } catch (e) { toast(String(e), true); }
  const n = ssIssues(S.ss), b = $('#ssBadge');
  if (b) { b.hidden = !n; b.textContent = n; }
  return S.ss;
}
function headsetOutput(r) {
  const eps = (r || S.ss)?.endpoints || [];
  return eps.find(e => e.flow === 'render' && e.arctis) || eps.find(e => e.flow === 'render' && !e.sonar);
}
async function act(key, fn, okText, after) {
  S.busy[key] = true; paintChecks();
  try { await fn(); if (okText) toast(okText); }
  catch (e) { toast(String(e), true); }
  S.busy[key] = false;
  await loadSS();
  paintChecks();
  if (after) after();
}
const checkHosts = new Set();
function paintChecks() { for (const f of checkHosts) f(); }

/** zoznam kontrol – použije ho stránka SteelSeries aj sprievodca */
function checksCard(compact = false) {
  const box = h('div', { class: 'card check-list' });
  const paint = () => {
    if (!document.contains(box) && box.isConnected === false && box.dataset.mounted) { checkHosts.delete(paint); return; }
    box.dataset.mounted = 1;
    const r = S.ss;
    box.innerHTML = '';
    if (!r) { box.append(h('div', { class: 'chk' }, h('span', { class: 'busy' }), h('div', {}, h('div', { class: 't' }, 'Kontrolujem SteelSeries…')))); return; }
    const row = (state, title, sub, ...actions) => h('div', { class: 'chk' },
      h('span', { class: 'st ' + state }, icon(state === 'ok' ? 'check' : state === 'warn' ? 'warn' : 'dash')),
      h('div', {}, h('div', { class: 't' }, title), sub ? h('div', { class: 's' }, sub) : null),
      h('div', { class: 'r' }, ...actions));
    const btn = (key, label, fn, cls = '') => S.busy[key] ? h('span', { class: 'busy' }) : h('button', { class: 'btn small ' + cls, onclick: fn }, label);

    // 1) beží GG?
    if (!r.gg_installed && !r.running.length) box.append(row('ok', 'SteelSeries GG nie je nainštalované', 'Nič netreba riešiť.'));
    else if (r.running.length) box.append(row('warn', 'SteelSeries GG beží',
      'Sonar by s ChatMixom bojoval o hlasitosti. Ukonči ho (dá sa kedykoľvek spustiť znova).',
      btn('stop', 'Ukončiť', () => act('stop', () => invoke('ss_stop'), 'SteelSeries GG ukončené'), 'primary')));
    else box.append(row('ok', 'SteelSeries GG nebeží', 'Firmvér a EQ si v ňom môžeš kedykoľvek nastaviť – stačí ho spustiť.'));

    // 2) autoštart
    const st = r.startup, on = st.filter(s => s.enabled);
    if (!st.length) box.append(row('ok', 'Nespúšťa sa pri štarte Windowsu', compact ? null : 'Žiadny autoštart SteelSeries.'));
    else if (on.length) box.append(row('warn', 'Spúšťa sa pri štarte Windowsu', `${on.map(s => s.name).join(', ')} – vypne sa rovnako ako v Správcovi úloh, dá sa vrátiť.`,
      btn('start', 'Vypnúť autoštart', () => act('start', () => invoke('ss_startup', { enabled: false }), 'Autoštart SteelSeries vypnutý'), 'primary')));
    else box.append(row('ok', 'Autoštart je vypnutý', null,
      btn('start', 'Zapnúť späť', () => act('start', () => invoke('ss_startup', { enabled: true }), 'Autoštart SteelSeries zapnutý'), 'ghost')));

    // 3) predvolený výstup
    const hp = headsetOutput(r);
    if (r.output_is_sonar) box.append(row('warn', 'Zvuk ide do Sonaru', `Predvolený výstup je ${r.default_output?.name || 'Sonar'}. Bez GG by si nič nepočul.`,
      hp ? btn('out', 'Prepnúť na slúchadlá', () => act('out', () => invoke('set_default_device', { id: hp.id }), 'Zvuk ide do slúchadiel'), 'primary') : null,
      btn('outpick', 'Vybrať…', e => pickDevice(e.currentTarget, 'render'))));
    else box.append(row('ok', 'Predvolený výstup', r.default_output?.name || '–', btn('outpick', 'Zmeniť…', e => pickDevice(e.currentTarget, 'render'), 'ghost')));

    // 4) mikrofón
    if (r.input_is_sonar) box.append(row('warn', 'Mikrofón ide cez Sonar', 'Vyber skutočný mikrofón, inak ťa bez GG nebude počuť.',
      btn('inpick', 'Vybrať mikrofón…', e => pickDevice(e.currentTarget, 'capture'), 'primary')));
    else box.append(row('ok', 'Predvolený mikrofón', r.default_input?.name || '–', btn('inpick', 'Zmeniť…', e => pickDevice(e.currentTarget, 'capture'), 'ghost')));

    // 5) Sonar zariadenia
    if (!compact || r.sonar_present) {
      if (r.sonar_present) box.append(row('', 'Sonar zariadenia sú v zozname zvuku', 'Nepotrebuješ ich. Skryť ich môžeš (pýta si práva správcu), alebo ich nechaj tak – nevadia.',
        btn('sonar', 'Skryť', () => act('sonar', () => invoke('ss_sonar_devices', { enabled: false }), 'Sonar zariadenia sú skryté'))));
      else box.append(row('ok', 'Sonar zariadenia nie sú aktívne', null,
        r.gg_installed ? btn('sonar', 'Vrátiť', () => act('sonar', () => invoke('ss_sonar_devices', { enabled: true }), 'Sonar zariadenia sú späť'), 'ghost') : null));
    }
  };
  checkHosts.add(paint);
  paint();
  return box;
}
function pickDevice(anchor, flow) {
  const eps = (S.ss?.endpoints || []).filter(e => e.flow === flow);
  popMenu(anchor, eps.map(e => [e.sonar ? 'layers' : flow === 'render' ? 'out' : 'mic', e.name, () =>
    act(flow, () => invoke('set_default_device', { id: e.id }), flow === 'render' ? 'Predvolený výstup zmenený' : 'Predvolený mikrofón zmenený'), e.default, e.sonar ? 'Sonar' : '']));
}
async function fixAll() {
  const r = S.ss;
  if (!r) return;
  S.busy.all = true; paintChecks();
  try {
    if (r.running.length) await invoke('ss_stop');
    if (r.startup.some(s => s.enabled)) await invoke('ss_startup', { enabled: false });
    const hp = headsetOutput(r);
    if (r.output_is_sonar && hp) await invoke('set_default_device', { id: hp.id });
    toast('Hotovo');
  } catch (e) { toast(String(e), true); }
  S.busy.all = false;
  await loadSS();
  paintChecks();
}
function renderSS() {
  const v = $('#v-ss');
  v.innerHTML = '';
  checkHosts.clear();
  const fix = h('button', { class: 'btn primary', onclick: fixAll }, icon('sparkle'), 'Vyriešiť všetko');
  v.append(h('div', { class: 'head' },
    h('div', {}, h('h1', {}, 'SteelSeries'), h('p', {}, 'MixItUp robí ChatMix sám, takže GG a Sonar netreba. Všetko tu sa dá vrátiť.')),
    h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: async () => { S.ss = null; paintChecks(); await loadSS(); paintChecks(); } }, icon('refresh'), 'Skontrolovať znova'), fix)));
  const card = checksCard(false);
  card.classList.add('land');
  v.append(card);
  v.append(h('p', { class: 'note', style: 'padding:14px 4px 0' }, 'Firmvér slúchadiel a ich vlastné EQ sa stále nastavuje v SteelSeries GG. Keď ho potrebuješ, spusti ho, nastav a znova ukonči – MixItUp to nerozbije.'));
  const paintFix = () => { fix.disabled = !ssIssues(S.ss) || S.busy.all; };
  checkHosts.add(paintFix);
  loadSS().then(paintChecks);
}

// ------------------------------------------------------------------ nastavenia
function renderSettings() {
  const v = $('#v-settings');
  v.innerHTML = '';
  const c = cfg();
  v.append(h('div', { class: 'head' }, h('div', {}, h('h1', {}, 'Nastavenia'), h('p', {}, `MixItUp ${S.app.version}`))));

  const outName = () => {
    const eps = S.snap?.endpoints || [];
    if (c.output_id) return eps.find(e => e.id === c.output_id)?.name || 'Vybraný výstup (teraz nepripojený)';
    const a = eps.find(e => e.flow === 'render' && e.arctis);
    return a ? `Automaticky – ${a.name}` : 'Automaticky (slúchadlá Arctis)';
  };
  const pb = h('button', { class: 'pb' }, h('span', {}, outName()), icon('chev'));
  pb.onclick = () => {
    const eps = (S.snap?.endpoints || []).filter(e => e.flow === 'render' && !e.sonar);
    popMenu(pb, [['sparkle', 'Automaticky (slúchadlá Arctis)', () => { c.output_id = ''; saveCfg(); pb.firstChild.textContent = outName(); }, !c.output_id], '-',
      ...eps.map(e => ['out', e.name, () => { c.output_id = e.id; saveCfg(); pb.firstChild.textContent = outName(); }, c.output_id === e.id])]);
  };

  const row = (t, s, ...r) => h('div', { class: 'setrow' }, h('div', {}, h('div', { class: 't' }, t), s ? h('div', { class: 's' }, s) : null), h('div', { class: 'r' }, ...r));
  v.append(h('h2', { class: 'sec' }, 'ChatMix'), h('div', { class: 'card land' },
    row('Spúšťať pri štarte Windowsu', 'ChatMix beží na pozadí bez okna – zaberie pár MB pamäte.',
      sw(() => S.app.autostart, async on => { try { S.app.autostart = await invoke('autostart_set', { on }); } catch (e) { toast(String(e), true); } })),
    row('Výstup pre ChatMix', 'Kde má koliesko meniť hlasitosti.', pb),
    row('Aj na ostatných výstupoch', 'Keď je vypnuté, reproduktory a iné výstupy majú vždy svoju hlasitosť (napr. 100 %).',
      sw(() => c.all_outputs, on => { c.all_outputs = on; saveCfg(); })),
    row('Otočiť koliesko', 'Ak sa pri točení k chatu stišuje chat, zapni toto.',
      sw(() => c.swap, on => { c.swap = on; saveCfg(); paintHome(); }))));

  v.append(h('h2', { class: 'sec' }, 'Batéria'), h('div', { class: 'card land', style: '--i:1' },
    row('Upozorniť na slabú batériu', 'Navrchu obrazovky vyskočí malé upozornenie (aj nad hrou v okne alebo bez okraja). Druhé príde pri 5 %.',
      sw(() => c.battery_alert, on => { c.battery_alert = on; saveCfg(); })),
    row('Upozorniť pri', null,
      segment([[25, '25 %'], [20, '20 %'], [15, '15 %'], [10, '10 %']], () => c.battery_alert_at, x => { c.battery_alert_at = x; saveCfg(); })),
    row('Ukážka', 'Takto to bude vyzerať.',
      h('button', { class: 'btn', onclick: async () => { try { await invoke('overlay_preview', { pct: c.battery_alert_at }); } catch (e) { toast(String(e), true); } } }, icon('sparkle'), 'Ukázať'))));

  v.append(h('h2', { class: 'sec' }, 'Hlasitosti'), h('div', { class: 'card land', style: '--i:1' },
    row('Vrátiť všetky aplikácie na 100 %', 'Keby niečo ostalo stíšené (napr. po prototype alebo páde). Platí pre všetky výstupy.',
      h('button', { class: 'btn danger', onclick: async () => {
        if (!await confirmBox('Vrátiť hlasitosti?', 'Všetky aplikácie na všetkých výstupoch dostanú hlasitosť 100 %. ChatMix potom znova nastaví slúchadlá podľa kolieska.', 'Vrátiť na 100 %')) return;
        try { const n = await invoke('reset_volumes'); toast(`Hotovo – ${n} ${n === 1 ? 'aplikácia' : n < 5 ? 'aplikácie' : 'aplikácií'} na 100 %`); } catch (e) { toast(String(e), true); }
      } }, icon('undo'), 'Vrátiť'))));

  const theme = (() => { try { return localStorage.getItem('miu.theme') || 'auto'; } catch { return 'auto'; } })();
  v.append(h('h2', { class: 'sec' }, 'Appka'), h('div', { class: 'card land', style: '--i:2' },
    row('Vzhľad', null, segment([['auto', 'Podľa systému'], ['dark', 'Tmavý'], ['light', 'Svetlý']], () => { try { return localStorage.getItem('miu.theme') || 'auto'; } catch { return theme; } }, setTheme)),
    row('Sprievodca', 'Znova skontroluje slúchadlá, SteelSeries a chat aplikácie.', h('button', { class: 'btn', onclick: () => wizard() }, icon('sparkle'), 'Spustiť')),
    h('div', { id: 'updRow' }, updateRow())));
}
function setTheme(t) {
  try { localStorage.setItem('miu.theme', t); } catch { }
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.scheme = dark ? 'dark' : 'light';
}

// ------------------------------------------------------------------ aktualizácie
let updateInfo = null;
function updateRow() {
  const u = updateInfo;
  return h('div', { class: 'setrow' },
    h('div', {}, h('div', { class: 't' }, 'Aktualizácie'), h('div', { class: 's' }, u?.available ? `Je dostupná verzia ${u.latest}.` : `Verzia ${S.app.version}`)),
    h('div', { class: 'r' }, u?.available ? h('button', { class: 'btn primary', onclick: installUpdate }, icon('down'), 'Aktualizovať') :
      h('button', { class: 'btn', onclick: () => checkUpdate(true) }, icon('refresh'), 'Skontrolovať')));
}
async function checkUpdate(manual = false) {
  try {
    updateInfo = await invoke('update_check');
    paintUpdateCard();
    if (manual) toast(updateInfo.available ? `Je dostupná verzia ${updateInfo.latest}` : `Máš najnovšiu verziu (${updateInfo.current})`);
  } catch (e) { if (manual) toast(String(e), true); }
  const el = $('#updRow'); if (el) el.replaceChildren(updateRow());
}
function paintUpdateCard() {
  const c = $('#updCard');
  c.hidden = !updateInfo?.available;
  if (c.hidden) return;
  c.replaceChildren(h('div', {}, h('b', {}, `Nová verzia ${updateInfo.latest}`), h('small', { style: 'display:block' }, 'Aktualizácia trvá pár sekúnd.')),
    h('button', { class: 'btn primary small', onclick: installUpdate }, icon('down'), 'Aktualizovať'));
}
async function installUpdate() {
  if (!updateInfo?.url) return;
  toast('Sťahujem aktualizáciu…');
  try { await invoke('update_install', { url: updateInfo.url }); } catch (e) { toast(String(e), true); }
}

// ------------------------------------------------------------------ sprievodca prvým spustením
function wizard() {
  const old = $('.wizard'); if (old) old.remove();
  let step = 0;
  const STEPS = 4;
  let autostart = true;
  const picked = new Set(cfg().chat);
  const wrap = h('div', { class: 'wizard' });
  const card = h('div', { class: 'wcard' });
  wrap.append(card);
  document.body.append(wrap);
  checkHosts.clear();

  const close = () => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); S.wizHs = null; };
  const head = () => h('div', { class: 'wh' }, h('div', { class: 'logo' }, $('#logo svg').cloneNode(true)),
    h('div', {}, h('b', { style: 'font:700 15px var(--display);letter-spacing:-.02em' }, 'MixItUp'), h('small', { style: 'display:block;font-size:11px;color:var(--muted)' }, 'Nastavenie')),
    h('div', { class: 'dots' }, ...Array.from({ length: STEPS }, (_, i) => h('i', { class: i === step ? 'on' : i < step ? 'done' : '' }))));

  const paint = () => {
    card.innerHTML = '';
    card.append(head());
    const body = h('div', { class: 'wbody' });
    const foot = h('div', { class: 'wfoot' });
    const back = step > 0 ? h('button', { class: 'btn ghost', onclick: () => { step--; paint(); } }, 'Späť') : null;
    card.append(body, foot);

    if (step === 0) {
      body.append(h('div', { class: 'center' }, (() => { const s = phonesSvg(); s.style.width = '200px'; s.style.height = '160px'; return s; })(),
        h('h2', {}, 'ChatMix bez Sonaru'),
        h('p', { style: 'max-width:440px' }, 'Koliesko na slúchadlách bude stišovať hru alebo Discord priamo vo Windowse. Žiadne virtuálne zariadenia, žiadne ťažké GG na pozadí.'),
        h('p', { style: 'max-width:440px;font-size:12px' }, 'Zaberie to minútku: nájdem slúchadlá, dám do poriadku SteelSeries a vyberieš si chat aplikácie.')));
      foot.append(h('span', { class: 'sp' }), ...(cfg().setup_done ? [h('button', { class: 'btn', onclick: close }, 'Zavrieť')] : []),
        h('button', { class: 'btn primary', onclick: () => { step = 1; paint(); } }, 'Začať'));
    }

    if (step === 1) {
      const box = h('div');
      body.append(h('h2', {}, 'Slúchadlá'), h('p', {}, 'Zapoj USB dongle a zapni slúchadlá. Potom skús otočiť kolieskom ChatMix.'), box);
      const next = h('button', { class: 'btn primary', onclick: () => { step = 2; paint(); loadSS().then(paintChecks); } }, 'Ďalej');
      // postavené raz, pri pohybe kolieska sa len posúva knob (inak by skákal)
      const searching = h('div', { class: 'found' }, h('span', { class: 'spinner' }),
        h('div', {}, h('b', {}, 'Hľadám slúchadlá…'), h('small', {}, 'Podporované sú SteelSeries Arctis s kolieskom ChatMix (Nova 5, Nova 7, 7+…).')));
      const fName = h('b'), fSub = h('small'), fBatt = h('span', { class: 'fbatt' });
      const found = h('div', { class: 'found' }, h('div', { class: 'pi' }, icon('home')), h('div', {}, fName, fSub), fBatt);
      const knob = h('i', { class: 'knob' });
      const track = h('div', { class: 'track' }, h('span', { class: 'mid' }), knob, icon('chat'), icon('game'));
      const hc = h('span'), hm = h('span'), hg = h('span');
      const bal = h('div', { class: 'balance', style: 'margin-top:14px' }, track, h('div', { class: 'hint' }, hc, hm, hg));
      box.append(searching, found, bal);
      const paintHs = () => {
        const hs = S.hs, m = mix();
        searching.hidden = hs.present;
        found.hidden = bal.hidden = !hs.present;
        next.textContent = hs.present ? 'Ďalej' : 'Pokračovať aj tak';
        next.className = hs.present ? 'btn primary' : 'btn';
        if (!hs.present) return;
        fName.textContent = hs.product;
        fSub.textContent = hs.connected ? 'Pripojené' : 'Dongle je zapojený, slúchadlá sú vypnuté';
        fBatt.replaceChildren(...(hs.connected && hs.battery >= 0 ? [battery(hs.battery, hs.charging)] : []));
        track.classList.toggle('off', !m);
        hc.textContent = m ? `chat ${m.chat} %` : 'chat';
        hm.textContent = m ? 'Vidím koliesko ✓' : 'Otoč kolieskom…';
        hg.textContent = m ? `hra ${m.game} %` : 'hra';
        const g = m ? m.game : 100, c = m ? m.chat : 100;
        knob.style.setProperty('--x', Math.round((g - c + 100) / 200 * Math.max(0, track.offsetWidth - 34)) + 'px');
      };
      S.wizHs = paintHs;
      requestAnimationFrame(paintHs);
      foot.append(back, h('span', { class: 'sp' }), next);
    } else S.wizHs = null;

    if (step === 2) {
      body.append(h('h2', {}, 'SteelSeries GG a Sonar'), h('p', {}, 'Aby sa Sonar a MixItUp nebili. Všetko sa dá neskôr vrátiť.'));
      body.append(checksCard(true));
      const fixBtn = h('button', { class: 'btn', onclick: fixAll }, icon('sparkle'), 'Vyriešiť všetko');
      const paintFix = () => { fixBtn.hidden = !ssIssues(S.ss); fixBtn.disabled = !!S.busy.all; };
      checkHosts.add(paintFix); paintFix();
      foot.append(back, h('span', { class: 'sp' }), fixBtn, h('button', { class: 'btn primary', onclick: () => { step = 3; paint(); } }, 'Ďalej'));
    }

    if (step === 3) {
      const running = new Set((S.snap?.sessions || []).map(s => s.app));
      const cand = [...new Set([...picked, ...running])].sort((a, b) => (running.has(b) - running.has(a)) || pretty(a).localeCompare(pretty(b)));
      const chips = h('div', { class: 'chips2' });
      const paintChips = () => {
        chips.innerHTML = '';
        for (const a of cand) chips.append(h('button', { class: 'chip' + (picked.has(a) ? ' on' : ''), onclick: () => { picked.has(a) ? picked.delete(a) : picked.add(a); paintChips(); } },
          avatar(a), pretty(a), running.has(a) ? h('small', {}, '● hrá') : null));
      };
      paintChips();
      body.append(h('h2', {}, 'Čo je chat?'), h('p', {}, 'Označené aplikácie idú do chatu, všetko ostatné je hra. Zmeniť to vieš kedykoľvek v Aplikáciách.'), chips,
        h('div', { class: 'optrow' }, h('div', {}, h('div', { class: 't' }, 'Spúšťať ChatMix pri štarte Windowsu'), h('div', { class: 's' }, 'Beží na pozadí bez okna, pár MB pamäte.')),
          sw(() => autostart, on => { autostart = on; })));
      foot.append(back, h('span', { class: 'sp' }), h('button', { class: 'btn primary', onclick: finish }, 'Hotovo – zapnúť ChatMix'));
    }

    if (step === 4) {
      body.append(h('div', { class: 'center' }, h('div', { class: 'donemark' }, icon('check', 'i check')),
        h('h2', {}, 'ChatMix beží'), h('p', { style: 'max-width:420px' }, 'Otoč kolieskom a počúvaj. Okno môžeš zavrieť – ChatMix pobeží ďalej na pozadí.')));
      foot.append(h('span', { class: 'sp' }), h('button', { class: 'btn primary', onclick: () => { close(); go('home'); } }, 'Super'));
    }
  };

  async function finish() {
    const c = cfg();
    c.chat = [...picked];
    c.ignore = c.ignore.filter(a => !picked.has(a));
    c.setup_done = true;
    await saveCfg();
    try {
      S.app.autostart = await invoke('autostart_set', { on: autostart });
      S.app.engine = await invoke('engine_set', { on: true });
    } catch (e) { toast(String(e), true); }
    paintStatus();
    step = 4; paint();
  }
  paint();
}

// ------------------------------------------------------------------ stav v paneli
function paintStatus() {
  const hs = S.hs, d = $('#stDot');
  let cls = 'mint', t = 'ChatMix beží', sub = '';
  if (!S.app.engine) { cls = ''; t = 'ChatMix je vypnutý'; }
  else if (!hs.present) { cls = 'amber'; t = 'Čakám na slúchadlá'; sub = 'Zapoj USB dongle'; }
  else if (!hs.connected) { cls = 'amber'; t = 'Slúchadlá sú vypnuté'; }
  if (hs.present && !sub) sub = hs.product.replace(/^SteelSeries\s+/i, '') + (hs.battery >= 0 && hs.connected ? ` · ${hs.battery} %` : '');
  d.className = 'dot ' + cls;
  $('#stText').textContent = t;
  $('#stSub').textContent = sub || '\u00a0';
}

function onHeadset(st) {
  S.hs = st;
  paintStatus();
  paintHome();
  if (S.wizHs) S.wizHs();
}

async function refreshSnap() {
  try { S.snap = await invoke('audio_snapshot'); } catch { return; }
  repaintApps();
}
async function refreshState() {
  try { const a = await invoke('app_state'); S.app.engine = a.engine; S.app.autostart = a.autostart; } catch { }
  paintStatus();
}

// ------------------------------------------------------------------ štart
async function start() {
  buildNav();
  if (IS_APP) {
    const w = TAURI.window.getCurrentWindow();
    $('#wMin').onclick = () => w.minimize();
    $('#wMax').onclick = () => w.toggleMaximize();
    $('#wClose').onclick = () => w.close();
    TAURI.event.listen('headset', e => onHeadset(e.payload));
    document.addEventListener('visibilitychange', () => document.body.classList.toggle('idle', document.hidden));
  } else {
    // náhľad: pomalé točenie kolieskom
    let t = 0;
    if (!/still/.test(location.hash)) setInterval(() => {
      t += 1; const x = Math.round(60 * Math.sin(t / 4));
      mockHs = { ...mockHs, game: x < 0 ? 100 + x : 100, chat: x > 0 ? 100 - x : 100 };
      onHeadset(mockHs);
    }, 1400);
  }
  S.app = await invoke('app_state');
  S.hs = await invoke('headset_now') || S.hs;
  await refreshSnap();
  const v = (location.hash.match(/view=(\w+)/) || [])[1];
  go(VIEWS.some(x => x[0] === v) ? v : 'home');
  paintStatus();
  loadSS();
  if (!cfg().setup_done) wizard();
  const wstep = (location.hash.match(/wizard=(\d)/) || [])[1];
  if (wstep) { const b = () => { for (let i = 0; i < +wstep; i++) $('.wfoot .btn:last-child')?.click(); }; setTimeout(b, 300); }
  if (IS_APP) TAURI.window.getCurrentWindow().show();
  setInterval(() => { if (!document.hidden && (S.view === 'home' || S.view === 'apps' || $('.wizard'))) refreshSnap(); }, 2000);
  setInterval(() => { if (!document.hidden) refreshState(); }, 4000);
  setTimeout(() => checkUpdate(false), 2500);
}
document.addEventListener('contextmenu', e => { if (!e.target.closest('input')) e.preventDefault(); });
start();

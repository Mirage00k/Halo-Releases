const { app, BrowserWindow, ipcMain, dialog, shell, screen, desktopCapturer, nativeImage, net } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const { execFile, execFileSync, spawn } = require('child_process');
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
const MUSIC = { layout: 'h', width: 340, cover: true, coverSize: 76, coverRadius: 18, artist: true, progress: true, times: true, controls: true, skip: true, hidePaused: false, useAccent: false, color: '#ffffff', op: 0, radius: 30, text: 100 };
const DEF = { state: 'reduced', accent: '#7aa7ff', blur: 28, opacity: 22, radius: 30, showMedia: true, mediaPos: { x: 0, y: 0.5 }, avatar: '', name: 'Moi', birthday: '', timezone: '', lang: '', setupDone: false, autoLocale: true, autoStart: false, autoUpdate: true, display: null, music: MUSIC, layout: null, task: { enabled: true, hideWin: true, items: null } };
const SUPPORTED = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl', 'ja'];
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
const defLayout = (apps = []) => [{ type: 'profile' }, { type: 'stats', cpu: true, ram: true, ssd: true, up: true }, ...apps.map(a => ({ type: 'app', ...a })), { type: 'add' }, { type: 'spacer' }, { type: 'sep' }, { type: 'tog' }, { type: 'set' }, { type: 'hid' }, { type: 'out' }].map(b => ({ id: uid(), visible: true, ...b }));
// détection automatique : langue, fuseau horaire, nom de session
function sysInfo() {
  let lang = 'en', tz = 'UTC', name = '';
  try { lang = (app.getPreferredSystemLanguages?.()[0] || app.getLocale() || 'en').slice(0, 2).toLowerCase(); } catch {}
  if (!SUPPORTED.includes(lang)) lang = 'en';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch {}
  try { const u = os.userInfo().username; name = u ? u[0].toUpperCase() + u.slice(1) : ''; } catch {}
  return { lang, tz, name };
}
const load = () => {
  let c; try { c = { ...DEF, ...JSON.parse(fs.readFileSync(cfgFile())) }; } catch { c = { ...DEF }; }
  c.music = { ...MUSIC, ...c.music };
  c.task = { ...DEF.task, ...c.task };
  const s = sysInfo();
  if (!c.setupDone || c.autoLocale !== false) { c.lang = s.lang; c.timezone = s.tz; }
  if (!Array.isArray(c.layout)) c.layout = defLayout(c.apps);
  delete c.apps;
  c.layout.forEach(b => { if (!b.id) b.id = uid(); });
  if (!c.layout.some(b => b.type === 'set')) c.layout.push({ id: uid(), type: 'set', visible: true });
  c.layout.forEach(b => { if (b.type === 'set') b.visible = true; });
  return c;
};
// Une fois compilé en .exe, __dirname est DANS app.asar : PowerShell (processus externe) ne sait pas lire dans une archive asar.
// Les .ps1 sont donc dépaquetés (asarUnpack dans package.json) et on pointe vers app.asar.unpacked.
const unp = f => f.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
const ps1 = n => unp(path.join(__dirname, n));
const IC = ps1('icons.ps1'), PS = ps1('media.ps1'), TS = ps1('taskbar.ps1'), WS = ps1('windows.ps1'), WK = ps1('worker.ps1'), SY = ps1('sys.ps1');
let win, cfg, lastShot, quitting = false;

/* ===== Île musique détachable : fenêtre séparée qu'on peut poser sur n'importe quel écran =====
   Glissée hors de l'écran du dock, l'île devient sa propre fenêtre (même page, mode « island ») ;
   reposée sur l'écran du dock, elle revient dans la barre. */
const ISL_PAD = 50;
let islWin = null, islT = null, islSize = { w: 340, h: 120 }, lastMedia = null, lastCover = '';
const saveCfgSoon = () => { dirty = true; clearTimeout(wt); wt = setTimeout(flushCfg, 300); };
function makeIslWin(x, y) {
  const W = islSize.w + 2 * ISL_PAD, H = islSize.h + 2 * ISL_PAD;
  islWin = new BrowserWindow({ x: Math.round(x), y: Math.round(y), width: W, height: H, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, hasShadow: false, focusable: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false } });
  const w = islWin; w._ign = true;
  w.setAlwaysOnTop(true, 'screen-saver'); w.setContentProtection(true); w.setIgnoreMouseEvents(true);
  w.loadFile('index.html', { query: { island: '1' } });
  w.webContents.once('did-finish-load', () => { if (lastMedia && lastMedia.title && !w.isDestroyed()) w.webContents.send('media', { ...lastMedia, cover: lastCover }); });
  w.on('closed', () => { if (islWin === w) islWin = null; });
  islLastShot = null; clearTimeout(islCapT); islCapT = setTimeout(islCapture, 800);
}
/* Fond de la fenêtre d'île : la capture « flux vidéo » donnait des images vertes/corrompues sur le 2e écran.
   On utilise ici des captures d'écran ponctuelles (desktopCapturer) recadrées sur la fenêtre, toujours fiables. */
let islCapT = null, islLastShot = null;
async function islCapture() {
  clearTimeout(islCapT);
  if (!islWin || islWin.isDestroyed() || quitting) return;
  let next = 600;
  try {
    if (islWin.isVisible() && !islWin.webContents.isLoading()) {
      next = islWin._drag ? 160 : 500;
      const b = islWin.getBounds(), d = screen.getDisplayMatching(b), k = 0.25;
      const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(d.size.width * k), height: Math.round(d.size.height * k) } });
      const idx = screen.getAllDisplays().findIndex(x => x.id === d.id);
      const src = srcs.find(x => x.display_id === String(d.id)) || srcs[idx] || srcs[0];
      if (src && islWin && !islWin.isDestroyed()) {
        const ts = src.thumbnail.getSize(), x = Math.max(0, Math.round((b.x - d.bounds.x) * k)), y = Math.max(0, Math.round((b.y - d.bounds.y) * k));
        const w = Math.min(Math.round(b.width * k), ts.width - x), h = Math.min(Math.round(b.height * k), ts.height - y);
        if (w > 4 && h > 4) {
          const jpg = src.thumbnail.crop({ x, y, width: w, height: h }).toJPEG(50);
          if (!islLastShot || !islLastShot.equals(jpg)) { islLastShot = jpg; islWin.webContents.send('screen', jpg); }
        }
      }
    }
  } catch (e) {}
  if (islWin && !islWin.isDestroyed() && !quitting) islCapT = setTimeout(islCapture, next);
}
function startIslDrag(ox, oy) {
  if (!islWin) return;
  setIgnore(false, islWin); islWin._drag = true; clearInterval(islT);
  islT = setInterval(() => {
    if (!islWin || islWin.isDestroyed()) { clearInterval(islT); islT = null; return; }
    const p = screen.getCursorScreenPoint();
    islWin.setBounds({ x: Math.round(p.x - ox), y: Math.round(p.y - oy), width: islSize.w + 2 * ISL_PAD, height: islSize.h + 2 * ISL_PAD });
    islWin.webContents.send('geom', geomOf(islWin));
  }, 12);
}
function attachIsland(pt) {
  clearInterval(islT); islT = null;
  if (islWin) { try { islWin.destroy(); } catch {} islWin = null; }
  cfg.islDet = null; saveCfgSoon();
  if (win && !win.isDestroyed()) win.webContents.send('isl:attached', pt ? { ...pt, w: islSize.w, h: islSize.h } : null);
}
function endIslDrag() {
  if (!islT) return;
  clearInterval(islT); islT = null;
  if (!islWin || islWin.isDestroyed()) return;
  islWin._drag = false;
  const p = screen.getCursorScreenPoint(), d = screen.getDisplayNearestPoint(p), b = islWin.getBounds();
  if (d.id === curDisp().id) { const wb = win.getBounds(); return attachIsland({ x: b.x + ISL_PAD - wb.x, y: b.y + ISL_PAD - wb.y }); }
  const wa = d.workArea, W = b.width, H = b.height;
  const nb = { x: Math.round(Math.max(wa.x - ISL_PAD + 10, Math.min(b.x, wa.x + wa.width - W + ISL_PAD - 10))), y: Math.round(Math.max(wa.y - ISL_PAD + 10, Math.min(b.y, wa.y + wa.height - H + ISL_PAD - 10))), width: W, height: H };
  islWin.setBounds(nb); islWin.setBounds(nb); islWin.webContents.send('geom', geomOf(islWin));
  cfg.islDet = { did: d.id, x: nb.x, y: nb.y }; saveCfgSoon();
}
ipcMain.on('isl:detach', (e, w, h) => {
  if (islWin || !win || e.sender !== win.webContents) return;
  const p = screen.getCursorScreenPoint(), d = screen.getDisplayNearestPoint(p);
  if (d.id === curDisp().id) return; // simple sortie sur la barre des tâches Windows du même écran : on ne détache pas
  islSize = { w: Math.max(40, Math.round(+w) || 340), h: Math.max(40, Math.round(+h) || 120) };
  const W = islSize.w + 2 * ISL_PAD, H = islSize.h + 2 * ISL_PAD;
  makeIslWin(p.x - W / 2, p.y - H / 2);
  cfg.islDet = { did: d.id, x: Math.round(p.x - W / 2), y: Math.round(p.y - H / 2) }; saveCfgSoon();
  win.webContents.send('isl:state', cfg.islDet);
  startIslDrag(W / 2, H / 2);
});
// choix de l'écran de l'île depuis les paramètres (sans glisser à la main) ; réutilisé pour replacer l'île quand la position change
ipcMain.on('isl:to', (e, did, w, h) => {
  if (!win || e.sender !== win.webContents) return;
  const d = dispById(+did);
  if (!d || d.id === curDisp().id) return attachIsland(null);
  if (!islWin) islSize = { w: Math.max(40, Math.round(+w) || 340), h: Math.max(40, Math.round(+h) || 120) };
  const wa = d.workArea, p = cfg.mediaPos || { x: 0, y: .5 };
  const nb = { x: Math.round(wa.x + 10 + p.x * Math.max(0, wa.width - islSize.w - 20) - ISL_PAD), y: Math.round(wa.y + 10 + p.y * Math.max(0, wa.height - islSize.h - 20) - ISL_PAD), width: islSize.w + 2 * ISL_PAD, height: islSize.h + 2 * ISL_PAD };
  if (!islWin) makeIslWin(nb.x, nb.y); else { islWin.setBounds(nb); islWin.setBounds(nb); islWin.webContents.send('geom', geomOf(islWin)); }
  cfg.islDet = { did: d.id, x: nb.x, y: nb.y }; saveCfgSoon();
  win.webContents.send('isl:state', cfg.islDet);
});
ipcMain.on('isl:dragstart', (e, x, y) => { if (islWin && e.sender === islWin.webContents) startIslDrag(+x || 0, +y || 0); });
ipcMain.on('isl:dragend', () => endIslDrag());
ipcMain.on('isl:attach', () => attachIsland(null));
ipcMain.on('isl:fit', (e, w, h) => {
  if (!islWin || e.sender !== islWin.webContents) return;
  if (!w || !h) { islWin.hide(); return; }
  islSize = { w: Math.round(w), h: Math.round(h) };
  if (!islWin._drag) { const b = islWin.getBounds(), nb = { x: b.x, y: b.y, width: islSize.w + 2 * ISL_PAD, height: islSize.h + 2 * ISL_PAD }; islWin.setBounds(nb); islWin.setBounds(nb); }
  if (!islWin.isVisible()) islWin.showInactive();
  islWin.webContents.send('geom', geomOf(islWin));
});
/* ===== Écrans : l'app s'affiche sur l'écran choisi (cfg.display), sinon l'écran principal ===== */
const dispById = id => screen.getAllDisplays().find(d => d.id === id);
const curDisp = () => (cfg && cfg.display != null && dispById(cfg.display)) || screen.getPrimaryDisplay();
function screenList() {
  const cur = curDisp().id, pr = screen.getPrimaryDisplay().id;
  return screen.getAllDisplays().slice().sort((a, b) => a.bounds.x - b.bounds.x || a.bounds.y - b.bounds.y).map((d, i) => ({
    id: d.id, n: i + 1, x: d.bounds.x, y: d.bounds.y, w: d.bounds.width, h: d.bounds.height,
    pw: Math.round(d.bounds.width * d.scaleFactor), ph: Math.round(d.bounds.height * d.scaleFactor), sf: d.scaleFactor, primary: d.id === pr, current: d.id === cur, label: d.label || ''
  }));
}
const sendScreens = () => { if (win && !win.isDestroyed()) win.webContents.send('screens', screenList()); };
ipcMain.handle('screens:list', () => screenList());
// affiche brièvement le numéro de chaque écran
ipcMain.on('screens:identify', () => {
  screenList().forEach(s => {
    const d = dispById(s.id); if (!d) return;
    const w = new BrowserWindow({ x: d.bounds.x + 30, y: d.bounds.y + 30, width: 140, height: 140, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, focusable: false, resizable: false, hasShadow: false, show: false, webPreferences: { sandbox: true } });
    w.setAlwaysOnTop(true, 'screen-saver'); w.setIgnoreMouseEvents(true);
    w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<body style="margin:0;display:grid;place-items:center;height:100vh;box-sizing:border-box;background:rgba(20,22,32,.82);border:3px solid #fff;border-radius:32px;color:#fff;font:700 84px system-ui">${s.n}</body>`));
    w.once('ready-to-show', () => { try { w.showInactive(); } catch {} });
    setTimeout(() => { try { w.destroy(); } catch {} }, 1800);
  });
});


function fit() {
  const wa = curDisp().workArea;
  win.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  if (!win.webContents.isLoading()) win.webContents.send('geom', geom());
}
// géométrie fenêtre + écran (en DIP) : le renderer s'en sert pour recadrer le flux de capture
const winDisp = w => w === win ? curDisp() : screen.getDisplayMatching(w.getBounds());
const geomOf = w => { const d = winDisp(w); return { wb: w.getBounds(), db: d.bounds, did: d.id }; };
const geom = () => geomOf(win);
ipcMain.handle('geom', e => geomOf(BrowserWindow.fromWebContents(e.sender) || win));

/* ===== Souris : plus de setIgnoreMouseEvents(true, { forward: true }) =====
   Sous Windows, "forward" installe un hook souris GLOBAL (WH_MOUSE_LL) dans ce processus.
   Tant que le thread principal est occupé, TOUT le système attend ce hook => le curseur freeze partout
   (sauf quand la fenêtre n'ignore plus la souris, c'est-à-dire sur la barre : exactement le symptôme).
   À la place : fenêtre click-through, et on sonde la position du curseur (GetCursorPos, quasi gratuit).
   Seulement si le curseur est dans la fenêtre, le renderer fait un vrai hit-test (elementFromPoint). */
function setIgnore(v, w = win) {
  if (!w || w.isDestroyed() || w._ign === v || w._drag) return;
  w._ign = v; w.setIgnoreMouseEvents(v);
  if (v) w.webContents.sendInputEvent({ type: 'mouseLeave', x: -1, y: -1 }); // efface les :hover restés bloqués
}
function startCursorProbe() {
  setInterval(() => {
    const p = screen.getCursorScreenPoint();
    for (const w of [win, islWin]) {
      if (!w || w.isDestroyed() || !w.isVisible()) continue;
      const b = w.getBounds();
      if (!(p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height)) { setIgnore(true, w); continue; }
      if (w._ign) w.webContents.send('probe', { x: p.x - b.x, y: p.y - b.y });
    }
  }, 33);
}

/* ===== Capture d'écran (fond du verre) =====
   Par défaut le flux est capturé DANS le renderer (getUserMedia desktop = session de capture persistante,
   hors thread principal). Cette boucle desktopCapturer n'est plus qu'un SECOURS si le flux échoue :
   chaque getSources() recrée une session de capture et bloque le thread principal ~1x/s.
   - miniature réduite (k = .25) : le flou rend le détail inutile et ça coûte beaucoup moins cher
   - pas de capture en rafale : la suivante n'est programmée qu'une fois la précédente terminée
   - cadence plus lente quand la barre est cachée */
let capTimer, capBusy = false, mainCap = false;
async function capture() {
  clearTimeout(capTimer); capBusy = true;
  try {
    const d = curDisp(), k = 0.25, sz = { width: Math.round(d.size.width * k), height: Math.round(d.size.height * k) };
    const [src] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: sz });
    const b = win.getBounds();
    const img = src.thumbnail.crop({ x: Math.max(0, Math.round((b.x - d.bounds.x) * k)), y: Math.max(0, Math.round((b.y - d.bounds.y) * k)), width: Math.round(b.width * k), height: Math.round(b.height * k) });
    const jpg = img.toJPEG(50);
    if (!lastShot || !lastShot.equals(jpg)) { lastShot = jpg; win.webContents.send('screen', jpg); }
  } catch (e) {}
  capBusy = false;
  if (!quitting) capTimer = setTimeout(capture, cfg.state === 'hidden' ? 2000 : 750);
}

/* ===== Média : UN SEUL PowerShell qui reste ouvert =====
   Avant : un nouveau powershell.exe (chargement .NET + WinRT) toutes les 3 s = pic CPU/disque périodique.
   Maintenant : processus persistant qui écrit une ligne JSON toutes les 2 s. */
let mediaProc = null, mediaBuf = '';
function startMedia() {
  if (process.platform !== 'win32' || !win || mediaProc || quitting) return;
  mediaProc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, 'loop'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  mediaProc.stdout.setEncoding('utf8');
  mediaProc.stdout.on('data', chunk => {
    mediaBuf += chunk; let i;
    while ((i = mediaBuf.indexOf('\n')) >= 0) {
      const line = mediaBuf.slice(0, i).trim(); mediaBuf = mediaBuf.slice(i + 1);
      if (!line || !win || win.isDestroyed()) continue;
      try { const j = JSON.parse(line); if (j.cover) lastCover = j.cover; lastMedia = j; win.webContents.send('media', j); if (islWin && !islWin.isDestroyed() && !islWin.webContents.isLoading()) islWin.webContents.send('media', j); } catch {}
    }
  });
  mediaProc.on('error', () => {});
  mediaProc.on('exit', () => { mediaProc = null; mediaBuf = ''; if (!quitting) setTimeout(startMedia, 5000); });
}
// commandes ponctuelles (lecture/pause/suivant/précédent) : clic utilisateur, rare
ipcMain.on('media:cmd', (_, c) => {
  if (process.platform !== 'win32') return;
  execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS, c], { windowsHide: true }, () => {});
});

/* ===== Stats système sans aucun processus externe =====
   Avant : systeminformation (mem + fsSize) lançait PowerShell toutes les 1,5 s sous Windows. */
let prevCpu = os.cpus(), diskUse = 0, diskUsed = 0, diskTotal = 0, diskAt = 0, diskBusy = false;
function cpuLoad() {
  const cur = os.cpus(); let idle = 0, tot = 0;
  cur.forEach((c, i) => { const p = prevCpu[i]; if (!p) return; let t = 0; for (const k in c.times) t += c.times[k] - p.times[k]; tot += t; idle += c.times.idle - p.times.idle; });
  prevCpu = cur; return tot > 0 ? (1 - idle / tot) * 100 : 0;
}
async function refreshDisk() {
  if (diskBusy || Date.now() - diskAt < 30000) return;
  diskBusy = true;
  try {
    const root = process.platform === 'win32' ? (process.env.SystemDrive || 'C:') + '\\' : '/';
    const s = await fs.promises.statfs(root); diskTotal = s.blocks * s.bsize; diskUsed = (s.blocks - s.bavail) * s.bsize; diskUse = s.blocks ? (1 - s.bavail / s.blocks) * 100 : 0;
  } catch {}
  diskAt = Date.now(); diskBusy = false;
}
ipcMain.handle('stats', () => {
  refreshDisk();
  const tm = os.totalmem(), fm = os.freemem();
  return { cpu: cpuLoad(), threads: os.cpus().length, ram: (1 - fm / tm) * 100, ramUsed: tm - fm, ramTotal: tm, disk: diskUse, diskUsed, diskTotal, uptime: os.uptime() };
});

/* ===== Config : écriture différée (avant : écriture disque + setBounds à chaque cran de slider) ===== */
let dirty = false, wt;
const flushCfg = () => { clearTimeout(wt); if (!dirty) return; dirty = false; try { fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 1)); } catch {} };
ipcMain.handle('capture:source', async e => {
  const d = winDisp(BrowserWindow.fromWebContents(e.sender) || win);
  const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
  const all = screen.getAllDisplays(), idx = all.findIndex(x => x.id === d.id);
  const s = srcs.find(x => x.display_id === String(d.id)) || srcs[idx] || srcs[0];
  return s ? { id: s.id, did: d.id } : null;
});
ipcMain.on('capture:fallback', () => { if (mainCap) return; mainCap = true; capture(); });
ipcMain.handle('cfg:get', () => cfg);
ipcMain.handle('sys', () => sysInfo());
// lancement au démarrage de Windows (version portable : on pointe sur l'exe d'origine, pas sur le dossier temporaire d'extraction)
function applyAutoStart(on) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  try {
    const o = { openAtLogin: !!on, path: process.env.PORTABLE_EXECUTABLE_FILE || process.execPath };
    if (!app.isPackaged) o.args = [app.getAppPath()];
    app.setLoginItemSettings(o);
  } catch {}
}
ipcMain.handle('cfg:set', (_, patch) => {
  if ('autoStart' in patch && !!patch.autoStart !== !!cfg.autoStart) applyAutoStart(patch.autoStart);
  const stateChanged = patch.state && patch.state !== cfg.state;
  cfg = { ...cfg, ...patch }; dirty = true;
  if ('display' in patch) { fit(); sendScreens(); lastShot = null; }
  if (islWin && !islWin.isDestroyed() && !islWin.webContents.isLoading()) islWin.webContents.send('cfg:sync', patch); clearTimeout(wt); wt = setTimeout(flushCfg, 300);
  if (stateChanged && mainCap && !capBusy) capture();
  return cfg;
});

app.whenReady().then(() => {
  // migration : l'ancien nom (glass-dock) utilisait un autre dossier de données ; on récupère la config existante
  try { const old = path.join(app.getPath('appData'), 'glass-dock', 'config.json'); if (!fs.existsSync(cfgFile()) && fs.existsSync(old)) { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.copyFileSync(old, cfgFile()); } } catch {}
  cfg = load();
  if (cfg.autoStart) applyAutoStart(true); // remet à jour le chemin si l'exe a été déplacé
  const iconPath = path.join(__dirname, 'icon.ico');
  win = new BrowserWindow({ ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}), frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, hasShadow: false, focusable: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false } });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true); win._ign = true;
  win.loadFile('index.html'); fit();
  const onDisp = () => { if (win && !win.isDestroyed()) { fit(); sendScreens(); } if (islWin && !islWin.isDestroyed()) { const b = islWin.getBounds(), c = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; if (!screen.getAllDisplays().some(d => c.x >= d.bounds.x && c.x < d.bounds.x + d.bounds.width && c.y >= d.bounds.y && c.y < d.bounds.y + d.bounds.height)) attachIsland(null); } };
  ['display-metrics-changed', 'display-added', 'display-removed'].forEach(e => screen.on(e, onDisp));
  process.on('uncaughtException', () => {}); process.on('unhandledRejection', () => {});
  if (cfg.islDet) { const d = dispById(cfg.islDet.did); if (d) makeIslWin(cfg.islDet.x, cfg.islDet.y); else cfg.islDet = null; }
  win.webContents.once('did-finish-load', () => { startMedia(); startCursorProbe(); startWins(); worker('ping'); setTimeout(appIndex, 1500); setTimeout(() => checkUpdate(false), 8000); setInterval(() => checkUpdate(false), 30 * 60e3); });
});
app.on('before-quit', () => { quitting = true; flushCfg(); if (upd.state === 'ready' && cfg && cfg.autoUpdate !== false) applyUpdate(false); if (wk) { try { wk.kill(); } catch {} wk = null; } if (process.platform === 'win32' && cfg && cfg.task && cfg.task.hideWin) { try { execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', TS, 'show'], { windowsHide: true, timeout: 6000 }); } catch {} } clearTimeout(capTimer); if (mediaProc) mediaProc.kill(); if (winProc) winProc.kill(); if (wk) wk.kill(); if (sy) sy.kill(); if (icp) { try { icp.kill(); } catch {} } });
ipcMain.on('ignore', (e, v) => setIgnore(v, BrowserWindow.fromWebContents(e.sender)));
ipcMain.on('drag:hold', (e, v) => { const w = BrowserWindow.fromWebContents(e.sender); if (w) w._drag = !!v; });
ipcMain.on('quit', () => app.quit());
ipcMain.handle('pick:image', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    const f = r.filePaths[0], ext = path.extname(f).slice(1).toLowerCase();
    if (fs.statSync(f).size > 20e6) return null;
    return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,` + fs.readFileSync(f).toString('base64');
  } catch { return null; }
});
ipcMain.handle('pick', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile'] }); return r.canceled ? null : r.filePaths[0]; });
/* ===== Barre des tâches : menu démarrer, masquage de la barre Windows, recherche d'apps, apps épinglées ===== */
const tps = (...a) => execFile('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', TS, ...a], { windowsHide: true }, () => {});
let wk = null;
function worker(line) {
  if (process.platform !== 'win32') return;
  if (!wk) {
    wk = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', WK], { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
    wk.on('exit', () => { wk = null; }); wk.on('error', () => { wk = null; }); wk.stdin.on('error', () => {});
  }
  try { wk.stdin.write(line + '\n'); } catch {}
}
ipcMain.on('task:start', () => worker('start'));
/* ===== Wi-Fi, volume, applications en arrière-plan (processus persistant sys.ps1) ===== */
let sy = null, syBuf = '';
function sysCmd(line) {
  if (process.platform !== 'win32') return;
  if (!sy) {
    sy = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SY], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    sy.stdout.setEncoding('utf8');
    sy.stdout.on('data', async chunk => {
      syBuf += chunk; let i;
      while ((i = syBuf.indexOf('\n')) >= 0) {
        const l = syBuf.slice(0, i).trim(); syBuf = syBuf.slice(i + 1);
        const k = l.indexOf(' '); if (k < 0 || !win || win.isDestroyed()) continue;
        try {
          const t = l.slice(0, k); let d = JSON.parse(l.slice(k + 1));
          if (t === 'bg') { d = (Array.isArray(d) ? d : [d]).filter(Boolean); for (const a of d) a.logo = await winIcon(a.p); }
          if (t === 'wifilist') d = (Array.isArray(d) ? d : [d]).filter(Boolean);
          win.webContents.send('sys:evt', { t, d });
        } catch {}
      }
    });
    sy.on('exit', () => { sy = null; syBuf = ''; }); sy.on('error', () => { sy = null; }); sy.stdin.on('error', () => {});
    sy.stdin.write('self ' + process.execPath + '\n');
  }
  try { sy.stdin.write(line + '\n'); } catch {}
}
ipcMain.on('sys:cmd', (_, c) => { c = String(c).replace(/[\r\n]/g, ' '); if (/^(vol|wifi|wifilist|bg|setvol \d{1,3}|mute [01]|wificonn [A-Za-z0-9+\/=]+)$/.test(c)) sysCmd(c); });
const TSA = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', TS];
let hideProc = null, winProc = null, winBuf = '';
function killHide() { if (hideProc) { try { hideProc.kill(); } catch {} hideProc = null; } }
// la barre Windows est maintenue cachée par un processus qui la re-masque en boucle (elle réapparaît sinon au survol du bord bas)
ipcMain.on('task:hide', (_, v) => {
  if (process.platform !== 'win32') return;
  worker(v ? 'hide' : 'show');
});
/* ===== Applications ouvertes ===== */
const iconCache = {}, iconPend = {};
let lastWins = null;
async function winIcon(p) { if (iconCache[p]) return iconCache[p]; if (!iconPend[p]) iconPend[p] = iconOf(p).then(v => { iconCache[p] = v || ''; delete iconPend[p]; return iconCache[p]; }); return iconPend[p]; }
function startWins() {
  if (process.platform !== 'win32' || !win || winProc || quitting) return;
  winProc = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', WS, 'loop'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
  winProc.stdout.setEncoding('utf8');
  // envoi IMMÉDIAT (icônes déjà en cache) ; les icônes manquantes arrivent ensuite par un second envoi => ouverture/fermeture sans délai
  const sendWins = () => { if (lastWins && win && !win.isDestroyed()) win.webContents.send('wins', { fp: lastWins.fp, w: lastWins.w.map(x => ({ ...x, logo: iconCache[x.p] || '' })) }); };
  winProc.stdout.on('data', chunk => {
    winBuf += chunk; let i;
    while ((i = winBuf.indexOf('\n')) >= 0) {
      const line = winBuf.slice(0, i).trim(); winBuf = winBuf.slice(i + 1);
      if (!line || !win || win.isDestroyed()) continue;
      try {
        const j = JSON.parse(line), w = (Array.isArray(j.w) ? j.w : [j.w]).filter(x => x && x.p && x.pid !== process.pid && x.t !== 'Program Manager');
        lastWins = { fp: j.fp, w }; sendWins();
        const miss = [...new Set(w.map(x => x.p).filter(p => !iconCache[p]))];
        if (miss.length) Promise.all(miss.map(p => winIcon(p))).then(sendWins);
      } catch {}
    }
  });
  winProc.on('error', () => {});
  winProc.on('exit', () => { winProc = null; winBuf = ''; if (!quitting) setTimeout(startWins, 5000); });
}
ipcMain.on('win:focus', (_, h, pid) => worker(`focus ${Number(h)} ${Number(pid)}`));
ipcMain.handle('link:target', (_, p) => { try { return shell.readShortcutLink(p).target || p; } catch { return p; } });
// raccourci .lnk -> vrai programme (cible, arguments, dossier de travail)
ipcMain.handle('link:info', (_, p) => { try { const l = shell.readShortcutLink(p); return { target: l.target || '', args: l.args || '', cwd: l.cwd || '' }; } catch { return { target: '', args: '', cwd: '' }; } });
// lance un programme avec ses arguments (ex. Discord : Update.exe --processStart Discord.exe)
ipcMain.on('launch:app', (_, p, args, cwd) => {
  const fb = () => { try { shell.openPath(p); } catch {} };
  try {
    if (!args) return fb();
    const c = spawn(p, [String(args)], { cwd: cwd && fs.existsSync(cwd) ? cwd : path.dirname(p), detached: true, stdio: 'ignore', windowsVerbatimArguments: true });
    c.on('error', fb); c.unref();
  } catch { fb(); }
});
let appIdx = null, appIdxAt = 0;
function walk(dir, out, d = 0) {
  try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) { if (d < 4) walk(f, out, d + 1); } else if (/\.(lnk|url)$/i.test(e.name)) out.push({ name: e.name.replace(/\.(lnk|url)$/i, ''), path: f }); } } catch {}
}
function appIndex() {
  if (appIdx && Date.now() - appIdxAt < 600000) return appIdx;
  const out = [];
  if (process.platform === 'win32') for (const r of [process.env.ProgramData, process.env.APPDATA]) if (r) walk(path.join(r, 'Microsoft', 'Windows', 'Start Menu', 'Programs'), out);
  const seen = new Set();
  appIdx = out.filter(a => { const k = a.name.toLowerCase(); if (seen.has(k) || /uninstall|désinstall|desinstall/i.test(a.name)) return false; seen.add(k); return true; });
  appIdxAt = Date.now(); return appIdx;
}
const okImg = i => i && !i.isEmpty() && i.getSize().width > 8;
/* Icônes : extraites par un PROCESSUS PowerShell séparé (icons.ps1).
   Les appels natifs du process principal (getFileIcon, createThumbnailFromPath, readShortcutLink) font crasher Electron
   sur certains raccourcis/exécutables ; si l'extraction plante ici, seul ce petit processus meurt, pas l'application. */
let icp = null, icBuf = '';
const icWait = new Map();
function icStart() {
  icp = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', IC], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  icp.stdout.setEncoding('utf8');
  icp.stdout.on('data', chunk => {
    icBuf += chunk; let i;
    while ((i = icBuf.indexOf('\n')) >= 0) {
      const line = icBuf.slice(0, i).trim(); icBuf = icBuf.slice(i + 1);
      const k = line.indexOf(' '), key = k < 0 ? line : line.slice(0, k), fn = icWait.get(key);
      if (fn) { icWait.delete(key); fn(k < 0 ? '' : line.slice(k + 1)); }
    }
  });
  const reset = () => { icp = null; icBuf = ''; for (const fn of icWait.values()) fn(''); icWait.clear(); };
  icp.on('exit', reset); icp.on('error', reset); icp.stdin.on('error', () => {});
}
function icProc(p) {
  return new Promise(res => {
    if (!icp) icStart();
    const key = Buffer.from(p, 'utf8').toString('base64');
    const to = setTimeout(() => { icWait.delete(key); res(''); }, 5000);
    icWait.set(key, v => { clearTimeout(to); res(v); });
    try { icp.stdin.write(key + '\n'); } catch { clearTimeout(to); icWait.delete(key); res(''); }
  });
}
async function iconRaw(p) {
  if (process.platform !== 'win32') { try { const i = await app.getFileIcon(p, { size: 'large' }); return okImg(i) ? i.toDataURL() : ''; } catch { return ''; } }
  const b = await icProc(p);
  return b && b.length > 100 ? 'data:image/png;base64,' + b : '';
}
// file d'attente : un seul appel natif d'icône à la fois (les appels parallèles pouvaient faire planter le processus)
let icQ = Promise.resolve();
const icSerial = p => { const r = icQ.then(() => iconRaw(p)).catch(() => ''); icQ = r.then(() => {}, () => {}); return r; };
const icMemo = new Map();
const iconOf = p => { let r = icMemo.get(p); if (!r) { r = icSerial(p).then(v => { if (!v) icMemo.delete(p); return v; }); icMemo.set(p, r); } return r; };
ipcMain.handle('apps:search', async (_, q) => {
  q = String(q || '').toLowerCase().trim(); if (!q) return [];
  const sc = a => { const n = a.name.toLowerCase(); return n.startsWith(q) ? 0 : n.split(/[\s\-_.]+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : 9; };
  const r = appIndex().map(a => [sc(a), a]).filter(x => x[0] < 9).sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length).slice(0, 7).map(x => x[1]);
  const out = []; for (const a of r) out.push({ ...a, logo: await iconOf(a.path) });
  return out;
});
ipcMain.handle('task:pinned', async () => {
  if (process.platform !== 'win32') return [];
  const d = path.join(process.env.APPDATA || '', 'Microsoft', 'Internet Explorer', 'Quick Launch', 'User Pinned', 'TaskBar');
  let fl = []; try { fl = fs.readdirSync(d).filter(f => /\.lnk$/i.test(f)); } catch {}
  const out = []; for (const f of fl) out.push({ name: f.replace(/\.lnk$/i, ''), path: path.join(d, f), logo: await iconOf(path.join(d, f)) });
  return out;
});
/* ===== Mises à jour (GitHub Releases) =====
   Le dépôt est lu dans package.json ("repository"). Une release GitHub dont le tag (vX.Y.Z) est plus récent que la version
   de l'app et qui contient un .exe déclenche l'alerte ; en version portable le .exe est téléchargé puis remplace l'ancien. */
const UPDATE_REPO = ''; // optionnel : 'proprietaire/depot' (sinon pris dans package.json)
const pkg = (() => { try { return require('./package.json'); } catch { return {}; } })();
const repoOf = () => {
  if (UPDATE_REPO) return UPDATE_REPO;
  const r = pkg.repository, s = typeof r === 'string' ? r : (r && r.url) || '';
  const m = s.match(/github(?:\.com)?[:/]+([^/\s]+)\/([^/\s#]+?)(?:\.git)?(?:#.*)?$/i);
  return m && !/^OWNER$/i.test(m[1]) ? m[1] + '/' + m[2] : null;
};
const upd = { state: 'idle', cur: app.getVersion(), ver: '', notes: '', pct: 0, err: '', page: '', exe: false, canInstall: !!process.env.PORTABLE_EXECUTABLE_FILE };
let updFile = '', updUrl = '', updBusy = false, updApplied = false;
const setUpd = p => { Object.assign(upd, p); if (win && !win.isDestroyed()) win.webContents.send('upd', upd); };
const newer = (a, b) => { const f = v => String(v).replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n) || 0); const x = f(a), y = f(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
async function checkUpdate(manual) {
  if (updBusy || upd.state === 'downloading' || upd.state === 'ready') return;
  const repo = repoOf(); if (!repo) { if (manual) setUpd({ state: 'error', err: 'repo' }); return; }
  updBusy = true; if (manual) setUpd({ state: 'checking', err: '' });
  try {
    const r = await net.fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { 'User-Agent': 'Halo', Accept: 'application/vnd.github+json' } });
    if (r.status === 404) throw new Error('404');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(), ver = String(j.tag_name || '').replace(/^v/i, '');
    if (!ver || !newer(ver, app.getVersion())) { setUpd({ state: 'uptodate', ver: '', err: '' }); return; }
    const a = (j.assets || []).find(x => /\.exe$/i.test(x.name));
    updUrl = a ? a.browser_download_url : '';
    setUpd({ state: 'available', ver, notes: String(j.body || '').slice(0, 600), page: j.html_url || '', pct: 0, err: '', exe: !!updUrl });
    if (cfg.autoUpdate !== false && updUrl && upd.canInstall) downloadUpdate();
  } catch (e) { if (manual) setUpd({ state: 'error', err: String(e.message || e) }); else if (upd.state === 'checking') setUpd({ state: 'idle' }); }
  finally { updBusy = false; }
}
async function downloadUpdate() {
  if (!updUrl || upd.state === 'downloading') return;
  setUpd({ state: 'downloading', pct: 0, err: '' });
  try {
    const dir = path.join(app.getPath('temp'), 'halo-update'); fs.mkdirSync(dir, { recursive: true });
    const part = path.join(dir, `Halo-${upd.ver}.exe.part`);
    const r = await net.fetch(updUrl, { headers: { 'User-Agent': 'Halo' } });
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    const total = +r.headers.get('content-length') || 0; let got = 0, last = 0;
    const out = fs.createWriteStream(part), done = new Promise((ok, ko) => { out.on('finish', ok); out.on('error', ko); });
    const rd = r.body.getReader();
    for (;;) {
      const { done: end, value } = await rd.read(); if (end) break;
      if (!out.write(value)) await new Promise(ok => out.once('drain', ok));
      got += value.length; const now = Date.now(); if (total && now - last > 250) { last = now; setUpd({ pct: Math.round(got / total * 100) }); }
    }
    out.end(); await done;
    if (total && got !== total) throw new Error('size');
    updFile = part.replace(/\.part$/, ''); fs.renameSync(part, updFile);
    setUpd({ state: 'ready', pct: 100 });
  } catch (e) { setUpd({ state: 'error', err: String(e.message || e) }); }
}
// remplace l'exe portable une fois l'app fermée (script détaché, avec nouvelles tentatives tant que le fichier est verrouillé)
function applyUpdate(relaunch) {
  const target = process.env.PORTABLE_EXECUTABLE_FILE;
  if (updApplied || !updFile || !target || !fs.existsSync(updFile)) return false;
  updApplied = true;
  const q = s => s.replace(/%/g, '%%'), bat = path.join(path.dirname(updFile), 'apply.cmd');
  fs.writeFileSync(bat, ['@echo off', 'set n=0', ':r', 'set /a n+=1', 'ping 127.0.0.1 -n 2 >nul', `move /y "${q(updFile)}" "${q(target)}" >nul 2>&1`, 'if not errorlevel 1 goto ok', 'if %n% lss 60 goto r', 'exit /b 1', ':ok', relaunch ? `start "" "${q(target)}"` : 'rem', 'exit /b 0'].join('\r\n'));
  try { spawn('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true }).unref(); return true; } catch { updApplied = false; return false; }
}
ipcMain.handle('upd:get', () => upd);
ipcMain.on('upd:check', () => checkUpdate(true));
ipcMain.on('upd:install', () => {
  if (upd.state === 'ready') { if (applyUpdate(true)) app.quit(); }
  else if (upd.state === 'available') { if (upd.canInstall && updUrl) downloadUpdate(); else if (upd.page) shell.openExternal(upd.page); }
});
ipcMain.on('upd:page', () => { if (upd.page) shell.openExternal(upd.page); });
ipcMain.handle('icon:file', (_, p) => iconOf(p));
ipcMain.on('launch', (_, target) => (target.includes('://') ? shell.openExternal(target) : shell.openPath(target)));
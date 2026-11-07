// boot.js — nouveau point d'entrée ("main" dans package.json).
// Charge le code mis à jour (userData/hotcode/current) s'il existe, sinon le code embarqué dans l'exe.
// Les patchs sont lus depuis patch/patch.json sur GitHub (branche main) : un simple `git push` suffit.
const { app, ipcMain, BrowserWindow, net } = require('electron');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const BASE = app.getAppPath();                                   // code embarqué (app.asar)
const ROOT = path.join(app.getPath('userData'), 'hotcode');
const DIR = path.join(ROOT, 'current'), NEXT = path.join(ROOT, 'next'), META = path.join(ROOT, 'meta.json');
const ALLOWED = /^[A-Za-z0-9_.-]+\.(js|css|html|ps1|json|png|svg|ico)$/i;
const FORBIDDEN = /^(boot\.js|package\.json)$/i;
const EXE_VER = app.getVersion();

const pkg = (() => { try { return JSON.parse(fs.readFileSync(path.join(BASE, 'package.json'), 'utf8')); } catch { return {}; } })();
const rd = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const wr = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o)); };
const rm = d => { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} };
const newer = (a, b) => { const f = v => String(v).replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n) || 0); const x = f(a), y = f(b); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); return false; };
const hashFiles = files => { const h = crypto.createHash('sha256'); for (const n of Object.keys(files).sort()) { const f = files[n]; h.update(n + '\0' + f.enc + '\0' + f.data + '\0'); } return h.digest('hex'); };

/* ---------- Choix du code à lancer ---------- */
let meta = rd(META) || {}, hot = false, curVersion = 0;

function markBad(v) { rm(DIR); rm(NEXT); wr(META, { bad: [...new Set([...(meta.bad || []), v].filter(Boolean))].slice(-10) }); }

try {
  if (meta.version && fs.existsSync(path.join(DIR, 'main.js'))) {
    if (meta.exe !== EXE_VER) { rm(DIR); wr(META, { bad: meta.bad || [] }); meta = rd(META); }       // nouvel exe : on repart du code embarqué
    else if ((meta.tries || 0) >= 3) { markBad(meta.version); meta = rd(META); }                      // le patch plante au démarrage : retiré
    else { meta.tries = (meta.tries || 0) + 1; wr(META, meta); hot = true; curVersion = meta.version; }
  }
} catch { hot = false; }

process.env.HALO_BASE = BASE; // le preload s'en sert pour retrouver node_modules (lucide-static) dans l'asar

if (hot) {
  app.getAppPath = () => DIR; // pour que win.loadFile('index.html') pointe vers le code mis à jour
  setTimeout(() => { try { const m = rd(META) || {}; m.tries = 0; wr(META, m); } catch {} }, 25000).unref?.();
  try { require(path.join(DIR, 'main.js')); }
  catch (e) { markBad(curVersion); relaunch(); }
} else {
  require('./main.js');
}

/* ---------- Redémarrage ---------- */
function relaunch() {
  const exe = process.env.PORTABLE_EXECUTABLE_FILE;
  try {
    if (exe) {
      const cmd = `ping 127.0.0.1 -n 3 >nul & start "" "${exe.replace(/%/g, '%%')}"`;
      spawn('cmd.exe', ['/d', '/s', '/c', `"${cmd}"`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
    } else app.relaunch();
  } catch {}
  app.quit();
  setTimeout(() => app.exit(0), 3000);
}

/* ---------- Mise à jour du code ---------- */
const repoOf = () => {
  const r = pkg.repository, s = typeof r === 'string' ? r : (r && r.url) || '';
  const m = s.match(/github(?:\.com)?[:/]+([^/\s]+)\/([^/\s#]+?)(?:\.git)?(?:#.*)?$/i);
  return m && !/^OWNER$/i.test(m[1]) ? m[1] + '/' + m[2] : null;
};
const patchUrl = () => (pkg.halo && pkg.halo.patchUrl) || (repoOf() ? `https://raw.githubusercontent.com/${repoOf()}/${(pkg.halo && pkg.halo.branch) || 'main'}/patch/patch.json` : null);
const emit = s => BrowserWindow.getAllWindows().forEach(w => { try { if (!w.isDestroyed()) w.webContents.send('patch', { ...s, current: curVersion }); } catch {} });
const autoOn = () => { const c = rd(path.join(app.getPath('userData'), 'config.json')); return !c || c.autoUpdate !== false; };

let busy = false;
async function checkPatch(manual) {
  if (busy) return; busy = true;
  try {
    const url = patchUrl(); if (!url) { if (manual) emit({ state: 'error', err: 'repo' }); return; }
    if (manual) emit({ state: 'checking' });
    const r = await net.fetch(url + '?t=' + Date.now(), { headers: { 'User-Agent': 'Halo', 'Cache-Control': 'no-cache' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const p = await r.json();
    if (!p || typeof p.version !== 'number' || !p.files || typeof p.files !== 'object') throw new Error('format');
    if (p.version <= curVersion || (meta.bad || []).includes(p.version) || (p.minExe && newer(p.minExe, EXE_VER))) { if (manual) emit({ state: 'uptodate' }); return; }
    const names = Object.keys(p.files);
    if (!names.includes('main.js') || names.some(n => !ALLOWED.test(n) || FORBIDDEN.test(n))) throw new Error('files');
    for (const n of names) { const f = p.files[n]; if (!f || typeof f.data !== 'string' || (f.enc !== 'utf8' && f.enc !== 'base64')) throw new Error('files'); }
    if (hashFiles(p.files) !== p.sha256) throw new Error('hash');

    rm(NEXT); fs.mkdirSync(NEXT, { recursive: true });
    for (const n of names) { const f = p.files[n]; fs.writeFileSync(path.join(NEXT, n), f.enc === 'base64' ? Buffer.from(f.data, 'base64') : f.data, f.enc === 'base64' ? undefined : 'utf8'); }
    fs.writeFileSync(path.join(NEXT, 'package.json'), fs.readFileSync(path.join(BASE, 'package.json')));
    rm(DIR); fs.renameSync(NEXT, DIR);
    meta = { version: p.version, exe: EXE_VER, tries: 0, bad: meta.bad || [] }; wr(META, meta);
    emit({ state: 'ready', version: p.version });
    setTimeout(relaunch, 3000);
  } catch (e) { rm(NEXT); if (manual) emit({ state: 'error', err: String(e.message || e) }); }
  finally { busy = false; }
}

ipcMain.on('patch:check', () => checkPatch(true));
ipcMain.handle('patch:get', () => ({ current: curVersion, exe: EXE_VER }));
app.whenReady().then(() => {
  setTimeout(() => { if (autoOn()) checkPatch(false); }, 6000);
  setInterval(() => { if (autoOn()) checkPatch(false); }, 20 * 60 * 1000).unref?.();
});
const { contextBridge, ipcRenderer: r } = require('electron');
const path = require('path');
// lucide-static vit dans l'asar de l'exe ; quand le code vient du dossier de mise à jour, boot.js fournit HALO_BASE
const iconsFile = () => { try { return require.resolve('lucide-static/icon-nodes.json'); } catch { return path.join(process.env.HALO_BASE || __dirname, 'node_modules', 'lucide-static', 'icon-nodes.json'); } };
contextBridge.exposeInMainWorld('api', {
  icons: require(iconsFile()),
  sys: () => r.invoke('sys'), getCfg: () => r.invoke('cfg:get'), setCfg: p => r.invoke('cfg:set', p),
  stats: () => r.invoke('stats'), pick: () => r.invoke('pick'), pickImage: () => r.invoke('pick:image'),
  launch: t => r.send('launch', t), quit: () => r.send('quit'), ignore: v => r.send('ignore', v),
  captureSource: () => r.invoke('capture:source'), captureFallback: () => r.send('capture:fallback'),
  geom: () => r.invoke('geom'), onGeom: f => r.on('geom', (_, d) => f(d)), onProbe: f => r.on('probe', (_, d) => f(d)),
  onWins: f => r.on('wins', (_, d) => f(d)), focusWin: (h, p) => r.send('win:focus', h, p), linkTarget: p => r.invoke('link:target', p),
  sysCmd: c => r.send('sys:cmd', c), onSys: f => r.on('sys:evt', (_, d) => f(d)),
  startMenu: () => r.send('task:start'), hideWinTask: v => r.send('task:hide', v), searchApps: q => r.invoke('apps:search', q), pinnedWin: () => r.invoke('task:pinned'), iconFile: p => r.invoke('icon:file', p),
  screens: () => r.invoke('screens:list'), identifyScreens: () => r.send('screens:identify'), onScreens: f => r.on('screens', (_, d) => f(d)),
  updGet: () => r.invoke('upd:get'), updCheck: () => r.send('upd:check'), updInstall: () => r.send('upd:install'), updPage: () => r.send('upd:page'), onUpd: f => r.on('upd', (_, d) => f(d)),
  patchGet: () => r.invoke('patch:get'), patchCheck: () => r.send('patch:check'), onPatch: f => r.on('patch', (_, d) => f(d)),
  islDetach: (w, h) => r.send('isl:detach', w, h), islFit: (w, h) => r.send('isl:fit', w, h), islDragStart: (x, y) => r.send('isl:dragstart', x, y), islDragEnd: () => r.send('isl:dragend'), islAttach: () => r.send('isl:attach'), islTo: (d, w, h) => r.send('isl:to', d, w, h), dragHold: v => r.send('drag:hold', v),
  onIslState: f => r.on('isl:state', (_, d) => f(d)), onIslAttached: f => r.on('isl:attached', (_, d) => f(d)), onCfg: f => r.on('cfg:sync', (_, d) => f(d)),
  mediaCmd: c => r.send('media:cmd', c), onScreen: f => r.on('screen', (_, d) => f(d)), onMedia: f => r.on('media', (_, d) => f(d))
});
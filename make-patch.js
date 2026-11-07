// make-patch.js — génère patch/patch.json (le code de l'app) : `npm run patch` puis `git add patch && git commit && git push`
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const pkg = require('./package.json');

const names = fs.readdirSync(__dirname).filter(f => /^(main|preload|renderer)\.js$|^style\.css$|^index\.html$|\.ps1$/i.test(f));
const files = {};
for (const n of names) files[n] = { enc: 'utf8', data: fs.readFileSync(path.join(__dirname, n), 'utf8') };

const h = crypto.createHash('sha256');
for (const n of Object.keys(files).sort()) h.update(n + '\0' + files[n].enc + '\0' + files[n].data + '\0');

const d = new Date(), z = n => String(n).padStart(2, '0');
const version = Number(`${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}`);
const minExe = process.argv[2] || pkg.version; // version minimale de l'exe compatible avec ce patch

fs.mkdirSync(path.join(__dirname, 'patch'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'patch', 'patch.json'), JSON.stringify({ version, minExe, sha256: h.digest('hex'), files }));
console.log(`patch ${version} (exe >= ${minExe}) : ${names.join(', ')}`);
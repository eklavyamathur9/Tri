// Starts J: the laptop server plus the cloudflared tunnel, in one window.
// Prints the tool URL for Sarvam, copies it to the clipboard and saves it to tunnel-url.txt.
//
//   node start.js        (or double-click Start-J.bat in the folder above)
//
// The free tunnel address changes on every start. If it differs from last time,
// paste the new one into Sarvam (laptop_action tool URL), then Commit and deploy.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SAVED = path.join(ROOT, 'tunnel-url.txt');
const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
const PORT = Number((env.match(/^PORT=(\d+)/m) || [])[1] || 3710);

if (!env.match(/^JARVIS_TOKEN=\S+/m)) {
  console.log('Settings are missing. Run this first:  node setup.js <your mobile number>');
  process.exit(1);
}
if (spawnSync('cloudflared', ['--version']).status !== 0) {
  console.log('cloudflared is not installed. Install it once with:');
  console.log('  winget install --id Cloudflare.cloudflared');
  console.log('then close this window and start J again.');
  process.exit(1);
}

const children = [];
const stopAll = () => { for (const c of children) { try { c.kill(); } catch {} } process.exit(0); };
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

// The server restarts by itself when .env is saved, so settings changes never need a new
// tunnel address (closing this window is what changes the address).
let server;
let restarting = false;
const startServer = () => {
  server = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'inherit' });
  children.push(server);
  server.on('exit', (code) => {
    if (restarting) { restarting = false; startServer(); return; }
    console.log(`\nThe J server stopped (code ${code}). If it says the port is in use, J is already running in another window.`);
    stopAll();
  });
};
startServer();
// Saving your settings (.env) or J's actions (server.js) restarts just the server.
const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');
const last = { '.env': env, 'server.js': read('server.js') };
for (const f of Object.keys(last)) {
  fs.watchFile(path.join(ROOT, f), { interval: 1000 }, () => {
    const now = read(f);
    if (now === last[f]) return;
    last[f] = now;
    console.log(`\n${f === '.env' ? 'Settings' : 'Actions'} changed, restarting the J server (the tool URL stays the same)...`);
    restarting = true;
    server.kill();
  });
}

const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], { cwd: ROOT });
children.push(tunnel);
let found = false;
const watch = (chunk) => {
  const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!m || found) return;
  found = true;
  const toolUrl = `${m[0]}/action`;
  const previous = fs.existsSync(SAVED) ? fs.readFileSync(SAVED, 'utf8').trim() : '';
  fs.writeFileSync(SAVED, `${toolUrl}\n`);
  spawnSync('clip', [], { input: toolUrl });
  console.log('\n==============================================================');
  console.log(' J is running. Dashboard: http://localhost:' + PORT);
  console.log(' Tool URL for Sarvam (already copied to your clipboard):');
  console.log('   ' + toolUrl);
  if (previous && previous !== toolUrl) {
    console.log(' This address CHANGED since last time. In Sarvam, open J >');
    console.log(' Tools > laptop_action, paste it as the URL, then Commit and deploy.');
  }
  console.log(' Keep this window open. Close it to switch J off.');
  console.log('==============================================================\n');
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);
tunnel.on('exit', (code) => {
  console.log(`\nThe tunnel stopped (code ${code}). Start J again to get a new address.`);
  stopAll();
});
setTimeout(() => {
  if (!found) console.log('Still waiting for the tunnel address... check your internet connection.');
}, 30_000);

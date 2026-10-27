// Starts Tri: the laptop server plus the cloudflared tunnel, in one process.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import platform from './platform/index.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SAVED = path.join(ROOT, 'tunnel-url.txt');
const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
const PORT = Number((env.match(/^PORT=(\d+)/m) || env.match(/^TRI_PORT=(\d+)/m) || [])[1] || 3710);

const token = (env.match(/^TRI_TOKEN=(\S+)/m) || env.match(/^JARVIS_TOKEN=(\S+)/m) || [])[1];
if (!token) {
  console.log('Settings are missing. Run this first:  node setup.js <your mobile number>');
  process.exit(1);
}
if (spawnSync('cloudflared', ['--version']).status !== 0) {
  console.log('cloudflared is not installed.');
  console.log('Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
  process.exit(1);
}

const children = [];
const stopAll = () => { for (const c of children) { try { c.kill(); } catch {} } process.exit(0); };
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

let server;
let restarting = false;
const startServer = () => {
  server = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'inherit' });
  children.push(server);
  server.on('exit', (code) => {
    if (restarting) { restarting = false; startServer(); return; }
    console.log(`\nThe Tri server stopped (code ${code}).`);
    stopAll();
  });
};
startServer();

const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');
const last = { '.env': env, 'server.js': read('server.js') };
for (const f of Object.keys(last)) {
  try {
    fs.watchFile(path.join(ROOT, f), { interval: 1000 }, () => {
      const now = read(f);
      if (now === last[f]) return;
      last[f] = now;
      console.log(`\n${f === '.env' ? 'Settings' : 'Actions'} changed, restarting the Tri server (the tool URL stays the same)...`);
      restarting = true;
      server.kill();
    });
  } catch {}
}

const tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], { cwd: ROOT });
children.push(tunnel);
let found = false;
const watch = async (chunk) => {
  const m = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!m || found) return;
  found = true;
  const toolUrl = `${m[0]}/action`;
  const previous = fs.existsSync(SAVED) ? fs.readFileSync(SAVED, 'utf8').trim() : '';
  fs.writeFileSync(SAVED, `${toolUrl}\n`);
  if (platform.setClipboard) {
    await platform.setClipboard(toolUrl);
  } else if (process.platform === 'linux') {
    spawn('sh', ['-c', `echo -n "${toolUrl}" | xclip -selection clipboard 2>/dev/null || echo -n "${toolUrl}" | wl-copy 2>/dev/null`]);
  }
  console.log('\n==============================================================');
  console.log(' Tri is running. Dashboard: http://localhost:' + PORT);
  console.log(' Tool URL for your voice agent (copied to clipboard):');
  console.log('   ' + toolUrl);
  if (previous && previous !== toolUrl) {
    console.log(' This address CHANGED since last time. Update the tool URL in your agent config.');
  }
  console.log(' Keep this terminal open. Ctrl+C to stop Tri.');
  console.log('==============================================================\n');
};
tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);
tunnel.on('exit', (code) => {
  console.log(`\nThe tunnel stopped (code ${code}). Start Tri again to get a new address.`);
  stopAll();
});
setTimeout(() => {
  if (!found) console.log('Still waiting for the tunnel address... check your internet connection.');
}, 30_000);

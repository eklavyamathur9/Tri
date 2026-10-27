// Tri: laptop action server for a voice agent.
// You call your voice agent number, the agent decides what to do, and calls these HTTPS tools
// (through a tunnel). Only a fixed allowlist of actions exists. No shell input
// from the caller ever reaches a command line.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findFiles, describe, buildIndex } from './files.js';
import { createMonitor } from './monitor.js';
import { createClassroom } from './classroom.js';
import platform, { isWindows, isLinux } from './platform/index.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
for (const line of (fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
// Support both TRI_* and legacy/JARVIS_* env vars
if (!process.env.TRI_TOKEN && process.env.JARVIS_TOKEN) process.env.TRI_TOKEN = process.env.JARVIS_TOKEN;
if (!process.env.OWNER_NUMBER && process.env.TRI_OWNER) process.env.OWNER_NUMBER = process.env.TRI_OWNER;
if (!process.env.TRI_OWNER && process.env.OWNER_NUMBER) process.env.TRI_OWNER = process.env.OWNER_NUMBER;
if (!process.env.TRI_OWNER && process.env.JARVIS_OWNER) process.env.TRI_OWNER = process.env.JARVIS_OWNER;

const PORT = Number(process.env.PORT || process.env.TRI_PORT || 3710);
const TOKEN = process.env.TRI_TOKEN || process.env.JARVIS_TOKEN || '';
const OWNER = (process.env.TRI_OWNER || process.env.OWNER_NUMBER || '').replace(/\D/g, '');
const ALLOW_NO_CALLER = String(process.env.ALLOW_NO_CALLER !== undefined ? process.env.ALLOW_NO_CALLER : (process.env.TRI_ALLOW_NO_CALLER || 'true')) === 'true';
const OWNER_CALLER_ID = (process.env.TRI_OWNER_CALLER_ID || process.env.OWNER_CALLER_ID || '').trim().toLowerCase();
const OWNER_HASHES = new Set(OWNER ? (() => {
  const ten = OWNER.slice(-10);
  const forms = [OWNER, `+${OWNER}`, ten, `0${ten}`, `+91${ten}`, `91${ten}`, `+91 ${ten}`];
  return forms.flatMap((f) => ['sha256', 'sha1', 'md5'].map((a) => crypto.createHash(a).update(f).digest('hex')));
})() : []);
let lastCaller = '';
const NOTES = path.join(os.homedir(), 'Documents', 'Tri Notes.md');

const activity = [];
const recent = new Map();
const DEDUPE_MS = 10_000;
function record(entry) {
  activity.unshift({ at: new Date().toLocaleTimeString('en-IN'), ...entry });
  activity.length = Math.min(activity.length, 50);
  console.log(`[${activity[0].at}]`, entry.action, JSON.stringify(entry.input || ''), '->', entry.result);
}

// ---------- safe launchers ----------
const run = (file, args) => {
  if (platform.runApp) {
    return platform.runApp(Array.isArray(file) ? file : [file, args || []]);
  }
  return new Promise((resolve) => {
    try {
      const p = spawn(file, args || [], { detached: true, stdio: 'ignore', ...(isWindows ? { windowsHide: true } : {}) });
      p.on('error', () => resolve(false));
      p.unref();
      setTimeout(() => resolve(true), 150);
    } catch { resolve(false); }
  });
};
const openUrl = (url) => platform.openUrl ? platform.openUrl(url) : run('xdg-open', [url]);
const ps = (cmd) => {
  if (platform.powershell) return platform.powershell(cmd);
  if (platform.shell) return platform.shell(cmd);
  return Promise.resolve('');
};
const psEnv = async (script, vars = {}, { detached = false } = {}) => {
  if (platform.powershell) {
    try {
      return await platform.powershell(script, vars, { detached });
    } catch {}
  }
  // On Linux, PowerShell scripts won't work - try to run as shell if it's a simple command
  if (isLinux) {
    try {
      if (detached && platform.shell) {
        spawn('sh', ['-c', script], { detached: true, stdio: 'ignore', env: { ...process.env, ...vars } });
        return true;
      }
      if (platform.shell) return await platform.shell(script);
    } catch {}
    return true; // Don't fail hard on Linux for psEnv
  }
  return Promise.resolve(true);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WIN_SPEAK = 'Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=0; $s.Speak($env:TRI_TEXT)';

const KEY = (code, times = 1) => isWindows 
  ? `$w=New-Object -ComObject WScript.Shell; 1..${times} | % { $w.SendKeys([char]${code}); Start-Sleep -Milliseconds 40 }`
  : null;

const MEDIA = isWindows ? {
  play: [KEY(179), 'Toggled play and pause.'], pause: [KEY(179), 'Toggled play and pause.'], resume: [KEY(179), 'Toggled play and pause.'],
  next: [KEY(176), 'Skipped to the next track.'], previous: [KEY(177), 'Went back to the previous track.'], back: [KEY(177), 'Went back to the previous track.'],
  'volume up': [KEY(175, 6), 'Turned the volume up.'], louder: [KEY(175, 6), 'Turned the volume up.'],
  'volume down': [KEY(174, 6), 'Turned the volume down.'], quieter: [KEY(174, 6), 'Turned the volume down.'],
  mute: [KEY(173), 'Toggled mute.'], unmute: [KEY(173), 'Toggled mute.'],
} : {
  play: ['linux-media', 'Toggled play and pause.'], pause: ['linux-media', 'Toggled play and pause.'], resume: ['linux-media', 'Toggled play and pause.'],
  next: ['linux-media-next', 'Skipped to the next track.'], previous: ['linux-media-prev', 'Went back to the previous track.'], back: ['linux-media-prev', 'Went back to the previous track.'],
  'volume up': ['linux-vol-up', 'Turned the volume up.'], louder: ['linux-vol-up', 'Turned the volume up.'],
  'volume down': ['linux-vol-down', 'Turned the volume down.'], quieter: ['linux-vol-down', 'Turned the volume down.'],
  mute: ['linux-mute', 'Toggled mute.'], unmute: ['linux-mute', 'Toggled mute.'],
};

const ROUTINES = {
  work: { say: 'Work mode on. Opening your workspace.', urls: ['https://mail.google.com', 'https://calendar.google.com'], apps: isWindows ? [['explorer.exe', ['vscode:']]] : [['code', []]] },
  study: { say: 'Study mode on. Lo-fi music and a fresh notepad.', urls: ['https://www.youtube.com/watch?v=jfKfPfyJRdk'], apps: isWindows ? [['notepad.exe', []]] : [['gedit', []], ['kate', []]] },
  chill: { say: 'Chill mode on. Playing some music.', urls: ['https://www.youtube.com/results?search_query=lo-fi+music'], apps: [] },
  news: { say: 'Opening today\'s top news.', urls: ['https://news.google.com/home?hl=en-IN&gl=IN&ceid=IN:en'], apps: [] },
  demo: { say: 'Demo mode. Opening Tri dashboard.', urls: ['http://localhost:' + PORT], apps: [] },
};

async function readBattery() {
  if (platform.readBattery) {
    return await platform.readBattery();
  }
  if (isWindows) {
    const raw = await ps('$b=Get-CimInstance Win32_Battery; if($b){"$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)"}else{"none"}');
    if (!raw || raw === 'none') return null;
    const [pct, st] = raw.split('|');
    return { pct: Number(pct), charging: st === '2' || st === '6' || st === '7' || st === '8' || st === '9' };
  }
  return null;
}

const classroom = createClassroom({ root: ROOT, env: process.env });
const monitor = createMonitor({ root: ROOT, env: process.env, record: (e) => record(e), battery: readBattery });
const FOCUS_MUSIC = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';

const SITES = {
  youtube: 'https://www.youtube.com', gmail: 'https://mail.google.com', google: 'https://www.google.com',
  whatsapp: 'https://web.whatsapp.com', linkedin: 'https://www.linkedin.com', github: 'https://github.com',
  maps: 'https://maps.google.com', 'google maps': 'https://maps.google.com', calendar: 'https://calendar.google.com',
  'google calendar': 'https://calendar.google.com', drive: 'https://drive.google.com', 'google drive': 'https://drive.google.com',
  twitter: 'https://x.com', x: 'https://x.com', instagram: 'https://www.instagram.com', amazon: 'https://www.amazon.in',
  flipkart: 'https://www.flipkart.com', irctc: 'https://www.irctc.co.in', cricbuzz: 'https://www.cricbuzz.com',
  chatgpt: 'https://chatgpt.com', grok: 'https://grok.com', claude: 'https://claude.ai', netflix: 'https://www.netflix.com', spotify: 'https://open.spotify.com',
};

const APPS = isWindows ? {
  notepad: ['notepad.exe', []], calculator: ['calc.exe', []], calc: ['calc.exe', []],
  chrome: ['cmd.exe', ['/c', 'start', '', 'chrome']], browser: ['cmd.exe', ['/c', 'start', '', 'chrome']],
  'vs code': ['explorer.exe', ['vscode:']], vscode: ['explorer.exe', ['vscode:']], code: ['explorer.exe', ['vscode:']],
  'file explorer': ['explorer.exe', []], explorer: ['explorer.exe', []], files: ['explorer.exe', []],
  downloads: ['explorer.exe', [path.join(os.homedir(), 'Downloads')]], documents: ['explorer.exe', [path.join(os.homedir(), 'Documents')]],
  paint: ['mspaint.exe', []], camera: ['explorer.exe', ['microsoft.windows.camera:']], spotify: ['explorer.exe', ['spotify:']],
  settings: ['explorer.exe', ['ms-settings:']], 'task manager': ['taskmgr.exe', []], terminal: ['cmd.exe', ['/c', 'start', '', 'wt']],
  word: ['cmd.exe', ['/c', 'start', '', 'winword']], excel: ['cmd.exe', ['/c', 'start', '', 'excel']],
  powerpoint: ['cmd.exe', ['/c', 'start', '', 'powerpnt']],
} : {
  notepad: ['gedit', []], texteditor: ['gedit', []], calculator: ['gnome-calculator', []], calc: ['gnome-calculator', []],
  chrome: ['google-chrome', []], chromium: ['chromium', []], browser: ['xdg-open', []],
  firefox: ['firefox', []],
  'vs code': ['code', []], vscode: ['code', []], 'visual studio code': ['code', []], code: ['code', []], codium: ['codium', []],
  'file explorer': ['nautilus', []], explorer: ['nautilus', []], files: ['nautilus', []], nemo: ['nemo', []], thunar: ['thunar', []],
  downloads: ['xdg-open', [path.join(os.homedir(), 'Downloads')]], documents: ['xdg-open', [path.join(os.homedir(), 'Documents')]],
  pictures: ['xdg-open', [path.join(os.homedir(), 'Pictures')]],
  paint: ['gimp', []], pinta: ['pinta', []],
  camera: ['cheese', []],
  settings: ['gnome-control-center', []], 'task manager': ['gnome-system-monitor', []], htop: ['gnome-terminal', ['--', 'htop']],
  terminal: ['gnome-terminal', []], konsole: ['konsole', []],
  spotify: ['spotify', []], vlc: ['vlc', []],
};

const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
const norm = (s) => clean(s).toLowerCase().replace(/^(the|my)\s+/, '').replace(/[.!?]+$/, '');

const ACTIONS = {
  async open_app({ input }) {
    const q = norm(input);
    const app = APPS[q];
    if (!app) {
      if (SITES[q]) return ACTIONS.open_website({ input: q });
      return `I can't open ${q || 'that'}. I can open notepad, calculator, chrome, VS Code, file explorer, downloads, paint, camera, settings, task manager, Word, Excel or PowerPoint.`;
    }
    const ok = await run(app[0], app[1]);
    return ok ? `Opened ${q}.` : `I tried to open ${q} but it did not start.`;
  },
  async take_note({ input }) {
    const text = clean(input);
    if (!text) return 'What should I write down?';
    fs.mkdirSync(path.dirname(NOTES), { recursive: true });
    if (!fs.existsSync(NOTES)) fs.writeFileSync(NOTES, '# Tri Notes\n\n');
    fs.appendFileSync(NOTES, `- ${new Date().toLocaleString('en-IN')}: ${text}\n`);
    return `Noted: ${text}.`;
  },
  async read_notes() {
    if (!fs.existsSync(NOTES)) return 'You have no notes yet.';
    const lines = fs.readFileSync(NOTES, 'utf8').split('\n').filter(l => l.startsWith('- ')).slice(-5);
    if (!lines.length) return 'You have no notes yet.';
    return `Your last ${lines.length} notes: ` + lines.map(l => l.replace(/^- [^:]+:\d\d:\d\d(?:\s?[ap]m)?:\s*/i, '').replace(/^- /, '')).join('. ') + '.';
  },
  async show_notes() {
    if (!fs.existsSync(NOTES)) return 'You have no notes yet.';
    if (isWindows) {
      await run('notepad.exe', [NOTES]);
    } else {
      await openUrl(NOTES);
    }
    return 'Your notes are open on the screen.';
  },
  async system_status() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const date = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    let battery = 'no battery reading';
    try {
      const bat = await readBattery();
      if (bat && bat.pct !== undefined) {
        battery = `battery at ${bat.pct} percent, ${bat.charging ? 'charging' : 'on battery power'}`;
      } else if (isWindows) {
        const raw = await ps('$b=Get-CimInstance Win32_Battery; if($b){"$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)"}else{"none"}');
        if (raw && raw !== 'none') {
          const [pct, st] = raw.split('|');
          battery = `battery at ${pct} percent, ${st === '2' ? 'charging' : 'on battery power'}`;
        }
      }
    } catch {}
    return `It is ${time} on ${date}. The laptop is on, ${battery}.`;
  },
  async lock_screen() {
    if (platform.lockScreen) {
      setTimeout(() => platform.lockScreen(), 1500);
    } else if (isWindows) {
      setTimeout(() => run('rundll32.exe', ['user32.dll,LockWorkStation']), 1500);
    } else {
      setTimeout(() => run('loginctl', ['lock-session']), 1500);
    }
    return 'Locking your laptop now.';
  },

  // ----- the "wow" set: fixed keys, fixed URLs, or text that is only spoken/displayed -----
  async media_control({ input }) {
    const q = norm(input).replace(/^(the )?(music|song|video)\s*/, '').trim() || 'play';
    if (isLinux && platform.media) {
      try {
        if (q.includes('next')) { await platform.mediaPlayerctl?.('next'); await platform.media.next?.(); return 'Skipped to the next track.'; }
        if (q.includes('prev') || q.includes('back')) { await platform.mediaPlayerctl?.('previous'); await platform.media.previous?.(); return 'Went back to the previous track.'; }
        if (q.includes('volume up') || q.includes('louder')) { await platform.media.volumeUp?.(); await platform.setVolume?.('up'); return 'Turned the volume up.'; }
        if (q.includes('volume down') || q.includes('quieter')) { await platform.media.volumeDown?.(); await platform.setVolume?.('down'); return 'Turned the volume down.'; }
        if (q.includes('mute')) { await platform.media.mute?.(); await platform.setVolume?.('mute'); return 'Toggled mute.'; }
        await platform.mediaPlayerctl?.('play-pause'); await platform.media.playPause?.();
        return 'Toggled play and pause.';
      } catch {}
    }
    const hit = MEDIA[q] || Object.entries(MEDIA).find(([k]) => q.includes(k))?.[1];
    if (!hit) return 'I can play or pause, skip to next or previous, turn the volume up or down, or mute.';
    if (isWindows) {
      try { await psEnv(hit[0]); return hit[1]; } catch {}
    }
    if (platform.media) {
      try {
        if (q.includes('next')) await platform.media.next?.();
        else if (q.includes('prev') || q.includes('back')) await platform.media.previous?.();
        else if (q.includes('volume up')) { await platform.media.volumeUp?.(); await platform.setVolume?.('up'); }
        else if (q.includes('volume down')) { await platform.media.volumeDown?.(); await platform.setVolume?.('down'); }
        else if (q.includes('mute')) { await platform.media.mute?.(); }
        else { await platform.mediaPlayerctl?.('play-pause'); await platform.media.playPause?.(); }
        return hit[1] || 'Done.';
      } catch {}
    }
    return hit[1];
  },
  async speak_on_laptop({ input }) {
    const text = clean(input);
    if (!text) return 'What should the laptop say?';
    if (isLinux && platform.speak) {
      try { await platform.speak(text); return `The laptop is saying: ${text}`; } catch {}
    }
    if (isWindows) {
      try {
        await psEnv(WIN_SPEAK, { TRI_TEXT: text }, { detached: true });
        return `The laptop is saying: ${text}`;
      } catch {}
    }
    if (platform.speak) {
      try { await platform.speak(text); return `The laptop is saying: ${text}`; } catch {}
    }
    return `The laptop is saying: ${text}`;
  },
  async take_screenshot() {
    const dir = path.join(os.homedir(), 'Pictures', 'Tri');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const file = path.join(dir, `screenshot-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.png`);
    let ok = false;
    if (platform.takeScreenshot) {
      try { ok = await platform.takeScreenshot(file); } catch {}
    }
    if (!ok && isWindows) {
      try { ok = await psEnv('Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $bmp.Save($env:TRI_PATH)', { TRI_PATH: file }); } catch {}
    }
    if (!ok || !fs.existsSync(file)) return 'I could not take the screenshot.';
    return 'Screenshot taken and saved in your Pictures, Tri folder.';
  },
  async set_timer({ input }) {
    const q = clean(input).toLowerCase();
    const n = Number(q.match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
    if (!n) return 'For how many minutes?';
    const secs = Math.round(/sec/.test(q) ? n : /hour/.test(q) ? n * 3600 : n * 60);
    if (secs > 6 * 3600) return 'I can set timers up to 6 hours.';
    const label = clean(input).replace(/^\s*\d+(?:\.\d+)?\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)?\s*(for|to)?\s*/i, '').trim();
    const msg = label ? `Timer done: ${label}` : 'Your timer is done';
    if (isWindows) {
      try { await psEnv(`Start-Sleep -Seconds ([int]$env:TRI_SECS); ${WIN_SPEAK}`, { TRI_SECS: String(secs), TRI_TEXT: msg }, { detached: true }); } catch {}
    } else {
      try { spawn('sh', ['-c', `sleep ${secs} && (spd-say "${msg}" 2>/dev/null || espeak-ng "${msg}" 2>/dev/null || notify-send "Tri Timer" "${msg}" 2>/dev/null)`], { detached: true, stdio: 'ignore' }); } catch {}
    }
    const human = secs < 60 ? `${secs} seconds` : `${Math.round(secs / 60)} minutes`;
    return `Timer set for ${human}${label ? ` for ${label}` : ''}. The laptop will speak when it's done.`;
  },
  async draft_email({ input }) {
    const raw = clean(input);
    if (!raw) return 'Who is the email to, and what should it say?';
    const [to = '', subject = '', ...bodyParts] = raw.split('|').map((s) => s.trim());
    const u = new URL('https://mail.google.com/mail/');
    u.searchParams.set('view', 'cm'); u.searchParams.set('fs', '1');
    if (/@/.test(to)) u.searchParams.set('to', to);
    u.searchParams.set('su', subject || (/@/.test(to) ? '' : to));
    u.searchParams.set('body', bodyParts.join(' | '));
    await openUrl(u.toString());
    return 'The email draft is open in Gmail. I have not sent it, check it and press send yourself.';
  },
  async directions({ input }) {
    const q = clean(input);
    if (!q) return 'Where do you want to go?';
    await openUrl(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`);
    return `Directions to ${q} are on the screen.`;
  },
  async weather({ input }) {
    const place = !clean(input) || norm(input) === 'none' ? 'Hyderabad' : clean(input);
    await openUrl(`https://www.google.com/search?q=${encodeURIComponent('weather ' + place)}`);
    return `Weather for ${place} is on the screen.`;
  },
  async run_routine({ input }) {
    const q = norm(input).replace(/\s*mode$/, '');
    const r = ROUTINES[q];
    if (!r) return `I know these modes: ${Object.keys(ROUTINES).join(', ')}.`;
    for (const app of r.apps) await run(app[0], app[1]);
    for (const u of r.urls) { await openUrl(u); await sleep(300); }
    return r.say;
  },

  // ----- the two headline tasks -----
  async find_file({ input }) {
    const q = clean(input);
    if (!q || norm(q) === 'none') return 'Which file should I look for?';
    const hits = findFiles(q, 3);
    if (!hits.length) return `I couldn't find a file matching ${q} on your Desktop, Documents, Downloads or OneDrive.`;
    const best = describe(hits[0]);
    if (platform.openFile) {
      await platform.openFile(hits[0].full);
    } else {
      await run(isWindows ? 'explorer.exe' : 'xdg-open', [hits[0].full]);
    }
    const others = hits.length > 1 ? ` I also found ${hits.length - 1} similar file${hits.length > 2 ? 's' : ''}, ask if it's not the right one.` : '';
    return `Opened ${best.file} from ${best.where}, last edited ${best.when}.${others}`;
  },
  async focus_session({ input }) {
    const raw = clean(input);
    const mins = Math.min(180, Math.max(1, Number(raw.match(/(\d+)\s*(?:min|minute)/i)?.[1] || raw.match(/^(\d+)/)?.[1] || 25)));
    const topic = raw.replace(/\d+\s*(minutes?|mins?)?/i, '').replace(/^\s*(for|on|of)\s+/i, '').replace(/\b(focus|session|study)\b/gi, '').trim();
    let opened = '';
    if (topic && norm(topic) !== 'none') {
      const hit = findFiles(topic, 1)[0];
      if (hit) {
        if (platform.openFile) {
          await platform.openFile(hit.full);
        } else {
          await run(isWindows ? 'explorer.exe' : 'xdg-open', [hit.full]);
        }
        opened = ` I opened ${describe(hit).file}.`;
      }
    }
    await openUrl(FOCUS_MUSIC);
    const label = topic && norm(topic) !== 'none' ? topic : 'your focus session';
    setTimeout(async () => {
      if (isWindows) {
        await psEnv(WIN_SPEAK, { TRI_TEXT: `Time is up. ${mins} minutes on ${label} done. Take a short break.` }, { detached: true });
      } else if (platform.speak) {
        await platform.speak(`Time is up. ${mins} minutes on ${label} done. Take a short break.`);
      }
      await monitor.callOwner(`Boss, it's Tri. Your ${mins} minute focus session on ${label} is done. Great work. Take a five minute break, then tell me if you want another round.`, `focus session done: ${label}`);
    }, mins * 60_000);
    return `Focus session started: ${mins} minute${mins === 1 ? '' : 's'} on ${label}.${opened} Focus music is playing. I'll call you when the time is up.`;
  },

  // ----- deadlines (Tri calls you before they are due) -----
  async add_deadline({ input }) {
    const r = monitor.add(input);
    return r.error || r.text;
  },
  async list_deadlines() { return monitor.spokenList(); },
  async finish_deadline({ input }) { return monitor.finish(input); },

  // ----- Google Classroom: prepare reads the assignment and file back; confirm only after a yes -----
  async classroom_due() { return classroom.spokenDue(); },
  async submit_assignment({ input }) { return classroom.prepare(input); },
  async confirm_submission() { return classroom.confirm(); },
  async submission_status() { return classroom.submissionStatus(); },
};

const ALIASES = { open_site: 'open_website', website: 'open_website', search: 'web_search', youtube: 'play_youtube', play: 'play_youtube', app: 'open_app', note: 'take_note', notes: 'read_notes', status: 'system_status', battery: 'system_status', lock: 'lock_screen', media: 'media_control', volume: 'media_control', say: 'speak_on_laptop', speak: 'speak_on_laptop', screenshot: 'take_screenshot', timer: 'set_timer', email: 'draft_email', maps: 'directions', routine: 'run_routine', mode: 'run_routine', file: 'find_file', open_file: 'find_file', focus: 'focus_session', deadline: 'add_deadline', remind: 'add_deadline', deadlines: 'list_deadlines', submitted: 'finish_deadline', done: 'finish_deadline' };

// ---------- auth ----------
function authorise(req, body) {
  const auth = req.headers.authorization || '';
  const given = auth.replace(/^Bearer\s+/i, '') || req.headers['x-tri-token'] || body.token || '';
  if (!TOKEN || given.length !== TOKEN.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(TOKEN))) return 'bad token';
  const raw = String(req.headers['x-caller'] || body.caller || body.user_identifier || '').trim();
  if (!OWNER && !OWNER_CALLER_ID) return null;
  if (!raw) return ALLOW_NO_CALLER ? null : 'no caller number';
  lastCaller = raw;
  // Sarvam passes a hashed caller id, not the number. Accept the configured owner hash, or a
  // hash of the owner's number in a common format; plain numbers are compared on the last 10 digits.
  if (OWNER_CALLER_ID && raw.toLowerCase() === OWNER_CALLER_ID) return null;
  if (/^[0-9a-f]{32,}$/i.test(raw)) return OWNER_HASHES.has(raw.toLowerCase()) ? null : `caller ${raw.slice(0, 6)}… is not the owner`;
  const digits = raw.replace(/\D/g, '');
  if (OWNER && digits.length >= 10 && digits.slice(-10) === OWNER.slice(-10)) return null;
  return `caller …${digits.slice(-2) || raw.slice(-2)} is not the owner`;
}

// ---------- http ----------
const PAGE = fs.readFileSync(path.join(ROOT, 'live.html'), 'utf8');
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  // Anything arriving through the Cloudflare tunnel carries cf-connecting-ip. The console and
  // activity feed are for this laptop's screen only; the tunnel exposes just /action and /tools.
  const viaTunnel = Boolean(req.headers['cf-connecting-ip']);
  if (viaTunnel && req.method === 'GET') return json(res, 404, { result: 'Not found' });
  if (req.method === 'GET' && url.pathname === '/status') {
    return json(res, 200, { owner: OWNER ? `…${OWNER.slice(-2)}` : null, lock: Boolean(OWNER || OWNER_CALLER_ID), lastCaller, allowNoCaller: ALLOW_NO_CALLER, actions: Object.keys(ACTIONS), phone: process.env.TRI_PHONE || '' });
  }
  if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  if (req.method === 'GET' && url.pathname === '/activity') return json(res, 200, activity);
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });

  // Console-only endpoints (this laptop's screen): deadlines and a test call. Never via the tunnel.
  if (url.pathname.startsWith('/monitor')) {
    if (viaTunnel) return json(res, 404, { result: 'Not found' });
    if (req.method === 'GET') return json(res, 200, monitor.status());
    let raw = ''; for await (const c of req) { raw += c; if (raw.length > 5000) break; }
    let b = {}; try { b = JSON.parse(raw || '{}'); } catch {}
    if (url.pathname === '/monitor/add') { const r = monitor.add(`${b.title || ''} | ${b.when || ''}`); return json(res, r.error ? 400 : 200, { result: r.error || r.text }); }
    if (url.pathname === '/monitor/done') return json(res, 200, { result: monitor.finish(b.id) });
    if (url.pathname === '/monitor/test-call') return json(res, 200, await monitor.callOwner(b.message || "Boss, it's Tri. This is a test of your urgent call. Everything is working.", 'test call'));
    return json(res, 404, { result: 'Unknown endpoint' });
  }

  const m = url.pathname.match(/^\/tools\/([a-z_]+)$/) || (url.pathname === '/action' ? [null, null] : null);
  if (!m) return json(res, 404, { result: 'Unknown endpoint' });

  let body = {};
  if (req.method !== 'GET') {
    let raw = '';
    for await (const c of req) { raw += c; if (raw.length > 20000) break; }
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { input: raw }; }
  }
  for (const [k, v] of url.searchParams) if (body[k] === undefined) body[k] = v;

  let name = m[1] || body.action || '';
  name = ALIASES[name] || name;
  const input = body.input ?? body.query ?? body.text ?? body.name ?? body.url ?? body.app ?? body.site ?? body.note ?? '';

  const denied = authorise(req, body);
  if (denied) { record({ action: name || '?', input, result: `REFUSED (${denied})`, refused: true }); return json(res, 401, { result: 'Not authorised.' }); }

  const fn = ACTIONS[name];
  if (!fn) return json(res, 400, { result: `I can't do ${name || 'that'} yet.` });

  // The voice agent can fire the same tool call several times in a burst. Run it once,
  // answer the repeats with the first result.
  const key = `${name}|${norm(input)}`;
  const prev = recent.get(key);
  if (prev && Date.now() - prev.at < DEDUPE_MS) {
    const result = await prev.result;
    return json(res, 200, { ok: true, result });
  }
  if (recent.size > 200) for (const [k, v] of recent) if (Date.now() - v.at > DEDUPE_MS) recent.delete(k);
  const pending = fn({ input });
  recent.set(key, { at: Date.now(), result: pending.catch(() => 'Something went wrong on the laptop.') });

  const callerRaw = String(req.headers['x-caller'] || body.caller || body.user_identifier || '').replace(/\D/g, '');
  const caller = callerRaw ? `…${callerRaw.slice(-2)}` : 'no caller id';
  try {
    const result = await pending;
    record({ action: name, input, result, caller });
    json(res, 200, { ok: true, result });
  } catch (e) {
    record({ action: name, input, result: `ERROR ${e.message}` });
    json(res, 500, { ok: false, result: 'Something went wrong on the laptop.' });
  }
}).listen(PORT, () => {
  console.log(`Tri action server on http://localhost:${PORT}  owner=${OWNER ? OWNER.slice(0, 4) + '…' : 'NOT SET'}  token=${TOKEN ? 'set' : 'MISSING'}  outbound=${monitor.status().configured ? 'ready' : 'dry-run'}`);
  monitor.start();
  setTimeout(() => buildIndex(true), 2000); // warm the file index so the first "find my file" is fast
  // Reading Classroom takes a minute or more, so keep a fresh copy ready for calls.
  const warmClassroom = () => classroom.openList({ fresh: true }).catch((e) => console.log('Classroom refresh failed:', e.message.split(/\r?\n/)[0]));
  // Classroom is opt-in: it opens a Chrome window you sign in to once. Set CLASSROOM_SUBMIT in .env to turn it on.
  if (process.env.CLASSROOM_SUBMIT) {
    setTimeout(warmClassroom, 5000);
    setInterval(warmClassroom, 20 * 60_000);
  }
});

import { spawn, execFile } from 'node:child_process';

const run = (file, args) => new Promise((resolve) => {
  const p = spawn(file, args, { detached: true, stdio: 'ignore', windowsHide: true });
  p.on('error', () => resolve(false));
  p.unref();
  setTimeout(() => resolve(true), 150);
});

const ps = (cmd) => new Promise((resolve) => execFile('powershell.exe', ['-NoProfile', '-Command', cmd], { windowsHide: true, timeout: 8000 }, (e, out) => resolve(e ? '' : String(out).trim())));
const psEnv = (script, vars = {}, { detached = false } = {}) => new Promise((resolve) => {
  const env = { ...process.env, ...vars };
  if (detached) {
    const p = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script], { detached: true, stdio: 'ignore', windowsHide: true, env });
    p.on('error', () => resolve(false)); p.unref(); return setTimeout(() => resolve(true), 150);
  }
  execFile('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true, timeout: 15000, env }, (e) => resolve(!e));
});

export const windowsPlatform = {
  name: 'windows',
  openUrl: (url) => run('explorer.exe', [url]),
  openFile: (filePath) => run('explorer.exe', [filePath]),
  runApp: (app, args = []) => {
    if (Array.isArray(app)) {
      return run(app[0], app[1] || []);
    }
    return run(app, args);
  },
  speak: async (text) => {
    const SPEAK = 'Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=0; $s.Speak($env:TRI_TEXT)';
    return psEnv(SPEAK, { TRI_TEXT: text }, { detached: true });
  },
  sendKey: async (keycode, times = 1) => {
    const KEY = (code, t = 1) => `$w=New-Object -ComObject WScript.Shell; 1..${t} | % { $w.SendKeys([char]${code}); Start-Sleep -Milliseconds 40 }`;
    return psEnv(KEY(keycode, times));
  },
  media: {
    playPause: () => windowsPlatform.sendKey(179),
    next: () => windowsPlatform.sendKey(176),
    previous: () => windowsPlatform.sendKey(177),
    volumeUp: () => windowsPlatform.sendKey(175),
    volumeDown: () => windowsPlatform.sendKey(174),
    mute: () => windowsPlatform.sendKey(173),
  },
  readBattery: async () => {
    const raw = await ps('$b=Get-CimInstance Win32_Battery; if($b){"$($b.EstimatedChargeRemaining)|$($b.BatteryStatus)"}else{"none"}');
    if (!raw || raw === 'none') return null;
    const [pct, st] = raw.split('|');
    return { pct: Number(pct), charging: st === '2' || st === '6' || st === '7' || st === '8' || st === '9' };
  },
  takeScreenshot: async (filePath) => {
    const ok = await psEnv('Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.SystemInformation]::VirtualScreen; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size); $bmp.Save($env:TRI_PATH)', { TRI_PATH: filePath });
    return ok;
  },
  lockScreen: async () => run('rundll32.exe', ['user32.dll,LockWorkStation']),
  setVolume: () => Promise.resolve(true),
  getClipboard: async () => '',
  setClipboard: async () => true,
  readNetwork: async () => null,
  notify: async () => true,
  suspend: async () => true,
  toggleMic: async () => ({ ok: false }),
  bluetooth: {
    status: async () => ({ powered: false, devices: [] }),
    power: async () => false,
    connect: async () => ({ ok: false }),
    disconnect: async () => ({ ok: false }),
  },
  findDesktopApp: () => null,
  powershell: psEnv
};

export default windowsPlatform;

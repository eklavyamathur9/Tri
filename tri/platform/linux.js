import { spawn, execFile } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const run = (file, args = [], opts = {}) => new Promise((resolve) => {
  try {
    const p = spawn(file, args, { detached: true, stdio: 'ignore', ...opts });
    p.on('error', () => resolve(false));
    p.unref();
    setTimeout(() => resolve(true), 150);
  } catch {
    resolve(false);
  }
});

const exec = (cmd, args = [], opts = {}) => new Promise((resolve) => {
  execFile(cmd, args, { timeout: 8000, ...opts }, (e, out) => resolve(e ? '' : String(out).trim()));
});

const psExec = (cmd, opts = {}) => new Promise((resolve) => {
  execFile('sh', ['-c', cmd], { timeout: 8000, ...opts }, (e, out) => resolve(e ? '' : String(out).trim()));
});

export const linuxPlatform = {
  name: 'linux',
  
  // Open URL in default browser
  openUrl: (url) => run('xdg-open', [url]),
  
  // Open file with default application
  openFile: (filePath) => run('xdg-open', [filePath]),
  // Run application
  runApp: (app, args = []) => {
    // Handle common app mappings
    const appMap = {
      'notepad': ['gedit'],
      'calculator': ['gnome-calculator', 'kcalc', 'galculator'],
      'calc': ['gnome-calculator', 'kcalc'],
      'chrome': ['google-chrome', 'chromium', 'chromium-browser'],
      'browser': ['xdg-open'],
      'firefox': ['firefox'],
      'file explorer': ['nautilus', 'dolphin', 'thunar', 'pcmanfm'],
      'explorer': ['nautilus', 'dolphin', 'thunar'],
      'files': ['nautilus', 'dolphin', 'thunar'],
      'paint': ['gimp', 'kolourpaint', 'pinta'],
      'camera': ['cheese', 'snapshot'],
      'settings': ['gnome-control-center', 'systemsettings'],
      'task manager': ['gnome-system-monitor', 'ksysguard', 'htop'],
      'terminal': ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'],
      'code': ['code', 'codium', 'vscodium'],
      'vscode': ['code', 'codium'],
    };
    
    if (Array.isArray(app)) {
      // app is [cmd, args]
      return run(app[0], app[1] || []);
    }
    
    const key = String(app).toLowerCase();
    if (appMap[key]) {
      for (const cmd of appMap[key]) {
        // Try first command that might exist
        try {
          return run(cmd, args);
        } catch {}
      }
    }
    return run(app, args);
  },
  
  // Text to speech
  speak: async (text, opts = {}) => {
    const escaped = text.replace(/'/g, "'\\''");
    // Try different TTS engines
    const engines = [
      ['spd-say', [text]],
      ['espeak-ng', [text]],
      ['espeak', [text]],
      ['festival', ['--tts']],
      ['piper', []],
    ];
    
    for (const [cmd, args] of engines) {
      try {
        if (cmd === 'festival') {
          return new Promise((resolve) => {
            const p = spawn('sh', ['-c', `echo '${escaped}' | festival --tts`], { detached: true, stdio: 'ignore' });
            p.on('error', () => {});
            p.unref();
            setTimeout(() => resolve(true), 150);
          });
        }
        const result = await new Promise((resolve) => {
          const p = spawn(cmd, args, { detached: true, stdio: 'ignore' });
          p.on('error', () => resolve(false));
          p.unref();
          if (cmd === 'spd-say') {
            setTimeout(() => resolve(true), 150);
          } else {
            p.on('close', (code) => resolve(code === 0));
          }
        });
        if (result) return true;
      } catch {}
    }
    return false;
  },
  
  // Send key press (X11/Wayland aware)
  sendKey: async (keycode, times = 1) => {
    const tools = [
      ['wtype', [keycode]],
      ['ydotool', ['key', keycode]],
      ['xdotool', ['key', keycode]],
    ];
    for (const [cmd, args] of tools) {
      try {
        let sent = false;
        for (let i = 0; i < times; i++) {
          const res = await exec(cmd, args);
          if (res !== false) sent = true;
          await new Promise(r => setTimeout(r, 40));
        }
        if (sent) return true;
      } catch {}
    }
    return false;
  },

  // Media control (MPRIS via playerctl + keys + volume)
  media: {
    playPause: async () => (await linuxPlatform.mediaPlayerctl('play-pause')) || linuxPlatform.sendKey('XF86AudioPlay'),
    next: async () => (await linuxPlatform.mediaPlayerctl('next')) || linuxPlatform.sendKey('XF86AudioNext'),
    previous: async () => (await linuxPlatform.mediaPlayerctl('previous')) || linuxPlatform.sendKey('XF86AudioPrev'),
    volumeUp: () => linuxPlatform.setVolume('up'),
    volumeDown: () => linuxPlatform.setVolume('down'),
    mute: () => linuxPlatform.setVolume('mute'),
  },

  // Also try playerctl as fallback
  mediaPlayerctl: async (cmd) => {
    try {
      const out = await exec('playerctl', [cmd]);
      return out !== undefined;
    } catch {
      return false;
    }
  },

  // Read battery status
  readBattery: async () => {
    try {
      // Try /sys/class/power_supply directly (fastest, standard on Linux)
      for (const bat of ['BAT0', 'BAT1']) {
        const batPath = path.join('/sys/class/power_supply', bat);
        if (fs.existsSync(batPath)) {
          const capFile = path.join(batPath, 'capacity');
          const statFile = path.join(batPath, 'status');
          if (fs.existsSync(capFile)) {
            const capacity = Number(fs.readFileSync(capFile, 'utf8').trim());
            const status = fs.existsSync(statFile) ? fs.readFileSync(statFile, 'utf8').trim() : '';
            return { pct: capacity, charging: status.toLowerCase() === 'charging' };
          }
        }
      }

      // Try upower
      for (const dev of ['battery_BAT0', 'battery_BAT1']) {
        const upower = await exec('upower', ['-i', `/org/freedesktop/UPower/devices/${dev}`]);
        if (upower) {
          const pctMatch = upower.match(/percentage:\s*(\d+)%/);
          const stateMatch = upower.match(/state:\s*(\S+)/);
          if (pctMatch) {
            const pct = Number(pctMatch[1]);
            const state = stateMatch ? stateMatch[1] : '';
            return { pct, charging: state === 'charging' || state === 'pending-charge' };
          }
        }
      }
    } catch {}
    return null;
  },

  // Take screenshot
  takeScreenshot: async (filePath) => {
    const dir = path.dirname(filePath);
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    const isWayland = Boolean(process.env.WAYLAND_DISPLAY);

    const tools = isWayland ? [
      ['grim', [filePath]],
      ['gnome-screenshot', ['-f', filePath]],
      ['spectacle', ['-b', '-n', '-o', filePath]],
      ['scrot', [filePath]],
      ['maim', [filePath]],
      ['import', ['-window', 'root', filePath]],
    ] : [
      ['scrot', [filePath]],
      ['maim', [filePath]],
      ['gnome-screenshot', ['-f', filePath]],
      ['import', ['-window', 'root', filePath]],
      ['grim', [filePath]],
    ];

    for (const [cmd, args] of tools) {
      try {
        await exec(cmd, args);
        if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) return true;
      } catch {}
    }
    return false;
  },

  // Lock screen
  lockScreen: async () => {
    const attempts = [
      ['loginctl', ['lock-session']],
      ['xdg-screensaver', ['lock']],
      ['gnome-screensaver-command', ['-l']],
      ['dm-tool', ['lock']],
      ['dbus-send', ['--type=method_call', '--dest=org.gnome.ScreenSaver', '/org/gnome/ScreenSaver', 'org.gnome.ScreenSaver.Lock']],
      ['xset', ['s', 'activate']],
    ];
    for (const [cmd, args] of attempts) {
      try {
        const ok = await run(cmd, args);
        if (ok) return true;
      } catch {}
    }
    return false;
  },

  // Volume control (wpctl PipeWire, pactl PulseAudio, amixer ALSA)
  setVolume: async (action) => {
    try {
      if (action === 'up') {
        try { await exec('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', '5%+']); return true; } catch {}
        try { await exec('pactl', ['set-sink-volume', '@DEFAULT_SINK@', '+5%']); return true; } catch {}
        try { await exec('amixer', ['set', 'Master', '5%+']); return true; } catch {}
      } else if (action === 'down') {
        try { await exec('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', '5%-']); return true; } catch {}
        try { await exec('pactl', ['set-sink-volume', '@DEFAULT_SINK@', '-5%']); return true; } catch {}
        try { await exec('amixer', ['set', 'Master', '5%-']); return true; } catch {}
      } else if (action === 'mute') {
        try { await exec('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', 'toggle']); return true; } catch {}
        try { await exec('pactl', ['set-sink-mute', '@DEFAULT_SINK@', 'toggle']); return true; } catch {}
        try { await exec('amixer', ['set', 'Master', 'toggle']); return true; } catch {}
      } else if (typeof action === 'number' || (typeof action === 'string' && /^\d+%?$/.test(action))) {
        const val = parseInt(action, 10);
        try { await exec('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', `${val}%`]); return true; } catch {}
        try { await exec('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${val}%`]); return true; } catch {}
        try { await exec('amixer', ['set', 'Master', `${val}%`]); return true; } catch {}
      }
    } catch {}
    return false;
  },

  // Get clipboard
  getClipboard: async () => {
    try {
      const out = await exec('wl-paste', []);
      if (out) return out;
    } catch {}
    try {
      const out = await exec('xclip', ['-selection', 'clipboard', '-o']);
      if (out) return out;
    } catch {}
    try {
      return await exec('xsel', ['--clipboard', '--output']);
    } catch {
      return '';
    }
  },

  // Set clipboard
  setClipboard: async (text) => {
    const isWayland = Boolean(process.env.WAYLAND_DISPLAY);
    const order = isWayland
      ? [['wl-copy', []], ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]]
      : [['xclip', ['-selection', 'clipboard']], ['wl-copy', []], ['xsel', ['--clipboard', '--input']]];

    for (const [cmd, args] of order) {
      try {
        const ok = await new Promise((resolve) => {
          const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
          p.on('error', () => resolve(false));
          if (p.stdin) {
            p.stdin.on('error', () => resolve(false));
            p.stdin.write(text);
            p.stdin.end();
          }
          p.on('close', (code) => resolve(code === 0));
        });
        if (ok) return true;
      } catch {}
    }
    return false;
  },

  // Generic shell execution
  shell: async (cmd) => psExec(cmd),

  // PowerShell compatibility shim (sh wrapper on Linux)
  powershell: async (cmd) => psExec(cmd)
};

export default linuxPlatform;

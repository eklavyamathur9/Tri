# Tri Transformation Plan

## Goal
Transform ARRC/J (Windows + Sarvam AI voice agent for laptop control) into **Tri** - a personalized Linux-native autonomous laptop agent, built on top of the existing J architecture with plans to add more agentic features.

**Repo**: https://github.com/eklavyamathur9/Tri.git

## Current Architecture Summary
- **Voice Interface**: Sarvam AI voice agent calls HTTP endpoint exposed via Cloudflare tunnel
- **Server** (`arrc/server.js`): Node.js HTTP server on port 3710, Bearer token auth, action allowlist
- **Tunnel** (`arrc/start.js`): Manages cloudflared tunnel + server with auto-restart
- **Actions**: File search/open, apps/websites, media control, notes, timers, focus sessions, deadlines with outbound calls, screenshots, Google Classroom automation
- **Windows Dependencies**: Uses `explorer.exe`, `powershell.exe`, `rundll32`, WMI for battery, `System.Speech` for TTS, SendKeys for media, Windows paths

## Phase 1: Repository Organization & Renaming

### 1.1 Restructure Files
```
Tri/
├── tri/                    # Core agent server (renamed from arrc/)
│   ├── server.js
│   ├── start.js
│   ├── setup.js
│   ├── files.js
│   ├── monitor.js
│   ├── classroom.js
│   ├── platform/           # NEW: OS abstraction layer
│   │   ├── index.js
│   │   ├── linux.js
│   │   ├── windows.js     # Keep for reference during transition
│   │   └── common.js
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── prompts/                # Renamed from J-agent/
│   ├── tri-instructions.txt
│   └── tri-tool-description.txt
├── scripts/                # Shell scripts for Linux
│   ├── start-tri.sh
│   ├── setup-tri.sh
│   └── copy-for-sarvam.sh
├── docs/
│   ├── SETUP-LINUX.md
│   └── ...
├── README.md
├── CLAUDE.md              # Update for Tri/Linux workflow
└── START-HERE.md          # Renamed from START-HERE.txt
```

### 1.2 Global Renaming
Replace all references:
- `ARRC` → `Tri` (or keep in context where appropriate)
- `J` → `Tri` (the agent name)
- `arrc` → `tri` (directory/package names)
- `JARVIS_*` env vars → `TRI_*` (with backward compat mapping)
- `jarvis` → `tri` in function names/strings
- URLs/titles in HTML
- Bot messages

### 1.3 Clean Up
- Remove `ARRC-Build-Your-Own-J.zip`
- Remove or move `ARRC-Build-Guide.pdf` to docs/ (keep for reference initially)
- Remove Windows-specific files (`Start-J.bat`, `Copy-for-Sarvam.bat`) after creating Linux equivalents

## Phase 2: Linux Compatibility Layer

Create `tri/platform/` abstraction for OS-specific operations.

### 2.1 Platform Detection & Interface
```javascript
// platform/index.js
import os from 'node:os';
import { linuxPlatform } from './linux.js';
import { windowsPlatform } from './windows.js';

const platform = os.platform() === 'win32' ? windowsPlatform : linuxPlatform;
export default platform;
```

### 2.2 Required Platform Functions
| Function | Windows | Linux |
|----------|---------|-------|
| `openUrl(url)` | `explorer.exe [url]` | `xdg-open [url]` |
| `runApp(app, args)` | spawn with Windows exe | spawn with Linux commands/desktop entries |
| `speak(text)` | PowerShell + System.Speech | `spd-say`, `espeak-ng`, `piper`, `festival`, or `notify-send` + speech |
| `sendKey(code, times)` | WScript.Shell SendKeys | `xdotool key`, `ydotool key` (or `wtype` on Wayland) |
| `readBattery()` | WMI PowerShell query | `upower -i /org/freedesktop/UPower/devices/battery_BAT0` or `/sys/class/power_supply/BAT*/uevent` |
| `takeScreenshot(path)` | PowerShell + System.Drawing | `scrot`, `gnome-screenshot`, `grim` (Wayland), `maim`, `import` (ImageMagick) |
| `setVolume(level/change)` | SendKeys (media keys) | `pactl set-sink-volume`, `amixer`, `wpctl` |
| `mediaPlayPause/Next/Prev()` | SendKeys (179,176,177) | `playerctl play-pause/next/previous` or key bindings |
| `lockScreen()` | `rundll32 user32.dll,LockWorkStation` | `loginctl lock-session`, `xdg-screensaver lock`, `gnome-screensaver-command -l` |
| `getSystemInfo()` | Various WMI queries | `uname`, `/proc`, etc. |

### 2.3 Update server.js
- Import platform abstraction
- Replace all `run()`, `openUrl()`, `ps()`, `psEnv()` Windows-specific calls
- Update `APPS` map for Linux (e.g., `firefox`, `chromium`, `code`/`codium`, `nautilus`, etc.)
- Update battery reading to use platform
- Update media controls to use platform
- Update TTS to use platform
- Update screenshot to use platform
- Update lock screen to use platform

### 2.4 Update start.js
- Remove Windows `clip` usage → use `xclip -selection clipboard` or `wl-copy`
- Check for `cloudflared` in PATH (cross-platform)
- Make tunnel URL watching work same way
- Create Linux start script

### 2.5 Update setup.js
- Mostly cross-platform, just env var naming
- Update messages

### 2.6 Update classroom.js
- Find Chrome/Chromium in Linux paths: `/usr/bin/google-chrome`, `/usr/bin/chromium`, `/snap/bin/chromium`, `/var/lib/flatpak/...`
- Playwright CDP attach should work the same

### 2.7 Update files.js
- Works cross-platform, just ensure paths work

## Phase 3: Workflow Definition

### Development Workflow
1. **Local Development**
   - Work in `/home/eklavyamathur9/Projects/J` (becomes Tri repo)
   - Test server locally on Linux
   - Use codebase-memory-mcp to understand structure as we change

2. **Branching Strategy** (keep it simple)
   - `main` - stable working version
   - Feature branches as needed: `feature/linux-port`, `feature/tri-rename`, etc.
   - Don't push until explicitly asked

3. **Testing Approach**
   - Start server: `cd tri && node start.js` or use new scripts
   - Test health: `curl http://localhost:3710/health`
   - Test actions locally before connecting to Sarvam
   - Test on actual Linux desktop environment

4. **Configuration**
   - All secrets in `.env` (never commit)
   - Use `TRI_*` env vars going forward
   - Backward compatible with `JARVIS_*` during transition

### Change Process
For each change:
1. Understand impact using codebase graph
2. Make minimal, focused changes
3. Test locally
4. Update docs if needed

## Phase 4: Implementation Order

### Step 1: Prep & Rename Structure (Do first)
- [ ] Create new directory structure
- [ ] Move files to new locations
- [ ] Remove zip file
- [ ] Update package.json names
- [ ] Rename files/directories

### Step 2: Create Platform Abstraction
- [ ] Create `tri/platform/` with linux.js, windows.js, index.js
- [ ] Implement Linux functions for basic operations
- [ ] Add fallbacks/degradation for missing tools

### Step 3: Port Server Code
- [ ] Update server.js to use platform layer
- [ ] Update env var names with compatibility
- [ ] Update APPS for Linux
- [ ] Test basic server startup

### Step 4: Port Startup/Setup
- [ ] Update start.js for Linux
- [ ] Create start-tri.sh
- [ ] Update setup.js
- [ ] Create setup scripts

### Step 5: Update Prompts & Config
- [ ] Rename J-agent to prompts/, update content
- [ ] Update all references from J/ARRC to Tri
- [ ] Update HTML dashboard

### Step 6: Update Docs
- [ ] Rewrite README.md for Tri on Linux
- [ ] Update CLAUDE.md
- [ ] Create START-HERE.md
- [ ] Update .env.example

### Step 7: Git Setup
- [ ] Ensure git repo is configured
- [ ] Add all files
- [ ] Don't commit .env or sensitive files
- [ ] Ready to push to origin when requested

## Dependencies for Linux

### Required
- `nodejs` >= 18
- `cloudflared`
- `xdg-utils` (usually installed)
- `curl`

### Optional (for full functionality)
- `xdotool` or `ydotool` (Wayland) - key presses/media control
- `playerctl` - media control
- `espeak-ng` or `spd-say` or `piper` - TTS
- `scrot`, `grim`, `maim`, or `gnome-screenshot` - screenshots
- `xclip` or `wl-copy` - clipboard
- `upower` - battery info
- `pulseaudio-utils` or `pipewire` tools - volume control

## Notes & Considerations

- **Wayland vs X11**: Some tools (xdotool) don't work on Wayland. Need to detect and use alternatives (ydotool, wtype, dbus)
- **Security**: The server is exposed via tunnel - keep auth enabled, only allow owner
- **Permissions**: Some actions may need specific permissions on Linux
- **Gradual Migration**: Keep both Windows and Linux support during transition
- **Sarvam Setup**: Will do separately after getting Tri working locally on Linux

Let us start implementing step by step.

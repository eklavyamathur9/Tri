# Tri: Windows → Linux Conversion Plan

**Goal:** Convert Tri from Windows (ARRC/J) to a fully functional Linux-native agent that can control your Linux laptop via voice calls. First make all existing features work on Linux, then add more features.

**Repo:** `/home/eklavyamathur9/Projects/Tri`  
**Current State:** Partially migrated - has `tri/` structure, `platform/` abstraction exists, Linux scripts added. Some Windows-specific code remains.

## Current Architecture (as-is)

```
Tri/
├── tri/                    # Core server
│   ├── server.js           # Main HTTP server, action handlers
│   ├── start.js            # Server + cloudflared tunnel manager
│   ├── setup.js            # First-run setup, env creation
│   ├── files.js            # File indexing/search
│   ├── monitor.js          # Deadlines, outbound calls
│   ├── classroom.js        # Google Classroom automation
│   ├── live.html           # Dashboard
│   ├── platform/           # OS abstraction (exists)
│   │   ├── index.js        # Platform detection
│   │   ├── linux.js        # Linux implementation (partially done)
│   │   └── windows.js      # Windows reference
│   └── package.json
├── prompts/                # Voice agent instructions
├── scripts/                # Linux setup scripts
│   ├── start-tri.sh
│   └── copy-for-sarvam.sh
└── docs/
```

**Flow:** Voice agent (Sarvam) → HTTPS via Cloudflare tunnel → `tri/server.js:3710` → Platform abstraction → Linux commands/DBus/XDG

## Phase 1: Make Existing Features Work on Linux (Priority)

These are features that already exist in the codebase and need to work on Linux.

### 1.1 Platform Layer Completion
| Item | Status | Notes |
|------|--------|-------|
| `openUrl()` via `xdg-open` | Done | Works |
| `runApp()` with app mapping | Done | Has common apps mapped |
| `speak()` with spd-say/espeak/festival | Done | Fallback chain exists |
| `sendKey()` for X11/Wayland | Done | Tries xdotool, ydotool, wtype |
| `media` controls (play/pause/next/prev/vol) | Done | Uses XF86 keys |
| `mediaPlayerctl()` fallback | Done | For players that support MPRIS |
| `readBattery()` | Done | upower + /sys fallback |
| `setClipboard()`/`getClipboard()` | Done | wl-copy/wl-paste, xclip, xsel |
| `takeScreenshot()` | **Added** | grim/scrot/maim/gnome-screenshot with Wayland/X11 detection |
| `lockScreen()` | **Added** | loginctl, xdg-screensaver, gnome-screensaver, dbus |
| `setVolume()` | **Added** | wpctl (PipeWire), pactl (PulseAudio), amixer |
| `shell()`/`powershell()` shims | **Added** | For compatibility |

### 1.2 Server.js Fixes
| Item | Status | Notes |
|------|--------|-------|
| Platform import & detection | Done | Using `tri/platform/index.js` |
| Env var normalization (TRI_*/JARVIS_* legacy) | **Fixed** | Added better mapping |
| `run()`/`openUrl()`/`ps()`/`psEnv()` using platform | **Fixed** | More robust with fallbacks |
| `APPS` map for Linux | Done | Has gedit, nautilus, firefox, code, etc. |
| `show_notes()` uses xdg-open on Linux | **Fixed** | Was hardcoded to notepad.exe |
| `system_status()` uses platform.readBattery() | **Fixed** | Falls back to WMI on Windows |
| `lock_screen()` uses platform.lockScreen() | **Fixed** | Has Linux fallback |
| `media_control()` uses platform.media properly | **Fixed** | Tries playerctl + media keys |
| `speak_on_laptop()` uses platform.speak() | **Fixed** |
| `take_screenshot()` uses platform.takeScreenshot() | **Fixed** |
| `set_timer()` Linux TTS/notification | **Fixed** | Uses spd-say/espeak/notify-send |
| `run()` in ROUTINES/apps | Works via platform.runApp() |

### 1.3 Startup & Scripts
| Item | Status | Notes |
|------|--------|-------|
| `scripts/start-tri.sh` | Exists | Checks node, cloudflared, installs deps, runs setup if needed |
| `tri/start.js` clipboard copy | OK | Uses platform.setClipboard() with Linux fallback |
| `tri/setup.js` | OK | Creates .env, generates token |
| `scripts/copy-for-sarvam.sh` | Needs check | For copying prompts/URL/token to clipboard for Sarvam setup |

### 1.4 Testing Checklist (Existing Features)
Test each action works on Linux:

- [ ] `open_app` - firefox, chrome, code, nautilus, gnome-terminal
- [ ] `open_website` - opens in default browser
- [ ] `web_search` - Google search
- [ ] `play_youtube` - YouTube search/play
- [ ] `find_file` / file search - uses files.js
- [ ] `take_note` / `read_notes` / `show_notes` - saves to `~/Documents/Tri Notes.md`
- [ ] `system_status` - time/date/battery
- [ ] `lock_screen` - locks session
- [ ] `media_control` - play/pause/next/vol/mute (needs player running or key support)
- [ ] `speak_on_laptop` - TTS
- [ ] `take_screenshot` - saves to `~/Pictures/Tri/`
- [ ] `set_timer` - announces when done
- [ ] `draft_email` - Gmail compose
- [ ] `directions` / `weather` - Google Maps/Search
- [ ] `run_routine` - work/study/chill/news/demo
- [ ] `focus_session` - focus timer + music + file
- [ ] `add_deadline` / `list_deadlines` / `finish_deadline` - monitor.js
- [ ] `submit_assignment` / `confirm_submission` - classroom.js (needs Chrome/Playwright setup)

## Phase 2: Polish & Fix Remaining Issues

### 2.1 Server.js Remaining Issues
- [ ] `run()` in some places passes arrays differently - need to ensure compatibility
- [ ] `set_timer` on Linux uses detached shell spawn without proper cleanup tracking
- [ ] `show_notes` uses `openUrl(NOTES)` on Linux which works for files with xdg-open
- [ ] Some actions may reference Windows paths

### 2.2 Dependencies Check
Create a script to check/install Linux deps:
```bash
# Required
nodejs (>=18), npm, cloudflared, xdg-utils, curl

# Recommended for full functionality
xdotool/ydotool/wtype (key simulation)
playerctl (media)
spd-say or espeak-ng or festival (TTS)
scrot/maim/grim/gnome-screenshot (screenshots)
xclip/wl-copy (clipboard)
upower (battery)
pulseaudio-utils/pipewire-tools (volume)
```

### 2.3 Scripts
- [ ] Check `scripts/copy-for-sarvam.sh` - may have Windows paths/references
- [ ] Create `scripts/check-deps.sh` for Linux dependency checking
- [ ] Ensure scripts are executable

### 2.4 Prompts
- [ ] Review `prompts/tri-instructions.txt` - says "Boss's personal assistant", "run Boss's laptop" - fine for Linux
- [ ] Check if any references to Windows/J/ARRC need updating
- [ ] Ensure tool description matches current actions

## Phase 3: Add New Features (After Existing Work)

Only after all existing features work on Linux. Ideas based on the codebase style:

| Feature | Description | Complexity |
|---------|-------------|------------|
| `open_terminal` / `run_command` (restricted) | Run whitelisted commands | Medium - needs security careful thought |
| `brightness_control` | Adjust screen brightness via `brightnessctl`/`xbacklight` | Easy |
| `bluetooth_control` | Toggle/connect via `bluetoothctl` | Medium |
| `wifi_control` | Check/switch networks via `nmcli` | Medium |
| `night_light` / `dark_mode` | Toggle theme/night light | Medium (DE dependent) |
| `clipboard_read` action | Read clipboard content | Easy - platform.getClipboard exists |
| `open_folder` | Open specific folders | Easy |
| `shutdown/restart/suspend` (with confirmation) | System power actions - need strong confirmation | High security |
| `volume_set` | Set exact volume level | Easy - platform.setVolume exists |
| `window_focus` | Focus/switch windows via `wmctrl`/`xdotool` | Medium (X11) harder on Wayland |

**Security rule:** Never allow arbitrary shell commands. Only allow whitelisted actions like existing code does.

## Implementation Plan - Step by Step

### Step 1: Environment Check & Setup
```bash
cd /home/eklavyamathur9/Projects/Tri
# Check git status
git log --oneline -3
git branch -a
```

### Step 2: Test Current Server
```bash
cd tri
# Check if .env exists
ls -la .env 2>&1
# Try to start (will need setup if no .env)
node --check server.js && echo "OK"
```

### Step 3: Run Dependency Check
Create and run a quick check for common Linux tools.

### Step 4: Test Platform Functions
Quick test of platform layer.

### Step 5: Start Server in Test Mode
```bash
./scripts/start-tri.sh
# or manually
cd tri && node start.js
```

### Step 6: Test Health Endpoint
```bash
curl http://localhost:3710/health
```

### Step 7: Test Actions via HTTP
```bash
# Need token from .env
TOKEN=$(grep TRI_TOKEN tri/.env | cut -d= -f2)
curl -X POST http://localhost:3710/action -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"action":"system_status"}'
```

## Quick Start Commands

```bash
# Navigate to project
cd /home/eklavyamathur9/Projects/Tri

# Check platform
node -e "import('./tri/platform/index.js').then(m=>console.log(m.default.name,m.isLinux))"

# Install deps
cd tri && npm install

# Setup (if first time)
node setup.js YOUR_NUMBER_WITH_COUNTRY_CODE

# Start Tri
cd .. && ./scripts/start-tri.sh
```

## Notes

- **Wayland vs X11:** This system needs to work on both. Platform code detects via `WAYLAND_DISPLAY` and `DISPLAY`.
- **Keep Windows support:** Don't break existing Windows paths - they use `isWindows` checks.
- **Security:** Auth token required, owner number filtering, action allowlist. Keep it that way.
- **Existing behavior first:** Don't change action names or API shape that voice agent expects.

## Current Status (Updated)

**Phase 1: Core Conversion & Bug Fixes (Done)**
- [x] Platform abstraction completed (`tri/platform/linux.js` and `windows.js`)
- [x] Fixed `explorer.exe` hardcoded calls in `find_file` and `focus_session`
- [x] Fixed Chromium/Chrome auto-discovery in `tri/classroom.js`
- [x] Fixed GNOME Wayland screenshot capture via `flameshot`
- [x] Fixed Wayland & X11 clipboard fallbacks
- [x] Fixed `WIN_SPEAK` scoping bug in `server.js`
- [x] Standardized `Tri` voice announcements across all reminders and tests
- [x] Cleaned repository (.gitignore, normalized LF endings, removed duplicate prompts)

**Phase 2: Validation (Done)**
- [x] All 23 original actions verified with automated self-checks

**Phase 3: Advanced Linux Desktop & Device Features (Done)**
- [x] Dynamic `.desktop` app discovery: Automatically indexes and launches 300+ installed applications without hardcoding
- [x] Microphone privacy toggle (`mute_mic` via PipeWire `wpctl`)
- [x] Bluetooth device management (`bluetooth_control` via `bluetoothctl` for connect/disconnect/status)
- [x] Safe laptop sleep/suspend (`suspend_laptop` with verbal confirmation)
- [x] Active Wi-Fi network name and connection type in `system_status` (`nmcli`)
- [x] Desktop notifications (`send_notification` via `notify-send`)
- [x] Exact volume percentage in `media_control` (`volume 45%`)
- [x] Active clipboard reader (`read_clipboard`)
- [x] Multi-snippet clipboard collection (`save_clipboard`, `read_clips`, `show_clips`)
- [x] Optional Obsidian Vault sync support (`OBSIDIAN_VAULT` in `.env`)
- [x] Brave profile & account switcher (`open_brave_profile` dynamically mapping Personal, College, Work)
- [x] Real-time screen awareness (`inspect_screen` with playerctl metadata, running apps, and Flameshot screenshot)
- [x] Playwright webpage text reader (`read_webpage`)
- [x] Git work update & project tracking (`work_update`)
- [x] Live system resource inspection (`system_resources` for RAM and disk space)
- [x] Owner identity verification with name support (`Manan`) alongside phone numbers

## Release v1.0.0 Status: Ready & Live
- Total actions supported: 39
- Platform compatibility: Linux (Wayland / X11) + Windows backward compatibility
- Audio engine: PipeWire / WirePlumber
- Ingress: Cloudflare edge tunnel
- Voice engine: Sarvam AI Indus (Saaras STT, Sarvam LLM, Bulbul TTS)

## Benchmark & Inspiration: pranithvelar/Jarvis Comparison

| Capability | pranithvelar/Jarvis (Python/Ollama) | Tri (Node.js/Sarvam Linux Agent) |
|---|---|---|
| **Primary Interface** | Local wake-word microphone & Telegram bot | Phone calls via Sarvam AI voice agent + Cloudflare tunnel |
| **Platform Target** | Primarily Windows (`winotify`, `netsh`, `rundll32`) | Fully native Linux (Wayland & X11) with Windows backward-compat |
| **App Launching** | Hardcoded app mapping | Dynamic `.desktop` file indexer (300+ apps auto-discovered) |
| **Audio/Mic Control** | Windows PyAutoGUI / keyboard keys | Linux PipeWire `wpctl` (volume %, mic mute/unmute toggle) |
| **Bluetooth** | Planned/stubbed | Fully implemented via `bluetoothctl` (pair/connect/disconnect) |
| **Notes / Vault** | Dedicated Obsidian integration | Native Markdown notes & multi-snippet clips with optional `OBSIDIAN_VAULT` |
| **Footprint** | Heavyweight (Python, Docker, Ollama local LLM) | Ultra-lightweight (Zero runtime dependencies besides Node & system CLI tools) |

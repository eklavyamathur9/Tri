# ⚡ Tri — Linux AI Voice Agent for Laptop Control

> **Tri** is a personal AI voice agent that gives you hands-free control of your Linux laptop over regular cellular phone calls. Call your agent number from anywhere to launch applications, switch browser accounts, inspect what's on your screen in real time, control audio and mute your microphone, manage Bluetooth devices, read your clipboard, check project git status, and receive proactive reminders.

---

## 🧭 System Architecture

```
                                      📞 CELLULAR PHONE CALL
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │    Sarvam AI Indus Platform   │
                                │   (Saaras STT + LLM + Bulbul) │
                                └───────────────┬───────────────┘
                                                │ Webhook (POST /action)
                                                ▼
                                ┌───────────────────────────────┐
                                │     Cloudflare Ingress        │
                                │   (Encrypted Public Tunnel)   │
                                └───────────────┬───────────────┘
                                                │
                                                ▼
                                ┌───────────────────────────────┐
                                │    Tri Local Server (:3710)   │
                                │   ├── Bearer Auth Verification│
                                │   ├── Caller Identity Check   │
                                │   └── 39-Action Router        │
                                └───────┬───────────────┬───────┘
                                        │               │
                        ┌───────────────┘               └──────────────┐
                        ▼                                              ▼
        ┌───────────────────────────────┐              ┌───────────────────────────────┐
        │     Playwright & Browser      │              │     Linux Platform Layer      │
        │   ├── Brave Profile Switcher  │              │     (Wayland & X11 Aware)     │
        │   │   (Personal/College/Work) │              └─┬─────┬─────┬─────┬─────┬─────┘
        │   └── Webpage Text Reader     │                │     │     │     │     │
        └───────────────────────────────┘                │     │     │     │     │
                 ┌───────────────────────────────────────┘     │     │     │     └────────────────────────┐
                 ▼                                             ▼     │     ▼                              ▼
      ┌────────────────────┐                        ┌──────────────┐ │ ┌──────────────┐        ┌──────────────────────┐
      │.desktop Discovery  │                        │ PipeWire ALSA│ │ │Bluetoothctl  │        │ Screen & Vision      │
      │(300+ Linux Apps:   │                        │(Volume %, Mic│ │ │(Connect/Pair/│        │(Flameshot, Window    │
      │ VS Code, Terminal) │                        │ Mute Toggle) │ │ │ Disconnect)  │        │ Inspector, Playerctl)│
      └────────────────────┘                        └──────────────┘ │ └──────────────┘        └──────────────────────┘
                                                                     ▼
                                                      ┌───────────────────────────────┐
                                                      │  Hardware & Telemetry         │
                                                      │  (UPower, nmcli Wi-Fi, RAM,   │
                                                      │   Disk, Suspend, Screen Lock) │
                                                      └───────────────────────────────┘
```

---

## ✨ Features (v1.0.0 Linux Release)

### 🦁 1. Multi-Account Browser & Playwright Automation
- **Brave Profile & Account Switcher (`open_brave_profile`)**: Automatically parses your local browser state (`~/.config/BraveSoftware/Brave-Browser/Local State`) and launches your exact profile (**Personal**, **College**, or **Work**) by voice.
- **Playwright Webpage Reader (`read_webpage`)**: Drives headless Chromium/Brave to open web links, extract headings, and summarize the page content back to you over the call.
- **Web & YouTube Integration (`open_website`, `play_youtube`, `web_search`)**: Opens target sites, searches Google, or streams music directly in your browser.

### 👁️ 2. Real-Time Screen Vision & Media Awareness
- **Desktop Vision (`inspect_screen`)**: Real-time awareness of what is currently on your display. Checks active media playback (`playerctl`), lists all open desktop applications (Brave, VS Code, Files, Terminal), and captures a live high-res screenshot to `~/Pictures/Tri/`.
- **Media Control (`media_control`)**: Pause, play, skip tracks, and adjust master sink volume to an exact percentage (e.g. *"set volume to 45%"* via PipeWire WirePlumber `wpctl`).
- **Hardware Mic Privacy (`mute_mic`)**: Voice-activated microphone mute toggle directly on your default audio recording source.

### 💼 3. Work Status & System Telemetry
- **Git Work Update (`work_update`)**: Queries your active repository for current git branch, last commit message, uncommitted file changes, and pending tasks.
- **System Resources (`system_resources`)**: Reports live RAM usage (used vs total) and free root filesystem disk space.
- **Hardware Status (`system_status`)**: Reports time, date, power connection, battery percentage (`upower`), and active Wi-Fi network SSID (`nmcli`).
- **Bluetooth Device Manager (`bluetooth_control`)**: Inspects Bluetooth status, lists paired devices (e.g. headphones, speakers), and connects or disconnects them.
- **Safe Suspend & Lock (`suspend_laptop`, `lock_screen`)**: Locks your desktop session (`loginctl`) or puts your laptop to sleep with a safe verbal confirmation delay.

### 📋 4. Smart Clipboard & Notes Vault
- **Voice Clipboard Reader (`read_clipboard`)**: Reads aloud whatever snippet or URL is currently copied to your system clipboard.
- **Multi-Clip Notebook (`save_clipboard`, `read_clips`, `show_clips`)**: Appends multiple copied or dictated snippets with timestamps into `~/Documents/Tri Clips.md`.
- **Markdown Notes (`take_note`, `read_notes`, `show_notes`)**: Dictate thoughts and tasks into `~/Documents/Tri Notes.md`.
- **Obsidian Vault Sync**: Configure `OBSIDIAN_VAULT=/path/to/vault` in `.env` to store all notes and clips directly in your personal Obsidian knowledge base.

### ⏱️ 5. Productivity & Outbound Deadline Calls
- **Desktop Popups (`send_notification`)**: Triggers native Linux desktop notifications (`notify-send`).
- **Audible Timers (`set_timer`)**: Sets local speech alarms that announce over laptop speakers (`spd-say` / `espeak-ng`).
- **Focus Sessions (`focus_session`)**: Opens your study file, launches ambient focus music, and sets a structured timer.
- **Proactive Outbound Calls (`monitor.js`)**: Background daemon dials your mobile phone through Sarvam's Outbound API before deadlines (24h, 3h, 1h, 15m) or when battery drops below 15% unplugged.

---

## 🗣️ Voice Commands Reference

| What You Can Say | Action Executed | What Tri Does |
|---|---|---|
| *"Open my Personal account on Brave"* | `open_brave_profile` | Launches Brave with Profile 1 (Personal) |
| *"Open College account on Brave"* | `open_brave_profile` | Launches Brave with Profile 2 (College) |
| *"What is on my screen right now?"* | `inspect_screen` | Tells you active media + open windows + takes snapshot |
| *"What is the update of my latest work?"* | `work_update` | Reports git branch, latest commit & pending work |
| *"Check system resources"* | `system_resources` | Reports RAM usage and free disk space |
| *"What's my battery and Wi-Fi status?"* | `system_status` | Reports battery % + active Wi-Fi SSID |
| *"Set volume to 40 percent"* | `media_control` | Sets PipeWire master sink to 40% |
| *"Mute my microphone"* | `mute_mic` | Toggles default audio source mute |
| *"Play Arijit Singh on YouTube"* | `play_youtube` | Searches YouTube and starts video playback |
| *"Connect to my JBL speaker"* | `bluetooth_control` | Connects paired Bluetooth device |
| *"Take a screenshot"* | `take_screenshot` | Captures high-res display via Flameshot |
| *"What is on my clipboard?"* | `read_clipboard` | Reads current system clipboard text |
| *"Save this to my clips"* | `save_clipboard` | Appends snippet to `Tri Clips.md` |
| *"Take a note: Prepare slides for tomorrow"* | `take_note` | Adds note to `Tri Notes.md` |
| *"Open VS Code"* | `open_app` | Launches app via dynamic `.desktop` indexer |
| *"Put my laptop to sleep"* | `suspend_laptop` | Verifies and suspends workstation |

---

## 🛠️ Prerequisites & Installation

### 1. Requirements
- **Linux Distribution**: Tested on Kali Linux / Debian / Ubuntu (GNOME on Wayland or X11)
- **Node.js**: Version 18.0.0 or higher
- **Cloudflare Tunnel (`cloudflared`)**: [Cloudflare Installation Guide](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
- **Voice Agent Service**: [Sarvam AI Indus](https://indus.sarvam.ai/) account with an assigned phone number

### 2. System Packages
Install the recommended CLI utilities for full hardware control:

```bash
# Debian / Ubuntu / Kali
sudo apt update && sudo apt install -y \
  xclip wl-clipboard playerctl flameshot \
  speech-dispatcher-espeak-ng espeak-ng \
  libnotify-bin bluez upower network-manager \
  xdg-utils curl
```

Run our built-in inspector to verify all tools on your system:
```bash
./scripts/check-deps.sh
```

---

## 🚀 Getting Started (5 Minutes)

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/eklavyamathur9/Tri.git
cd Tri
cd tri && npm install && cd ..
```

### Step 2: Bootstrap Configuration
Run setup with your phone number (including country code, e.g. `91` for India):
```bash
node tri/setup.js 919876543210
```
This sets `OWNER_NUMBER`, generates a cryptographically random Bearer token, and saves it in `tri/.env`.

### Step 3: Start Tri
```bash
./scripts/start-tri.sh
```
Keep this terminal open. It will:
- Start the server on `http://localhost:3710`
- Launch a live Cloudflare Tunnel (`trycloudflare.com`)
- Automatically copy your unique webhook URL to your clipboard.

Visit [`http://localhost:3710`](http://localhost:3710) in your browser to view the real-time activity console.

---

## 🎙️ Sarvam AI Agent Setup

Use our interactive helper in a separate terminal:
```bash
./scripts/copy-for-sarvam.sh
```

In your [Sarvam Indus Portal](https://indus.sarvam.ai/):
1. **Create Agent**: Click **Create from scratch** $\rightarrow$ Name: `TriAgent`.
2. **Instructions**: Press `1` in the helper $\rightarrow$ Paste into Sarvam **Instructions**.
3. **Greeting**: Add variable `opening_line` (Press `2` in helper to copy greeting) $\rightarrow$ Set Greeting to `{{opening_line}}`.
4. **Tool Setup**: Click **Add Tool** $\rightarrow$ **API / HTTP Tool**:
   - **Tool Name**: `laptop_action`
   - **Description**: Press `3` in helper $\rightarrow$ Paste description.
   - **Method**: `POST`
   - **URL**: Press `4` in helper $\rightarrow$ Paste your active tunnel URL (`https://...trycloudflare.com/action`).
   - **Authentication**: `Bearer Token` $\rightarrow$ Press `5` in helper $\rightarrow$ Paste your token secret.
   - **Parameters**:
     - `action` (string, filled by agent)
     - `input` (string, filled by agent)
     - `caller` (User Identifier)
   - **Timeout**: `10` seconds
5. **Deploy**: Click **Commit & Deploy** to your Sarvam phone number.

### Lock Down Security
After your first successful test call, enforce strict caller verification:
```bash
./scripts/copy-for-sarvam.sh 6
```
Tri will now verify caller ID on every webhook and refuse any request originating from an unknown phone number.

---

## 🔒 Security Architecture

- **Strict Action Allowlist**: Tri only executes 39 predefined, audited functions. It **never** evaluates arbitrary shell strings received over webhooks.
- **Bearer Token Verification**: Inbound HTTP requests require a constant-time validated `Authorization: Bearer <token>` matching `TRI_TOKEN`.
- **Caller Identity Verification**: Matches incoming caller ID against `OWNER_NUMBER` and authorized owner names.
- **Encrypted Ingress**: Uses Cloudflare's TLS encrypted edge tunnel, eliminating the need to expose open router ports.
- **Local Markdown Vault**: Notes, clips, and screenshots remain strictly on your local disk.

---

## 📁 Repository Structure

```
Tri/
├── tri/                         # Core server application
│   ├── server.js                # HTTP server & 39 action handlers
│   ├── browser.js               # Playwright automation & Brave profile manager
│   ├── start.js                 # Server & Cloudflare tunnel manager
│   ├── setup.js                 # Interactive configuration bootstrap
│   ├── files.js                 # Local file indexing & fuzzy search
│   ├── monitor.js               # Deadline reminders & outbound calls
│   ├── classroom.js             # Google Classroom automation
│   ├── live.html                # Real-time web console (localhost:3710)
│   └── platform/
│       ├── index.js             # OS platform detection bridge
│       ├── linux.js             # Wayland/X11 Linux platform layer
│       └── windows.js           # Windows reference implementation
├── prompts/
│   ├── tri-instructions.txt     # System prompt for voice agent
│   └── tri-tool-description.txt # Schema description for laptop_action tool
├── scripts/
│   ├── start-tri.sh             # One-step startup script
│   ├── copy-for-sarvam.sh       # Clipboard config helper
│   └── check-deps.sh            # Linux dependency inspector
├── docs/                        # Architecture guides
├── LINUX_CONVERSION_PLAN.md     # Engineering plan & benchmark report
├── SETUP_GUIDE_LINUX.md         # Linux setup walkthrough
└── README.md                    # Project documentation
```

---

## 📄 License

MIT License. Built on top of the ARRC/J architecture.

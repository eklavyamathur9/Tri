# ⚡ Tri — Voice-Controlled Linux Laptop Agent

> Call your personal AI agent from any phone to control your Linux laptop hands-free: launch applications, adjust volume & mute mic, check battery & Wi-Fi, manage Bluetooth, capture screenshots, manage multi-snippet clipboards, write notes, and lock down your workstation.

---

## 🧭 Architecture

```
                                  CELLULAR CALL
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   Sarvam AI Voice Platform    │
                        │   (Speech-to-Text + LLM)      │
                        └───────────────┬───────────────┘
                                        │ HTTPS Webhook (POST /action)
                                        ▼
                        ┌───────────────────────────────┐
                        │   Cloudflare Tunnel           │
                        │   (Encrypted Public Ingress)  │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │   Tri Local Server (:3710)    │
                        │   ├── Bearer Auth Verification│
                        │   ├── Caller ID Validation    │
                        │   └── Action Allowlist Router │
                        └───────────────┬───────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │    Linux Platform Layer       │
                        │    (Wayland & X11 Aware)      │
                        └───┬───┬───┬───┬───┬───┬───┬───┘
                            │   │   │   │   │   │   │
        ┌───────────────────┘   │   │   │   │   │   └────────────────────┐
        ▼                       ▼   │   │   │   ▼                        ▼
 ┌──────────────┐ ┌───────────────┐ │   │ ┌──────────────┐    ┌──────────────────┐
 │.desktop Apps │ │PipeWire / ALSA│ │   │ │Bluetoothctl  │    │  Screen Capture  │
 │(VSCode, Brave│ │(Volume %, Mic │ │   │ │(Pair/Connect/│    │(Flameshot, Grim, │
 │ Spotify, etc)│ │ Mute / Audio) │ │   │ │ Disconnect)  │    │  X11 Scrot)      │
 └──────────────┘ └───────────────┘ │   │ └──────────────┘    └──────────────────┘
                                    ▼   ▼
                      ┌───────────────────────┐
                      │System / Desktop Power │
                      │(Wi-Fi nmcli, UPower,  │
                      │Suspend, Lock screen)  │
                      └───────────────────────┘
```

---

## ✨ Features

### 🚀 Desktop & App Discovery
- **Zero-Config Dynamic App Discovery**: Automatically indexes all `.desktop` launchers in `/usr/share/applications` and `~/.local/share/applications` (300+ apps supported out-of-the-box: VS Code, Cursor, Chromium, Brave, Spotify, Terminal, CherryTree, etc.).
- **Smart Alias Fallbacks**: Common aliases (`browser`, `terminal`, `editor`, `files`, `calc`) resolve intelligently to your preferred native Linux tools.
- **Web & YouTube Launching**: Open specific URLs, run web searches, or stream music and videos directly in your default browser.

### 🎧 Audio & Privacy Control
- **Exact Volume Percentage**: Control master sink volume seamlessly via PipeWire (`wpctl`) or PulseAudio/ALSA with natural commands like *"set volume to 45%"*.
- **Hardware Microphone Mute Toggle**: Instant privacy control over your default recording source via voice.
- **Media Playback**: Play, pause, skip, and rewind active desktop audio players supporting MPRIS (`playerctl`) or simulated multimedia keys.

### 📡 Telemetry & Hardware Control
- **System Status**: Reports current time, date, power connection state, battery percentage, and active Wi-Fi SSID / network connection type (`nmcli`).
- **Bluetooth Management**: Enumerate connected or paired Bluetooth devices, toggle Bluetooth radio power, and connect or disconnect devices (e.g. wireless earbuds, speakers).
- **Safe Workstation Suspend & Lock**: Lock your desktop session (`loginctl`) or suspend your laptop with a safe verbal confirmation countdown.

### 📋 Smart Clipboard & Note Vault
- **Voice Clipboard Reader**: Have Tri read aloud what is currently in your system clipboard.
- **Multi-Snippet Clipboard Scratchpad**: Save snippets with timestamps to `~/Documents/Tri Clips.md` or directly to an Obsidian vault (`OBSIDIAN_VAULT`).
- **Voice Notes**: Dictate quick thoughts and reminders saved chronologically to `~/Documents/Tri Notes.md`.

### ⏱️ Productivity & Notifications
- **Desktop Notifications**: Send visual desktop popups via `notify-send` for reminders or phone call notes.
- **Local Timers & Alarms**: Set timers with audible speech announcements over local laptop speakers (`spd-say` / `espeak-ng`).
- **Focus Sessions**: Launches your focus music, opens your target document, and sets a structured study timer.
- **Outbound Deadline Calls**: Scheduled deadline watcher (`tri/monitor.js`) triggers proactive outbound calls to your mobile phone before critical deadlines.

---

## 🗣️ Voice Commands Cheat Sheet

Here are examples of what you can say during a call:

| Intent | Example Voice Command | Action Executed |
|---|---|---|
| **Launch Apps** | *"Open VS Code"*, *"Open Brave browser"*, *"Open terminal"* | `open_app` (Dynamic `.desktop` indexer) |
| **System Info** | *"What's my battery and Wi-Fi status?"* | `system_status` (Battery % + SSID) |
| **Microphone** | *"Mute my microphone"*, *"Unmute mic"* | `mute_mic` (PipeWire toggle) |
| **Exact Volume** | *"Set volume to 40 percent"*, *"Turn it up"* | `media_control` (`volume 40%`) |
| **Media Playback** | *"Pause the music"*, *"Next track"* | `media_control` (`pause`, `next`) |
| **Bluetooth** | *"Connect to my JBL speaker"*, *"Turn off bluetooth"* | `bluetooth_control` |
| **Screenshots** | *"Take a screenshot of my screen"* | `take_screenshot` (Saved to `~/Pictures/Tri/`) |
| **Clipboard** | *"What's on my clipboard?"* | `read_clipboard` |
| **Save Clip** | *"Save this to my clips"* | `save_clipboard` (Saved to `Tri Clips.md`) |
| **Take Notes** | *"Take a note: Buy milk on the way home"* | `take_note` (Saved to `Tri Notes.md`) |
| **Read Notes** | *"What are my recent notes?"* | `read_notes` |
| **Notification** | *"Send notification: Meeting in 10 minutes"* | `send_notification` (`notify-send`) |
| **Timers** | *"Set a timer for 15 minutes"* | `set_timer` (Local TTS alarm) |
| **Focus** | *"Start a 45 minute focus session for physics"* | `focus_session` (Music + timer) |
| **Lock Screen** | *"Lock my laptop"* | `lock_screen` (`loginctl lock-session`) |
| **Suspend** | *"Put my laptop to sleep"* | `suspend_laptop` (Safe 2s voice delay) |

---

## 🛠️ Prerequisites & Installation

### 1. System Requirements
- **OS**: Linux (tested on Kali Linux / Debian / Ubuntu with GNOME on Wayland or X11)
- **Node.js**: v18.0.0 or higher (`node -v`)
- **Cloudflared**: Cloudflare Tunnel binary installed ([Cloudflare Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/))

### 2. Recommended System Utilities
Install the native CLI tools for full feature availability:

```bash
# Debian / Ubuntu / Kali
sudo apt update && sudo apt install -y \
  xclip wl-clipboard playerctl flameshot \
  speech-dispatcher-espeak-ng espeak-ng \
  libnotify-bin bluez upower network-manager \
  xdg-utils curl
```

Verify your environment with our built-in dependency check:
```bash
./scripts/check-deps.sh
```

---

## 🚀 Quick Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/eklavyamathur9/Tri.git
cd Tri
```

### Step 2: Install Node Dependencies
```bash
cd tri && npm install && cd ..
```

### Step 3: Run Setup & Start Tri
```bash
./scripts/start-tri.sh
```

On first run, the script will:
1. Verify `node` and `cloudflared`.
2. Prompt for your mobile number with country code (e.g. `919876543210`).
3. Generate a cryptographically secure token and write `tri/.env`.
4. Spin up the local HTTP server on `localhost:3710`.
5. Establish a live Cloudflare Tunnel (`trycloudflare.com`) and automatically copy your webhook URL to the clipboard.

---

## 🎙️ Configure Your Voice Agent (Sarvam AI)

Use the automated helper script:
```bash
./scripts/copy-for-sarvam.sh
```

Or configure manually in [Sarvam AI Indus](https://indus.sarvam.ai/):

| Setting | Value |
|---|---|
| **Agent Name** | `Tri` |
| **Instructions** | Copy from `prompts/tri-instructions.txt` |
| **Greeting Variable** | Add variable `opening_line` = `Hey Boss, it's Tri. What can I do for you?` |
| **Greeting Text** | `{{opening_line}}` |
| **Tool Name** | `laptop_action` |
| **Tool Type** | HTTP / API POST |
| **Tool URL** | URL from `tri/tunnel-url.txt` (or clipboard) + `/action` |
| **Auth Type** | Bearer Token (paste `TRI_TOKEN` from `tri/.env`) |
| **Parameters** | `action` (string), `input` (string), `caller` (User Identifier) |
| **Max Wait** | 10 seconds |

### Lock to Your Phone Number
Once your initial test call succeeds, enforce caller verification:
```bash
./scripts/copy-for-sarvam.sh 6
# Or set ALLOW_NO_CALLER=false in tri/.env
```
Tri will now reject calls originating from any phone number other than your registered owner number.

---

## 🔒 Security Architecture

- **Zero Arbitrary Execution**: Unlike naive agent platforms, Tri does **not** evaluate raw bash or shell strings received from LLMs. Every action maps to a strictly audited handler in `tri/server.js`.
- **Bearer Token Authentication**: All requests require an `Authorization: Bearer <token>` header matching `TRI_TOKEN`.
- **Caller Identity Verification**: Phone calls pass the telco caller ID into the webhook payload. Tri validates the caller against `OWNER_NUMBER`.
- **Audible Warning Delays**: Power actions like system sleep or suspend speak a countdown aloud on the laptop speakers before executing.
- **Local Markdown Storage**: Notes and clipboard history are kept locally in plain Markdown (`~/Documents/`) or inside your private Obsidian vault.

---

## 📁 Repository Structure

```
Tri/
├── tri/                         # Core server & logic
│   ├── server.js                # HTTP server & 34 action handlers
│   ├── start.js                 # Server & Cloudflare tunnel manager
│   ├── setup.js                 # Environment & token bootstrap
│   ├── files.js                 # Local file indexing & fuzzy search
│   ├── monitor.js               # Deadline reminders & outbound calls
│   ├── classroom.js             # Google Classroom automation
│   ├── live.html                # Real-time dashboard (localhost:3710)
│   └── platform/
│       ├── index.js             # OS detection bridge
│       ├── linux.js             # Wayland/X11 Linux platform layer
│       └── windows.js           # Windows reference implementation
├── prompts/
│   ├── tri-instructions.txt     # System prompt for voice LLM
│   └── tri-tool-description.txt # Schema description for laptop_action tool
├── scripts/
│   ├── start-tri.sh             # One-step startup script
│   ├── copy-for-sarvam.sh       # Clipboard config helper
│   └── check-deps.sh            # Linux dependency inspector
├── docs/                        # Additional architecture guides
├── LINUX_CONVERSION_PLAN.md     # Detailed migration & implementation plan
├── SETUP_GUIDE_LINUX.md         # Linux installation walkthrough
└── README.md                    # Project documentation
```

---

## 🤝 Contributing & Extension

To add new custom actions to Tri:
1. Open [`tri/server.js`](tri/server.js) and locate the `ACTIONS` dictionary.
2. Add your action handler:
   ```javascript
   my_custom_action: async (input) => {
     // Implement action using platform abstraction
     return "Done!";
   }
   ```
3. Update `prompts/tri-tool-description.txt` with the action name and description so the voice LLM knows when to invoke it.

---

## 📄 License

MIT License. Built on top of the ARRC/J architecture.

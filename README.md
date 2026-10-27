# Tri

Tri is a personal AI agent that lets you control your laptop by voice - call your agent and it does things on your Linux machine. Built on top of the ARRC/J project, now adapted for Linux.

## Quick Start

### Prerequisites
- Linux laptop (X11 or Wayland) - tested on Kali Linux
- [Node.js](https://nodejs.org/) 18+ 
- [Cloudflare Tunnel (cloudflared)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
- A voice agent service (e.g., [Sarvam AI](https://indus.sarvam.ai/)) with credits and a phone number
- Optional: `xdotool`/`ydotool`, `playerctl`, `espeak-ng`/`spd-say`, `scrot`/`grim`, `xclip`/`wl-copy`, `upower`, `wpctl`/`pactl`

### Setup

1. Clone the repo
```bash
git clone https://github.com/eklavyamathur9/Tri.git
cd Tri
```

2. Check dependencies (optional but recommended)
```bash
./scripts/check-deps.sh
```

3. Start Tri
```bash
./scripts/start-tri.sh
```

First run will:
- Install npm dependencies
- Ask for your phone number and create `.env`
- Start the server and cloudflared tunnel
- Copy the tool URL to your clipboard

4. Configure your voice agent
```bash
./scripts/copy-for-sarvam.sh
```
Follow the prompts to copy instructions, tool description, URL, and token to your voice agent dashboard.

5. Call your agent number and try it out!

**Detailed guide:** See [SETUP_GUIDE_LINUX.md](SETUP_GUIDE_LINUX.md) for complete instructions.

## Features

- **App & Web Control**: Dynamic `.desktop` application discovery (opens any installed app like VS Code, Brave, Chromium, Cursor, Spotify), opens websites and files
- **Media & Audio**: Play/pause/skip, exact volume percentage (`volume 45%`), PipeWire microphone mute/unmute toggle
- **Device Control**: Bluetooth connection and device management (`bluetoothctl`), battery status, Wi-Fi network detection
- **Clipboard Management**: Voice clipboard reader, persistent multi-clip history (`Tri Clips.md`), optional Obsidian Vault sync
- **Productivity**: Notes, desktop notifications (`notify-send`), timers, focus sessions with reminders
- **File Search**: Find and open documents across Desktop, Documents, Downloads by voice
- **Deadlines**: Get reminded with automatic outbound phone calls
- **System**: Screenshot capture (`flameshot` on Wayland/X11), screen lock, safe laptop sleep/suspend
- **Classroom**: Google Classroom automation (optional)

## Project Structure

```
Tri/
├── tri/                # Core server code
│   ├── server.js       # Main HTTP server with action handlers
│   ├── start.js        # Starts server + tunnel
│   ├── setup.js        # Initial configuration
│   ├── files.js        # File indexing and search
│   ├── monitor.js      # Deadlines and outbound calls
│   ├── classroom.js    # Google Classroom automation
│   └── platform/       # OS abstraction layer (Linux/Windows)
├── prompts/            # Voice agent instructions
├── scripts/            # Setup and helper scripts
└── docs/               # Documentation
```

## Development

This project uses `codebase-memory-mcp` for codebase understanding. The server is designed to be easily extensible - add new actions in `tri/server.js` under `ACTIONS`.

## License

Private project.

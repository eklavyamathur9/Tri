# Tri Laptop Server

The core Node.js server that runs locally on your Linux laptop to execute voice commands.

## Architecture

- `server.js`: HTTP API server running on port 3710 with 39 predefined action handlers, Bearer authentication, and caller identity verification.
- `browser.js`: Playwright browser automation and dynamic Brave profile/account manager.
- `platform/linux.js`: Wayland and X11 abstraction layer (audio, mic mute, bluetooth, windowing, screenshot, battery, clipboard).
- `files.js`: Local filesystem indexer and fuzzy document search.
- `monitor.js`: Outbound call scheduler and deadline notification daemon.
- `start.js`: Launches `server.js` and manages the Cloudflare Tunnel ingress with auto-restart on code changes.
- `setup.js`: Interactive bootstrap to configure owner phone number and cryptographically secure tokens.

## Running the Server

```bash
# 1. Install dependencies
npm install

# 2. Run initial setup (or update your owner phone number)
node setup.js 919876543210

# 3. Start server + Cloudflare tunnel
node start.js
```

Dashboard is available locally at `http://localhost:3710`.

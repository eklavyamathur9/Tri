# Setting up Tri (instructions for Claude Code)

The person who opened this folder wants their own Tri: a phone call that runs their Linux laptop.
Tri is a voice agent that calls a small server on this laptop (`tri/`) through a tunnel.
**Assume they are not technical.** Your job is to do every laptop step yourself and walk them through
the few clicks only they can do on the voice agent website, with every value ready to paste.

When they say anything like "set up Tri", "help me install this" or "get started", run the steps below
in order. If Tri was set up before (`tri/.env` exists), skip to the first step that isn't done.

## How to talk to them

- Plain words. Never say env var, repo, endpoint, payload or CLI. Say "your settings", "the Tri terminal", "the agent website".
- One step at a time. Say what you are about to do in one line, do it, then confirm it worked.
- When they have to click something on the agent website, give the exact button names, and put the value they need **on their clipboard** first so they only press Ctrl+V. Then wait for them to say done.
- Ask before installing any software (Node.js, cloudflared), say what it is in one line, then install it.
- If something fails, fix it yourself first. Only ask them for things you can't get from the laptop.

## Safety (always)

- `tri/.env` holds Tri's password and any API keys. Never print its full contents, never put it in a commit, a message or a file outside `tri/`.
- Show Tri's password only by copying it to their clipboard for the agent secret field. Don't paste it into the chat.
- Don't change `server.js` unless they ask you to add a new action.
- Keep `ALLOW_NO_CALLER=false` once phone calls work. That's what stops anyone but the owner from using Tri.

## Copying something to their clipboard

Use the kit's own helper: `./scripts/copy-for-sarvam.sh N`

| N | What it does |
|---|---|
| 1 | copies Tri's instructions |
| 2 | copies the greeting text for `opening_line` |
| 3 | copies the tool description |
| 4 | copies the tool URL (from `tri/tunnel-url.txt`) |
| 5 | copies Tri's password (never shown, straight to the clipboard) |
| 6 | not a copy: locks Tri to the owner's phone (`ALLOW_NO_CALLER=false`) |

## The steps

### 1. Check the laptop (you do this)
- Linux is required (this version is for Linux). We have a platform abstraction for cross-compatibility.
- `node -v` must work (any version 18 or newer). If not, install Node.js.
- `cloudflared --version` must work. If not, install cloudflared.
- In `tri/`, run `npm install`.
- Optional tools for full functionality: `xdotool`/`ydotool`, `playerctl`, `espeak-ng`/`spd-say`, `scrot`/`grim`, `xclip`/`wl-copy`, `upower`

### 2. Settings (they give you one thing)
Ask: "What's your mobile number, with country code? For example 919876543210." This is the only phone Tri will obey.
Run `node tri/setup.js <number>`. It creates `tri/.env` with a fresh password and leaves `ALLOW_NO_CALLER=true` for testing.

### 3. Start Tri
Ask them to run `./scripts/start-tri.sh` in the terminal and keep it open.
(Starting it from terminal also works. Closing it stops Tri.)
Within about 20 seconds `tri/tunnel-url.txt` holds the tool URL.
Check it from here: `curl -s http://localhost:3710/health` gives `{"ok":true}`

Tell them they can open **http://localhost:3710** to watch everything Tri does.

### 4. Create the agent
Walk them through configuring their voice agent (e.g., Sarvam AI) with the values from the copy script.

### 5. Test and lock down
Once phone calls work, run copy option 6 to lock Tri to the owner's phone.

## Day to day
- To switch Tri on: run `./scripts/start-tri.sh` and keep the terminal open.
- If the tunnel address CHANGED, update the tool URL in your agent config.

## If something goes wrong
| What they see | What to do |
|---|---|
| Tri says she couldn't reach the laptop | The terminal was closed or the address changed. Start Tri again and update the tool URL. |
| "Sorry, I can only take orders from my owner's phone" | `OWNER_NUMBER` in `tri/.env` must be digits only with country code. Fix it and save. |

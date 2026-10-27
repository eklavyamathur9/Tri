# Setting up J (instructions for Claude Code)

The person who opened this folder wants their own J: a phone call that runs their Windows laptop.
J is a Sarvam voice agent that calls a small server on this laptop (`arrc\`) through a tunnel.
**Assume they are not technical.** Your job is to do every laptop step yourself and walk them through
the few clicks only they can do on the Sarvam website, with every value ready to paste.

When they say anything like "set up J", "help me install this" or "get started", run the steps below
in order. If J was set up before (`arrc\.env` exists), skip to the first step that isn't done.

## How to talk to them

- Plain words. Never say env var, repo, endpoint, payload or CLI. Say "your settings", "the J window", "the Sarvam website".
- One step at a time. Say what you are about to do in one line, do it, then confirm it worked.
- When they have to click something on the Sarvam website, give the exact button names, and put the value they need **on their clipboard** first so they only press Ctrl+V. Then wait for them to say done.
- Ask before installing any software (Node.js, cloudflared), say what it is in one line, then install it.
- If something fails, fix it yourself first. Only ask them for things you can't get from the laptop.

## Safety (always)

- `arrc\.env` holds J's password and any Sarvam keys. Never print its full contents, never put it in a commit, a message or a file outside `arrc\`.
- Show J's password only by copying it to their clipboard for the Sarvam secret field. Don't paste it into the chat.
- Don't change `server.js` unless they ask you to add a new action (step 10).
- Keep `ALLOW_NO_CALLER=false` once phone calls work. That's what stops anyone but the owner from using J.

## Copying something to their clipboard

Use the kit's own helper, run from this folder: `cmd /c Copy-for-Sarvam.bat N`

| N | What it does |
|---|---|
| 1 | copies J's instructions |
| 2 | copies the greeting text for `opening_line` |
| 3 | copies the tool description |
| 4 | copies the tool URL (from `arrc\tunnel-url.txt`) |
| 5 | copies J's password (never shown, straight to the clipboard) |
| 6 | not a copy: locks J to the owner's phone (`ALLOW_NO_CALLER=false`) |

They can also double-click **Copy-for-Sarvam.bat** and press the same numbers. That's the menu START-HERE.txt uses for people without Claude Code.

## The steps

### 1. Check the laptop (you do this)
- Windows is required (the laptop actions use Windows tools).
- `node -v` must work (any version 18 or newer). If not: ask, then `winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements`. It installs to `C:\Program Files\nodejs`; use that full path if this session can't find `node` yet.
- `cloudflared --version` must work. If not: ask, then `winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements`.
- In `arrc\`, run `npm install`.
- Start-J.bat also installs all of this by itself, so if a step here fails, step 3 can still get them there.

### 2. Settings (they give you one thing)
Ask: "What's your mobile number, with country code? For example 919876543210." This is the only phone J will obey.
Run `node setup.js <number>` inside `arrc\`. It creates `arrc\.env` with a fresh password and leaves `ALLOW_NO_CALLER=true` for testing.

### 3. Start J
Ask them to double-click **Start-J.bat** in this folder and keep the black window that opens.
(Starting it from your own terminal also works, but J stops when this chat closes. The window is what keeps J running.)
Within about 20 seconds `arrc\tunnel-url.txt` holds the tool URL. Read it from there.
Check it from here, both should pass:
- `curl -s http://localhost:3710/health` gives `{"ok":true}`
- `curl -s -X POST <tool URL> -H "content-type: application/json" -d "{\"action\":\"system_status\"}"` gives `Not authorised.` That proves the tunnel reaches the laptop and the password lock works. (Every page except `/action` is hidden from the internet on purpose, so `/health` through the tunnel says Not found. That's fine.)

Tell them they can open **http://localhost:3710** to watch everything J does.

### 4. They need a Sarvam account
Ask if they have one at **indus.sarvam.ai** with credits, and a phone number under **Deploy → Phone Numbers**. If not, they sign up and buy a number first. That number is what they will call.

### 5. Create the agent (they click, you prepare each value)
Walk them through, one item at a time, copying each value to the clipboard before they need it:
1. **Build → Agents → Create from scratch**, name it **J**.
2. Instructions: copy 1; they paste it.
3. Variables: add an input variable named `opening_line`; copy 2 for its default value.
4. Greeting: `{{opening_line}}` (also for any greeting translations Sarvam asks for).
5. Settings: any voice they like (Simran is the one we used), Starting language **English**, Switch language during call **on**, "Hang up after unanswered nudges" **off**, Background sound **none**.

### 6. Give J her tool
In the agent: **Tools → Add tool → API / HTTP tool**:
| Field | Value |
|---|---|
| Name | `laptop_action` |
| Description | copy 3 |
| When it runs | During call |
| Method | POST |
| URL | copy 4 |
| Auth | Bearer token. They make a new secret (copy 5) and pick it |
| Parameters | `action` (text, filled by the agent), `input` (text, filled by the agent), `caller` (User Identifier) |
| Max wait | 10 seconds |

Test: they press **Test agent** and say "what's my battery?". Confirm it arrived with
`curl -s http://localhost:3710/activity` (the newest entry should be `system_status`).

### 7. Put J on their phone number
1. They press **Commit** (Sarvam saves a version, like v1).
2. **Deploy → Phone Numbers**, their number, **Inbound** = agent J, that version.
3. They call their Sarvam number from their own phone and try "play Arijit Singh on YouTube" or "set a 5 minute timer for tea".
4. Once that works, run `cmd /c Copy-for-Sarvam.bat 6` (sets `ALLOW_NO_CALLER=false`). The J window restarts the server by itself and the tool URL stays the same.

Setup is done. Tell them how to use it day to day (below).

### 8. Optional: J calls them (deadlines, low battery)
They need, from the Sarvam website: a workspace API key, Org ID and Workspace ID (**Settings**), the agent ID (last part of the agent's address while editing it), the deployed version number, and their Sarvam number plus its connection ID (**Deploy → Phone Numbers**).
Put them in `SARVAM_WORKSPACE_KEY`, `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `ARRC_APP_ID`, `ARRC_APP_VERSION`, `ARRC_AGENT_NUMBER`, `ARRC_CONNECTION_ID` in `arrc\.env`. Then they press **Test urgent call** on the dashboard and their phone should ring.
Every time they commit a new version of J, update `ARRC_APP_VERSION`.

### 9. Optional: Google Classroom uploads
Set `CLASSROOM_SUBMIT=attach` in `arrc\.env`. A separate Chrome window opens; they sign in to their college Google account there once and leave it open. `attach` uploads but does not turn in; only use `live` if they ask for automatic turn-in.

### 10. Optional: a new action
Actions live in `arrc\server.js` inside `const ACTIONS = {`. Add one next to the others (whatever it returns is what J says, keep it short). Saving the file restarts the server by itself. Then add its name to the list in `J-agent\2-tool-description.txt` and one line about it to the instructions, then they paste both into Sarvam, Commit and deploy.

## Day to day (tell them this at the end)

- To switch J on: double-click **Start-J.bat** and keep the window open. Closing it switches J off.
- The window shows the tool URL. If it says the address **CHANGED**, the URL is already on their clipboard: in Sarvam open J → Tools → laptop_action, paste it as the URL, Commit, and set the new version on their phone number. (Or ask Claude Code to walk them through it.)

## If something goes wrong

| What they see | What to do |
|---|---|
| J says she couldn't reach the laptop | The J window was closed or the address changed. Start J again and update the tool URL in Sarvam (see Day to day). |
| "Sorry, I can only take orders from my owner's phone" | `OWNER_NUMBER` in `arrc\.env` must be digits only with country code. Fix it and save; the server restarts by itself. |
| Test agent fails but phone calls work | Test agent sends no caller number. That's expected once `ALLOW_NO_CALLER=false`. |
| She starts in Hindi | Sarvam: Settings → Starting language → English. |
| She hangs up by herself | Turn off "Hang up after unanswered nudges". |
| Her calls to them use old instructions | Update `ARRC_APP_VERSION` in `arrc\.env`. |
| The J window says the port is in use | J is already running in another window. Use that one or close it. |
| Classroom says the window is signed out | Sign in again in the separate Chrome window. |

The full illustrated guide is `ARRC-Build-Guide.pdf` if they want to read along.

# BUILD YOUR OWN TRI

You call a phone number, talk to Tri, and your Linux laptop does what you ask.

## BEFORE YOU START

You need:
- A Linux laptop (Ubuntu/Debian/Fedora/Arch etc.)
- A voice agent account (e.g., Sarvam AI at indus.sarvam.ai) with some credits, and a phone number in it
- Node.js 18+ and cloudflared installed

## WAY 1 (easiest): Claude Code does it with you - about 20 min

1. Install the Claude Code app and sign in.
2. In Claude Code, open this folder (Tri).
3. Type: `Set up Tri for me`
4. Do what it says. It tells you exactly where to click, and puts everything you need on your clipboard.

## WAY 2: on your own - about 30 min

### PART A. Switch Tri on (on your laptop)

1. Open a terminal in this folder
2. Run: `./scripts/start-tri.sh`
   The first time it installs what it needs (a few minutes).
3. It asks for your mobile number. Type it with the country code, numbers only, like 919876543210, and press Enter.
4. Wait until it says `Tri is running`. Keep that terminal open. (Closing it switches Tri off.)

### PART B. Make Tri on your agent website

1. Run: `./scripts/copy-for-sarvam.sh` (or just follow the prompts)
2. Go to your voice agent platform (e.g., indus.sarvam.ai). Click Build → Agents → Create from scratch. Name it Tri.
3. Instructions box: copy 1, paste.
4. Variables: add one called `opening_line`. For its value, copy 2, paste.
5. Greeting: type `{{opening_line}}`
6. Settings: pick any voice. Starting language: English. Switch language during call: ON. Hang up after unanswered nudges: OFF. Background sound: none.
7. Tools → Add tool → API / HTTP tool:
   - Name: `laptop_action`
   - Description: copy 3, paste
   - When it runs: During call
   - Method: POST
   - URL: copy 4, paste
   - Auth: Bearer token. Make a new secret: copy 5, paste.
   - Parameters: `action` (text, filled by the agent), `input` (text, filled by the agent), `caller` (choose User Identifier)
   - Max wait: 10 seconds
8. Test the agent. Then Commit and deploy to your phone number.

### PART C. Call Tri

1. Call your agent number from your own phone. Try: "Play some music on YouTube" or "Set a 5 minute timer"
2. It works? Run `./scripts/copy-for-sarvam.sh` and press 6. Now Tri only listens to your phone.

## EVERY DAY

- Switch Tri on: `./scripts/start-tri.sh` and keep the terminal open.
- If the terminal says the address CHANGED: update the tool URL in your agent config.

## IF SOMETHING GOES WRONG

- Tri says she can't reach your laptop → start script isn't running, or address changed
- "I can only take orders from my owner's phone" → wrong mobile number, fix in `tri/.env`
- Open the folder in Claude Code and tell it what happened.

Never share the file `tri/.env`. It holds Tri's password.

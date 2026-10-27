# Tri laptop server

The part of J that runs on your laptop.

Easiest: open the folder above in Claude Code and type "Set up J for me" (see `../CLAUDE.md`).
Full manual steps are in `../Tri-Build-Guide.pdf`.

```
npm install
node setup.js 919876543210   (your mobile number; creates .env with a fresh password)
node start.js                (server + tunnel; prints the tool URL for Sarvam)
```

`node setup.js --show-token` prints J's password again. Saving `.env` while J runs restarts the
server without changing the tunnel address. `npm start` runs the server alone, without a tunnel.

Every action J can take is in `server.js`, inside `const ACTIONS = {`. Add your own there.

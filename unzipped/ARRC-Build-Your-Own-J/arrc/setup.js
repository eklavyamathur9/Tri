// One-time setup: creates arrc\.env with a fresh password for J and your mobile number.
//
//   node setup.js 919876543210     your mobile number, digits only, with country code
//   node setup.js --show-token     print J's password again (you paste it into Sarvam)
//
// Safe to run twice: an existing .env is never overwritten.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.join(ROOT, '.env');
const EXAMPLE = path.join(ROOT, '.env.example');

const readToken = () => (fs.readFileSync(ENV, 'utf8').match(/^JARVIS_TOKEN=(.*)$/m) || [])[1]?.trim() || '';

if (process.argv.includes('--show-token')) {
  if (!fs.existsSync(ENV)) {
    console.log('No .env yet. Run: node setup.js <your mobile number>');
    process.exit(1);
  }
  console.log(readToken() || 'JARVIS_TOKEN is empty in .env');
  process.exit(0);
}

if (fs.existsSync(ENV)) {
  console.log('.env already exists, leaving it as it is.');
  console.log(`Password set: ${readToken() ? 'yes' : 'NO, fill JARVIS_TOKEN in .env'}`);
  process.exit(0);
}

let number = (process.argv[2] || '').replace(/\D/g, '');
if (!number) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  number = (await rl.question('Your mobile number with country code, digits only (example 919876543210): ')).replace(/\D/g, '');
  rl.close();
}
if (number.length < 11 || number.length > 15) {
  console.log(`"${number}" doesn't look right. Use digits only with the country code, like 919876543210.`);
  process.exit(1);
}

const token = crypto.randomBytes(24).toString('hex');
const env = fs.readFileSync(EXAMPLE, 'utf8')
  .replace(/^JARVIS_TOKEN=.*$/m, `JARVIS_TOKEN=${token}`)
  .replace(/^OWNER_NUMBER=.*$/m, `OWNER_NUMBER=${number}`);
fs.writeFileSync(ENV, env);

console.log('\nDone. Your settings are saved in arrc\\.env (never share that file).');
console.log(`Owner number: ${number}`);
console.log('\nJ\'s password (you paste this into Sarvam as the Bearer token secret):');
console.log(token);

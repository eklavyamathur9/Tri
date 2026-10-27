// One-time setup: creates or updates tri/.env with a secure token and your mobile number.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.join(ROOT, '.env');
const EXAMPLE = path.join(ROOT, '.env.example');

const readToken = () => {
  if (!fs.existsSync(ENV)) return '';
  const content = fs.readFileSync(ENV, 'utf8');
  return (content.match(/^TRI_TOKEN=(.*)$/m) || content.match(/^JARVIS_TOKEN=(.*)$/m) || [])[1]?.trim() || '';
};

const readOwner = () => {
  if (!fs.existsSync(ENV)) return '';
  const content = fs.readFileSync(ENV, 'utf8');
  return (content.match(/^OWNER_NUMBER=(.*)$/m) || content.match(/^TRI_OWNER=(.*)$/m) || [])[1]?.trim() || '';
};

if (process.argv.includes('--show-token')) {
  if (!fs.existsSync(ENV)) {
    console.log('No .env yet. Run: node setup.js <your mobile number>');
    process.exit(1);
  }
  console.log(readToken() || 'TRI_TOKEN is empty in .env');
  process.exit(0);
}

const forceReset = process.argv.includes('--reset') || process.argv.includes('--force');

// Parse number from CLI arguments
let numberArg = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1]);
let number = numberArg ? numberArg.replace(/\D/g, '') : '';

const envExists = fs.existsSync(ENV);
const currentOwner = readOwner();
const currentToken = readToken();

if (!number) {
  const isDummyOrEmpty = !currentOwner || currentOwner === '919999999999' || currentOwner.length < 10;
  if (envExists && !isDummyOrEmpty && !forceReset) {
    console.log(`Tri is currently configured with owner number: ${currentOwner}`);
    console.log(`Password set: ${currentToken ? 'yes' : 'NO'}`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await rl.question('Enter a new phone number to change it (or press Enter to keep current): ');
    rl.close();
    const cleaned = ans.replace(/\D/g, '');
    if (!cleaned) {
      console.log('Keeping existing configuration.');
      process.exit(0);
    }
    number = cleaned;
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    number = (await rl.question('Your mobile number with country code, digits only (example 919876543210): ')).replace(/\D/g, '');
    rl.close();
  }
}

if (number.length < 10 || number.length > 15) {
  console.log(`"${number}" doesn't look right. Use digits only with country code, like 919876543210.`);
  process.exit(1);
}

let token = (!forceReset && currentToken) ? currentToken : crypto.randomBytes(24).toString('hex');

let envContent;
if (envExists && !forceReset) {
  let existing = fs.readFileSync(ENV, 'utf8');
  existing = existing.replace(/^OWNER_NUMBER=.*$/m, `OWNER_NUMBER=${number}`);
  existing = existing.replace(/^TRI_OWNER=.*$/m, `TRI_OWNER=${number}`);
  if (/^TRI_PHONE=.*$/m.test(existing)) {
    existing = existing.replace(/^TRI_PHONE=.*$/m, `TRI_PHONE=${number}`);
  } else {
    existing += `\nTRI_PHONE=${number}\n`;
  }
  if (!readToken()) {
    existing = existing.replace(/^TRI_TOKEN=.*$/m, `TRI_TOKEN=${token}`);
  }
  envContent = existing;
} else if (fs.existsSync(EXAMPLE)) {
  envContent = fs.readFileSync(EXAMPLE, 'utf8')
    .replace(/^TRI_TOKEN=.*$/m, `TRI_TOKEN=${token}`)
    .replace(/^OWNER_NUMBER=.*$/m, `OWNER_NUMBER=${number}`)
    .replace(/^TRI_OWNER=.*$/m, `TRI_OWNER=${number}`)
    .replace(/^TRI_PHONE=.*$/m, `TRI_PHONE=${number}`);
} else {
  envContent = `PORT=3710\nTRI_TOKEN=${token}\nOWNER_NUMBER=${number}\nTRI_OWNER=${number}\nTRI_PHONE=${number}\nALLOW_NO_CALLER=true\n`;
}

fs.writeFileSync(ENV, envContent);

console.log('\n==============================================================');
console.log(' Tri configuration updated in tri/.env');
console.log(` Owner phone number: ${number}`);
console.log(' Tri\'s Bearer token secret (keep secret):');
console.log(`   ${token}`);
console.log('==============================================================\n');

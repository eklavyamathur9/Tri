// Tri Browser Automation & Profile Controller (powered by Playwright & Brave)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const BRAVE_CONFIG = path.join(os.homedir(), '.config/BraveSoftware/Brave-Browser');
const LOCAL_STATE = path.join(BRAVE_CONFIG, 'Local State');

// Helper to find installed browser binaries
function findBinary(names) {
  for (const n of names) {
    if (n.startsWith('/') && fs.existsSync(n)) return n;
    const paths = ['/usr/bin/' + n, '/usr/local/bin/' + n, '/bin/' + n];
    for (const p of paths) {
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const BRAVE_BIN = findBinary(['brave-browser', 'brave']);
const CHROME_BIN = findBinary(['google-chrome', 'chromium', 'google-chrome-stable']);

/**
 * Discovers all user profiles from Brave's Local State
 */
export function getBraveProfiles() {
  if (!fs.existsSync(LOCAL_STATE)) return {};
  try {
    const raw = fs.readFileSync(LOCAL_STATE, 'utf8');
    const state = JSON.parse(raw);
    const info = state.profile?.info_cache || {};
    const result = {};
    for (const [dir, p] of Object.entries(info)) {
      result[dir] = {
        dir,
        name: p.name || dir,
        normalizedName: (p.name || dir).toLowerCase().trim(),
        user_name: p.user_name || '',
      };
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Matches a user's voice query against available browser profiles
 */
export function matchProfile(query) {
  const q = String(query || '').toLowerCase().trim();
  const profiles = getBraveProfiles();
  if (!q) return profiles['Default'] || Object.values(profiles)[0] || null;

  for (const [dir, p] of Object.entries(profiles)) {
    if (dir.toLowerCase() === q) return p;
    if (p.normalizedName === q) return p;
    if (q.includes(p.normalizedName)) return p;
    if (p.normalizedName.includes(q)) return p;
    // Common aliases
    if (q.includes('personal') && (p.normalizedName.includes('personal') || dir === 'Profile 1')) return p;
    if ((q.includes('college') || q.includes('collage') || q.includes('school')) &&
        (p.normalizedName.includes('coll') || dir === 'Profile 2')) return p;
    if (q.includes('work') && (p.normalizedName.includes('work') || dir === 'Default')) return p;
  }
  return null;
}

/**
 * Launch Brave with a specific account / profile and optional URL
 */
export async function openBraveProfile(profileQuery, targetUrl = '') {
  if (!BRAVE_BIN) {
    return { ok: false, message: 'Brave browser is not installed on this system.' };
  }
  const profile = matchProfile(profileQuery);
  const profileDir = profile ? profile.dir : 'Default';
  const profileName = profile ? profile.name : 'Default';

  const args = [`--profile-directory=${profileDir}`];
  if (targetUrl && /^https?:\/\//i.test(targetUrl.trim())) {
    args.push(targetUrl.trim());
  } else if (targetUrl && targetUrl.trim()) {
    args.push(`https://${targetUrl.trim()}`);
  }

  const proc = spawn(BRAVE_BIN, args, { detached: true, stdio: 'ignore' });
  proc.unref();

  const urlText = targetUrl ? ` with ${targetUrl}` : '';
  return {
    ok: true,
    profileName,
    message: `Opened Brave on your ${profileName} account${urlText}.`,
  };
}

/**
 * Uses Playwright to navigate to a webpage and extract summary text
 */
export async function readWebpage(url) {
  const target = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const bin = CHROME_BIN || BRAVE_BIN;
  if (!bin) return 'No browser binary available for automation.';

  let browser = null;
  try {
    browser = await chromium.launch({
      executablePath: bin,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    const title = await page.title();

    // Extract visible paragraph text
    const textSnippet = await page.evaluate(() => {
      const ps = Array.from(document.querySelectorAll('h1, h2, p, article'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 20);
      return ps.slice(0, 3).join('. ');
    });

    await browser.close();
    const cleanSnippet = textSnippet ? textSnippet.replace(/\s+/g, ' ').slice(0, 250) : '';
    return `Page title: ${title}. ${cleanSnippet ? 'Content: ' + cleanSnippet : ''}`;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return `Could not read webpage: ${err.message}`;
  }
}

export default {
  getBraveProfiles,
  matchProfile,
  openBraveProfile,
  readWebpage,
};

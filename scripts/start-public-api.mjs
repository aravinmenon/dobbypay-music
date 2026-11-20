/**
 * Keeps Express reachable from real phones:
 * Express (Clever Cloud MySQL) ← cloudflared quick tunnel ← HTTPS URL baked/used by APK
 *
 * Usage: node scripts/start-public-api.mjs
 * Note: quick tunnel hostnames change when this process restarts — re-run npm run cap:apk
 * after a new URL is printed, OR paste the new URL in the app Connection Settings.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const urlFile = path.join(root, 'public-api-url.txt');

function upsertEnv(publicBase) {
  const api = publicBase.replace(/\/+$/, '') + '/api';
  let text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = {
    VITE_API_BASE_URL: api,
    VITE_SONGS_API_URL: `${api}/songs`,
    VITE_PUBLIC_API_URL: api
  };
  for (const [key, value] of Object.entries(lines)) {
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) text = text.replace(re, `${key}=${value}`);
    else text += `\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, text);
  fs.writeFileSync(urlFile, api + '\n');
  console.log(`\n✅ Public API for Android: ${api}`);
  console.log('   Saved to .env and public-api-url.txt');
  console.log('   Rebuild APK (npm run cap:apk) OR paste this URL in app Connection Settings.\n');
}

const child = spawn(
  'npx',
  ['--yes', 'cloudflared', 'tunnel', '--url', 'http://127.0.0.1:5000'],
  { cwd: root, shell: true, stdio: ['ignore', 'pipe', 'pipe'] }
);

let found = false;
const onChunk = (buf) => {
  const s = buf.toString();
  process.stdout.write(s);
  if (found) return;
  const m = s.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (m) {
    found = true;
    upsertEnv(m[0]);
  }
};

child.stdout.on('data', onChunk);
child.stderr.on('data', onChunk);
child.on('exit', (code) => {
  console.error(`cloudflared exited (${code}). Restart with: npm run public-api`);
  process.exit(code || 1);
});

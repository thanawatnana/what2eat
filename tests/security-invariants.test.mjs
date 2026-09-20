import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const walkJs = path => statSync(path).isDirectory()
  ? readdirSync(path).flatMap(name => walkJs(join(path, name)))
  : path.endsWith('.js') ? [path] : [];

test('password hashes are not accessed by application screens', () => {
  const files = ['context/AuthContext.js', 'screens/LoginScreen.js', 'screens/RegisterScreen.js'];
  for (const file of files) assert.doesNotMatch(read(file), /password_hash|bcrypt/i, file);
});

test('party screens mutate state only through the atomic RPC', () => {
  const source = ['screens/PartyScreen.js', 'screens/LobbyScreen.js', 'screens/SwipeScreen.js']
    .map(read).join('\n');
  assert.doesNotMatch(source, /\.from\(['"](?:rooms|participants|swipes)['"]\)/);
  assert.match(read('services/party.js'), /\.rpc\(['"]party['"]/);
});

test('migration denies anonymous data access and protects owner rows', () => {
  const sql = read('database/secure_auth_and_party.sql');
  assert.match(sql, /revoke all on public\.users[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /primary key\(room_id, user_id, food_id\)/i);
  assert.match(sql, /on conflict do nothing/i);
});

test('image uploads require base64 and an owner folder', () => {
  const source = read('utils/imageUpload.js');
  assert.match(source, /base64: true/);
  assert.match(source, /5 \* 1024 \* 1024/);
  assert.match(source, /image\/png/);
  assert.match(source, /image\/webp/);
  assert.match(source, /`\$\{userId\}\//);
  assert.doesNotMatch(source, /upsert: true/);
});

test('registration uses a dedicated email PIN screen and gates profile creation', () => {
  assert.match(read('screens/RegisterScreen.js'), /Email \(ไม่บังคับ\)/);
  assert.match(read('screens/RegisterScreen.js'), /replace\(['"]VerifyEmail['"]/);
  assert.match(read('screens/VerifyEmailScreen.js'), /verifyOtp\([\s\S]*type:\s*['"]email['"]/);
  assert.match(read('screens/VerifyEmailScreen.js'), /resend\(\{\s*type:\s*['"]signup['"]/);
  assert.match(read('context/AuthContext.js'), /account-register/);
  assert.doesNotMatch(read('context/AuthContext.js'), /createURL|ConfirmationURL/);
  assert.match(read('database/registration_otp.sql'), /email_confirmed_at is null/);
  assert.match(read('database/registration_otp.sql'), /after insert or update of email_confirmed_at/i);
  assert.match(read('supabase/functions/account-register/index.ts'), /email_confirm:\s*true/);
  assert.match(read('supabase/templates/confirmation.html'), /\{\{ \.Token \}\}/);
  assert.doesNotMatch(read('supabase/templates/confirmation.html'), /ConfirmationURL/);
});

test('application source contains no emoji characters', () => {
  const targets = ['App.js', 'screens', 'context', 'services', 'hooks', 'utils', 'data'];
  const files = targets.flatMap(target => walkJs(join(root, target)));
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F]/u, file);
  }
});

test('nearby map has live data and a visible demo fallback', () => {
  assert.match(read('screens/NearbyMapScreen.js'), /requestForegroundPermissionsAsync/);
  assert.match(read('services/nearbyPlaces.js'), /overpass-api\.de/);
  assert.match(read('services/nearbyPlaces.js'), /overpass\.private\.coffee/);
  assert.match(read('services/nearbyPlaces.js'), /createDemoPlaces/);
  assert.match(read('screens/HomeScreen.js'), /097-9253802/);
  assert.match(read('App.js'), /NearbyMapScreen/);
});

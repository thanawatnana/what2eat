import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

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

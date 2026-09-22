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
  assert.match(read('screens/VerifyEmailScreen.js'), /PIN_LENGTH = 6/);
  assert.match(read('screens/VerifyEmailScreen.js'), /RESEND_SECONDS = 30/);
  assert.match(read('context/AuthContext.js'), /account-register/);
  assert.doesNotMatch(read('context/AuthContext.js'), /createURL|ConfirmationURL/);
  assert.match(read('database/registration_otp.sql'), /email_confirmed_at is null/);
  assert.match(read('database/registration_otp.sql'), /after insert or update of email_confirmed_at/i);
  assert.match(read('supabase/functions/account-register/index.ts'), /email_confirm:\s*true/);
  assert.match(read('supabase/templates/confirmation.html'), /\{\{ \.Token \}\}/);
  assert.doesNotMatch(read('supabase/templates/confirmation.html'), /ConfirmationURL/);
  assert.doesNotMatch(read('supabase/templates/confirmation.html'), /href\s*=/i);
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
  assert.match(read('components/AdCarousel.js'), /097-9253802/);
  assert.match(read('App.js'), /NearbyMapScreen/);
});

test('random results can open map search for the selected food', () => {
  for (const file of ['screens/HomeScreen.js', 'screens/SoloScreen.js', 'screens/ResultScreen.js']) {
    assert.match(read(file), /navigate\(['"]NearbyMap['"][\s\S]*foodName:/, file);
    assert.match(read(file), /หาร้านที่ขายเมนูนี้/, file);
  }
  assert.match(read('screens/NearbyMapScreen.js'), /route\?\.params\?\.foodName/);
  assert.match(read('services/nearbyPlaces.js'), /rankPlacesForFood/);
});

test('advertisements and food preferences are protected by RLS', () => {
  const sql = read('database/dynamic_ads_and_food_preferences.sql');
  assert.match(sql, /alter table public\.advertisements enable row level security/i);
  assert.match(sql, /alter table public\.food_preferences enable row level security/i);
  assert.match(sql, /select joykin_private\.is_admin\(\)/i);
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(sql, /payment_amount > 0/i);
  assert.match(sql, /advertisement_images_admin_insert/i);
});

test('hidden foods are removed before any local random selection', () => {
  const service = read('services/foodPreferences.js');
  assert.match(service, /if \(isFoodHidden\(preferences, food\)\) return false/);
  assert.match(read('screens/HomeScreen.js'), /buildRandomPool/);
  assert.match(read('screens/SoloScreen.js'), /buildRandomPool/);
  assert.match(read('screens/AllFoodsScreen.js'), /toggleFoodHidden/);
  assert.match(read('database/dynamic_ads_and_food_preferences.sql'), /room_foods_skip_hidden/i);
});

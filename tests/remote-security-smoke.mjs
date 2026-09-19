import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://rsbflshmxakeasrykhif.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmZsc2hteGFrZWFzcnlraGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzMzOTMsImV4cCI6MjEwMzA0OTM5M30.g_dCCBfqTMXZzBy6otkG8_ViejuDlSy1B09kbManaT4';

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: rowsError } = await client.from('users').select('id').limit(1);
assert(rowsError, 'anonymous users table read must be denied');

const { error: partyError } = await client.rpc('party', { p_action: 'snapshot', p_payload: {} });
assert(partyError, 'anonymous party RPC must be denied');

const response = await fetch(`${SUPABASE_URL}/functions/v1/account-login`, {
  method: 'POST',
  headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: '__security_smoke__', password: 'definitely-wrong' }),
});
assert.equal(response.status, 401);
const body = await response.json();
assert.equal(body.error, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
console.log('Remote security smoke passed');

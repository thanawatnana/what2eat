import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { compare } from 'npm:bcryptjs@3.0.3';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const generic = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
// The password authenticates this public endpoint. Service credentials and
// legacy hashes stay on the server and are never logged or returned.
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  const began = Date.now();
  const reject = async () => {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, 500 - (Date.now() - began))));
    return reply({ error: generic }, 401);
  };

  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) {
      return reply({ error: 'Request too large' }, 413);
    }
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 4096) return reply({ error: 'Request too large' }, 413);
    const body = JSON.parse(text);
    if (typeof body.identifier !== 'string' || typeof body.password !== 'string') return reject();
    const identifier = body.identifier.trim().toLowerCase();
    const password = body.password;
    if (!identifier || identifier.length > 255 || !password || new TextEncoder().encode(password).length > 72) {
      return reject();
    }
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identifier));
    const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const { data: allowed, error: rateError } = await admin.rpc('login_attempt', { p_key: key });
    if (rateError) return reply({ error: 'ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง' }, 503);
    if (!allowed) return reply({ error: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที' }, 429);

    const byEmail = identifier.includes('@');
    const { data: profile, error } = await admin.rpc('login_profile', {
      p_identifier: identifier, p_by_email: byEmail,
    });
    if (error || !profile?.id || profile.is_guest || !profile.email) return reject();

    if (profile.password_hash) {
      if (!await compare(password, profile.password_hash)) return reject();
      const { error: imported } = await admin.auth.admin.createUser({
        id: profile.id,
        email: profile.email,
        password_hash: profile.password_hash,
        email_confirm: false,
        user_metadata: { username: profile.username, name_account: profile.name_account },
      });
      if (imported) {
        const { data: existing } = await admin.auth.admin.getUserById(profile.id);
        if (!existing.user || existing.user.email?.toLowerCase() !== profile.email.toLowerCase()) return reject();
      }
    }

    const { data, error: signInError } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (signInError?.code === 'email_not_confirmed') {
      const { error: otpError } = await auth.auth.resend({ type: 'signup', email: profile.email });
      if (otpError) return reply({ error: 'ส่งอีเมลยืนยันไม่สำเร็จ กรุณารอสักครู่แล้วลองใหม่' }, 429);
      return reply({ verificationRequired: true, email: profile.email });
    }
    if (signInError || !data.session) return reject();
    return reply({ session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    } });
  } catch {
    return reject();
  }
});

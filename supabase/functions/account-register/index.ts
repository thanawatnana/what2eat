import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const byteLength = (value: string) => new TextEncoder().encode(value).length;
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  try {
    if (Number(request.headers.get('content-length') || 0) > 4096) {
      return reply({ error: 'Request too large' }, 413);
    }
    const text = await request.text();
    if (byteLength(text) > 4096) return reply({ error: 'Request too large' }, 413);
    const body = JSON.parse(text);
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
    const nameAccount = typeof body.nameAccount === 'string' ? body.nameAccount.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const email = typeof body.email === 'string' && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;

    if (!/^[a-z0-9_.-]{3,30}$/.test(username) || nameAccount.length < 1 || nameAccount.length > 40 ||
      password.length < 12 || byteLength(password) > 72 ||
      (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return reply({ error: 'ข้อมูลสมัครสมาชิกไม่ถูกต้อง' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, options);
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, options);
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateKey = await hash(`${forwarded}:${username}:${email || 'no-email'}`);
    const { data: allowed, error: rateError } = await admin.rpc('registration_attempt', { p_key: rateKey });
    if (rateError) return reply({ error: 'ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง' }, 503);
    if (!allowed) return reply({ error: 'สมัครสมาชิกบ่อยเกินไป กรุณารอ 15 นาที' }, 429);

    const { data: conflict, error: conflictError } = await admin.rpc('registration_conflict', {
      p_username: username,
      p_email: email,
    });
    if (conflictError) return reply({ error: 'ระบบยังไม่พร้อม กรุณาลองใหม่ภายหลัง' }, 503);
    if (conflict) return reply({ error: 'Username หรือ Email นี้ถูกใช้แล้ว' }, 409);

    const metadata = { username, name_account: nameAccount, no_email: email === null };
    if (email) {
      const { data, error } = await auth.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error || !data.user || data.user.identities?.length === 0) {
        return reply({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่' }, 400);
      }
      return reply({ verificationRequired: true, email });
    }

    const id = crypto.randomUUID();
    const internalEmail = `${id}@accounts.joykin.invalid`;
    const { error: createError } = await admin.auth.admin.createUser({
      id,
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (createError) return reply({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่' }, 400);

    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email: internalEmail,
      password,
    });
    if (signInError || !data.session) {
      await admin.auth.admin.deleteUser(id);
      return reply({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่' }, 500);
    }
    return reply({ session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    } });
  } catch {
    return reply({ error: 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่' }, 400);
  }
});

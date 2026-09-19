import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { supabase } from '../supabase';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const generation = useRef(0);
  const loadSession = async (session) => {
    const version = ++generation.current;
    if (!session) { setUser(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('users')
        .select('id, name_account, username, is_guest, profile_image_url')
        .eq('id', session.user.id).single();
      if (error) throw error;
      if (version === generation.current) { setUser(data); setAuthError(''); }
    } catch {
      if (version === generation.current) { setUser(null); setAuthError('โหลดบัญชีไม่สำเร็จ กรุณาลองเข้าสู่ระบบอีกครั้ง'); }
    } finally { if (version === generation.current) setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    const acceptAuthLink = async (url) => {
      if (!url || Platform.OS === 'web') return;
      try {
        const [base, fragment = ''] = url.split('#');
        const query = base.includes('?') ? base.slice(base.indexOf('?') + 1) : '';
        const hash = new URLSearchParams(fragment);
        const params = new URLSearchParams(query);
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        } else if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.get('code'));
          if (error) throw error;
        }
      } catch {
        if (active) setAuthError('ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาขอลิงก์ใหม่');
      }
    };
    // Never await another Supabase call while the auth event holds its lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      setTimeout(() => { if (active) void loadSession(session); }, 0);
    });
    const refresh = (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    const linkListener = Linking.addEventListener('url', ({ url }) => void acceptAuthLink(url));
    Linking.getInitialURL().then(url => void acceptAuthLink(url));
    return () => { active = false; generation.current++; subscription.unsubscribe(); listener.remove(); linkListener.remove(); supabase.auth.stopAutoRefresh(); };
  }, []);

  const login = async (identifier, password) => {
    const redirectUrl = Linking.createURL('auth/callback');
    const { data, error } = await supabase.functions.invoke('account-login', {
      body: { identifier, password, redirectUrl },
    });
    if (data?.verificationRequired) return data;
    if (error || !data?.session) {
      let message = data?.error;
      if (!message && error?.context?.json) {
        try { message = (await error.context.json()).error; } catch { /* generic below */ }
      }
      throw new Error(message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือไม่สามารถเชื่อมต่อได้');
    }
    const { error: sessionError } = await supabase.auth.setSession(data.session);
    if (sessionError) throw sessionError;
    return data;
  };
  const loginGuest = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error('เข้าใช้งาน Guest ไม่สำเร็จ กรุณาลองอีกครั้ง');
  };
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง');
    generation.current++; setUser(null);
  };
  return <AuthContext.Provider value={{ user, loading, authError, login, loginGuest, logout,
    updateUser: updates => setUser(previous => previous ? { ...previous, ...updates } : previous),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

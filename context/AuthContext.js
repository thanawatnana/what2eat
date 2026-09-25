import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '../supabase';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const generation = useRef(0);
  const loadSession = async (session, retries = 2) => {
    const version = ++generation.current;
    if (!session) { setUser(null); setLoading(false); return; }
    setLoading(true);
    try {
      const [profileResult, adminResult] = await Promise.all([
        supabase.from('users')
          .select('id, name_account, username, is_guest, profile_image_url')
          .eq('id', session.user.id).single(),
        supabase.from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id).maybeSingle(),
      ]);
      const error = profileResult.error || adminResult.error;
      if (error && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 250));
        if (version === generation.current) return loadSession(session, retries - 1);
      }
      if (error) throw error;
      if (version === generation.current) {
        setUser({ ...profileResult.data, is_admin: Boolean(adminResult.data) });
        setAuthError('');
      }
    } catch {
      if (version === generation.current) { setUser(null); setAuthError('โหลดบัญชีไม่สำเร็จ กรุณาลองเข้าสู่ระบบอีกครั้ง'); }
    } finally { if (version === generation.current) setLoading(false); }
  };
  const invokeAuthFunction = async (name, body) => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error || data?.error) {
      let message = data?.error;
      if (!message && error?.context?.json) {
        try { message = (await error.context.json()).error; } catch { /* use fallback */ }
      }
      throw new Error(message || 'ไม่สามารถเชื่อมต่อระบบบัญชีได้ กรุณาลองใหม่');
    }
    return data;
  };
  useEffect(() => {
    let active = true;
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
    return () => { active = false; generation.current++; subscription.unsubscribe(); listener.remove(); supabase.auth.stopAutoRefresh(); };
  }, []);

  const login = async (identifier, password) => {
    const data = await invokeAuthFunction('account-login', { identifier, password });
    if (data?.verificationRequired) return data;
    if (!data?.session) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    const { error: sessionError } = await supabase.auth.setSession(data.session);
    if (sessionError) throw sessionError;
    return data;
  };
  const register = async ({ nameAccount, username, email, password }) => {
    const data = await invokeAuthFunction('account-register', { nameAccount, username, email, password });
    if (data?.verificationRequired) return data;
    if (!data?.session) throw new Error('สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่');
    const { error } = await supabase.auth.setSession(data.session);
    if (error) throw error;
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
  return <AuthContext.Provider value={{ user, loading, authError, login, register, loginGuest, logout,
    updateUser: updates => setUser(previous => previous ? { ...previous, ...updates } : previous),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verify = async () => {
    if (loading) return;
    const token = pin.trim();
    if (!/^\d{6,8}$/.test(token)) {
      setError('กรุณากรอกรหัส PIN จากอีเมลให้ครบ');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      setMessage('ยืนยันอีเมลสำเร็จ กำลังเข้าสู่หน้าหลัก');
    } catch {
      setError('รหัส PIN ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบแล้วลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending) return;
    setResending(true);
    setError('');
    setMessage('');
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      if (resendError) throw resendError;
      setMessage('ส่งรหัส PIN ใหม่แล้ว กรุณาตรวจสอบอีเมล');
    } catch {
      setError('ยังไม่สามารถส่งรหัสใหม่ได้ กรุณารอสักครู่แล้วลองอีกครั้ง');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.brand}>Joykin</Text>
          <Text style={styles.title}>ยืนยันอีเมล</Text>
          <Text style={styles.description}>กรอกรหัส PIN ที่ส่งไปยัง</Text>
          <Text style={styles.email}>{email}</Text>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, '').slice(0, 8));
              setError('');
            }}
            placeholder="กรอกรหัส PIN"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={8}
            editable={!loading}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <TouchableOpacity style={[styles.primaryButton, loading && styles.disabled]} onPress={verify} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>ยืนยันรหัส PIN</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={resend} disabled={resending || loading}>
            {resending ? <ActivityIndicator color={COLORS.secondary} /> : <Text style={styles.secondaryText}>ส่งรหัสใหม่</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.replace('Login')} disabled={loading}>
            <Text style={styles.backText}>กลับไปหน้าเข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  brand: { color: COLORS.secondary, fontSize: 36, fontWeight: '900', textAlign: 'center' },
  title: { color: COLORS.textDark, fontSize: 24, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  description: { color: COLORS.textDark, fontSize: 14, textAlign: 'center', marginTop: 12, opacity: 0.7 },
  email: { color: COLORS.secondary, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  pinInput: {
    marginTop: 24, borderWidth: 1.5, borderColor: '#ddd', borderRadius: 14,
    backgroundColor: '#FAFAFA', color: COLORS.textDark, fontSize: 26,
    fontWeight: '700', letterSpacing: 8, textAlign: 'center', paddingVertical: 14,
  },
  error: { color: '#C0392B', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19 },
  message: { color: '#26734D', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 19 },
  primaryButton: { marginTop: 22, backgroundColor: COLORS.secondary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 12, borderWidth: 1.5, borderColor: COLORS.secondary, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: COLORS.secondary, fontSize: 15, fontWeight: '700' },
  backText: { color: COLORS.primary, fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  disabled: { opacity: 0.6 },
});

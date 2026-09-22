import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AuthLayout from '../components/AuthLayout';
import { COLORS, RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, loginGuest, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '', general: '' });

  const setFieldError = (field, message) => {
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const clearErrors = () => setErrors({ username: '', password: '', general: '' });

  const handleLogin = async () => {
    clearErrors();
    if (loading) return;

    const nextErrors = {
      username: username.trim() ? '' : 'กรุณากรอก Username',
      password: password ? '' : 'กรุณากรอก Password',
      general: '',
    };
    if (nextErrors.username || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result?.verificationRequired) {
        navigation.replace('VerifyEmail', { email: result.email });
      }
    } catch (error) {
      setFieldError('general', error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    clearErrors();
    if (loading) return;
    setLoading(true);
    try {
      await loginGuest();
    } catch (error) {
      setFieldError('general', error.message || 'เข้าใช้งานแบบ Guest ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="ยินดีต้อนรับกลับ"
      subtitle="เข้าสู่ระบบเพื่อค้นหาและสุ่มเมนูที่ใช่สำหรับคุณ"
      footer={(
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>ยังไม่มีบัญชี?</Text>
          <TouchableOpacity onPress={() => navigation.replace('Register')} accessibilityRole="button">
            <Text style={styles.link}>สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={[styles.input, errors.username ? styles.inputError : null]}
        placeholder="กรอก Username"
        placeholderTextColor={COLORS.textLight}
        value={username}
        editable={!loading}
        onChangeText={(value) => {
          setUsername(value);
          setFieldError('username', '');
        }}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

      <Text style={styles.label}>Password</Text>
      <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
        <TextInput
          style={styles.inputInner}
          placeholder="กรอก Password"
          placeholderTextColor={COLORS.textLight}
          value={password}
          editable={!loading}
          onChangeText={(value) => {
            setPassword(value);
            setFieldError('password', '');
          }}
          secureTextEntry={!isPasswordVisible}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity
          onPress={() => setIsPasswordVisible((current) => !current)}
          style={styles.visibilityButton}
          accessibilityRole="button"
        >
          <Text style={styles.visibilityText}>{isPasswordVisible ? 'ซ่อน' : 'แสดง'}</Text>
        </TouchableOpacity>
      </View>
      {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

      {authError || errors.general ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{errors.general || authError}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={handleLogin}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.primaryText}>เข้าสู่ระบบ</Text>}
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>หรือ</Text>
        <View style={styles.dividerLine} />
      </View>

      <TouchableOpacity
        style={[styles.guestButton, loading && styles.disabled]}
        onPress={handleGuest}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.guestText}>ใช้งานแบบ Guest</Text>
      </TouchableOpacity>
      <Text style={styles.guestHint}>ทดลองใช้งานได้ทันทีโดยไม่ต้องสร้างบัญชี</Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  label: { color: COLORS.textDark, fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 12 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.medium,
    paddingHorizontal: 15,
    fontSize: 15,
    color: COLORS.textDark,
    backgroundColor: COLORS.surfaceMuted,
  },
  inputRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.surfaceMuted,
  },
  inputInner: { flex: 1, height: 52, paddingHorizontal: 15, fontSize: 15, color: COLORS.textDark },
  visibilityButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14 },
  visibilityText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800' },
  inputError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
  errorText: { color: COLORS.danger, fontSize: 12, lineHeight: 18, marginTop: 5 },
  errorBox: { marginTop: 16, padding: 12, borderRadius: RADIUS.small, backgroundColor: COLORS.dangerSoft },
  errorBoxText: { color: COLORS.danger, fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  primaryButton: {
    minHeight: 52,
    marginTop: 22,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 17 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, color: COLORS.textLight, fontSize: 12, fontWeight: '600' },
  guestButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primarySoft,
  },
  guestText: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '800' },
  guestHint: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  link: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '800', marginLeft: 6 },
});

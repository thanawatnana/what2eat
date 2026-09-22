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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [nameAccount, setNameAccount] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({
    nameAccount: '',
    username: '',
    email: '',
    password: '',
    general: '',
  });

  const setFieldError = (field, message) => {
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const validate = () => {
    const next = { nameAccount: '', username: '', email: '', password: '', general: '' };
    if (!nameAccount.trim()) next.nameAccount = 'กรุณากรอกชื่อที่แสดง';
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
      next.username = 'ใช้ a-z, 0-9, _, . หรือ - จำนวน 3–30 ตัว';
    }
    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      next.email = 'รูปแบบ Email ไม่ถูกต้อง เช่น example@email.com';
    }
    const passwordBytes = encodeURIComponent(password).replace(/%[A-F0-9]{2}/g, 'x').length;
    if (password.length < 12 || passwordBytes > 72) {
      next.password = 'Password ต้องมีอย่างน้อย 12 ตัวอักษร และไม่เกิน 72 bytes';
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleRegister = async () => {
    if (loading || !validate()) return;
    setLoading(true);
    try {
      const result = await register({
        nameAccount: nameAccount.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
      if (result?.verificationRequired) {
        navigation.replace('VerifyEmail', { email: result.email });
      }
    } catch (error) {
      setFieldError('general', error.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="สร้างบัญชีใหม่"
      subtitle="บันทึกเมนูโปรดและใช้งาน Joykin ได้ครบทุกฟังก์ชัน"
      onBack={() => navigation.replace('Login')}
      scroll
      footer={(
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>มีบัญชีอยู่แล้ว?</Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')} accessibilityRole="button">
            <Text style={styles.link}>เข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      <Text style={styles.label}>ชื่อที่แสดง</Text>
      <TextInput
        style={[styles.input, errors.nameAccount ? styles.inputError : null]}
        placeholder="เช่น สมชาย ใจดี"
        placeholderTextColor={COLORS.textLight}
        value={nameAccount}
        editable={!loading}
        onChangeText={(value) => {
          setNameAccount(value);
          setFieldError('nameAccount', '');
        }}
        autoCapitalize="words"
      />
      {errors.nameAccount ? <Text style={styles.errorText}>{errors.nameAccount}</Text> : null}

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={[styles.input, errors.username ? styles.inputError : null]}
        placeholder="เช่น somchai99"
        placeholderTextColor={COLORS.textLight}
        value={username}
        editable={!loading}
        onChangeText={(value) => {
          setUsername(value);
          setFieldError('username', '');
        }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

      <View style={styles.labelRow}>
        <Text style={[styles.label, styles.labelRowLabel]}>Email (ไม่บังคับ)</Text>
        <View style={styles.optionalBadge}>
          <Text style={styles.optionalText}>เว้นว่างได้</Text>
        </View>
      </View>
      <TextInput
        style={[styles.input, errors.email ? styles.inputError : null]}
        placeholder="example@email.com"
        placeholderTextColor={COLORS.textLight}
        value={email}
        editable={!loading}
        onChangeText={(value) => {
          setEmail(value);
          setFieldError('email', '');
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
      <Text style={styles.helperText}>
        หากกรอกอีเมล ระบบจะส่ง PIN 6 หลักให้ยืนยันก่อนสร้างบัญชีสำเร็จ
      </Text>

      <Text style={styles.label}>Password</Text>
      <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
        <TextInput
          style={styles.inputInner}
          placeholder="อย่างน้อย 12 ตัวอักษร"
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
          onSubmitEditing={handleRegister}
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

      {errors.general ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{errors.general}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabled]}
        onPress={handleRegister}
        disabled={loading}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.primaryText}>สมัครสมาชิก</Text>}
      </TouchableOpacity>

      <Text style={styles.termsText}>
        การสมัครสมาชิกถือว่าคุณยอมรับการดูแลข้อมูลตามนโยบายของ Joykin
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 7 },
  label: { color: COLORS.textDark, fontSize: 13, fontWeight: '800', marginBottom: 7, marginTop: 16 },
  labelRowLabel: { marginTop: 0, marginBottom: 0 },
  optionalBadge: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill, backgroundColor: COLORS.accentSoft },
  optionalText: { color: COLORS.accent, fontSize: 10, fontWeight: '800' },
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
  helperText: { color: COLORS.textMuted, fontSize: 11, lineHeight: 17, marginTop: 7 },
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
  termsText: { color: COLORS.textLight, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  link: { color: COLORS.primaryDark, fontSize: 14, fontWeight: '800', marginLeft: 6 },
});

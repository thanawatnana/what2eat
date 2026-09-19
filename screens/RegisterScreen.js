import { useState } from 'react';
import * as Linking from 'expo-linking';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView,
    StyleSheet, Text,
    TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';


// ─── Email Regex (requires real TLD, e.g. .com .net .th) ─────────────────────
// Fix 1: รับเฉพาะ @gmail.com เท่านั้น (ป้องกัน @gmai.com, @gmail.ckm ฯลฯ)
const EMAIL_REGEX = /^[^\s@]+@gmail\.com$/i;


// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function RegisterScreen({ navigation }) {
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [nameAccount, setNameAccount] = useState('');
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [username, setUsername] = useState('');
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [email, setEmail] = useState('');
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [password, setPassword] = useState('');
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [loading, setLoading] = useState(false);
    const [verification, setVerification] = useState(false);
    const [otp, setOtp] = useState('');

    // Task 1: Toggle password visibility
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    // ─── Per-field error states ──────────────────────────────────────────────
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [errors, setErrors] = useState({
        nameAccount: '',
        username: '',
        email: '',
        password: '',
        general: '',
    });

    const setFieldError = (field, msg) =>
        setErrors(prev => ({ ...prev, [field]: msg }));

    const clearErrors = () =>
        setErrors({ nameAccount: '', username: '', email: '', password: '', general: '' });

    // ─── Client-side Validation ──────────────────────────────────────────────
    const validate = () => {
        let valid = true;
        const next = { nameAccount: '', username: '', email: '', password: '', general: '' };

        if (!nameAccount.trim()) {
            next.nameAccount = 'กรุณากรอกชื่อที่แสดง (Display Name)';
            valid = false;
        }
        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username.trim())) {
            next.username = 'Username ต้องเป็น a-z, 0-9, _, . หรือ - จำนวน 3–30 ตัว';
            valid = false;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
            next.email = 'รูปแบบ Email ไม่ถูกต้อง เช่น example@gmail.com';
            valid = false;
        }
        const passwordBytes = encodeURIComponent(password).replace(/%[A-F0-9]{2}/g, 'x').length;
        if (password.length < 12 || passwordBytes > 72) {
            next.password = 'Password ต้องมีอย่างน้อย 12 ตัวอักษร และไม่เกิน 72 bytes';
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    // ─── Register Handler ────────────────────────────────────────────────────
    const handleRegister = async () => {
        clearErrors();
        if (loading || (!verification && !validate())) return;

        if (verification && !/^\d{6,8}$/.test(otp.trim())) {
            setFieldError('general', 'กรุณากรอกรหัสยืนยันจากอีเมลให้ครบ');
            return;
        }

        setLoading(true);
        try {
            if (verification) {
                const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: 'email' });
                if (error) throw new Error('รหัสยืนยันไม่ถูกต้องหรือหมดอายุ');
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: email.trim().toLowerCase(), password,
                    options: {
                        emailRedirectTo: Linking.createURL('auth/callback'),
                        data: { username: username.trim().toLowerCase(), name_account: nameAccount.trim() },
                    },
                });
                if (error) throw new Error('สมัครไม่สำเร็จ กรุณาตรวจข้อมูลหรือใช้ชื่อผู้ใช้อื่น');
                if (!data.session) {
                    setVerification(true);
                    Alert.alert('ยืนยันอีเมล', 'กรุณาเปิดลิงก์ยืนยันในอีเมล หากอีเมลแสดงรหัสก็สามารถกรอกด้านล่างได้');
                }
            }

        } catch (err) {
            setFieldError('general', `เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 🎨 ==========================================

    // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

    // 🎨 ==========================================

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* ปุ่มย้อนกลับ */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.replace('Login')}>
                        <Text style={styles.backBtnText}>← กลับ</Text>
                    </TouchableOpacity>

                    {/* Header */}
                    <Text style={styles.logo}>Joykin</Text>
                    <Text style={styles.title}>สมัครสมาชิก</Text>
                    <Text style={styles.subtitle}>สร้างบัญชีของคุณเพื่อเริ่มต้น</Text>

                    {/* Form */}
                    <View style={styles.card}>

                        {/* ── Display Name ── */}
                        <Text style={styles.label}>ชื่อที่แสดง (Display Name)</Text>
                        <TextInput
                            style={[styles.input, errors.nameAccount ? styles.inputError : null]}
                            placeholder="เช่น สมชาย ใจดี"
                            placeholderTextColor="#aaa"
                            value={nameAccount}
                            onChangeText={v => { setNameAccount(v); setFieldError('nameAccount', ''); }}
                            autoCapitalize="words"
                        />
                        {errors.nameAccount ? <Text style={styles.errorText}>⚠️ {errors.nameAccount}</Text> : null}

                        {/* ── Username ── */}
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={[styles.input, errors.username ? styles.inputError : null]}
                            placeholder="เช่น somchai99"
                            placeholderTextColor="#aaa"
                            value={username}
                            onChangeText={v => { setUsername(v); setFieldError('username', ''); }}
                            autoCapitalize="none"
                        />
                        {errors.username ? <Text style={styles.errorText}>⚠️ {errors.username}</Text> : null}

                        {/* ── Email ── */}
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, errors.email ? styles.inputError : null]}
                            placeholder="example@gmail.com"
                            placeholderTextColor="#aaa"
                            value={email}
                            onChangeText={v => { setEmail(v); setFieldError('email', ''); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email ? <Text style={styles.errorText}>⚠️ {errors.email}</Text> : null}

                        {/* ── Password (Task 1: toggle visibility) ── */}
                        <Text style={styles.label}>Password</Text>
                        <View style={[styles.inputRow, errors.password ? styles.inputError : null]}>
                            <TextInput
                                style={styles.inputInner}
                                placeholder="อย่างน้อย 12 ตัวอักษร"
                                placeholderTextColor="#aaa"
                                value={password}
                                onChangeText={v => { setPassword(v); setFieldError('password', ''); }}
                                secureTextEntry={!isPasswordVisible}
                                autoCapitalize="none"
                            />
                            <TouchableOpacity
                                onPress={() => setIsPasswordVisible(v => !v)}
                                style={styles.eyeBtn}
                            >
                                <Text style={styles.eyeIcon}>{isPasswordVisible ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>
                        {errors.password ? <Text style={styles.errorText}>⚠️ {errors.password}</Text> : null}

                        {/* ── General Error ── */}
                        {errors.general ? (
                            <View style={styles.generalErrorBox}>
                                <Text style={styles.generalErrorText}>❌ {errors.general}</Text>
                            </View>
                        ) : null}

                        {verification && <><Text style={styles.label}>เปิดลิงก์ในอีเมล หรือกรอกรหัสยืนยัน (ถ้ามี)</Text><TextInput style={styles.input} value={otp} onChangeText={setOtp} keyboardType="number-pad" autoComplete="one-time-code" /></>}
                        {/* ── Submit ── */}
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color={COLORS.white} />
                                : <Text style={styles.btnText}>สมัครสมาชิก</Text>
                            }
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>มีบัญชีอยู่แล้ว? </Text>
                        <TouchableOpacity onPress={() => navigation.replace('Login')}>
                            <Text style={styles.link}>เข้าสู่ระบบ</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40 },
    backBtn: { alignSelf: 'flex-start', marginTop: 10, marginBottom: 5, padding: 8 },
    backBtnText: { color: COLORS.secondary, fontSize: 15, fontWeight: '700' },
    logo: { fontSize: 38, fontWeight: '900', color: COLORS.secondary, marginTop: 20, letterSpacing: 1 },
    title: { fontSize: 26, fontWeight: '700', color: COLORS.textDark, marginTop: 8 },
    subtitle: { fontSize: 14, color: COLORS.textDark, opacity: 0.6, marginBottom: 24, marginTop: 4 },
    card: {
        width: '100%', backgroundColor: COLORS.white, borderRadius: 24,
        padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
    },
    label: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 6, marginTop: 14 },
    input: {
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
        color: COLORS.textDark, backgroundColor: '#FAFAFA',
    },
    // Task 1: Row สำหรับ input + eye icon (Fix 2: height คงที่ป้องกัน layout shift)
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
        backgroundColor: '#FAFAFA', paddingRight: 8, height: 50,
    },
    inputInner: {
        flex: 1, paddingHorizontal: 14, fontSize: 15,
        color: COLORS.textDark, height: 50,
    },
    eyeBtn: { padding: 6 },
    eyeIcon: { fontSize: 18 },
    inputError: { borderColor: '#E74C3C', backgroundColor: '#FFF5F5' },
    errorText: { color: '#E74C3C', fontSize: 12, marginTop: 5, marginLeft: 4, fontWeight: '500' },
    generalErrorBox: {
        marginTop: 16, backgroundColor: '#FFF0F0', borderRadius: 10,
        padding: 12, borderLeftWidth: 4, borderLeftColor: '#E74C3C',
    },
    generalErrorText: { color: '#C0392B', fontSize: 13, fontWeight: '500' },
    btn: {
        marginTop: 24, backgroundColor: COLORS.secondary,
        borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
    footer: { flexDirection: 'row', marginTop: 20 },
    footerText: { color: COLORS.textDark, fontSize: 14 },
    link: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});

import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    SafeAreaView, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { COLORS } from '../constants/theme';

// ─── Email Regex (requires real TLD, e.g. .com .net .th) ─────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export default function RegisterScreen({ navigation }) {
    const [nameAccount, setNameAccount] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // ─── Per-field error states ──────────────────────────────────────────────
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
        if (!username.trim()) {
            next.username = 'กรุณากรอก Username';
            valid = false;
        }
        if (!EMAIL_REGEX.test(email.trim())) {
            next.email = 'รูปแบบ Email ไม่ถูกต้อง เช่น example@gmail.com';
            valid = false;
        }
        if (password.length < 6) {
            next.password = 'Password ต้องมีอย่างน้อย 6 ตัวอักษร';
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    // ─── Register Handler ────────────────────────────────────────────────────
    const handleRegister = async () => {
        clearErrors();
        if (!validate()) return;

        setLoading(true);
        try {
            // 1. Check username uniqueness
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username.trim())
                .maybeSingle();

            if (existingUser) {
                setFieldError('username', 'Username นี้ถูกใช้งานแล้ว กรุณาเลือก Username อื่น');
                return;
            }

            // 2. Check email uniqueness
            const { data: existingEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', email.trim().toLowerCase())
                .maybeSingle();

            if (existingEmail) {
                setFieldError('email', 'Email นี้ถูกใช้งานแล้ว กรุณาใช้ Email อื่น');
                return;
            }

            // 3. Hash password (bcrypt, salt rounds = 10)
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            // 4. Insert new user
            const { error: insertError } = await supabase.from('users').insert({
                name_account: nameAccount.trim(),
                username: username.trim(),
                email: email.trim().toLowerCase(),
                password_hash: passwordHash,
                is_guest: false,
            });

            if (insertError) throw new Error(insertError.message);

            // 5. Success → navigate to Login immediately
            Alert.alert('สมัครสมาชิกสำเร็จ! 🎉', 'กรุณาเข้าสู่ระบบ');
            navigation.replace('Login');

        } catch (err) {
            setFieldError('general', `เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

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
                    <Text style={styles.logo}>What2Eat</Text>
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

                        {/* ── Password ── */}
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={[styles.input, errors.password ? styles.inputError : null]}
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            placeholderTextColor="#aaa"
                            value={password}
                            onChangeText={v => { setPassword(v); setFieldError('password', ''); }}
                            secureTextEntry
                        />
                        {errors.password ? <Text style={styles.errorText}>⚠️ {errors.password}</Text> : null}

                        {/* ── General Error ── */}
                        {errors.general ? (
                            <View style={styles.generalErrorBox}>
                                <Text style={styles.generalErrorText}>❌ {errors.general}</Text>
                            </View>
                        ) : null}

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

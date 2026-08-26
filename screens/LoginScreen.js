import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    SafeAreaView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import bcrypt from 'bcryptjs';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// ─── Guest user ID (predefined record in DB) ─────────────────────────────────
const GUEST_USER_ID = '00000000-0000-4000-8000-000000000000';

export default function LoginScreen({ navigation }) {
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // ─── Per-field & general error states ───────────────────────────────────
    const [errors, setErrors] = useState({ username: '', password: '', general: '' });

    const clearErrors = () => setErrors({ username: '', password: '', general: '' });
    const setFieldError = (field, msg) => setErrors(prev => ({ ...prev, [field]: msg }));

    // ─── Login Handler ───────────────────────────────────────────────────────
    const handleLogin = async () => {
        clearErrors();

        // Client-side: check empty fields
        let hasError = false;
        if (!username.trim()) {
            setFieldError('username', 'กรุณากรอก Username');
            hasError = true;
        }
        if (!password) {
            setFieldError('password', 'กรุณากรอก Password');
            hasError = true;
        }
        if (hasError) return;

        setLoading(true);
        try {
            // 1. Query user by username
            const { data: userData, error } = await supabase
                .from('users')
                .select('id, name_account, username, password_hash, is_guest')
                .eq('username', username.trim())
                .maybeSingle();

            if (error) throw new Error(error.message);

            // 2. User not found → show generic message (don't reveal which is wrong)
            if (!userData) {
                setFieldError('general', 'Username หรือ Password ไม่ถูกต้อง');
                return;
            }

            // 3. Deny guest accounts from logging in via this form
            if (userData.is_guest) {
                setFieldError('general', 'Username หรือ Password ไม่ถูกต้อง');
                return;
            }

            // 4. Verify password
            const isMatch = await bcrypt.compare(password, userData.password_hash);
            if (!isMatch) {
                setFieldError('general', 'Username หรือ Password ไม่ถูกต้อง');
                return;
            }

            // 5. Set global auth state (id, name_account, username ready for Profile feature)
            login({
                id: userData.id,
                name_account: userData.name_account,
                username: userData.username,
                is_guest: false,
            });

            // 6. Go to Home
            navigation.replace('Home');

        } catch (err) {
            setFieldError('general', `เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── Guest Handler ───────────────────────────────────────────────────────
    const handleGuest = async () => {
        clearErrors();
        setLoading(true);
        try {
            const { data: guestData, error } = await supabase
                .from('users')
                .select('id, name_account, username, is_guest')
                .eq('id', GUEST_USER_ID)
                .maybeSingle();

            if (error) throw new Error(error.message);
            if (!guestData) throw new Error('ไม่พบข้อมูล Guest ในระบบ กรุณาติดต่อผู้ดูแล');

            login({
                id: guestData.id,
                name_account: guestData.name_account ?? 'Guest',
                username: guestData.username ?? 'guest',
                is_guest: true,
            });

            navigation.replace('Home');

        } catch (err) {
            setFieldError('general', `เกิดข้อผิดพลาด: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ─── UI ─────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <Text style={styles.logo}>What2Eat</Text>
                    <Text style={styles.title}>เข้าสู่ระบบ</Text>
                    <Text style={styles.subtitle}>ยินดีต้อนรับกลับมา 👋</Text>

                    {/* Form Card */}
                    <View style={styles.card}>

                        {/* ── Username ── */}
                        <Text style={styles.label}>Username</Text>
                        <TextInput
                            style={[styles.input, errors.username ? styles.inputError : null]}
                            placeholder="กรอก Username"
                            placeholderTextColor="#aaa"
                            value={username}
                            onChangeText={v => { setUsername(v); setFieldError('username', ''); }}
                            autoCapitalize="none"
                        />
                        {errors.username ? <Text style={styles.errorText}>⚠️ {errors.username}</Text> : null}

                        {/* ── Password ── */}
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={[styles.input, errors.password ? styles.inputError : null]}
                            placeholder="กรอก Password"
                            placeholderTextColor="#aaa"
                            value={password}
                            onChangeText={v => { setPassword(v); setFieldError('password', ''); }}
                            secureTextEntry
                        />
                        {errors.password ? <Text style={styles.errorText}>⚠️ {errors.password}</Text> : null}

                        {/* ── General Error Banner ── */}
                        {errors.general ? (
                            <View style={styles.generalErrorBox}>
                                <Text style={styles.generalErrorText}>❌ {errors.general}</Text>
                            </View>
                        ) : null}

                        {/* ── Login Button ── */}
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color={COLORS.white} />
                                : <Text style={styles.btnText}>เข้าสู่ระบบ</Text>
                            }
                        </TouchableOpacity>

                        {/* ── Divider ── */}
                        <View style={styles.dividerRow}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>หรือ</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* ── Guest Button ── */}
                        <TouchableOpacity
                            style={[styles.guestBtn, loading && styles.btnDisabled]}
                            onPress={handleGuest}
                            disabled={loading}
                        >
                            <Text style={styles.guestBtnText}>👤 ดำเนินการในฐานะ Guest</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>ยังไม่มีบัญชี? </Text>
                        <TouchableOpacity onPress={() => navigation.replace('Register')}>
                            <Text style={styles.link}>สมัครสมาชิก</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.background },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    logo: { fontSize: 42, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1 },
    title: { fontSize: 28, fontWeight: '700', color: COLORS.textDark, marginTop: 6 },
    subtitle: { fontSize: 14, color: COLORS.textDark, opacity: 0.55, marginBottom: 28, marginTop: 4 },
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
    dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
    dividerText: { marginHorizontal: 12, color: '#aaa', fontSize: 13 },
    guestBtn: {
        borderWidth: 1.5, borderColor: COLORS.primary,
        borderRadius: 14, paddingVertical: 13, alignItems: 'center',
        backgroundColor: 'transparent',
    },
    guestBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
    footer: { flexDirection: 'row', marginTop: 20 },
    footerText: { color: COLORS.textDark, fontSize: 14 },
    link: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
});

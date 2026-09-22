import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AuthLayout from '../components/AuthLayout';
import { COLORS, RADIUS } from '../constants/theme';
import { supabase } from '../supabase';

const PIN_LENGTH = 6;
const RESEND_SECONDS = 30;

const formatTime = (seconds) => `00:${String(seconds).padStart(2, '0')}`;

export default function VerifyEmailScreen({ navigation, route }) {
  const email = route.params?.email || '';
  const inputRef = useRef(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (secondsRemaining <= 0) return undefined;
    const timer = setTimeout(
      () => setSecondsRemaining((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const updatePin = (value) => {
    setPin(value.replace(/\D/g, '').slice(0, PIN_LENGTH));
    setError('');
    setMessage('');
  };

  const verify = async () => {
    if (loading || pin.length !== PIN_LENGTH) return;
    if (!email) {
      setError('ไม่พบอีเมลสำหรับยืนยัน กรุณากลับไปเข้าสู่ระบบอีกครั้ง');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: pin,
        type: 'email',
      });
      if (verifyError) throw verifyError;
      setMessage('ยืนยันอีเมลสำเร็จ กำลังเข้าสู่หน้าหลัก');
    } catch {
      setError('รหัส PIN ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบแล้วลองอีกครั้ง');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resending || loading || secondsRemaining > 0) return;
    if (!email) {
      setError('ไม่พบอีเมลสำหรับส่งรหัส กรุณากลับไปเข้าสู่ระบบอีกครั้ง');
      return;
    }

    setResending(true);
    setError('');
    setMessage('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;
      setPin('');
      setSecondsRemaining(RESEND_SECONDS);
      setMessage('ส่งรหัส PIN ใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย');
      inputRef.current?.focus();
    } catch {
      setError('ยังไม่สามารถส่งรหัสใหม่ได้ กรุณารอสักครู่แล้วลองอีกครั้ง');
    } finally {
      setResending(false);
    }
  };

  const canVerify = pin.length === PIN_LENGTH && !loading;
  const canResend = secondsRemaining === 0 && !resending && !loading;

  return (
    <AuthLayout
      title="ยืนยันอีเมล"
      subtitle="กรอก PIN 6 หลักที่ส่งไปยังอีเมลของคุณ"
      onBack={() => navigation.replace('Login')}
      footer={(
        <Text style={styles.footerText}>
          ตรวจสอบโฟลเดอร์สแปมหากยังไม่พบอีเมล
        </Text>
      )}
    >
      <View style={styles.emailBox}>
        <Text style={styles.emailLabel}>ส่งรหัสไปที่</Text>
        <Text style={styles.email} numberOfLines={1}>{email || 'ไม่พบอีเมล'}</Text>
      </View>

      <Text style={styles.sectionLabel}>รหัส PIN</Text>
      <TouchableOpacity
        style={styles.pinRow}
        activeOpacity={0.9}
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel={`กรอกรหัส PIN ${PIN_LENGTH} หลัก`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pinCell,
              index === pin.length && pin.length < PIN_LENGTH ? styles.pinCellActive : null,
              pin[index] ? styles.pinCellFilled : null,
              error ? styles.pinCellError : null,
            ]}
          >
            <Text style={styles.pinDigit}>{pin[index] || ''}</Text>
          </View>
        ))}
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={pin}
        onChangeText={updatePin}
        keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={PIN_LENGTH}
        editable={!loading}
        autoFocus
        caretHidden
        accessibilityLabel="ช่องกรอกรหัส PIN"
      />

      {error ? (
        <View style={[styles.notice, styles.errorNotice]}>
          <Text style={[styles.noticeText, styles.errorText]}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={[styles.notice, styles.successNotice]}>
          <Text style={[styles.noticeText, styles.successText]}>{message}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, !canVerify && styles.disabledButton]}
        onPress={verify}
        disabled={!canVerify}
        accessibilityRole="button"
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.primaryText}>ยืนยันรหัส PIN</Text>}
      </TouchableOpacity>

      <View style={styles.resendArea}>
        <View style={styles.timerHeader}>
          <Text style={styles.timerLabel}>ยังไม่ได้รับรหัส?</Text>
          {secondsRemaining > 0 ? (
            <Text style={styles.timerValue}>{formatTime(secondsRemaining)}</Text>
          ) : null}
        </View>
        {secondsRemaining > 0 ? (
          <View
            style={styles.progressTrack}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: RESEND_SECONDS, now: secondsRemaining }}
          >
            <View
              style={[
                styles.progressFill,
                { width: `${(secondsRemaining / RESEND_SECONDS) * 100}%` },
              ]}
            />
          </View>
        ) : null}
        <TouchableOpacity
          style={[styles.resendButton, !canResend && styles.resendButtonDisabled]}
          onPress={resend}
          disabled={!canResend}
          accessibilityRole="button"
        >
          {resending
            ? <ActivityIndicator color={COLORS.secondary} />
            : (
              <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
                {secondsRemaining > 0
                  ? `ส่งรหัสใหม่ได้ใน ${formatTime(secondsRemaining)}`
                  : 'ส่งรหัส PIN ใหม่'}
              </Text>
            )}
        </TouchableOpacity>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  emailBox: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.medium,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  emailLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  email: { color: COLORS.secondary, fontSize: 15, fontWeight: '800', marginTop: 3 },
  sectionLabel: {
    color: COLORS.textDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 10,
  },
  pinRow: { flexDirection: 'row', justifyContent: 'space-between' },
  pinCell: {
    width: '14.5%',
    aspectRatio: 0.8,
    maxHeight: 60,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.medium,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCellActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  pinCellFilled: { borderColor: COLORS.secondary, backgroundColor: COLORS.white },
  pinCellError: { borderColor: COLORS.danger, backgroundColor: COLORS.dangerSoft },
  pinDigit: { color: COLORS.textDark, fontSize: 24, fontWeight: '900' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  notice: { borderRadius: RADIUS.small, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  errorNotice: { backgroundColor: COLORS.dangerSoft },
  successNotice: { backgroundColor: COLORS.successSoft },
  noticeText: { fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
  errorText: { color: COLORS.danger },
  successText: { color: COLORS.success },
  primaryButton: {
    minHeight: 52,
    marginTop: 20,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: { backgroundColor: COLORS.border },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  resendArea: { marginTop: 22 },
  timerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerLabel: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  timerValue: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  resendButton: {
    minHeight: 46,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: COLORS.secondary,
    borderRadius: RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButtonDisabled: { borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted },
  resendText: { color: COLORS.secondary, fontSize: 14, fontWeight: '800' },
  resendTextDisabled: { color: COLORS.textLight },
  footerText: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center' },
});

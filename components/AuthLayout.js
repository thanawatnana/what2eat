import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  onBack,
  scroll = false,
}) {
  const content = (
    <View style={[styles.content, !scroll && styles.contentCentered]}>
      {onBack ? (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="กลับหน้าก่อนหน้า"
        >
          <Text style={styles.backText}>{'< กลับ'}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.brandMark}>
        <View style={styles.brandDot} />
        <Text style={styles.brand}>Joykin</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.card}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.background, overflow: 'hidden' },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 28 },
  contentCentered: { justifyContent: 'center' },
  decorTop: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    right: -110, top: -100, backgroundColor: COLORS.primarySoft,
  },
  decorBottom: {
    position: 'absolute', width: 210, height: 210, borderRadius: 105,
    left: -110, bottom: -80, backgroundColor: COLORS.secondarySoft,
  },
  backButton: {
    alignSelf: 'flex-start', minHeight: 42, justifyContent: 'center',
    paddingHorizontal: 4, marginBottom: 10,
  },
  backText: { color: COLORS.secondary, fontSize: 14, fontWeight: '800' },
  brandMark: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  brandDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.primary, marginRight: 8 },
  brand: { color: COLORS.secondary, fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  title: { color: COLORS.textDark, fontSize: 28, lineHeight: 36, fontWeight: '900', textAlign: 'center', marginTop: 15 },
  subtitle: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 5, marginBottom: 22, paddingHorizontal: 14 },
  card: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.xlarge,
    borderWidth: 1, borderColor: COLORS.border, padding: 22, ...SHADOWS.card,
  },
  footer: { alignItems: 'center', marginTop: 20 },
});

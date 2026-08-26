import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 50 }}>👤</Text>
        </View>
        <Text style={styles.displayName}>{user?.name_account ?? 'Guest'}</Text>
        <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
        {user?.is_guest && (
          <View style={styles.guestBadge}>
            <Text style={styles.guestBadgeText}>Guest Mode</Text>
          </View>
        )}
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ชื่อที่แสดง</Text>
          <Text style={styles.infoValue}>{user?.name_account ?? '-'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>@{user?.username ?? '-'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 ออกจากระบบ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 25 },
  profileSection: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  imagePlaceholder: {
    width: 120, height: 120, backgroundColor: '#E9ECEF', borderRadius: 60,
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  displayName: { fontSize: 22, fontWeight: '900', color: COLORS.secondary },
  username: { fontSize: 14, color: '#888', marginTop: 4 },
  guestBadge: { marginTop: 10, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  guestBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  infoSection: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 25,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 3,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  logoutBtn: { backgroundColor: '#FFF0F0', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' },
});
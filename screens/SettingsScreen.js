import { useEffect, useState } from 'react';
import { Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const AVATAR_KEY = 'user_avatar_';

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [avatar, setAvatar] = useState(null);

  // โหลดรูปที่บันทึกไว้
  useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(AVATAR_KEY + user.id).then(uri => {
      if (uri) setAvatar(uri);
    });
  }, [user]);

  // เลือกรูปจาก Gallery
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพในการตั้งค่า');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      await AsyncStorage.setItem(AVATAR_KEY + user.id, uri);
    }
  };

  // ถ่ายรูปใหม่จากกล้อง
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงกล้อง');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatar(uri);
      await AsyncStorage.setItem(AVATAR_KEY + user.id, uri);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert('เปลี่ยนรูปโปรไฟล์', 'เลือกวิธีเพิ่มรูป', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: '📷 ถ่ายรูป', onPress: takePhoto },
      { text: '🖼️ เลือกจาก Gallery', onPress: pickImage },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: () => {
          logout();
          // Settings → Drawer → Stack (root)
          // ต้อง getParent() 2 ครั้งถึงจะถึง Stack ระดับบนสุด
          const stackNav = navigation.getParent()?.getParent();
          if (stackNav) {
            stackNav.reset({ index: 0, routes: [{ name: 'Login' }] });
          } else {
            // fallback กรณี navigation structure เปลี่ยน
            navigation.navigate('Login');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* รูปโปรไฟล์ */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8}>
            <View style={styles.avatarWrapper}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={{ fontSize: 52 }}>👤</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>📷</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.displayName}>{user?.name_account ?? 'Guest'}</Text>
          <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
          {user?.is_guest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest Mode</Text>
            </View>
          )}
        </View>

        {/* ข้อมูล account */}
        <View style={styles.infoCard}>
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

        {/* ปุ่ม logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 ออกจากระบบ</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  // Avatar
  avatarSection: { alignItems: 'center', marginTop: 16, marginBottom: 28 },
  avatarWrapper: { width: 120, height: 120, marginBottom: 14 },
  avatarImg: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: COLORS.primary },
  avatarPlaceholder: {
    width: 120, height: 120, backgroundColor: '#E9ECEF', borderRadius: 60,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3,
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  editBadgeText: { fontSize: 16 },
  displayName: { fontSize: 22, fontWeight: '900', color: COLORS.secondary },
  username: { fontSize: 14, color: '#888', marginTop: 4 },
  guestBadge: { marginTop: 10, backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  guestBadgeText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  // Info card
  infoCard: {
    width: '100%', backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 5, elevation: 3,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#666' },
  infoValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  // Logout
  logoutBtn: { width: '100%', backgroundColor: '#FFF0F0', padding: 16, borderRadius: 14, alignItems: 'center' },
  logoutBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' },
});


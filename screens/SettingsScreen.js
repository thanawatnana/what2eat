import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert, Image, SafeAreaView, ScrollView, StyleSheet, Text,
  TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const AVATAR_CACHE_KEY = 'avatar_url_';

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [avatar, setAvatar] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Task 5: Editable display name
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // โหลด URL รูปจาก Supabase Storage (หรือ cache)
  useEffect(() => {
    if (!user) return;

    // Bug 6 fix: Guest ไม่ควรมี avatar — ลบ cache เก่าออก + force null
    if (user.is_guest) {
      setAvatar(null);
      AsyncStorage.removeItem(AVATAR_CACHE_KEY + user.id).catch(() => {});
      return;
    }

    AsyncStorage.getItem(AVATAR_CACHE_KEY + user.id).then(cachedUrl => {
      if (cachedUrl) setAvatar(cachedUrl);
    });
    const path = `${user.id}/avatar.jpg`;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    if (data?.publicUrl) {
      // Bug 6 fix: ใช้ timestamp เพื่อ bust cache เสมอ
      const url = data.publicUrl + '?bust=' + Date.now();
      setAvatar(url);
    }
  }, [user]);

  // อัปโหลดรูปโปรไฟล์ไป Supabase Storage + อัปเดต profile_image_url ใน DB
  const uploadToSupabase = async (uri) => {
    setUploading(true);
    try {
      const path = `${user.id}/avatar.jpg`;
      // Fix 5: ใช้ arrayBuffer() แทน blob() — blob() มักสร้างไฟล์เปล่าบน React Native/Expo
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = data.publicUrl + '?bust=' + Date.now();
      setAvatar(url);
      await AsyncStorage.setItem(AVATAR_CACHE_KEY + user.id, url);

      // Task 5: อัปเดต profile_image_url ใน users table
      await supabase.from('users').update({ profile_image_url: url }).eq('id', user.id);

      Alert.alert('✅', 'อัปโหลดรูปสำเร็จ!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) await uploadToSupabase(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงกล้อง'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) await uploadToSupabase(result.assets[0].uri);
  };

  const handleChangePhoto = () => {
    Alert.alert('เปลี่ยนรูปโปรไฟล์', 'เลือกวิธีเพิ่มรูป', [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: '📷 ถ่ายรูป', onPress: takePhoto },
      { text: '🖼️ เลือกจาก Gallery', onPress: pickImage },
    ]);
  };

  // Task 5: เริ่มแก้ไขชื่อ
  const startEditName = () => {
    setEditName(user?.name_account ?? '');
    setIsEditingName(true);
  };

  // Task 5: ยกเลิกการแก้ไข → คืนค่าเดิม
  const cancelEditName = () => {
    setEditName('');
    setIsEditingName(false);
  };

  // Task 5: บันทึกชื่อใหม่ → update DB + AuthContext
  const saveEditName = async () => {
    if (!editName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อที่แสดง'); return; }
    if (editName.trim() === user?.name_account) { setIsEditingName(false); return; }

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ name_account: editName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      // อัปเดต global state โดยไม่ต้อง re-login
      updateUser({ name_account: editName.trim() });
      setIsEditingName(false);
      Alert.alert('✅', 'เปลี่ยนชื่อสำเร็จ!');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: () => {
          logout();
          const stackNav = navigation.getParent()?.getParent();
          if (stackNav) {
            stackNav.reset({ index: 0, routes: [{ name: 'Login' }] });
          } else {
            navigation.navigate('Login');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Task 1: Guest Warning Banner */}
        {user?.is_guest && (
          <View style={styles.guestWarningBanner}>
            <Text style={styles.guestWarningIcon}>⚠️</Text>
            <Text style={styles.guestWarningText}>บัญชี Guest ไม่สามารถแก้ไขข้อมูลโปรไฟล์ได้</Text>
          </View>
        )}

        {/* รูปโปรไฟล์ */}
        <View style={styles.avatarSection}>
          {/* Task 1: ปิด image picker สำหรับ Guest */}
          <TouchableOpacity onPress={handleChangePhoto} activeOpacity={0.8} disabled={uploading || user?.is_guest}>
            <View style={[styles.avatarWrapper, user?.is_guest && { opacity: 0.6 }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={{ fontSize: 52 }}>👤</Text>
                </View>
              )}
              {/* Task 1: ซ่อน camera badge สำหรับ Guest */}
              {!user?.is_guest && (
                <View style={styles.editBadge}>
                  {uploading
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={styles.editBadgeText}>📷</Text>
                  }
                </View>
              )}
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

          {/* Task 5: ชื่อที่แสดง — แก้ไขได้ */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ชื่อที่แสดง</Text>
            {isEditingName ? (
              <View style={styles.editNameRow}>
                <TextInput
                  style={styles.nameInput}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  maxLength={40}
                />
                {savingName ? (
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />
                ) : (
                  <>
                    <TouchableOpacity onPress={saveEditName} style={styles.iconBtn}>
                      <Text style={styles.saveIcon}>✅</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={cancelEditName} style={styles.iconBtn}>
                      <Text style={styles.cancelIcon}>❌</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.nameReadRow}>
                <Text style={styles.infoValue}>{user?.name_account ?? '-'}</Text>
                {!user?.is_guest && (
                  <TouchableOpacity onPress={startEditName} style={styles.iconBtn}>
                    <Text style={styles.pencilIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* Task 5: Username — Read-Only */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Username</Text>
            <View style={styles.nameReadRow}>
              <Text style={[styles.infoValue, styles.readOnlyValue]}>@{user?.username ?? '-'}</Text>
              <View style={styles.lockBadge}>
                <Text style={styles.lockText}>🔒</Text>
              </View>
            </View>
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
  // Task 5: Read-only styling
  readOnlyValue: { color: '#999' },
  divider: { height: 1, backgroundColor: '#F0F0F0' },
  // Task 5: Editable name row
  nameReadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', gap: 4 },
  nameInput: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, fontSize: 14,
    color: COLORS.textDark, minWidth: 100, maxWidth: 150, backgroundColor: '#FAFAFA',
  },
  iconBtn: { padding: 4 },
  pencilIcon: { fontSize: 16 },
  saveIcon: { fontSize: 18 },
  cancelIcon: { fontSize: 16 },
  lockBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  lockText: { fontSize: 14 },
  // Task 1: Guest Warning Banner
  guestWarningBanner: {
    width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3CD',
    borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFECB5', gap: 10,
  },
  guestWarningIcon: { fontSize: 20 },
  guestWarningText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#856404', lineHeight: 18 },
  // Logout
  logoutBtn: { width: '100%', backgroundColor: '#FFF0F0', padding: 16, borderRadius: 14, alignItems: 'center' },
  logoutBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' },
});
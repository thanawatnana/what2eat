import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function SettingsScreen() {
  const [displayName, setDisplayName] = useState('นักสุ่มสายกิน');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 50 }}>👤</Text>
        </View>
        <TouchableOpacity style={styles.editImageBtn}>
          <Text style={styles.editImageText}>📷 เปลี่ยนรูปภาพ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>ชื่อที่แสดงในแอป</Text>
        <TextInput 
          style={styles.input} 
          value={displayName} 
          onChangeText={setDisplayName} 
        />
      </View>

      <TouchableOpacity style={styles.saveBtn}>
        <Text style={styles.saveBtnText}>บันทึกการตั้งค่า</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn}>
        <Text style={styles.logoutBtnText}>🚪 ออกจากระบบ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 25 },
  profileSection: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
  imagePlaceholder: { width: 120, height: 120, backgroundColor: '#E9ECEF', borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  editImageBtn: { backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD' },
  editImageText: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  formSection: { marginBottom: 30 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 8 },
  input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  saveBtn: { backgroundColor: COLORS.secondary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#FFF0F0', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutBtnText: { color: '#E74C3C', fontSize: 16, fontWeight: 'bold' }
});
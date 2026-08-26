import { useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function PartyScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // TODO สำหรับคนทำหลังบ้าน: เปลี่ยนเป็น Supabase Realtime สร้างห้องในตาราง 'rooms'
  const handleCreateRoom = () => {
    if (!playerName.trim()) { alert('กรุณากรอกชื่อของคุณก่อนนะ!'); return; }
    setIsLoading(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setTimeout(() => {
      setIsLoading(false);
      alert(`สร้างห้องสำเร็จ! รหัสห้องของคุณคือ: ${newCode}`);
      // navigation.navigate('RoomWaiting', { code: newCode }); // อนาคตส่งไปหน้าห้องรอ
    }, 1000);
  };

  // TODO สำหรับคนทำหลังบ้าน: เช็คห้องจากตาราง 'rooms' ด้วย Supabase
  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) { alert('กรุณากรอกชื่อและรหัสห้องให้ครบถ้วน!'); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(`กำลังพาเข้าห้อง: ${roomCode}...`);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.partyCard}>
        <Text style={styles.partyEmoji}>🏕️</Text>
        <Text style={styles.partyTitle}>ปาร์ตี้สุ่มอาหาร</Text>
        <Text style={styles.partySubtitle}>รวมกลุ่มเพื่อน แล้วมาสุ่มเมนูกัน!</Text>

        <TextInput
          style={styles.input}
          placeholder="ชื่อของคุณ (เช่น สมชาย)"
          placeholderTextColor="#999"
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
        />

        <View style={styles.divider} />

        <TouchableOpacity style={[styles.partyButton, { backgroundColor: COLORS.secondary }]} onPress={handleCreateRoom} disabled={isLoading}>
          <Text style={styles.partyButtonText}>✨ สร้างห้องใหม่</Text>
        </TouchableOpacity>

        <Text style={styles.orText}>- หรือ -</Text>

        <View style={styles.joinContainer}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="รหัสห้อง 6 หลัก"
            placeholderTextColor="#999"
            value={roomCode}
            onChangeText={setRoomCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={[styles.partyButton, { backgroundColor: COLORS.primary, flex: 1, marginTop: 0 }]} onPress={handleJoinRoom} disabled={isLoading}>
            <Text style={styles.partyButtonText}>🚀 เข้าร่วม</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  partyCard: {
    backgroundColor: COLORS.white, width: '90%', padding: 30, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 6, marginTop: 50,
  },
  partyEmoji: { fontSize: 65, marginBottom: 15 },
  partyTitle: { fontSize: 28, fontWeight: '900', color: COLORS.secondary },
  partySubtitle: { fontSize: 16, color: 'gray', marginBottom: 30, marginTop: 5 },
  input: { width: '100%', backgroundColor: '#F8F9FA', padding: 18, borderRadius: 16, fontSize: 16, borderWidth: 1, borderColor: '#E9ECEF', color: COLORS.textDark },
  divider: { width: '100%', height: 1, backgroundColor: '#E9ECEF', marginVertical: 25 },
  partyButton: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  partyButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  orText: { marginVertical: 20, color: '#ADB5BD', fontSize: 14, fontWeight: 'bold' },
  joinContainer: { flexDirection: 'row', width: '100%', gap: 12 },
  codeInput: { flex: 1.2, textAlign: 'center', letterSpacing: 2, fontWeight: 'bold', fontSize: 18 },
});
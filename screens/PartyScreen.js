import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { COLORS } from '../constants/theme';
import { partyAction } from '../services/party';

//  ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function PartyScreen({ navigation }) {
  //  สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [playerName, setPlayerName] = useState('');
  //  สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [roomCode, setRoomCode] = useState('');
  //  สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [isLoading, setIsLoading] = useState(false);

  const pending = useRef(false);
  const enterRoom = async (action) => {
    if (pending.current) return;
    if (!playerName.trim() || (action === 'join' && !/^[0-9]{6}$/.test(roomCode.trim()))) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาใส่ชื่อ และรหัสห้อง 6 หลักสำหรับเข้าร่วม');
      return;
    }
    pending.current = true; setIsLoading(true);
    try {
      const data = await partyAction(action, { name: playerName.trim(), code: roomCode.trim() });
      navigation.navigate('Lobby', {
        roomId: data.room.id, roomCode: data.room.room_code,
        participantId: data.participantId, playerName: playerName.trim(),
      });
    } catch (err) { Alert.alert('เกิดข้อผิดพลาด', err.message); }
    finally { pending.current = false; setIsLoading(false); }
  };
  const handleCreateRoom = () => enterRoom('create');
  const handleJoinRoom = () => enterRoom('join');

  //  ==========================================

  //  ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

  //  ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.partyCard}>
          <Text style={styles.partyTitle}>Join the Party</Text>
          <Text style={styles.partySubtitle}>Swipe together, eat together!</Text>

          <TextInput
            style={styles.input}
            placeholder="Your Name (e.g. John)"
            placeholderTextColor="#999"
            value={playerName}
            onChangeText={setPlayerName}
            maxLength={15}
            editable={!isLoading}
          />

          <View style={styles.divider} />

          <TouchableOpacity
            style={[styles.partyButton, { backgroundColor: COLORS.secondary }, isLoading && styles.disabledBtn]}
            onPress={handleCreateRoom}
            disabled={isLoading}
          >
            <Text style={styles.partyButtonText}>Create Standard Room (Max 4)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.partyButton, { backgroundColor: '#FFD700', marginTop: 10 }]}
            onPress={() => {
              Alert.alert(
                ' Joykin Premium Required',
                'Big Party ยังไม่เปิดให้บริการและยังไม่มีการรับชำระเงิน กรุณาใช้ห้องมาตรฐานสูงสุด 4 คน',
                [{ text: 'ตกลง' }]
              );
            }}
            disabled={isLoading}
          >
            <Text style={[styles.partyButtonText, { color: '#8B6508' }]}>Create Big Party (Max 20)</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>- OR -</Text>

          <View style={styles.joinContainer}>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="6-Digit Code"
              placeholderTextColor="#999"
              value={roomCode}
              onChangeText={setRoomCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.partyButton, { backgroundColor: COLORS.primary, flex: 1, marginTop: 0 }, isLoading && styles.disabledBtn]}
              onPress={handleJoinRoom}
              disabled={isLoading}
            >
              <Text style={styles.partyButtonText}>Join</Text>
            </TouchableOpacity>
          </View>

          {isLoading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  partyCard: {
    backgroundColor: COLORS.white, marginHorizontal: 20, padding: 30, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  partyTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.secondary },
  partySubtitle: { fontSize: 14, color: 'gray', marginBottom: 25 },
  input: {
    width: '100%', backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12,
    fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: COLORS.textDark,
  },
  divider: { width: '100%', height: 1, backgroundColor: '#E0E0E0', marginVertical: 25 },
  partyButton: { width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  partyButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  orText: { marginVertical: 15, color: 'gray', fontSize: 12, fontWeight: 'bold' },
  joinContainer: { flexDirection: 'row', width: '100%', gap: 10 },
  codeInput: { flex: 1, textAlign: 'center', letterSpacing: 2, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.6 },
});

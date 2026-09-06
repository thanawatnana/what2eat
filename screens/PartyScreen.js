import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';

// ฟังก์ชันสร้าง room_code 6 หลัก
const generateRoomCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function PartyScreen({ navigation }) {
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [playerName, setPlayerName] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [roomCode, setRoomCode] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [isLoading, setIsLoading] = useState(false);

  // ── สร้างห้องใหม่ ──────────────────────────────────────────────
  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('⚠️ ใส่ชื่อก่อน', 'กรุณาพิมพ์ชื่อของคุณก่อนสร้างห้อง');
      return;
    }
    setIsLoading(true);

    try {
      const newCode = generateRoomCode();

      // 1. สร้าง room
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({ room_code: newCode, status: 'waiting' })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. เพิ่มตัวเองเป็น participant
      const { data: participant, error: partError } = await supabase
        .from('participants')
        .insert({ room_id: room.id, name: playerName.trim() })
        .select()
        .single();

      if (partError) throw partError;

      // 3. ไปหน้า Lobby พร้อมส่ง context
      // 🧭 คำสั่งเปลี่ยนหน้าจอ
      navigation.navigate('Lobby', {
        roomId: room.id,
        roomCode: newCode,
        participantId: participant.id,
        playerName: playerName.trim(),
        isHost: true,
      });
    } catch (err) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('❌ เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── เข้าร่วมห้อง ───────────────────────────────────────────────
  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('⚠️ ข้อมูลไม่ครบ', 'กรุณาใส่ทั้งชื่อและรหัสห้อง');
      return;
    }
    if (roomCode.length !== 6) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('⚠️ รหัสผิด', 'รหัสห้องต้องเป็น 6 หลักเท่านั้น');
      return;
    }
    setIsLoading(true);

    try {
      // 1. ค้นหาห้องจาก room_code
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode.trim())
        .eq('status', 'waiting')
        .single();

      if (roomError || !room) {
        // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
        Alert.alert('❌ ไม่พบห้อง', 'รหัสห้องไม่ถูกต้องหรือห้องเริ่มเล่นไปแล้ว');
        setIsLoading(false);
        return;
      }

      // 2. เพิ่มตัวเองเป็น participant
      const { data: participant, error: partError } = await supabase
        .from('participants')
        .insert({ room_id: room.id, name: playerName.trim() })
        .select()
        .single();

      if (partError) throw partError;

      // 3. ไปหน้า Lobby
      // 🧭 คำสั่งเปลี่ยนหน้าจอ
      navigation.navigate('Lobby', {
        roomId: room.id,
        roomCode: room.room_code,
        participantId: participant.id,
        playerName: playerName.trim(),
        isHost: false,
      });
    } catch (err) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('❌ เกิดข้อผิดพลาด', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 ==========================================

  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

  // 🎨 ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.partyCard}>
          <Text style={styles.partyEmoji}>🏕️</Text>
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
            <Text style={styles.partyButtonText}>✨ Create New Room</Text>
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
              <Text style={styles.partyButtonText}>🚀 Join</Text>
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
  partyEmoji: { fontSize: 60, marginBottom: 10 },
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
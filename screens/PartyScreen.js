import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

export default function PartyScreen({ navigation }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateRoom = () => {
    if (!playerName.trim()) { alert('Please enter your name first!'); return; }
    setIsLoading(true);
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setTimeout(() => {
      setIsLoading(false);
      alert(`Room Created! Code: ${newCode}`);
    }, 1000);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) { alert('Please enter both name and room code!'); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      alert(`Joining Room: ${roomCode}...`);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
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
        />

        <View style={styles.divider} />

        <TouchableOpacity style={[styles.partyButton, { backgroundColor: COLORS.secondary }]} onPress={handleCreateRoom} disabled={isLoading}>
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
          />
          <TouchableOpacity style={[styles.partyButton, { backgroundColor: COLORS.primary, flex: 1, marginTop: 0 }]} onPress={handleJoinRoom} disabled={isLoading}>
            <Text style={styles.partyButtonText}>🚀 Join</Text>
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
    backgroundColor: COLORS.white, width: '85%', padding: 30, borderRadius: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, marginTop: 40,
  },
  partyEmoji: { fontSize: 60, marginBottom: 10 },
  partyTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.secondary },
  partySubtitle: { fontSize: 14, color: 'gray', marginBottom: 25 },
  input: { width: '100%', backgroundColor: '#F5F5F5', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: COLORS.textDark },
  divider: { width: '100%', height: 1, backgroundColor: '#E0E0E0', marginVertical: 25 },
  partyButton: { width: '100%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  partyButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  orText: { marginVertical: 15, color: 'gray', fontSize: 12, fontWeight: 'bold' },
  joinContainer: { flexDirection: 'row', width: '100%', gap: 10 },
  codeInput: { flex: 1, textAlign: 'center', letterSpacing: 2, fontWeight: 'bold' },
});
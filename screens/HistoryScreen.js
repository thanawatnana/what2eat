import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function HistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setHistoryList(data || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation, loadHistory]);

  const clearHistory = async () => {
    Alert.alert('ล้างประวัติ', 'ต้องการล้างประวัติทั้งหมดหรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ล้าง', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('history').delete().eq('user_id', user.id);
          if (!error) setHistoryList([]);
          else Alert.alert('Error', error.message);
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.created_at);
    const dateStr = dateObj.toLocaleDateString('th-TH');
    const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={styles.historyCard}>
        <Text style={styles.cardEmoji}>{item.food_emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.resultName}>{item.food_name}</Text>
          <Text style={styles.funcName}>Mode: {item.mode}</Text>
          <Text style={styles.timeText}>{dateStr} - {timeStr}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      {historyList.length > 0 ? (
        <>
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>🗑️ ล้างประวัติทั้งหมด</Text>
          </TouchableOpacity>
          <FlatList
            data={historyList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>ยังไม่มีประวัติการสุ่ม</Text>
          <Text style={styles.emptySubText}>ลองสุ่มเมนูแล้วมาดูกันนะ!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  historyCard: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  cardEmoji: { fontSize: 40, marginRight: 15 },
  cardInfo: { flex: 1 },
  resultName: { fontSize: 17, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  funcName: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  timeText: { fontSize: 12, color: 'gray', marginTop: 3 },
  clearButton: {
    alignSelf: 'flex-end', marginRight: 20, marginTop: 15, marginBottom: 5,
    paddingVertical: 8, paddingHorizontal: 15,
    backgroundColor: 'rgba(231, 76, 60, 0.1)', borderRadius: 20,
  },
  clearButtonText: { color: '#E74C3C', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 14, color: 'gray', marginTop: 5 },
});

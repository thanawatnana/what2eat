import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function HistoryScreen({ navigation }) {
  const [historyList, setHistoryList] = useState([]);

  // TODO: สำหรับเพื่อน Backend -> await supabase.from('history').select('*').order('created_at', { ascending: false })
  const loadHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem('history');
      if (storedHistory) {
        setHistoryList(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });
    return unsubscribe;
  }, [navigation]);

  // TODO: สำหรับเพื่อน Backend -> await supabase.from('history').delete().eq('user_id', user.id)
  const clearHistory = async () => {
    await AsyncStorage.removeItem('history');
    setHistoryList([]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.timestamp);
    const dateStr = dateObj.toLocaleDateString('th-TH'); // ใช้เวลาไทย
    const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.historyCard}>
        <Text style={styles.cardEmoji}>{item.emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.resultName}>{item.result}</Text>
          <Text style={styles.funcName}>โหมด: {item.functionName}</Text>
          <Text style={styles.timeText}>📅 {dateStr} - ⏰ {timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {historyList.length > 0 ? (
        <>
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>🗑️ ล้างประวัติ</Text>
          </TouchableOpacity>
          <FlatList
            data={historyList}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyText}>ยังไม่มีประวัติการสุ่มเลย</Text>
          <Text style={styles.emptySubText}>ลองไปสุ่มเมนูแรกของคุณดูสิ!</Text>
        </View>
      )}
    </View>
  );
}

// ... styles ด้านล่างเหมือนของเดิม แต่ปรับ padding/radius นิดหน่อยเพื่อให้เข้ากับหน้าอื่น
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { padding: 20, paddingTop: 10 },
  historyCard: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3,
  },
  cardEmoji: { fontSize: 45, marginRight: 18 },
  cardInfo: { flex: 1 },
  resultName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  funcName: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold', marginBottom: 4 },
  timeText: { fontSize: 12, color: '#888' },
  clearButton: { alignSelf: 'flex-end', marginRight: 20, marginTop: 15, marginBottom: 5, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#FFF0F0', borderRadius: 20 },
  clearButtonText: { color: '#E74C3C', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 70, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 16, color: 'gray', marginTop: 8 }
});
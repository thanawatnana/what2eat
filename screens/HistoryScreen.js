import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export default function HistoryScreen({ navigation }) {
  const [historyList, setHistoryList] = useState([]);

  // ฟังก์ชันโหลดข้อมูลประวัติ
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

  // ใช้ useEffect ร่วมกับ listener ของ navigation เพื่อให้มันโหลดข้อมูลใหม่ทุกครั้งที่เปิดหน้านี้
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory();
    });
    return unsubscribe;
  }, [navigation]);

  // ฟังก์ชันเคลียร์ประวัติ
  const clearHistory = async () => {
    await AsyncStorage.removeItem('history');
    setHistoryList([]);
  };

  // รูปแบบการ์ดประวัติ 1 ชิ้น
  const renderItem = ({ item }) => {
    // แปลงเวลาให้สวยงาม
    const dateObj = new Date(item.timestamp);
    const dateStr = dateObj.toLocaleDateString();
    const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.historyCard}>
        <Text style={styles.cardEmoji}>{item.emoji}</Text>
        <View style={styles.cardInfo}>
          <Text style={styles.resultName}>{item.result}</Text>
          <Text style={styles.funcName}>Mode: {item.functionName}</Text>
          <Text style={styles.timeText}>{dateStr} - {timeStr}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {historyList.length > 0 ? (
        <>
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>🗑️ Clear History</Text>
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
          <Text style={styles.emptyText}>No history yet.</Text>
          <Text style={styles.emptySubText}>Go roll the dice to see it here!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  historyCard: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardEmoji: { fontSize: 40, marginRight: 15 },
  cardInfo: { flex: 1 },
  resultName: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  funcName: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  timeText: { fontSize: 12, color: 'gray', marginTop: 3 },
  clearButton: {
    alignSelf: 'flex-end',
    marginRight: 20,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 20,
  },
  clearButtonText: { color: '#E74C3C', fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 14, color: 'gray', marginTop: 5 }
});
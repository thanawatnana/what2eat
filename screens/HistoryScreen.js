import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function HistoryScreen({ navigation }) {
  const { user } = useAuth();
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [historyList, setHistoryList] = useState([]);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setHistoryList(data || []);
    setLoading(false);
  }, [user?.id]);

  // 🔄 useEffect: ฟังก์ชันนี้จะทำงานอัตโนมัติเมื่อหน้านี้ถูกโหลดเปิดขึ้นมา

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadHistory);
    return unsubscribe;
  }, [navigation, loadHistory]);

  // Fix 6: Guard ป้องกัน crash ตอน logout
  if (!user) return null;

  const clearHistory = () => {
    // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
    Alert.alert('ล้างประวัติ', 'ต้องการซ่อนประวัติทั้งหมดออกจากหน้าจอหรือไม่?\n(ข้อมูลยังคงอยู่ในระบบ)', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ล้าง', style: 'destructive',
        onPress: () => setHistoryList([]),
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const dateObj = new Date(item.created_at);
    const dateStr = dateObj.toLocaleDateString('th-TH');
    const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    // 🎨 ==========================================
    // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
    // 🎨 ==========================================
    return (
      <View style={styles.historyCard}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cardImage} />
        ) : (
          <View style={{ width: 50, height: 50, marginRight: 15 }} />
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.resultName}>{item.food_name}</Text>
          <Text style={styles.funcName}>หมวดหมู่: {item.food_category}</Text>
          <Text style={styles.timeText}>{dateStr} - {timeStr}</Text>
        </View>
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  // 🎨 ==========================================

  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

  // 🎨 ==========================================

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
  cardImage: { width: 50, height: 50, borderRadius: 10, marginRight: 15 },
  noImagePlaceholder: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999', fontSize: 10, fontWeight: 'bold' },
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

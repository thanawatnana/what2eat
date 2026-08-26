import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { foodList } from '../data/foods';

export default function SoloScreen() {
  const [currentFood, setCurrentFood] = useState(null);
  const [isRolling, setIsRolling] = useState(false);

  // TODO สำหรับคนทำหลังบ้าน (Supabase): เปลี่ยนตรงนี้ไปใช้ supabase.from('history').insert([...])
  const saveHistoryToDB = async (selectedFood) => {
    try {
      const newRecord = {
        id: Date.now().toString(),
        functionName: 'สุ่มเดี่ยว',
        result: selectedFood.name,
        emoji: selectedFood.emoji,
        timestamp: new Date().toISOString()
      };
      const existingHistory = await AsyncStorage.getItem('history');
      const historyArray = existingHistory ? JSON.parse(existingHistory) : [];
      historyArray.unshift(newRecord);
      await AsyncStorage.setItem('history', JSON.stringify(historyArray));
    } catch (error) {
      console.error("Error saving history:", error);
    }
  };

  const randomizeFood = () => {
    setIsRolling(true);
    // ทำ effect หมุนติ้วๆ ให้ดูมีอะไร
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * foodList.length);
      const selectedFood = foodList[randomIndex];
      setCurrentFood(selectedFood);
      saveHistoryToDB(selectedFood); // โยนไปเซฟประวัติ
      setIsRolling(false);
    }, 600);
  };

  // TODO สำหรับคนทำหลังบ้าน (Supabase): เปลี่ยนเป็น supabase.from('favorites').insert([...])
  const saveToFavorites = async () => {
    if (!currentFood) return;
    try {
      const existingFavs = await AsyncStorage.getItem('favorites');
      const favArray = existingFavs ? JSON.parse(existingFavs) : [];
      
      const isExist = favArray.find(item => item.id === currentFood.id);
      if (isExist) {
        alert('มีเมนูนี้ในรายการโปรดแล้วจ้า ❤️');
        return;
      }
      favArray.unshift(currentFood);
      await AsyncStorage.setItem('favorites', JSON.stringify(favArray));
      alert('บันทึกเมนูโปรดสำเร็จ! ❤️');
    } catch (error) {
      console.error("Error saving favorite:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {isRolling ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : currentFood ? (
          <>
            <Text style={styles.emoji}>{currentFood.emoji}</Text>
            <Text style={styles.foodName}>{currentFood.name}</Text>
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>{currentFood.category}</Text>
              <Text style={styles.priceTag}>฿ {currentFood.price}</Text>
            </View>
            
            <TouchableOpacity style={styles.favBtn} onPress={saveToFavorites}>
              <Text style={styles.favBtnText}>❤️ บันทึกเมนูโปรด</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>กดปุ่มด้านล่างเพื่อเริ่มสุ่มเมนู!</Text>
        )}
      </View>

      <TouchableOpacity style={styles.randomButton} onPress={randomizeFood} disabled={isRolling}>
        <Text style={styles.randomButtonText}>
          {currentFood ? '🔄 สุ่มใหม่อีกครั้ง' : '🎲 เริ่มสุ่มเมนู'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.white, width: '85%', padding: 30, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
    marginTop: 60, marginBottom: 40, minHeight: 300, justifyContent: 'center'
  },
  emoji: { fontSize: 80, marginBottom: 15 },
  foodName: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, textAlign: 'center' },
  tagContainer: { flexDirection: 'row', gap: 10 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, fontSize: 14, fontWeight: 'bold', overflow: 'hidden' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, fontSize: 14, fontWeight: 'bold', borderWidth: 1.5, borderColor: COLORS.secondary, overflow: 'hidden' },
  favBtn: { marginTop: 30, backgroundColor: '#FFF5F5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1D1' },
  favBtnText: { fontSize: 16, color: '#E74C3C', fontWeight: 'bold' },
  emptyText: { fontSize: 18, color: '#999', textAlign: 'center', fontWeight: '500' },
  randomButton: {
    backgroundColor: COLORS.primary, paddingVertical: 18, paddingHorizontal: 50, borderRadius: 30,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  randomButtonText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' }
});
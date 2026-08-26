import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { foodList } from '../data/foods';

export default function SoloScreen() {
  const [currentFood, setCurrentFood] = useState(null);

  // 1. ฟังก์ชันสุ่มอาหารและบันทึก History
  const randomizeFood = async () => {
    const randomIndex = Math.floor(Math.random() * foodList.length);
    const selectedFood = foodList[randomIndex];
    setCurrentFood(selectedFood);

    try {
      const newRecord = {
        id: Date.now().toString(),
        functionName: 'Solo Random',
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

  // 2. ฟังก์ชันเซฟลง Favorites
  const saveToFavorites = async () => {
    if (!currentFood) return;
    try {
      const existingFavs = await AsyncStorage.getItem('favorites');
      const favArray = existingFavs ? JSON.parse(existingFavs) : [];
      
      const isExist = favArray.find(item => item.id === currentFood.id);
      if (isExist) {
        alert('Already in Favorites! ❤️');
        return;
      }

      favArray.unshift(currentFood);
      await AsyncStorage.setItem('favorites', JSON.stringify(favArray));
      alert('Saved to Favorites! ❤️');
    } catch (error) {
      console.error("Error saving favorite:", error);
    }
  };

  // 3. ส่วนแสดงผล (UI)
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {currentFood ? (
          <>
            <Text style={styles.emoji}>{currentFood.emoji}</Text>
            <Text style={styles.foodName}>{currentFood.name}</Text>
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>{currentFood.category}</Text>
              <Text style={styles.priceTag}>฿ {currentFood.price}</Text>
            </View>
            
            {/* ปุ่ม Save Favorite */}
            <TouchableOpacity style={{marginTop: 20}} onPress={saveToFavorites}>
              <Text style={{fontSize: 16, color: COLORS.textLight, fontWeight: 'bold'}}>❤️ Save to Favorites</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>Tap to find your meal!</Text>
        )}
      </View>

      <TouchableOpacity style={styles.randomButton} onPress={randomizeFood}>
        <Text style={styles.randomButtonText}>
          {currentFood ? '🔄 Random Again' : '🎲 Random Food'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// 4. Styles
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.white, width: '80%', padding: 30, borderRadius: 20, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5,
    marginTop: 60, marginBottom: 40, minHeight: 250, justifyContent: 'center'
  },
  emoji: { fontSize: 70, marginBottom: 15 },
  foodName: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15, textAlign: 'center' },
  tagContainer: { flexDirection: 'row', gap: 10 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, fontSize: 14, fontWeight: 'bold' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, fontSize: 14, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.secondary },
  emptyText: { fontSize: 18, color: 'gray', textAlign: 'center' },
  randomButton: {
    backgroundColor: COLORS.primary, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5,
  },
  randomButtonText: { color: COLORS.white, fontSize: 20, fontWeight: 'bold' }
});
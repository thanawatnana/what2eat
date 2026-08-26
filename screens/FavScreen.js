import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

export default function FavScreen({ navigation }) {
  const [favList, setFavList] = useState([]);

  const loadFavorites = async () => {
    try {
      const storedFavs = await AsyncStorage.getItem('favorites');
      if (storedFavs) {
        setFavList(JSON.parse(storedFavs));
      }
    } catch (error) {
      console.error("Failed to load favorites", error);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });
    return unsubscribe;
  }, [navigation]);

  const removeFavorite = async (id) => {
    const updatedFavs = favList.filter(item => item.id !== id);
    setFavList(updatedFavs);
    await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavs));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.category}>{item.category}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFavorite(item.id)}>
        <Text style={styles.removeBtnText}>❌</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {favList.length > 0 ? (
        <FlatList
          data={favList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyText}>No favorites yet.</Text>
          <Text style={styles.emptySubText}>Save your favorite meals here!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  emoji: { fontSize: 40, marginRight: 15 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  category: { fontSize: 14, color: 'gray', fontWeight: 'bold' },
  removeBtn: { padding: 10 },
  removeBtnText: { fontSize: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 14, color: 'gray', marginTop: 5 }
});
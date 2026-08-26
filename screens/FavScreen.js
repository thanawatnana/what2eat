import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function FavScreen({ navigation }) {
  const [favList, setFavList] = useState([]);

  // TODO: Supabase -> await supabase.from('favorites').select('*')
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

  // TODO: Supabase -> await supabase.from('favorites').delete().eq('id', id)
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
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyText}>ยังไม่มีเมนูโปรด</Text>
          <Text style={styles.emptySubText}>เจอเมนูที่ถูกใจ อย่าลืมกดหัวใจไว้นะ!</Text>
        </View>
      )}
    </View>
  );
}

// ... styles 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 18, borderRadius: 20, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 3,
  },
  emoji: { fontSize: 45, marginRight: 18 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  category: { fontSize: 14, color: '#888', fontWeight: '600' },
  removeBtn: { padding: 12, backgroundColor: '#FFF0F0', borderRadius: 15 },
  removeBtnText: { fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 70, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 16, color: 'gray', marginTop: 8 }
});
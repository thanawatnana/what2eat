import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

export default function FavScreen({ navigation }) {
  const { user } = useAuth();
  const [favList, setFavList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setFavList(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFavorites);
    return unsubscribe;
  }, [navigation, loadFavorites]);

  // Fix 6: Guard ป้องกัน crash ตอน logout
  if (!user) return null;

  const removeFavorite = async (id) => {
    const { error } = await supabase.from('favorites').delete().eq('id', id);
    if (!error) setFavList(prev => prev.filter(item => item.id !== id));
    else Alert.alert('Error', error.message);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Fix 3: food_emoji ถูกลบออกจาก DB แล้ว ใช้ emoji default แทน */}
      <Text style={styles.emoji}>🍽️</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{item.food_name}</Text>
        <Text style={styles.category}>{item.food_category}</Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={() => removeFavorite(item.id)}>
        <Text style={styles.removeBtnText}>❌</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

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
          <Text style={styles.emptyText}>ยังไม่มีเมนูโปรด</Text>
          <Text style={styles.emptySubText}>ลองสุ่มเมนูแล้วกดบันทึกดูนะ!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  emoji: { fontSize: 40, marginRight: 15 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  category: { fontSize: 13, color: 'gray', fontWeight: '600' },
  removeBtn: { padding: 10 },
  removeBtnText: { fontSize: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
  emptySubText: { fontSize: 14, color: 'gray', marginTop: 5 },
});

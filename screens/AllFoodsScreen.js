import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function AllFoodsScreen({ navigation }) {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    const [{ data: systemFoods }, { data: userFoods }] = await Promise.all([
      supabase.from('foods').select('*').order('created_at'),
      supabase.from('user_foods').select('*').eq('user_id', user.id).order('created_at'),
    ]);
    const combined = [
      ...(systemFoods || []).map(f => ({ ...f, source: 'system' })),
      ...(userFoods || []).map(f => ({ ...f, source: 'custom' })),
    ];
    setFoods(combined);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFoods);
    return unsubscribe;
  }, [navigation, loadFoods]);

  const deleteUserFood = (item) => {
    if (item.source === 'system') { Alert.alert('❌', 'ไม่สามารถลบเมนูของระบบได้'); return; }
    Alert.alert('ลบเมนู', ต้องการลบ "" หรือไม่?, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('user_foods').delete().eq('id', item.id);
          if (!error) setFoods(prev => prev.filter(f => f.id !== item.id));
          else Alert.alert('Error', error.message);
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.name}</Text>
          {item.source === 'custom' && <Text style={styles.customBadge}>⭐ ของคุณ</Text>}
        </View>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>{item.category}</Text>
          <Text style={styles.priceTag}>฿ {item.price}</Text>
        </View>
      </View>
      {item.source === 'custom' && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUserFood(item)}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={foods}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text style={styles.countText}>เมนูทั้งหมด {foods.length} รายการ</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  listContainer: { padding: 16 },
  countText: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 14, borderRadius: 16, marginBottom: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  emoji: { fontSize: 42, marginRight: 14 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, flexShrink: 1 },
  customBadge: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  tagContainer: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.secondary, overflow: 'hidden' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
});

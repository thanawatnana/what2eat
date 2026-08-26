import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

export default function SoloScreen() {
  const { user } = useAuth();
  const [allFoods, setAllFoods] = useState([]);
  const [currentFood, setCurrentFood] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(true);

  // Modal เพิ่มเมนูส่วนตัว
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [savingFood, setSavingFood] = useState(false);

  // ── โหลดเมนูทั้งหมด (ระบบ + ส่วนตัว) ─────────────────────────
  const loadFoods = useCallback(async () => {
    setLoadingFoods(true);
    try {
      const [{ data: systemFoods }, { data: userFoods }] = await Promise.all([
        supabase.from('foods').select('*').order('created_at'),
        supabase.from('user_foods').select('*').eq('user_id', user.id).order('created_at'),
      ]);
      const combined = [
        ...(systemFoods || []).map(f => ({ ...f, source: 'system' })),
        ...(userFoods || []).map(f => ({ ...f, source: 'custom' })),
      ];
      setAllFoods(combined);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingFoods(false);
    }
  }, [user.id]);

  useEffect(() => { loadFoods(); }, [loadFoods]);

  // ── สุ่มอาหาร + บันทึก history ────────────────────────────────
  const randomizeFood = async () => {
    if (allFoods.length === 0) return;
    setIsRolling(true);
    setTimeout(async () => {
      const selected = allFoods[Math.floor(Math.random() * allFoods.length)];
      setCurrentFood(selected);
      setIsRolling(false);
      // บันทึกลง history บน Supabase
      await supabase.from('history').insert({
        user_id: user.id,
        food_name: selected.name,
        food_emoji: selected.emoji,
        food_category: selected.category,
        mode: 'solo',
      });
    }, 600);
  };

  // ── บันทึก Favorite ───────────────────────────────────────────
  const saveToFavorites = async () => {
    if (!currentFood) return;
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      food_name: currentFood.name,
      food_emoji: currentFood.emoji,
      food_category: currentFood.category,
    });
    if (error) {
      if (error.code === '23505') Alert.alert('❤️', 'มีเมนูนี้ในรายการโปรดแล้วจ้า!');
      else Alert.alert('Error', error.message);
    } else {
      Alert.alert('❤️', 'บันทึกเมนูโปรดสำเร็จ!');
    }
  };

  // ── เพิ่มเมนูส่วนตัว ───────────────────────────────────────────
  const handleAddFood = async () => {
    if (!newName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อเมนู'); return; }
    setSavingFood(true);
    const { error } = await supabase.from('user_foods').insert({
      user_id: user.id,
      name: newName.trim(),
      emoji: newEmoji.trim() || '🍽️',
      category: newCategory.trim() || 'Custom',
      price: newPrice.trim() || '-',
    });
    setSavingFood(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('✅', 'เพิ่มเมนูสำเร็จ!');
    setModalVisible(false);
    setNewName(''); setNewEmoji(''); setNewCategory(''); setNewPrice('');
    loadFoods();
  };

  return (
    <View style={styles.container}>
      {/* Food Card */}
      <View style={styles.card}>
        {loadingFoods ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : isRolling ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : currentFood ? (
          <>
            <Text style={styles.emoji}>{currentFood.emoji}</Text>
            <Text style={styles.foodName}>{currentFood.name}</Text>
            <View style={styles.tagContainer}>
              <Text style={styles.tag}>{currentFood.category}</Text>
              <Text style={styles.priceTag}>฿ {currentFood.price}</Text>
            </View>
            {currentFood.source === 'custom' && (
              <Text style={styles.customBadge}>⭐ เมนูของคุณ</Text>
            )}
            <TouchableOpacity style={styles.favBtn} onPress={saveToFavorites}>
              <Text style={styles.favBtnText}>❤️ บันทึกเมนูโปรด</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.emptyText}>
            {allFoods.length === 0 ? 'ไม่มีเมนูในระบบ' : 'กดปุ่มด้านล่างเพื่อเริ่มสุ่มเมนู!'}
          </Text>
        )}
      </View>

      {/* ปุ่มหลัก */}
      <TouchableOpacity style={styles.randomButton} onPress={randomizeFood} disabled={isRolling || loadingFoods}>
        <Text style={styles.randomButtonText}>
          {currentFood ? '🔄 สุ่มใหม่อีกครั้ง' : '🎲 เริ่มสุ่มเมนู'}
        </Text>
      </TouchableOpacity>

      {/* ปุ่มเพิ่มเมนูส่วนตัว */}
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>➕ เพิ่มเมนูส่วนตัว</Text>
      </TouchableOpacity>

      {/* Modal เพิ่มเมนู */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>➕ เพิ่มเมนูส่วนตัว</Text>

            <Text style={styles.modalLabel}>ชื่อเมนู *</Text>
            <TextInput style={styles.modalInput} placeholder="เช่น ข้าวสวย" placeholderTextColor="#aaa" value={newName} onChangeText={setNewName} />

            <Text style={styles.modalLabel}>Emoji</Text>
            <TextInput style={styles.modalInput} placeholder="🍽️" placeholderTextColor="#aaa" value={newEmoji} onChangeText={setNewEmoji} />

            <Text style={styles.modalLabel}>หมวดหมู่</Text>
            <TextInput style={styles.modalInput} placeholder="Thai / Japanese / Custom..." placeholderTextColor="#aaa" value={newCategory} onChangeText={setNewCategory} />

            <Text style={styles.modalLabel}>ราคา (ไม่บังคับ)</Text>
            <TextInput style={styles.modalInput} placeholder="เช่น 50-80" placeholderTextColor="#aaa" value={newPrice} onChangeText={setNewPrice} keyboardType="default" />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddFood} disabled={savingFood}>
                {savingFood ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>บันทึก</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  card: {
    backgroundColor: COLORS.white, width: '85%', padding: 30, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
    marginTop: 40, marginBottom: 30, minHeight: 250, justifyContent: 'center',
  },
  emoji: { fontSize: 80, marginBottom: 15 },
  foodName: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 12, textAlign: 'center' },
  tagContainer: { flexDirection: 'row', gap: 10 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: 'bold', overflow: 'hidden' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, fontSize: 13, fontWeight: 'bold', borderWidth: 1.5, borderColor: COLORS.secondary, overflow: 'hidden' },
  customBadge: { marginTop: 10, color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  favBtn: { marginTop: 24, backgroundColor: '#FFF5F5', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1D1' },
  favBtnText: { fontSize: 15, color: '#E74C3C', fontWeight: 'bold' },
  emptyText: { fontSize: 17, color: '#999', textAlign: 'center', fontWeight: '500' },
  randomButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 50, borderRadius: 30, marginBottom: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  randomButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  addBtn: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.secondary },
  addBtnText: { color: COLORS.secondary, fontSize: 14, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.secondary, marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.textDark, backgroundColor: '#FAFAFA' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#888' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.secondary },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});

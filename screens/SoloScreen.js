import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform, ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// Task 3: หมวดหมู่อาหารสำเร็จรูป (ตัวเลือก dropdown)
const CATEGORIES = ['Thai', 'Japanese', 'Western', 'Healthy', 'Fast Food', 'Party', 'อื่นๆ'];

export default function SoloScreen() {
  const { user } = useAuth();

  // ── State หลัก ──────────────────────────────────────────────────────────
  const [allFoods, setAllFoods] = useState([]);
  const [currentFood, setCurrentFood] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(true);

  // ── Modal เพิ่มเมนูส่วนตัว (Task 3) ─────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Thai');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newImageUri, setNewImageUri] = useState(null);  // URI รูปที่เลือก (local)
  const [savingFood, setSavingFood] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // ── โหลดเมนูทั้งหมด (ระบบ + ส่วนตัว) ─────────────────────────────────────
  const loadFoods = useCallback(async () => {
    if (!user?.id) return;
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
  }, [user?.id]);

  useEffect(() => { loadFoods(); }, [loadFoods]);

  // Task 6: Guard หลัง hooks ทุกตัว — ป้องกัน crash ตอน logout
  if (!user) return null;

  // ── สุ่มอาหาร + บันทึก history ────────────────────────────────
  const randomizeFood = async () => {
    if (allFoods.length === 0) return;
    setIsRolling(true);
    setTimeout(async () => {
      const selected = allFoods[Math.floor(Math.random() * allFoods.length)];
      setCurrentFood(selected);
      setIsRolling(false);
      await supabase.from('history').insert({
        user_id: user.id,
        food_name: selected.name,
        food_emoji: selected.emoji || '🍽️',
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
      food_emoji: currentFood.emoji || '🍽️',
      food_category: currentFood.category,
    });
    if (error) {
      if (error.code === '23505') Alert.alert('❤️', 'มีเมนูนี้ในรายการโปรดแล้วจ้า!');
      else Alert.alert('Error', error.message);
    } else {
      Alert.alert('❤️', 'บันทึกเมนูโปรดสำเร็จ!');
    }
  };

  // ── Task 3: เลือกรูปภาพจาก Gallery ──────────────────────────────
  const pickFoodImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setNewImageUri(result.assets[0].uri);
    }
  };

  // ── Task 3: อัปโหลดรูปไป Supabase Storage ──────────────────────
  const uploadFoodImage = async (uri) => {
    const path = `user_foods/${user.id}/${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from('food-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Task 3: บันทึกเมนูส่วนตัว (ไม่มี emoji แล้ว มี image_url แทน) ──
  const handleAddFood = async () => {
    if (!newName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อเมนู'); return; }
    setSavingFood(true);

    try {
      // อัปโหลดรูปก่อน (ถ้าเลือกไว้)
      let imageUrl = null;
      if (newImageUri) {
        imageUrl = await uploadFoodImage(newImageUri);
      }

      // ถ้าเลือก "อื่นๆ" ให้ใช้ custom text; ถ้าไม่ให้ใช้ค่าจาก dropdown
      const finalCategory = newCategory === 'อื่นๆ'
        ? (newCustomCategory.trim() || 'อื่นๆ')
        : newCategory;

      const { error } = await supabase.from('user_foods').insert({
        user_id: user.id,
        name: newName.trim(),
        image_url: imageUrl,
        category: finalCategory,
        price: newPrice.trim() || '-',
      });

      if (error) { Alert.alert('Error', error.message); return; }

      Alert.alert('✅', 'เพิ่มเมนูสำเร็จ!');
      resetForm();
      setModalVisible(false);
      loadFoods();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingFood(false);
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewCategory('Thai');
    setNewCustomCategory('');
    setNewPrice('');
    setNewImageUri(null);
    setCategoryPickerOpen(false);
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Food Card */}
      <View style={styles.card}>
        {loadingFoods || isRolling ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : currentFood ? (
          <>
            {/* Task 3: แสดงรูปถ้ามี image_url ไม่งั้นใช้ emoji */}
            {currentFood.image_url ? (
              <Image source={{ uri: currentFood.image_url }} style={styles.foodImage} />
            ) : (
              <Text style={styles.emoji}>{currentFood.emoji || '🍽️'}</Text>
            )}
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

      {/* ── Modal เพิ่มเมนู (Task 3: ไม่มี emoji / มีรูป + category dropdown) ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { resetForm(); setModalVisible(false); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>➕ เพิ่มเมนูส่วนตัว</Text>

              {/* ── Image Picker (แทน emoji) ── */}
              <Text style={styles.modalLabel}>รูปภาพเมนู</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickFoodImage}>
                {newImageUri ? (
                  <Image source={{ uri: newImageUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderIcon}>📷</Text>
                    <Text style={styles.imagePlaceholderText}>แตะเพื่อเลือกรูป</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── ชื่อเมนู ── */}
              <Text style={styles.modalLabel}>ชื่อเมนู *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="เช่น ข้าวสวย"
                placeholderTextColor="#aaa"
                value={newName}
                onChangeText={setNewName}
              />

              {/* ── Category Dropdown (Task 3) ── */}
              <Text style={styles.modalLabel}>หมวดหมู่</Text>
              <TouchableOpacity
                style={styles.dropdownBtn}
                onPress={() => setCategoryPickerOpen(o => !o)}
              >
                <Text style={styles.dropdownBtnText}>{newCategory}</Text>
                <Text style={styles.dropdownArrow}>{categoryPickerOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {categoryPickerOpen && (
                <View style={styles.dropdownList}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.dropdownItem, newCategory === cat && styles.dropdownItemActive]}
                      onPress={() => { setNewCategory(cat); setCategoryPickerOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, newCategory === cat && styles.dropdownItemTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* ── Custom Category Input (แสดงเมื่อเลือก "อื่นๆ") ── */}
              {newCategory === 'อื่นๆ' && (
                <>
                  <Text style={styles.modalLabel}>ระบุหมวดหมู่ *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="เช่น ข้าวต้ม, อาหารทะเล..."
                    placeholderTextColor="#aaa"
                    value={newCustomCategory}
                    onChangeText={setNewCustomCategory}
                  />
                </>
              )}

              {/* ── ราคา ── */}
              <Text style={styles.modalLabel}>ราคา (ไม่บังคับ)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="เช่น 50-80"
                placeholderTextColor="#aaa"
                value={newPrice}
                onChangeText={setNewPrice}
              />

              {/* ── ปุ่ม ── */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { resetForm(); setModalVisible(false); }}>
                  <Text style={styles.modalCancelText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddFood} disabled={savingFood}>
                  {savingFood
                    ? <ActivityIndicator color={COLORS.white} />
                    : <Text style={styles.modalSaveText}>บันทึก</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  // รูปภาพในการ์ดอาหาร
  foodImage: { width: 120, height: 120, borderRadius: 16, marginBottom: 15 },
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
  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScroll: { justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.secondary, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.textDark, backgroundColor: '#FAFAFA' },
  // Image Picker
  imagePicker: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, overflow: 'hidden', backgroundColor: '#FAFAFA' },
  imagePreview: { width: '100%', height: 160, resizeMode: 'cover' },
  imagePlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderIcon: { fontSize: 36, marginBottom: 6 },
  imagePlaceholderText: { color: '#aaa', fontSize: 13 },
  // Dropdown
  dropdownBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#FAFAFA',
  },
  dropdownBtnText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  dropdownArrow: { fontSize: 12, color: '#888' },
  dropdownList: { borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, marginTop: 4, overflow: 'hidden', backgroundColor: COLORS.white },
  dropdownItem: { paddingVertical: 11, paddingHorizontal: 16 },
  dropdownItemActive: { backgroundColor: COLORS.secondary },
  dropdownItemText: { fontSize: 14, color: COLORS.textDark },
  dropdownItemTextActive: { color: COLORS.white, fontWeight: '700' },
  // Buttons
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#888' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.secondary },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});

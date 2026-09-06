import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  FlatList,
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

// Task 4 + Task 3: Category dropdown options
const CATEGORIES = ['Thai', 'Japanese', 'Western', 'Healthy', 'Fast Food', 'Party', 'อื่นๆ'];

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function AllFoodsScreen({ navigation }) {
  const { user } = useAuth();
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [foods, setFoods] = useState([]);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [loading, setLoading] = useState(true);

  // ── Modal: Add Food ─────────────────────────────────────────────────────
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [addModalVisible, setAddModalVisible] = useState(false);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [newName, setNewName] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [newCategory, setNewCategory] = useState('Thai');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [newCustomCategory, setNewCustomCategory] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [newPrice, setNewPrice] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [newImageUri, setNewImageUri] = useState(null);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [savingFood, setSavingFood] = useState(false);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  // ── Modal: Edit Food ─────────────────────────────────────────────────────
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editModalVisible, setEditModalVisible] = useState(false);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editingFood, setEditingFood] = useState(null);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editName, setEditName] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editCategory, setEditCategory] = useState('Thai');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editCustomCategory, setEditCustomCategory] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editPrice, setEditPrice] = useState('');
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editImageUri, setEditImageUri] = useState(null);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editImageBase64, setEditImageBase64] = useState(null);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [updatingFood, setUpdatingFood] = useState(false);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);

  // ── โหลดเมนู ────────────────────────────────────────────────────────────
  const loadFoods = useCallback(async () => {
    if (!user?.id) return;
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
  }, [user?.id]);

  // 🔄 useEffect: ฟังก์ชันนี้จะทำงานอัตโนมัติเมื่อหน้านี้ถูกโหลดเปิดขึ้นมา

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFoods);
    return unsubscribe;
  }, [navigation, loadFoods]);

  // Task 6: guard หลัง hooks
  if (!user) return null;

  // ── ลบเมนู ──────────────────────────────────────────────────────────────
  const deleteUserFood = (item) => {
    if (item.source === 'system') { Alert.alert('❌', 'ไม่สามารถลบเมนูของระบบได้'); return; }
    // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
    Alert.alert('ลบเมนู', `ต้องการลบ "${item.name}" หรือไม่?`, [
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

  // ── Image Picker helper ───────────────────────────────────────────────────
  const pickImage = async (setUri, setBase64) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setUri(result.assets[0].uri);
      setBase64(result.assets[0].base64);
    }
  };

  // ── Upload Image to Supabase Storage ─────────────────────────────────────
  const uploadFoodImage = async (base64Str) => {
    const path = `user_foods/${user.id}/${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from('food-images')
      .upload(path, decode(base64Str), { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Task 4: เพิ่มเมนูใหม่ ────────────────────────────────────────────────
  const handleAddFood = async () => {
    if (!newName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อเมนู'); return; }
    setSavingFood(true);
    try {
      let imageUrl = null;
      if (newImageBase64) imageUrl = await uploadFoodImage(newImageBase64);

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
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('✅', 'เพิ่มเมนูสำเร็จ!');
      resetAddForm();
      setAddModalVisible(false);
      loadFoods();
    } catch (err) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('Error', err.message);
    } finally {
      setSavingFood(false);
    }
  };

  const resetAddForm = () => {
    setNewName(''); setNewCategory('Thai'); setNewCustomCategory('');
    setNewPrice(''); setNewImageUri(null); setAddCategoryOpen(false);
  };

  // ── Task 4: เปิด Edit Modal ──────────────────────────────────────────────
  const openEditModal = (item) => {
    setEditingFood(item);
    setEditName(item.name);
    // ถ้า category ไม่ตรงกับ preset ให้ set เป็น "อื่นๆ" + custom
    const isPreset = CATEGORIES.slice(0, -1).includes(item.category);
    setEditCategory(isPreset ? item.category : 'อื่นๆ');
    setEditCustomCategory(isPreset ? '' : item.category);
    setEditPrice(item.price || '');
    setEditImageUri(null);
    setEditCategoryOpen(false);
    setEditModalVisible(true);
  };

  // ── Task 4: บันทึกการแก้ไข ───────────────────────────────────────────────
  const handleUpdateFood = async () => {
    if (!editName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อเมนู'); return; }
    setUpdatingFood(true);
    try {
      let imageUrl = editingFood?.image_url || null;
      if (editImageUri) imageUrl = await uploadFoodImage(editImageUri);

      const finalCategory = editCategory === 'อื่นๆ'
        ? (editCustomCategory.trim() || 'อื่นๆ')
        : editCategory;

      const updatedData = {
        name: editName.trim(),
        image_url: imageUrl,
        category: finalCategory,
        price: editPrice.trim() || '-',
      };

      const { data: updated, error } = await supabase
        .from('user_foods')
        .update(updatedData)
        .eq('id', editingFood.id)
        .select(); // ทำให้รู้ว่า update กี่ rows จริง

      if (error) {
        // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
        Alert.alert('❌ Error', error.message);
        return;
      }

      // อัปเดต local state ทันที (ไม่ต้องรอ reload)
      setFoods(prev => prev.map(f =>
        f.id === editingFood.id ? { ...f, ...updatedData } : f
      ));

      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้

      Alert.alert('✅', 'แก้ไขเมนูสำเร็จ!');
      setEditModalVisible(false);
      loadFoods();
    } catch (err) {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('❌ Error', err.message);
    } finally {
      setUpdatingFood(false);
    }
  };


  // ── Render แต่ละ item ─────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* รูปภาพหรือ emoji */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.foodImage} />
      ) : (
        <Text style={styles.emoji}>{item.emoji || '🍽️'}</Text>
      )}
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
      {/* Task 4: ปุ่ม Edit + Delete (เฉพาะเมนูของตัวเอง) */}
      {item.source === 'custom' && (
        <View style={styles.actionBtns}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
            <Text style={styles.editBtnText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUserFood(item)}>
            <Text style={styles.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  // 🎨 ==========================================

  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

  // 🎨 ==========================================

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

      {/* Task 4: FAB ปุ่มเพิ่มเมนู */}
      <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* ── Modal: Add Food ── */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => { resetAddForm(); setAddModalVisible(false); }}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>➕ เพิ่มเมนูส่วนตัว</Text>

                <Text style={styles.modalLabel}>รูปภาพเมนู</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setNewImageUri, setNewImageBase64)}>
                  {newImageUri
                    ? <Image source={{ uri: newImageUri }} style={styles.imagePreview} />
                    : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 32 }}>📷</Text><Text style={styles.imagePlaceholderText}>แตะเพื่อเลือกรูป</Text></View>
                  }
                </TouchableOpacity>

                <Text style={styles.modalLabel}>ชื่อเมนู *</Text>
                <TextInput style={styles.modalInput} placeholder="เช่น ข้าวสวย" placeholderTextColor="#aaa" value={newName} onChangeText={setNewName} />

                <Text style={styles.modalLabel}>หมวดหมู่</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setAddCategoryOpen(o => !o)}>
                  <Text style={styles.dropdownBtnText}>{newCategory}</Text>
                  <Text style={styles.dropdownArrow}>{addCategoryOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {addCategoryOpen && (
                  <View style={styles.dropdownList}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat} style={[styles.dropdownItem, newCategory === cat && styles.dropdownItemActive]}
                        onPress={() => { setNewCategory(cat); setAddCategoryOpen(false); }}>
                        <Text style={[styles.dropdownItemText, newCategory === cat && styles.dropdownItemTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {newCategory === 'อื่นๆ' && (
                  <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder="ระบุหมวดหมู่..." placeholderTextColor="#aaa" value={newCustomCategory} onChangeText={setNewCustomCategory} />
                )}

                <Text style={styles.modalLabel}>ราคา (ไม่บังคับ)</Text>
                <TextInput style={styles.modalInput} placeholder="เช่น 50-80" placeholderTextColor="#aaa" value={newPrice} onChangeText={setNewPrice} />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { resetAddForm(); setAddModalVisible(false); }}>
                    <Text style={styles.modalCancelText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleAddFood} disabled={savingFood}>
                    {savingFood ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>บันทึก</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ── Modal: Edit Food ── */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>✏️ แก้ไขเมนู</Text>

                <Text style={styles.modalLabel}>รูปภาพเมนู (แตะเพื่อเปลี่ยน)</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(setEditImageUri, setEditImageBase64)}>
                  {editImageUri
                    ? <Image source={{ uri: editImageUri }} style={styles.imagePreview} />
                    : editingFood?.image_url
                      ? <Image source={{ uri: editingFood.image_url }} style={styles.imagePreview} />
                      : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 32 }}>📷</Text><Text style={styles.imagePlaceholderText}>แตะเพื่อเลือกรูปใหม่</Text></View>
                  }
                </TouchableOpacity>

                <Text style={styles.modalLabel}>ชื่อเมนู *</Text>
                <TextInput style={styles.modalInput} placeholderTextColor="#aaa" value={editName} onChangeText={setEditName} />

                <Text style={styles.modalLabel}>หมวดหมู่</Text>
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setEditCategoryOpen(o => !o)}>
                  <Text style={styles.dropdownBtnText}>{editCategory}</Text>
                  <Text style={styles.dropdownArrow}>{editCategoryOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {editCategoryOpen && (
                  <View style={styles.dropdownList}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity key={cat} style={[styles.dropdownItem, editCategory === cat && styles.dropdownItemActive]}
                        onPress={() => { setEditCategory(cat); setEditCategoryOpen(false); }}>
                        <Text style={[styles.dropdownItemText, editCategory === cat && styles.dropdownItemTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {editCategory === 'อื่นๆ' && (
                  <TextInput style={[styles.modalInput, { marginTop: 8 }]} placeholder="ระบุหมวดหมู่..." placeholderTextColor="#aaa" value={editCustomCategory} onChangeText={setEditCustomCategory} />
                )}

                <Text style={styles.modalLabel}>ราคา</Text>
                <TextInput style={styles.modalInput} placeholderTextColor="#aaa" value={editPrice} onChangeText={setEditPrice} />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                    <Text style={styles.modalCancelText}>ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleUpdateFood} disabled={updatingFood}>
                    {updatingFood ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.modalSaveText}>บันทึก</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  listContainer: { padding: 16, paddingBottom: 90 },
  countText: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', padding: 14, borderRadius: 16, marginBottom: 12, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  foodImage: { width: 56, height: 56, borderRadius: 10, marginRight: 14 },
  emoji: { fontSize: 42, marginRight: 14, width: 56, textAlign: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  name: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, flexShrink: 1 },
  customBadge: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  tagContainer: { flexDirection: 'row', gap: 8 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.secondary, overflow: 'hidden' },
  actionBtns: { flexDirection: 'row', gap: 4 },
  editBtn: { padding: 8 },
  editBtnText: { fontSize: 18 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: COLORS.white, fontSize: 32, lineHeight: 36 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: COLORS.secondary, marginBottom: 16, textAlign: 'center' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: COLORS.textDark, backgroundColor: '#FAFAFA' },
  imagePicker: { borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, overflow: 'hidden', backgroundColor: '#FAFAFA' },
  imagePreview: { width: '100%', height: 150, resizeMode: 'cover' },
  imagePlaceholder: { height: 110, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: '#aaa', fontSize: 12, marginTop: 4 },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#FAFAFA' },
  dropdownBtnText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600' },
  dropdownArrow: { fontSize: 12, color: '#888' },
  dropdownList: { borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, marginTop: 4, overflow: 'hidden', backgroundColor: COLORS.white },
  dropdownItem: { paddingVertical: 11, paddingHorizontal: 16 },
  dropdownItemActive: { backgroundColor: COLORS.secondary },
  dropdownItemText: { fontSize: 14, color: COLORS.textDark },
  dropdownItemTextActive: { color: COLORS.white, fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#ddd' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: '#888' },
  modalSaveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.secondary },
  modalSaveText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});

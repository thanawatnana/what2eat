import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator, Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform, ScrollView,
  StatusBar,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

// Task 4: หมวดหมู่สำหรับ Filter Chips
const FILTER_CATEGORIES = [
  { emoji: '🍽️', label: 'ทั้งหมด', value: 'All' },
  { emoji: '🍜', label: 'อาหารไทย', value: 'Thai' },
  { emoji: '🍣', label: 'อาหารญี่ปุ่น', value: 'Japanese' },
  { emoji: '🥗', label: 'สุขภาพ', value: 'Healthy' },
  { emoji: '🍔', label: 'ฟาสต์ฟู้ด', value: 'Fast Food' },
  { emoji: '🍲', label: 'ปาร์ตี้', value: 'Party' },
];

// Task 3: หมวดหมู่อาหารสำเร็จรูป (ตัวเลือก dropdown)
const CATEGORIES = ['Thai', 'Japanese', 'Western', 'Healthy', 'Fast Food', 'Party', 'อื่นๆ'];

export default function SoloScreen({ navigation }) {
  const { user } = useAuth();

  // ── State หลัก ──────────────────────────────────────────────────────────
  const [allFoods, setAllFoods] = useState([]);
  const [currentFood, setCurrentFood] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [loadingFoods, setLoadingFoods] = useState(true);

  // Bug 4 fix: Multi-select category filter (array instead of single string)
  const [selectedCategories, setSelectedCategories] = useState([]);

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

  const [favFoods, setFavFoods] = useState([]);

  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('favorites').select('food_name').eq('user_id', user.id);
    if (data) setFavFoods(data.map(f => f.food_name));
  }, [user?.id]);

  useEffect(() => { 
    loadFoods(); 
    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', loadFavorites) : null;
    loadFavorites();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [loadFoods, loadFavorites, navigation]);

  // Task 6: Guard หลัง hooks ทุกตัว — ป้องกัน crash ตอน logout
  if (!user) return null;

  // ── สุ่มอาหาร + บันทึก history ────────────────────────────────
  // Bug 4 fix: กรองอาหารตาม categories ที่เลือก (multi-select)
  const getFilteredFoods = () => {
    if (selectedCategories.length === 0) return allFoods; // ว่าง = ทั้งหมด
    return allFoods.filter(f => selectedCategories.includes(f.category));
  };

  // Bug 4 fix: Toggle category in/out of selection array
  const toggleCategory = (value) => {
    if (value === 'All') {
      // กด "ทั้งหมด" → clear selection
      setSelectedCategories([]);
    } else {
      setSelectedCategories(prev =>
        prev.includes(value)
          ? prev.filter(c => c !== value)  // remove
          : [...prev, value]               // add
      );
    }
    // Reset card when changing filter
    setCurrentFood(null);
    setIsFlipped(false);
    flipAnim.setValue(0);
  };

  const randomizeFood = () => {
    const filteredFoods = getFilteredFoods();
    if (filteredFoods.length === 0 || isFlipping) return;
    setIsFlipping(true);

    let selected = currentFood;
    if (!isFlipped) {
      // Bug 4: สุ่มจากรายการที่กรองแล้ว (multi-category)
      selected = filteredFoods[Math.floor(Math.random() * filteredFoods.length)];
      setCurrentFood(selected);
    }

    // แอนิเมชันพลิก 0 -> 180 หรือ 180 -> 0
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 500,
      useNativeDriver: true,
    }).start(async () => {
      setIsFlipped(prev => !prev);
      setIsFlipping(false);
      
      // ถ้าเป็นการพลิกมาโชว์อาหาร ให้บันทึกประวัติ
      if (!isFlipped && selected) {
        await supabase.from('history').insert({
          user_id: user.id,
          food_name: selected.name,
          food_category: selected.category,
          mode: 'solo',
          image_url: selected.image_url,
          emoji: selected.emoji
        });
      } else {
        // ถ้าพลิกกลับไปหน้าคำถาม ให้ clear ผล
        setCurrentFood(null);
      }
    });
  };

  // Interpolations สำหรับหน้าการ์ด
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  // ── บันทึก Favorite ───────────────────────────────────────────
  const saveToFavorites = async () => {
    if (!currentFood) return;
    // Fix 3: ไม่บันทึก food_emoji เพราะ column ถูกลบออกจาก favorites table แล้ว
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      food_name: currentFood.name,
      food_category: currentFood.category,
    });
    if (error) {
      if (error.code === '23505') Alert.alert('❤️', 'มีเมนูนี้ในรายการโปรดแล้วจ้า!');
      else Alert.alert('Error', error.message);
    } else {
      Alert.alert('❤️', 'บันทึกเมนูโปรดสำเร็จ!');
      setFavFoods(prev => [...prev, currentFood.name]);
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

  // ── Task 3: อัปโหลดรูปไป Supabase Storage ──────────────────────────
  const uploadFoodImage = async (uri, category) => {
    // แก้ไขพาท: จัดเก็บรูปตามโฟลเดอร์หมวดหมู่ -> แยกด้วย user.id
    const safeCategory = category ? category.replace(/[^a-zA-Z0-9ก-๙]/g, '') : 'Other';
    const path = `${safeCategory}/${user.id}/${Date.now()}.jpg`;
    
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    
    const { error } = await supabase.storage
      .from('food-images')
      .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
      
    if (error) throw error;
    
    const { data } = supabase.storage.from('food-images').getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Task 3: บันทึกเมนูส่วนตัว (ไม่มี emoji แล้ว มี image_url แทน) ──
  const handleAddFood = async () => {
    if (!newName.trim()) { Alert.alert('⚠️', 'กรุณากรอกชื่อเมนู'); return; }
    setSavingFood(true);

    try {
      // ถ้าเลือก "อื่นๆ" ให้ใช้ custom text; ถ้าไม่ให้ใช้ค่าจาก dropdown
      const finalCategory = newCategory === 'อื่นๆ'
        ? (newCustomCategory.trim() || 'อื่นๆ')
        : newCategory;

      // อัปโหลดรูปก่อน (ถ้าเลือกไว้) พร้อมระบุหมวดหมู่
      let imageUrl = null;
      if (newImageUri) {
        imageUrl = await uploadFoodImage(newImageUri, finalCategory);
      }

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
    // Task 2: SafeAreaView เพื่อหลีกเลี่ยง notch/status bar
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Task 4: Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTER_CATEGORIES.map((cat) => {
          // Bug 4 fix: multi-select — "All" is active when array is empty
          const isActive = cat.value === 'All'
            ? selectedCategories.length === 0
            : selectedCategories.includes(cat.value);
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => toggleCategory(cat.value)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Mystery Card Flip ── */}
      <View style={styles.cardSection}>
        {loadingFoods ? (
          <View style={[styles.card, { justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <TouchableOpacity 
            onPress={randomizeFood} 
            activeOpacity={0.9} 
            disabled={isFlipping || allFoods.length === 0} 
            style={styles.cardTouchable}
          >
            {/* ── หน้าการ์ด (?) ── */}
            <Animated.View style={[
              styles.card, styles.cardFront,
              { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
            ]}>
              <Text style={styles.cardQuestion}>?</Text>
              <Text style={styles.cardHint}>แตะการ์ดเพื่อเปิดเผย</Text>
            </Animated.View>

            {/* ── หลังการ์ด (ผลลัพธ์อาหาร) ── */}
            <Animated.View style={[
              styles.card, styles.cardBack,
              { transform: [{ rotateY: backRotate }], opacity: backOpacity },
            ]}>
              {currentFood && (
                <>
                  {currentFood.image_url ? (
                    <Image source={{ uri: currentFood.image_url }} style={styles.foodImage} />
                  ) : null}
                  <Text style={styles.foodName}>{currentFood.name}</Text>
                  <View style={styles.tagContainer}>
                    <Text style={styles.tag}>{currentFood.category}</Text>
                    <Text style={styles.priceTag}>฿ {currentFood.price}</Text>
                  </View>
                  {currentFood.source === 'custom' && (
                    <Text style={styles.customBadge}>⭐ เมนูของคุณ</Text>
                  )}
                  {(() => {
                    const isFav = favFoods.includes(currentFood.name);
                    return (
                      <TouchableOpacity 
                        style={[styles.favBtn, isFav && { backgroundColor: '#F0F0F0', borderColor: '#CCC' }]} 
                        onPress={saveToFavorites} 
                        disabled={isFlipping || isFav}
                      >
                        <Text style={[styles.favBtnText, isFav && { color: '#999' }]}>
                          {isFav ? '❤️ บันทึกแล้ว' : '❤️ บันทึกเมนูโปรด'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </>
              )}
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* ปุ่มหลัก */}
      <TouchableOpacity 
        style={[styles.randomButton, (isFlipping || allFoods.length === 0) && { opacity: 0.6 }]} 
        onPress={randomizeFood} 
        disabled={isFlipping || allFoods.length === 0}
      >
        <Text style={styles.randomButtonText}>
          {isFlipping ? '✨ กำลังเปิดเผย...' : isFlipped ? '🔄 สุ่มใหม่อีกครั้ง' : '🎲 เริ่มสุ่มเมนู'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  // Task 4: Filter chips styles
  filterScroll: { flexGrow: 0, marginTop: 12, marginBottom: 4 },
  filterRow: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF5EE', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#FFD8B4',
  },
  filterChipActive: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#8B2626' },
  filterChipTextActive: { color: '#FFF' },
  cardSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    height: 320,
    justifyContent: 'center',
  },
  cardTouchable: {
    width: '85%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.white, width: '100%', height: '100%', padding: 20, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 8,
    justifyContent: 'center',
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  cardFront: {
    backgroundColor: COLORS.secondary,
    borderWidth: 8,
    borderColor: '#FFF',
  },
  cardBack: {
    backgroundColor: COLORS.white,
  },
  cardQuestion: {
    fontSize: 100,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  cardHint: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 10,
    fontWeight: '600',
  },
  // รูปภาพในการ์ดอาหาร
  foodImage: { width: 120, height: 120, borderRadius: 16, marginBottom: 15 },
  noImagePlaceholder: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999', fontSize: 13, fontWeight: '600' },
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
  // Bug 5 fix: flexGrow ensures modal content stays at the bottom
  modalScroll: { justifyContent: 'flex-end', flexGrow: 1 },
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TouchableOpacity,
  View
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const WHEEL_ITEMS = [
  { emoji: '🍛', color: '#E74C3C' },
  { emoji: '🍣', color: '#E67E22' },
  { emoji: '🍔', color: '#F39C12' },
  { emoji: '🌶️', color: '#27AE60' },
  { emoji: '🍕', color: '#2980B9' },
  { emoji: '🍗', color: '#8E44AD' },
  { emoji: '🍲', color: '#16A085' },
  { emoji: '🥗', color: '#D35400' },
];

const CATEGORIES = [
  { emoji: '🍜', label: 'อาหารไทย', value: 'Thai' },
  { emoji: '🍣', label: 'ญี่ปุ่น',  value: 'Japanese' },
  { emoji: '🥗', label: 'สุขภาพ',   value: 'Healthy' },
  { emoji: '☕', label: 'คาเฟ่',    value: 'Cafe' },
  { emoji: '🍔', label: 'ฟาสต์ฟู้ด', value: 'Fast Food' },
  { emoji: '🍲', label: 'ปาร์ตี้',  value: 'Party' },
];

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [foods, setFoods] = useState([]);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [pickedFood, setPickedFood] = useState(null);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [isFlipped, setIsFlipped] = useState(false);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [isFlipping, setIsFlipping] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ

  const [favFoods, setFavFoods] = useState([]);
  // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
  const [avatar, setAvatar] = useState(null);

  const loadFoods = async () => {
    const { data } = await supabase.from('foods').select('*');
    if (data) setFoods(data);
  };

  const loadFavorites = async () => {
    if (!user) return;
    const { data } = await supabase.from('favorites').select('food_name').eq('user_id', user.id);
    if (data) setFavFoods(data.map(f => f.food_name));
  };

  const loadAvatar = async () => {
    if (!user) return;
    const cachedUrl = await AsyncStorage.getItem('avatar_url_' + user.id);
    if (cachedUrl) {
      setAvatar(cachedUrl);
    } else {
      const path = `${user.id}/avatar.jpg`;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (data?.publicUrl) setAvatar(data.publicUrl + '?t=' + Date.now());
    }
  };

  // 🔄 useEffect: ฟังก์ชันนี้จะทำงานอัตโนมัติเมื่อหน้านี้ถูกโหลดเปิดขึ้นมา

  useEffect(() => { 
    loadFoods();
    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
      loadAvatar();
    });
    // load initially as well
    loadFavorites();
    loadAvatar();
    return unsubscribe;
  }, [navigation, user]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  const handleFlip = () => {
    if (isFlipping || foods.length === 0) return;
    setIsFlipping(true);

    let picked = pickedFood;
    if (!isFlipped) {
      // สุ่มอาหารก่อนพลิก
      picked = foods[Math.floor(Math.random() * foods.length)];
      setPickedFood(picked);
    }

    // Flip animation: 0 → 180 (พลิกไปหน้าหลัง) หรือ 180 → 0 (พลิกกลับ)
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 500,
      useNativeDriver: true,
    }).start(async () => {
      setIsFlipped(prev => !prev);
      setIsFlipping(false);

      if (!isFlipped && picked && user) {
        // บันทึกลง history
        // 💾 [Backend] เพิ่มข้อมูลใหม่ลงในฐานข้อมูล (INSERT)
        await supabase.from('history').insert({
          user_id: user.id,
          food_name: picked.name,
          food_category: picked.category,
          mode: 'solo',
          image_url: picked.image_url,
          emoji: picked.emoji
        });
      }

      // ถ้าพลิกกลับแล้ว clear ผล เพื่อสุ่มใหม่ได้
      if (isFlipped) setPickedFood(null);
    });
  };

  const saveToFavorites = async () => {
    if (!pickedFood || !user) return;
    const { error } = await supabase.from('favorites').insert({
      user_id: user.id,
      food_name: pickedFood.name,
      food_category: pickedFood.category
    });
    if (error) {
      if (error.code === '23505') Alert.alert('❤️', 'มีเมนูนี้ในรายการโปรดแล้วจ้า!');
      else Alert.alert('Error', error.message);
    } else {
      // 🔔 โชว์กล่องข้อความแจ้งเตือนผู้ใช้
      Alert.alert('❤️', 'บันทึกเมนูโปรดสำเร็จ!');
      setFavFoods(prev => [...prev, pickedFood.name]);
    }
  };
  // Interpolations สำหรับหน้าหน้า/หน้าหลังการ์ด
  const frontRotate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1] });

  const cardColor = pickedFood ? WHEEL_ITEMS[foods.indexOf(pickedFood) % 8]?.color ?? COLORS.primary : COLORS.primary;

  // 🎨 ==========================================

  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

  // 🎨 ==========================================

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Text style={{ fontSize: 22 }}>🍴</Text>
            <Text style={styles.logoText}>What<Text style={styles.logo2}>2</Text>Eat</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Search')}>
              <Text style={{ fontSize: 18 }}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('AccountTab')}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
              ) : (
                <Text style={{ fontSize: 22 }}>👤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingSub}>{getGreeting()}, {user ? user.name_account : 'คุณ'}!</Text>
          <Text style={styles.greetingMain}>วันนี้อยากทานอะไรดี?</Text>
        </View>

        {/* ── Search bar ── */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <Text style={styles.searchPlaceholder}>ค้นหาอาหาร, เมนู, หรือหมวดหมู่...</Text>
        </TouchableOpacity>


        {/* ── Mystery Card Flip ── */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>🃏 สุ่มเมนูลับ!</Text>
          <Text style={styles.cardSubtitle}>
            {isFlipped ? 'กดพลิกเพื่อสุ่มใหม่' : 'กดการ์ดหรือปุ่มเพื่อสุ่มเมนู'}
          </Text>

          {/* Card container */}
          <TouchableOpacity onPress={handleFlip} activeOpacity={0.9} disabled={isFlipping} style={styles.cardTouchable}>
            {/* หน้าการ์ด (?) */}
            <Animated.View style={[
              styles.card, styles.cardFront,
              { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
            ]}>
              <Text style={styles.cardQuestion}>?</Text>
              <Text style={styles.cardHint}>แตะเพื่อเปิดเผย</Text>
            </Animated.View>

            {/* หลังการ์ด (อาหาร) */}
            <Animated.View style={[
              styles.card, styles.cardBack,
              { backgroundColor: cardColor, transform: [{ rotateY: backRotate }], opacity: backOpacity },
            ]}>
              {pickedFood && (
                <>
                  {pickedFood.image_url ? (
                    <Image source={{ uri: pickedFood.image_url }} style={styles.foodImage} />
                  ) : null}
                  <Text style={[styles.cardFoodName, pickedFood.image_url && { marginTop: 10 }]}>{pickedFood.name}</Text>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{pickedFood.category}</Text>
                  </View>
                  <Text style={styles.cardPrice}>฿{pickedFood.price}</Text>
                  
                  {(() => {
                    const isFav = favFoods.includes(pickedFood.name);
                    // 🎨 ==========================================
                    // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
                    // 🎨 ==========================================
                    return (
                      <TouchableOpacity 
                        style={[styles.favBtn, isFav && { backgroundColor: '#F0F0F0', borderColor: '#CCC' }]} 
                        onPress={saveToFavorites} 
                        disabled={isFlipping || isFav}
                      >
                        <Text style={[styles.favBtnText, isFav && { color: '#999' }]}>
                          {isFav ? '❤️ บันทึกแล้ว' : '❤️ บันทึกโปรด'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                </>
              )}
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.flipBtn, (isFlipping || foods.length === 0) && { opacity: 0.6 }]}
            onPress={handleFlip}
            disabled={isFlipping || foods.length === 0}
          >
            <Text style={styles.flipBtnText}>
              {isFlipping ? '✨ กำลังเปิดเผย...' : isFlipped ? '🔄 สุ่มใหม่' : '🎲 สุ่มเมนู!'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Party Banner ── */}
        <TouchableOpacity style={styles.partyBanner} onPress={() => navigation.navigate('Party')} activeOpacity={0.85}>
          <Text style={{ fontSize: 30 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.partyBannerTitle}>สุ่มกับเพื่อน</Text>
            <Text style={styles.partyBannerSub}>สร้างห้องและโหวตอาหารร่วมกัน</Text>
          </View>
          <Text style={{ fontSize: 20, color: '#fff' }}></Text>
        </TouchableOpacity>

        {/* ── Popular foods ── */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🍽️ เมนูยอดนิยม</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllFoods')}>
              <Text style={styles.seeAll}>ดูทั้งหมด</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {foods.map((food, idx) => (
              <View key={food.id} style={styles.foodCard}>
                <View style={[styles.foodCardImg, { backgroundColor: WHEEL_ITEMS[idx % 8].color }]}>
                  {food.image_url ? (
                    <Image source={{ uri: food.image_url }} style={{ width: '100%', height: '100%' }} />
                  ) : null}
                </View>
                <Text style={styles.foodCardName} numberOfLines={1}>{food.name}</Text>
                <Text style={styles.foodCardCat}>{food.category}</Text>
                <Text style={styles.foodCardPrice}>฿{food.price}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Quick links ── */}
        <View style={styles.quickLinks}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('History')}>
            <Text style={{ fontSize: 24 }}>🕒</Text>
            <Text style={styles.quickBtnText}>ประวัติ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('AllFoods')}>
            <Text style={{ fontSize: 24 }}>🍽️</Text>
            <Text style={styles.quickBtnText}>เมนูทั้งหมด</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('FavTab')}>
            <Text style={{ fontSize: 24 }}>❤️</Text>
            <Text style={styles.quickBtnText}>เมนูโปรด</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoText: { fontSize: 22, fontWeight: '900', color: '#2C3E50' },
  logo2: { color: COLORS.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE8D6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary },
  // Greeting
  greetingBox: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  greetingSub: { fontSize: 15, color: '#888', fontWeight: '500' },
  greetingMain: { fontSize: 26, fontWeight: '900', color: '#2C3E50', marginTop: 4 },
  // Search
  searchBar: { marginHorizontal: 20, backgroundColor: '#F7F7F7', borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB' },
  searchPlaceholder: { flex: 1, color: '#bbb', fontSize: 14 },
  // Categories
  catRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  catChip: { alignItems: 'center', backgroundColor: '#FFF5EE', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#FFD8B4', gap: 4, minWidth: 72 },
  catLabel: { fontSize: 11, fontWeight: '700', color: '#8B2626', textAlign: 'center' },
  // Card Section
  cardSection: { marginHorizontal: 20, backgroundColor: '#FFF8F0', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFDFC0' },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#8B2626', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  cardTouchable: { width: 220, height: 260, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: COLORS.white, width: '100%', height: '100%', borderRadius: 24, alignItems: 'center', justifyContent: 'center', position: 'absolute', backfaceVisibility: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  cardFront: { backgroundColor: COLORS.secondary, borderWidth: 6, borderColor: '#FFF' },
  cardBack: { backgroundColor: COLORS.white, padding: 20 },
  cardQuestion: { fontSize: 80, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  cardHint: { fontSize: 14, color: '#FFF', marginTop: 10, fontWeight: '600' },
  noImagePlaceholder: { backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
  noImageText: { color: '#999', fontSize: 13, fontWeight: '600' },
  foodImage: { width: 90, height: 90, borderRadius: 16, marginBottom: 10 },
  cardFoodName: { fontSize: 20, fontWeight: '900', color: '#2C3E50', textAlign: 'center', marginBottom: 8 },
  cardBadge: { backgroundColor: '#FFF5EE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  cardBadgeText: { fontSize: 11, color: '#8B2626', fontWeight: '700' },
  cardPrice: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  favBtn: { marginTop: 14, backgroundColor: '#FFF5F5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FFD1D1' },
  favBtnText: { fontSize: 13, color: '#E74C3C', fontWeight: 'bold' },
  flipBtn: { marginTop: 24, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 44, borderRadius: 28, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  flipBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  // Party
  partyBanner: { marginHorizontal: 20, backgroundColor: '#8B2626', borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 14 },
  partyBannerTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  partyBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  // Popular
  popularSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#2C3E50' },
  seeAll: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  foodCard: { width: 140, marginRight: 14, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  foodCardImg: { height: 110, justifyContent: 'center', alignItems: 'center' },
  foodCardName: { fontSize: 13, fontWeight: '800', color: '#2C3E50', paddingHorizontal: 10, paddingTop: 8 },
  foodCardCat: { fontSize: 11, color: '#aaa', paddingHorizontal: 10, marginTop: 2 },
  foodCardPrice: { fontSize: 12, color: COLORS.primary, fontWeight: '700', paddingHorizontal: 10, paddingBottom: 10, marginTop: 2 },
  // Quick links
  quickLinks: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginTop: 4 },
  quickBtn: { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
  quickBtnText: { fontSize: 12, fontWeight: '700', color: '#555', textAlign: 'center' },
});




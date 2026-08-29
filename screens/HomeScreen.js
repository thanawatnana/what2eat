import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Animated, Easing, Dimensions, StatusBar,
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

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);
  const [spinResult, setSpinResult] = useState(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const totalRot  = useRef(0);

  useEffect(() => { loadFoods(); }, []);

  const loadFoods = async () => {
    const { data } = await supabase.from('foods').select('*').limit(8);
    if (data) setFoods(data);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  const handleSpin = () => {
    if (isSpinning || foods.length === 0) return;
    setIsSpinning(true);
    setSpinResult(null);
    totalRot.current += 1440 + Math.floor(Math.random() * 360);
    Animated.timing(spinAnim, {
      toValue: totalRot.current,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setSpinResult(foods[Math.floor(Math.random() * foods.length)]);
    });
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

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
              <Text style={{ fontSize: 22 }}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Greeting ── */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingSub}>{getGreeting()}, {user ? user.name_account : 'คุณ'}!</Text>
          <Text style={styles.greetingMain}>วันนี้อยากทานอะไรดี?</Text>
        </View>

        {/* ── Search bar (tappable → SearchScreen) ── */}
        <TouchableOpacity style={styles.searchBar} onPress={() => navigation.navigate('Search')} activeOpacity={0.8}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <Text style={styles.searchPlaceholder}>ค้นหาอาหาร, เมนู, หรือหมวดหมู่...</Text>
        </TouchableOpacity>

        {/* ── Category chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((cat, i) => (
            <TouchableOpacity key={i} style={styles.catChip}
              onPress={() => navigation.navigate('AllFoods', { category: cat.value })}>
              <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Spin Wheel Section ── */}
        <View style={styles.spinSection}>
          <Text style={styles.spinTitle}>ให้วงล้อช่วยตัดสินใจ!</Text>

          {/* Pointer */}
          <View style={styles.pointerWrap}>
            <View style={styles.pointer} />
          </View>

          {/* Wheel */}
          <Animated.View style={[styles.wheel, { transform: [{ rotate: spin }] }]}>
            {WHEEL_ITEMS.map((item, i) => {
              const angle = ((i / WHEEL_ITEMS.length) * 2 * Math.PI) - (Math.PI / 2);
              const R = 72;
              return (
                <View key={i} style={[styles.wheelDot, {
                  backgroundColor: item.color,
                  left: 90 + Math.cos(angle) * R - 24,
                  top:  90 + Math.sin(angle) * R - 24,
                }]}>
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                </View>
              );
            })}
            <View style={styles.wheelCenter}>
              <Text style={styles.wheelCenterText}>{'หมุนเพื่อ\nสุ่มอาหาร!'}</Text>
            </View>
          </Animated.View>

          {/* Result */}
          {spinResult && (
            <View style={styles.resultBox}>
              <Text style={{ fontSize: 36 }}>{spinResult.emoji}</Text>
              <Text style={styles.resultName}>{spinResult.name}</Text>
              <Text style={styles.resultCat}>{spinResult.category} • ฿{spinResult.price}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.spinBtn, (isSpinning || foods.length === 0) && { opacity: 0.6 }]}
            onPress={handleSpin}
            disabled={isSpinning || foods.length === 0}
          >
            <Text style={styles.spinBtnText}>{isSpinning ? '⏳ กำลังหมุน...' : '🎲 หมุนเลย!'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Party Banner ── */}
        <TouchableOpacity style={styles.partyBanner} onPress={() => navigation.navigate('Party')} activeOpacity={0.85}>
          <Text style={{ fontSize: 30 }}>🔥</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.partyBannerTitle}>สุ่มกับเพื่อน!</Text>
            <Text style={styles.partyBannerSub}>สร้างห้องและโหวตอาหารร่วมกัน</Text>
          </View>
          <Text style={{ fontSize: 20, color: '#fff' }}>→</Text>
        </TouchableOpacity>

        {/* ── Popular foods ── */}
        <View style={styles.popularSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🍽️ เมนูยอดนิยม</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllFoods')}>
              <Text style={styles.seeAll}>ดูทั้งหมด →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
            {foods.map((food, idx) => (
              <View key={food.id} style={styles.foodCard}>
                <View style={[styles.foodCardImg, { backgroundColor: WHEEL_ITEMS[idx % 8].color }]}>
                  <Text style={{ fontSize: 38 }}>{food.emoji}</Text>
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
            <Text style={styles.quickBtnText}>โปรด</Text>
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
  // Spin section
  spinSection: { marginHorizontal: 20, backgroundColor: '#FFF8F0', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFDFC0' },
  spinTitle: { fontSize: 17, fontWeight: '800', color: '#8B2626', marginBottom: 16 },
  pointerWrap: { alignItems: 'center', marginBottom: -6, zIndex: 10 },
  pointer: { width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: COLORS.primary },
  wheel: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#fff9', borderWidth: 5, borderColor: COLORS.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  wheelDot: { position: 'absolute', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#fff' },
  wheelCenter: { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.primary, top: 62, left: 62, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  wheelCenterText: { color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center', lineHeight: 15 },
  resultBox: { marginTop: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: COLORS.primary },
  resultName: { fontSize: 18, fontWeight: '900', color: '#2C3E50', marginTop: 6 },
  resultCat: { fontSize: 12, color: '#aaa', marginTop: 2 },
  spinBtn: { marginTop: 16, backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 44, borderRadius: 28, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  spinBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
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



import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, Dimensions, StatusBar, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const AVATAR_CACHE_KEY = 'avatar_url_';

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [foods, setFoods] = useState([]);

  // Task 5: Profile avatar state
  const [avatarUrl, setAvatarUrl] = useState(null);

  const loadFoods = async () => {
    const { data } = await supabase.from('foods').select('*');
    if (data) setFoods(data);
  };

  // Task 5: โหลด avatar URL จาก Supabase Storage
  const loadAvatar = async () => {
    if (!user || user.is_guest) return;
    try {
      // ลองจาก cache ก่อน
      const cachedUrl = await AsyncStorage.getItem(AVATAR_CACHE_KEY + user.id);
      if (cachedUrl) setAvatarUrl(cachedUrl);

      // โหลดจาก Supabase
      const path = `${user.id}/avatar.jpg`;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (data?.publicUrl) {
        const url = data.publicUrl + '?t=' + user.id.slice(0, 8);
        setAvatarUrl(url);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => { 
    loadFoods();
    loadAvatar();
  }, [navigation, user]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'อรุณสวัสดิ์';
    if (h < 17) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

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
            {/* Task 5: แสดง profile picture จริง หรือ fallback */}
            <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('AccountTab')}>
              {avatarUrl && !user?.is_guest ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
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

        {/* ── Task 3: Action Buttons (แทนที่ Card Flip) ── */}
        <View style={styles.actionSection}>
          <Text style={styles.actionSectionTitle}>🎯 เลือกโหมด</Text>
          <Text style={styles.actionSectionSub}>ไม่รู้จะกินอะไร? ให้เราช่วยเลือกให้!</Text>

          <View style={styles.actionBtnRow}>
            {/* ปุ่มสุ่มอาหาร */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('SoloTab')}
              activeOpacity={0.85}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: COLORS.primary }]}>
                <Text style={{ fontSize: 36 }}>🎲</Text>
              </View>
              <Text style={styles.actionBtnTitle}>สุ่มอาหาร</Text>
              <Text style={styles.actionBtnDesc}>สุ่มเมนูจากเมนูทั้งหมด</Text>
            </TouchableOpacity>

            {/* ปุ่มสุ่มกับเพื่อน */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate('Party')}
              activeOpacity={0.85}
            >
              <View style={[styles.actionBtnIcon, { backgroundColor: COLORS.secondary }]}>
                <Text style={{ fontSize: 36 }}>🔥</Text>
              </View>
              <Text style={styles.actionBtnTitle}>สุ่มกับเพื่อน!</Text>
              <Text style={styles.actionBtnDesc}>สร้างห้องโหวตร่วมกัน</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  // Task 5: Avatar button with image support
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFE8D6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, overflow: 'hidden' },
  avatarImg: { width: 40, height: 40, borderRadius: 20 },
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
  // Task 3: Action Section (แทนที่ Card Flip)
  actionSection: {
    marginHorizontal: 20, backgroundColor: '#FFF8F0', borderRadius: 24,
    padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#FFDFC0',
  },
  actionSectionTitle: { fontSize: 18, fontWeight: '900', color: '#8B2626', textAlign: 'center', marginBottom: 4 },
  actionSectionSub: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 18 },
  actionBtnRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 18,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 4, borderWidth: 1, borderColor: '#F0E0D0',
  },
  actionBtnIcon: {
    width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  actionBtnTitle: { fontSize: 15, fontWeight: '900', color: '#2C3E50', marginBottom: 4 },
  actionBtnDesc: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 15 },
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
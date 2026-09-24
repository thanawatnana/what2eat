import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';
import { pickWeightedAd } from '../utils/weightedAds';

const ROTATION_DELAY_MS = 6000;

export default function AdCarousel() {
  const [ads, setAds] = useState([]);
  const [currentAd, setCurrentAd] = useState(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const impressionKey = useRef(null);

  const loadAds = useCallback(async () => {
    let latitude = null;
    let longitude = null;
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === 'granted') {
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        latitude = null;
        longitude = null;
      }
    }

    const { data, error } = await supabase.rpc('get_targeted_ads', {
      p_lat: latitude,
      p_lng: longitude,
      p_limit: 20,
    });

    if (error || !data?.length) {
      setAds([]);
      setCurrentAd(null);
      return;
    }

    setAds(data);
    setCurrentAd(pickWeightedAd(data));
  }, []);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  useEffect(() => {
    if (ads.length === 0) return undefined;
    const timer = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setCurrentAd(pickWeightedAd(ads));
        Animated.timing(opacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();
      });
    }, ROTATION_DELAY_MS);
    return () => clearInterval(timer);
  }, [ads, opacity]);

  useEffect(() => {
    if (!currentAd?.id || impressionKey.current === currentAd.id) return;
    impressionKey.current = currentAd.id;
    supabase.rpc('record_ad_event', { p_ad_id: currentAd.id, p_event_type: 'impression' });
  }, [currentAd?.id]);

  const openTarget = async () => {
    if (!currentAd?.target_url) return;
    await supabase.rpc('record_ad_event', { p_ad_id: currentAd.id, p_event_type: 'click' });
    const supported = await Linking.canOpenURL(currentAd.target_url);
    if (supported) await Linking.openURL(currentAd.target_url);
  };

  if (!currentAd) {
    return (
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.label}>พื้นที่โฆษณา</Text>
          <Text style={styles.slot}>ตำแหน่งหน้าแรก</Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>พื้นที่สำหรับโปรโมทร้าน</Text>
          <Text style={styles.placeholderSub}>รูปแนวนอน เมนู หรือโปรโมชันของร้าน</Text>
        </View>
        <Text style={styles.title}>สนใจโปรโมทร้านบน Joykin</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('tel:0979253802')}
          accessibilityRole="link"
          accessibilityLabel="โทร 097-9253802 เพื่อติดต่อโฆษณา"
        >
          <Text style={styles.phone}>ติดต่อ 097-9253802</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.label}>ผู้สนับสนุน</Text>
        <Text style={styles.slot}>{currentAd.package_name || 'พื้นที่แนะนำ'}</Text>
      </View>
      <TouchableOpacity
        disabled={!currentAd.target_url}
        onPress={openTarget}
        activeOpacity={0.86}
        accessibilityRole={currentAd.target_url ? 'link' : 'image'}
        accessibilityLabel={currentAd.title}
      >
        <Animated.View style={{ opacity }}>
          <Image source={{ uri: currentAd.image_url }} style={styles.image} resizeMode="cover" />
          <View style={styles.captionRow}>
            <Text style={styles.title} numberOfLines={1}>{currentAd.title}</Text>
            {currentAd.target_url ? <Text style={styles.action}>ดูเพิ่มเติม</Text> : null}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { color: COLORS.secondary, fontSize: 12, fontWeight: '900' },
  slot: { color: '#888', fontSize: 10, fontWeight: '700' },
  placeholder: {
    height: 128,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C8C8C8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
  },
  placeholderTitle: { fontSize: 15, color: '#555', fontWeight: '800', textAlign: 'center' },
  placeholderSub: { fontSize: 11, color: '#888', marginTop: 5, textAlign: 'center' },
  image: { width: '100%', height: 150, borderRadius: 14, backgroundColor: '#E9ECEF' },
  captionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 11, gap: 10 },
  title: { flex: 1, fontSize: 14, fontWeight: '800', color: '#333' },
  phone: { marginTop: 4, fontSize: 16, fontWeight: '900', color: COLORS.primary },
  action: { color: COLORS.primary, fontSize: 12, fontWeight: '800' },
});

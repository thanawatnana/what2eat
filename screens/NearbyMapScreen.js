import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS } from '../constants/theme';
import { createDemoPlaces, fetchNearbyPlaces } from '../services/nearbyPlaces';

const DEMO_CENTER = { latitude: 13.7563, longitude: 100.5018 };

const formatDistance = distanceKm => distanceKm < 1
  ? `${Math.max(1, Math.round(distanceKm * 1000))} เมตร`
  : `${distanceKm.toFixed(1)} กม.`;

export default function NearbyMapScreen({ route }) {
  const foodName = String(route?.params?.foodName || '').trim();
  const [center, setCenter] = useState(DEMO_CENTER);
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [areaName, setAreaName] = useState('พื้นที่ตัวอย่าง กรุงเทพมหานคร');
  const [status, setStatus] = useState('demo');
  const [loading, setLoading] = useState(true);

  const useDemo = useCallback((origin = DEMO_CENTER, message = 'กำลังแสดงข้อมูลตัวอย่าง') => {
    const demo = createDemoPlaces(origin, foodName);
    setCenter(origin);
    setPlaces(demo);
    setSelected(demo[0]);
    setStatus('demo');
    setAreaName(message);
  }, [foodName]);

  const loadNearby = useCallback(async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        useDemo(DEMO_CENTER, 'ไม่ได้รับสิทธิ์ตำแหน่ง จึงแสดงพื้นที่ตัวอย่าง');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCenter(current);

      try {
        const addresses = await Location.reverseGeocodeAsync(current);
        const address = addresses[0];
        const readable = [address?.district, address?.subregion, address?.city, address?.region]
          .filter(Boolean)
          .filter((value, index, values) => values.indexOf(value) === index)
          .join(', ');
        setAreaName(readable || 'บริเวณตำแหน่งปัจจุบัน');
      } catch {
        setAreaName('บริเวณตำแหน่งปัจจุบัน');
      }

      try {
        const nearby = await fetchNearbyPlaces(current, foodName ? 5000 : 3000, foodName);
        if (!nearby.length) {
          useDemo(current, 'ไม่พบข้อมูลร้าน จึงแสดงร้านตัวอย่างรอบตำแหน่งของคุณ');
          return;
        }
        setPlaces(nearby);
        setSelected(nearby[0]);
        setStatus('live');
      } catch {
        useDemo(current, 'บริการร้านใกล้เคียงไม่พร้อม จึงแสดงข้อมูลตัวอย่าง');
      }
    } catch {
      useDemo(DEMO_CENTER, 'ไม่สามารถอ่าน GPS ได้ จึงแสดงพื้นที่ตัวอย่าง');
    } finally {
      setLoading(false);
    }
  }, [useDemo]);

  useEffect(() => {
    void loadNearby();
  }, [loadNearby]);

  const openDirections = place => {
    const query = `${place.latitude},${place.longitude}`;
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNearby} tintColor={COLORS.primary} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.intro}>
          <Text style={styles.title}>{foodName ? `ร้านที่น่าจะขาย ${foodName}` : 'ร้านและเมนูใกล้คุณ'}</Text>
          <Text style={styles.subtitle}>{areaName}</Text>
          {foodName ? (
            <View style={styles.foodQueryBadge}>
              <Text style={styles.foodQueryText}>ผลการสุ่ม: {foodName}</Text>
            </View>
          ) : null}
          <View style={[styles.sourceBadge, status === 'live' ? styles.liveBadge : styles.demoBadge]}>
            <Text style={styles.sourceText}>
              {status === 'live' ? 'ข้อมูลร้านจริงจาก OpenStreetMap' : 'ข้อมูลตัวอย่างสำหรับแสดงระบบ'}
            </Text>
          </View>
        </View>

        <View style={styles.mapFrame}>
          <MapView
            key={`${center.latitude}-${center.longitude}`}
            style={styles.map}
            initialRegion={{
              ...center,
              latitudeDelta: 0.035,
              longitudeDelta: 0.035,
            }}
            showsUserLocation={status === 'live'}
            showsMyLocationButton={status === 'live'}
          >
            {places.map(place => (
              <Marker
                key={place.id}
                coordinate={{ latitude: place.latitude, longitude: place.longitude }}
                title={place.name}
                description={`${place.category} ระยะ ${formatDistance(place.distanceKm)}`}
                pinColor={selected?.id === place.id ? COLORS.secondary : COLORS.primary}
                onPress={() => setSelected(place)}
              />
            ))}
          </MapView>
          {loading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>กำลังค้นหาร้านรอบตัวคุณ</Text>
            </View>
          ) : null}
        </View>

        {selected ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName}>{selected.name}</Text>
                <Text style={styles.placeMeta}>{selected.category} · {formatDistance(selected.distanceKm)}</Text>
                {foodName && selected.matchScore > 0 ? <Text style={styles.matchText}>ตรงกับประเภทของเมนูที่สุ่มได้</Text> : null}
              </View>
              <TouchableOpacity style={styles.directionButton} onPress={() => openDirections(selected)}>
                <Text style={styles.directionText}>เปิดเส้นทาง</Text>
              </TouchableOpacity>
            </View>
            {selected.address ? <Text style={styles.address}>{selected.address}</Text> : null}
            {selected.openingHours ? <Text style={styles.address}>เวลาเปิด: {selected.openingHours}</Text> : null}
            <Text style={styles.menuTitle}>{foodName ? `เมนูที่เกี่ยวข้องกับ ${foodName}` : 'เมนูที่น่าจะพบ'}</Text>
            <View style={styles.menuRow}>
              {selected.menus.map(menu => (
                <View key={menu} style={styles.menuChip}>
                  <Text style={styles.menuText}>{menu}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>ร้านใกล้เคียง {places.length} แห่ง</Text>
          <Text style={styles.listHint}>แตะร้านเพื่อดูตำแหน่งและเมนู</Text>
        </View>
        {places.map(place => (
          <TouchableOpacity
            key={place.id}
            style={[styles.placeCard, selected?.id === place.id && styles.placeCardSelected]}
            onPress={() => setSelected(place)}
          >
            <View style={styles.placeInitial}>
              <Text style={styles.placeInitialText}>{place.name.trim().charAt(0) || 'ร'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeCardName}>{place.name}</Text>
              <Text style={styles.placeCardMeta}>{place.category} · {formatDistance(place.distanceKm)}</Text>
              <Text style={styles.placeMenus} numberOfLines={1}>{place.menus.join(' · ')}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.attribution}>ข้อมูลแผนที่โดย OpenStreetMap contributors</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 32 },
  intro: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  title: { fontSize: 25, fontWeight: '900', color: '#2C3E50' },
  subtitle: { marginTop: 4, fontSize: 14, color: '#777' },
  foodQueryBadge: { alignSelf: 'flex-start', marginTop: 9, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, backgroundColor: '#EAF3E5' },
  foodQueryText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  sourceBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  liveBadge: { backgroundColor: '#E8F5E9' },
  demoBadge: { backgroundColor: '#FFF3E0' },
  sourceText: { fontSize: 11, fontWeight: '700', color: '#555' },
  mapFrame: { height: 330, marginHorizontal: 20, borderRadius: 22, overflow: 'hidden', backgroundColor: '#EEE' },
  map: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.88)' },
  loadingText: { color: '#666', marginTop: 10, fontSize: 13, fontWeight: '600' },
  detailCard: { margin: 20, marginBottom: 8, padding: 18, borderRadius: 20, backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.border },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeName: { fontSize: 18, fontWeight: '900', color: '#2C3E50' },
  placeMeta: { marginTop: 3, color: COLORS.secondary, fontSize: 12, fontWeight: '700' },
  matchText: { marginTop: 4, color: COLORS.accent, fontSize: 10, fontWeight: '700' },
  directionButton: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  directionText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  address: { marginTop: 8, color: '#666', fontSize: 12 },
  menuTitle: { marginTop: 14, marginBottom: 8, fontSize: 13, fontWeight: '800', color: '#333' },
  menuRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  menuChip: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#F0D7C2' },
  menuText: { color: '#555', fontSize: 11, fontWeight: '600' },
  listHeader: { paddingHorizontal: 20, marginTop: 18, marginBottom: 10 },
  listTitle: { fontSize: 18, fontWeight: '900', color: '#2C3E50' },
  listHint: { fontSize: 12, color: '#888', marginTop: 3 },
  placeCard: { marginHorizontal: 20, marginBottom: 10, padding: 13, borderRadius: 16, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.border },
  placeCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  placeInitial: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.secondary },
  placeInitialText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  placeCardName: { fontSize: 14, fontWeight: '800', color: '#333' },
  placeCardMeta: { color: COLORS.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  placeMenus: { color: '#888', fontSize: 11, marginTop: 4 },
  attribution: { textAlign: 'center', color: '#AAA', fontSize: 10, marginTop: 18, paddingHorizontal: 20 },
});

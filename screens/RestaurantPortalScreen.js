import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { discardUpload, IMAGE_PICKER_OPTIONS, uploadImage } from '../utils/imageUpload';

const EMPTY_RESTAURANT = {
  name: '', description: '', categories: '', phone: '', address: '', latitude: '', longitude: '',
};

const EMPTY_CAMPAIGN = {
  title: '', targetUrl: '', categories: '', radius: '5', startTime: '', endTime: '',
  packageId: '', targetDays: [0, 1, 2, 3, 4, 5, 6], imageUri: null, imageBase64: null,
};

const TARGET_DAYS = [
  { value: 1, label: 'จ' }, { value: 2, label: 'อ' }, { value: 3, label: 'พ' },
  { value: 4, label: 'พฤ' }, { value: 5, label: 'ศ' }, { value: 6, label: 'ส' },
  { value: 0, label: 'อา' },
];

const STATUS_LABELS = {
  pending: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ต้องแก้ไข', suspended: 'ระงับการใช้งาน',
  draft: 'แบบร่าง', pending_review: 'รอตรวจโฆษณา', active: 'กำลังแสดง', paused: 'หยุดชั่วคราว', expired: 'หมดอายุ',
};

export default function RestaurantPortalScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRestaurant, setSavingRestaurant] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [restaurantForm, setRestaurantForm] = useState(EMPTY_RESTAURANT);
  const [packages, setPackages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);

  const loadPortal = useCallback(async (quiet = false) => {
    if (!user?.id || user.is_guest) {
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    const { data: restaurantRow, error: restaurantError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();
    if (restaurantError) Alert.alert('โหลดบัญชีร้านไม่สำเร็จ', restaurantError.message);
    setRestaurant(restaurantRow || null);
    if (restaurantRow) {
      setRestaurantForm({
        name: restaurantRow.name || '',
        description: restaurantRow.description || '',
        categories: (restaurantRow.cuisine_categories || []).join(', '),
        phone: restaurantRow.phone || '',
        address: restaurantRow.address || '',
        latitude: String(restaurantRow.latitude ?? ''),
        longitude: String(restaurantRow.longitude ?? ''),
      });
    }

    const { data: packageRows } = await supabase
      .from('ad_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_amount');
    setPackages(packageRows || []);

    if (restaurantRow) {
      const { data: campaignRows, error: campaignError } = await supabase
        .from('advertisements')
        .select('*, ad_packages(name, code)')
        .eq('restaurant_id', restaurantRow.id)
        .order('created_at', { ascending: false });
      if (campaignError) Alert.alert('โหลดแคมเปญไม่สำเร็จ', campaignError.message);
      setCampaigns(campaignRows || []);

      const ids = (campaignRows || []).map((item) => item.id);
      if (ids.length) {
        const { data: statRows } = await supabase
          .from('ad_daily_stats')
          .select('advertisement_id, impressions, clicks')
          .in('advertisement_id', ids);
        setStats(statRows || []);
      } else {
        setStats([]);
      }
    } else {
      setCampaigns([]);
      setStats([]);
    }
    setLoading(false);
  }, [user?.id, user?.is_guest]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const refresh = async () => {
    setRefreshing(true);
    await loadPortal(true);
    setRefreshing(false);
  };

  const updateRestaurantForm = (changes) => setRestaurantForm((current) => ({ ...current, ...changes }));
  const updateCampaignForm = (changes) => setCampaignForm((current) => ({ ...current, ...changes }));

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตตำแหน่งเพื่อระบุพิกัดร้าน');
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    updateRestaurantForm({
      latitude: position.coords.latitude.toFixed(6),
      longitude: position.coords.longitude.toFixed(6),
    });
  };

  const saveRestaurant = async () => {
    if (savingRestaurant || !user?.id || user.is_guest) return;
    const latitude = Number(restaurantForm.latitude);
    const longitude = Number(restaurantForm.longitude);
    const categories = restaurantForm.categories.split(',').map((item) => item.trim()).filter(Boolean);
    if (restaurantForm.name.trim().length < 2) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อร้านอย่างน้อย 2 ตัวอักษร');
      return;
    }
    if (restaurantForm.address.trim().length < 3) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกที่อยู่ร้าน');
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      Alert.alert('พิกัดไม่ถูกต้อง', 'กรุณาใช้ตำแหน่งปัจจุบันหรือกรอกละติจูดและลองจิจูดให้ถูกต้อง');
      return;
    }

    setSavingRestaurant(true);
    const payload = {
      owner_user_id: user.id,
      name: restaurantForm.name.trim(),
      description: restaurantForm.description.trim(),
      cuisine_categories: categories,
      phone: restaurantForm.phone.trim() || null,
      address: restaurantForm.address.trim(),
      latitude,
      longitude,
    };
    const result = restaurant
      ? await supabase.from('restaurants').update(payload).eq('id', restaurant.id).select('id')
      : await supabase.from('restaurants').insert(payload).select('id');
    setSavingRestaurant(false);
    if (result.error || !result.data?.length) {
      Alert.alert('บันทึกไม่สำเร็จ', result.error?.message || 'ไม่สามารถบันทึกบัญชีร้านได้');
      return;
    }
    await loadPortal(true);
    Alert.alert('ส่งข้อมูลแล้ว', 'ข้อมูลร้านถูกส่งให้ผู้ดูแลตรวจสอบ เมื่ออนุมัติแล้วจึงจะสร้างโฆษณาได้');
  };

  const pickCampaignImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ ...IMAGE_PICKER_OPTIONS, aspect: [16, 9] });
    const asset = result.canceled ? null : result.assets?.[0];
    if (asset?.base64) updateCampaignForm({ imageUri: asset.uri, imageBase64: asset.base64 });
  };

  const openCampaignForm = (campaign = null) => {
    setEditingCampaign(campaign);
    setCampaignForm(campaign ? {
      title: campaign.title || '',
      targetUrl: campaign.target_url || '',
      categories: (campaign.target_categories || []).join(', '),
      radius: String(campaign.target_radius_km || 5),
      startTime: campaign.target_start_time?.slice(0, 5) || '',
      endTime: campaign.target_end_time?.slice(0, 5) || '',
      packageId: campaign.package_id || '',
      targetDays: campaign.target_days || [0, 1, 2, 3, 4, 5, 6],
      imageUri: campaign.image_url,
      imageBase64: null,
    } : { ...EMPTY_CAMPAIGN, targetDays: [...EMPTY_CAMPAIGN.targetDays] });
    setShowCampaignForm(true);
  };

  const closeCampaignForm = () => {
    setEditingCampaign(null);
    setCampaignForm({ ...EMPTY_CAMPAIGN, targetDays: [...EMPTY_CAMPAIGN.targetDays] });
    setShowCampaignForm(false);
  };

  const createCampaign = async () => {
    if (savingCampaign || restaurant?.status !== 'approved') return;
    const radius = Number(campaignForm.radius);
    if (!campaignForm.title.trim() || !campaignForm.packageId || (!editingCampaign && !campaignForm.imageBase64)) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณาเลือกแพ็กเกจ ใส่ชื่อแคมเปญ และเลือกรูปโฆษณา');
      return;
    }
    if (!Number.isFinite(radius) || radius < 0.1 || radius > 100) {
      Alert.alert('รัศมีไม่ถูกต้อง', 'รัศมีต้องอยู่ระหว่าง 0.1 ถึง 100 กิโลเมตร');
      return;
    }
    if (campaignForm.targetDays.length === 0) {
      Alert.alert('ยังไม่ได้เลือกวัน', 'กรุณาเลือกอย่างน้อยหนึ่งวันที่ต้องการแสดงโฆษณา');
      return;
    }
    const targetUrl = campaignForm.targetUrl.trim();
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      Alert.alert('ลิงก์ไม่ถูกต้อง', 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
      return;
    }
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((campaignForm.startTime || campaignForm.endTime) &&
      (!timePattern.test(campaignForm.startTime) || !timePattern.test(campaignForm.endTime))) {
      Alert.alert('เวลาไม่ถูกต้อง', 'หากกำหนดเวลา ต้องใส่ทั้งเวลาเริ่มและสิ้นสุดในรูปแบบ HH:MM');
      return;
    }

    setSavingCampaign(true);
    let uploaded;
    try {
      if (campaignForm.imageBase64) {
        uploaded = await uploadImage({
          base64: campaignForm.imageBase64,
          userId: user.id,
          bucket: 'advertisements',
        });
      }
      const payload = {
        restaurant_id: restaurant.id,
        package_id: campaignForm.packageId,
        created_by: user.id,
        title: campaignForm.title.trim(),
        image_url: uploaded?.url || editingCampaign?.image_url,
        image_path: uploaded?.path || editingCampaign?.image_path,
        target_url: targetUrl || null,
        payment_amount: 1,
        target_radius_km: radius,
        target_categories: campaignForm.categories.split(',').map((item) => item.trim()).filter(Boolean),
        target_start_time: campaignForm.startTime || null,
        target_end_time: campaignForm.endTime || null,
        target_days: campaignForm.targetDays,
      };
      const result = editingCampaign
        ? await supabase.from('advertisements').update(payload).eq('id', editingCampaign.id)
        : await supabase.from('advertisements').insert(payload);
      if (result.error) throw result.error;
      if (uploaded && editingCampaign?.image_path) {
        await supabase.storage.from('advertisements').remove([editingCampaign.image_path]);
      }
      closeCampaignForm();
      await loadPortal(true);
      Alert.alert('ส่งแคมเปญแล้ว', 'ข้อมูลถูกส่งให้ผู้ดูแลตรวจอีกครั้งก่อนเริ่มแสดงโฆษณา');
    } catch (error) {
      await discardUpload(uploaded);
      Alert.alert('สร้างแคมเปญไม่สำเร็จ', error.message);
    } finally {
      setSavingCampaign(false);
    }
  };

  const deleteCampaign = (campaign) => {
    Alert.alert('ลบแคมเปญ', `ต้องการลบ "${campaign.title}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('advertisements').delete().eq('id', campaign.id);
          if (error) {
            Alert.alert('ลบไม่สำเร็จ', error.message);
            return;
          }
          if (campaign.image_path) await supabase.storage.from('advertisements').remove([campaign.image_path]);
          await loadPortal(true);
        },
      },
    ]);
  };

  const campaignTotals = useMemo(() => {
    const totals = new Map();
    for (const row of stats) {
      const current = totals.get(row.advertisement_id) || { impressions: 0, clicks: 0 };
      current.impressions += row.impressions || 0;
      current.clicks += row.clicks || 0;
      totals.set(row.advertisement_id, current);
    }
    return totals;
  }, [stats]);

  if (user?.is_guest) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.centerTitle}>ต้องสมัครสมาชิกก่อน</Text>
        <Text style={styles.centerText}>บัญชีร้านเปิดให้เฉพาะสมาชิกที่ยืนยันบัญชีแล้ว กรุณาออกจากระบบผู้เยี่ยมชมและสมัครสมาชิก</Text>
      </SafeAreaView>
    );
  }
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>JOYKIN BUSINESS</Text>
          <Text style={styles.heroTitle}>บัญชีสำหรับร้านอาหาร</Text>
          <Text style={styles.heroText}>สมัครร้าน เลือกแพ็กเกจ และส่งแคมเปญให้ผู้ดูแลตรวจสอบได้จากหน้าเดียว</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{restaurant ? 'ข้อมูลร้าน' : 'สมัครบัญชีร้าน'}</Text>
            {restaurant ? <Text style={styles.statusPill}>{STATUS_LABELS[restaurant.status] || restaurant.status}</Text> : null}
          </View>
          {restaurant?.rejection_reason ? <Text style={styles.warning}>เหตุผล: {restaurant.rejection_reason}</Text> : null}
          <Text style={styles.label}>ชื่อร้าน</Text>
          <TextInput style={styles.input} value={restaurantForm.name} onChangeText={(name) => updateRestaurantForm({ name })} placeholder="ชื่อร้านอาหาร" placeholderTextColor={COLORS.textLight} />
          <Text style={styles.label}>หมวดอาหาร คั่นด้วยเครื่องหมายจุลภาค</Text>
          <TextInput style={styles.input} value={restaurantForm.categories} onChangeText={(categories) => updateRestaurantForm({ categories })} placeholder="เช่น อาหารไทย, เครื่องดื่ม" placeholderTextColor={COLORS.textLight} />
          <Text style={styles.label}>เบอร์โทร</Text>
          <TextInput style={styles.input} value={restaurantForm.phone} onChangeText={(phone) => updateRestaurantForm({ phone })} keyboardType="phone-pad" placeholder="เบอร์ติดต่อร้าน" placeholderTextColor={COLORS.textLight} />
          <Text style={styles.label}>ที่อยู่</Text>
          <TextInput style={[styles.input, styles.multiline]} value={restaurantForm.address} onChangeText={(address) => updateRestaurantForm({ address })} multiline placeholder="ที่อยู่ร้าน" placeholderTextColor={COLORS.textLight} />
          <Text style={styles.label}>รายละเอียดร้าน</Text>
          <TextInput style={[styles.input, styles.multiline]} value={restaurantForm.description} onChangeText={(description) => updateRestaurantForm({ description })} multiline maxLength={1000} placeholder="จุดเด่น เวลาเปิด หรือข้อมูลที่ลูกค้าควรรู้" placeholderTextColor={COLORS.textLight} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.flex]} value={restaurantForm.latitude} onChangeText={(latitude) => updateRestaurantForm({ latitude })} keyboardType="decimal-pad" placeholder="ละติจูด" placeholderTextColor={COLORS.textLight} />
            <TextInput style={[styles.input, styles.flex]} value={restaurantForm.longitude} onChangeText={(longitude) => updateRestaurantForm({ longitude })} keyboardType="decimal-pad" placeholder="ลองจิจูด" placeholderTextColor={COLORS.textLight} />
          </View>
          <TouchableOpacity style={styles.outlineButton} onPress={useCurrentLocation}>
            <Text style={styles.outlineButtonText}>ใช้ตำแหน่งปัจจุบันเป็นพิกัดร้าน</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={saveRestaurant} disabled={savingRestaurant}>
            {savingRestaurant ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>{restaurant ? 'บันทึกและส่งตรวจใหม่' : 'สมัครบัญชีร้าน'}</Text>}
          </TouchableOpacity>
        </View>

        {restaurant?.status === 'approved' ? (
          <>
            <View style={styles.sectionHeaderOutside}>
              <View>
                <Text style={styles.sectionTitle}>แพ็กเกจโฆษณา</Text>
                <Text style={styles.sectionSub}>ราคา ระยะเวลา และโควตาถูกกำหนดโดยระบบ</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packageRow}>
              {packages.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.packageCard, campaignForm.packageId === item.id && styles.packageCardSelected]}
                  onPress={() => updateCampaignForm({ packageId: item.id })}
                >
                  <Text style={styles.packageName}>{item.name}</Text>
                  <Text style={styles.packagePrice}>{Number(item.price_amount).toLocaleString('th-TH')} บาท</Text>
                  <Text style={styles.packageMeta}>{item.duration_days} วัน</Text>
                  <Text style={styles.packageMeta}>สูงสุด {Number(item.daily_impression_limit).toLocaleString('th-TH')} ครั้งต่อวัน</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {!showCampaignForm ? (
              <TouchableOpacity style={styles.primaryButton} onPress={() => openCampaignForm()}>
                <Text style={styles.primaryButtonText}>สร้างแคมเปญโฆษณา</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{editingCampaign ? 'แก้ไขและส่งตรวจใหม่' : 'แคมเปญใหม่'}</Text>
                <Text style={styles.label}>รูปแนวนอน</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickCampaignImage}>
                  {campaignForm.imageUri ? <Image source={{ uri: campaignForm.imageUri }} style={styles.preview} /> : <Text style={styles.imagePickerText}>เลือกภาพโฆษณา</Text>}
                </TouchableOpacity>
                <Text style={styles.label}>ชื่อแคมเปญ</Text>
                <TextInput style={styles.input} value={campaignForm.title} onChangeText={(title) => updateCampaignForm({ title })} placeholder="เช่น โปรโมชันมื้อกลางวัน" placeholderTextColor={COLORS.textLight} />
                <Text style={styles.label}>ลิงก์ปลายทาง ไม่บังคับ</Text>
                <TextInput style={styles.input} value={campaignForm.targetUrl} onChangeText={(targetUrl) => updateCampaignForm({ targetUrl })} autoCapitalize="none" keyboardType="url" placeholder="https://example.com" placeholderTextColor={COLORS.textLight} />
                <Text style={styles.label}>หมวดอาหารเป้าหมาย คั่นด้วยจุลภาค</Text>
                <TextInput style={styles.input} value={campaignForm.categories} onChangeText={(categories) => updateCampaignForm({ categories })} placeholder="เว้นว่างเพื่อแสดงทุกความสนใจ" placeholderTextColor={COLORS.textLight} />
                <Text style={styles.label}>รัศมีจากร้าน กิโลเมตร</Text>
                <View style={styles.chipRow}>
                  {['1', '3', '5', '10'].map((radius) => (
                    <TouchableOpacity key={radius} style={[styles.chip, campaignForm.radius === radius && styles.chipSelected]} onPress={() => updateCampaignForm({ radius })}>
                      <Text style={[styles.chipText, campaignForm.radius === radius && styles.chipTextSelected]}>{radius} กม.</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>ช่วงเวลา ไม่บังคับ</Text>
                <View style={styles.row}>
                  <TextInput style={[styles.input, styles.flex]} value={campaignForm.startTime} onChangeText={(startTime) => updateCampaignForm({ startTime })} placeholder="เริ่ม 09:00" placeholderTextColor={COLORS.textLight} />
                  <TextInput style={[styles.input, styles.flex]} value={campaignForm.endTime} onChangeText={(endTime) => updateCampaignForm({ endTime })} placeholder="สิ้นสุด 18:00" placeholderTextColor={COLORS.textLight} />
                </View>
                <Text style={styles.label}>วันที่ต้องการแสดง</Text>
                <View style={styles.chipRow}>
                  {TARGET_DAYS.map((day) => {
                    const selected = campaignForm.targetDays.includes(day.value);
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[styles.dayChip, selected && styles.chipSelected]}
                        onPress={() => updateCampaignForm({
                          targetDays: selected
                            ? campaignForm.targetDays.filter((value) => value !== day.value)
                            : [...campaignForm.targetDays, day.value],
                        })}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.outlineButton, styles.flex]} onPress={closeCampaignForm}><Text style={styles.outlineButtonText}>ยกเลิก</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryButton, styles.flex]} onPress={createCampaign} disabled={savingCampaign}>
                    {savingCampaign ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryButtonText}>ส่งตรวจ</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, styles.campaignTitle]}>แคมเปญของร้าน</Text>
            {campaigns.length === 0 ? <Text style={styles.empty}>ยังไม่มีแคมเปญ</Text> : campaigns.map((campaign) => {
              const total = campaignTotals.get(campaign.id) || { impressions: 0, clicks: 0 };
              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <Image source={{ uri: campaign.image_url }} style={styles.campaignImage} />
                  <View style={styles.campaignBody}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.campaignName} numberOfLines={1}>{campaign.title}</Text>
                      <Text style={styles.statusPill}>{STATUS_LABELS[campaign.status] || campaign.status}</Text>
                    </View>
                    <Text style={styles.campaignMeta}>{campaign.ad_packages?.name || 'แพ็กเกจเดิม'} · {Number(campaign.payment_amount).toLocaleString('th-TH')} บาท</Text>
                    <Text style={styles.campaignMeta}>แสดง {total.impressions.toLocaleString('th-TH')} ครั้ง · คลิก {total.clicks.toLocaleString('th-TH')} ครั้ง</Text>
                    <Text style={styles.campaignMeta}>การชำระเงิน: {campaign.payment_status === 'confirmed' ? 'ยืนยันแล้ว' : campaign.payment_status === 'waived' ? 'ยกเว้น' : 'รอตรวจสอบ'}</Text>
                    {campaign.rejection_reason ? <Text style={styles.warning}>เหตุผล: {campaign.rejection_reason}</Text> : null}
                    {campaign.status === 'rejected' ? (
                      <TouchableOpacity style={styles.resubmitButton} onPress={() => openCampaignForm(campaign)}><Text style={styles.resubmitButtonText}>แก้ไขและส่งใหม่</Text></TouchableOpacity>
                    ) : null}
                    {['draft', 'pending_review', 'rejected'].includes(campaign.status) ? (
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteCampaign(campaign)}><Text style={styles.deleteButtonText}>ลบแคมเปญ</Text></TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, backgroundColor: COLORS.background },
  centerTitle: { color: COLORS.secondary, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  centerText: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, marginTop: 10, textAlign: 'center' },
  hero: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.xlarge, padding: 22, marginBottom: 16, ...SHADOWS.card },
  heroEyebrow: { color: COLORS.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', marginTop: 7 },
  heroText: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20, marginTop: 7 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.large, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionHeaderOutside: { marginTop: 8, marginBottom: 10 },
  sectionTitle: { color: COLORS.textDark, fontSize: 18, fontWeight: '900' },
  sectionSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  statusPill: { color: COLORS.secondary, backgroundColor: COLORS.secondarySoft, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900', overflow: 'hidden' },
  warning: { color: COLORS.danger, backgroundColor: COLORS.dangerSoft, padding: 10, borderRadius: RADIUS.small, marginTop: 10, fontSize: 12, lineHeight: 18 },
  label: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, color: COLORS.textDark, borderRadius: RADIUS.medium, paddingHorizontal: 13, paddingVertical: 12, fontSize: 14 },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  flex: { flex: 1 },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: RADIUS.medium, paddingHorizontal: 15, marginTop: 14 },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  outlineButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.medium, paddingHorizontal: 14, marginTop: 12 },
  outlineButtonText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  packageRow: { gap: 10, paddingRight: 18, paddingBottom: 14 },
  packageCard: { width: 190, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.large, padding: 16 },
  packageCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  packageName: { color: COLORS.secondary, fontSize: 16, fontWeight: '900' },
  packagePrice: { color: COLORS.primary, fontSize: 20, fontWeight: '900', marginTop: 8 },
  packageMeta: { color: COLORS.textMuted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  imagePicker: { height: 150, borderRadius: RADIUS.medium, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePickerText: { color: COLORS.textMuted, fontWeight: '800' },
  preview: { width: '100%', height: '100%' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.surface },
  dayChip: { minWidth: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: COLORS.surface },
  chipSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  chipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800' },
  chipTextSelected: { color: COLORS.primaryDark },
  campaignTitle: { marginTop: 24, marginBottom: 12 },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 24 },
  campaignCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.large, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  campaignImage: { width: '100%', height: 140, backgroundColor: COLORS.surfaceMuted },
  campaignBody: { padding: 14 },
  campaignName: { flex: 1, color: COLORS.textDark, fontSize: 15, fontWeight: '900' },
  campaignMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.small, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  deleteButtonText: { color: COLORS.danger, fontSize: 12, fontWeight: '900' },
  resubmitButton: { alignSelf: 'flex-start', backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.small, paddingHorizontal: 12, paddingVertical: 9, marginTop: 12 },
  resubmitButtonText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '900' },
});

import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';
import { discardUpload, IMAGE_PICKER_OPTIONS, uploadImage } from '../utils/imageUpload';

const EMPTY_FORM = {
  title: '',
  paymentAmount: '',
  packageId: '',
  targetUrl: '',
  isActive: true,
  imageUri: null,
  imageBase64: null,
};

export default function AdminAdsScreen() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(null);
  const [ads, setAds] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [rejectingAd, setRejectingAd] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const loadAds = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const allowed = Boolean(adminRow);
    setIsAdmin(allowed);
    if (!allowed) {
      setAds([]);
      setLoading(false);
      return;
    }

    const [{ data, error }, { data: packageRows }] = await Promise.all([
      supabase
      .from('advertisements')
      .select('*, ad_packages(name, code), restaurants(name)')
      .order('created_at', { ascending: false }),
      supabase.from('ad_packages').select('*').order('price_amount'),
    ]);
    if (error) Alert.alert('โหลดโฆษณาไม่สำเร็จ', error.message);
    setAds(data || []);
    setPackages(packageRows || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const updateForm = (changes) => setForm((current) => ({ ...current, ...changes }));

  const openCreate = () => {
    setEditingAd(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      paymentAmount: String(ad.payment_amount),
      packageId: ad.package_id || '',
      targetUrl: ad.target_url || '',
      isActive: ad.is_active,
      imageUri: ad.image_url,
      imageBase64: null,
    });
    setModalVisible(true);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ไม่ได้รับสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      ...IMAGE_PICKER_OPTIONS,
      aspect: [16, 9],
    });
    const asset = result.canceled ? null : result.assets?.[0];
    if (!asset?.base64) {
      if (!result.canceled) Alert.alert('รูปภาพไม่พร้อม', 'กรุณาเลือกรูปใหม่');
      return;
    }
    updateForm({ imageUri: asset.uri, imageBase64: asset.base64 });
  };

  const validateForm = () => {
    const title = form.title.trim();
    const selectedPackage = packages.find((item) => item.id === form.packageId);
    const paymentAmount = Number(selectedPackage?.price_amount ?? form.paymentAmount);
    const targetUrl = form.targetUrl.trim();
    if (!title) throw new Error('กรุณากรอกชื่อผู้สนับสนุน');
    if (!editingAd && !selectedPackage) {
      throw new Error('กรุณาเลือกแพ็กเกจโฆษณา');
    }
    if (!Number.isFinite(paymentAmount) || paymentAmount < 0) {
      throw new Error('ราคาแพ็กเกจไม่ถูกต้อง');
    }
    if (!editingAd && !form.imageBase64) throw new Error('กรุณาเลือกรูปโฆษณา');
    if (targetUrl && !/^https?:\/\//i.test(targetUrl)) {
      throw new Error('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
    }
    return { title, paymentAmount, targetUrl: targetUrl || null };
  };

  const saveAd = async () => {
    if (saving || !user?.id) return;
    setSaving(true);
    let uploaded;
    try {
      const values = validateForm();
      if (form.imageBase64) {
        uploaded = await uploadImage({
          base64: form.imageBase64,
          userId: user.id,
          bucket: 'advertisements',
        });
      }
      const payload = {
        title: values.title,
        payment_amount: values.paymentAmount,
        package_id: form.packageId || null,
        target_url: values.targetUrl,
        is_active: form.isActive,
        status: form.isActive ? 'active' : 'paused',
        payment_status: form.isActive ? 'confirmed' : 'pending',
        paid_at: form.isActive ? new Date().toISOString() : null,
        image_url: uploaded?.url || editingAd?.image_url,
        image_path: uploaded?.path || editingAd?.image_path,
      };

      let result;
      if (editingAd) {
        result = await supabase.from('advertisements')
          .update(payload)
          .eq('id', editingAd.id)
          .select('id');
      } else {
        result = await supabase.from('advertisements')
          .insert({ ...payload, created_by: user.id })
          .select('id');
      }
      if (result.error || !result.data?.length) {
        throw result.error || new Error('ไม่สามารถบันทึกโฆษณาได้');
      }

      if (uploaded && editingAd?.image_path) {
        await supabase.storage.from('advertisements').remove([editingAd.image_path]);
      }
      setModalVisible(false);
      setEditingAd(null);
      setForm(EMPTY_FORM);
      await loadAds();
      Alert.alert('สำเร็จ', 'บันทึกโฆษณาเรียบร้อยแล้ว');
    } catch (error) {
      await discardUpload(uploaded);
      Alert.alert('บันทึกไม่สำเร็จ', error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAd = (ad) => {
    Alert.alert('ลบโฆษณา', `ต้องการลบ "${ad.title}" หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('advertisements').delete().eq('id', ad.id);
          if (error) {
            Alert.alert('ลบไม่สำเร็จ', error.message);
            return;
          }
          if (ad.image_path) await supabase.storage.from('advertisements').remove([ad.image_path]);
          setAds((current) => current.filter((item) => item.id !== ad.id));
        },
      },
    ]);
  };

  const setAdStatus = async (ad, status) => {
    const { error } = await supabase.from('advertisements')
      .update({
        status,
        is_active: status === 'active',
        ...(status === 'active' ? { payment_status: 'confirmed', paid_at: new Date().toISOString() } : {}),
      })
      .eq('id', ad.id);
    if (error) {
      Alert.alert('อัปเดตสถานะไม่สำเร็จ', error.message);
      return;
    }
    await loadAds();
  };

  const rejectAd = async () => {
    if (!rejectingAd || !rejectionReason.trim()) {
      Alert.alert('กรุณาระบุเหตุผล', 'ร้านจะเห็นข้อความนี้และใช้แก้ไขแคมเปญ');
      return;
    }
    const { error } = await supabase.from('advertisements')
      .update({ status: 'rejected', is_active: false, rejection_reason: rejectionReason.trim() })
      .eq('id', rejectingAd.id);
    if (error) {
      Alert.alert('ปฏิเสธแคมเปญไม่สำเร็จ', error.message);
      return;
    }
    setRejectingAd(null);
    setRejectionReason('');
    await loadAds();
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.deniedTitle}>ไม่มีสิทธิ์เข้าถึง</Text>
        <Text style={styles.deniedText}>หน้านี้เปิดให้ผู้ดูแลระบบเท่านั้น</Text>
      </SafeAreaView>
    );
  }

  const renderAd = ({ item }) => (
    <View style={[styles.adCard, item.status !== 'active' && styles.adCardInactive]}>
      <Image source={{ uri: item.image_url }} style={styles.adImage} />
      <View style={styles.adBody}>
        <View style={styles.adTitleRow}>
          <Text style={styles.adTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.status, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
            {item.status === 'active' ? 'กำลังแสดง' : item.status === 'pending_review' ? 'รอตรวจ' : item.status || 'ปิดใช้งาน'}
          </Text>
        </View>
        <Text style={styles.payment}>{item.ad_packages?.name || 'รายการเดิม'} · {Number(item.payment_amount).toLocaleString('th-TH')} บาท</Text>
        <Text style={styles.weightNote}>ร้าน {item.restaurants?.name || 'ผู้ดูแลสร้าง'} · น้ำหนักแพ็กเกจ {Number(item.priority_weight || 1).toLocaleString('th-TH')}</Text>
        <View style={styles.adActions}>
          {item.status !== 'active' ? (
            <TouchableOpacity style={styles.approveButton} onPress={() => setAdStatus(item, 'active')}>
              <Text style={styles.approveButtonText}>ยืนยันชำระและอนุมัติ</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.pauseButton} onPress={() => setAdStatus(item, 'paused')}>
              <Text style={styles.pauseButtonText}>หยุด</Text>
            </TouchableOpacity>
          )}
          {item.status !== 'rejected' ? (
            <TouchableOpacity style={styles.rejectButton} onPress={() => { setRejectingAd(item); setRejectionReason(''); }}>
              <Text style={styles.rejectButtonText}>ไม่อนุมัติ</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}>
            <Text style={styles.editButtonText}>แก้ไข</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteAd(item)}>
            <Text style={styles.deleteButtonText}>ลบ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={ads}
        keyExtractor={(item) => item.id}
        renderItem={renderAd}
        contentContainerStyle={styles.list}
        ListHeaderComponent={(
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>จัดการโฆษณา</Text>
            <Text style={styles.headerText}>
              ตรวจแคมเปญของร้านและควบคุมการแสดงผลตามสิทธิ์ของแต่ละแพ็กเกจ
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={openCreate}>
              <Text style={styles.createButtonText}>เพิ่มโฆษณา</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>ยังไม่มีโฆษณาในระบบ</Text>}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{editingAd ? 'แก้ไขโฆษณา' : 'เพิ่มโฆษณา'}</Text>

              <Text style={styles.label}>รูปโฆษณาแนวนอน</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                {form.imageUri
                  ? <Image source={{ uri: form.imageUri }} style={styles.preview} />
                  : <Text style={styles.imagePickerText}>แตะเพื่อเลือกรูป</Text>
                }
              </TouchableOpacity>

              <Text style={styles.label}>ชื่อผู้สนับสนุน</Text>
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(title) => updateForm({ title })}
                maxLength={100}
                placeholder="เช่น ร้านอาหารตัวอย่าง"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>แพ็กเกจโฆษณา</Text>
              <View style={styles.packageList}>
                {packages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.packageOption, form.packageId === item.id && styles.packageOptionSelected]}
                    onPress={() => updateForm({ packageId: item.id, paymentAmount: String(item.price_amount) })}
                  >
                    <Text style={[styles.packageOptionText, form.packageId === item.id && styles.packageOptionTextSelected]}>
                      {item.name} · {Number(item.price_amount).toLocaleString('th-TH')} บาท · {item.duration_days} วัน
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hint}>ราคา น้ำหนัก โควตาต่อวัน และระยะเวลาถูกดึงจากแพ็กเกจและผู้ใช้แก้เองไม่ได้</Text>

              <Text style={styles.label}>ลิงก์ปลายทาง (ไม่บังคับ)</Text>
              <TextInput
                style={styles.input}
                value={form.targetUrl}
                onChangeText={(targetUrl) => updateForm({ targetUrl })}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://example.com"
                placeholderTextColor="#999"
              />

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>เปิดแสดงโฆษณา</Text>
                  <Text style={styles.hint}>ปิดได้โดยไม่ต้องลบข้อมูล</Text>
                </View>
                <Switch
                  value={form.isActive}
                  onValueChange={(isActive) => updateForm({ isActive })}
                  trackColor={{ false: '#CCC', true: '#D4B19A' }}
                  thumbColor={form.isActive ? COLORS.primary : '#F4F4F4'}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveAd} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.saveButtonText}>บันทึก</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(rejectingAd)} transparent animationType="fade" onRequestClose={() => setRejectingAd(null)}>
        <KeyboardAvoidingView style={styles.rejectOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.rejectCard}>
            <Text style={styles.modalTitle}>เหตุผลที่ไม่อนุมัติ</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              maxLength={500}
              placeholder="ระบุสิ่งที่ร้านต้องแก้ไข"
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setRejectingAd(null)}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectConfirmButton} onPress={rejectAd}>
                <Text style={styles.rejectConfirmText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  deniedTitle: { fontSize: 20, color: COLORS.secondary, fontWeight: '900' },
  deniedText: { marginTop: 8, fontSize: 14, color: '#777' },
  list: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: COLORS.secondary, borderRadius: 22, padding: 20, marginBottom: 18 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  headerText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 18, marginTop: 5 },
  createButton: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 13, paddingVertical: 12, alignItems: 'center' },
  createButtonText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 28 },
  adCard: { backgroundColor: '#FFF', borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#E8E2DD' },
  adCardInactive: { opacity: 0.62 },
  adImage: { width: '100%', height: 150, backgroundColor: '#E9ECEF' },
  adBody: { padding: 14 },
  adTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adTitle: { flex: 1, fontSize: 16, color: COLORS.textDark, fontWeight: '900' },
  status: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9, overflow: 'hidden' },
  statusActive: { color: '#315C32', backgroundColor: '#E4F2E1' },
  statusInactive: { color: '#666', backgroundColor: '#ECECEC' },
  payment: { marginTop: 9, color: COLORS.primary, fontSize: 14, fontWeight: '900' },
  weightNote: { marginTop: 2, color: '#777', fontSize: 11 },
  adActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  approveButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: COLORS.successSoft },
  approveButtonText: { color: COLORS.success, fontWeight: '800' },
  pauseButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: COLORS.warningSoft },
  pauseButtonText: { color: COLORS.warning, fontWeight: '800' },
  rejectButton: { flex: 1, minWidth: 95, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: COLORS.dangerSoft },
  rejectButtonText: { color: COLORS.danger, fontWeight: '800' },
  editButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: '#F3E7DE' },
  editButtonText: { color: COLORS.secondary, fontWeight: '800' },
  deleteButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11, backgroundColor: '#FFF0F0' },
  deleteButtonText: { color: '#B53B3B', fontWeight: '800' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.52)' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 26, paddingBottom: 38 },
  modalTitle: { textAlign: 'center', color: COLORS.secondary, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  label: { color: '#555', fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: '#DDD', borderRadius: 12, backgroundColor: '#FAFAFA', color: COLORS.textDark, fontSize: 15, paddingHorizontal: 14, paddingVertical: 11 },
  hint: { color: '#777', fontSize: 10, lineHeight: 15, marginTop: 5 },
  packageList: { gap: 8 },
  packageOption: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, borderRadius: 12, padding: 11 },
  packageOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft },
  packageOptionText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '800' },
  packageOptionTextSelected: { color: COLORS.primaryDark },
  imagePicker: { height: 145, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C8C8C8', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F8F8' },
  imagePickerText: { color: '#777', fontSize: 13, fontWeight: '700' },
  preview: { width: '100%', height: '100%' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, padding: 13, borderRadius: 13, backgroundColor: '#F7F7F7' },
  switchTitle: { color: COLORS.textDark, fontSize: 14, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  cancelButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, borderWidth: 1.5, borderColor: '#DDD' },
  cancelButtonText: { color: '#777', fontWeight: '800' },
  saveButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: COLORS.secondary },
  saveButtonText: { color: '#FFF', fontWeight: '900' },
  rejectOverlay: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.52)' },
  rejectCard: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 22 },
  rejectInput: { minHeight: 110, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.surfaceMuted, color: COLORS.textDark, padding: 12, textAlignVertical: 'top' },
  rejectConfirmButton: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 13, backgroundColor: COLORS.dangerSoft },
  rejectConfirmText: { color: COLORS.danger, fontWeight: '900' },
});

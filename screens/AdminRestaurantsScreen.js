import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

const STATUS_LABELS = {
  pending: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', rejected: 'ไม่ผ่าน', suspended: 'ระงับ',
};

export default function AdminRestaurantsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [savingId, setSavingId] = useState(null);

  const loadRestaurants = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: adminRow } = await supabase.from('admin_users')
      .select('user_id').eq('user_id', user.id).maybeSingle();
    const allowed = Boolean(adminRow);
    setIsAdmin(allowed);
    if (!allowed) {
      setRestaurants([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from('restaurants')
      .select('*').order('created_at', { ascending: false });
    if (error) Alert.alert('โหลดคำขอไม่สำเร็จ', error.message);
    setRestaurants(data || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadRestaurants(); }, [loadRestaurants]);

  const updateStatus = async (restaurant, status, rejectionReason = null) => {
    setSavingId(restaurant.id);
    const { error } = await supabase.from('restaurants')
      .update({ status, rejection_reason: rejectionReason })
      .eq('id', restaurant.id);
    setSavingId(null);
    if (error) {
      Alert.alert('อัปเดตไม่สำเร็จ', error.message);
      return;
    }
    setRejecting(null);
    setReason('');
    await loadRestaurants();
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!isAdmin) {
    return <SafeAreaView style={styles.center}><Text style={styles.denied}>หน้านี้เปิดให้ผู้ดูแลระบบเท่านั้น</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadRestaurants}
        ListHeaderComponent={(
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>ตรวจสอบบัญชีร้าน</Text>
            <Text style={styles.heroText}>ตรวจชื่อ ที่อยู่ เบอร์ติดต่อ และพิกัดก่อนอนุมัติให้ร้านสร้างแคมเปญ</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>ยังไม่มีคำขอบัญชีร้าน</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.status}>{STATUS_LABELS[item.status] || item.status}</Text>
            </View>
            <Text style={styles.categories}>{(item.cuisine_categories || []).join(' · ') || 'ไม่ได้ระบุหมวดอาหาร'}</Text>
            <Text style={styles.detail}>{item.address}</Text>
            <Text style={styles.detail}>โทร {item.phone || 'ไม่ได้ระบุ'}</Text>
            <Text style={styles.detail}>พิกัด {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</Text>
            {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
            {item.rejection_reason ? <Text style={styles.warning}>เหตุผลเดิม: {item.rejection_reason}</Text> : null}
            <View style={styles.actions}>
              {item.status !== 'approved' ? (
                <TouchableOpacity style={styles.approveButton} onPress={() => updateStatus(item, 'approved')} disabled={savingId === item.id}>
                  <Text style={styles.approveText}>อนุมัติ</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.suspendButton} onPress={() => updateStatus(item, 'suspended')} disabled={savingId === item.id}>
                  <Text style={styles.suspendText}>ระงับ</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.rejectButton} onPress={() => { setRejecting(item); setReason(''); }} disabled={savingId === item.id}>
                <Text style={styles.rejectText}>ไม่อนุมัติ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={Boolean(rejecting)} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>เหตุผลที่ไม่อนุมัติ</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={500}
              placeholder="แจ้งสิ่งที่ร้านต้องแก้ไข"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setRejecting(null)}><Text style={styles.cancelText}>ยกเลิก</Text></TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => {
                  if (!reason.trim()) {
                    Alert.alert('กรุณาระบุเหตุผล', 'ร้านจะใช้ข้อความนี้แก้ไขข้อมูลแล้วส่งตรวจใหม่');
                    return;
                  }
                  updateStatus(rejecting, 'rejected', reason.trim());
                }}
              >
                <Text style={styles.rejectText}>ยืนยัน</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: 16, paddingBottom: 42 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: COLORS.background },
  denied: { color: COLORS.secondary, fontSize: 18, fontWeight: '900' },
  hero: { backgroundColor: COLORS.secondary, borderRadius: RADIUS.xlarge, padding: 22, marginBottom: 16 },
  heroTitle: { color: COLORS.white, fontSize: 23, fontWeight: '900' },
  heroText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 18, marginTop: 7 },
  empty: { color: COLORS.textMuted, textAlign: 'center', padding: 30 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.large, borderWidth: 1, borderColor: COLORS.border, padding: 17, marginBottom: 13, ...SHADOWS.card },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { flex: 1, color: COLORS.textDark, fontSize: 17, fontWeight: '900' },
  status: { color: COLORS.secondary, backgroundColor: COLORS.secondarySoft, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: '900', overflow: 'hidden' },
  categories: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '800', marginTop: 8 },
  detail: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  description: { color: COLORS.textDark, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.small, padding: 10, fontSize: 12, lineHeight: 18, marginTop: 10 },
  warning: { color: COLORS.danger, backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.small, padding: 10, fontSize: 12, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveButton: { flex: 1, alignItems: 'center', backgroundColor: COLORS.successSoft, borderRadius: RADIUS.medium, paddingVertical: 11 },
  approveText: { color: COLORS.success, fontWeight: '900' },
  suspendButton: { flex: 1, alignItems: 'center', backgroundColor: COLORS.warningSoft, borderRadius: RADIUS.medium, paddingVertical: 11 },
  suspendText: { color: COLORS.warning, fontWeight: '900' },
  rejectButton: { flex: 1, alignItems: 'center', backgroundColor: COLORS.dangerSoft, borderRadius: RADIUS.medium, paddingVertical: 11 },
  rejectText: { color: COLORS.danger, fontWeight: '900' },
  overlay: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xlarge, padding: 20 },
  modalTitle: { color: COLORS.secondary, fontSize: 19, fontWeight: '900' },
  reasonInput: { minHeight: 110, marginTop: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.medium, padding: 12, color: COLORS.textDark, textAlignVertical: 'top' },
  cancelButton: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.medium, paddingVertical: 11 },
  cancelText: { color: COLORS.textMuted, fontWeight: '900' },
});

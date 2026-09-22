import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert,
    FlatList,
    KeyboardAvoidingView, Platform,
    SafeAreaView,
    Share,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { usePartyRoom } from '../hooks/usePartyRoom';

//  ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function LobbyScreen({ route, navigation }) {
    const { roomId, roomCode, participantId, playerName } = route.params;
    const { user } = useAuth();
    const { snapshot, error, busy, act, refresh, leave } = usePartyRoom(roomId, navigation);
    const participants = snapshot?.participants || [];
    const customFoods = snapshot?.room.custom_foods || [];
    const isHost = snapshot?.room.host_user_id === user?.id;
    const isStarting = busy;
    const [newFoodName, setNewFoodName] = useState('');
    const moved = useRef(false);

    useEffect(() => {
      if (!snapshot || moved.current) return;
      const status = snapshot.room.status;
      if (status === 'playing' || status === 'done') {
        moved.current = true;
        navigation.replace(status === 'done' ? 'Result' : 'Swipe', {
          roomId, roomCode, participantId, playerName,
          customFoods: snapshot.foods, matchedFoodId: snapshot.room.matched_food_id,
        });
      } else if (status === 'cancelled') {
        moved.current = true;
        Alert.alert('ห้องปิดแล้ว', 'เจ้าของห้องออกหรือห้องหมดอายุ');
        navigation.popToTop();
      }
    }, [snapshot, navigation, roomId, roomCode, participantId, playerName]);

    const handleStartGame = () => act('start');
    const handleAddCustomFood = async () => {
      if (!newFoodName.trim()) return;
      if (await act('add_food', { name: newFoodName.trim() })) setNewFoodName('');
    };
    const handleRemoveCustomFood = foodId => act('remove_food', { foodId });
    const handleCopyCode = async () => {
      try { await Clipboard.setStringAsync(roomCode); Alert.alert('คัดลอกแล้ว', roomCode); }
      catch { Alert.alert('คัดลอกไม่สำเร็จ', roomCode); }
    };
    const handleShare = async () => {
      try { await Share.share({ message: 'มาเล่น Joykin กันเถอะ! รหัสห้อง: ' + roomCode }); }
      catch { Alert.alert('แชร์ไม่สำเร็จ', roomCode); }
    };

    const renderParticipant = ({ item }) => (
        <View style={styles.playerRow}>
            <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            {item.user_id === snapshot?.room.host_user_id && <Text style={styles.hostBadge}>Host</Text>}
            {item.id === participantId && <Text style={styles.youBadge}>You</Text>}
        </View>
    );

    //  ==========================================

    //  ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

    //  ==========================================

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={leave} disabled={busy} style={{ padding: 12 }}><Text>‹ ออกจากห้อง</Text></TouchableOpacity>
            {!!error && <TouchableOpacity onPress={refresh}><Text style={{ color: '#C0392B', padding: 10 }}>{error} · แตะเพื่อลองใหม่</Text></TouchableOpacity>}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <FlatList
                    data={participants}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <>
                            {/* Header รหัสห้อง */}
                            <View style={styles.headerCard}>
                                <Text style={styles.roomLabel}>Room Code</Text>
                                <Text style={styles.roomCode}>{roomCode}</Text>
                                <View style={styles.codeBtnRow}>
                                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
                                        <Text style={styles.shareBtnText}>Copy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                                        <Text style={styles.shareBtnText}>Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            
                            {/* ส่วนเพิ่มเมนูอาหารเอง */}
                            <View style={styles.customFoodCard}>
                                <Text style={styles.customFoodTitle}>กำหนดเมนูสุ่มเอง (ตัวเลือกเสริม)</Text>
                                <Text style={styles.customFoodSubtitle}>ถ้ามีเมนูในนี้ ระบบจะสุ่มเฉพาะเมนูนี้เท่านั้น!</Text>
                                <View style={styles.addFoodRow}>
                                    <TextInput 
                                        style={styles.addFoodInput}
                                        placeholder="พิมพ์ชื่อเมนูที่อยากกิน..."
                                        value={newFoodName}
                                        onChangeText={setNewFoodName}
                                        maxLength={30}
                                    />
                                    <TouchableOpacity style={styles.addFoodBtn} onPress={handleAddCustomFood} disabled={busy}>
                                        <Text style={styles.addFoodBtnText}>เพิ่ม</Text>
                                    </TouchableOpacity>
                                </View>
                                {customFoods.length > 0 && (
                                    <View style={styles.customFoodList}>
                                        {customFoods.map(food => (
                                            <View key={food.id} style={styles.customFoodBadge}>
                                                <Text style={styles.customFoodBadgeText}>{food.name}</Text>
                                                <TouchableOpacity onPress={() => handleRemoveCustomFood(food.id)} disabled={busy}>
                                                    <Text style={{color: '#E74C3C', marginLeft: 6, fontWeight: 'bold'}}>ลบ</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                            
                            <View style={styles.playersHeader}>
                                <Text style={styles.playersTitle}>Players</Text>
                                <View style={styles.countBadge}>
                                    <Text style={styles.countBadgeText}>{participants.length}</Text>
                                </View>
                            </View>
                        </>
                    }
                    renderItem={renderParticipant}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={<ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
                />

                {/* ปุ่ม Start (เฉพาะ Host) */}
                {isHost ? (
                    <TouchableOpacity
                        style={[styles.startBtn, (participants.length < 2 || isStarting) && styles.startBtnDisabled]}
                        onPress={handleStartGame}
                        disabled={participants.length < 2 || isStarting}
                    >
                        {isStarting
                            ? <ActivityIndicator color={COLORS.white} />
                            : <Text style={styles.startBtnText}>Start Game!</Text>
                        }
                    </TouchableOpacity>
                ) : (
                    <View style={styles.waitingBox}>
                        <ActivityIndicator color={COLORS.secondary} size="small" />
                        <Text style={styles.waitingText}>Waiting for host to start...</Text>
                    </View>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: 20 },
    headerCard: {
        backgroundColor: COLORS.secondary, borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 20,
    },
    roomLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', letterSpacing: 1 },
    roomCode: { color: COLORS.white, fontSize: 48, fontWeight: '900', letterSpacing: 8, marginVertical: 5 },
    // Bug 3 fix: Copy + Share buttons row
    codeBtnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    copyBtn: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    shareBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
    shareBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
    playersCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, flex: 1, marginBottom: 20 },
    playersHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    playersTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, flex: 1 },
    countBadge: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countBadgeText: { color: COLORS.white, fontWeight: 'bold' },
    playerRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    },
    playerAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.background,
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    playerAvatarText: { fontSize: 20, fontWeight: 'bold', color: COLORS.secondary },
    playerName: { fontSize: 16, fontWeight: '600', color: COLORS.textDark, flex: 1 },
    hostBadge: { fontSize: 13, marginRight: 6 },
    youBadge: {
        backgroundColor: COLORS.accent, color: COLORS.white,
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, fontSize: 11, fontWeight: 'bold', overflow: 'hidden',
    },
    startBtn: {
        backgroundColor: COLORS.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    startBtnDisabled: { backgroundColor: '#CCC', shadowColor: '#CCC' },
    startBtnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    waitingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    waitingText: { color: COLORS.secondary, fontSize: 15, fontWeight: '600' },
    customFoodCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 20 },
    customFoodTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
    customFoodSubtitle: { fontSize: 13, color: 'gray', marginBottom: 15 },
    addFoodRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    addFoodInput: { flex: 1, backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#EEE' },
    addFoodBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
    addFoodBtnText: { color: COLORS.white, fontWeight: 'bold' },
    customFoodList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    customFoodBadge: { flexDirection: 'row', backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    customFoodBadgeText: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },
});

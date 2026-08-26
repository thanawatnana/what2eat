import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Alert, Share
} from 'react-native';
import { COLORS } from '../constants/theme';
import { supabase } from '../supabase';

export default function LobbyScreen({ route, navigation }) {
    const { roomId, roomCode, participantId, playerName, isHost } = route.params;
    const [participants, setParticipants] = useState([]);
    const [isStarting, setIsStarting] = useState(false);
    const channelRef = useRef(null);

    // ── โหลดรายชื่อผู้เล่นและ Realtime subscription ──────────────
    useEffect(() => {
        // โหลดครั้งแรก
        fetchParticipants();

        // Subscribe Realtime เมื่อมีคนเข้า/ออก
        channelRef.current = supabase
            .channel(`room-${roomId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${roomId}` },
                () => fetchParticipants()
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    // เมื่อ host กด Start → status เปลี่ยน → ทุกคนไป SwipeScreen
                    if (payload.new.status === 'playing') {
                        navigation.replace('Swipe', {
                            roomId,
                            roomCode,
                            participantId,
                            playerName,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [roomId]);

    const fetchParticipants = async () => {
        const { data } = await supabase
            .from('participants')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true });
        if (data) setParticipants(data);
    };

    // ── Host: เริ่มเกม ─────────────────────────────────────────────
    const handleStartGame = async () => {
        if (participants.length < 2) {
            Alert.alert('⚠️ ผู้เล่นไม่พอ', 'ต้องมีอย่างน้อย 2 คนถึงจะเริ่มได้!');
            return;
        }
        setIsStarting(true);
        const { error } = await supabase
            .from('rooms')
            .update({ status: 'playing' })
            .eq('id', roomId);

        if (error) {
            Alert.alert('❌ Error', error.message);
            setIsStarting(false);
        }
        // การ navigate จะเกิดจาก Realtime listener ด้านบน (ทั้ง host และ guest)
    };

    // ── แชร์รหัสห้อง ───────────────────────────────────────────────
    const handleShare = () => {
        Share.share({ message: `มาเล่น What2Eat กันเถอะ! รหัสห้อง: ${roomCode}` });
    };

    const renderParticipant = ({ item, index }) => (
        <View style={styles.playerRow}>
            <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.playerName}>{item.name}</Text>
            {index === 0 && <Text style={styles.hostBadge}>👑 Host</Text>}
            {item.id === participantId && <Text style={styles.youBadge}>You</Text>}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header รหัสห้อง */}
            <View style={styles.headerCard}>
                <Text style={styles.roomLabel}>Room Code</Text>
                <Text style={styles.roomCode}>{roomCode}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                    <Text style={styles.shareBtnText}>📤 Share Code</Text>
                </TouchableOpacity>
            </View>

            {/* รายชื่อผู้เล่น */}
            <View style={styles.playersCard}>
                <View style={styles.playersHeader}>
                    <Text style={styles.playersTitle}>Players</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{participants.length}</Text>
                    </View>
                </View>

                <FlatList
                    data={participants}
                    keyExtractor={(item) => item.id}
                    renderItem={renderParticipant}
                    scrollEnabled={false}
                    ListEmptyComponent={<ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
                />
            </View>

            {/* ปุ่ม Start (เฉพาะ Host) */}
            {isHost ? (
                <TouchableOpacity
                    style={[styles.startBtn, (participants.length < 2 || isStarting) && styles.startBtnDisabled]}
                    onPress={handleStartGame}
                    disabled={participants.length < 2 || isStarting}
                >
                    {isStarting
                        ? <ActivityIndicator color={COLORS.white} />
                        : <Text style={styles.startBtnText}>🎮 Start Game!</Text>
                    }
                </TouchableOpacity>
            ) : (
                <View style={styles.waitingBox}>
                    <ActivityIndicator color={COLORS.secondary} size="small" />
                    <Text style={styles.waitingText}>Waiting for host to start...</Text>
                </View>
            )}
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
    shareBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 5 },
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
});

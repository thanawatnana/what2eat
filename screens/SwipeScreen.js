import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
    ActivityIndicator, Animated, Alert, Image
} from 'react-native';
import { COLORS } from '../constants/theme';
import { usePartyRoom } from '../hooks/usePartyRoom';

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function SwipeScreen({ route, navigation }) {
    const { roomId, roomCode, playerName } = route.params;
    const { snapshot, error, busy: isSubmitting, act, refresh, leave } = usePartyRoom(roomId, navigation);
    const currentFoodList = snapshot?.foods || [];
    const voted = new Set(snapshot?.myVotes || []);
    const nextIndex = currentFoodList.findIndex(food => !voted.has(String(food.id)));
    const currentIndex = nextIndex < 0 ? currentFoodList.length : nextIndex;
    const isDone = !!snapshot && nextIndex < 0;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const moved = useRef(false);
    const clicking = useRef(false);

    useEffect(() => {
      if (!snapshot || moved.current) return;
      if (snapshot.room.status === 'done') {
        moved.current = true;
        navigation.replace('Result', { matchedFoodId: snapshot.room.matched_food_id, roomCode, customFoods: snapshot.foods });
      } else if (snapshot.room.status === 'cancelled') {
        moved.current = true;
        Alert.alert('รอบนี้ถูกยกเลิก', 'มีผู้เล่นออกจากห้องหรือห้องหมดอายุ กรุณาสร้างห้องใหม่');
        navigation.popToTop();
      }
    }, [snapshot, navigation, roomCode]);

    const vote = async liked => {
      const food = currentFoodList[currentIndex];
      if (!food || clicking.current || isSubmitting) return;
      clicking.current = true;
      // A lost acknowledgement is recovered by polling; never advance optimistically.
      try { await act('vote', { foodId: String(food.id), liked }); }
      finally { clicking.current = false; }
    };
    const handleLike = () => vote(true);
    const handleSkip = () => vote(false);
    const statusControls = (
      <View>
        {!!error && <TouchableOpacity onPress={refresh}><Text style={{ color: '#C0392B', padding: 10 }}>{error} · แตะเพื่อลองใหม่</Text></TouchableOpacity>}
        <TouchableOpacity onPress={leave} disabled={isSubmitting} style={{ padding: 12 }}><Text>‹ ออกจากห้อง</Text></TouchableOpacity>
      </View>
    );

    if (currentFoodList.length === 0) {
        // 🎨 ==========================================
        // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
        // 🎨 ==========================================
        return (
            <SafeAreaView style={styles.container}>
                {statusControls}
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (isDone) {
        // 🎨 ==========================================
        // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
        // 🎨 ==========================================
        return (
            <SafeAreaView style={styles.container}>
                {statusControls}
                <View style={styles.doneCard}>
                    <Text style={styles.doneEmoji}>✅</Text>
                    <Text style={styles.doneTitle}>You're done!</Text>
                    <Text style={styles.doneSubtitle}>Waiting for others to finish...</Text>
                    {isSubmitting
                        ? <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
                        : <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 20 }} />
                    }
                </View>
            </SafeAreaView>
        );
    }

    const currentFood = currentFoodList[currentIndex];

    // 🎨 ==========================================

    // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

    // 🎨 ==========================================

    return (
        <SafeAreaView style={styles.container}>
                {statusControls}
            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${((currentIndex) / currentFoodList.length) * 100}%` }]} />
                </View>
                <Text style={styles.progressText}>{currentIndex + 1} / {currentFoodList.length}</Text>
            </View>

            {/* Food Card */}
            <Animated.View style={[styles.foodCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                {currentFood.image_url ? (
                    <Image source={{ uri: currentFood.image_url }} style={styles.foodImage} />
                ) : (
                    <Text style={styles.foodEmoji}>{currentFood.emoji || '🍽️'}</Text>
                )}
                <Text style={styles.foodName}>{currentFood.name}</Text>
                <View style={styles.tagRow}>
                    <Text style={styles.tag}>{currentFood.category || 'Custom'}</Text>
                    {currentFood.price && <Text style={styles.priceTag}>฿ {currentFood.price}</Text>}
                </View>
            </Animated.View>

            {/* ปุ่ม Skip / Like */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.swipeBtn, styles.skipBtn]} onPress={handleSkip} disabled={isSubmitting}>
                    <Text style={styles.swipeBtnIcon}>👎</Text>
                    <Text style={[styles.swipeBtnText, { color: '#E74C3C' }]}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.swipeBtn, styles.likeBtn]} onPress={handleLike} disabled={isSubmitting}>
                    <Text style={styles.swipeBtnIcon}>👍</Text>
                    <Text style={[styles.swipeBtnText, { color: COLORS.accent }]}>Like!</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.playerLabel}>Playing as: <Text style={{ fontWeight: 'bold' }}>{playerName}</Text></Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 20 },
    progressContainer: { width: '100%', marginBottom: 30, alignItems: 'center' },
    progressBg: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3 },
    progressFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
    progressText: { marginTop: 6, color: COLORS.textDark, fontSize: 13, fontWeight: '600', opacity: 0.6 },
    foodCard: {
        backgroundColor: COLORS.white, width: '100%', padding: 40, borderRadius: 28,
        alignItems: 'center', marginBottom: 40,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
    },
    foodImage: { width: 150, height: 150, borderRadius: 20, marginBottom: 15 },
    foodEmoji: { fontSize: 90, marginBottom: 15 },
    foodName: { fontSize: 26, fontWeight: 'bold', color: COLORS.textDark, textAlign: 'center', marginBottom: 15 },
    tagRow: { flexDirection: 'row', gap: 10 },
    tag: {
        backgroundColor: COLORS.accent, color: COLORS.white,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, fontSize: 14, fontWeight: 'bold',
    },
    priceTag: {
        backgroundColor: COLORS.background, color: COLORS.secondary,
        paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, fontSize: 14, fontWeight: 'bold',
        borderWidth: 1, borderColor: COLORS.secondary,
    },
    buttonRow: { flexDirection: 'row', gap: 20, width: '100%' },
    swipeBtn: {
        flex: 1, paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
    },
    skipBtn: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: '#E74C3C' },
    likeBtn: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.accent },
    swipeBtnIcon: { fontSize: 32, marginBottom: 4 },
    swipeBtnText: { fontSize: 16, fontWeight: 'bold' },
    playerLabel: { marginTop: 20, color: 'gray', fontSize: 13 },
    doneCard: {
        backgroundColor: COLORS.white, padding: 50, borderRadius: 28, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    },
    doneEmoji: { fontSize: 70, marginBottom: 15 },
    doneTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.secondary },
    doneSubtitle: { fontSize: 15, color: 'gray', marginTop: 8 },
});

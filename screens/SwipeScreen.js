import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView,
    ActivityIndicator, Animated, Alert, Image
} from 'react-native';
import { COLORS } from '../constants/theme';
import { foodList as fallbackFoodList } from '../data/foods';
import { supabase } from '../supabase';

export default function SwipeScreen({ route, navigation }) {
    const { roomId, roomCode, participantId, playerName, customFoods } = route.params;

    const [currentFoodList, setCurrentFoodList] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const channelRef = useRef(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // 1. โหลดข้อมูลเมนูอาหาร
    useEffect(() => {
        if (customFoods && customFoods.length > 0) {
            setCurrentFoodList(customFoods);
        } else {
            supabase.from('foods').select('*').then(({ data }) => {
                if (data && data.length > 0) {
                    setCurrentFoodList(data);
                } else {
                    setCurrentFoodList(fallbackFoodList);
                }
            });
        }
    }, [customFoods]);

    // 2. Subscribe Realtime — รอ matched_food_id เพื่อไป ResultScreen
    useEffect(() => {
        channelRef.current = supabase
            .channel(`result-${roomId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
                (payload) => {
                    if (payload.new.status === 'done' && payload.new.matched_food_id) {
                        navigation.replace('Result', {
                            matchedFoodId: payload.new.matched_food_id,
                            roomCode,
                            customFoods // ส่งต่อให้ ResultScreen เพื่อหาชื่อเมนู
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [roomId, customFoods]);

    const animateSwipe = (callback) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 0.85, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            callback();
            fadeAnim.setValue(1);
            scaleAnim.setValue(1);
        });
    };

    const recordSwipe = async (foodId, isLiked) => {
        const { error } = await supabase.from('swipes').insert({
            room_id: roomId,
            participant_id: participantId,
            food_id: foodId,
            is_liked: isLiked,
        });
        if (error) console.error('Swipe error:', error.message);
    };

    const handleLike = () => {
        const currentFood = currentFoodList[currentIndex];
        animateSwipe(async () => {
            await recordSwipe(currentFood.id, true);
            goNext();
        });
    };

    const handleSkip = () => {
        const currentFood = currentFoodList[currentIndex];
        animateSwipe(async () => {
            await recordSwipe(currentFood.id, false);
            goNext();
        });
    };

    const goNext = () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= currentFoodList.length) {
            finishSwiping();
        } else {
            setCurrentIndex(nextIndex);
        }
    };

    // Fix Bug: ต้องรอให้ทุกคน swipe ครบถึงจะสรุปผล
    const finishSwiping = async () => {
        setIsDone(true);
        setIsSubmitting(true);

        try {
            // นับจำนวนผู้เล่น
            const { data: allParticipants } = await supabase
                .from('participants')
                .select('id')
                .eq('room_id', roomId);
            const totalPlayers = allParticipants?.length ?? 1;
            const targetSwipes = totalPlayers * currentFoodList.length;

            // เช็คว่าทุกคน swipe ครบหรือยัง
            const { count: totalSwipes } = await supabase
                .from('swipes')
                .select('*', { count: 'exact', head: true })
                .eq('room_id', roomId);

            if (totalSwipes >= targetSwipes) {
                // ทุกคนทำเสร็จแล้ว -> สรุปผล!
                const { data: swipesData } = await supabase
                    .from('swipes')
                    .select('food_id, is_liked')
                    .eq('room_id', roomId)
                    .eq('is_liked', true);

                const likeCounts = {};
                swipesData?.forEach(({ food_id }) => {
                    likeCounts[food_id] = (likeCounts[food_id] || 0) + 1;
                });

                const sortedFoods = Object.keys(likeCounts).sort((a, b) => likeCounts[b] - likeCounts[a]);
                
                // คัดเฉพาะเมนูที่ทุกคน Like (คะแนนโหวตเท่ากับจำนวนผู้เล่น)
                const perfectMatches = sortedFoods.filter(id => likeCounts[id] >= totalPlayers);
                
                let finalMatch = 'no_match'; // ค่า default ถ้าไม่มีใครใจตรงกันเลย

                if (perfectMatches.length > 0) {
                    // ถ้ามีใจตรงกันหลายเมนู ให้สุ่มเลือก 1 เมนูจากที่ตรงกัน
                    finalMatch = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
                }

                await supabase
                    .from('rooms')
                    .update({ status: 'done', matched_food_id: finalMatch })
                    .eq('id', roomId);
            }
        } catch (err) {
            console.error('Finish swipe error:', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (currentFoodList.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (isDone) {
        return (
            <SafeAreaView style={styles.container}>
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

    return (
        <SafeAreaView style={styles.container}>
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
                <TouchableOpacity style={[styles.swipeBtn, styles.skipBtn]} onPress={handleSkip}>
                    <Text style={styles.swipeBtnIcon}>👎</Text>
                    <Text style={[styles.swipeBtnText, { color: '#E74C3C' }]}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.swipeBtn, styles.likeBtn]} onPress={handleLike}>
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

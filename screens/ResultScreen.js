import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Image, ScrollView
} from 'react-native';
import { COLORS } from '../constants/theme';
import { foodList as fallbackFoodList } from '../data/foods';
import { supabase } from '../supabase';

export default function ResultScreen({ route, navigation }) {
    const { matchedFoodId, roomCode, customFoods } = route.params;

    const [matchedFoods, setMatchedFoods] = useState([]);
    const [loading, setLoading] = useState(true);

    // Pop animation
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchFoods = async () => {
            if (!matchedFoodId || matchedFoodId === 'no_match') {
                setLoading(false);
                return;
            }

            // แปลง matchedFoodId (ที่อาจเป็น JSON string หรือ string เปล่าๆ) ให้เป็น array
            let idsToFetch = [];
            try {
                const parsed = JSON.parse(matchedFoodId);
                if (Array.isArray(parsed)) {
                    idsToFetch = parsed;
                } else {
                    idsToFetch = [matchedFoodId];
                }
            } catch (e) {
                // ถ้า parse ไม่ได้ แสดงว่าเป็น id เดี่ยวๆ (เผื่อ backward compatibility)
                idsToFetch = [matchedFoodId];
            }

            const finalFoods = [];

            for (const id of idsToFetch) {
                // 1. เช็คใน customFoods ก่อน
                if (customFoods && customFoods.length > 0) {
                    const found = customFoods.find(f => f.id === id);
                    if (found) {
                        finalFoods.push(found);
                        continue; // ไปอันต่อไป
                    }
                }
                
                // 2. หาใน DB
                const { data } = await supabase.from('foods').select('*').eq('id', id).single();
                if (data) {
                    finalFoods.push(data);
                } else {
                    // 3. หาใน fallback
                    const fallback = fallbackFoodList.find(f => f.id === id);
                    if (fallback) finalFoods.push(fallback);
                }
            }

            setMatchedFoods(finalFoods);
            setLoading(false);
        };
        
        fetchFoods();

        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 60,
            useNativeDriver: true,
        }).start();

        // Emoji bounce loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, { toValue: -10, duration: 500, useNativeDriver: true }),
                Animated.timing(bounceAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ])
        ).start();
    }, [matchedFoodId, customFoods]);

    const handlePlayAgain = () => {
        navigation.navigate('Party');
    };

    const handleGoHome = () => {
        navigation.navigate('MainTabs');
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
                <Text style={{color: COLORS.secondary}}>กำลังโหลดผลลัพธ์...</Text>
            </SafeAreaView>
        );
    }

    // กรณีไม่มี match (ไม่มีอาหารที่ทุกคน Like)
    if (matchedFoods.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center' }]}>
                <View style={styles.card}>
                    <Text style={styles.sadEmoji}>😢</Text>
                    <Text style={styles.noMatchTitle}>No Match Found!</Text>
                    <Text style={styles.noMatchSubtitle}>
                        ไม่มีอาหารที่ทุกคนชอบเลย{'\n'}ลองใหม่อีกครั้งนะ!
                    </Text>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.secondary, marginTop: 30 }]} onPress={handlePlayAgain}>
                        <Text style={styles.btnText}>🔄 Play Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.accent, marginTop: 12 }]} onPress={handleGoHome}>
                        <Text style={styles.btnText}>🏠 Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerArea}>
                <Text style={styles.roomLabel}>Room {roomCode}</Text>
                <Text style={styles.matchLabel}>
                    {matchedFoods.length > 1 ? `🎉 You all agreed on ${matchedFoods.length} items!` : '🎉 You all agreed on...'}
                </Text>
            </View>

            <View style={styles.listArea}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {matchedFoods.map((food, index) => (
                        <Animated.View key={index} style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
                            {food.image_url ? (
                                <Image source={{ uri: food.image_url }} style={styles.foodImage} />
                            ) : (
                                <Animated.Text style={[styles.foodEmoji, { transform: [{ translateY: bounceAnim }] }]}>
                                    {food.emoji || '🍽️'}
                                </Animated.Text>
                            )}
                            <Text style={styles.foodName}>{food.name}</Text>
                            <View style={styles.tagRow}>
                                <Text style={styles.tag}>{food.category || 'Custom'}</Text>
                                {food.price && <Text style={styles.priceTag}>฿ {food.price}</Text>}
                            </View>
                        </Animated.View>
                    ))}
                    <View style={styles.divider} />
                    <Text style={styles.enjoyText}>Enjoy your meal! 🍽️</Text>
                </ScrollView>
            </View>

            {/* Action buttons */}
            <View style={styles.actionArea}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={handlePlayAgain}>
                    <Text style={styles.btnText}>🔄 Play Again</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.secondary, marginTop: 12 }]} onPress={handleGoHome}>
                    <Text style={styles.btnText}>🏠 Back to Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', paddingTop: 20 },
    headerArea: { alignItems: 'center', marginBottom: 15, width: '100%' },
    listArea: { flex: 1, width: '100%' },
    scrollContent: { alignItems: 'center', paddingBottom: 30, width: '100%' },
    actionArea: { width: '100%', padding: 20, backgroundColor: COLORS.background },
    roomLabel: { fontSize: 13, color: 'gray', fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
    matchLabel: {
        fontSize: 22, fontWeight: 'bold', color: COLORS.secondary,
        marginBottom: 10, textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.white, width: '90%', padding: 40, borderRadius: 28, alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
    },
    foodImage: { width: 160, height: 160, borderRadius: 20, marginBottom: 15 },
    foodEmoji: { fontSize: 100, marginBottom: 15 },
    foodName: { fontSize: 28, fontWeight: 'bold', color: COLORS.textDark, textAlign: 'center', marginBottom: 15 },
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
    divider: { width: 60, height: 4, backgroundColor: '#EEE', borderRadius: 2, marginVertical: 25 },
    enjoyText: { fontSize: 16, color: 'gray', fontWeight: 'bold', fontStyle: 'italic', marginBottom: 20 },
    btn: { width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    btnText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
    sadEmoji: { fontSize: 80, marginBottom: 20 },
    noMatchTitle: { fontSize: 26, fontWeight: 'bold', color: '#E74C3C', marginBottom: 10 },
    noMatchSubtitle: { fontSize: 16, color: 'gray', textAlign: 'center', lineHeight: 24 },
});

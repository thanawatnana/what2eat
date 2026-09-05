import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Image
} from 'react-native';
import { COLORS } from '../constants/theme';
import { foodList as fallbackFoodList } from '../data/foods';
import { supabase } from '../supabase';

export default function ResultScreen({ route, navigation }) {
    const { matchedFoodId, roomCode, customFoods } = route.params;

    const [matchedFood, setMatchedFood] = useState(null);
    const [loading, setLoading] = useState(true);

    // Pop animation
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchFood = async () => {
            // เช็คใน customFoods ก่อน
            if (customFoods && customFoods.length > 0) {
                const found = customFoods.find(f => f.id === matchedFoodId);
                if (found) {
                    setMatchedFood(found);
                    setLoading(false);
                    return;
                }
            }
            
            // หาใน DB
            const { data } = await supabase.from('foods').select('*').eq('id', matchedFoodId).single();
            if (data) {
                setMatchedFood(data);
            } else {
                // หาใน fallback
                setMatchedFood(fallbackFoodList.find(f => f.id === matchedFoodId) || null);
            }
            setLoading(false);
        };
        fetchFood();

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
            <SafeAreaView style={styles.container}>
                <Text style={{color: COLORS.secondary}}>กำลังโหลดผลลัพธ์...</Text>
            </SafeAreaView>
        );
    }

    // กรณีไม่มี match (ไม่มีอาหารที่ทุกคน Like)
    if (!matchedFood) {
        return (
            <SafeAreaView style={styles.container}>
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
            <Text style={styles.roomLabel}>Room {roomCode}</Text>

            <Text style={styles.matchLabel}>🎉 You all agreed on...</Text>

            <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
                {matchedFood.image_url ? (
                    <Image source={{ uri: matchedFood.image_url }} style={styles.foodImage} />
                ) : (
                    <Animated.Text style={[styles.foodEmoji, { transform: [{ translateY: bounceAnim }] }]}>
                        {matchedFood.emoji || '🍽️'}
                    </Animated.Text>
                )}
                <Text style={styles.foodName}>{matchedFood.name}</Text>
                <View style={styles.tagRow}>
                    <Text style={styles.tag}>{matchedFood.category || 'Custom'}</Text>
                    {matchedFood.price && <Text style={styles.priceTag}>฿ {matchedFood.price}</Text>}
                </View>
                <View style={styles.divider} />
                <Text style={styles.enjoyText}>Enjoy your meal! 🍽️</Text>
            </Animated.View>

            {/* Action buttons */}
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={handlePlayAgain}>
                <Text style={styles.btnText}>🔄 Play Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.secondary, marginTop: 12 }]} onPress={handleGoHome}>
                <Text style={styles.btnText}>🏠 Back to Home</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 20 },
    roomLabel: { fontSize: 13, color: 'gray', fontWeight: '600', marginBottom: 8, letterSpacing: 1 },
    matchLabel: {
        fontSize: 22, fontWeight: 'bold', color: COLORS.secondary,
        marginBottom: 30, textAlign: 'center',
    },
    card: {
        backgroundColor: COLORS.white, width: '100%', padding: 40, borderRadius: 28, alignItems: 'center',
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
    divider: { width: '80%', height: 1, backgroundColor: '#EEE', marginVertical: 20 },
    enjoyText: { fontSize: 16, color: 'gray', fontWeight: '600' },
    btn: {
        width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
    },
    btnText: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
    sadEmoji: { fontSize: 80, marginBottom: 15 },
    noMatchTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.secondary },
    noMatchSubtitle: { fontSize: 15, color: 'gray', textAlign: 'center', marginTop: 10 },
});

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.mainTitle}>What2Eat</Text>
        <Text style={styles.subtitle}>What are you craving today?</Text>
      </View>

      <View style={styles.gridContainer}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('Solo')}>
          <Text style={styles.boxEmoji}>🎲</Text>
          <Text style={styles.boxText}>Solo Random</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.secondary }]} onPress={() => navigation.navigate('Party')}>
          <Text style={styles.boxEmoji}>🔥</Text>
          <Text style={styles.boxText}>Group Party</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.accent }]} onPress={() => navigation.navigate('History')}>
          <Text style={styles.boxEmoji}>🕒</Text>
          <Text style={styles.boxText}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#E74C3C' }]} onPress={() => navigation.navigate('Favorites')}>
          <Text style={styles.boxEmoji}>❤️</Text>
          <Text style={styles.boxText}>Favorites</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.bottomLink} onPress={() => navigation.navigate('AllFoods')}>
        <Text style={styles.bottomLinkText}>View all food menus</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  headerContainer: { marginTop: 80, marginBottom: 40, alignItems: 'center' },
  mainTitle: { fontSize: 42, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: COLORS.textDark, marginTop: 5, opacity: 0.7 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, paddingHorizontal: 20 },
  gridBox: {
    width: '45%', aspectRatio: 1, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  boxEmoji: { fontSize: 45, marginBottom: 10 },
  boxText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  bottomLink: { marginTop: 'auto', marginBottom: 50, padding: 10 },
  bottomLinkText: { color: COLORS.textLight, fontSize: 14, fontWeight: '300', textDecorationLine: 'underline' },
});
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* ปุ่มเปิด Drawer แทน header */}
      <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      <View style={styles.headerContainer}>
        <Text style={styles.mainTitle}>What2Eat</Text>
        <Text style={styles.subtitle}>วันนี้กินอะไรดี? 🤔</Text>
      </View>

      <View style={styles.gridContainer}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.primary }]} onPress={() => navigation.navigate('Solo')}>
          <Text style={styles.boxEmoji}>🎲</Text>
          <Text style={styles.boxText}>สุ่มกินคนเดียว</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.secondary }]} onPress={() => navigation.navigate('Party')}>
          <Text style={styles.boxEmoji}>🔥</Text>
          <Text style={styles.boxText}>ปาร์ตี้กับเพื่อน</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: COLORS.accent }]} onPress={() => navigation.navigate('History')}>
          <Text style={styles.boxEmoji}>🕒</Text>
          <Text style={styles.boxText}>ประวัติการสุ่ม</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#E74C3C' }]} onPress={() => navigation.navigate('Favorites')}>
          <Text style={styles.boxEmoji}>❤️</Text>
          <Text style={styles.boxText}>เมนูโปรด</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background },
  menuBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8 },
  menuIcon: { fontSize: 26, color: COLORS.secondary },
  headerContainer: { marginTop: 80, marginBottom: 50, alignItems: 'center' },
  mainTitle: { fontSize: 46, fontWeight: '900', color: COLORS.secondary, letterSpacing: 1 },
  subtitle: { fontSize: 18, color: COLORS.textDark, marginTop: 8, opacity: 0.8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 20, paddingHorizontal: 20 },
  gridBox: {
    width: '43%', aspectRatio: 1, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  boxEmoji: { fontSize: 50, marginBottom: 12 },
  boxText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
});
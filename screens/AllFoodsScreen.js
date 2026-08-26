import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { COLORS } from '../constants/theme';

export default function AllFoodsScreen() {
  const [foodName, setFoodName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [price, setPrice] = useState('');

  // TODO: เตรียมต่อ API หรือ Supabase
  const handleAddFood = () => {
    if (!foodName || !emoji) {
      alert('กรุณากรอกชื่อเมนูและอิโมจิให้ครบถ้วนครับ');
      return;
    }
    alert(`เพิ่มเมนู ${emoji} ${foodName} เรียบร้อย!`);
    setFoodName(''); setEmoji(''); setPrice('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.content}>
        <Text style={styles.title}>เพิ่มเมนูใหม่ 🍽️</Text>
        <Text style={styles.subtitle}>สร้างเมนูที่คุณอยากให้สุ่มเจอในแอป</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>อิโมจิอาหาร (เช่น 🍜)</Text>
          <TextInput style={styles.input} placeholder="ใส่ 1 อิโมจิ" value={emoji} onChangeText={setEmoji} maxLength={2} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ชื่อเมนูอาหาร</Text>
          <TextInput style={styles.input} placeholder="เช่น ก๋วยเตี๋ยวเรือ" value={foodName} onChangeText={setFoodName} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ราคาโดยประมาณ (บาท)</Text>
          <TextInput style={styles.input} placeholder="เช่น 50" value={price} onChangeText={setPrice} keyboardType="numeric" />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleAddFood}>
          <Text style={styles.saveButtonText}>✅ บันทึกเมนู</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 25, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.secondary, marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  input: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  saveButton: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 10, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  saveButtonText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' }
});
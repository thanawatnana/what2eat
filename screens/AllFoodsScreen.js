import React from 'react';
import { StyleSheet, Text, View, FlatList, SafeAreaView } from 'react-native';
import { COLORS } from '../constants/theme';
import { foodList } from '../data/foods';

export default function AllFoodsScreen() {
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>{item.category}</Text>
          <Text style={styles.priceTag}>฿ {item.price}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={foodList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContainer: { padding: 20 },
  card: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  emoji: { fontSize: 45, marginRight: 15 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  tagContainer: { flexDirection: 'row', gap: 10 },
  tag: { backgroundColor: COLORS.accent, color: COLORS.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontSize: 12, fontWeight: 'bold' },
  priceTag: { backgroundColor: COLORS.background, color: COLORS.secondary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, fontSize: 12, fontWeight: 'bold', borderWidth: 1, borderColor: COLORS.secondary },
});
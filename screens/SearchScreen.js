import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase';

export default function SearchScreen({ navigation }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (text) => {
    if (!text.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const q = '%' + text + '%';
      const [sys, usr] = await Promise.all([
        supabase.from('foods').select('*').ilike('name', q),
        (user && !user.is_guest)
          ? supabase.from('user_foods').select('*').eq('user_id', user.id).ilike('name', q)
          : Promise.resolve({ data: [] }),
      ]);
      setResults([
        ...(sys.data || []).map(f => ({ ...f, src: 'system' })),
        ...(usr.data || []).map(f => ({ ...f, src: 'user' })),
      ]);
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  const Item = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.category} • ฿{item.price}{item.src === 'user' ? '  📌' : ''}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })} style={styles.back}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{'< หน้าแรก'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="🔍 ค้นหาอาหาร..."
          placeholderTextColor="#bbb"
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }} style={styles.clear}>
            <Text style={{ fontSize: 18, color: '#999' }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.src + item.id}
          renderItem={({ item }) => <Item item={item} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 }}
          ListHeaderComponent={searched && results.length > 0 ? <Text style={styles.count}>📋 พบ {results.length} เมนู</Text> : null}
          ListEmptyComponent={searched ? (
            <View style={styles.center}>
              <Text style={{ fontSize: 48 }}>😕</Text>
              <Text style={styles.emptyTxt}>ไม่พบ "{query}"</Text>
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={{ fontSize: 56 }}>🍽</Text>
              <Text style={styles.emptyTxt}>พิมพ์ชื่อเมนูเพื่อค้นหา</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 10 },
  back: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#F7F7F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#2C3E50', borderWidth: 1, borderColor: '#EBEBEB' },
  clear: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  count: { fontSize: 13, color: '#aaa', marginBottom: 10, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  emoji: { fontSize: 36 },
  name: { fontSize: 15, fontWeight: '800', color: '#2C3E50' },
  meta: { fontSize: 12, color: '#aaa', marginTop: 3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  emptyTxt: { fontSize: 16, color: '#bbb', fontWeight: '600' },
});
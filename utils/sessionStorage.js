import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Chunk native sessions because some keychains reject values larger than 2 KB.
// Web sessions use memory only; no persistent browser token in localStorage.
const memory = new Map();
const SIZE = 1500;
export const sessionStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') return memory.get(key) ?? null;
    const count = Number(await SecureStore.getItemAsync(`${key}.count`));
    if (!count || count > 100) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some(part => part === null) ? null : parts.join('');
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') { memory.set(key, value); return; }
    await sessionStorage.removeItem(key);
    const parts = value.match(new RegExp(`.{1,${SIZE}}`, 'gs')) ?? [];
    await Promise.all(parts.map((part, i) => SecureStore.setItemAsync(`${key}.${i}`, part)));
    await SecureStore.setItemAsync(`${key}.count`, String(parts.length));
  },
  async removeItem(key) {
    if (Platform.OS === 'web') { memory.delete(key); return; }
    const count = Math.min(Number(await SecureStore.getItemAsync(`${key}.count`)) || 0, 100);
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
    await SecureStore.deleteItemAsync(`${key}.count`);
  },
};

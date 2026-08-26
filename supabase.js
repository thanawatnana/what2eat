import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// เปลี่ยน 2 ค่านี้เป็นของคุณจากหน้า Settings -> API ใน Supabase
const supabaseUrl = 'https://rsbflshmxakeasrykhif.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzYmZsc2hteGFrZWFzcnlraGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzMzOTMsImV4cCI6MjEwMzA0OTM5M30.g_dCCBfqTMXZzBy6otkG8_ViejuDlSy1B09kbManaT4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { partyAction } from '../services/party';

// Reconnects and missed realtime events recover from a server snapshot.
export function usePartyRoom(roomId, navigation) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef(false);
  const revision = useRef(0);
  const writing = useRef(false);
  const reading = useRef(false);
  const focused = useIsFocused();

  const refresh = useCallback(async () => {
    if (reading.current || writing.current || !live.current) return;
    reading.current = true;
    const rev = revision.current;
    try {
      const next = await partyAction('snapshot', { roomId });
      if (live.current && rev === revision.current) { setSnapshot(next); setError(''); }
    } catch (err) {
      if (live.current && rev === revision.current) setError(err.message);
    } finally { reading.current = false; }
  }, [roomId]);

  const act = useCallback(async (action, payload = {}) => {
    if (writing.current) return null;
    writing.current = true;
    revision.current += 1;
    setBusy(true);
    try {
      const next = await partyAction(action, { ...payload, roomId });
      if (live.current) { if (next.room) setSnapshot(next); setError(''); }
      return next;
    } catch (err) {
      if (live.current) setError(err.message);
      return null;
    } finally {
      writing.current = false;
      if (live.current) setBusy(false);
    }
  }, [roomId]);

  const leave = useCallback(() => {
    Alert.alert('ออกจากห้อง?', 'หากเกมเริ่มแล้ว การออกจะยกเลิกรอบนี้สำหรับทุกคน', [
      { text: 'อยู่ต่อ', style: 'cancel' },
      { text: 'ออกจากห้อง', style: 'destructive', onPress: async () => {
        if (await act('leave')) navigation.popToTop();
      } },
    ]);
  }, [act, navigation]);

  useEffect(() => {
    live.current = focused;
    if (!focused) return;
    refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 2000);
    const app = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; });
    const channel = supabase.channel(`party-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, refresh)
      .subscribe(status => { if (status === 'SUBSCRIBED') refresh(); });
    return () => {
      live.current = false;
      revision.current += 1;
      clearInterval(timer); app.remove(); back.remove();
      supabase.removeChannel(channel);
    };
  }, [roomId, focused, refresh, leave]);

  return { snapshot, error, busy, act, refresh, leave };
}

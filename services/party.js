import { supabase } from '../supabase';

export async function partyAction(action, payload = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await supabase.rpc('party', {
      p_action: action, p_payload: payload,
    }).abortSignal(controller.signal);
    if (error) throw new Error('เชื่อมต่อห้องไม่สำเร็จ กรุณาลองอีกครั้ง');
    if (!data || data.error) throw new Error(data?.error || 'ไม่พบข้อมูลห้อง');
    return data;
  } finally { clearTimeout(timeout); }
}

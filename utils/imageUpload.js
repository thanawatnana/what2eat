import { decode } from 'base64-arraybuffer';
import { supabase } from '../supabase';

export const IMAGE_PICKER_OPTIONS = {
  mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
};

// Expo's base64 image payload is JPEG. Never decode a file:// URI as base64.
export function imageBytes(base64) {
  if (typeof base64 !== 'string' || !base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    throw new Error('ไม่พบข้อมูลรูปภาพ กรุณาเลือกรูปใหม่');
  }
  const bytes = decode(base64);
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('รูปภาพต้องมีขนาดไม่เกิน 5 MB');
  if (bytes.byteLength === 0) throw new Error('รูปภาพว่างเปล่า');
  const signature = new Uint8Array(bytes.slice(0, 12));
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
  const isWebp = String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) throw new Error('รองรับเฉพาะรูป JPEG, PNG หรือ WebP');
  if (isPng) return { bytes, contentType: 'image/png', extension: 'png' };
  if (isWebp) return { bytes, contentType: 'image/webp', extension: 'webp' };
  return { bytes, contentType: 'image/jpeg', extension: 'jpg' };
}

export async function uploadImage({ base64, userId, bucket = 'food-images' }) {
  if (!userId || !['food-images', 'avatars', 'advertisements'].includes(bucket)) throw new Error('กรุณาเข้าสู่ระบบใหม่');
  const { bytes, contentType, extension } = imageBytes(base64);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType, upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, bucket };
}

export async function discardUpload(upload) {
  if (upload) await supabase.storage.from(upload.bucket).remove([upload.path]);
}

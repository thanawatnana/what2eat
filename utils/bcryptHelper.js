import bcrypt from 'bcryptjs';

/**
 * Task 2: Fix Bcrypt Crash on React Native
 * 
 * React Native ไม่มี Node.js `crypto` module ที่ bcryptjs ต้องการ
 * เราใช้ Math.random() เป็น fallback เพื่อให้ generate salt/hash ได้
 * 
 * NOTE: สำหรับ Production ที่ต้องการ security สูง ให้ใช้ expo-crypto แทน
 */
bcrypt.setRandomFallback((len) => {
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = Math.floor(Math.random() * 256);
    }
    return buf;
});

export default bcrypt;

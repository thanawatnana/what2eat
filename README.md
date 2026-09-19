# Joykin / What2Eat

แอป Expo สำหรับสุ่มเมนูแบบ Solo และโหวตร่วมกันใน Party mode โดยใช้ Supabase Auth, Database, Storage, Realtime และ Edge Functions

## เปิดบนมือถือด้วย Expo Go

ต้องติดตั้ง Node.js และ Expo Go บนมือถือ แล้วให้คอมพิวเตอร์กับมือถืออยู่เครือข่ายเดียวกัน

```powershell
npm install
npx expo start
```

สแกน QR ที่แสดงใน terminal ด้วย Expo Go หาก LAN เชื่อมไม่ได้ ให้ลอง `npx expo start --tunnel`

## ตรวจสอบก่อนใช้งาน

```powershell
npm test
npm run test:security
npx expo-doctor
```

ค่า URL และ publishable/anon key เป็นข้อมูล public client config และ override ได้ด้วย `EXPO_PUBLIC_SUPABASE_URL` กับ `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ห้ามนำ `service_role` key มาไว้ในแอป

Schema ที่ใช้งานจริงอยู่ใน `database/secure_auth_and_party.sql` และ Edge Function สำหรับย้ายบัญชีเดิมแบบปลอดภัยอยู่ใน `supabase/functions/account-login/index.ts`

## พฤติกรรมสำคัญ

- Session บนมือถือเก็บใน SecureStore
- บัญชีเดิมถูกย้ายเข้า Supabase Auth หลังตรวจรหัสผ่านบนเซิร์ฟเวอร์ และต้องยืนยันอีเมลก่อนใช้
- Party mode ตัดสินผลและกันโหวตซ้ำแบบ atomic ในฐานข้อมูล
- รูปอาหาร/โปรไฟล์รองรับ JPEG, PNG และ WebP ขนาดไม่เกิน 5 MB
- Big Party ยังไม่รับชำระเงินและยังไม่เปิดใช้งาน

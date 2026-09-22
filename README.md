# Joykin / What2Eat

แอป Expo สำหรับสุ่มเมนูแบบ Solo และโหวตร่วมกันใน Party mode โดยใช้ Supabase Auth, Database, Storage, Realtime และ Edge Functions

หน้า "ร้านใกล้คุณ" ใช้ GPS และข้อมูลร้านจริงจาก OpenStreetMap โดยไม่ต้องใช้ API key หากผู้ใช้ไม่อนุญาตตำแหน่งหรือบริการข้อมูลไม่พร้อม แอปจะแสดงร้านตัวอย่างรอบตำแหน่งเพื่อให้ยังทดลองการทำงานได้

## เปิดบนมือถือด้วย Expo Go

ต้องติดตั้ง Node.js และ Expo Go บนมือถือ แล้วเลือกวิธีเชื่อมต่อตามตำแหน่งของผู้ทดสอบ

### ทดสอบบน Wi-Fi เดียวกัน (เร็วกว่า)

```powershell
npm install
npx expo start
```

สแกน QR ที่แสดงใน terminal ด้วย Expo Go หาก LAN เชื่อมไม่ได้ ให้ลอง `npx expo start --tunnel`

### ให้ผู้ทดสอบเชื่อมจากคนละเครือข่าย

```powershell
npx expo start --tunnel
```

ส่ง QR ที่แสดงใน terminal ให้ผู้ทดสอบสแกนด้วย Expo Go คอมพิวเตอร์ที่รัน Metro ต้องเปิดอยู่และเชื่อมอินเทอร์เน็ตตลอดการทดสอบ โดย tunnel จะช้ากว่า LAN เล็กน้อยและ URL จะหยุดทำงานเมื่อปิดคำสั่ง

การยืนยันอีเมลใช้รหัส PIN ภายในแอป จึงไม่ต้องเปิด callback URL เพื่อรับลิงก์ยืนยันอีเมล

## ตรวจสอบก่อนใช้งาน

```powershell
npm test
npm run test:security
npx expo-doctor
```

ค่า URL และ publishable/anon key เป็นข้อมูล public client config และ override ได้ด้วย `EXPO_PUBLIC_SUPABASE_URL` กับ `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ห้ามนำ `service_role` key มาไว้ในแอป

Schema ที่ใช้งานจริงอยู่ใน `database/secure_auth_and_party.sql` ส่วน Edge Functions สำหรับสมัครและล็อกอินอยู่ใน `supabase/functions/account-register/index.ts` และ `supabase/functions/account-login/index.ts`

## ตั้งอีเมลยืนยันเป็น PIN

Supabase ต้องใช้ Custom SMTP หรือแผนที่อนุญาตให้แก้ Email Template ก่อน จึงจะเปลี่ยนอีเมลเริ่มต้นจากลิงก์เป็น PIN ได้ หลังตั้ง SMTP แล้วให้เปิด Authentication > Emails > Confirm sign up และใช้เนื้อหาจาก `supabase/templates/confirmation.html` โดยต้องมี `{{ .Token }}` และต้องไม่มี `{{ .ConfirmationURL }}`

ใน Authentication > Rate Limits ให้ตั้งระยะส่งอีเมลซ้ำขั้นต่ำเป็น 30 วินาที และตั้ง Email OTP length เป็น 6 หลัก หน้าจอในแอปใช้ค่าเดียวกันนี้ หากฝั่ง Supabase ยังตั้งค่าเริ่มต้น 60 วินาที ปุ่มในแอปจะนับครบ 30 วินาทีแต่เซิร์ฟเวอร์จะยังปฏิเสธการส่งซ้ำจนกว่าจะครบเวลาของเซิร์ฟเวอร์

ผู้ใช้ที่ไม่กรอกอีเมลจะสมัครและเข้าแอปทันที ผู้ใช้ที่กรอกอีเมลจะยังไม่มีแถวโปรไฟล์ใน `public.users` จนกว่าจะกรอก PIN ถูกต้อง

## พฤติกรรมสำคัญ

- Session บนมือถือเก็บใน SecureStore
- บัญชีเดิมถูกย้ายเข้า Supabase Auth หลังตรวจรหัสผ่านบนเซิร์ฟเวอร์ และบัญชีที่มีอีเมลต้องยืนยัน PIN ก่อนใช้
- Party mode ตัดสินผลและกันโหวตซ้ำแบบ atomic ในฐานข้อมูล
- รูปอาหาร/โปรไฟล์รองรับ JPEG, PNG และ WebP ขนาดไม่เกิน 5 MB
- Big Party ยังไม่รับชำระเงินและยังไม่เปิดใช้งาน

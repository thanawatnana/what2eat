# 🛠️ Tech Stack — What2Eat

## 💻 Development Environment

| เครื่องมือ | รายละเอียด |
|---|---|
| **Antigravity IDE** | AI-powered IDE สำหรับเขียนและแก้โค้ด |
| **Expo Go** | แอปบนมือถือสำหรับทดสอบแอปแบบ real-time โดยสแกน QR Code |

> โปรเจกต์นี้รันบน **local machine** ผ่าน `npx expo start`  
> แล้วเปิดดูบนมือถือด้วย **Expo Go** app (ไม่ใช่ Snack Expo)

---

## 📱 Mobile App Framework

| เครื่องมือ | รายละเอียด |
|---|---|
| **React Native** | Framework สร้าง Mobile App ด้วย JavaScript |
| **Expo SDK ~54** | ชุดเครื่องมือ + library เสริมสำหรับ React Native |
| **JavaScript (ES6+)** | ภาษาโปรแกรมหลักที่ใช้ทั้งโปรเจกต์ |

---

## 🗄️ Backend & Database

| เครื่องมือ | รายละเอียด |
|---|---|
| **Supabase** | Backend-as-a-Service (BaaS) |
| **PostgreSQL** | Database หลัก (Supabase ใช้ PostgreSQL) |
| **Supabase Storage** | เก็บไฟล์รูปภาพ (อาหาร + รูปโปรไฟล์) |
| **Supabase Realtime** | Websocket สำหรับ Party mode (sync ผลโหวต real-time) |

---

## 📦 Libraries หลัก

| Library | ใช้ทำอะไร |
|---|---|
| `@react-navigation/native` | จัดการ navigation ระหว่างหน้าจอ |
| `@react-navigation/native-stack` | Stack navigator (Login → Home) |
| `@react-navigation/drawer` | Drawer navigator (เมนูลิ้นชัก) |
| `@supabase/supabase-js` | เชื่อมต่อ Supabase จาก JavaScript |
| `bcryptjs` | เข้ารหัส Password ก่อนเก็บ DB |
| `expo-image-picker` | เลือกรูปภาพจากกล้อง/แกลเลอรีในมือถือ |
| `expo-status-bar` | จัดการ status bar บนมือถือ |
| `@react-native-async-storage` | เก็บข้อมูล cache ในเครื่อง |
| `react-native-gesture-handler` | รองรับ gesture / swipe |
| `react-native-reanimated` | Animation บน React Native |

---

## 🗂️ ภาพรวม Architecture

```
[มือถือ]
   ↕ Expo Go (scan QR)
[React Native + JavaScript]
   ↕ Supabase JS Client
[Supabase]
├── PostgreSQL
│   ├── users         (บัญชีผู้ใช้)
│   ├── foods         (เมนูระบบ)
│   ├── user_foods    (เมนูส่วนตัว)
│   ├── history       (ประวัติสุ่ม)
│   ├── favorites     (เมนูโปรด)
│   ├── rooms         (ห้อง Party)
│   ├── participants  (ผู้เล่นในห้อง)
│   └── swipes        (ผลโหวต)
├── Storage
│   ├── avatars       (รูปโปรไฟล์)
│   └── food-images   (รูปเมนูอาหาร)
└── Realtime
    └── rooms channel (sync Party voting)
```

# 🗄️ รายงานจุดเชื่อมต่อฐานข้อมูลทั้งหมด (What2Eat)

> **ฐานข้อมูล**: Supabase (PostgreSQL)  
> **Client**: `@supabase/supabase-js`  
> **ภาษาที่ใช้ Query**: Supabase JS SDK (`.from().select/insert/update/delete()`)  
> **Config หลัก**: [`supabase.js`](file:///d:/Code/what2eat/supabase.js)

---

## 🏆 ลำดับความสำคัญ (มาก → น้อย)

---

## 1. 🔐 [LoginScreen.js](file:///d:/Code/what2eat/screens/LoginScreen.js) — **สำคัญสูงสุด**

ประตูเข้าระบบ — ทุก user ต้องผ่านที่นี่

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `users` | `.from('users').select('id, name_account, username, password_hash, is_guest').eq('username', ...).maybeSingle()` | L50-54 |
| **SELECT** | `users` | `.from('users').select('id, name_account, username, is_guest').eq('id', GUEST_USER_ID).maybeSingle()` | L95-99 |

**หมายเหตุ**: ดึง password_hash แล้ว verify ด้วย bcrypt (ไม่ได้ใช้ Supabase Auth)

---

## 2. 📝 [RegisterScreen.js](file:///d:/Code/what2eat/screens/RegisterScreen.js) — **สำคัญสูง**

สมัครสมาชิก — เขียนข้อมูล user ใหม่

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `users` | `.from('users').select('id').eq('username', ...).maybeSingle()` | L79-83 |
| **SELECT** | `users` | `.from('users').select('id').eq('email', ...).maybeSingle()` | L91-95 |
| **INSERT** | `users` | `.from('users').insert({ name_account, username, email, password_hash, is_guest })` | L107-113 |

---

## 3. 🎲 [SoloScreen.js](file:///d:/Code/what2eat/screens/SoloScreen.js) — **สำคัญสูง**

ฟีเจอร์หลักของแอป (สุ่มเมนูเดี่ยว) — มี query มากที่สุด

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `foods` | `.from('foods').select('*').order('created_at')` | L64 |
| **SELECT** | `user_foods` | `.from('user_foods').select('*').eq('user_id', ...).order('created_at')` | L65 |
| **SELECT** | `favorites` | `.from('favorites').select('food_name').eq('user_id', ...)` | L83 |
| **INSERT** | `history` | `.from('history').insert({ user_id, food_name, food_category, mode, image_url, emoji })` | L145-152 |
| **INSERT** | `favorites` | `.from('favorites').insert({ user_id, food_name, food_category })` | L170-174 |
| **INSERT** | `user_foods` | `.from('user_foods').insert({ user_id, name, image_url, category, price })` | L238-244 |
| **STORAGE upload** | `food-images` | `.storage.from('food-images').upload(path, arrayBuffer, ...)` | L211-213 |
| **STORAGE getPublicUrl** | `food-images` | `.storage.from('food-images').getPublicUrl(path)` | L217 |

---

## 4. 🏠 [HomeScreen.js](file:///d:/Code/what2eat/screens/HomeScreen.js) — **สำคัญสูง**

หน้าแรก — โหลดข้อมูลตอน app เปิด

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `foods` | `.from('foods').select('*')` | L41 |
| **STORAGE getPublicUrl** | `avatars` | `.storage.from('avatars').getPublicUrl(path)` | L55 |

---

## 5. ⚙️ [SettingsScreen.js](file:///d:/Code/what2eat/screens/SettingsScreen.js) — **สำคัญปานกลาง-สูง**

จัดการโปรไฟล์ user

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **STORAGE getPublicUrl** | `avatars` | `.storage.from('avatars').getPublicUrl(path)` | L41 |
| **STORAGE upload** | `avatars` | `.storage.from('avatars').upload(path, arrayBuffer, ...)` | L58-60 |
| **UPDATE** | `users` | `.from('users').update({ profile_image_url }).eq('id', ...)` | L70 |
| **UPDATE** | `users` | `.from('users').update({ name_account }).eq('id', ...)` | L126-129 |

---

## 6. 🍽️ [AllFoodsScreen.js](file:///d:/Code/what2eat/screens/AllFoodsScreen.js) — **สำคัญปานกลาง**

ดูและจัดการเมนูทั้งหมด (CRUD เมนูส่วนตัว)

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `foods` | `.from('foods').select('*').order('created_at')` | L53 |
| **SELECT** | `user_foods` | `.from('user_foods').select('*').eq('user_id', ...).order('created_at')` | L54 |
| **DELETE** | `user_foods` | `.from('user_foods').delete().eq('id', ...)` | L79 |
| **INSERT** | `user_foods` | `.from('user_foods').insert({ user_id, name, image_url, category, price })` | L123-129 |
| **UPDATE** | `user_foods` | `.from('user_foods').update({ name, image_url, category, price }).eq('id', ...).select()` | L181-185 |
| **STORAGE upload** | `food-images` | `.storage.from('food-images').upload(path, arrayBuffer, ...)` | L103-105 |
| **STORAGE getPublicUrl** | `food-images` | `.storage.from('food-images').getPublicUrl(path)` | L107 |

---

## 7. 🎮 [PartyScreen.js](file:///d:/Code/what2eat/screens/PartyScreen.js) — **สำคัญปานกลาง**

สร้าง/เข้าร่วมห้อง Party

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **INSERT** | `rooms` | `.from('rooms').insert({ room_code, status }).select().single()` | L29-33 |
| **INSERT** | `participants` | `.from('participants').insert({ room_id, name }).select().single()` | L38-42 |
| **SELECT** | `rooms` | `.from('rooms').select('*').eq('room_code', ...).eq('status', 'waiting').single()` | L75-80 |
| **INSERT** | `participants` | `.from('participants').insert({ room_id, name }).select().single()` | L89-93 |

---

## 8. 🏟️ [LobbyScreen.js](file:///d:/Code/what2eat/screens/LobbyScreen.js) — **สำคัญปานกลาง**

ห้องรอ + Realtime

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `participants` | `.from('participants').select('*').eq('room_id', ...).order('joined_at')` | L52-56 |
| **UPDATE** | `rooms` | `.from('rooms').update({ status: 'playing' }).eq('id', ...)` | L67-70 |
| **REALTIME** | `participants` | `.channel().on('postgres_changes', { event: '*', table: 'participants' }, ...)` | L22-28 |
| **REALTIME** | `rooms` | `.channel().on('postgres_changes', { event: 'UPDATE', table: 'rooms' }, ...)` | L29-43 |

---

## 9. 👆 [SwipeScreen.js](file:///d:/Code/what2eat/screens/SwipeScreen.js) — **สำคัญปานกลาง**

Swipe โหวตอาหาร Party mode

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **INSERT** | `swipes` | `.from('swipes').insert({ room_id, participant_id, food_id, is_liked })` | L61-66 |
| **SELECT** | `participants` | `.from('participants').select('id').eq('room_id', ...)` | L103-106 |
| **SELECT** | `swipes` | `.from('swipes').select('food_id, is_liked').eq('room_id', ...).eq('is_liked', true)` | L112-116 |
| **UPDATE** | `rooms` | `.from('rooms').update({ status: 'done', matched_food_id }).eq('id', ...)` | L131-134 |
| **REALTIME** | `rooms` | `.channel().on('postgres_changes', { event: 'UPDATE', table: 'rooms' }, ...)` | L26-40 |

---

## 10. ❤️ [FavScreen.js](file:///d:/Code/what2eat/screens/FavScreen.js) — **สำคัญน้อย-ปานกลาง**

แสดงและลบรายการโปรด

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `favorites` | `.from('favorites').select('*').eq('user_id', ...).order('created_at', { ascending: false })` | L15-19 |
| **DELETE** | `favorites` | `.from('favorites').delete().eq('id', ...)` | L33 |

---

## 11. 🕒 [HistoryScreen.js](file:///d:/Code/what2eat/screens/HistoryScreen.js) — **สำคัญน้อย**

แสดงประวัติการสุ่ม (อ่านอย่างเดียว)

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `history` | `.from('history').select('*').eq('user_id', ...).order('created_at', { ascending: false })` | L15-19 |

---

## 12. 🔍 [SearchScreen.js](file:///d:/Code/what2eat/screens/SearchScreen.js) — **สำคัญน้อย**

ค้นหาเมนู (อ่านอย่างเดียว)

| Operation | Table | คำสั่ง | บรรทัด |
|-----------|-------|--------|--------|
| **SELECT** | `foods` | `.from('foods').select('*').ilike('name', '%...%')` | L24 |
| **SELECT** | `user_foods` | `.from('user_foods').select('*').eq('user_id', ...).ilike('name', '%...%')` | L26 |

---

## 📊 สรุปรวมทุก Table ที่ถูกใช้

| Table | SELECT | INSERT | UPDATE | DELETE | Realtime |
|-------|--------|--------|--------|--------|----------|
| `users` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `foods` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user_foods` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `favorites` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `history` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `rooms` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `participants` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `swipes` | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Storage: `avatars`** | getPublicUrl | upload | — | — | — |
| **Storage: `food-images`** | getPublicUrl | upload | — | — | — |

---

## ⚠️ สิ่งที่ควรระวัง

> [!WARNING]
> **ResultScreen.js** — ไม่ได้ query DB เลย! ใช้ `foodList` จาก local file `data/foods.js` แทน ทำให้ข้อมูลอาหารใน Party mode **ไม่ sync กับ DB**

> [!NOTE]
> **HistoryScreen** มีปุ่ม "ล้างประวัติ" แต่แค่ `setHistoryList([])` ล้างใน local state เท่านั้น **ไม่ได้ลบจาก DB จริง**

> [!CAUTION]
> **Supabase Anon Key** ถูก hardcode ใน `supabase.js` — ควรย้ายไปใช้ environment variable (`.env`) แทน

import { createContext, useContext, useState } from 'react';

// ─── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    // user object: { id, name_account, username, is_guest }
    // 📦 สร้าง State สำหรับเก็บและอัปเดตข้อมูลบนหน้าจอ
    const [user, setUser] = useState(null);

    const login = (userData) => {
        setUser({
            id: userData.id,
            name_account: userData.name_account,
            username: userData.username,
            is_guest: userData.is_guest ?? false,
        });
    };

    const logout = () => {
        setUser(null);
    };

    // Task 5: อัปเดตบางฟิลด์ของ user โดยไม่ต้อง login ใหม่ (เช่น name_account)
    const updateUser = (updates) => {
        setUser(prev => prev ? { ...prev, ...updates } : prev);
    };

    // 🎨 ==========================================

    // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)

    // 🎨 ==========================================

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

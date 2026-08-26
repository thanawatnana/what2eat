import React, { createContext, useState, useContext } from 'react';

// ─── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
    // user object: { id, name_account, username, is_guest }
    const [user, setUser] = useState(null);

    const login = (userData) => {
        // Store the fields the Profile feature will need: id, name_account, username
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

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
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

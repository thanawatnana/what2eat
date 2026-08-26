import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { COLORS } from './constants/theme';
import { AuthProvider } from './context/AuthContext';

// ── Auth Screens ──────────────────────────────────────────────────────────────
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';

// ── Main Screens ──────────────────────────────────────────────────────────────
import HomeScreen from './screens/HomeScreen';
import SoloScreen from './screens/SoloScreen';
import PartyScreen from './screens/PartyScreen';
import LobbyScreen from './screens/LobbyScreen';
import SwipeScreen from './screens/SwipeScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import FavScreen from './screens/FavScreen';
import AllFoodsScreen from './screens/AllFoodsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ── Drawer Navigator (ครอบทุกหน้าหลัก) ──────────────────────────────────────
function DrawerRoot() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0 },
        headerTintColor: COLORS.textDark,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontWeight: '800' },
        drawerActiveBackgroundColor: COLORS.primary,
        drawerActiveTintColor: COLORS.white,
        drawerStyle: { backgroundColor: '#FAFAFA', width: 260 },
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} options={{ title: '🏠 หน้าแรก', headerShown: false }} />
      <Drawer.Screen name="Solo" component={SoloScreen} options={{ title: '🎲 สุ่มกินคนเดียว' }} />
      <Drawer.Screen name="Party" component={PartyScreen} options={{ title: '🔥 ปาร์ตี้กับเพื่อน' }} />
      <Drawer.Screen name="Favorites" component={FavScreen} options={{ title: '❤️ เมนูโปรด' }} />
      <Drawer.Screen name="History" component={HistoryScreen} options={{ title: '🕒 ประวัติการสุ่ม' }} />
      <Drawer.Screen name="AllFoods" component={AllFoodsScreen} options={{ title: '🍽️ เมนูอาหารทั้งหมด' }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ ตั้งค่าบัญชี' }} />
    </Drawer.Navigator>
  );
}

// ── Root Stack ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          {/* Auth */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* Main App (Drawer) */}
          <Stack.Screen name="DrawerRoot" component={DrawerRoot} />

          {/* Party Flow (Stack เพื่อ back navigation ถูกต้อง) */}
          <Stack.Screen
            name="Lobby"
            component={LobbyScreen}
            options={{ headerShown: true, headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: COLORS.white, headerTitleAlign: 'center', title: '🏕️ ล็อบบี้', headerBackTitleVisible: false, headerBackVisible: false }}
          />
          <Stack.Screen
            name="Swipe"
            component={SwipeScreen}
            options={{ headerShown: true, headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: COLORS.white, headerTitleAlign: 'center', title: '🗳️ โหวตอาหาร!', headerBackVisible: false }}
          />
          <Stack.Screen
            name="Result"
            component={ResultScreen}
            options={{ headerShown: true, headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: COLORS.white, headerTitleAlign: 'center', title: '🎉 ผลลัพธ์', headerBackVisible: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
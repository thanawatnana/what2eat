/*
* ==========================================
* 📱 ไฟล์ App.js (หัวใจหลักของแอปพลิเคชัน)
* ==========================================
* [ไลบรารีที่ใช้]
* - @react-navigation/native : ไลบรารีหลักสำหรับจัดการระบบนำทาง (เปลี่ยนหน้าไปมา)
* - @react-navigation/bottom-tabs : ใช้สร้างแถบเมนูด้านล่าง (Home, Search, Solo, Fav, Account)
* - @react-navigation/native-stack : ใช้สร้างหน้าจอแบบซ้อนทับ (Stack) เพื่อให้กดปุ่ม Back ย้อนกลับได้
* 
* [หลักการทำงาน]
* 1. ตรวจสอบว่าผู้ใช้ล็อกอินหรือยัง (ผ่าน <AuthProvider>) 
* 2. รวมหน้าจอทั้งหมดมาผูกเข้าด้วยกัน (Router) 
* 3. กำหนดรูปแบบ Header ของแต่ละหน้า (เช่น ซ่อน Header บางหน้า หรือเพิ่มปุ่มย้อนกลับ)
*/

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-gesture-handler';
import { COLORS } from './constants/theme';
import { AuthProvider } from './context/AuthContext';

import AllFoodsScreen from './screens/AllFoodsScreen';
import FavScreen from './screens/FavScreen';
import HistoryScreen from './screens/HistoryScreen';
import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import LoginScreen from './screens/LoginScreen';
import PartyScreen from './screens/PartyScreen';
import RegisterScreen from './screens/RegisterScreen';
import ResultScreen from './screens/ResultScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import SoloScreen from './screens/SoloScreen';
import SwipeScreen from './screens/SwipeScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CenterTabButton({ children, onPress }) {
  // 🎨 ==========================================
  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
  // 🎨 ==========================================
  return (
    <TouchableOpacity style={styles.centerBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.centerBtnInner}>
        <Text style={{ fontSize: 26 }}>🎲</Text>
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  // 🎨 ==========================================
  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
  // 🎨 ==========================================
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#bbb',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
        // Bug 1 fix: prevent tab screens from being detached which causes freeze
        detachInactiveScreens: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'หน้าแรก',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '🏠' : '🏡'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={({ navigation }) => ({
          title: 'ค้นหา',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>{'< หน้าแรก'}</Text>
            </TouchableOpacity>
          ),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔍</Text>,
        })}
      />
      <Tab.Screen
        name="SoloTab"
        component={SoloScreen}
        options={({ navigation }) => ({
          title: 'สุ่มเมนู',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>{'< หน้าแรก'}</Text>
            </TouchableOpacity>
          ),
          tabBarButton: (props) => <CenterTabButton {...props} />,
        })}
      />
      <Tab.Screen
        name="FavTab"
        component={FavScreen}
        options={({ navigation }) => ({
          title: 'เมนูโปรด',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>{'< หน้าแรก'}</Text>
            </TouchableOpacity>
          ),
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '❤️' : '🤍'}</Text>
          ),
        })}
      />
      <Tab.Screen
        name="AccountTab"
        component={SettingsScreen}
        options={({ navigation }) => ({
          title: 'บัญชี',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.secondary }}>{'< หน้าแรก'}</Text>
            </TouchableOpacity>
          ),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        })}
      />
    </Tab.Navigator>
  );
}

// 🧩 ฟังก์ชันหลักของหน้าจอนี้ (Component)
export default function App() {
  // 🎨 ==========================================
  // 🎨 ส่วนแสดงผลหน้าตาแอป (UI / Frontend)
  // 🎨 ==========================================
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Party" component={PartyScreen} options={({ navigation }) => ({ headerShown: true, title: '🔥 ปาร์ตี้', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false, headerLeft: ({ tintColor }) => (<TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })} style={{ marginLeft: 8, marginRight: 16 }}><Text style={{ color: tintColor, fontSize: 16, fontWeight: 'bold' }}>{'< หน้าแรก'}</Text></TouchableOpacity>) })} />
          <Stack.Screen name="Lobby" component={LobbyScreen} options={{ headerShown: true, title: '🏕 ล็อบบี้', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="Swipe" component={SwipeScreen} options={{ headerShown: true, title: '🗳 โหวต', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="Result" component={ResultScreen} options={{ headerShown: true, title: '🎉 ผลลัพธ์', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="History" component={HistoryScreen} options={({ navigation }) => ({ headerShown: true, title: 'ประวัติการสุ่ม', headerTintColor: COLORS.secondary, headerBackVisible: false, headerLeft: ({ tintColor }) => (<TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })} style={{ marginLeft: 8, marginRight: 16 }}><Text style={{ color: tintColor, fontSize: 16, fontWeight: 'bold' }}>{'< หน้าแรก'}</Text></TouchableOpacity>) })} />
          <Stack.Screen name="AllFoods" component={AllFoodsScreen} options={({ navigation }) => ({ headerShown: true, title: 'เมนูอาหารทั้งหมด', headerTintColor: COLORS.secondary, headerBackVisible: false, headerLeft: ({ tintColor }) => (<TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })} style={{ marginLeft: 8, marginRight: 16 }}><Text style={{ color: tintColor, fontSize: 16, fontWeight: 'bold' }}>{'< หน้าแรก'}</Text></TouchableOpacity>) })} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  centerBtn: {
    top: -22,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  centerBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
});
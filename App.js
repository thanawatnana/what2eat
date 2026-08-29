import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS } from './constants/theme';
import { AuthProvider } from './context/AuthContext';

import LoginScreen    from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen     from './screens/HomeScreen';
import SearchScreen   from './screens/SearchScreen';
import SoloScreen     from './screens/SoloScreen';
import FavScreen      from './screens/FavScreen';
import SettingsScreen from './screens/SettingsScreen';
import PartyScreen    from './screens/PartyScreen';
import LobbyScreen    from './screens/LobbyScreen';
import SwipeScreen    from './screens/SwipeScreen';
import ResultScreen   from './screens/ResultScreen';
import HistoryScreen  from './screens/HistoryScreen';
import AllFoodsScreen from './screens/AllFoodsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function CenterTabButton({ children, onPress }) {
  return (
    <TouchableOpacity style={styles.centerBtn} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.centerBtnInner}>
        <Text style={{ fontSize: 26 }}>🎲</Text>
      </View>
    </TouchableOpacity>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#bbb',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
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
        options={{
          title: 'ค้นหา',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="SoloTab"
        component={SoloScreen}
        options={{
          title: '',
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="FavTab"
        component={FavScreen}
        options={{
          title: 'โปรด',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20 }}>{focused ? '❤️' : '🤍'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={SettingsScreen}
        options={{
          title: 'บัญชี',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login"     component={LoginScreen} />
          <Stack.Screen name="Register"  component={RegisterScreen} />
          <Stack.Screen name="MainTabs"  component={MainTabs} />
          <Stack.Screen name="Party"     component={PartyScreen}   options={{ headerShown: true, title: '🔥 ปาร์ตี้', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: true }} />
          <Stack.Screen name="Lobby"     component={LobbyScreen}   options={{ headerShown: true, title: '🏕 ล็อบบี้', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="Swipe"     component={SwipeScreen}   options={{ headerShown: true, title: '🗳 โหวต', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="Result"    component={ResultScreen}  options={{ headerShown: true, title: '🎉 ผลลัพธ์', headerStyle: { backgroundColor: COLORS.secondary }, headerTintColor: '#fff', headerBackVisible: false }} />
          <Stack.Screen name="History"   component={HistoryScreen} options={{ headerShown: true, title: 'ประวัติการสุ่ม', headerTintColor: COLORS.secondary }} />
          <Stack.Screen name="AllFoods"  component={AllFoodsScreen} options={{ headerShown: true, title: 'เมนูอาหารทั้งหมด', headerTintColor: COLORS.secondary }} />
          <Stack.Screen name="Search"    component={SearchScreen}  options={{ headerShown: false }} />
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
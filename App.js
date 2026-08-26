import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from './constants/theme';

// ── Import screens ──────────────────────────────────────────────
import HomeScreen from './screens/HomeScreen';
import SoloScreen from './screens/SoloScreen';
import PartyScreen from './screens/PartyScreen';
import LobbyScreen from './screens/LobbyScreen';
import SwipeScreen from './screens/SwipeScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import FavScreen from './screens/FavScreen';
import AllFoodsScreen from './screens/AllFoodsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.secondary },
          headerTintColor: COLORS.white,
          headerTitleAlign: 'center',
          headerBackTitleVisible: false,
        }}
      >
        {/* ── Main ── */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Solo" component={SoloScreen} options={{ title: 'Solo Random' }} />

        {/* ── Party Flow ── */}
        <Stack.Screen name="Party" component={PartyScreen} options={{ title: 'Group Party' }} />
        <Stack.Screen name="Lobby" component={LobbyScreen} options={{ title: 'Lobby', headerBackVisible: false }} />
        <Stack.Screen name="Swipe" component={SwipeScreen} options={{ title: 'Vote Your Food! 🗳️', headerBackVisible: false }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: '🎉 Result', headerBackVisible: false }} />

        {/* ── Other ── */}
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="Favorites" component={FavScreen} options={{ title: 'My Favorites' }} />
        <Stack.Screen name="AllFoods" component={AllFoodsScreen} options={{ title: 'All Menus' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS } from './constants/theme';

// Import หน้าจอทั้งหมด (ต้องมีไฟล์เหล่านี้อยู่ในโฟลเดอร์ screens นะครับ)
import HomeScreen from './screens/HomeScreen';
import SoloScreen from './screens/SoloScreen';
import PartyScreen from './screens/PartyScreen';
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
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Solo" component={SoloScreen} options={{ title: 'Solo Random' }} />
        <Stack.Screen name="Party" component={PartyScreen} options={{ title: 'Group Party' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
        <Stack.Screen name="Favorites" component={FavScreen} options={{ title: 'My Favorites' }} />
        <Stack.Screen name="AllFoods" component={AllFoodsScreen} options={{ title: 'All Menus' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
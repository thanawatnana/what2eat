import { createDrawerNavigator } from '@react-navigation/drawer';
import { NavigationContainer } from '@react-navigation/native';
import { COLORS } from './constants/theme';

// Import หน้าทั้งหมด
import AllFoodsScreen from './screens/AllFoodsScreen';
import FavScreen from './screens/FavScreen';
import HistoryScreen from './screens/HistoryScreen';
import HomeScreen from './screens/HomeScreen';
import PartyScreen from './screens/PartyScreen';
import SettingsScreen from './screens/SettingsScreen';
import SoloScreen from './screens/SoloScreen';

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <NavigationContainer>
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
        <Drawer.Screen name="AllFoods" component={AllFoodsScreen} options={{ title: '✍️ เพิ่มเมนูอาหาร' }} />
        <Drawer.Screen name="Settings" component={SettingsScreen} options={{ title: '⚙️ ตั้งค่าบัญชี' }} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
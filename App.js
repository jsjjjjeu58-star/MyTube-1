import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { ThemeProvider } from './ThemeContext';
import { LanguageProvider } from './LanguageContext';

// Screens
import HomeScreen from './Screens/HomeScreen';
import ChannelScreen from './Screens/ChannelScreen';
import PlayerScreen from './Screens/PlayerScreen';
import PlaylistPage from './Screens/PlaylistPage';
import ShortsScreen from './Screens/ShortsScreen';
import SubscriptionsScreen from './Screens/SubscriptionsScreen';
import livescreen from './Screens/livescreen'; 
import downloadscreen from './Screens/downloadscreen';

// Settings
import SettingsScreen from './Settings/SettingsScreen';
import HistoryPage from './Settings/HistoryPage';
import GlobalDownloadManager from './Settings/GlobalDownloadManager';
import SearchSetting from './Settings/searchsetting';
import GlobalPlayer from './Settings/GlobalPlayer'; 

const Stack = createStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              cardStyle: { backgroundColor: '#000000' }
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Channel" component={ChannelScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Player" component={PlayerScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Playlist" component={PlaylistPage} options={{ headerShown: false }} />
            <Stack.Screen name="Shorts" component={ShortsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="History" component={HistoryPage} options={{ headerShown: false }} />
            <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="searchsettings" component={SearchSetting} options={{ headerShown: false }} />
            <Stack.Screen name="Downloads" component={downloadscreen} options={{ headerShown: false }} />
            <Stack.Screen name="Live" component={livescreen} options={{ headerShown: false }} />
          </Stack.Navigator>

          <GlobalPlayer />
          <GlobalDownloadManager />

        </NavigationContainer>
      </LanguageProvider>
    </ThemeProvider>
  );
}
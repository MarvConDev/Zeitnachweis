import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/ThemeContext';
import { DebugMenuScreen } from './src/screens/DebugMenuScreen';
import { EntryFormScreen } from './src/screens/EntryFormScreen';
import { FixedWorkTimesScreen } from './src/screens/FixedWorkTimesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MinimumHoursScreen } from './src/screens/MinimumHoursScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { RecentObjectsScreen } from './src/screens/RecentObjectsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SplashScreen } from './src/screens/SplashScreen';
import { TimesheetScreen } from './src/screens/TimesheetScreen';
import { loadProfile } from './src/storage';
import type { RootStackParamList } from './src/types';

void ExpoSplashScreen.preventAutoHideAsync().catch(() => undefined);

const SPLASH_MS = 1500;
const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { colors, darkMode, ready: themeReady } = useTheme();
  const [ready, setReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();

    void (async () => {
      try {
        const profile = await loadProfile();
        setHasProfile(Boolean(profile));
      } finally {
        // Native Splash ausblenden, damit das volle React-Logo sichtbar wird
        // (Android 12+ schneidet das native Splash-Bild sonst ab).
        await ExpoSplashScreen.hideAsync().catch(() => undefined);
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, SPLASH_MS - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));
        setReady(true);
        setShowSplash(false);
      }
    })();
  }, []);

  if (showSplash || !ready || !themeReady) {
    if (showSplash) {
      return (
        <>
          <StatusBar style="light" />
          <SplashScreen />
        </>
      );
    }
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const navTheme = {
    ...(darkMode ? DarkTheme : DefaultTheme),
    colors: {
      ...(darkMode ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.bg,
      card: colors.header,
      text: '#FFFFFF',
      border: colors.line,
      notification: colors.accent,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={hasProfile ? 'Home' : 'Onboarding'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Einstellungen' }}
        />
        <Stack.Screen
          name="FixedWorkTimes"
          component={FixedWorkTimesScreen}
          options={{ title: 'Feste Arbeitszeiten' }}
        />
        <Stack.Screen
          name="RecentObjects"
          component={RecentObjectsScreen}
          options={{ title: 'Objekt-Vorschläge' }}
        />
        <Stack.Screen
          name="MinimumHours"
          component={MinimumHoursScreen}
          options={{ title: 'Mindeststunden' }}
        />
        <Stack.Screen
          name="DebugMenu"
          component={DebugMenuScreen}
          options={{ title: 'Debug' }}
        />
        <Stack.Screen
          name="Timesheet"
          component={TimesheetScreen}
          options={{ title: 'Zeitnachweis' }}
        />
        <Stack.Screen
          name="EntryForm"
          component={EntryFormScreen}
          options={{ title: 'Eintrag', presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

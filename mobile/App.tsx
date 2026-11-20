import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { RootStackParamList } from './src/navigation';
import { LoginScreen } from './src/screens/LoginScreen';
import { RouteScreen } from './src/screens/RouteScreen';
import { StopScreen } from './src/screens/StopScreen';
import { StoreProvider, useStore } from './src/store';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { ready, session } = useStore();

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Route" component={RouteScreen} options={{ title: "Today's route" }} />
        <Stack.Screen name="Stop" component={StopScreen} options={{ title: 'Stop', headerBackTitle: 'Route' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
        <StatusBar style="dark" />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});

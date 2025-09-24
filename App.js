import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { View, Image, StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import OpenScreen from "./app/openscreen";
import LoginScreen from "./app/loginscreen";
import OnboardingScreen from "./app/ajoutdonn";
import HomeScreen from "./app/homescreen";
import CreerMatch from "./app/creematch";
import ProfileScreen from "./app/profilescreen";
import MatchDetailScreen from "./app/matchdetailscreen";

const Stack = createStackNavigator();

const tokenCache = {
  async getToken(key) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key, value) {
    return SecureStore.setItemAsync(key, value);
  },
};

function RootNavigator() {
  const { isLoaded, sessionId } = useAuth();
  const { user } = useUser();
  const [initialRoute, setInitialRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const api_key = process.env.EXPO_PUBLIC_API_BASE_URL;

  useEffect(() => {
  const checkOnboarding = async () => {
    if (!isLoaded) return;

    try {
      if (sessionId && user?.primaryEmailAddress?.emailAddress) {
        const email = user.primaryEmailAddress.emailAddress;
        const res = await fetch(
          `${api_key}/api/checkonboarding?email=${encodeURIComponent(email)}`
        );
        const data = await res.json();
        console.log(data)

        const hasOnboarded =
          data?.hasonboarded === true ||
          data?.hasonboarded === "true" ||
          data?.hasonboarded === "TRUE";

        setInitialRoute(hasOnboarded ? "Home" : "Verification");
      } else {
        // No session, go to Open screen
        setInitialRoute("Open");
      }
    } catch (err) {
      console.error("Onboarding check error:", err);
      setInitialRoute("Verification"); // fallback
    } finally {
      setLoading(false); // ✅ always stop loading
    }
  };

  checkOnboarding();
}, [isLoaded, sessionId, user?.primaryEmailAddress?.emailAddress]);

  // Loading splash screen
  if (!isLoaded || loading) {
    return (
      <LinearGradient
        colors={["#4B0082", "#5E2A84"]}
        style={styles.splashContainer}
      >
        <Image
          source={require("./assets/logoa.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </LinearGradient>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen name="Open" component={OpenScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="Verification"
        component={OnboardingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="CreerMatch" component={CreerMatch} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  return (
    <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <NavigationContainer>
          <View style={styles.safeArea}>
            <StatusBar style={Platform.OS === "android" ? "light" : "auto"} />
            <RootNavigator />
          </View>
        </NavigationContainer>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Platform.OS === "ios" ? "#5E2A84" : "white", // ✅ iOS purple, Android white
  },
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 250,
    height: 250,
  },
});

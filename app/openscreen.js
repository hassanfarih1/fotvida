import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";

export default function OpenScreen() {
  const navigation = useNavigation();

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Run animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ImageBackground
      source={require("../assets/pitch.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <LinearGradient
        colors={["rgba(141, 45, 226, 0.25)", "rgba(74,0,224,0.5)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overlay}
      >
        {/* Animated Title */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <Text style={styles.title}>
            Jouez au football{"\n"}Partout, à tout moment
          </Text>
        </Animated.View>

        {/* Animated Bottom Section */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.bottomSection}>
            <Image
              source={require("../assets/logoa.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.buttonText} numberOfLines={1}>
                Commencer
              </Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              En vous inscrivant, vous acceptez les{"\n"}
              <Text style={styles.link}>Conditions d’utilisation</Text> et la{" "}
              <Text style={styles.link}>Politique de confidentialité</Text>.
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 38,
    fontWeight: "bold",
    color: "white",
    textAlign: "left",
    marginLeft: 20,
    lineHeight: 46,
    marginTop: 40,
  },
  bottomSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 25,
  },
  button: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 60, // ✅ enough horizontal padding for text
    borderRadius: 12,
    marginBottom: 25,
    minWidth: 240, // ✅ ensures width is enough for Android
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: "#6A0DAD",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  disclaimer: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});

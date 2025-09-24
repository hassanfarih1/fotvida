// app/profilescreen.js
import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [bottomTab, setBottomTab] = useState("profile");
  const [image, setImage] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const api_key = process.env.EXPO_PUBLIC_API_BASE_URL;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false, gestureEnabled: false });
  }, [navigation]);

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!email) return;
      setFetching(true);
      try {
        const res = await fetch(`${api_key}/api/getprofile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const data = json.data;
          setFirstName(data.first_name || "");
          setLastName(data.last_name || "");
          setPhone(data.phone || "");
          if (data.birth_date) {
            const d = new Date(data.birth_date);
            const jj = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            setBirthDate(`${jj}/${mm}/${yyyy}`);
          }
          setGender(
            data.gender === "male"
              ? "Homme"
              : data.gender === "female"
              ? "Femme"
              : data.gender || ""
          );
          if (data.pictures) setImage(data.pictures);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
      setFetching(false);
    };
    fetchProfile();
  }, [email]);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission requise",
        "L'accès à la galerie est nécessaire!"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleBirthDateChange = (text) => {
    text = text.replace(/[^0-9]/g, "");
    if (text.length > 8) text = text.slice(0, 8);
    if (text.length > 2 && text.length <= 4)
      text = text.slice(0, 2) + "/" + text.slice(2);
    else if (text.length > 4)
      text =
        text.slice(0, 2) +
        "/" +
        text.slice(2, 4) +
        "/" +
        text.slice(4);
    const parts = text.split("/");
    if (parts[0] && parseInt(parts[0]) > 31) parts[0] = "31";
    if (parts[1] && parseInt(parts[1]) > 12) parts[1] = "12";
    setBirthDate(parts.join("/"));
  };

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(cleaned);
  };

  const saveChanges = async () => {
    if (!email || loading) return;
    setLoading(true);
    try {
      const formData = new FormData();

      formData.append("email", email);
      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("phone", phone);
      formData.append("birthDate", birthDate);
      formData.append("gender", gender);

      if (image && image.startsWith("file://")) {
        const fileName = image.split("/").pop();
        formData.append("picture", {
          uri: image,
          type: "image/jpeg",
          name: fileName,
        });
      }

      const res = await fetch(`${api_key}/api/saveprofile`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const json = await res.json();

      if (json.success) {
        Alert.alert("Profil", "Modifications enregistrées!");
        if (json.data && json.data.pictures) {
          setImage(json.data.pictures);
        }
      } else {
        Alert.alert("Erreur", json.error || "Impossible de sauvegarder");
      }
    } catch (err) {
      console.error("Save profile error:", err);
      Alert.alert("Erreur", err.message || "Impossible de sauvegarder");
    }
    setLoading(false);
  };

  const renderSkeleton = () => (
    <View style={{ marginTop: 20 }}>
      <View
        style={{
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: "#6e3aa4",
          alignSelf: "center",
        }}
      />
      <View
        style={{
          width: 200,
          height: 20,
          backgroundColor: "#6e3aa4",
          alignSelf: "center",
          marginTop: 10,
          borderRadius: 5,
        }}
      />
      <View style={{ marginTop: 20 }}>
        {[...Array(4)].map((_, i) => (
          <View
            key={i}
            style={{
              height: 50,
              backgroundColor: "#6e3aa4",
              borderRadius: 12,
              marginBottom: 15,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View
          style={{
            flex: 1,
            height: 50,
            backgroundColor: "#6e3aa4",
            borderRadius: 12,
            marginHorizontal: 5,
          }}
        />
        <View
          style={{
            flex: 1,
            height: 50,
            backgroundColor: "#6e3aa4",
            borderRadius: 12,
            marginHorizontal: 5,
          }}
        />
      </View>
      <View
        style={{
          height: 50,
          backgroundColor: "#6e3aa4",
          borderRadius: 12,
          marginTop: 20,
        }}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#4B0082" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        <Text style={styles.title}>Profile</Text>

        {fetching ? (
          renderSkeleton()
        ) : (
          <>
            <View style={styles.profilePicWrapper}>
              <Image
                source={
                  image
                    ? { uri: image }
                    : require("../assets/dummy.png")
                }
                style={styles.profilePic}
              />
              <Text style={styles.emailText}>{email || ""}</Text>
              <TouchableOpacity style={styles.editButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={20} color="#4B0082" />
                <Text style={styles.editText}>Modifier</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputsWrapper}>
              <Text style={styles.inputTitle}>Prénom</Text>
              <TextInput
                placeholder="Prénom"
                placeholderTextColor="#bbb"
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                keyboardAppearance="dark"
              />

              <Text style={styles.inputTitle}>Nom</Text>
              <TextInput
                placeholder="Nom"
                placeholderTextColor="#bbb"
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                keyboardAppearance="dark"
              />

              <Text style={styles.inputTitle}>Téléphone</Text>
              <TextInput
                placeholder="Téléphone"
                placeholderTextColor="#bbb"
                style={styles.input}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardAppearance="dark"
              />

              <Text style={styles.inputTitle}>Date de naissance (JJ/MM/AAAA)</Text>
              <TextInput
                placeholder="JJ/MM/AAAA"
                placeholderTextColor="#bbb"
                style={styles.input}
                value={birthDate}
                onChangeText={handleBirthDateChange}
                keyboardType="numeric"
                keyboardAppearance="dark"
              />

              <Text style={styles.inputTitle}>Genre</Text>
              <View style={styles.genderWrapper}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === "Homme" && styles.genderSelected,
                  ]}
                  onPress={() => setGender("Homme")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === "Homme" && styles.genderTextSelected,
                    ]}
                  >
                    Homme
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    gender === "Femme" && styles.genderSelected,
                  ]}
                  onPress={() => setGender("Femme")}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === "Femme" && styles.genderTextSelected,
                    ]}
                  >
                    Femme
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && { opacity: 0.6 }]}
                onPress={saveChanges}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#4B0082" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Enregistrer les modifications
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* ✅ Safe area only for bottom */}
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: Platform.OS === "ios" ? "#5E2A84" : "white" },
        ]}
        edges={["bottom"]}
      >
        <StatusBar
          style={Platform.OS === "android" ? "light" : "auto"}
        />

        <View style={styles.bottomNavWrapper}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                setBottomTab("matches");
                navigation.navigate("Home");
              }}
            >
              <Ionicons
                name="football-outline"
                size={24}
                color={bottomTab === "matches" ? "#FFD700" : "white"}
              />
              <Text
                style={{
                  color: bottomTab === "matches" ? "#FFD700" : "white",
                  fontSize: 10,
                  marginTop: 1,
                }}
              >
                Matches
              </Text>
            </TouchableOpacity>

          

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => {
                setBottomTab("profile");
                navigation.navigate("Profile");
              }}
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={bottomTab === "profile" ? "#FFD700" : "white"}
              />
              <Text
                style={{
                  color: bottomTab === "profile" ? "#FFD700" : "white",
                  fontSize: 10,
                  marginTop: 1,
                }}
              >
                Profil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4B0082", padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  profilePicWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  profilePic: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  emailText: {
    color: "white",
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
  },
  editButton: {
    flexDirection: "row",
    marginTop: 10,
    backgroundColor: "#FFD700",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  editText: {
    color: "#4B0082",
    fontWeight: "bold",
    marginLeft: 6,
  },
  inputsWrapper: {
    marginTop: 10,
  },
  inputTitle: {
    color: "white",
    marginBottom: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#5E2A84",
    color: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 15,
    marginTop: 6,
  },
  genderWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    marginTop: 15,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#5E2A84",
    alignItems: "center",
    marginHorizontal: 5,
  },
  genderSelected: {
    backgroundColor: "#FFD700",
  },
  genderText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  genderTextSelected: {
    color: "#4B0082",
  },
  saveButton: {
    backgroundColor: "#FFD700",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  saveButtonText: {
    color: "#4B0082",
    fontSize: 16,
    fontWeight: "bold",
  },
  safeArea: {
    flexShrink: 0,
  },
  bottomNavWrapper: {
    alignItems: "center",
  },
  bottomNav: {
    height: 40,
    backgroundColor: "#5E2A84",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  navButton: { flex: 1, justifyContent: "center", alignItems: "center",marginTop:15 },
  navSeparator: { width: 1, height: "60%", backgroundColor: "#bbb" },
});

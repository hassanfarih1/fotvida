import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useUser } from "@clerk/clerk-expo";
import LottieView from "lottie-react-native";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const lottieRef = useRef(null);

  // Disable Android hardware back button
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  const nextStep = () => { if (step < 3) setStep(step + 1); };
  const prevStep = () => { if (step > 1) setStep(step - 1); };
  const progress = step / 3;

  const formatDate = (text) => {
    const digits = text.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length <= 8) return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
    return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4, 8);
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!email) { Alert.alert("Erreur", "Impossible de récupérer l'email utilisateur !"); return; }
    if (!firstName || !lastName || !phone || !birthDate || !gender) {
      Alert.alert("Erreur", "Tous les champs doivent être remplis !"); return;
    }
    if (phone.length !== 10) { Alert.alert("Erreur", "Le numéro de téléphone doit contenir 10 chiffres."); return; }
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(birthDate)) { Alert.alert("Erreur", "La date de naissance doit être au format JJ/MM/AAAA."); return; }
    const [day, month, year] = birthDate.split("/").map(Number);
    if (day < 1 || day > 31 || month < 1 || month > 12 || year > 2023) {
      Alert.alert("Erreur", "Une date de naissance est invalide."); return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://theao.vercel.app/api/saveprofile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, phone, birthDate, gender }),
      });
      const data = await response.json().catch(() => { throw new Error("Réponse serveur invalide"); });
      if (data.success) {
        setShowCongrats(true);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          navigation.replace("Home");
        }, 2000);
      } else {
        Alert.alert("Erreur", "Une erreur est survenue, essaye plus tard");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Une erreur est survenue, essaye plus tard");
    } finally { setLoading(false); }
  };

  if (showCongrats) {
    return (
      <LinearGradient colors={["#4B0082", "#2E004F"]} style={styles.container}>
        <Animated.View style={[styles.animationContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LottieView
            ref={lottieRef}
            source={require("../assets/congra.json")}
            loop={false}
            style={{ width: width * 0.9, height: width * 0.9 }}
            onLayout={() => lottieRef.current?.play(0, 60)}
          />
          <Text style={styles.congratsText}>Bienvenue avec nous! 🎉</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#4B0082", "#2E004F"]} style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressTopRow}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Text style={styles.backButtonText}>{"<"}</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.stepText}>Étape {step} / 3</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { flex: progress }]} />
          <View style={{ flex: 1 - progress }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Image source={require("../assets/logoa.png")} style={styles.logo} resizeMode="contain" />

        {step === 1 && (
          <>
            <Text style={styles.text}>Ajoutons ton nom pour que tes coéquipiers sachent qui rejoint !</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="#D1B3E0"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom"
              placeholderTextColor="#D1B3E0"
              value={lastName}
              onChangeText={setLastName}
            />
            <TouchableOpacity
              style={[styles.button, !(firstName && lastName) && styles.buttonDisabled]}
              onPress={nextStep}
              disabled={!(firstName && lastName)}
            >
              <Text style={styles.buttonText}>Suivant</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.text}>Quel est ton numéro de téléphone ? On ne partagera rien !</Text>
            <View style={{ height: height * 0.02 }} />
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇲🇦 +212</Text></View>
              <TextInput
                style={styles.phoneInput}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#D1B3E0"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={{ height: height * 0.02 }} />
            <TouchableOpacity
              style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
              onPress={nextStep}
              disabled={phone.length !== 10}
            >
              <Text style={styles.buttonText}>Suivant</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.text}>Pour finir, quel est ton âge et ton genre ? 🤩</Text>
            <View style={{ height: height * 0.02 }} />
            <TextInput
              style={styles.input}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor="#D1B3E0"
              value={birthDate}
              keyboardType="numeric"
              onChangeText={(text) => setBirthDate(formatDate(text))}
              maxLength={10}
            />
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderBox, gender === "male" && styles.genderSelected]}
                onPress={() => setGender("male")}
              >
                <Text style={[styles.genderText, gender === "male" && { color: "#6A0DAD" }]}>Homme</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderBox, gender === "female" && styles.genderSelected]}
                onPress={() => setGender("female")}
              >
                <Text style={[styles.genderText, gender === "female" && { color: "#6A0DAD" }]}>Femme</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.button, (loading || !(birthDate.length === 10 && gender)) && styles.buttonDisabled]}
              disabled={loading || !(birthDate.length === 10 && gender)}
              onPress={handleSubmit}
            >
              {loading ? <ActivityIndicator size="small" color="#6A0DAD" /> : <Text style={styles.buttonText}>Jouer !</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: height * 0.04,
    paddingHorizontal: 10,
    marginTop: height * 0.08,
  },
  progressTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 10, width: "100%" },
  backButton: { position: "absolute", left: 19 },
  backButtonText: { color: "white", fontSize: 32, fontWeight: "bold" },
  stepText: { color: "white", fontSize: 18, fontWeight: "700" },
  progressBar: { flexDirection: "row", height: 6, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 3, width: "90%" },
  progressFill: { backgroundColor: "white", borderRadius: 3 },
  content: { alignItems: "center", paddingHorizontal: 20, paddingBottom: height * 0.05 },
  logo: { width: width * 0.3, height: width * 0.3, marginBottom: 20 },
  text: { color: "white", fontSize: 18, textAlign: "center", marginBottom: 15, fontWeight: "600" },
  input: { width: "90%", borderWidth: 2, borderColor: "#A678E6", borderRadius: 10, padding: 14, marginBottom: 15, fontSize: 16, color: "white", backgroundColor: "rgba(255,255,255,0.1)" },
  button: { backgroundColor: "white", paddingVertical: 15, borderRadius: 12, alignItems: "center", marginTop: 15, width: "90%" },
  buttonDisabled: { opacity: 0.5, backgroundColor: "#999" },
  buttonText: { color: "#6A0DAD", fontSize: 18, fontWeight: "bold" },
  phoneContainer: { flexDirection: "row", width: "90%" },
  countryCode: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 15, justifyContent: "center", borderRadius: 10, marginRight: 10 },
  countryCodeText: { color: "white", fontSize: 16 },
  phoneInput: { flex: 1, borderWidth: 2, borderColor: "#A678E6", borderRadius: 10, padding: 14, color: "white", backgroundColor: "rgba(255,255,255,0.1)", fontSize: 16 },
  genderContainer: { flexDirection: "row", justifyContent: "space-between", width: "90%", marginBottom: 20 },
  genderBox: { flex: 1, borderWidth: 2, borderColor: "#A678E6", borderRadius: 10, padding: 15, alignItems: "center", marginHorizontal: 5 },
  genderSelected: { backgroundColor: "white" },
  genderText: { fontSize: 16, color: "#6A0DAD", fontWeight: "600" },
  animationContainer: { flex: 1, justifyContent: "flex-start", alignItems: "center", marginTop: height * 0.15 },
  congratsText: { fontSize: 30, fontWeight: "bold", color: "white", marginTop: 5, textAlign: "center" },
});

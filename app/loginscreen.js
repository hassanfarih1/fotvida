import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSignUp, useSignIn, useAuth } from "@clerk/clerk-expo";

const { width, height } = Dimensions.get("window");

// helpers for scaling
const wp = (percent) => (width * percent) / 100;
const hp = (percent) => (height * percent) / 100;

export default function SignUpScreen({ navigation }) {
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { sessionId } = useAuth();

  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isSignUpFlow, setIsSignUpFlow] = useState(true);
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(120);
  const [loading, setLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const emailInputRef = useRef(null);
  const inputs = useRef([]);

  const dismissKeyboard = () => Keyboard.dismiss();

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  useEffect(() => {
    let timer;
    if (verifying && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [verifying, resendTimer]);

  const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

const handleEmailSubmit = async () => {
  dismissKeyboard();
  if (!signUpLoaded || !signInLoaded) return;

  setLoading(true);

  try {
    // Attempt sign-in first
    await signIn.create({ identifier: email });
    await signIn.prepareFirstFactor({ strategy: "email_code" });
    setIsSignUpFlow(false);
    setVerifying(true);
    setResendTimer(120);
  } catch (signInErr) {
    // If sign-in failed because user does not exist, create account
    if (
      signInErr.errors?.[0]?.code === "not_found" || 
      signInErr.message?.includes("Couldn't find your account")
    ) {
      try {
        await signUp.create({ emailAddress: email });
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setIsSignUpFlow(true);
        setVerifying(true);
        setResendTimer(120);
      } catch (signUpErr) {
        console.error("Sign up error:", signUpErr);
        Alert.alert("Erreur", "Impossible de créer le compte.");
      }
    } else {
      // Other sign-in errors
      console.error("Sign in error:", signInErr);
      Alert.alert("Erreur", "Impossible de se connecter.");
    }
  } finally {
    setLoading(false);
  }
};




  const handleChange = (text, index) => {
    if (/^\d$/.test(text)) {
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);
      if (index < code.length - 1) inputs.current[index + 1]?.focus();
      else dismissKeyboard();
    }
  };

  const handleKeyPress = ({ nativeEvent: { key } }, index) => {
    if (key === "Backspace") {
      const newCode = [...code];
      newCode[index] = "";
      setCode(newCode);
      if (index > 0) inputs.current[index - 1]?.focus();
    }
  };

  useEffect(() => {
    if (verifying) {
      setTimeout(() => {
        inputs.current[0]?.focus();
      }, 100);
    }
  }, [verifying]);

  const verifyOtp = async () => {
  dismissKeyboard();
  const otp = code.join("");
  if (otp.length !== code.length) {
    Alert.alert("Erreur", `Veuillez entrer les ${code.length} chiffres`);
    return;
  }
  setVerifyingOtp(true);

  try {
    let sessionIdFromAttempt;

    if (isSignUpFlow) {
      const signupAttempt = await signUp.attemptEmailAddressVerification({ code: otp });
      if (signupAttempt.status === "complete") {
        sessionIdFromAttempt = signupAttempt.createdSessionId;
      } else {
        Alert.alert("Erreur", "Vérification incomplète.");
        return;
      }
    } else {
      const signinAttempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: otp });
      if (signinAttempt.status === "complete") {
        sessionIdFromAttempt = signinAttempt.createdSessionId;
      } else {
        Alert.alert("Erreur", "Vérification incomplète.");
        return;
      }
    }

    // Activate session
    await setActive({ session: sessionIdFromAttempt });

    // Fetch user email after session is active
    const userResponse = await fetch(
      `https://theao.vercel.app/api/checkonboarding?email=${encodeURIComponent(email)}`
    );
    const data = await userResponse.json();

    const hasOnboarded =
      data?.hasonboarded === true ||
      data?.hasonboarded === "true" ||
      data?.hasonboarded === "TRUE";

    // Navigate depending on onboarding
    navigation.replace(hasOnboarded ? "Home" : "Verification");
  } catch (err) {
    console.error("OTP verification error:", err);
    Alert.alert("Erreur", "Code invalide.");
  } finally {
    setVerifyingOtp(false);
  }
};


  const resendCode = async () => {
    if (resendTimer > 0) return;
    try {
      if (!signUpLoaded || !signInLoaded) return;
      if (isSignUpFlow) {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      } else {
        await signIn.prepareFirstFactor({ strategy: "email_code" });
      }
      setResendTimer(120);
      Alert.alert("Code renvoyé", `Un nouveau code a été envoyé à ${email}`);
    } catch (err) {
      console.error("Resend code error:", err);
      Alert.alert("Erreur", "Impossible de renvoyer le code.");
    }
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <LinearGradient colors={["#4B0082", "#2E004F"]} style={styles.container}>
        <Image source={require("../assets/logoa.png")} style={styles.logo} resizeMode="contain" />

        {!verifying && <Text style={styles.intro}>Pour nous rejoindre, connectez-vous avec votre email</Text>}

        {!verifying ? (
          <>
            <TextInput
              ref={emailInputRef}
              style={styles.input}
              placeholder="Votre email"
              placeholderTextColor="#D1B3E0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.button, !isValidEmail(email) && styles.buttonDisabled]}
              onPress={handleEmailSubmit}
              disabled={!isValidEmail(email) || loading}
            >
              {loading ? <ActivityIndicator size="small" color="#6A0DAD" /> : <Text style={styles.buttonText}>Envoyer</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Entrez le code envoyé à l’email {email}</Text>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputs.current[index] = ref)}
                  style={[styles.codeInput, digit !== "" && styles.codeInputFilled]}
                  keyboardType="numeric"
                  maxLength={1}
                  value={digit}
                  onChangeText={(text) => handleChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  caretHidden={true}
                />
              ))}
            </View>

            <TouchableOpacity disabled={resendTimer > 0} onPress={resendCode}>
              <Text style={[styles.resendText, resendTimer > 0 && { opacity: 0.5 }]}>
                {resendTimer > 0
                  ? `Vous pouvez renvoyer le code dans ${resendTimer}s`
                  : "Vous n'avez pas reçu le code ? Cliquez pour le renvoyer"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={verifyOtp} disabled={verifyingOtp}>
              {verifyingOtp ? <ActivityIndicator size="small" color="#6A0DAD" /> : <Text style={styles.buttonText}>Vérifier</Text>}
            </TouchableOpacity>
          </>
        )}
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start", padding: wp(5) },
  logo: { width: wp(28), height: wp(28), marginTop: hp(10), marginBottom: hp(3) },

  intro: { color: "white", fontSize: wp(5.5), fontWeight: "500", textAlign: "center", marginBottom: hp(2) },
  title: { color: "white", fontSize: wp(4), fontWeight: "600", textAlign: "center", marginBottom: hp(3) },

  input: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#A678E6",
    borderRadius: 10,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3),
    marginBottom: hp(2),
    fontSize: wp(3.5),
    color: "white",
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  button: {
    backgroundColor: "white",
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(18),
    borderRadius: 12,
    alignItems: "center",
    marginTop: hp(2),
    minWidth: wp(45),
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#6A0DAD", fontSize: wp(3.5), fontWeight: "600" },

  codeContainer: { flexDirection: "row", justifyContent: "center", columnGap: wp(3), marginBottom: hp(2) },
  codeInput: {
    width: wp(11),
    height: wp(11),
    borderWidth: 2,
    borderColor: "#A678E6",
    borderRadius: 8,
    textAlign: "center",
    fontSize: wp(3),
    color: "white",
  },
  codeInputFilled: { borderColor: "white" },

  resendText: { color: "white", textAlign: "center", marginBottom: hp(2.5), textDecorationLine: "underline", fontSize: wp(3) },
});

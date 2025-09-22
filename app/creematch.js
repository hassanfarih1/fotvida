import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useUser } from "@clerk/clerk-expo";

export default function CreerMatch({ navigation }) {
  const { user } = useUser(); 
  const userEmail = user?.primaryEmailAddress?.emailAddress || null;

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [communicationLink, setCommunicationLink] = useState("");
  const [localisation, setLocalisation] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [places, setPlaces] = useState(null); 
  const [prix, setPrix] = useState("");
  const [date, setDate] = useState("");
  const [heureDebut, setHeureDebut] = useState("");
  const [heureFin, setHeureFin] = useState("");
  const [loading, setLoading] = useState(false); 
  const [userLocation, setUserLocation] = useState(null);

  // Request location permission and get user location
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Erreur", "Permission d'accès à la localisation refusée.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // set initial marker at user location
      if (!locationCoords) {
        setLocationCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open map modal
  const openMap = async () => {
    await getUserLocation();
    setShowMap(true);
  };

  const handleDateChange = (text) => {
    let cleaned = text.replace(/\D/g, "");
    if (cleaned.length > 2 && cleaned.length <= 4) {
      cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    } else if (cleaned.length > 4) {
      cleaned =
        cleaned.slice(0, 2) +
        "/" +
        cleaned.slice(2, 4) +
        "/" +
        cleaned.slice(4, 8);
    }
    setDate(cleaned);
  };

  const handleTimeChange = (text, setter) => {
    let cleaned = text.replace(/\D/g, "");
    if (cleaned.length > 2) {
      cleaned = cleaned.slice(0, 2) + ":" + cleaned.slice(2, 4);
    }
    setter(cleaned);
  };

  const fetchAddressFromCoords = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();
      return data.display_name || `Lat: ${latitude}, Lon: ${longitude}`;
    } catch (error) {
      console.log("Fetch error:", error);
      return `Lat: ${latitude}, Lon: ${longitude}`;
    }
  };

  const validateAndSubmit = async () => {
    if (!userEmail) {
      Alert.alert("Erreur", "Vous devez être connecté pour créer un match.");
      return;
    }

    if (
      !nom ||
      !description ||
      !communicationLink ||
      !localisation ||
      !places ||
      !prix ||
      !date ||
      !heureDebut ||
      !heureFin
    ) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const [dayStr, monthStr, yearStr] = date.split("/");
    const day = parseInt(dayStr);
    const month = parseInt(monthStr);
    const year = parseInt(yearStr);

    if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12) {
      Alert.alert("Erreur", "Date invalide.");
      return;
    }

    const [hhDebutStr, mmDebutStr] = heureDebut.split(":");
    const [hhFinStr, mmFinStr] = heureFin.split(":");
    const hhDebut = parseInt(hhDebutStr);
    const mmDebut = parseInt(mmDebutStr);
    const hhFin = parseInt(hhFinStr);
    const mmFin = parseInt(mmFinStr);

    if (
      hhDebut > 23 || hhDebut < 0 || mmDebut > 59 || mmDebut < 0 ||
      hhFin > 23 || hhFin < 0 || mmFin > 59 || mmFin < 0
    ) {
      Alert.alert("Erreur", "L'heure doit être valide (HH: 0-23, MM: 0-59).");
      return;
    }

    const matchDateStart = new Date(year, month - 1, day, hhDebut, mmDebut);
    const matchDateEnd = new Date(year, month - 1, day, hhFin, mmFin);
    if (matchDateStart < new Date()) {
      Alert.alert("Erreur", "Vous ne pouvez pas créer un match dans le passé.");
      return;
    }
    if (matchDateEnd <= matchDateStart) {
      Alert.alert("Erreur", "L'heure de fin doit être après l'heure de début.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://theao.vercel.app/api/savematch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          nom,
          description,
          communicationLink,
          localisation,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          places,
          prix,
          dateMatch: date,
          heureDebut,
          heureFin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert("Succès", "Match créé avec succès !");
        navigation.goBack();
      } else {
        Alert.alert("Erreur", data.error || "Échec de l'enregistrement");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Problème de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Créer un match</Text>

        {/* Nom du match */}
        <View style={styles.field}>
          <Text style={styles.label}>Nom du match</Text>
          <View style={styles.card}>
            <Ionicons name="football" size={22} color="#FFD700" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: Match du soir"
              placeholderTextColor="#bbb"
              value={nom}
              onChangeText={setNom}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <View style={[styles.card, { alignItems: "flex-start" }]}>
            <Ionicons
              name="document-text"
              size={22}
              color="#FFD700"
              style={{ marginRight: 12, marginTop: 6 }}
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 6 }]}
              placeholder="Ex: Match amical pour s'amuser"
              placeholderTextColor="#bbb"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>
        </View>

        {/* Communication Link */}
        <View style={styles.field}>
          <Text style={styles.label}>Groupe de communication</Text>
          <View style={styles.card}>
            <Ionicons name="chatbubbles" size={22} color="#FFD700" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: lien WhatsApp"
              placeholderTextColor="#bbb"
              value={communicationLink}
              onChangeText={setCommunicationLink}
              keyboardType="url"
            />
          </View>
        </View>

        {/* Location Button */}
        <View style={styles.field}>
          <Text style={styles.label}>Localisation</Text>
          <TouchableOpacity style={styles.locationButton} onPress={openMap}>
            <Text style={{ color: localisation ? "white" : "#bbb", flex: 1 }}>
              {localisation || "Choisir un lieu"}
            </Text>
            <Ionicons name="map" size={22} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Mini Map Preview */}
        {locationCoords && (
          <View style={styles.miniMapContainer}>
            <MapView
              style={styles.miniMap}
              region={{
                latitude: locationCoords.latitude,
                longitude: locationCoords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={locationCoords} />
            </MapView>
          </View>
        )}

        {/* Nombre de places */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre de places</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            {[{ label: "4 v 4", value: 8 }, { label: "5 v 5", value: 10 }, { label: "6 v 6", value: 12 }].map(
              (option) => (
                <TouchableOpacity
                  key={option.label}
                  style={[styles.placeButton, places === option.value && styles.placeButtonSelected]}
                  onPress={() => setPlaces(option.value)}
                >
                  <Text style={[styles.placeButtonText, places === option.value && styles.placeButtonTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.card}>
            <Ionicons name="calendar" size={22} color="#FFD700" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
              value={date}
              maxLength={10}
              onChangeText={handleDateChange}
            />
          </View>
        </View>

        {/* Heure */}
        <View style={styles.field}>
          <Text style={styles.label}>Heure</Text>
          <View style={styles.timeContainer}>
            <View style={styles.timeCard}>
              <Ionicons name="time" size={22} color="#FFD700" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
                maxLength={5}
                value={heureDebut}
                onChangeText={(text) => handleTimeChange(text, setHeureDebut)}
              />
            </View>
            <View style={styles.separator} />
            <View style={styles.timeCard}>
              <Ionicons name="time" size={22} color="#FFD700" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                placeholderTextColor="#bbb"
                keyboardType="numeric"
                maxLength={5}
                value={heureFin}
                onChangeText={(text) => handleTimeChange(text, setHeureFin)}
              />
            </View>
          </View>
        </View>

        {/* Prix */}
        <View style={styles.field}>
          <Text style={styles.label}>Prix du terrain</Text>
          <View style={styles.card}>
            <Ionicons name="cash" size={22} color="#FFD700" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Ex: 20 DH"
              placeholderTextColor="#bbb"
              keyboardType="numeric"
              value={prix}
              onChangeText={setPrix}
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={validateAndSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#4B0082" />
          ) : (
            <Text style={styles.submitText}>Confirmer</Text>
          )}
        </TouchableOpacity>

        {/* Go Back Home Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: "#FF4C4C" }]}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.submitText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Map Modal */}
      <Modal visible={showMap} animationType="slide">
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={userLocation || { latitude: 33.5731, longitude: -7.5898, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
            onPress={(e) => setLocationCoords(e.nativeEvent.coordinate)}
          >
            {locationCoords && <Marker coordinate={locationCoords} draggable />}
          </MapView>

          <View
            style={{
              position: "absolute",
              top: Platform.OS === "ios" ? 60 : 40,
              left: 20,
              right: 20,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMap(false)}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chooseButton}
              onPress={async () => {
                if (locationCoords) {
                  const address = await fetchAddressFromCoords(
                    locationCoords.latitude,
                    locationCoords.longitude
                  );
                  setLocalisation(address);
                }
                setShowMap(false);
              }}
            >
              <Text style={{ color: "#4B0082", fontWeight: "bold" }}>Choisir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4B0082" },
  scroll: { padding: 25, paddingBottom: 50 },
  title: { fontSize: 30, fontWeight: "bold", color: "white", textAlign: "center", marginTop: 45, marginBottom: 15 },
  field: { marginBottom: 9 },
  label: { color: "white", fontSize: 16, fontWeight: "600", marginTop: 15, marginBottom: 8, marginLeft: 5 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#5E2A84", borderRadius: 15, paddingHorizontal: 15, paddingVertical: 15, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  icon: { marginRight: 12 },
  input: { flex: 1, color: "white", fontSize: 18 },
  submitButton: { backgroundColor: "#FFD700", borderRadius: 15, padding: 18, alignItems: "center", marginHorizontal: 0, marginVertical: 10, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  submitText: { fontSize: 18, fontWeight: "bold", color: "#4B0082" },
  timeContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeCard: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#5E2A84", borderRadius: 15, paddingHorizontal: 15, paddingVertical: 15, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  separator: { width: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.3)", marginHorizontal: 10 },
  miniMapContainer: { marginTop: 10, borderRadius: 15, overflow: "hidden", borderWidth: 1, borderColor: "#FFD700" },
  miniMap: { width: "100%", height: 180 },
  closeButton: { backgroundColor: "#FF4C4C", marginTop: 25, padding: 12, borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  chooseButton: { backgroundColor: "#FFD700", marginTop: 25, padding: 12, borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  placeButton: { flex: 1, marginHorizontal: 5, paddingVertical: 15, borderRadius: 15, backgroundColor: "#5E2A84", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  placeButtonSelected: { backgroundColor: "#FFD700" },
  placeButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  placeButtonTextSelected: { color: "#4B0082" },
  locationButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#5E2A84", borderRadius: 15, paddingHorizontal: 15, paddingVertical: 15, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
});

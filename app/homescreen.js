import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Image,
  ImageBackground,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const navigation = useNavigation();
  const lottieRef = useRef(null);
  const today = new Date();
  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const isAndroid = Platform.OS === "android";

  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTab, setSelectedTab] = useState("open");
  const [bottomTab, setBottomTab] = useState("matches");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [searchText, setSearchText] = useState("");

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
    requestLocationPermission();
    fetchMatches();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission refusée",
          "La localisation est nécessaire pour filtrer les matchs par proximité."
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error("Erreur de localisation:", error);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch("https://theao.vercel.app/api/getmatch");
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const days = Array.from({ length: 21 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return date;
  });

  const getMatchDetails = (start, end) => {
    const startTime = new Date(`1970-01-01T${start}`);
    const endTime = new Date(`1970-01-01T${end}`);
    return { startTime, endTime };
  };

  const getThirdPartOfLocalisation = (loc) => {
    if (!loc) return "";
    const parts = loc.split(",");
    return parts[2] ? parts[2].trim() : "";
  };

  const SkeletonCard = () => (
    <View style={styles.card}>
      <View style={{ height: 150, backgroundColor: "#7A4EB0" }} />
      <View style={{ padding: 15 }}>
        <View
          style={{
            height: 20,
            backgroundColor: "#7A4EB0",
            marginBottom: 10,
            borderRadius: 4,
          }}
        />
        <View
          style={{
            height: 20,
            backgroundColor: "#7A4EB0",
            marginBottom: 10,
            borderRadius: 4,
            width: "60%",
          }}
        />
        <View style={{ height: 40, backgroundColor: "#7A4EB0", borderRadius: 8 }} />
      </View>
    </View>
  );

  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredMatches = matches
    .filter((match) => {
      if (!match.date_match || !match.heure_fin) return false;
      const matchDate = new Date(match.date_match);
      const [endHour, endMin] = match.heure_fin.split(":").map(Number);
      const matchEndDateTime = new Date(matchDate);
      matchEndDateTime.setHours(endHour, endMin, 0, 0);
      const now = new Date();
      if (matchEndDateTime < now) return false;

      const isSameDate =
        matchDate.getFullYear() === selectedDate.getFullYear() &&
        matchDate.getMonth() === selectedDate.getMonth() &&
        matchDate.getDate() === selectedDate.getDate();
      if (!isSameDate) return false;

      if (selectedTab === "my") {
        return match.profiles?.email === userEmail;
      }
      return true;
    })
    .map((match) => {
      let distance = 99999;
      if (userLocation && match.latitude && match.longitude) {
        distance = getDistance(
          userLocation.latitude,
          userLocation.longitude,
          match.latitude,
          match.longitude
        );
      }

      const joinedPlayersCount = match.joueur_de_match?.length || 0;
      const remainingPlaces = match.places - joinedPlayersCount;
      const isFull = remainingPlaces <= 0;

      const [startHour, startMin] = match.heure_debut.split(":").map(Number);
      const matchStartDateTime = new Date(match.date_match);
      matchStartDateTime.setHours(startHour, startMin, 0, 0);
      const minutesUntilStart = (matchStartDateTime - new Date()) / (1000 * 60);

      return { ...match, distance, isFull, minutesUntilStart };
    })
    .filter((match) => {
      const text = searchText.toLowerCase();
      return (
        match.nom?.toLowerCase().includes(text) ||
        match.localisation?.toLowerCase().includes(text)
      );
    })
    .sort((a, b) => {
      if (a.isFull && !b.isFull) return 1;
      if (!a.isFull && b.isFull) return -1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.minutesUntilStart - b.minutesUntilStart;
    });

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD700"
            colors={["#FFD700"]}
            progressViewOffset={20}
          />
        }
      >
        <Text style={styles.title}>Matches</Text>

        <View style={{ height: 20 }} />

        <View style={styles.toggleBackground}>
          <TouchableOpacity
            style={[styles.toggleButton, selectedTab === "open" && styles.activeToggle]}
            onPress={() => setSelectedTab("open")}
          >
            <Text
              style={[
                styles.toggleText,
                selectedTab === "open" && styles.activeToggleText,
                isAndroid && { fontSize: 14 },
              ]}
            >
              Matchs ouverts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, selectedTab === "my" && styles.activeToggle]}
            onPress={() => setSelectedTab("my")}
          >
            <Text
              style={[
                styles.toggleText,
                selectedTab === "my" && styles.activeToggleText,
                isAndroid && { fontSize: 14 },
              ]}
            >
              Mes matchs
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesContainer}>
          {days.map((day, index) => {
            const isSelected = selectedDate.toDateString() === day.toDateString();
            return (
              <TouchableOpacity
                key={index}
                style={[styles.dateBox, isSelected && styles.selectedDate]}
                onPress={() => setSelectedDate(day)}
              >
                <Text
                  style={[
                    styles.dateText,
                    isSelected && styles.selectedDateText,
                    isAndroid && { fontSize: 14 },
                  ]}
                >
                  {day.getDate()}
                </Text>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.selectedDateText,
                    isAndroid && { fontSize: 10 },
                  ]}
                >
                  {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ height: 20 }} />

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="gray" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Rechercher par nom ou localisation"
              placeholderTextColor="#bbb"
              style={styles.input}
              returnKeyType="search"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate("CreerMatch")}
          >
            <Text style={[styles.createText, isAndroid && { fontSize: 9 }]}>Créer un match</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />

        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => <SkeletonCard key={idx} />)
        ) : filteredMatches.length === 0 ? (
          <View style={styles.noMatchContainer}>
            <LottieView
              ref={lottieRef}
              source={require("../assets/kickbal.json")}
              autoPlay={false}
              loop={false}
              style={{ width: 400, height: 250, opacity: 0.3, marginRight: "70" }}
            />
            <Text style={styles.noMatchText}>
              Pas de match pour le moment, restez prêt !
            </Text>
          </View>
        ) : (
          filteredMatches.map((match, idx) => {
            const { startTime, endTime } = getMatchDetails(match.heure_debut, match.heure_fin);
            const joinedPlayersCount = match.joueur_de_match?.length || 0;
            const remainingPlaces = match.places - joinedPlayersCount;
            const isFull = remainingPlaces <= 0;

            return (
              <View key={idx} style={styles.card}>
                <View style={styles.imageBackgroundWrapper}>
                  <ImageBackground
                    source={require("../assets/fot1.jpg")}
                    style={styles.backgroundImage}
                    imageStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                  />
                  <Image
                    source={
                      match.creator_picture
                        ? { uri: match.creator_picture }
                        : require("../assets/dummy.png")
                    }
                    style={styles.profilePicOverlay}
                  />
                  <View
                    style={[
                      styles.remainingPlacesBadge,
                      isFull
                        ? { backgroundColor: "rgba(255,0,0,0.85)" }
                        : { backgroundColor: "green" },
                    ]}
                  >
                    <Text style={[styles.remainingPlacesText, isAndroid && { fontSize: 10 }]}>
                      {isFull ? "Match complet" : `${remainingPlaces} place${remainingPlaces > 1 ? "s" : ""} restante`}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.localisationText, isAndroid && { fontSize: 10 }]}>
                    {getThirdPartOfLocalisation(match.localisation)}
                  </Text>
                  <Text style={[styles.matchName, isAndroid && { fontSize: 18 }]}>{match.nom}</Text>

                  <View style={styles.separator} />

                  <Text style={[styles.detailLabel, isAndroid && { fontSize: 12 }]}>Détail du match :</Text>
                  <View style={styles.detailsRow}>
                    <Text style={[styles.detailsText, isAndroid && { fontSize: 14 }]}>
                      {formatTime(startTime)} - {formatTime(endTime)}
                    </Text>
                    <Text style={[styles.priceText, isAndroid && { fontSize: 14 }]}>Prix : {match.prix} dh</Text>
                  </View>

                  <View style={styles.separator} />

                  <TouchableOpacity
                    style={styles.joinButton}
                    onPress={() => navigation.navigate("MatchDetail", { match })}
                  >
                    <Text style={[styles.joinButtonText, isAndroid && { fontSize: 14 }]}>voir le match</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Nav wrapped in SafeAreaView with platform-specific background */}
      <SafeAreaView
        style={{
          backgroundColor: Platform.OS === "ios" ? "#5E2A84" : "white",
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
        edges={["bottom"]}
      >
        <StatusBar
          barStyle={Platform.OS === "android" ? "light-content" : "default"}
        />
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
                fontSize: Platform.OS === "android" ? 10 : 10,
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
                fontSize: Platform.OS === "android" ? 10 : 10,
                marginTop: 1,             }}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#4B0082", padding: 20, borderRadius: 12 },
  title: { fontSize: 28, fontWeight: "bold", color: "white", textAlign: "center", marginTop: 20 },
  toggleBackground: { flexDirection: "row", backgroundColor: "#6A359C", borderRadius: 12, paddingVertical: 5, paddingHorizontal: 5 },
  toggleButton: { flex: 1, paddingVertical: 12, backgroundColor: "#6A359C", borderRadius: 10, alignItems: "center" },
  toggleText: { color: "white", fontWeight: "600", fontSize: 16 },
  activeToggle: { backgroundColor: "#FFD700" },
  activeToggleText: { color: "#4B0082", fontWeight: "bold" },
  datesContainer: { backgroundColor: "#5E2A84", paddingVertical: 10, borderRadius: 12, height: 100 },
  dateBox: { width: 60, height: 80, borderRadius: 10, backgroundColor: "#6A359C", justifyContent: "center", alignItems: "center", marginHorizontal: 5 },
  selectedDate: { backgroundColor: "#FFD700" },
  dateText: { fontSize: 18, color: "white", fontWeight: "bold" },
  dayText: { fontSize: 14, color: "#ccc" },
  selectedDateText: { color: "#4B0082", fontWeight: "bold" },
  searchContainer: { flexDirection: "row", alignItems: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#5E2A84", flex: 1, borderRadius: 10, paddingHorizontal: 10, height: 45, marginRight: 10 },
  input: { flex: 1, color: "white" },
  createButton: { backgroundColor: "#FFD700", borderRadius: 10, paddingVertical: 13, paddingHorizontal: 15 },
  createText: { fontWeight: "bold", color: "#4B0082" },
  card: { backgroundColor: "#5E2A84", borderRadius: 12, marginBottom: 20, overflow: "hidden" },
  imageBackgroundWrapper: { position: "relative", height: 150 },
  backgroundImage: { width: "100%", height: "100%" },
  profilePicOverlay: { width: 50, height: 50, borderRadius: 25, position: "absolute", bottom: 10, left: 10, borderWidth: 2, borderColor: "white" },
  remainingPlacesBadge: { position: "absolute", top: 10, right: 10, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 8 },
  remainingPlacesText: { color: "white", fontWeight: "bold" },
  cardContent: { padding: 15 },
  localisationText: { color: "#ccc", fontSize: 14 },
  matchName: { fontSize: 22, fontWeight: "bold", color: "white", marginVertical: 5 },
  separator: { height: 1, backgroundColor: "#7A4EB0", marginVertical: 10 },
  detailLabel: { fontSize: 16, color: "#FFD700", fontWeight: "bold", marginBottom: 5 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  detailsText: { color: "white", fontSize: 16 },
  priceText: { color: "#FFD700", fontSize: 16, fontWeight: "bold" },
  joinButton: { backgroundColor: "#FFD700", borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 10 },
  joinButtonText: { color: "#4B0082", fontWeight: "bold", fontSize: 16 },
  bottomNav: { flexDirection: "row", justifyContent: "space-around",height: 40 },
  navButton: { alignItems: "center",marginTop:7 },
  navSeparator: { width: 1, backgroundColor: "#fff" },
  noMatchContainer: { alignItems: "center", marginTop: 40 },
  noMatchText: { color: "white", fontSize: 16, marginTop: 10 },
});

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Linking,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  FlatList,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Scaling functions
const scale = (size) => (SCREEN_WIDTH / 375) * size;
const verticalScale = (size) => (SCREEN_HEIGHT / 667) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

export default function MatchDetailScreen({ route }) {
  const { match } = route.params;
  const { user } = useUser();
  const navigation = useNavigation();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readMore, setReadMore] = useState(false);
  const [players, setPlayers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const api_key = process.env.EXPO_PUBLIC_API_BASE_URL;
  const getMatchImage = (places) => {
        switch (places) {
          case 8:
            return require("../assets/4v4.png");
          case 10:
            return require("../assets/5v5.png");
          case 12:
            return require("../assets/6v6.png");
          default:
            return require("../assets/fot1.jpg"); // fallback/default image
        }
      };

  const DESCRIPTION_LIMIT = 300;

  // Shimmer animation
  const shimmerValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const SkeletonPlayer = () => (
    <Animated.View
      style={{
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        marginRight: scale(12),
        backgroundColor: "#555",
        opacity: shimmerValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        }),
      }}
    />
  );

  const fetchMatchData = useCallback(async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${api_key}/api/getmatchjoin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, matchId: match.id }),
      });
      const data = await res.json();
      setIsJoined(data.success && data.joined);
      if (data.success && data.players) setPlayers(data.players);
      setIsCreator(match.profiles?.email === userEmail);
    } catch (err) {
      setIsJoined(false);
    } finally {
      setLoading(false);
    }
  }, [userEmail, match.id]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMatchData();
    setRefreshing(false);
  };

  const handleJoinMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api_key}/api/matchjoin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, matchId: match.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsJoined(true);
        if (data.players) setPlayers(data.players);
        Alert.alert("Succès", "Vous avez rejoint le match !");
      } else {
        Alert.alert("Erreur", data.error || "Impossible de rejoindre le match.");
      }
    } catch (err) {
      Alert.alert("Erreur", "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${api_key}/api/matchleave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, matchId: match.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsJoined(false);
        setPlayers(players.filter((p) => p.email !== userEmail));
        Alert.alert("Info", "Vous avez quitté le match.");
      } else {
        Alert.alert("Erreur", data.error || "Impossible de quitter le match.");
      }
    } catch (err) {
      Alert.alert("Erreur", "Une erreur est survenue, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    Alert.alert(
      "Confirmer la suppression",
      "Êtes-vous sûr de vouloir supprimer ce match ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              const res = await fetch(`${api_key}/api/deletematch`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userEmail, matchId: match.id }),
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert("Succès", "Le match a été supprimé !");
                navigation.goBack();
              } else {
                Alert.alert("Erreur", data.error || "Impossible de supprimer le match.");
              }
            } catch (err) {
              Alert.alert("Erreur", "Une erreur est survenue, veuillez réessayer.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderPlayer = ({ item }) => (
    <View style={styles.playerCard}>
      <Image
        source={
          item.picture ? { uri: item.picture } : require("../assets/dummy.png")
        }
        style={styles.playerImage}
      />
      <Text style={styles.playerName}>
        {item.first_name} {item.last_name}
      </Text>
      <Text style={styles.playerPhone}>{item.phone}</Text>
    </View>
  );

  const size = scale(90);
  const strokeWidth = scale(10);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const filled = players.length;
  const progress = match.places ? (filled / match.places) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <LinearGradient colors={["#4B0082", "#5E2A84"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: verticalScale(40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ position: "relative" }}>
          <Image
            source={getMatchImage(match.places)}
            style={[styles.matchImage, { width: SCREEN_WIDTH, height: verticalScale(200) }]}
            resizeMode="cover"
          />
          {/* Go Back button on top of image */}
          <TouchableOpacity
            style={styles.homeIcon}
            onPress={() => navigation.navigate("Home")}
          >
            <Ionicons name="arrow-undo-outline" size={scale(24)} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {/* Creator */}
        <View style={styles.creatorRow}>
          <Image
            source={
              match.creator_picture
                ? { uri: match.creator_picture }
                : require("../assets/dummy.png")
            }
            style={styles.creatorImage}
          />
          <View style={{ marginLeft: scale(10), flex: 1 }}>
            <Text style={styles.matchNameSmall}>
              {match.nom ?? "Nom du match"}
            </Text>
            <Text style={styles.creatorName}>
              {match.profiles?.first_name ?? ""} {match.profiles?.last_name ?? ""}
            </Text>
          </View>
        </View>

        <View style={styles.thinSeparator} />

        {/* Progress row */}
        <View style={styles.progressRow}>
          <View style={styles.circularProgressWrapper}>
            <Svg width={size} height={size}>
              <Circle
                stroke="#6A359C"
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
              />
              <Circle
                stroke="#FFD700"
                fill="none"
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
            <Text style={styles.circularText}>
              {filled}/{match.places ?? 0}{"\n"}Joueurs
            </Text>
          </View>

          <View style={styles.infoRight}>
            {match.heure_debut && match.heure_fin && (
              <Text style={styles.timeText}>
                {match.heure_debut.substring(0, 5)} - {match.heure_fin.substring(0, 5)}
              </Text>
            )}
            <Text style={styles.priceText}>Prix: {match.prix ?? 0} dh</Text>

            {match.communication_link && (
              <Text
                style={styles.whatsLink}
                onPress={() => Linking.openURL(match.communication_link)}
              >
                <MaterialCommunityIcons name="whatsapp" size={scale(18)} color="green" />{" "}
                Groupe de communication
              </Text>
            )}

            {match.localisation && (
              <Text
                style={styles.locationLink}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${match.latitude ?? 0},${match.longitude ?? 0}`
                  )
                }
              >
                <FontAwesome5 name="map-marker-alt" size={scale(18)} color="grey" />{" "}
                Localisation du terrain
              </Text>
            )}
          </View>
        </View>

        {/* Players */}
        <View style={{ marginHorizontal: scale(20), marginBottom: verticalScale(10), marginTop: verticalScale(5) }}>
          <Text style={styles.detailLabel}>Joueurs :</Text>
          {loading ? (
            <View style={{ flexDirection: "row" }}>
              {[...Array(5)].map((_, i) => (
                <SkeletonPlayer key={i} />
              ))}
            </View>
          ) : (
            <FlatList
              data={players}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderPlayer}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: verticalScale(5) }}
            />
          )}
        </View>

        {/* Description */}
        {match.description && (
          <View style={{ marginTop: verticalScale(5), paddingHorizontal: scale(20) }}>
            <Text style={styles.detailLabel}>Description :</Text>
            <Text style={styles.detailsText}>
              {readMore || match.description.length <= DESCRIPTION_LIMIT
                ? match.description
                : match.description.substring(0, DESCRIPTION_LIMIT) + "..."}
            </Text>
            {match.description.length > DESCRIPTION_LIMIT && (
              <TouchableWithoutFeedback onPress={() => setReadMore(!readMore)}>
                <Text style={{ color: "#FFD700", fontWeight: "bold", marginTop: verticalScale(5) }}>
                  {readMore ? "Voir moins" : "Lire plus"}
                </Text>
              </TouchableWithoutFeedback>
            )}
          </View>
        )}

        {/* Join / Leave / Delete Button */}
        <View style={{ alignItems: "center", marginTop: verticalScale(30) }}>
          <TouchableOpacity
            style={[
              styles.joinButton,
              {
                backgroundColor: isCreator ? "red" : isJoined ? "red" : "#FFD700",
                opacity: loading ? 0.5 : 1,
              },
            ]}
            onPress={isCreator ? handleDeleteMatch : isJoined ? handleLeaveMatch : handleJoinMatch}
            disabled={loading}
          >
            <Text
              style={[
                styles.joinButtonText,
                { color: isCreator || isJoined ? "white" : "#4B0082" },
              ]}
            >
              {loading
                ? "Chargement..."
                : isCreator
                ? "Supprimer le match"
                : isJoined
                ? "Quitter le match"
                : "Rejoindre le match"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  matchImage: { borderRadius: 0, marginBottom: verticalScale(15) },

  homeIcon: {
    position: "absolute",
    top: Platform.OS === "android" ? 15 : 50,
    left: 15,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 6,
    borderRadius: 20,
  },

  creatorRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(8), paddingHorizontal: scale(20) },
  creatorImage: { width: scale(50), height: scale(50), borderRadius: scale(25) },
  matchNameSmall: { color: "#FFD700", fontSize: moderateScale(20), fontWeight: "bold" },
  creatorName: { color: "#ccc", fontSize: moderateScale(16) },

  thinSeparator: { borderBottomColor: "rgba(255, 255, 255, 0.3)", borderBottomWidth: 0.3, opacity: 0.5, marginHorizontal: scale(20), marginBottom: verticalScale(15) },

  progressRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(20), marginTop: verticalScale(10), paddingHorizontal: scale(20) },
  circularProgressWrapper: { width: scale(90), height: scale(90), justifyContent: "center", alignItems: "center" },
  circularText: { position: "absolute", color: "white", fontWeight: "bold", textAlign: "center", fontSize: moderateScale(14) },

  infoRight: { marginLeft: scale(20), justifyContent: "center" },
  priceText: { color: "white", fontSize: moderateScale(18), fontWeight: "bold", marginBottom: verticalScale(5) },
  timeText: { color: "#FFD700", fontSize: moderateScale(16), fontWeight: "600", marginBottom: verticalScale(5) },
  whatsLink: { fontSize: moderateScale(16), fontWeight: "bold", marginBottom: verticalScale(5), color: "green" },
  locationLink: { fontSize: moderateScale(16), fontWeight: "bold", color: "grey" },

  detailLabel: { color: "#FFD700", fontSize: moderateScale(16), fontWeight: "600", marginBottom: verticalScale(5) },
  detailsText: { color: "white", fontSize: moderateScale(16) },

  playerCard: { alignItems: "center", marginRight: scale(15), width: scale(70) },
  playerImage: { width: scale(50), height: scale(50), borderRadius: scale(25), marginBottom: verticalScale(3) },
  playerName: { color: "white", fontSize: moderateScale(12), textAlign: "center" },
  playerPhone: { color: "#FFD700", fontSize: moderateScale(10), textAlign: "center" },

  joinButton: {
    width: "80%",
    paddingVertical: verticalScale(12),
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: { fontWeight: "bold", fontSize: moderateScale(18) },
});

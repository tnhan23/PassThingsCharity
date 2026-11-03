import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

function hostFromExpo() {
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return "";
  return `http://${host}:8080`;
}

const configured = extra?.apiUrl && !extra.apiUrl.includes("localhost") ? extra.apiUrl : "";

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  configured ||
  hostFromExpo() ||
  (Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://127.0.0.1:8080");

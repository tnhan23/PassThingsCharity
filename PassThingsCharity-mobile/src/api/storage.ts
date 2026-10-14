import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { SessionUser } from "@/api/types";

const KEY = "passdo.session";

export type StoredSession = {
  token: string;
  user: SessionUser;
};

export async function readSession(): Promise<StoredSession | null> {
  try {
    const raw = Platform.OS === "web" ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed.token || !parsed.user?.username) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeSession(session: StoredSession | null): Promise<void> {
  if (Platform.OS === "web") {
    if (session) window.localStorage.setItem(KEY, JSON.stringify(session));
    else window.localStorage.removeItem(KEY);
    return;
  }
  if (session) await SecureStore.setItemAsync(KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(KEY);
}

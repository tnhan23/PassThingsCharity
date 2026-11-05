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

function orgKey(userId: string) {
  return `passdo.org.${userId}`;
}

export async function readOrgRequest(userId: string): Promise<string | null> {
  try {
    const key = orgKey(userId);
    const raw = Platform.OS === "web" ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key);
    return raw || null;
  } catch {
    return null;
  }
}

export async function writeOrgRequest(userId: string, id: string | null): Promise<void> {
  const key = orgKey(userId);
  if (Platform.OS === "web") {
    if (id) window.localStorage.setItem(key, id);
    else window.localStorage.removeItem(key);
    return;
  }
  if (id) await SecureStore.setItemAsync(key, id);
  else await SecureStore.deleteItemAsync(key);
}

function shellKey(userId: string) {
  return `passdo.shell.${userId}`;
}

export async function readShell(userId: string): Promise<"member" | "desk" | null> {
  try {
    const key = shellKey(userId);
    const raw = Platform.OS === "web" ? window.localStorage.getItem(key) : await SecureStore.getItemAsync(key);
    if (raw === "member" || raw === "desk") return raw;
    return null;
  } catch {
    return null;
  }
}

export async function writeShell(userId: string, mode: "member" | "desk"): Promise<void> {
  const key = shellKey(userId);
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, mode);
    return;
  }
  await SecureStore.setItemAsync(key, mode);
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

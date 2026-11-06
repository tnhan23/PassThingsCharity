import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { apiBaseUrl } from "@/api/base";

const keyStore = "passdo.appattest.keyId";

type Challenge = { id: string; challenge: string };

let pendingKey: Promise<string> | null = null;

function attestApi() {
  return require("@expo/app-integrity") as typeof import("@expo/app-integrity");
}

async function readError(response: Response) {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { error?: string; code?: string };
    return { message: data.error || "Máy chủ từ chối app.", code: data.code || "" };
  } catch {
    return { message: "Máy chủ từ chối app.", code: "" };
  }
}

async function challenge(): Promise<Challenge> {
  const response = await fetch(`${apiBaseUrl}/app-attest/challenge`);
  if (!response.ok) {
    const error = await readError(response);
    throw new Error(error.message);
  }
  return response.json() as Promise<Challenge>;
}

async function createKey() {
  const integrity = attestApi();
  if (!integrity.isSupported) {
    throw new Error("Máy này không chứng nhận được app với Apple.");
  }
  const keyId = await integrity.generateKeyAsync();
  const issued = await challenge();
  const attestation = await integrity.attestKeyAsync(keyId, issued.challenge);
  const response = await fetch(`${apiBaseUrl}/app-attest/attest`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ keyId, attestation, challengeId: issued.id }),
  });
  if (!response.ok) {
    const error = await readError(response);
    throw new Error(error.message);
  }
  await SecureStore.setItemAsync(keyStore, keyId);
  return keyId;
}

async function keyId() {
  if (pendingKey) return pendingKey;
  pendingKey = (async () => {
    const stored = await SecureStore.getItemAsync(keyStore);
    if (stored) return stored;
    return createKey();
  })().catch((error) => {
    pendingKey = null;
    throw error;
  });
  return pendingKey;
}

export async function resetAttestation() {
  pendingKey = null;
  await SecureStore.deleteItemAsync(keyStore).catch(() => undefined);
}

export async function attestationHeaders(): Promise<Record<string, string>> {
  if (process.env.EXPO_PUBLIC_APP_ATTEST !== "true") return {};
  if (Platform.OS !== "ios") return {};
  if (apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1")) return {};
  const id = await keyId();
  const issued = await challenge();
  const assertion = await attestApi().generateAssertionAsync(id, issued.challenge);
  return {
    "X-App-Attest-Key": id,
    "X-App-Attest-Assertion": assertion,
    "X-App-Attest-Challenge": issued.id,
  };
}

import { sha256 } from "js-sha256";
import { apiBaseUrl } from "@/api/base";

function signingSecret() {
  return process.env.EXPO_PUBLIC_APP_SIGNING_SECRET || "";
}

export function shouldSignRequest() {
  if (!signingSecret()) return false;
  return !apiBaseUrl.includes("localhost") && !apiBaseUrl.includes("127.0.0.1");
}

export function signatureHeaders(method: string, path: string, body: string) {
  if (!shouldSignRequest()) return {};
  const time = Date.now().toString();
  const bodyHash = sha256(body);
  const payload = `${time}\n${method.toUpperCase()}\n${path}\n${bodyHash}`;
  return {
    "X-App-Time": time,
    "X-App-Sign": sha256.hmac(signingSecret(), payload),
  };
}

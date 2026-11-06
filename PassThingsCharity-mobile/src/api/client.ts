import { attestationHeaders, resetAttestation } from "@/api/attest";
import { apiBaseUrl } from "@/api/base";
import { signatureHeaders } from "@/api/sign";

export { apiBaseUrl };

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; token?: string | null },
  retried = false,
): Promise<T> {
  const method = options?.method ?? "GET";
  const bodyText = options?.body !== undefined ? JSON.stringify(options.body) : "";
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...signatureHeaders(method, path, bodyText),
    ...(await attestationHeaders()),
  };
  if (options?.body !== undefined) headers["Content-Type"] = "application/json";
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: bodyText || undefined,
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ.");
  }

  const text = await response.text();
  let data: { error?: unknown; code?: unknown } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: unknown; code?: unknown };
    } catch {
      const expired = response.status === 401;
      throw new ApiError(response.status, expired ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." : "Máy chủ trả về dữ liệu không đọc được.");
    }
  }

  if (!response.ok) {
    const code = typeof data.code === "string" ? data.code : "";
    if (!retried && code === "app_attest_unknown") {
      await resetAttestation();
      return api(path, options, true);
    }
    const message = typeof data.error === "string" ? data.error : "Máy chủ từ chối yêu cầu.";
    throw new ApiError(response.status, message, code);
  }

  return data as T;
}

export type UploadFile = { uri: string; name: string; type: string; base64?: string };

function imagePart(file: UploadFile) {
  if (!file.base64) return null;
  const binary = atob(file.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { name: file.name, type: file.type, bytes: () => bytes };
}

export async function uploadImages<T>(path: string, token: string, files: UploadFile[], field = "images", retried = false): Promise<T> {
  if (files.length !== 1) {
    throw new ApiError(0, "Mỗi lần chỉ tải được một ảnh.");
  }
  const body = new FormData();
  for (const file of files) {
    const part = imagePart(file);
    if (part) {
      body.append(field, part as unknown as Blob);
      continue;
    }
    const blob = await fetch(file.uri).then((response) => response.blob());
    body.append(field, blob, file.name);
  }
  const fileMark = files.map((file) => `${encodeURIComponent(file.name)}:${encodeURIComponent(file.type)}`).join(",");
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...signatureHeaders("POST", path, fileMark),
        "X-App-Files": fileMark,
        ...(await attestationHeaders()),
      },
      body,
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ.");
  }
  const text = await response.text();
  let data: { error?: unknown; code?: unknown } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: unknown; code?: unknown };
    } catch {
      throw new ApiError(response.status, "Máy chủ trả về dữ liệu không đọc được.");
    }
  }
  if (!response.ok) {
    const code = typeof data.code === "string" ? data.code : "";
    if (!retried && code === "app_attest_unknown") {
      await resetAttestation();
      return uploadImages(path, token, files, field, true);
    }
    const message = typeof data.error === "string" ? data.error : "Không tải được ảnh.";
    throw new ApiError(response.status, message, code);
  }
  return data as T;
}

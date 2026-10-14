import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || extra?.apiUrl || "http://localhost:8080";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; token?: string | null },
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options?.body !== undefined) headers["Content-Type"] = "application/json";
  if (options?.token) headers.Authorization = `Bearer ${options.token}`;

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      method: options?.method ?? "GET",
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ.");
  }

  const text = await response.text();
  let data: { error?: unknown } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: unknown };
    } catch {
      throw new ApiError(response.status, "Máy chủ trả về dữ liệu không đọc được.");
    }
  }

  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : "Máy chủ từ chối yêu cầu.";
    throw new ApiError(response.status, message);
  }

  return data as T;
}

import { Platform } from "react-native";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Tokens are passed explicitly, never placed in URLs, analytics or logs. */
export async function apiRequest<T>(
  path: string,
  body?: object,
  token?: string,
  method = body ? "POST" : "GET",
): Promise<T> {
  const base =
    Platform.OS === "web"
      ? (process.env.EXPO_PUBLIC_WEB_API_URL ?? process.env.EXPO_PUBLIC_API_URL)
      : process.env.EXPO_PUBLIC_API_URL;
  if (!base || (!__DEV__ && !base.startsWith("https://")))
    throw new ApiError(
      "No se pudo establecer una conexión segura con el servicio.",
    );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  let data: {
    message?: unknown;
    code?: string;
    retryAfterSeconds?: number;
  } & T;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": Platform.OS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    data = response.status === 204 ? {} : await response.json();
  } catch {
    throw new ApiError(
      "No pudimos confirmar la respuesta. Revisa tu conexión y vuelve a intentarlo.",
    );
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok)
    throw new ApiError(
      typeof data.message === "string"
        ? data.message
        : "Revisa los datos e intenta de nuevo.",
      data.code,
      data.retryAfterSeconds,
      response.status,
    );
  return data as T;
}

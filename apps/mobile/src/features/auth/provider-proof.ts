import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { apiRequest } from "@/lib/api";
import { Provider, SessionGrant } from "./auth.types";

export const googleAvailable =
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) &&
  (Platform.OS !== "ios" ||
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID));

export async function providerProof(
  provider: Provider,
  nonce: string,
): Promise<string | null> {
  if (provider !== "google") throw new Error("Proveedor de acceso no admitido.");
  if (!googleAvailable)
    throw new Error(
      "Google estará disponible cuando configures e instales la versión de desarrollo.",
    );
  // Lazy load: email access remains usable in Expo Go without the custom native module.
  const { GoogleOneTapSignIn } =
    await import("react-native-nitro-google-signin");
  GoogleOneTapSignIn.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    nonce,
    offlineAccess: false,
  });
  await GoogleOneTapSignIn.checkPlayServices();
  const result = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (result.type === "cancelled") return null;
  if (result.type !== "success" || !result.data?.idToken)
    throw new Error("No pudimos completar el acceso con Google.");
  return result.data.idToken;
}

export async function federatedLogin(
  provider: Provider,
): Promise<SessionGrant | null> {
  const challenge = await apiRequest<{ challengeId: string; nonce: string }>(
    "/auth/providers/challenge",
    { provider },
  );
  const identityToken = await providerProof(provider, challenge.nonce);
  if (!identityToken) return null;
  return apiRequest<SessionGrant>("/auth/providers/login", {
    provider,
    challengeId: challenge.challengeId,
    identityToken,
  });
}

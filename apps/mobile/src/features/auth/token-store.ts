import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "marketplace.session";
let webToken: string | null = null;
// Native tokens live in Keychain/Keystore. Web preview deliberately uses memory only.
export const tokenStore = {
  read: () =>
    Platform.OS === "web"
      ? Promise.resolve(webToken)
      : SecureStore.getItemAsync(KEY),
  write: async (token: string) => {
    if (Platform.OS === "web") webToken = token;
    else
      await SecureStore.setItemAsync(KEY, token, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
  },
  clear: async () => {
    webToken = null;
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(KEY);
  },
};

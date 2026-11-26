import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const appId =
    process.env.EXPO_PUBLIC_APP_ID ?? "com.lavanderia.marketplace.dev";
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const plugins = (config.plugins ?? []).filter(
    (plugin) =>
      (typeof plugin === "string" ? plugin : plugin[0]) !==
      "react-native-nitro-google-signin",
  );
  // Public OAuth configuration is required before including Google's native config plugin.
  if (iosClientId)
    plugins.push([
      "react-native-nitro-google-signin",
      { iosUrlScheme: iosClientId.split(".").reverse().join(".") },
    ]);
  return {
    ...config,
    name: config.name ?? "Lavandería",
    slug: config.slug ?? "lavanderia-marketplace",
    scheme: "lavanderia",
    plugins,
    ios: { ...config.ios, bundleIdentifier: appId },
    android: { ...config.android, package: appId },
  };
};

import { useEffect, useState } from "react";
import { Platform, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { ActionButton } from "@/components/action-button";
import { ThemedText as Text } from "@/components/themed-text";
import { Layout, Spacing } from "@/constants/theme";
import { googleAvailable } from "./provider-proof";
import { Provider } from "./auth.types";
type NativeGoogleButton =
  typeof import("react-native-nitro-google-signin").GoogleSignInButton;

export function SocialButtons({
  busy,
  onPress,
}: {
  busy: boolean;
  onPress: (provider: Provider) => void;
}) {
  const colors = useTheme();
  const [GoogleButton, setGoogleButton] = useState<NativeGoogleButton | null>(
    null,
  );
  useEffect(() => {
    if (googleAvailable)
      void import("react-native-nitro-google-signin")
        .then((module) => setGoogleButton(() => module.GoogleSignInButton))
        .catch(() => setGoogleButton(null));
  }, []);
  return (
    <View style={{ gap: Spacing.three }}>
      {GoogleButton ? (
        <GoogleButton
          size="wide"
          colorScheme="light"
          signInBehavior="none"
          disabled={busy}
          loading={busy}
          onPress={() => onPress("google")}
          style={{ width: "100%", height: Layout.minimumTouchTarget }}
        />
      ) : (
        Platform.OS !== "web" && (
          <ActionButton
            label="Continuar con Google"
            disabled
            variant="outlined"
            onPress={() => {}}
          />
        )
      )}
      {Platform.OS !== "web" && !GoogleButton && (
        <Text style={{ color: colors.textSecondary }}>
          Google estará disponible en la versión de desarrollo. Puedes continuar
          con tu correo.
        </Text>
      )}
    </View>
  );
}

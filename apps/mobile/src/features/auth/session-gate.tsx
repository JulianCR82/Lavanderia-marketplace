import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/hooks/use-theme";
import { Screen } from "@/components/screen";
import { ActionButton } from "@/components/action-button";
import { useAuth } from "./auth-context";
import AuthScreen from "./auth-screen";
import HomeScreen from "@/features/home/home-screen";
import { Notice, ScreenHeading } from "@/components/product-ui";

export default function SessionGate() {
  const auth = useAuth();
  const colors = useTheme();
  if (auth.loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Recuperando sesión"
          color={colors.primary}
        />
      </View>
    );
  if (auth.error)
    return (
      <Screen title="Tu sesión">
        <ScreenHeading title="Volvamos a tu cuenta" icon="shield" />
        <Notice tone="danger" message={auth.error} />
        <ActionButton
          label="Volver a intentar"
          onPress={() => {
            void auth.restore();
          }}
        />
      </Screen>
    );
  return auth.profile ? <HomeScreen /> : <AuthScreen />;
}

import { useRef, useState } from "react";
import { View } from "react-native";
import {
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from "expo-router/drawer";
import { ActionButton } from "@/components/action-button";
import { ThemedText as Text } from "@/components/themed-text";
import { Spacing, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/features/auth/auth-context";
import {
  AppIcon,
  IconBadge,
  Notice,
  type ProductIcon,
} from "@/components/product-ui";

/** Navigation, gestures, overlay and Android Back are owned by the drawer navigator. */
export function AccountDrawer({
  navigation,
  state,
}: DrawerContentComponentProps) {
  const auth = useAuth();
  const colors = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  if (!auth.profile) return null;

  function navigate(route: "index" | "perfil" | "sesiones") {
    navigation.navigate(route);
    navigation.closeDrawer();
  }
  async function logout() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await auth.logout();
      navigation.closeDrawer();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos cerrar tu sesión.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <DrawerContentScrollView
      contentContainerStyle={{ flexGrow: 1, gap: Spacing.two }}
    >
      <View style={{ padding: Spacing.three, gap: Spacing.two }}>
        <IconBadge icon="person" selected />
        <Text type="subtitle" accessibilityRole="header">
          Tu cuenta
        </Text>
        <Text>{auth.profile.displayName ?? "Bienvenido"}</Text>
        <Text type="small" themeColor="textSecondary" selectable>
          {auth.profile.email ?? "Sin correo disponible"}
        </Text>
      </View>
      {(
        [
          { route: "index", label: "Inicio", icon: "home" },
          { route: "perfil", label: "Mi perfil", icon: "person" },
          { route: "sesiones", label: "Sesiones activas", icon: "shield" },
        ] as const
      ).map(({ route, label, icon }) => (
        <DrawerItem
          key={route}
          label={label}
          icon={() => <AppIcon name={icon as ProductIcon} />}
          focused={state.routes[state.index]?.name === route}
          onPress={() => {
            if (!busy) navigate(route);
          }}
          activeTintColor={colors.primary}
          inactiveTintColor={colors.text}
          activeBackgroundColor={colors.backgroundSelected}
          labelStyle={Typography.headline}
        />
      ))}
      <View style={{ padding: Spacing.three, gap: Spacing.two }}>
        {!!error && <Notice tone="danger" message={error} />}
        <ActionButton
          label="Cerrar sesión"
          variant="outlined"
          tone="danger"
          loading={busy}
          onPress={() => {
            void logout();
          }}
        />
        <ActionButton
          label="Cerrar menú"
          variant="text"
          onPress={() => navigation.closeDrawer()}
        />
      </View>
    </DrawerContentScrollView>
  );
}

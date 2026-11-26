import { router, useNavigation } from "expo-router";
import type { DrawerNavigationProp } from "expo-router/drawer";
import { Pressable, View } from "react-native";
import { ThemedText as Text } from "@/components/themed-text";
import { Layout, Shape, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/features/auth/auth-context";

/** Header actions control the shared route drawer, not a separate modal sheet. */
export function AccountMenu() {
  const colors = useTheme();
  const { profile } = useAuth();
  const navigation =
    useNavigation<DrawerNavigationProp<Record<string, object | undefined>>>();
  // A header retained during logout must not expose authenticated actions.
  if (!profile) return null;
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: Spacing.two }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir mi perfil"
        onPress={() => router.navigate("/perfil")}
        style={({ pressed }) => ({
          minHeight: Layout.minimumTouchTarget,
          minWidth: Layout.minimumTouchTarget,
          justifyContent: "center",
          paddingHorizontal: Spacing.three,
          borderRadius: Shape.pill,
          backgroundColor: pressed
            ? colors.backgroundSelected
            : colors.backgroundElement,
        })}
      >
        <Text type="smallBold" themeColor="primary">
          Perfil
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menú lateral de opciones"
        onPress={() => navigation.openDrawer()}
        style={({ pressed }) => ({
          minWidth: Layout.minimumTouchTarget,
          minHeight: Layout.minimumTouchTarget,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: Shape.control,
          backgroundColor: pressed
            ? colors.backgroundSelected
            : colors.background,
        })}
      >
        <View accessible={false} style={{ gap: Spacing.one }}>
          {[0, 1, 2].map((line) => (
            <View
              key={line}
              style={{
                width: Spacing.four,
                height: Spacing.half,
                backgroundColor: colors.primary,
              }}
            />
          ))}
        </View>
      </Pressable>
    </View>
  );
}

import type { ReactNode } from "react";
import { Drawer } from "expo-router/drawer";
import {
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Layout, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Shared scroll and inset policy; native navigation owns the screen title. */
export function Screen({
  title,
  children,
  headerRight,
  compact = false,
  refreshing = false,
  onRefresh,
  scroll = true,
}: {
  title: string;
  children: ReactNode;
  headerRight?: () => ReactNode;
  compact?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pagePadding = width < 380 ? Spacing.three : Spacing.four;
  return (
    <>
      <Drawer.Screen
        options={{
          title,
          headerShown: true,
          ...(headerRight ? { headerRight } : {}),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: "600" },
          sceneStyle: { backgroundColor: colors.background },
        }}
      />
      {!scroll ? (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {children}
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
          contentContainerStyle={{
            width: "100%",
            maxWidth: Layout.formWidth,
            alignSelf: "center",
            padding: pagePadding,
            paddingLeft: pagePadding + insets.left,
            paddingRight: pagePadding + insets.right,
            paddingBottom: Spacing.four + insets.bottom,
            gap: compact ? Spacing.three : Spacing.four,
          }}
        >
          {children}
        </ScrollView>
      )}
    </>
  );
}

import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { AccountDrawer } from "@/features/home/account-drawer";
import { AccountMenu } from "@/features/home/account-menu";
import { useTheme } from "@/hooks/use-theme";
import { Layout, Spacing } from "@/constants/theme";

function Navigation() {
  const { profile } = useAuth();
  const colors = useTheme();
  return (
    <Drawer
      drawerContent={(props) => <AccountDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        headerLeft: () => null,
        // undefined restores Drawer’s default hamburger, even on public screens.
        headerRight: () => (profile ? <AccountMenu /> : null),
        headerRightContainerStyle: { paddingRight: Spacing.two },
        drawerPosition: "right",
        drawerType: "front",
        swipeEnabled: !!profile,
        drawerStyle: {
          width: Layout.drawerWidth,
          maxWidth: "88%",
          backgroundColor: colors.background,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="index" />
      <Drawer.Protected guard={!!profile}>
        <Drawer.Screen name="perfil" />
        <Drawer.Screen name="sesiones" />
        <Drawer.Screen name="invitaciones" />
        <Drawer.Protected
          guard={
            !!profile?.memberships.some((member) => member.role === "OWNER")
          }
        >
          <Drawer.Screen name="equipo" />
        </Drawer.Protected>
      </Drawer.Protected>
      <Drawer.Protected guard={!profile}>
        <Drawer.Screen name="registro" />
        <Drawer.Screen name="recuperar" />
      </Drawer.Protected>
      <Drawer.Protected guard={false}>
        <Drawer.Screen name="explore" />
      </Drawer.Protected>
    </Drawer>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Navigation />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}

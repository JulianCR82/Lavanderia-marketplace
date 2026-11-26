import { router } from "expo-router";
import { View } from "react-native";
import { Screen } from "@/components/screen";
import { ThemedText as Text } from "@/components/themed-text";
import {
  IconBadge,
  NavigationRow,
  ScreenHeading,
  Section,
} from "@/components/product-ui";
import { Shape, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/features/auth/auth-context";
import { AccountMenu } from "./account-menu";

export default function HomeScreen() {
  const { profile } = useAuth();
  const colors = useTheme();
  const name = profile?.displayName;
  const isCustomer =
    profile?.platformRole === "CUSTOMER" && profile.accountKind === "CUSTOMER";
  return (
    <Screen title="Lavandería" headerRight={() => <AccountMenu />}>
      <View style={{ gap: Spacing.three }}>
        <Text type="smallBold" themeColor="secondary">
          Lavandería · Bogotá
        </Text>
        <ScreenHeading
          title={name ? `Hola, ${name}` : "Qué bueno verte"}
          description={
            isCustomer
              ? "Tu ropa y tu tiempo merecen un buen cuidado."
              : "Tu espacio de trabajo en la lavandería."
          }
        />
      </View>
      <Section title="Tu cuenta">
        <NavigationRow
          icon="person"
          title={name ? "Mi perfil" : "Completa tu perfil"}
          subtitle="Consulta y actualiza tus datos"
          onPress={() => router.push("/perfil")}
        />
        <NavigationRow
          icon="shield"
          title="Sesiones activas"
          subtitle="Controla los accesos a tu cuenta"
          onPress={() => router.push("/sesiones")}
        />
      </Section>
      <View
        style={{
          padding: Spacing.four,
          gap: Spacing.three,
          borderRadius: Shape.card,
          backgroundColor: colors.backgroundSelected,
        }}
      >
        <IconBadge icon="laundry" />
        <View style={{ gap: Spacing.two }}>
          <Text type="caption" themeColor="secondary">
            PRÓXIMAMENTE
          </Text>
          <Text type="subtitle">
            {isCustomer
              ? "Más tiempo para ti"
              : "Tu operación, en un solo lugar"}
          </Text>
          <Text type="small" themeColor="textSecondary">
            {isCustomer
              ? "Estamos preparando la consulta de lavanderías y la solicitud de pedidos. Te mostraremos esos servicios cuando estén disponibles."
              : "Aquí encontrarás las funciones de trabajo que tu lavandería te autorice cuando estén disponibles. Esta cuenta no tiene funciones de cliente."}
          </Text>
        </View>
      </View>
      {!!profile?.memberships.length && (
        <Section title="Tus lavanderías" surface>
          {profile.memberships.map((member) => (
            <View key={member.laundryId} style={{ gap: Spacing.one }}>
              <Text type="headline">{member.laundryName}</Text>
              <Text type="small" themeColor="textSecondary">
                Consulta tus permisos desde Mi perfil.
              </Text>
            </View>
          ))}
        </Section>
      )}
    </Screen>
  );
}

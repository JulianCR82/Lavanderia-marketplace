import { useRef, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { Spacing } from "@/constants/theme";
import { ActionButton } from "@/components/action-button";
import { ThemedText as Text } from "@/components/themed-text";
import {
  DetailRow,
  NavigationRow,
  Notice,
  Section,
} from "@/components/product-ui";
import { useAuth } from "./auth-context";

const roleNames = {
  OWNER: "Propietario",
  STAFF: "Staff",
};

/** Roles remain informative; the backend authorizes every access. */
export default function AccountDetails() {
  const auth = useAuth();
  const profile = auth.profile!;
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos completar la solicitud.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: Spacing.four }}>
      <Section title="Seguridad">
        <NavigationRow
          icon="shield"
          title="Sesiones activas"
          subtitle="Revisa dónde has iniciado sesión"
          disabled={busy}
          onPress={() => router.push("/sesiones")}
        />
      </Section>
      <Section title="Acceso y lavanderías" surface>
        <DetailRow
          label="Tipo de cuenta"
          value={
            profile.platformRole === "PLATFORM_ADMIN"
              ? "Administrador de plataforma"
              : profile.accountKind === "LAUNDRY"
                ? "Trabajo en lavandería"
                : "Cliente"
          }
        />
        {__DEV__ && profile.platformRole === "PLATFORM_ADMIN" && (
          <ActionButton
            label="Comprobar acceso de administración"
            variant="text"
            disabled={busy}
            onPress={() => {
              void run(async () => {
                await auth.request("/platform/access");
                setMessage("Acceso de administración confirmado.");
              });
            }}
          />
        )}
        {profile.memberships.map((member) => (
          <View key={member.laundryId} style={{ gap: Spacing.two }}>
            <Text type="headline" accessibilityRole="header">
              {member.laundryName}
            </Text>
            <Text type="small" themeColor="textSecondary">
              {roleNames[member.role]}
            </Text>
            {__DEV__ && (
              <ActionButton
                label="Comprobar acceso a esta lavandería"
                variant="text"
                disabled={busy}
                onPress={() => {
                  void run(async () => {
                    await auth.request(`/laundries/${member.laundryId}/access`);
                    setMessage(`Acceso confirmado a ${member.laundryName}.`);
                  });
                }}
              />
            )}
          </View>
        ))}
        {!profile.memberships.length && (
          <Text type="small" themeColor="textSecondary">
            No tienes lavanderías asociadas.
          </Text>
        )}
      </Section>
      {profile.platformRole !== "PLATFORM_ADMIN" && (
        <NavigationRow
          icon="mail"
          title="Invitaciones de trabajo"
          subtitle="Revisa invitaciones para incorporarte como staff"
          onPress={() => router.push("/invitaciones")}
        />
      )}
      {profile.memberships.some((member) => member.role === "OWNER") && (
        <NavigationRow
          icon="person"
          title="Equipo de mi lavandería"
          subtitle="Invita staff y administra las invitaciones"
          onPress={() => router.push("/equipo")}
        />
      )}
      {!!message && <Notice message={message} tone="success" />}
      {!!error && <Notice message={error} tone="danger" />}
      <ActionButton
        label="Cerrar sesión"
        variant="outlined"
        tone="danger"
        loading={busy}
        onPress={() => {
          void run(auth.logout);
        }}
      />
    </View>
  );
}

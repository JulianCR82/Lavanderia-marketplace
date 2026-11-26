import { useRef, useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/screen";
import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import { ThemedText as Text } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  DetailRow,
  Notice,
  ScreenHeading,
  Section,
} from "@/components/product-ui";
import { useAuth } from "@/features/auth/auth-context";
import AccountDetails from "@/features/auth/account-details";

/** US-001.04: preserve the draft on failure; only the server confirms a save. */
export default function ProfileScreen() {
  const auth = useAuth();
  const profile = auth.profile!;
  const [name, setName] = useState(profile.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  const normalized = name.normalize("NFC").trim();
  const changed = normalized !== (profile.displayName ?? "");

  async function save() {
    if (locked.current || !changed) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await auth.updateProfile(normalized);
      setName(saved.displayName ?? "");
      setMessage("Tu perfil se guardó correctamente.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos guardar tu perfil.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen title="Mi perfil">
      <ScreenHeading
        title="Tu perfil"
        description="Tus datos, siempre a mano."
        icon="person"
      />
      <Section title="Información personal" surface>
        <FormField
          label="Nombre para mostrar (opcional)"
          value={name}
          maxLength={80}
          autoCapitalize="words"
          autoComplete="name"
          editable={!busy}
          returnKeyType="done"
          onSubmitEditing={() => {
            void save();
          }}
          onChangeText={(value) => {
            setName(value);
            setMessage("");
            setError("");
          }}
        />
        <Text type="small" themeColor="textSecondary">
          Hasta 80 caracteres. Puedes dejarlo vacío para quitar tu nombre.
        </Text>
        <View style={{ gap: Spacing.two }}>
          <DetailRow
            label="Correo electrónico"
            value={profile.email ?? "Sin correo disponible"}
          />
          <Text type="small" themeColor="textSecondary">
            Tu correo de acceso es de solo lectura.
          </Text>
        </View>
      </Section>
      {!!error && <Notice tone="danger" message={error} />}
      {!!message && <Notice tone="success" message={message} />}
      <ActionButton
        label="Guardar cambios"
        disabled={!changed}
        loading={busy}
        onPress={() => {
          void save();
        }}
      />
      <AccountDetails />
    </Screen>
  );
}

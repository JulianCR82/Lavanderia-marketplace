import { useRef, useState } from "react";
import { router } from "expo-router";
import { Platform, View } from "react-native";
import { Spacing } from "@/constants/theme";
import { Screen } from "@/components/screen";
import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { ThemedText } from "@/components/themed-text";
import { Notice, ScreenHeading } from "@/components/product-ui";
import { apiRequest } from "@/lib/api";
import { useAuth } from "./auth-context";
import { SessionGrant, Provider } from "./auth.types";
import { federatedLogin } from "./provider-proof";
import { SocialButtons } from "./social-buttons";

export default function AuthScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function run(action: () => Promise<SessionGrant | null>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const grant = await action();
      if (grant) await auth.complete(grant);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos iniciar sesión.",
      );
    } finally {
      setBusy(false);
      locked.current = false;
    }
  }
  function login() {
    const secret = password;
    setPassword("");
    setVisible(false);
    void run(() =>
      apiRequest<SessionGrant>("/auth/login", { email, password: secret }),
    );
  }
  return (
    <Screen title="Ingresar" compact>
      <View style={{ gap: Spacing.three }}>
        <ThemedText type="smallBold" themeColor="secondary">
          Lavandería · Bogotá
        </ThemedText>
        <ScreenHeading
          title="Qué bueno verte"
          description="Ingresa y ten tu cuenta siempre a mano."
          icon="laundry"
        />
      </View>
      <View style={{ gap: Spacing.three }}>
        <FormField
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          maxLength={254}
          editable={!busy}
        />
        <PasswordField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          visible={visible}
          onVisibilityChange={setVisible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (!busy && email.trim() && password) login();
          }}
        />
        {!!error && <Notice tone="danger" message={error} />}
        <ActionButton
          label="Ingresar"
          loading={busy}
          disabled={!email.trim() || !password}
          onPress={login}
        />
      </View>
      {Platform.OS !== "web" && (
        <View style={{ gap: Spacing.two }}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={{ textAlign: "center" }}
          >
            O continúa con
          </ThemedText>
          <SocialButtons
            busy={busy}
            onPress={(provider: Provider) => {
              setPassword("");
              setVisible(false);
              void run(() => federatedLogin(provider));
            }}
          />
        </View>
      )}
      <View style={{ gap: Spacing.one }}>
        <ActionButton
          label="Olvidé mi contraseña"
          variant="text"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => {
            setPassword("");
            setVisible(false);
            router.push("/recuperar");
          }}
        />
        <ActionButton
          label="Crear cuenta"
          variant="text"
          style={{ flex: 1 }}
          disabled={busy}
          onPress={() => {
            setPassword("");
            setVisible(false);
            router.push("/registro");
          }}
        />
      </View>
    </Screen>
  );
}

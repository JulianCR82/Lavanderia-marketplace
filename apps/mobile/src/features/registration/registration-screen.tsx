import { useState } from "react";
import { ActivityIndicator } from "react-native";
import { Screen } from "@/components/screen";
import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import { ThemedText as Text } from "@/components/themed-text";
import { PasswordField } from "@/components/password-field";
import { Notice, ScreenHeading } from "@/components/product-ui";
import { useTheme } from "@/hooks/use-theme";
import { useRegistration } from "./use-registration";

/** US-001.01/.02: confirmed registration opens the same opaque session as login. */
export default function RegistrationScreen({
  onBack,
}: {
  onBack?: () => void;
}) {
  const colors = useTheme();
  const flow = useRegistration();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const text = { color: colors.text };
  const passwordLength = Array.from(password).length;

  function action(
    label: string,
    onPress: () => void,
    disabled = false,
    secondary = false,
  ) {
    return (
      <ActionButton
        label={label}
        onPress={onPress}
        disabled={disabled || flow.busy}
        variant={secondary ? "outlined" : "filled"}
      />
    );
  }

  return (
    <Screen
      title={
        flow.created
          ? "Tu cuenta está lista"
          : flow.pending
            ? "Verifica tu correo"
            : "Crear cuenta"
      }
    >
      <ScreenHeading
        title={
          flow.created
            ? "Todo listo"
            : flow.pending
              ? "Revisa tu correo"
              : "Tu ropa, en buenas manos"
        }
        description={
          flow.pending
            ? "Solo falta verificar que este correo es tuyo."
            : flow.created
              ? "Tu cuenta ya está creada."
              : "Crea tu cuenta para comenzar."
        }
        icon={flow.pending ? "mail" : flow.created ? "check" : "person"}
      />
      {flow.created ? (
        <Text style={text}>
          Tu correo está verificado y tu cuenta fue creada. Si no pudimos abrir
          tu sesión, vuelve a ingresar.
        </Text>
      ) : flow.pending ? (
        <>
          <Text style={text}>
            Enviamos un código de 6 dígitos a {email.trim().toLowerCase()}.
            Revisa también la carpeta de correo no deseado.
          </Text>
          <FormField
            label="Código de verificación"
            accessibilityLabel="Código de verificación de 6 dígitos"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!flow.busy}
          />
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: flow.expired ? colors.warning : colors.textSecondary,
            }}
          >
            {flow.expired
              ? "El código venció. Solicita uno nuevo."
              : "El código vence en 10 minutos. Tienes hasta 5 intentos."}
          </Text>
          {action(
            "Verificar correo",
            () => {
              void flow.verify(code);
              setCode("");
            },
            !/^\d{6}$/.test(code) || flow.expired,
          )}
          {action(
            flow.cooldown
              ? `Reenviar en ${flow.cooldown} s`
              : "Reenviar código",
            () => {
              setCode("");
              void flow.resend();
            },
            flow.cooldown > 0,
            true,
          )}
          {action(
            "Usar otro correo o reiniciar",
            () => {
              setCode("");
              flow.reset();
            },
            false,
            true,
          )}
        </>
      ) : (
        <>
          <Text themeColor="textSecondary">
            Regístrate para identificar tus pedidos. Primero verificaremos tu
            correo.
          </Text>
          <FormField
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
            editable={!flow.busy}
          />
          <PasswordField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            visible={visible}
            onVisibilityChange={setVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!flow.busy}
          />
          <Text type="small" style={{ color: colors.textSecondary }}>
            Entre 15 y 128 caracteres. Puedes usar espacios, pegar una
            contraseña o usar tu gestor.
          </Text>
          {action(
            flow.cooldown ? `Intenta en ${flow.cooldown} s` : "Enviar código",
            () => {
              void flow.start(email, password);
              setPassword("");
              setVisible(false);
            },
            !email.trim() ||
              passwordLength < 15 ||
              passwordLength > 128 ||
              flow.cooldown > 0,
          )}
        </>
      )}
      {flow.busy && (
        <ActivityIndicator
          accessibilityLabel="Procesando solicitud"
          color={colors.primary}
        />
      )}
      {!!flow.error && <Notice tone="danger" message={flow.error} />}
      {!!onBack && action("Volver a ingresar", onBack, flow.busy, true)}
    </Screen>
  );
}

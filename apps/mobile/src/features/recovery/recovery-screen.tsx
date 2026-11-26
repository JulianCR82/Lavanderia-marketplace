import { useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/screen";
import { FormField } from "@/components/form-field";
import { PasswordField } from "@/components/password-field";
import { Notice, ScreenHeading } from "@/components/product-ui";
import { ActionButton } from "@/components/action-button";
import { ThemedText as Text } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useRecovery } from "./use-recovery";

export default function RecoveryScreen({ onBack }: { onBack: () => void }) {
  const flow = useRecovery();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const step = flow.state.step;
  const clearSecrets = () => {
    setCode("");
    setPassword("");
    setConfirmation("");
    setVisible(false);
  };
  const restart = () => {
    clearSecrets();
    flow.restart();
  };
  const passwordValid =
    Array.from(password).length >= 15 &&
    Array.from(password).length <= 128 &&
    password === confirmation;
  return (
    <Screen
      title={step === "done" ? "Contraseña actualizada" : "Recuperar acceso"}
    >
      <ScreenHeading
        title={
          step === "done"
            ? "Vuelve a tu cuenta"
            : step === "password"
              ? "Una nueva contraseña"
              : step === "code"
                ? "Revisa tu correo"
                : "Recupera tu acceso"
        }
        description={
          step === "email" ? "Te ayudamos a volver a ingresar." : undefined
        }
        icon={step === "done" ? "check" : step === "code" ? "mail" : "lock"}
      />
      {step === "email" && (
        <>
          <Text>Te enviaremos un código para restablecer tu contraseña.</Text>
          <FormField
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            maxLength={254}
            editable={!flow.busy}
            returnKeyType="send"
            onSubmitEditing={() => {
              if (email.trim() && !flow.busy && !flow.cooldown)
                void flow.request(email.trim().toLowerCase());
            }}
          />
          <ActionButton
            label={
              flow.cooldown ? `Espera ${flow.cooldown} s` : "Enviar código"
            }
            loading={flow.busy}
            disabled={!email.trim() || flow.cooldown > 0}
            onPress={() => {
              void flow.request(email.trim().toLowerCase());
            }}
          />
          <Text themeColor="textSecondary">
            Si usas Google, puedes continuar con Google desde el ingreso. Este
            proceso restablece contraseñas existentes.
          </Text>
        </>
      )}
      {flow.state.step === "code" && (
        <>
          <Text selectable accessibilityLiveRegion="polite">
            {flow.state.pending.message}
          </Text>
          <Text themeColor="textSecondary">
            Revisa también spam. El proceso vence 10 minutos después de la
            primera solicitud; reenviar no amplía ese plazo.
          </Text>
          <FormField
            label="Código de recuperación"
            value={code}
            onChangeText={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            editable={!flow.busy && !flow.expired}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (code.length === 6 && !flow.busy && !flow.expired) {
                const proof = code;
                setCode("");
                void flow.verify(proof);
              }
            }}
          />
          <ActionButton
            label="Verificar código"
            loading={flow.busy}
            disabled={code.length !== 6 || flow.expired}
            onPress={() => {
              const proof = code;
              setCode("");
              void flow.verify(proof);
            }}
          />
          <ActionButton
            label={
              flow.cooldown
                ? `Reenviar en ${flow.cooldown} s`
                : "Reenviar código"
            }
            variant="outlined"
            disabled={flow.busy || flow.expired || flow.cooldown > 0}
            onPress={() => {
              setCode("");
              void flow.resend();
            }}
          />
          <ActionButton
            label="Usar otro correo o iniciar de nuevo"
            variant="text"
            disabled={flow.busy}
            onPress={restart}
          />
        </>
      )}
      {step === "password" && (
        <>
          <Text>
            Elige una contraseña nueva. Al guardarla, se cerrarán todas las
            sesiones de tu cuenta.
          </Text>
          <View style={{ gap: Spacing.three }}>
            <PasswordField
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              visible={visible}
              onVisibilityChange={setVisible}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={256}
              editable={!flow.busy && !flow.expired}
            />
            <PasswordField
              label="Confirmar contraseña"
              value={confirmation}
              onChangeText={setConfirmation}
              visible={visible}
              onVisibilityChange={setVisible}
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={256}
              editable={!flow.busy && !flow.expired}
            />
            <Text themeColor="textSecondary">
              Entre 15 y 128 caracteres. Puedes usar espacios y un gestor de
              contraseñas.
            </Text>
            {!!confirmation && password !== confirmation && (
              <Text themeColor="danger" accessibilityLiveRegion="polite">
                Las contraseñas no coinciden.
              </Text>
            )}
            <ActionButton
              label="Guardar contraseña"
              loading={flow.busy}
              disabled={!passwordValid || flow.expired}
              onPress={() => {
                const secret = password,
                  repeated = confirmation;
                clearSecrets();
                void flow.reset(secret, repeated);
              }}
            />
          </View>
        </>
      )}
      {step === "done" && (
        <Text accessibilityLiveRegion="polite">
          Tu contraseña fue actualizada y tus sesiones anteriores se cerraron.
          Inicia sesión con tu nueva contraseña.
        </Text>
      )}
      {flow.expired && (
        <>
          <Text themeColor="danger" accessibilityLiveRegion="polite">
            Este paso venció. Inicia una nueva recuperación.
          </Text>
          <ActionButton
            label="Iniciar nueva recuperación"
            disabled={flow.busy}
            onPress={restart}
          />
        </>
      )}
      {!!flow.error && <Notice tone="danger" message={flow.error} />}
      {step !== "done" && (
        <Text themeColor="textSecondary">
          Si perdiste acceso al correo, usa un método ya vinculado o recupera
          primero tu correo con su proveedor. Nunca compartas códigos ni
          contraseñas.
        </Text>
      )}
      <ActionButton
        label={step === "done" ? "Ir a iniciar sesión" : "Volver al ingreso"}
        variant="outlined"
        disabled={flow.busy}
        onPress={() => {
          clearSecrets();
          onBack();
        }}
      />
    </Screen>
  );
}

import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { BottomSheet, RNHostView } from "@expo/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/screen";
import { ActionButton } from "@/components/action-button";
import {
  DetailRow,
  IconBadge,
  NavigationRow,
  Notice,
  ScreenHeading,
  Section,
} from "@/components/product-ui";
import { ThemedText as Text } from "@/components/themed-text";
import { Layout, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/features/auth/auth-context";
import type { ActiveSession, SessionsPage } from "./session.types";

const platformNames = {
  android: "Android",
  ios: "iPhone o iPad",
  web: "Navegador web",
};
const sessionName = (session: ActiveSession) =>
  session.platform
    ? platformNames[session.platform]
    : "Sesión sin información de plataforma";
const date = (value: string) =>
  new Date(value).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function SessionsScreen() {
  const auth = useAuth();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const pagePadding = width < 380 ? Spacing.three : Spacing.four;
  const sheetMaxHeight = Math.max(
    Layout.minimumTouchTarget,
    height - insets.top - insets.bottom - Spacing.six,
  );
  const [data, setData] = useState<SessionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<ActiveSession | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [closeError, setCloseError] = useState("");
  const generation = useRef(0);
  const mounted = useRef(true);
  const mutation = useRef(false);
  const loadingMore = useRef(false);
  const { request } = auth;

  const load = useCallback(async () => {
    const version = ++generation.current;
    setRefreshing(true);
    setError("");
    try {
      const page = await request<SessionsPage>("/auth/sessions");
      if (mounted.current && generation.current === version) setData(page);
    } catch (cause) {
      if (mounted.current && generation.current === version)
        setError(
          cause instanceof Error
            ? cause.message
            : "No pudimos cargar tus sesiones.",
        );
    } finally {
      if (mounted.current && generation.current === version) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [request]);

  useFocusEffect(
    useCallback(() => {
      mounted.current = true;
      void load();
      return () => {
        mounted.current = false;
        generation.current += 1;
      };
    }, [load]),
  );

  async function loadMore() {
    if (
      !data?.nextCursor ||
      loadingMore.current ||
      refreshing ||
      mutation.current
    )
      return;
    loadingMore.current = true;
    setMore(true);
    setError("");
    const version = generation.current;
    try {
      const page = await request<SessionsPage>(
        `/auth/sessions?cursor=${encodeURIComponent(data.nextCursor)}`,
      );
      if (mounted.current && version === generation.current)
        setData((current) =>
          current
            ? {
                ...page,
                sessions: [
                  ...current.sessions,
                  ...page.sessions.filter(
                    (item) =>
                      !current.sessions.some(
                        (existing) => existing.id === item.id,
                      ),
                  ),
                ],
              }
            : page,
        );
    } catch (cause) {
      if (mounted.current && version === generation.current)
        setError(
          cause instanceof Error
            ? cause.message
            : "No pudimos cargar más sesiones.",
        );
    } finally {
      loadingMore.current = false;
      if (mounted.current) setMore(false);
    }
  }

  function open(session: ActiveSession) {
    setMessage("");
    setSelected(session);
    setConfirming(false);
    setCloseError("");
  }
  async function revoke() {
    if (!selected || mutation.current) return;
    mutation.current = true;
    setBusy(true);
    setCloseError("");
    const target = selected;
    // Ignore earlier list responses so a successful close cannot reappear locally.
    generation.current += 1;
    try {
      await auth.revokeSession(target.id, target.isCurrent);
      if (!mounted.current) return;
      setSelected(null);
      setMessage("La sesión se cerró correctamente.");
      setData((current) =>
        current
          ? {
              ...current,
              sessions: current.sessions.filter(
                (item) => item.id !== target.id,
              ),
            }
          : null,
      );
      if (!target.isCurrent) await load();
    } catch (cause) {
      if (mounted.current) {
        const reason =
          cause instanceof Error
            ? cause.message
            : "No pudimos confirmar el cierre. Intenta de nuevo.";
        setCloseError(reason);
        setError(reason);
      }
    } finally {
      mutation.current = false;
      if (mounted.current) {
        setBusy(false);
        setRefreshing(false);
      }
    }
  }
  const row = (session: ActiveSession) => (
    <NavigationRow
      icon={
        session.platform === "web"
          ? "browser"
          : session.platform
            ? "phone"
            : "shield"
      }
      title={sessionName(session)}
      badge={session.isCurrent ? "Esta sesión" : undefined}
      subtitle={`Inicio: ${date(session.createdAt)}`}
      selected={session.isCurrent}
      disabled={busy}
      onPress={() => open(session)}
    />
  );
  return (
    <Screen title="Seguridad" scroll={false}>
      <FlatList
        data={data?.sessions ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => row(item)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          width: "100%",
          maxWidth: Layout.formWidth,
          alignSelf: "center",
          padding: pagePadding,
          paddingLeft: pagePadding + insets.left,
          paddingRight: pagePadding + insets.right,
          paddingBottom: Spacing.four + insets.bottom,
          gap: Spacing.two,
        }}
        refreshing={refreshing && !loading}
        onRefresh={() => {
          if (!mutation.current) void load();
        }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.four, marginBottom: Spacing.two }}>
            <ScreenHeading
              title="Sesiones activas"
              description="Gestiona los accesos a tu cuenta."
            />
            {Platform.OS === "web" && (
              <ActionButton
                label="Actualizar sesiones"
                variant="text"
                disabled={refreshing || busy}
                onPress={() => {
                  void load();
                }}
              />
            )}
            {!!message && <Notice message={message} tone="success" />}
            {!!error && (
              <View style={{ gap: Spacing.two }}>
                <Notice message={error} tone="danger" />
                <ActionButton
                  label="Volver a intentar"
                  variant="text"
                  onPress={() => {
                    void load();
                  }}
                  disabled={refreshing || busy}
                />
              </View>
            )}
            {loading && (
              <ActivityIndicator
                color={colors.primary}
                accessibilityLabel="Cargando sesiones"
              />
            )}
            {!!data && (
              <>
                <Section title="Tu sesión actual">
                  {row(data.currentSession)}
                </Section>
                <Text type="smallBold" accessibilityRole="header">
                  Otros accesos
                </Text>
              </>
            )}
          </View>
        }
        ListEmptyComponent={
          !loading && !error && data ? (
            <Text type="small" themeColor="textSecondary">
              No tienes otras sesiones activas.
            </Text>
          ) : undefined
        }
        ListFooterComponent={
          <View style={{ gap: Spacing.three, marginTop: Spacing.four }}>
            {!!data?.nextCursor && (
              <ActionButton
                label="Ver más sesiones"
                variant="outlined"
                loading={more}
                disabled={refreshing || busy}
                onPress={() => {
                  void loadMore();
                }}
              />
            )}
            <Notice message="Si no reconoces un acceso, ábrelo y cierra esa sesión." />
            <Text type="caption" themeColor="textSecondary">
              Un dispositivo puede tener varias sesiones. Fechas en hora de
              Bogotá.
            </Text>
          </View>
        }
      />
      <BottomSheet
        snapPoints={["full"]}
        isPresented={!!selected}
        onDismiss={() => setSelected(null)}
        containerColor={colors.backgroundElement}
        contentPadding={{
          top: Spacing.three,
          left: pagePadding,
          right: pagePadding,
          bottom: Spacing.three,
        }}
        shouldDismissOnBackPress={!busy}
        shouldDismissOnClickOutside={!busy}
      >
        <RNHostView matchContents={{ vertical: true }}>
          <ScrollView
            style={{ maxHeight: sheetMaxHeight }}
            contentContainerStyle={{
              gap: Spacing.three,
              paddingBottom: insets.bottom,
              width: "100%",
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {selected && (
              <View style={{ gap: Spacing.three, width: "100%", minWidth: 0 }}>
                <IconBadge icon="shield" selected />
                <Text type="subtitle" accessibilityRole="header">
                  {confirming ? "¿Cerrar esta sesión?" : sessionName(selected)}
                </Text>
                <Text type="small" themeColor="textSecondary">
                  {confirming
                    ? "Se necesitará un nuevo ingreso para volver a usar este acceso."
                    : selected.isCurrent
                      ? "Estás usando esta sesión ahora."
                      : "Detalles de este acceso."}
                </Text>
                {!confirming && (
                  <Section surface>
                    <DetailRow
                      label="Inicio de sesión"
                      value={date(selected.createdAt)}
                    />
                    <DetailRow
                      label="Vencimiento"
                      value={date(selected.expiresAt)}
                    />
                  </Section>
                )}
                <Text type="small" themeColor="textSecondary">
                  {selected.isCurrent
                    ? "Saldrás de tu cuenta en esta app."
                    : "Tu sesión actual permanecerá abierta."}
                </Text>
                {!!closeError && <Notice tone="danger" message={closeError} />}
                <ActionButton
                  label={
                    confirming ? "Sí, cerrar sesión" : "Cerrar esta sesión"
                  }
                  tone="danger"
                  loading={busy}
                  onPress={() => {
                    if (confirming) void revoke();
                    else setConfirming(true);
                  }}
                />
                <ActionButton
                  label={confirming ? "Cancelar" : "Volver"}
                  variant="text"
                  disabled={busy}
                  onPress={() => {
                    if (confirming) {
                      setConfirming(false);
                      setCloseError("");
                    } else setSelected(null);
                  }}
                />
              </View>
            )}
          </ScrollView>
        </RNHostView>
      </BottomSheet>
    </Screen>
  );
}

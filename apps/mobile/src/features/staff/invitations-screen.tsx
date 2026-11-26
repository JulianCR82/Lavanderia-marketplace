import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "@/components/screen";
import { ThemedText as Text } from "@/components/themed-text";
import { ActionButton } from "@/components/action-button";
import { FormField } from "@/components/form-field";
import { Notice, ScreenHeading, Section } from "@/components/product-ui";
import { Layout, Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/auth-context";
import type { SessionGrant } from "@/features/auth/auth.types";

interface Invitation {
  id: string;
  laundryId: string;
  laundryName: string;
  email: string;
  deliveryStatus: "PENDING" | "SENT" | "FAILED";
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
}
interface Page {
  items: Invitation[];
  nextCursor: string | null;
}

export default function InvitationsScreen({
  team = false,
}: {
  team?: boolean;
}) {
  const auth = useAuth();
  const insets = useSafeAreaInsets();
  const owners =
    auth.profile?.memberships.filter((member) => member.role === "OWNER") ?? [];
  const [laundryId, setLaundryId] = useState(owners[0]?.laundryId ?? "");
  const [email, setEmail] = useState("");
  const [page, setPage] = useState<Page | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const locked = useRef(false);
  const generation = useRef(0);
  const request = auth.request;
  const path = team
    ? `/laundries/${laundryId}/staff-invitations`
    : "/staff/invitations";
  const load = useCallback(
    async (cursor?: string) => {
      if (team && !laundryId) return;
      const version = ++generation.current;
      setLoading(true);
      setError("");
      try {
        const result = await request<Page>(
          `${path}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
        );
        if (generation.current !== version) return;
        setCheckedAt(Date.now());
        setPage((current) =>
          cursor && current
            ? { ...result, items: [...current.items, ...result.items] }
            : result,
        );
      } catch (cause) {
        if (generation.current === version)
          setError(
            cause instanceof Error
              ? cause.message
              : "No pudimos consultar las invitaciones.",
          );
      } finally {
        if (generation.current === version) setLoading(false);
      }
    },
    [request, path, team, laundryId],
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => {
      clearTimeout(timer);
      generation.current += 1;
    };
  }, [load]);

  async function run(action: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
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
  async function invite(address = email) {
    await run(async () => {
      try {
        await request(path, { email: address });
        setEmail("");
        setMessage(
          "Invitación enviada. La persona debe aceptarla para obtener acceso.",
        );
      } finally {
        await load();
      }
    });
  }
  async function accept(id: string) {
    await run(async () => {
      const grant = await request<SessionGrant>(
        `/staff/invitations/${id}/accept`,
        { confirm: true },
      );
      await auth.complete(grant);
      setConfirm(null);
      setMessage(
        "Ya tienes acceso como Staff. Tu cuenta es ahora de trabajo y sus sesiones anteriores se cerraron.",
      );
      await load();
    });
  }
  const status = (item: Invitation) =>
    item.cancelledAt
      ? "Cancelada"
      : item.acceptedAt
        ? "Aceptada"
        : new Date(item.expiresAt).getTime() <= checkedAt
          ? "Vencida"
          : item.deliveryStatus === "FAILED"
            ? "Envío fallido"
            : item.deliveryStatus === "PENDING"
              ? "Enviando"
              : "Pendiente de aceptación";
  return (
    <Screen
      title={team ? "Equipo e invitaciones" : "Invitaciones de trabajo"}
      scroll={false}
    >
      <FlatList
        data={page?.items ?? []}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          width: "100%",
          maxWidth: Layout.formWidth,
          alignSelf: "center",
          padding: Spacing.four,
          paddingBottom: Spacing.four + insets.bottom,
          paddingLeft: Spacing.four + insets.left,
          paddingRight: Spacing.four + insets.right,
          gap: Spacing.four,
        }}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={() => {
          if (!busy) void load();
        }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.four }}>
            <ScreenHeading
              title={
                team ? "Tu equipo empieza aquí" : "Trabaja con una lavandería"
              }
              description={
                team
                  ? "Solo tú, como propietario, puedes invitar staff a tu lavandería."
                  : "Las invitaciones corresponden al correo de tu cuenta. Revísalas antes de aceptar."
              }
              icon="mail"
            />
            {team && (
              <Section title="Invitar staff">
                {owners.map((owner) => (
                  <ActionButton
                    key={owner.laundryId}
                    label={owner.laundryName}
                    variant={
                      owner.laundryId === laundryId ? "outlined" : "text"
                    }
                    disabled={busy || loading}
                    onPress={() => {
                      setMessage("");
                      setPage(null);
                      setConfirm(null);
                      setLaundryId(owner.laundryId);
                    }}
                  />
                ))}
                <FormField
                  label="Correo de la persona"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  maxLength={254}
                  editable={!busy}
                />
                <ActionButton
                  label="Enviar invitación"
                  disabled={!email.trim() || !laundryId || busy}
                  loading={busy}
                  onPress={() => {
                    void invite();
                  }}
                />
              </Section>
            )}
            {!!message && <Notice message={message} tone="success" />}
            {!!error && <Notice message={error} tone="danger" />}
            <ActionButton
              label={loading ? "Actualizando…" : "Actualizar invitaciones"}
              variant="text"
              disabled={loading || busy}
              onPress={() => {
                void load();
              }}
            />
          </View>
        }
        ListEmptyComponent={
          !loading && page ? (
            <Notice
              message={
                team
                  ? "Todavía no hay invitaciones en esta lavandería."
                  : "No tienes invitaciones de trabajo pendientes."
              }
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <Section title={item.laundryName} surface>
            <Text>{team ? item.email : "Rol ofrecido: Staff"}</Text>
            <Text type="small">
              {status(item)} · Vence{" "}
              {new Date(item.expiresAt).toLocaleString("es-CO", {
                timeZone: "America/Bogota",
              })}
            </Text>
            {!team &&
              (confirm === item.id ? (
                <>
                  <Notice
                    tone="warning"
                    message={
                      auth.profile?.accountKind === "CUSTOMER"
                        ? "Al aceptar, esta cuenta dejará de tener funciones de cliente. Conservarás tu correo y datos, pasarás a trabajar como Staff y se cerrarán tus sesiones anteriores. Este cambio no se revierte desde la app."
                        : "Al aceptar tendrás acceso como Staff a esta lavandería y se cerrarán tus sesiones anteriores."
                    }
                  />
                  <ActionButton
                    label={
                      auth.profile?.accountKind === "CUSTOMER"
                        ? "Aceptar y convertir mi cuenta en Staff"
                        : "Confirmar incorporación como Staff"
                    }
                    disabled={busy}
                    loading={busy}
                    onPress={() => {
                      void accept(item.id);
                    }}
                  />
                  <ActionButton
                    label="Volver sin aceptar"
                    variant="text"
                    disabled={busy}
                    onPress={() => setConfirm(null)}
                  />
                </>
              ) : (
                <ActionButton
                  label="Revisar invitación"
                  disabled={busy}
                  onPress={() => setConfirm(item.id)}
                />
              ))}
            {team && !item.acceptedAt && !item.cancelledAt && (
              <>
                {item.deliveryStatus !== "SENT" && (
                  <ActionButton
                    label="Reintentar envío"
                    disabled={busy}
                    onPress={() => {
                      void invite(item.email);
                    }}
                  />
                )}
                <ActionButton
                  label="Cancelar invitación"
                  tone="danger"
                  variant="text"
                  disabled={busy}
                  onPress={() => {
                    void run(async () => {
                      await request(`${path}/${item.id}`, undefined, "DELETE");
                      setMessage("Invitación cancelada.");
                      await load();
                    });
                  }}
                />
              </>
            )}
          </Section>
        )}
        ListFooterComponent={
          page?.nextCursor ? (
            <ActionButton
              label="Ver más invitaciones"
              disabled={loading || busy}
              onPress={() => {
                void load(page.nextCursor!);
              }}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { apiRequest, ApiError } from "@/lib/api";
import { Profile, SessionGrant } from "./auth.types";
import { tokenStore } from "./token-store";
import { createSessionMonitor } from "./session-monitor";

interface AuthValue {
  profile: Profile | null;
  loading: boolean;
  error: string;
  complete: (grant: SessionGrant) => Promise<void>;
  request: <T>(path: string, body?: object, method?: string) => Promise<T>;
  logout: () => Promise<void>;
  revokeSession: (id: string, isCurrent: boolean) => Promise<void>;
  restore: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<Profile>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = useRef<string | null>(null);
  const revision = useRef(0);
  const storageQueue = useRef<Promise<void>>(Promise.resolve());

  // Keychain operations are serialized so a delayed old clear cannot erase a new login.
  const persist = useCallback((action: () => Promise<void>) => {
    const pending = storageQueue.current.then(action, action);
    storageQueue.current = pending.catch(() => {});
    return pending;
  }, []);

  const forget = useCallback(
    async (expected: string | null) => {
      if (token.current !== expected) return;
      revision.current += 1;
      token.current = null;
      setProfile(null);
      setError("");
      await persist(async () => {
        if (token.current === null) await tokenStore.clear();
      });
    },
    [persist],
  );

  const restore = useCallback(async () => {
    const version = ++revision.current;
    setLoading(true);
    setError("");
    try {
      await storageQueue.current;
      const saved = await tokenStore.read();
      const account = saved
        ? await apiRequest<Profile>("/auth/me", undefined, saved)
        : null;
      if (revision.current !== version) return;
      token.current = saved;
      setProfile(account);
    } catch (cause) {
      if (revision.current !== version) return;
      if (cause instanceof ApiError && cause.status === 401) {
        token.current = null;
        setProfile(null);
        await persist(async () => {
          if (revision.current === version) await tokenStore.clear();
        });
      } else
        setError(
          "No pudimos recuperar tu sesión. Revisa tu conexión y vuelve a intentar.",
        );
    } finally {
      if (revision.current === version) setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    let active = true;
    void storageQueue.current.then(() => {
      if (active) return restore();
    });
    return () => {
      active = false;
      revision.current += 1;
    };
  }, [restore]);

  const request = useCallback(
    async <T,>(path: string, body?: object, method?: string): Promise<T> => {
      const expected = token.current;
      const version = revision.current;
      try {
        const result = await apiRequest<T>(
          path,
          body,
          expected ?? undefined,
          method,
        );
        if (token.current !== expected || revision.current !== version)
          throw new ApiError(
            "Tu sesión cambió. Vuelve a intentar.",
            "SESSION_CHANGED",
          );
        return result;
      } catch (cause) {
        if (
          cause instanceof ApiError &&
          cause.code === "SESSION_INVALID" &&
          revision.current === version
        )
          await forget(expected);
        throw cause;
      }
    },
    [forget],
  );

  useEffect(() => {
    if (!profile?.id) return;
    const monitor = createSessionMonitor(async () => {
      if (!token.current) return;
      const account = await request<Profile>("/auth/me");
      setProfile((current) => (current?.id === account.id ? account : current));
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") monitor.resume();
      else monitor.pause();
    });
    if (
      AppState.currentState !== "background" &&
      AppState.currentState !== "inactive"
    )
      monitor.resume();
    return () => {
      subscription.remove();
      monitor.stop();
    };
  }, [profile?.id, request]);

  async function complete(grant: SessionGrant) {
    const version = ++revision.current;
    const account = await apiRequest<Profile>(
      "/auth/me",
      undefined,
      grant.sessionToken,
    );
    if (revision.current !== version) return;
    token.current = grant.sessionToken;
    try {
      await persist(async () => {
        if (revision.current === version)
          await tokenStore.write(grant.sessionToken);
      });
    } catch (cause) {
      await forget(grant.sessionToken);
      throw cause;
    }
    if (revision.current !== version) return;
    setProfile(account);
    setLoading(false);
    setError("");
  }

  async function logout() {
    const expected = token.current;
    await request("/auth/logout", {}, "POST");
    await forget(expected);
  }
  async function revokeSession(id: string, isCurrent: boolean) {
    const expected = token.current;
    await request(`/auth/sessions/${id}`, undefined, "DELETE");
    if (isCurrent) await forget(expected);
  }
  async function updateProfile(displayName: string): Promise<Profile> {
    const saved = await request<Profile>(
      "/profile/me",
      { displayName },
      "PATCH",
    );
    setProfile((current) => (current?.id === saved.id ? saved : current));
    return saved;
  }
  return (
    <AuthContext.Provider
      value={{
        profile,
        loading,
        error,
        complete,
        request,
        logout,
        revokeSession,
        restore,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}

import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";
import SessionGate from "@/features/auth/session-gate";
import SessionsScreen from "@/features/sessions/sessions-screen";

export default function SessionsRoute() {
  const { profile, loading, error } = useAuth();
  if (loading || error) return <SessionGate />;
  if (!profile) return <Redirect href="/" />;
  return <SessionsScreen key={profile.id} />;
}

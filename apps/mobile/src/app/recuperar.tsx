import { Redirect, router } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";
import SessionGate from "@/features/auth/session-gate";
import RecoveryScreen from "@/features/recovery/recovery-screen";

export default function RecoveryRoute() {
  const { profile, loading, error } = useAuth();
  if (loading || error) return <SessionGate />;
  if (profile) return <Redirect href="/" />;
  return <RecoveryScreen onBack={() => router.replace("/")} />;
}

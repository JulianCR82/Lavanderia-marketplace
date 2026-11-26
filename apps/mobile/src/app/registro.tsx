import { Redirect, router } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";
import SessionGate from "@/features/auth/session-gate";
import RegistrationScreen from "@/features/registration/registration-screen";

/** A real route preserves native back navigation and registration deep links. */
export default function RegistrationRoute() {
  const { profile, loading, error } = useAuth();
  if (loading || error) return <SessionGate />;
  if (profile) return <Redirect href="/" />;
  return (
    <RegistrationScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }}
    />
  );
}

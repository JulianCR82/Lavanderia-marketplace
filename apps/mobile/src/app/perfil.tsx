import { Redirect } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";
import SessionGate from "@/features/auth/session-gate";
import ProfileScreen from "@/features/profile/profile-screen";

export default function ProfileRoute() {
  const { profile, loading, error } = useAuth();
  if (loading || error) return <SessionGate />;
  if (!profile) return <Redirect href="/" />;
  return <ProfileScreen key={profile.id} />;
}

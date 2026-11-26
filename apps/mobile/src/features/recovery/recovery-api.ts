import { apiRequest } from "@/lib/api";

export interface PendingRecovery {
  recoveryId: string;
  expiresAt: string;
  resendAvailableAt: string;
  message: string;
}
export interface RecoveryGrant {
  resetToken: string;
  expiresAt: string;
}

export const recoveryApi = {
  request: (email: string) =>
    apiRequest<PendingRecovery>("/auth/recovery", { email }),
  resend: (recoveryId: string) =>
    apiRequest<PendingRecovery>("/auth/recovery/resend", { recoveryId }),
  verify: (recoveryId: string, code: string) =>
    apiRequest<RecoveryGrant>("/auth/recovery/verify", { recoveryId, code }),
  reset: (resetToken: string, password: string, passwordConfirmation: string) =>
    apiRequest<{ status: "PASSWORD_CHANGED" }>("/auth/recovery/reset", {
      resetToken,
      password,
      passwordConfirmation,
    }),
};

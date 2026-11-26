import { apiRequest } from "@/lib/api";
import { SessionGrant } from "../auth/auth.types";

export interface PendingRegistration {
  registrationId: string;
  expiresAt: string;
  resendAvailableAt: string;
}

export { ApiError as RegistrationError } from "@/lib/api";

export const registrationApi = {
  start: (email: string, password: string) =>
    apiRequest<PendingRegistration>("/auth/registrations", { email, password }),
  resend: (registrationId: string) =>
    apiRequest<PendingRegistration>("/auth/registrations/resend", {
      registrationId,
    }),
  verify: (registrationId: string, code: string) =>
    apiRequest<SessionGrant & { status: "CREATED" }>(
      "/auth/registrations/verify",
      { registrationId, code },
    ),
};

export type Provider = "google";
export interface SessionGrant {
  sessionToken: string;
  expiresAt: string;
}
export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  platformRole: "CUSTOMER" | "PLATFORM_ADMIN";
  accountKind: "CUSTOMER" | "LAUNDRY";
  memberships: {
    laundryId: string;
    laundryName: string;
    role: "OWNER" | "STAFF";
  }[];
}

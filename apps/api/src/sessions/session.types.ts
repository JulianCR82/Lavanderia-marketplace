export interface AccountProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  platformRole: 'CUSTOMER' | 'PLATFORM_ADMIN';
  accountKind: 'CUSTOMER' | 'LAUNDRY';
  memberships: {
    laundryId: string;
    laundryName: string;
    role: 'OWNER' | 'STAFF';
  }[];
}

export interface SessionContext {
  sessionId: string;
  createdAt: Date;
  profile: AccountProfile;
}

export interface SessionGrant {
  sessionToken: string;
  expiresAt: string;
}

export type ClientPlatform = 'android' | 'ios' | 'web';

/** Display-only hint: never an identity, device fingerprint or authorization claim. */
export function clientPlatform(value: unknown): ClientPlatform | null {
  return value === 'android' || value === 'ios' || value === 'web'
    ? value
    : null;
}

export interface SessionSummary {
  id: string;
  platform: ClientPlatform | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

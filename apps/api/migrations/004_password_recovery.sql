-- US-001.03: independent proofs; existing accounts/credentials are preserved.
CREATE TABLE password_recovery_challenges (
 id uuid PRIMARY KEY,
 email text NOT NULL CHECK (email=lower(email)),
 account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
 credential_hash text,
 otp_digest text NOT NULL CHECK (length(otp_digest)=64),
 failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 grant_digest text UNIQUE,
 grant_expires_at timestamptz,
 consumed_at timestamptz,
 delivery_state text NOT NULL DEFAULT 'pending' CHECK (delivery_state IN ('pending','sent','failed')),
 CHECK ((grant_digest IS NULL)=(grant_expires_at IS NULL)),
 CHECK (grant_digest IS NULL OR length(grant_digest)=64)
);
CREATE INDEX password_recovery_email_idx ON password_recovery_challenges(email,created_at);
CREATE INDEX password_recovery_retention_idx ON password_recovery_challenges(created_at);
-- Only post-reset security notices are persisted; no OTP/password in this outbox.
CREATE TABLE password_recovery_notifications (
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 delivered_at timestamptz,
 lease_until timestamptz
);
CREATE INDEX password_recovery_notifications_pending_idx
 ON password_recovery_notifications(created_at) WHERE delivered_at IS NULL;

CREATE TABLE account_security_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK (action='PASSWORD_RESET'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_security_events_account_idx ON account_security_events(account_id,created_at);

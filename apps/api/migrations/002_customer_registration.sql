-- US-001.01: additive migration; existing accounts and memberships are preserved.
CREATE TABLE account_credentials (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE RESTRICT,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE registration_challenges (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(email)),
  password_hash text NOT NULL,
  otp_digest text NOT NULL,
  failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5),
  expires_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_challenges_retention_idx ON registration_challenges (created_at);

-- Keyed HMAC identifiers avoid retaining raw IP addresses or email in quota history.
CREATE TABLE registration_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('request', 'send')),
  email_key text NOT NULL,
  ip_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX registration_events_time_idx ON registration_events (created_at);
CREATE INDEX registration_events_email_idx ON registration_events (email_key, created_at);
CREATE INDEX registration_events_ip_idx ON registration_events (ip_key, created_at);

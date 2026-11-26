-- US-001.01/.02/.06: additive identity/session foundation. Preserve existing credentials.
ALTER TABLE accounts ADD COLUMN is_development_fixture boolean NOT NULL DEFAULT false;

CREATE TABLE account_identities (
  provider text NOT NULL CHECK (provider IN ('google', 'apple')),
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject),
  UNIQUE (account_id, provider)
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX auth_sessions_account_idx ON auth_sessions(account_id);
CREATE INDEX auth_sessions_expiry_idx ON auth_sessions(expires_at);

CREATE TABLE auth_challenges (
  id uuid PRIMARY KEY,
  provider text NOT NULL CHECK (provider IN ('google', 'apple')),
  nonce_digest text NOT NULL CHECK (length(nonce_digest) = 64),
  account_id uuid REFERENCES accounts(id) ON DELETE RESTRICT,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX auth_challenges_expiry_idx ON auth_challenges(expires_at);

CREATE TABLE auth_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_digest text NOT NULL,
  email_digest text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_attempts_ip_idx ON auth_attempts(ip_digest, created_at);
CREATE INDEX auth_attempts_email_idx ON auth_attempts(email_digest, created_at);

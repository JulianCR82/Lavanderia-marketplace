-- Base de identidad y multitenencia. No guarda credenciales ni define proveedor de autenticación.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE platform_role AS ENUM ('CUSTOMER', 'PLATFORM_ADMIN');
CREATE TYPE laundry_member_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE laundry_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  phone text,
  platform_role platform_role NOT NULL DEFAULT 'CUSTOMER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE UNIQUE INDEX accounts_email_lower_unique ON accounts (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX accounts_phone_unique ON accounts (phone) WHERE phone IS NOT NULL;

CREATE TABLE laundries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status laundry_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE laundry_memberships (
  laundry_id uuid NOT NULL REFERENCES laundries(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  role laundry_member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (laundry_id, account_id)
);
CREATE INDEX laundry_memberships_account_idx ON laundry_memberships (account_id);

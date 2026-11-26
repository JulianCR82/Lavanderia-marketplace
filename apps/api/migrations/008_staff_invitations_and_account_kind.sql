-- US-003.01: exclusive work accounts, without deleting customer history.
ALTER TABLE accounts ADD COLUMN account_kind text NOT NULL DEFAULT 'CUSTOMER'
  CHECK (account_kind IN ('CUSTOMER','LAUNDRY'));
UPDATE accounts a SET account_kind='LAUNDRY',updated_at=now()
  WHERE platform_role='CUSTOMER' AND EXISTS (SELECT 1 FROM laundry_memberships m WHERE m.account_id=a.id);
UPDATE auth_sessions s SET revoked_at=COALESCE(revoked_at,now())
  FROM accounts a WHERE a.id=s.account_id AND a.account_kind='LAUNDRY';

-- Privileged membership writes (including seeds) must also persist the conversion.
CREATE FUNCTION convert_laundry_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE accounts SET account_kind='LAUNDRY',updated_at=now()
    WHERE id=NEW.account_id AND account_kind='CUSTOMER' AND platform_role='CUSTOMER';
  IF FOUND THEN
    UPDATE auth_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE account_id=NEW.account_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER laundry_membership_account_kind AFTER INSERT OR UPDATE OF account_id
  ON laundry_memberships FOR EACH ROW EXECUTE FUNCTION convert_laundry_account();
CREATE FUNCTION preserve_work_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.account_kind='LAUNDRY' AND NEW.account_kind='CUSTOMER' THEN
    RAISE EXCEPTION 'A work account cannot become a customer account';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_preserve_work_kind BEFORE UPDATE OF account_kind ON accounts
  FOR EACH ROW EXECUTE FUNCTION preserve_work_account();

CREATE TABLE staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id uuid NOT NULL REFERENCES laundries(id) ON DELETE RESTRICT,
  invited_by uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  email text NOT NULL CHECK (email=lower(btrim(email)) AND length(email)<=254),
  delivery_status text NOT NULL DEFAULT 'PENDING' CHECK (delivery_status IN ('PENDING','SENT','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_delivery_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',
  accepted_at timestamptz,
  accepted_by uuid REFERENCES accounts(id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  CHECK ((accepted_at IS NULL)=(accepted_by IS NULL)),
  CHECK (accepted_at IS NULL OR cancelled_at IS NULL)
);
CREATE UNIQUE INDEX staff_invitations_pending_unique ON staff_invitations(laundry_id,email)
  WHERE accepted_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX staff_invitations_recipient_idx ON staff_invitations(email,created_at DESC,id DESC);
CREATE INDEX staff_invitations_laundry_idx ON staff_invitations(laundry_id,created_at DESC,id DESC);
CREATE TABLE laundry_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laundry_id uuid NOT NULL REFERENCES laundries(id) ON DELETE RESTRICT,
  invitation_id uuid NOT NULL REFERENCES staff_invitations(id) ON DELETE RESTRICT,
  actor_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('STAFF_INVITED','STAFF_ACCEPTED','INVITATION_CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

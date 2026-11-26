-- Retira MANAGER del modelo vigente y conserva sus membresías como STAFF.
ALTER TYPE laundry_member_role RENAME TO laundry_member_role_legacy;
CREATE TYPE laundry_member_role AS ENUM ('OWNER', 'STAFF');

ALTER TABLE laundry_memberships
  ALTER COLUMN role TYPE laundry_member_role
  USING (
    CASE role::text
      WHEN 'MANAGER' THEN 'STAFF'
      ELSE role::text
    END
  )::laundry_member_role;

DROP TYPE laundry_member_role_legacy;

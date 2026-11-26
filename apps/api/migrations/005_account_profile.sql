-- US-001.04: optional display name. Existing accounts and login identifiers are preserved.
ALTER TABLE accounts ADD COLUMN display_name text;
ALTER TABLE accounts ADD CONSTRAINT accounts_display_name_valid CHECK (
  display_name IS NULL OR (
    char_length(display_name) BETWEEN 1 AND 80
    AND display_name = btrim(display_name)
    AND display_name !~ '[[:cntrl:]]'
  )
);

-- US-001.05: additive metadata and auditable owner-scoped revocation.
ALTER TABLE auth_sessions ADD COLUMN client_platform text
  CHECK (client_platform IN ('android','ios','web'));
CREATE INDEX auth_sessions_active_account_created_idx
  ON auth_sessions(account_id,created_at DESC,id DESC) WHERE revoked_at IS NULL;

ALTER TABLE account_security_events DROP CONSTRAINT account_security_events_action_check;
ALTER TABLE account_security_events ADD CONSTRAINT account_security_events_action_check
  CHECK (action IN ('PASSWORD_RESET','SESSION_REVOKED','SESSION_LOGOUT'));
ALTER TABLE account_security_events
  ADD COLUMN actor_session_id uuid REFERENCES auth_sessions(id) ON DELETE RESTRICT,
  ADD COLUMN target_session_id uuid REFERENCES auth_sessions(id) ON DELETE RESTRICT;
ALTER TABLE account_security_events ADD CONSTRAINT session_event_context_check
  CHECK (action='PASSWORD_RESET' OR (actor_session_id IS NOT NULL AND target_session_id IS NOT NULL));

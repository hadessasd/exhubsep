-- Live support chat (users ↔ admin)

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  visitor_name TEXT,
  contact_method TEXT,
  contact_value TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_threads_status_idx ON chat_threads (status);
CREATE INDEX IF NOT EXISTS chat_threads_user_id_idx ON chat_threads (user_id);
CREATE INDEX IF NOT EXISTS chat_threads_updated_at_idx ON chat_threads (updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_id_idx ON chat_messages (thread_id, created_at);

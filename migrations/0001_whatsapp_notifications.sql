CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  alert_key TEXT PRIMARY KEY,
  bulletin_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  message_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

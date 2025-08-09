CREATE TABLE IF NOT EXISTS config (
  id integer PRIMARY KEY,
  api_key text NOT NULL,
  keywords text[]
);

-- Private bucket for call recordings. No storage policies are added, so only
-- the server (secret key) can read or write; the browser never gets direct access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

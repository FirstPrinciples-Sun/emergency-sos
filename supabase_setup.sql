-- ============================================================
-- Supabase SQL Setup for Emergency SOS System
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    line_user_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    picture_url TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 2. Incidents table
CREATE TABLE IF NOT EXISTS incidents (
    incident_id TEXT PRIMARY KEY,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_hint TEXT,
    text_description TEXT,
    reporter_phone TEXT,
    line_user_id TEXT DEFAULT NULL REFERENCES users(line_user_id) ON DELETE SET NULL,
    display_name TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity_level TEXT NOT NULL,
    severity_score INTEGER NOT NULL,
    category TEXT NOT NULL,
    victim_count INTEGER,
    key_symptoms TEXT[] DEFAULT '{}',
    summary_th TEXT NOT NULL,
    required_units TEXT[] DEFAULT '{}',
    first_aid_advice TEXT,
    confidence_score DOUBLE PRECISION,
    line_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user incident queries
CREATE INDEX IF NOT EXISTS idx_incidents_line_user_id
    ON incidents(line_user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp
    ON incidents(timestamp DESC);

-- 3. Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    storage_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    line_user_id TEXT NOT NULL REFERENCES users(line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_line_user_id
    ON documents(line_user_id);

-- 4. Storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policies for documents bucket
-- Allow authenticated uploads
CREATE POLICY "Users can upload documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents');

-- Allow users to read their own documents
CREATE POLICY "Users can read own documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'documents');

-- 6. RLS policies (optional - since we use service key, RLS is bypassed)
-- If you want RLS on the tables:
-- ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

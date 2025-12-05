-- Scanner Cache Table
-- Stores AI-generated scanner results per championship for 24h

CREATE TABLE IF NOT EXISTS scanner_cache (
    championship_id TEXT PRIMARY KEY,
    results JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster timestamp queries
CREATE INDEX IF NOT EXISTS idx_scanner_cache_timestamp ON scanner_cache(timestamp);

-- Auto-delete old cache entries (older than 48h)
CREATE OR REPLACE FUNCTION delete_old_scanner_cache()
RETURNS trigger AS $$
BEGIN
    DELETE FROM scanner_cache
    WHERE timestamp < NOW() - INTERVAL '48 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_delete_old_scanner_cache
    AFTER INSERT ON scanner_cache
    EXECUTE FUNCTION delete_old_scanner_cache();

-- Enable Row Level Security (RLS)
ALTER TABLE scanner_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cache
CREATE POLICY "Anyone can read scanner cache"
    ON scanner_cache
    FOR SELECT
    USING (true);

-- Policy: Only service role can insert/update
CREATE POLICY "Service role can manage scanner cache"
    ON scanner_cache
    FOR ALL
    USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON scanner_cache TO anon, authenticated;
GRANT ALL ON scanner_cache TO service_role;

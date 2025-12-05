-- Clear Scanner Cache for Crypto Championship
-- This will force a fresh AI scan on next scanner load

-- Option 1: Clear cache for ALL championships (safest for testing)
DELETE FROM scanner_cache;

-- Option 2: Clear cache only for specific championship (replace with actual ID)
-- DELETE FROM scanner_cache WHERE championship_id = 'YOUR_CHAMPIONSHIP_ID_HERE';

-- Verify deletion
SELECT * FROM scanner_cache;

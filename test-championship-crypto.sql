-- Test Championship Crypto Tickers
-- Verifica se il championship attivo ha crypto negli allowed_tickers

-- 1. Vedi i dettagli del championship attivo
SELECT 
    id,
    name,
    ticker_restriction_enabled,
    allowed_tickers,
    array_length(allowed_tickers, 1) as ticker_count
FROM championships
WHERE id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6';

-- 2. Controlla se ci sono crypto negli allowed_tickers
SELECT 
    name,
    ticker_restriction_enabled,
    CASE 
        WHEN 'BTCUSD' = ANY(allowed_tickers) THEN '✅ BTCUSD presente'
        ELSE '❌ BTCUSD mancante'
    END as btc_status,
    CASE 
        WHEN 'ETHUSD' = ANY(allowed_tickers) THEN '✅ ETHUSD presente'
        ELSE '❌ ETHUSD mancante'
    END as eth_status,
    CASE 
        WHEN 'SOLUSD' = ANY(allowed_tickers) THEN '✅ SOLUSD presente'
        ELSE '❌ SOLUSD mancante'
    END as sol_status
FROM championships
WHERE id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6';

-- 3. Vedi la scanner cache attuale
SELECT 
    championship_id,
    timestamp,
    array_length(results, 1) as results_count,
    results
FROM scanner_cache
WHERE championship_id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6';

-- 4. SOLUZIONE: Aggiungi crypto agli allowed_tickers (decommentare per eseguire)
-- UPDATE championships
-- SET allowed_tickers = array_append(allowed_tickers, 'BTCUSD')
-- WHERE id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6'
-- AND NOT ('BTCUSD' = ANY(allowed_tickers));

-- UPDATE championships
-- SET allowed_tickers = array_append(allowed_tickers, 'ETHUSD')
-- WHERE id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6'
-- AND NOT ('ETHUSD' = ANY(allowed_tickers));

-- UPDATE championships
-- SET allowed_tickers = array_append(allowed_tickers, 'SOLUSD')
-- WHERE id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6'
-- AND NOT ('SOLUSD' = ANY(allowed_tickers));

-- 5. SOLUZIONE ALTERNATIVA: Clear scanner cache per forzare re-scan
-- DELETE FROM scanner_cache WHERE championship_id = 'e91040c1-6f41-43ea-8ceb-a582355c77d6';

-- Schema SQL per tracciare i pagamenti Stripe
-- Questa tabella si integra con il database esistente dell'applicazione

-- Tabella payments: traccia tutti i pagamenti per iscrizioni ai campionati
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    payment_intent_id TEXT UNIQUE NOT NULL,
    championship_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
    payment_method_type TEXT, -- card, bank_transfer, etc.
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    stripe_customer_id TEXT,
    metadata TEXT, -- JSON stringificato per dati extra
    error_message TEXT, -- Se il pagamento fallisce
    
    FOREIGN KEY (championship_id) REFERENCES championships(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_payments_championship ON payments(championship_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON payments(payment_intent_id);

-- Note:
-- 1. Per IndexedDB (usato nel frontend), questa tabella deve essere creata in services/database.ts
-- 2. Per un database SQL tradizionale (PostgreSQL/MySQL), questo schema può essere usato direttamente
-- 3. I timestamp sono in formato ISO 8601 per compatibilità cross-database

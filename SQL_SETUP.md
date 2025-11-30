# 🗄️ SQL SETUP - Alpha Arena Database

Script SQL per configurare il database Supabase per Alpha Arena.

---

## 📋 TABELLE ESISTENTI

Il progetto assume che queste tabelle già esistano (create in precedenza):

- ✅ `user_profiles` - Profili utenti
- ✅ `championships` - Campionati
- ✅ `transactions` - Transazioni finanziarie
- ✅ `holdings` - Portafogli utenti
- ✅ `strategies` - Strategie trading
- ✅ `agent_logs` - Logs AI agent
- ✅ `agent_scan_results` - Risultati scanner

---

## 🆕 TABELLA PAYMENTS (NUOVA)

Questa tabella deve essere creata per gestire i pagamenti Stripe.

### Script SQL

```sql
-- ============================================
-- PAYMENTS TABLE
-- Registra tutti i pagamenti Stripe
-- ============================================

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES public.user_profiles(email) ON DELETE CASCADE,
  championship_id TEXT NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'usd' NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending')),
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Commenti per documentare le colonne
COMMENT ON TABLE public.payments IS 'Registra tutti i pagamenti Stripe per enrollment nei campionati';
COMMENT ON COLUMN public.payments.id IS 'ID univoco del payment record';
COMMENT ON COLUMN public.payments.user_email IS 'Email dell''utente che ha effettuato il pagamento';
COMMENT ON COLUMN public.payments.championship_id IS 'ID del campionato per cui si è pagato';
COMMENT ON COLUMN public.payments.stripe_payment_intent_id IS 'ID del Stripe PaymentIntent';
COMMENT ON COLUMN public.payments.amount IS 'Importo pagato in dollari';
COMMENT ON COLUMN public.payments.currency IS 'Valuta del pagamento';
COMMENT ON COLUMN public.payments.status IS 'Stato del pagamento: succeeded, failed, pending';
COMMENT ON COLUMN public.payments.payment_method IS 'Metodo di pagamento usato (card, bank_transfer, etc)';

-- ============================================
-- INDEXES per performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payments_user_email ON public.payments(user_email);
CREATE INDEX IF NOT EXISTS idx_payments_championship ON public.payments(championship_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent ON public.payments(stripe_payment_intent_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Abilita RLS sulla tabella
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users possono vedere i propri pagamenti
CREATE POLICY "Users can view own payments"
  ON public.payments
  FOR SELECT
  USING (auth.uid()::text = user_email);

-- Policy 2: Admins possono vedere tutti i pagamenti
CREATE POLICY "Admins can view all payments"
  ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE email = auth.uid()::text
      AND is_admin = true
    )
  );

-- Policy 3: Backend (service role) può inserire pagamenti
-- Nota: Questa policy permette INSERT a chiunque abbia il service role key
CREATE POLICY "Service role can insert payments"
  ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Policy 4: Backend (service role) può aggiornare status pagamenti
CREATE POLICY "Service role can update payments"
  ON public.payments
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGER per updated_at automatico
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 🔍 VERIFICHE POST-CREAZIONE

### 1. Verifica Tabella Creata

```sql
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;
```

### 2. Verifica Indexes

```sql
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'payments';
```

### 3. Verifica RLS Policies

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'payments';
```

### 4. Test Insert (con Service Role Key)

```sql
-- Questo deve essere eseguito con SERVICE_ROLE_KEY, non ANON_KEY
INSERT INTO public.payments (
    id,
    user_email,
    championship_id,
    stripe_payment_intent_id,
    amount,
    currency,
    status,
    payment_method
) VALUES (
    'payment_test_123',
    'test@example.com',
    'champ_test_123',
    'pi_test_123',
    10.00,
    'usd',
    'succeeded',
    'card'
);

-- Verifica insert
SELECT * FROM public.payments WHERE id = 'payment_test_123';

-- Cleanup test
DELETE FROM public.payments WHERE id = 'payment_test_123';
```

---

## ⚠️ TROUBLESHOOTING

### Errore: Foreign Key Violation

**Sintomo:**
```
ERROR: insert or update on table "payments" violates foreign key constraint
```

**Causa:** 
- `user_email` non esiste in `user_profiles`
- `championship_id` non esiste in `championships`

**Soluzione:**
1. Verifica che l'utente esista:
   ```sql
   SELECT email FROM public.user_profiles WHERE email = 'xxx@example.com';
   ```
2. Verifica che il championship esista:
   ```sql
   SELECT id FROM public.championships WHERE id = 'champ_xxx';
   ```
3. Crea l'utente o championship se necessario

### Errore: RLS Policy Denied

**Sintomo:**
```
new row violates row-level security policy for table "payments"
```

**Causa:** Backend sta usando ANON_KEY invece di SERVICE_KEY

**Soluzione:**
1. Verifica in Railway backend variables:
   ```bash
   SUPABASE_SERVICE_KEY=eyJ...  # DEVE essere Service Role Key
   ```
2. ⚠️ **NON usare SUPABASE_ANON_KEY nel backend**

### Errore: Duplicate stripe_payment_intent_id

**Sintomo:**
```
ERROR: duplicate key value violates unique constraint
```

**Causa:** Webhook ha già processato questo payment

**Soluzione:**
- Normal behavior, il webhook potrebbe essere chiamato più volte
- Il backend gestisce con `ON CONFLICT` in upsert (già implementato)

---

## 📊 QUERY UTILI

### Payments per Championship

```sql
SELECT 
    p.id,
    p.user_email,
    u.name as user_name,
    p.amount,
    p.status,
    p.created_at,
    c.name as championship_name
FROM public.payments p
JOIN public.user_profiles u ON p.user_email = u.email
JOIN public.championships c ON p.championship_id = c.id
WHERE p.championship_id = 'YOUR_CHAMPIONSHIP_ID'
ORDER BY p.created_at DESC;
```

### Total Revenue per Championship

```sql
SELECT 
    c.name as championship_name,
    COUNT(p.id) as total_payments,
    SUM(p.amount) as total_revenue,
    COUNT(DISTINCT p.user_email) as unique_users
FROM public.championships c
LEFT JOIN public.payments p ON c.id = p.championship_id AND p.status = 'succeeded'
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;
```

### Failed Payments Report

```sql
SELECT 
    p.user_email,
    u.name,
    p.championship_id,
    c.name as championship_name,
    p.amount,
    p.created_at,
    p.stripe_payment_intent_id
FROM public.payments p
JOIN public.user_profiles u ON p.user_email = u.email
JOIN public.championships c ON p.championship_id = c.id
WHERE p.status = 'failed'
ORDER BY p.created_at DESC
LIMIT 100;
```

### User Payment History

```sql
SELECT 
    p.id,
    p.championship_id,
    c.name as championship_name,
    p.amount,
    p.status,
    p.payment_method,
    p.created_at
FROM public.payments p
JOIN public.championships c ON p.championship_id = c.id
WHERE p.user_email = 'user@example.com'
ORDER BY p.created_at DESC;
```

---

## 🔐 SICUREZZA

### Best Practices

1. **Service Role Key**
   - ⚠️ NON committare mai in Git
   - ⚠️ Usare SOLO nel backend
   - ✅ Salvare solo in Railway Variables

2. **RLS Policies**
   - ✅ Sempre abilitate in production
   - ✅ Testare con diversi ruoli (user, admin, anon)

3. **Sensitive Data**
   - ⚠️ `stripe_payment_intent_id` è sensibile
   - ✅ Policies RLS proteggono da accesso non autorizzato

4. **Audit Log**
   - ✅ `created_at` e `updated_at` automatici
   - ✅ Mai cancellare payments (soft delete se necessario)

---

## ✅ CHECKLIST FINALE

Prima di andare in production:

- [ ] Tabella `payments` creata
- [ ] Indexes creati
- [ ] RLS policies attivate
- [ ] Trigger `updated_at` funzionante
- [ ] Test insert con service key funziona
- [ ] Test select con user key funziona (solo propri payments)
- [ ] Test select con admin funziona (tutti i payments)
- [ ] Foreign keys verificate (user_profiles, championships)
- [ ] Backend ha SUPABASE_SERVICE_KEY (non anon key)

---

## 📞 SUPPORTO

Per problemi con Supabase:
- Docs: https://supabase.com/docs/guides/database
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security
- Discord: https://discord.supabase.com

---

**Setup Completato! ✨**

# 🚂 RAILWAY DEPLOYMENT GUIDE - Alpha Arena

Guida completa per deployare Alpha Arena su Railway.app

---

## 📋 PRE-REQUISITI

Prima di iniziare il deploy, assicurati di avere:

- [x] Account Railway.app (https://railway.app)
- [x] Account GitHub con repository Alpha Arena
- [x] Account Supabase con progetto creato
- [x] Account Stripe con chiavi API
- [x] Tabella `payments` creata in Supabase (vedi SQL_SETUP.md)

---

## 🎯 ARCHITETTURA DEPLOYMENT

```
Alpha Arena
├── Backend Service (Node.js/Express)
│   ├── Port: 3001
│   ├── Handles: Stripe webhooks, payments
│   └── Database: Supabase (Service Role)
│
└── Frontend Service (Vite/React)
    ├── Port: 5173
    ├── Static site con API calls
    └── Database: Supabase (Anon Key)
```

---

## 🚀 FASE 1: PREPARAZIONE REPOSITORY

### 1.1 Commit e Push Codice

```bash
# Assicurati che tutte le modifiche siano committate
git status

# Aggiungi tutti i file
git add .

# Commit
git commit -m "feat: prepare for Railway deployment"

# Push su GitHub
git push origin main
```

### 1.2 Verifica File Essenziali

Assicurati che questi file esistano:

- ✅ `backend/railway.json`
- ✅ `backend/package.json` (con engines)
- ✅ `backend/.env.example`
- ✅ `vite.config.ts` (con host: true)
- ✅ `.env.example`
- ✅ `.gitignore` (aggiornato)

---

## 🔧 FASE 2: SETUP SUPABASE

### 2.1 Creare Progetto Supabase (se non esiste)

1. Vai su https://supabase.com
2. Crea nuovo progetto
3. Annota:
   - `SUPABASE_URL`: https://xxx.supabase.co
   - `SUPABASE_ANON_KEY`: eyJ... (public)
   - `SUPABASE_SERVICE_KEY`: eyJ... (secret, admin)

### 2.2 Eseguire SQL Setup

1. Apri Supabase SQL Editor
2. Esegui script da `SQL_SETUP.md`
3. Verifica tabelle create:
   - `payments`
   - `user_profiles`
   - `championships`
   - `transactions`
   - `holdings`
   - Altre...

### 2.3 Configurare Auth (Opzionale per ora)

```
Settings → Authentication → Providers
- Email: ✅ Enabled
- Confirm email: ❌ Disabled (per testing)
```

---

## 🚂 FASE 3: DEPLOY BACKEND SU RAILWAY

### 3.1 Creare Progetto Backend

1. Vai su https://railway.app
2. Click **"New Project"**
3. Scegli **"Deploy from GitHub repo"**
4. Seleziona repository **"alpha-arena"**
5. Railway auto-detecta Node.js

### 3.2 Configurare Root Directory per Backend

**IMPORTANTE:** Railway di default parte dalla root, dobbiamo dirgli di usare `/backend`

1. Nel progetto Railway, click sul service
2. **Settings** → **Service Settings**
3. **Root Directory**: Imposta a `backend`
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

### 3.3 Configurare Environment Variables Backend

Nel service backend, vai su **Variables** tab e aggiungi:

```bash
NODE_ENV=production
PORT=3001

# Frontend URL (ottieni dopo deploy frontend)
FRONTEND_URL=https://alpha-arena-production.up.railway.app

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key

# Stripe (opzionale, default keys)
STRIPE_WEBHOOK_SECRET=whsec_...

# Nota: STRIPE_SECRET_KEY non serve qui, ogni admin usa le proprie keys
```

### 3.4 Deploy

1. Railway fa deploy automaticamente dopo push su GitHub
2. Attendi build (1-2 minuti)
3. Verifica logs: ✅ "Backend running on..."
4. Testa health check:

```bash
curl https://your-backend.up.railway.app/api/health
# Output: {"status":"ok","timestamp":"..."}
```

### 3.5 Annota Backend URL

Copia URL del backend (es: `https://alpha-arena-backend-production.up.railway.app`)

---

## 🎨 FASE 4: DEPLOY FRONTEND SU RAILWAY

### 4.1 Creare Service Frontend

**Opzione A: Stesso Progetto (Monorepo)**
1. Nel progetto Railway esistente
2. Click **"New Service"**
3. **"Deploy from GitHub repo"**
4. Seleziona stesso repo
5. Root Directory: `/` (root)

**Opzione B: Progetto Separato (Consigliato)**
1. Nuovo progetto Railway
2. Deploy da GitHub
3. Root Directory: `/`

### 4.2 Configurare Build/Start Scripts

Nel `package.json` root, aggiungi/verifica:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "start": "vite preview --port 5173 --host"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 4.3 Configurare Environment Variables Frontend

Nel service frontend, **Variables** tab:

```bash
# Backend API (usa URL ottenuto in Fase 3.5)
VITE_API_URL=https://alpha-arena-backend-production.up.railway.app

# Supabase (Anon Key, non Service Key!)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### 4.4 Trigger Deploy

1. Railway fa deploy automatico
2. Build frontend (2-3 minuti)
3. Verifica: frontend accessibile su Railway URL

### 4.5 Aggiornare CORS Backend

Torna al backend e aggiorna `FRONTEND_URL`:

```bash
FRONTEND_URL=https://alpha-arena-production.up.railway.app
```

Railway rideploya automaticamente backend.

---

## 💳 FASE 5: CONFIGURARE STRIPE WEBHOOK

### 5.1 Ottenere Webhook URL

Backend URL + `/api/webhook`:
```
https://alpha-arena-backend-production.up.railway.app/api/webhook
```

### 5.2 Configurare in Stripe Dashboard

1. Vai su https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. **Endpoint URL**: Incolla URL sopra
4. **Events to send**:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
5. Click **"Add endpoint"**

### 5.3 Ottenere Webhook Secret

1. Nel webhook appena creato
2. Click **"Reveal"** su **Signing secret**
3. Copia: `whsec_...`

### 5.4 Aggiungere Secret a Railway

Backend service → Variables:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

---

## 🧪 FASE 6: TESTING END-TO-END

### 6.1 Test Frontend

```bash
# Apri frontend
https://your-frontend.up.railway.app

# Verifica:
✅ App carica
✅ Login funziona
✅ Championships visualizzati
✅ Console senza errori CORS
```

### 6.2 Test Backend Health

```bash
curl https://your-backend.up.railway.app/api/health

# Output atteso:
{
  "status": "ok",
  "timestamp": "2025-11-30T10:50:00.000Z"
}
```

### 6.3 Test Payment Flow

1. **Setup nell'app:**
   - Login come admin (mtonin@live.it o altro)
   - Settings → Stripe Configuration
   - Inserisci Stripe keys (test keys)

2. **Crea Championship:**
   - Championships → Create New
   - Nome: "Test Championship"
   - Enrollment Fee: $10
   - Starting Cash: $10000
   - Save

3. **Test Enrollment:**
   - Logout
   - Login come utente diverso
   - Championships → Seleziona "Test Championship"
   - Click "Pay & Join"
   - Usa carta test: `4242 4242 4242 4242`
   - CVC: qualsiasi, Data: futuro
   - Confirm Payment

4. **Verificare:**
   - ✅ Pagamento completato
   - ✅ Utente iscritto automaticamente
   - ✅ Transazione deposit visibile in Activity
   - ✅ Buying power = $10,000

### 6.4 Verificare Webhook Logs

Railway Backend → Deployments → Logs:

```
[Webhook] PaymentIntent succeeded: pi_xxx
[Webhook] Metadata: { userEmail: '...', championshipId: '...' }
[DB] Payment saved successfully: payment_xxx
[DB] User enrolled successfully with starting cash: 10000
```

### 6.5 Verificare Database

Supabase → Table Editor:

```sql
-- Verifica payment salvato
SELECT * FROM payments ORDER BY created_at DESC LIMIT 1;

-- Verifica transaction enrollment
SELECT * FROM transactions WHERE type = 'deposit' ORDER BY date DESC LIMIT 1;
```

---

## 🔍 TROUBLESHOOTING

### Problema: CORS Error

**Sintomo:** Browser console mostra `CORS policy blocked`

**Soluzione:**
1. Verifica `FRONTEND_URL` in backend variables
2. Deve matchare esattamente URL frontend Railway
3. Include `https://` e no trailing slash
4. Rideploy backend dopo modifica

### Problema: Webhook Non Riceve Eventi

**Sintomo:** Pagamenti riescono ma webhook non logga nulla

**Soluzione:**
1. Stripe Dashboard → Webhooks → Verifica endpoint URL
2. Test webhook:
   ```bash
   stripe trigger payment_intent.succeeded
   ```
3. Verifica `STRIPE_WEBHOOK_SECRET` in Railway
4. Check logs Railway per errori signature

### Problema: Database Connection Failed

**Sintomo:** Backend logs: `Supabase client not initialized`

**Soluzione:**
1. Verifica `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
2. Assicurati di usare **Service Role Key** non Anon Key
3. Verifica RLS policies su tabelle

### Problema: Build Failed

**Sintomo:** Railway build fallisce

**Soluzione:**
1. Check `package.json` ha `engines` definito
2. Verifica `node_modules` in `.gitignore`
3. Prova build locale:
   ```bash
   cd backend && npm install && npm start
   # O per frontend:
   npm install && npm run build
   ```

### Problema: Environment Variables Non Funzionano

**Sintomo:** `undefined` in logs

**Soluzione:**
- Frontend: DEVONO iniziare con `VITE_`
- Backend: NO prefix necessario
- Riavvia service dopo modifiche
- Verifica typos nei nomi

---

## 📊 MONITORING

### Railway Dashboard

```
Project → Service → Metrics

Monitora:
- CPU usage
- Memory usage
- Network traffic
- Response times
```

### Logs in Real-Time

```
Service → Deployments → Latest → Logs

Cerca:
- Errors (rosso)
- Warnings (giallo) 
- Info (blu)
```

### Sentry (Opzionale)

Per production, installa Sentry:

```bash
npm install @sentry/node

# backend/server.js
const Sentry = require('@sentry/node');

if (process.env.NODE_ENV === 'production') {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}
```

---

## 🎉 DEPLOYMENT COMPLETATO!

Il tuo Alpha Arena è ora live su Railway! 🚀

### URLs Finali:

- **Frontend**: https://your-frontend.up.railway.app
- **Backend**: https://your-backend.up.railway.app
- **Health Check**: https://your-backend.up.railway.app/api/health

### Prossimi Step:

1. ✅ Custom Domain (opzionale)
2. ✅ Email notifications (SendGrid/Mailgun)
3. ✅ Real-time updates (WebSockets)
4. ✅ Mobile responsive
5. ✅ Analytics (Google Analytics)

---

## 💰 COSTI STIMATI

**Railway Pricing:**

- **Hobby Plan**: $5/mese
  - Include $5 di credit
  - Backend: ~$2-3/mese
  - Frontend: ~$1-2/mese
  - **Totale**: $3-5/mese (coperto dal plan)

**Altri Servizi:**

- Supabase: Free tier (fino a 500MB DB)
- Stripe: Free (commissioni solo su transazioni)
- Domain (opzionale): $10-15/anno

---

## 📞 SUPPORTO

- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Stripe Docs: https://stripe.com/docs

Per problemi specifici, controlla:
- Railway Discord: https://discord.gg/railway
- GitHub Issues del progetto

---

**Buon Deploy! 🎊**

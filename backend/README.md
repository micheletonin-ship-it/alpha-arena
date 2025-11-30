# Alpha Arena - Backend Stripe

Backend API per gestire i pagamenti Stripe per le iscrizioni ai campionati di trading.

## 🚀 Setup Rapido

### 1. Installare le dipendenze

```bash
cd backend
npm install
```

### 2. Configurare le variabili d'ambiente

Crea un file `.env` nella cartella `backend/`:

```bash
cp .env.example .env
```

Modifica `.env` e aggiungi (opzionale):

```env
PORT=3001
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Nota:** Le chiavi Stripe Secret individuali NON vanno qui. Sono salvate nel database e passate per ogni richiesta.

### 3. Avviare il server

```bash
# Modalità sviluppo (con auto-reload)
npm run dev

# Modalità produzione
npm start
```

Il server sarà disponibile su `http://localhost:3001`

---

## 📡 Endpoints API

### Health Check

```http
GET /api/health
```

Verifica che il server sia operativo.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T10:00:00.000Z"
}
```

### Create Payment Intent

```http
POST /api/create-payment-intent
```

Crea un PaymentIntent Stripe per l'iscrizione a un campionato.

**Request Body:**
```json
{
  "amount": 20,
  "currency": "usd",
  "championshipId": "champ_id_123",
  "stripeSecretKey": "sk_test_..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid Stripe API key",
  "message": "The Stripe secret key provided is invalid or expired."
}
```

### Confirm Payment

```http
POST /api/confirm-payment
```

Recupera lo stato di un PaymentIntent.

**Request Body:**
```json
{
  "paymentIntentId": "pi_xxx",
  "stripeSecretKey": "sk_test_..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "succeeded",
  "amount": 2000,
  "currency": "usd",
  "metadata": {
    "championshipId": "champ_id_123"
  }
}
```

### Webhook Handler

```http
POST /api/webhook
```

Riceve eventi da Stripe. Questo endpoint deve essere configurato nel [Stripe Dashboard](https://dashboard.stripe.com/webhooks).

**Eventi gestiti:**
- `payment_intent.succeeded` - Pagamento completato con successo
- `payment_intent.payment_failed` - Pagamento fallito

---

## 🔧 Configurazione Stripe

### 1. Ottenere le chiavi API

1. Vai su [Stripe Dashboard](https://dashboard.stripe.com)
2. Accedi con il tuo account
3. Vai su **Developers → API keys**
4. Copia:
   - **Publishable key** (pk_test_... o pk_live_...)
   - **Secret key** (sk_test_... o sk_live_...)

### 2. Configurare le chiavi nell'app

Le chiavi vanno configurate nell'app frontend:

1. Vai su **Settings** nell'app
2. Sezione **Stripe Configuration**
3. Inserisci:
   - Stripe Public Key (Publishable key)
   - Stripe Secret Key (Secret key)
4. Salva

### 3. Configurare i Webhooks (Opzionale ma raccomandato)

I webhooks permettono a Stripe di notificare la tua app quando avvengono eventi.

1. Vai su [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Clicca **Add endpoint**
3. URL endpoint: `http://localhost:3001/api/webhook` (per sviluppo)
   - Per produzione, usa il tuo dominio: `https://tuodominio.com/api/webhook`
4. Eventi da ascoltare:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copia il **Signing secret** (whsec_...)
6. Aggiungi al file `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 🧪 Testare i Pagamenti

### Carte di Test Stripe

Usa queste carte per testare in modalità test:

| Carta | Numero | CVC | Data | Risultato |
|-------|--------|-----|------|-----------|
| Visa Success | 4242 4242 4242 4242 | Qualsiasi 3 cifre | Futuro | ✅ Successo |
| Visa Decline | 4000 0000 0000 0002 | Qualsiasi 3 cifre | Futuro | ❌ Rifiutata |
| Mastercard Success | 5555 5555 5555 4444 | Qualsiasi 3 cifre | Futuro | ✅ Successo |
| Richiede Auth | 4000 0027 6000 3184 | Qualsiasi 3 cifre | Futuro | 🔐 Autenticazione |

[Più carte di test](https://stripe.com/docs/testing#cards)

### Flow di Test

1. Avvia il backend: `npm run dev`
2. Avvia il frontend: `npm run dev` (nella root)
3. Crea un campionato a pagamento come admin
4. Iscriviti con un altro utente
5. Usa una carta di test
6. Verifica il pagamento nel [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments)

---

## 🔐 Sicurezza

### Best Practices Implementate

✅ **Secret Key mai esposta al frontend**
- Le chiavi segrete sono salvate criptate nel database
- Passate al backend solo per la richiesta specifica

✅ **Validazione richieste**
- Tutti i parametri sono validati
- Importi minimi rispettati (0.50 USD)

✅ **Gestione errori dettagliata**
- Errori Stripe specifici gestiti separatamente
- Log degli errori per debugging

✅ **CORS configurato**
- Accesso limitato al frontend autorizzato

### Raccomandazioni per Produzione

1. **Usa HTTPS**: Mai HTTP in produzione
2. **Variabili d'ambiente sicure**: Usa servizi come AWS Secrets Manager
3. **Rate limiting**: Implementa limitazioni per prevenire abusi
4. **Monitoring**: Configura logging e alerting
5. **Database robusto**: Sostituisci IndexedDB con PostgreSQL/MySQL
6. **Backup**: Implementa backup automatici dei dati di pagamento

---

## 📊 Database Payments

Schema per tracciare i pagamenti (vedi `payments_schema.sql`):

```sql
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    payment_intent_id TEXT UNIQUE NOT NULL,
    championship_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    ...
);
```

**Note:**
- Attualmente l'app usa IndexedDB nel browser
- Per produzione, migrare a PostgreSQL/MySQL
- Lo schema è compatibile con entrambi

---

## 🐛 Troubleshooting

### Server non parte

```bash
# Verifica che la porta 3001 sia libera
lsof -i :3001

# Prova una porta diversa
PORT=3002 npm start
```

### Errore "Invalid Stripe API key"

- Verifica di aver configurato le chiavi nelle Settings dell'app
- Usa chiavi di test (iniziano con `sk_test_` e `pk_test_`)
- Controlla che non ci siano spazi extra

### Pagamenti non vanno a buon fine

- Verifica di usare carte di test Stripe
- Controlla i log del backend per errori dettagliati
- Verifica che il frontend chiami `http://localhost:3001` (non 5174)

### Webhook non funziona

- In locale, usa [Stripe CLI](https://stripe.com/docs/stripe-cli) per testare:
  ```bash
  stripe listen --forward-to localhost:3001/api/webhook
  ```
- Verifica che `STRIPE_WEBHOOK_SECRET` sia configurato correttamente

---

## 📚 Risorse Utili

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Payment Intents Guide](https://stripe.com/docs/payments/payment-intents)

---

## 🔄 Prossimi Step

### Implementazioni Future

- [ ] Salvare i pagamenti nel database `payments`
- [ ] Inviare email di conferma dopo il pagamento
- [ ] Gestire rimborsi automatici se campionato cancellato
- [ ] Dashboard admin per visualizzare tutti i pagamenti
- [ ] Report finanziari per admin dei campionati
- [ ] Supporto valute multiple (EUR, GBP, etc.)
- [ ] Integrazione Stripe Customer Portal

---

## 📝 License

Questo progetto fa parte di Alpha Arena. Tutti i diritti riservati.

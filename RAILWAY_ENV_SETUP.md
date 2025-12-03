# 🚂 Configurazione Railway - Variabili d'Ambiente

## ⚠️ Problema: "fetch failed" in produzione

L'errore che vedi è causato dalla mancanza delle variabili d'ambiente nel deployment Railway.

## 📋 Variabili d'Ambiente da Configurare

### 1. Accedi a Railway Dashboard

1. Vai su [https://railway.app](https://railway.app)
2. Accedi con il tuo account
3. Seleziona il progetto **Alpha Arena Backend**

### 2. Configura le Variabili d'Ambiente

Clicca su **Variables** (o Settings → Variables) e aggiungi:

```env
# Supabase Configuration (NECESSARIO per gestione utenti)
SUPABASE_URL=https://ldhjnfzpkjsjplrxiwxp.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_iTuYcSN-E-PhBCItD-iCLA_t1xkScb3

# Alpaca Market Data API (già configurato?)
ALPACA_KEY=PKXWI4DU5YPOUUDL45BSVDQFYR
ALPACA_SECRET=BT3qjpfSEXKVJbS6tHwxpFPtoxBkBfrCKvhPZi6GpVDD

# Frontend URL (per CORS)
FRONTEND_URL=https://alphaarenatrade.com

# Server Configuration
NODE_ENV=production
PORT=3001
```

⚠️ **IMPORTANTE:** 
- `SUPABASE_SERVICE_KEY` è quella che inizia con `sb_secret_...`
- NON usare `SUPABASE_ANON_KEY` nel backend!

### 3. Redeploy del Backend

Dopo aver aggiunto le variabili:
1. Railway farà automaticamente un redeploy
2. Oppure clicca manualmente su **Deploy** → **Redeploy**
3. Aspetta che il deployment sia completato (Status: Active)

### 4. Verifica il Deployment

Controlla i log del backend su Railway:
1. Vai sulla tua app Railway
2. Clicca su **Deployments** → Seleziona l'ultimo deployment
3. Guarda i **Logs**

Dovresti vedere:
```
✅ Supabase Admin client initialized
🚀 Alpha Arena Backend running on http://localhost:3001
```

Se vedi:
```
⚠️  Supabase Admin credentials not found. User management endpoints will not work.
```
Significa che le variabili d'ambiente non sono state caricate correttamente.

---

## 🔍 Verifica URL Backend in Produzione

Assicurati che il frontend punti al backend corretto:

### Opzione 1: Usa la variabile d'ambiente in services/adminService.ts

Il file dovrebbe avere:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Poi su Railway (progetto FRONTEND), aggiungi:
```env
VITE_API_URL=https://amusing-ambition-production-bf0a.up.railway.app
```
(Sostituisci con l'URL reale del tuo backend Railway)

### Opzione 2: Modifica diretta (non raccomandato)

Se non usi variabili d'ambiente, modifica `services/adminService.ts`:
```typescript
const API_BASE_URL = 'https://amusing-ambition-production-bf0a.up.railway.app';
```

---

## 🐛 Troubleshooting

### Errore: "Supabase Admin not initialized"
**Soluzione:**
1. Verifica che `SUPABASE_SERVICE_KEY` sia configurata su Railway
2. Fai un redeploy manuale del backend
3. Controlla i logs per confermare l'inizializzazione

### Errore: "CORS policy" o "Not allowed by CORS"
**Soluzione:**
1. Aggiungi `FRONTEND_URL` con l'URL del tuo frontend
2. Verifica che `FRONTEND_URL=https://alphaarenatrade.com` (senza trailing slash)

### Errore: "Failed to fetch" o "Network error"
**Soluzione:**
1. Verifica che il backend Railway sia attivo (Status: Active)
2. Testa l'URL backend direttamente: `https://[tuo-backend].railway.app/api/health`
3. Controlla che il frontend usi l'URL corretto del backend

### Backend non si avvia
**Soluzione:**
1. Controlla i logs su Railway per errori
2. Verifica che tutte le dipendenze siano installate (`npm install`)
3. Controlla che `package.json` abbia lo script start corretto

---

## 📝 Checklist Deployment Completo

### Backend Railway
- [ ] `SUPABASE_URL` configurato
- [ ] `SUPABASE_SERVICE_KEY` configurato (quella `sb_secret_...`)
- [ ] `ALPACA_KEY` e `ALPACA_SECRET` configurati
- [ ] `FRONTEND_URL` configurato
- [ ] `NODE_ENV=production`
- [ ] Backend deployment attivo
- [ ] Logs mostrano "Supabase Admin client initialized"
- [ ] Health check funziona: `/api/health` risponde con `{"status":"ok"}`

### Frontend Railway (o Vercel/Netlify)
- [ ] `VITE_SUPABASE_URL` configurato
- [ ] `VITE_SUPABASE_ANON_KEY` configurato (quella pubblica)
- [ ] `VITE_API_URL` punta al backend Railway
- [ ] Build completato con successo
- [ ] Sito accessibile su `alphaarenatrade.com`

### Supabase
- [ ] "Enable email sign-ups" **ATTIVATO** in Authentication → Providers → Email
- [ ] RLS (Row Level Security) configurato correttamente
- [ ] Service Role Key è quella corretta

---

## 🎓 Best Practices

1. **Non committare `.env` su Git** - Mai includere chiavi segrete nel repository
2. **Usa variabili d'ambiente diverse per dev/prod** - Separa le configurazioni
3. **Testa localmente prima del deploy** - Verifica che tutto funzioni in locale
4. **Monitora i logs in produzione** - Controlla regolarmente per errori
5. **Backup delle chiavi** - Salva le chiavi in modo sicuro (password manager)

---

**Ultima modifica:** 3 Dicembre 2025
**Ambiente:** Railway Production

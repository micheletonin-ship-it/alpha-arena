# 🤖 AI Scanner Setup Guide

## Overview

Il **Market Scanner** ora utilizza **AI Gemini** centralizzata nel backend per analizzare i titoli e fornire raccomandazioni intelligenti invece del semplice modello euristico.

### Architettura

```
Frontend (Scanner) 
    ↓
Backend API (/api/scanner/analyze)
    ↓
Google Gemini AI (backend key)
    ↓
Cache Supabase (24h)
    ↓
Risultati condivisi tra tutti gli utenti
```

## 🎯 Vantaggi

1. **Efficienza**: 1 analisi per championship (invece di 1 per utente)
2. **Costi ridotti**: 50-100x meno chiamate API
3. **Cache 24h**: Risultati condivisi tra tutti i player
4. **Fallback robusto**: Se AI fallisce → torna a euristica
5. **Zero config utente**: Scanner funziona out-of-box

---

## 📋 Setup Instructions

### 1. Creare tabella cache in Supabase

Esegui lo script SQL:

```bash
# Apri Supabase SQL Editor e esegui:
cat scanner_cache_schema.sql
```

O copia/incolla il contenuto di `scanner_cache_schema.sql` nel SQL Editor di Supabase.

### 2. Configurare Backend Environment

Aggiungi al file `backend/.env`:

```env
# Google Gemini API Key (per AI Scanner)
GEMINI_API_KEY=AIzaSy...your_key_here

# Existing vars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
ALPACA_KEY=PK...
ALPACA_SECRET=...
```

**Dove ottenere GEMINI_API_KEY:**
1. Vai su https://aistudio.google.com/app/apikey
2. Crea un nuovo progetto o seleziona esistente
3. Clicca "Create API Key"
4. Copia la chiave (inizia con `AIzaSy...`)

### 3. Configurare Frontend Environment

Aggiungi o verifica in `.env.local`:

```env
# Backend URL (locale o production)
VITE_BACKEND_URL=http://localhost:3001

# O per production:
# VITE_BACKEND_URL=https://your-backend-on-railway.up.railway.app
```

### 4. Installare dipendenza Backend

Il backend richiede il package `@google/genai`:

```bash
cd backend
npm install @google/genai
```

### 5. Riavviare servizi

```bash
# Backend
cd backend
npm run dev

# Frontend (in altra finestra)
cd ..
npm run dev
```

---

## 🧪 Test del Sistema

### Test 1: Verifica Backend Endpoint

```bash
curl -X POST http://localhost:3001/api/scanner/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "championshipId": "test-championship-id",
    "tickers": ["AAPL", "NVDA", "TSLA"],
    "marketData": [
      {"symbol":"AAPL","name":"Apple","price":178.5,"changePercent":1.2,"volume":"50M","marketCap":"2.8T"},
      {"symbol":"NVDA","name":"NVIDIA","price":895,"changePercent":2.8,"volume":"48M","marketCap":"2.2T"},
      {"symbol":"TSLA","name":"Tesla","price":175,"changePercent":-1.1,"volume":"98M","marketCap":"550B"}
    ]
  }'
```

**Output atteso:**
```json
{
  "success": true,
  "results": [
    {
      "symbol": "AAPL",
      "categoryId": "strat_conservative",
      "reason": "Apple mostra stabilità eccellente..."
    }
  ],
  "source": "AI",
  "timestamp": 1702345678000,
  "cached": false
}
```

### Test 2: Verifica Cache

Ripeti la stessa chiamata - la seconda volta dovrebbe essere **istantanea** e ritornare `"cached": true`.

### Test 3: Test Frontend

1. Apri l'app: http://localhost:5173
2. Login con un account
3. Vai su **Scanner** tab
4. Controlla il badge "Last scan:" 
5. Scanner dovrebbe mostrare risultati AI con ragioni dettagliate

**Prima (Euristica):**
> "Heuristic: conservative profile based on simple market rules."

**Dopo (AI):**
> "Apple mostra stabilità eccellente con volatilità contenuta. Leader tecnologico con business model diversificato e cash flow robusto. Ideale per profilo conservativo."

---

## 🔍 Monitoring & Debug

### Backend Logs

```bash
cd backend
npm run dev
```

Cerca questi log:
```
[Scanner AI] Request received: {...}
[Scanner AI] Cache HIT for championship xyz123
[Scanner AI] Cache MISS - performing AI analysis
[Scanner AI] Calling Gemini API...
[Scanner AI] AI analysis completed: 8 opportunities found
[Scanner AI] Results cached successfully
```

### Frontend Console

Apri DevTools → Console:
```
[Scanner] Calling backend AI endpoint...
[Scanner] Backend AI analysis successful: {results: [...], source: "AI"}
```

### Fallback a Euristica

Se AI fallisce (quota/errore), vedrai:
```
[Scanner] AI analysis error, falling back to heuristic: AI quota exceeded
```

E lo scanner mostrerà comunque risultati (euristici).

---

## 💰 Costi Stimati

### Per Championship con 10 ticker

**Backend Centralizzato:**
- 1 scan/giorno × 10 ticker = **1 chiamata batch**
- Token: ~2000 input + 1000 output = 3k tokens
- Costo: ~$0.002/giorno = **$0.06/mese**

**Con 10 Championships attivi:**
- 10 championships × $0.06 = **$0.60/mese**

### Quota Gemini Free Tier

- **15 richieste/minuto**
- **1500 richieste/giorno**
- **1M richieste/mese**

Con questo setup dovresti usare circa **10-30 richieste/giorno** (una per championship attivo).

---

## 🚨 Troubleshooting

### Error: "GEMINI_API_KEY not configured"

**Soluzione:**
```bash
cd backend
echo "GEMINI_API_KEY=AIzaSy..." >> .env
# Riavvia backend
```

### Error: "AI Quota Exceeded"

**Soluzione:**
- Il sistema fa automaticamente **fallback a euristica**
- Verifica quota su https://aistudio.google.com/
- Considera upgrade a paid plan se necessario

### Error: "Failed to fetch from backend"

**Cause possibili:**
1. Backend non sta girando → `cd backend && npm run dev`
2. CORS issues → Verifica `allowedOrigins` in `backend/server.js`
3. URL errato → Verifica `VITE_BACKEND_URL` in `.env.local`

### Cache non funziona

**Verifica tabella Supabase:**
```sql
SELECT * FROM scanner_cache;
```

Se vuota, controlla:
1. `SUPABASE_SERVICE_KEY` configurato correttamente
2. Permessi tabella (`GRANT ALL ON scanner_cache TO service_role`)

---

## 🎨 Personalizzazione AI Prompt

Per modificare come AI analizza i titoli, edita il prompt in:

`backend/server.js` → endpoint `/api/scanner/analyze`

```javascript
const prompt = `Sei un analista finanziario esperto...

Criteri di valutazione:
- [AGGIUNGI I TUOI CRITERI QUI]
- Trend di prezzo recente
- Volatilità
...
`;
```

---

## 📊 Monitoring Production

### Railway Dashboard

1. Backend logs: https://railway.app/project/your-project/service/backend
2. Cerca "[Scanner AI]" nei logs
3. Monitora chiamate API e cache hits

### Supabase Cache Table

```sql
-- Vedi scan recenti
SELECT 
    championship_id,
    jsonb_array_length(results) as opportunities_count,
    timestamp,
    NOW() - timestamp as age
FROM scanner_cache
ORDER BY timestamp DESC;

-- Cancella cache manualmente (force rescan)
DELETE FROM scanner_cache WHERE championship_id = 'specific-id';
```

---

## 📚 Related Files

- **Backend endpoint**: `backend/server.js` (linea ~900)
- **Frontend service**: `services/marketService.ts` (`scanMarketOpportunities`)
- **Scanner UI**: `Scanner.tsx`
- **Cache schema**: `scanner_cache_schema.sql`
- **Types**: `types.ts` (`ScanResult`, `ScanReport`)

---

## ✅ Checklist Completo

- [ ] Eseguito `scanner_cache_schema.sql` in Supabase
- [ ] Aggiunto `GEMINI_API_KEY` a `backend/.env`
- [ ] Aggiunto `VITE_BACKEND_URL` a `.env.local`
- [ ] Installato `npm install @google/genai` nel backend
- [ ] Riavviato backend con `npm run dev`
- [ ] Riavviato frontend con `npm run dev`
- [ ] Testato endpoint con curl
- [ ] Verificato scanner nell'app
- [ ] Controllato logs per conferma AI analysis
- [ ] Verificato cache hit sulla seconda richiesta

---

## 🚀 Deploy to Production

### Railway (Backend)

1. Aggiungi env var nel Railway dashboard:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```

2. Deploy automatico al push

3. Aggiorna frontend `.env.production`:
   ```
   VITE_BACKEND_URL=https://your-app.up.railway.app
   ```

### Testing Production

```bash
curl -X POST https://your-app.up.railway.app/api/scanner/analyze \
  -H "Content-Type: application/json" \
  -d '{"championshipId":"test","tickers":["AAPL"],"marketData":[...]}'
```

---

## 🎉 Success!

Il tuo AI Scanner è ora operativo! Gli utenti vedranno analisi intelligenti generate da Gemini invece delle semplici euristiche.

**Prossimi step:**
- Monitora utilizzo quota Gemini
- Tweaka il prompt AI per migliorare raccomandazioni
- Consider adding more AI providers (OpenAI, Claude) come fallback

---

**Made with ❤️ for AlphaArena**

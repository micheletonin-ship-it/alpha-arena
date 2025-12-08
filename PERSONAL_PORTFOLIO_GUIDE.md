# 📊 Personal Portfolio - Guida Completa

## Panoramica
Il Personal Portfolio consente agli utenti **Pro** di collegare il proprio account Alpaca e visualizzare le proprie posizioni reali nel Market Overview invece dello scanner AI.

---

## ✅ Requisiti

### 1. Account Pro
- L'account deve essere impostato come `accountType: 'Pro'`
- Solo gli admin possono promuovere account a Pro (per ora)
- Email admin di default: `mtonin@live.it`

### 2. Credenziali Alpaca
- **Paper Trading** consigliato per testing
- API Key e Secret Key da [alpaca.markets](https://alpaca.markets)
- Credenziali vengono criptate nel database

### 3. Feature Abilitata
- Toggle `Personal Portfolio` deve essere attivo nelle Settings
- Questo abilita il campo `personalPortfolioEnabled`

---

## 📋 Come Attivare il Personal Portfolio

### Passo 1: Promuovere Account a Pro
```javascript
// Se sei mtonin@live.it, è già fatto automaticamente
// Altrimenti, un admin deve farlo nel database Supabase:
// UPDATE user_profiles SET account_type = 'Pro' WHERE email = 'tuaemail@example.com';
```

### Passo 2: Configurare Alpaca
1. Vai su https://alpaca.markets
2. Crea un account (gratis)
3. Ottieni le **Paper Trading** API Keys:
   - API Key ID
   - Secret Key
4. **IMPORTANTE**: Usa Paper Trading per evitare rischi

### Passo 3: Abilitare Feature in Alpha Arena
1. Login nell'app
2. Andare in **Settings** ⚙️
3. Nella sezione "Alpaca Trading Configuration":
   - Inserire **API Key**
   - Inserire **Secret Key**
   - Selezionare **Paper** (non Live)
   - Cliccare **"Test Connection"** per verificare
4. Abilitare il toggle **"Enable Personal Portfolio"** ✓
5. Salvare le impostazioni

---

## 🔄 Come Usare il Personal Portfolio

### Switch tra Contexts

Una volta abilitato, vedrai un **dropdown "Trading Context"** nell'header:

**Opzioni:**
- 🏠 **Personal Portfolio** - Mostra le tue posizioni reali da Alpaca
- 🏆 **Championships attivi** - Torna al trading simulato

### Scanner Tab Behavior

**Se sei in Personal Portfolio mode:**
- Il tab "Scanner" mostra **"Market Overview"**
- Visualizza le tue posizioni reali da Alpaca con P/L live
- Mostra top gainers e losers del mercato
- Include un banner che invita a entrare nei Championships per lo scanner AI

**Se sei in Championship mode:**
- Il tab "Scanner" mostra lo **"AI Scanner"** tradizionale
- Suggerimenti AI quotidiani alle 8 AM
- Analisi strategica basata sulle strategie configurate

---

## 🎯 Feature del Personal Portfolio

### 1. Holdings Performance
- **Posizioni reali** dal tuo account Alpaca
- **P/L in tempo reale** (unrealized gain/loss)
- Dettagli per ogni posizione:
  - Symbol
  - Quantity
  - Current Price
  - Average Entry Price
  - Market Value
  - Unrealized P/L ($)
  - Unrealized P/L (%)

### 2. Market Movers
- **Top 5 Gainers** - Migliori performance del giorno
- **Top 5 Losers** - Peggiori performance del giorno
- Link diretti a Google Finance per ogni ticker

### 3. Real-time Data
- Dati aggiornati ogni 30 secondi (invece di 60s dei Championships)
- Polling più frequente per un'esperienza di trading reale

---

## ⚠️ Troubleshooting

### Problema: Non vedo il dropdown "Trading Context"
**Cause:**
- Account non è Pro
- `personalPortfolioEnabled` è false

**Soluzione:**
1. Verifica in Settings che sei Pro
2. Abilita il toggle "Personal Portfolio"
3. Ricarica la pagina

### Problema: Scanner non cambia a "Market Overview"
**Cause:**
- Sei ancora in un Championship attivo
- `personalPortfolioEnabled` non salvato correttamente

**Soluzione:**
1. Usa il dropdown per switchare a "Personal Portfolio"
2. Oppure esci dal Championship corrente
3. Verifica che nelle Settings il toggle sia attivo

### Problema: Errore 401 "unauthorized"
**Cause:**
- Credenziali Alpaca non valide
- Credenziali non decriptate correttamente

**Soluzione:**
1. Clicca "Test Connection" nelle Settings
2. Se fallisce, rigenera le API keys su Alpaca
3. Reinserisci credenziali e salva
4. Assicurati di usare Paper Trading keys

### Problema: "No active positions"
**Cause:**
- Il tuo account Alpaca non ha posizioni aperte
- Credenziali puntano all'account sbagliato (Paper vs Live)

**Soluzione:**
1. Verifica su alpaca.markets che ci siano posizioni
2. Assicurati di usare le chiavi Paper se fai testing
3. Effettua un trade di test su Alpaca per creare una posizione

### Problema: "Alpaca credentials not configured"
**Cause:**
- Nessuna credenziale salvata
- Credenziali salvate ma campo vuoto

**Soluzione:**
1. Vai in Settings
2. Inserisci API Key e Secret Key
3. Clicca "Save Settings"
4. Ricarica la pagina

---

## 🔒 Sicurezza

### Criptazione Credenziali
- Tutte le credenziali Alpaca sono **criptate** prima del salvataggio
- Usa la funzione `encrypt()` da `services/security.ts`
- Decriptazione automatica quando servono via `getAlpacaCredentials()`

### Best Practices
1. **Usa sempre Paper Trading** per testing
2. **Non condividere** le tue API keys
3. **Rigenera keys** se sospetti compromissione
4. **Disabilita Personal Portfolio** quando non in uso

---

## 📊 Architettura Tecnica

### Componenti Chiave

1. **PersonalMarketOverview.tsx**
   - Componente principale per la vista Personal Portfolio
   - Carica posizioni da Alpaca API
   - Mostra market movers

2. **App.tsx - `isPersonalPortfolioMode`**
   ```typescript
   const isPersonalPortfolioMode = !currentChampionshipId && 
                                   currentUser?.accountType === 'Pro' && 
                                   currentUser?.personalPortfolioEnabled;
   ```

3. **database.ts - `getAlpacaCredentials()`**
   - Recupera credenziali criptate dal DB
   - Decripta automaticamente prima di restituire
   - Restituisce `{ key, secret }`

4. **alpacaTradingService.ts**
   - `getPositions(key, secret)` - Carica posizioni
   - `getAccountInfo(key, secret)` - Info account
   - Comunicazione diretta con Alpaca REST API

### Flusso Dati

```
User → Settings → Encrypt Keys → Database (Supabase)
    ↓
App.tsx checks: Pro + personalPortfolioEnabled + no Championship
    ↓
PersonalMarketOverview.tsx
    ↓
db.getAlpacaCredentials(userId) → Decrypt
    ↓
alpacaTradingService.getPositions(key, secret)
    ↓
Alpaca API → Real Positions → Display
```

---

## 🎓 FAQ

**Q: Posso usare Personal Portfolio e Championships insieme?**
A: Sì! Usa il dropdown "Trading Context" per switchare tra i due. Sono completamente separati.

**Q: Le operazioni nel Personal Portfolio sono reali?**
A: Dipende dalle API keys. Se usi Paper Trading, sono simulate su Alpaca. Se usi Live keys (sconsigliato), sono reali.

**Q: Lo scanner AI funziona in Personal Portfolio mode?**
A: No, lo scanner AI è disponibile solo nei Championships. Il Personal Portfolio mostra market movers e posizioni reali.

**Q: Posso fare trading direttamente dal Personal Portfolio?**
A: Attualmente no. Il componente è read-only e mostra solo le posizioni. Il trading va fatto su Alpaca direttamente.

**Q: I dati sono in tempo reale?**
A: Sì, polling ogni 30 secondi per dati freschi da Alpaca.

---

## 📝 Changelog

### v1.0 - Implementazione Iniziale
- ✅ Componente PersonalMarketOverview
- ✅ Integrazione Alpaca API
- ✅ Trading Context switcher
- ✅ Decriptazione credenziali
- ✅ Market movers display
- ✅ Holdings performance tracking

---

## 🚀 Future Enhancements

- [ ] Trading diretto da Personal Portfolio
- [ ] Charts per posizioni
- [ ] Alert personalizzati
- [ ] Export dati in CSV
- [ ] Performance analytics avanzate
- [ ] Multi-account support

---

**Support:** Per problemi, contattare l'amministratore o aprire una issue su GitHub.

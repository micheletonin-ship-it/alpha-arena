# 👥 Gestione Utenti - Admin Panel

Questa guida spiega come utilizzare il sistema di gestione utenti nell'Admin Panel di Alpha Arena.

## 🎯 Funzionalità Implementate

### Backend API Endpoints
- `GET /api/admin/users` - Recupera lista di tutti gli utenti
- `POST /api/admin/users/:id/disable` - Disabilita/banna un utente
- `POST /api/admin/users/:id/enable` - Riabilita un utente bannato
- `DELETE /api/admin/users/:id` - Elimina definitivamente un utente e tutti i suoi dati

### Frontend Features
- ✅ Caricamento lista utenti con dettagli completi
- ✅ Ricerca per nome o email
- ✅ Filtri: Tutti / Attivi / Bannati
- ✅ Badge visivi per stato utente e ruolo admin
- ✅ Azioni: Disabilita, Riabilita, Elimina
- ✅ Conferme di sicurezza per operazioni critiche

---

## 🚀 Setup Iniziale

### 1. ✅ Backend Configurato
Il file `backend/.env` è già stato configurato con:
```env
SUPABASE_URL=https://ldhjnfzpkjsjplrxiwxp.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_iTuYcSN-E-PhBCItD-iCLA_t1xkScb3
```

### 2. ⚠️ Abilita Registrazioni Pubbliche in Supabase

**IMPORTANTE:** Per risolvere l'errore "Signups not allowed", devi abilitare le registrazioni:

1. Vai su [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleziona il tuo progetto **Alpha Arena**
3. Nel menu laterale, clicca su **Authentication**
4. Clicca sulla tab **Providers**
5. Trova **Email** nella lista dei provider
6. Clicca per espandere le opzioni
7. **Assicurati che "Enable email sign-ups" sia ATTIVATO** ✅
8. Clicca **Save**

### 3. Riavvia il Backend

Per applicare le nuove configurazioni:

**Windows:**
```bash
# Ferma il server se è in esecuzione (Ctrl+C)
# Poi riavvialo:
cd backend
node server.js
```

O usa il tuo script:
```bash
stop.bat
start.bat
```

---

## 📖 Come Usare la Gestione Utenti

### Accedere all'Admin Panel

1. Accedi con un account admin
2. Vai nella sezione **Admin** (icona scudo 🛡️)
3. Scorri fino alla sezione **"Gestione Utenti"**

### Caricare la Lista Utenti

1. Clicca il pulsante **"Carica Utenti"** 
2. Il sistema recupera tutti gli utenti registrati da Supabase
3. Vedrai una tabella con:
   - Nome e email dell'utente
   - Badge "Admin" per gli amministratori
   - Stato (Attivo ✓ o Bannato 🚫)
   - Data di registrazione
   - Pulsanti azioni

### Filtrare e Cercare

- **Barra di ricerca:** Cerca per nome o email
- **Filtri rapidi:**
  - **Tutti:** Mostra tutti gli utenti
  - **Attivi:** Solo utenti non bannati
  - **Bannati:** Solo utenti disabilitati

### Azioni Disponibili

#### 🚫 Disabilita Utente (Ban)
- Clicca l'icona **UserX** arancione
- Conferma l'operazione
- L'utente non potrà più accedere all'applicazione
- I suoi dati rimangono nel database

#### ✅ Riabilita Utente (Unban)
- Clicca l'icona **UserCheck** verde (appare solo per utenti bannati)
- Conferma l'operazione
- L'utente può di nuovo accedere

#### 🗑️ Elimina Utente (Permanente)
- Clicca l'icona **Trash** rossa
- **ATTENZIONE:** Questa azione è **IRREVERSIBILE**
- Conferma con attenzione
- Elimina:
  - Account auth Supabase
  - Profilo utente
  - Tutte le transazioni
  - Tutti gli holdings
  - Partecipazioni ai campionati

---

## 🔒 Sicurezza

### Service Role Key
La chiave `SUPABASE_SERVICE_KEY` è **molto potente** e:
- ✅ Bypassa tutte le regole RLS (Row Level Security)
- ✅ Può leggere/modificare/eliminare qualsiasi dato
- ❌ **NON DEVE MAI** essere esposta nel frontend
- ❌ **NON DEVE** essere committata su Git (già in `.gitignore`)

### Best Practices
1. Solo gli admin possono accedere a queste funzioni
2. Tutte le azioni richiedono conferma
3. Le operazioni sono loggiate nella console del server
4. In produzione, usa le variabili d'ambiente di Railway

---

## 🐛 Troubleshooting

### Errore: "Supabase Admin not initialized"
**Causa:** `SUPABASE_SERVICE_KEY` non configurata o server non riavviato
**Soluzione:** 
1. Verifica `backend/.env`
2. Riavvia il server backend

### Errore: "Signups not allowed for this instance"
**Causa:** Registrazioni pubbliche disabilitate in Supabase
**Soluzione:** Segui il punto 2 del Setup Iniziale sopra

### Utenti non si caricano
**Causa:** Problema di connessione o CORS
**Soluzione:**
1. Verifica che il backend sia avviato su `http://localhost:3001`
2. Controlla la console browser per errori
3. Verifica i log del server backend

### Eliminazione utente fallisce
**Causa:** Possibili dati orfani o vincoli di integrità
**Soluzione:**
1. Controlla i log del server per l'errore specifico
2. Verifica che tutte le tabelle correlate esistano
3. L'utente auth viene comunque eliminato

---

## 🚀 Deploy in Produzione (Railway)

Quando fai il deploy su Railway, aggiungi queste variabili d'ambiente:

```
SUPABASE_URL=https://ldhjnfzpkjsjplrxiwxp.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_iTuYcSN-E-PhBCItD-iCLA_t1xkScb3
```

**Non committare mai il file `.env` su Git!**

---

## 📊 Architettura

```
Frontend (AdminPanel.tsx)
    ↓ calls
Frontend Service (adminService.ts)
    ↓ HTTP requests
Backend API (server.js)
    ↓ uses
Supabase Admin Client (Service Role Key)
    ↓ manages
Supabase Auth + Database
```

---

## 🎓 Prossimi Step Suggeriti

- [ ] Configura SMTP per email di conferma professionali
- [ ] Aggiungi export CSV lista utenti
- [ ] Implementa statistiche utenti (totali, attivi, nuovi)
- [ ] Aggiungi log delle azioni admin
- [ ] Crea ruoli personalizzati (moderatore, supporto, etc.)

---

**Creato il:** 3 Dicembre 2025
**Versione:** 1.0.0
**Autore:** Cline AI Assistant

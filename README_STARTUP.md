# 🚀 Alpha Arena - Guida Rapida Avvio

## ⚡ Avvio Rapido (Windows)

### Avviare l'applicazione:
1. **Doppio click su `start.bat`**
2. Si apriranno 2 finestre:
   - **Backend**: http://localhost:3001
   - **Frontend**: http://localhost:5173
3. Vai su http://localhost:5173 nel browser

### Fermare l'applicazione:
1. **Doppio click su `stop.bat`**
2. Chiuderà automaticamente backend e frontend

---

## 📝 Note

- **Prima volta**: Assicurati di aver eseguito `npm install` nella root e in `backend/`
- I file .bat aprono nuove finestre Command Prompt
- Puoi chiudere la finestra iniziale dopo l'avvio
- Per chiudere manualmente: `Ctrl+C` in ogni finestra

---

## 🔧 Troubleshooting

### "npm non riconosciuto"
- Assicurati di avere Node.js installato
- Riavvia il computer dopo l'installazione

### Porta già in uso
- Ferma i servizi con `stop.bat`
- Oppure cambia porta in `backend/server.js` (PORT)

### Backend non si connette
- Verifica che il backend sia su porta 3001
- Controlla la console per errori

---

Per documentazione completa: vedi `STRIPE_IMPLEMENTATION.md`

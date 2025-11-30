# 🏆 Alpha Arena - Trading Championship Platform

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/)

**Una piattaforma competitiva per trading simulato con AI-powered insights, pagamenti Stripe e classifiche in tempo reale.**

[🚀 Demo Live](#) | [📖 Documentazione](#documentation) | [💬 Discord](#) | [🐛 Report Bug](https://github.com/micheletonin-ship-it/alpha-arena/issues)

</div>

---

## 📋 Indice

- [✨ Features](#-features)
- [🏗️ Architettura](#️-architettura)
- [🚀 Quick Start](#-quick-start)
- [🌐 Deployment](#-deployment)
- [🔧 Configurazione](#-configurazione)
- [💳 Pagamenti Stripe](#-pagamenti-stripe)
- [📚 Documentazione](#-documentazione)
- [🤝 Contributing](#-contributing)

---

## ✨ Features

### 🎮 Trading Competitivo
- **Championships**: Crea e partecipa a campionati di trading con prize pool
- **Portfolio Management**: Gestione completa del portafoglio con tracking real-time
- **Leaderboard**: Classifiche dinamiche con ranking e performance
- **Trading Simulato**: Compra/vendi azioni con dati di mercato reali

### 🤖 AI-Powered
- **Smart Scanner**: Analisi automatica dei trend di mercato con Google Gemini AI
- **Trading Agent**: Agente AI che suggerisce strategie di trading
- **Market Insights**: Report e analisi generate da AI
- **Chat Assistant**: Chatbot per assistenza e informazioni

### 💰 Sistema Pagamenti
- **Stripe Integration**: Pagamenti sicuri per enrollment nei championship
- **Webhook Automation**: Auto-enrollment automatico dopo pagamento
- **Payment History**: Storico completo delle transazioni
- **Multi-Currency**: Supporto per multiple valute

### 📊 Analytics & Monitoring
- **Real-time Stats**: Statistiche portfolio in tempo reale
- **Activity Feed**: Timeline di tutte le operazioni
- **Performance Charts**: Grafici interattivi delle performance
- **Agent Monitoring**: Dashboard per monitorare trading agent AI

---

## 🏗️ Architettura

```
Alpha Arena
├── Frontend (React + TypeScript + Vite)
│   ├── Components (UI Components)
│   ├── Services (API, Database, AI)
│   └── Types (TypeScript definitions)
│
├── Backend (Node.js + Express)
│   ├── Stripe Webhooks
│   ├── Payment Processing
│   └── Database Operations
│
└── Database (Supabase PostgreSQL)
    ├── User Profiles
    ├── Championships
    ├── Transactions
    ├── Holdings
    └── Payments
```

### 🛠️ Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (Build tool)
- Lucide Icons
- Stripe Elements

**Backend:**
- Node.js + Express
- Stripe SDK
- Supabase Client

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time subscriptions

**AI/ML:**
- Google Gemini API
- Natural Language Processing
- Market Analysis

**Deployment:**
- Railway.app (Backend & Frontend)
- Supabase Cloud (Database)
- GitHub (Version Control)

---

## 🚀 Quick Start

### Prerequisiti

- Node.js >= 18.0.0
- npm >= 9.0.0
- Account Supabase
- Account Stripe (test keys)
- Git

### Installazione Locale

1. **Clone repository**
   ```bash
   git clone https://github.com/micheletonin-ship-it/alpha-arena.git
   cd alpha-arena
   ```

2. **Installa dependencies frontend**
   ```bash
   npm install
   ```

3. **Installa dependencies backend**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configura environment variables**
   
   **Frontend** - Crea `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Compila:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_GEMINI_API_KEY=your-gemini-key
   ```

   **Backend** - Crea `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Compila:
   ```env
   NODE_ENV=development
   PORT=3001
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-role-key
   FRONTEND_URL=http://localhost:5173
   STRIPE_WEBHOOK_SECRET=your-webhook-secret
   ```

5. **Setup Database**
   - Vai su [Supabase Dashboard](https://supabase.com/dashboard)
   - Esegui SQL da `SQL_SETUP.md` nel SQL Editor
   - Verifica che la tabella `payments` sia creata

6. **Avvia l'applicazione**
   
   **Terminale 1 - Backend:**
   ```bash
   cd backend
   npm start
   ```

   **Terminale 2 - Frontend:**
   ```bash
   npm run dev
   ```

7. **Apri nel browser**
   ```
   http://localhost:5173
   ```

---

## 🌐 Deployment

### Railway Deployment (Production)

Per deployare su Railway.app, segui la guida completa:

📖 **[RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md)** - Guida step-by-step completa

**Quick Summary:**

1. Push codice su GitHub
2. Login Railway con GitHub
3. Deploy Backend (root: `/backend`)
4. Deploy Frontend (root: `/`)
5. Configura Stripe Webhook
6. Test end-to-end

**Tempo stimato:** ~15-20 minuti

---

## 🔧 Configurazione

### Database Setup

Configura il database Supabase:

📖 **[SQL_SETUP.md](SQL_SETUP.md)** - Script SQL completo

Include:
- Tabella `payments` con RLS policies
- Indexes per performance
- Triggers automatici
- Verifiche e troubleshooting

### Stripe Configuration

1. **Dashboard Stripe** → Developers → API Keys
2. Copia chiavi test:
   - `Publishable key` (pk_test_...)
   - `Secret key` (sk_test_...)
3. **Webhook Setup:**
   - URL: `https://your-backend.railway.app/api/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

📖 **[STRIPE_IMPLEMENTATION.md](STRIPE_IMPLEMENTATION.md)** - Implementazione dettagliata

---

## 💳 Pagamenti Stripe

### Come Funziona

1. **Admin crea Championship** con enrollment fee
2. **User seleziona Championship** e click "Pay & Join"
3. **Stripe Payment Form** → Utente inserisce carta
4. **Payment Intent** creato e processato
5. **Webhook** riceve conferma pagamento
6. **Auto-enrollment** → User riceve starting cash automaticamente
7. **Database** → Payment salvato, transaction creata

### Carte Test Stripe

```
Successo: 4242 4242 4242 4242
Decline:  4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155

CVC: qualsiasi 3 cifre
Data: qualsiasi data futura
```

### Flow Diagram

```
User → Championship → Pay Button → Stripe Form
  ↓
Payment Intent Created
  ↓
Stripe Processes Payment
  ↓
Webhook → Backend /api/webhook
  ↓
Save Payment → Supabase
  ↓
Auto-enrollment → Add starting cash
  ↓
User can start trading! 🎉
```

---

## 📚 Documentazione

### Guide Principali

| Documento | Descrizione |
|-----------|-------------|
| [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md) | Guida deployment completa su Railway |
| [SQL_SETUP.md](SQL_SETUP.md) | Setup database Supabase con SQL scripts |
| [STRIPE_IMPLEMENTATION.md](STRIPE_IMPLEMENTATION.md) | Implementazione pagamenti Stripe |
| [README_STARTUP.md](README_STARTUP.md) | Guida startup locale dettagliata |

### File Configurazione

| File | Scopo |
|------|-------|
| `.env.example` | Template env variables frontend |
| `backend/.env.example` | Template env variables backend |
| `vite.config.ts` | Configurazione Vite |
| `backend/railway.json` | Configurazione Railway |
| `tsconfig.json` | Configurazione TypeScript |

### API Reference

**Backend Endpoints:**

```
GET  /api/health                - Health check
POST /api/create-payment-intent - Crea Stripe PaymentIntent
POST /api/confirm-payment       - Conferma pagamento
POST /api/webhook               - Stripe webhook handler
```

**Frontend API Service:**

```typescript
import { api } from './services/api';

// Health check
await api.healthCheck();

// Create payment
await api.createPaymentIntent({ amount, currency, championshipId, stripeSecretKey });

// Confirm payment
await api.confirmPayment({ paymentIntentId, stripeSecretKey });
```

---

## 🤝 Contributing

Contributi sono benvenuti! Ecco come:

1. **Fork** il repository
2. **Crea** un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. **Push** al branch (`git push origin feature/AmazingFeature`)
5. **Apri** una Pull Request

### Development Guidelines

- ✅ Usa TypeScript per type safety
- ✅ Segui ESLint rules
- ✅ Commenta codice complesso
- ✅ Testa prima di commit
- ✅ Scrivi commit messages descrittivi

---

## 📞 Supporto

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/micheletonin-ship-it/alpha-arena/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/micheletonin-ship-it/alpha-arena/discussions)
- 📧 **Email**: support@alpha-arena.com
- 🌐 **Website**: https://alpha-arena.com

---

## 📝 License

Questo progetto è sotto licenza MIT - vedi il file [LICENSE](LICENSE) per dettagli.

---

## 🙏 Ringraziamenti

- [Supabase](https://supabase.com) - Database e Auth
- [Stripe](https://stripe.com) - Payment processing
- [Railway](https://railway.app) - Hosting e deployment
- [Google Gemini](https://ai.google.dev) - AI capabilities
- [React](https://reactjs.org) - UI framework
- [Vite](https://vitejs.dev) - Build tool

---

<div align="center">

**⭐ Se questo progetto ti è utile, lascia una stella su GitHub! ⭐**

Made with ❤️ by [Michele Tonin](https://github.com/micheletonin-ship-it)

</div>

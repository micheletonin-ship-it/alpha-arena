# Supabase Auth Email Confirmation Setup

## Step 1: Configurazione Supabase Dashboard

1. **Vai su [supabase.com](https://supabase.com)** e apri il tuo progetto
2. **Naviga in:** Authentication → Providers → Email
3. **Abilita le seguenti opzioni:**
   - ✅ `Enable Email Provider`
   - ✅ `Confirm email` 
   - ✅ `Secure email change` (opzionale ma raccomandato)

4. **Configura il Redirect URL:**
   - Development: `http://localhost:5173/auth/callback`
   - Production: `https://tuo-dominio.com/auth/callback`

## Step 2: Email Templates (Opzionale)

1. **Vai in:** Authentication → Email Templates
2. **Personalizza il template "Confirm signup":**

```html
<h2>Conferma la tua registrazione</h2>
<p>Ciao {{ .ConfirmationURL }},</p>
<p>Grazie per esserti registrato su AlphaArena!</p>
<p>Clicca sul link qui sotto per confermare il tuo indirizzo email:</p>
<p><a href="{{ .ConfirmationURL }}">Conferma Email</a></p>
```

## Step 3: SMTP Settings (Se vuoi email custom)

Di default Supabase usa il loro SMTP. Per email personalizzate:
1. Authentication → Settings → SMTP Settings
2. Configura con il tuo provider (SendGrid, AWS SES, etc.)

## Note Importanti

- Gli utenti NON confermati non potranno fare login finché non confermano l'email
- Il link di conferma è valido per 24 ore
- Supabase gestisce automaticamente rate limiting e sicurezza

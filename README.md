# Hermes Agent

MVP vocale di Hermes: premi il microfono, parla, ricevi una risposta testuale e ascoltala ad alta voce.

## Funzioni incluse

- Chat testuale con Hermes
- Riconoscimento vocale in italiano tramite Web Speech API
- Invio automatico della trascrizione
- Risposta generata tramite OpenAI Responses API
- Lettura vocale automatica della risposta
- Pulsante per interrompere la voce
- Conversazione mantenuta durante la sessione del browser

## Avvio locale

1. Installa Node.js 20 o successivo.
2. Installa le dipendenze:

```bash
npm install
```

3. Copia il file delle variabili:

```bash
cp .env.example .env.local
```

Su Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

4. Inserisci la tua chiave nel file `.env.local`:

```env
OPENAI_API_KEY=sk-proj-...
```

5. Avvia Hermes:

```bash
npm run dev
```

Apri `http://localhost:3000` con Google Chrome o Microsoft Edge e autorizza il microfono.

## Deploy su Vercel

1. Importa questa repository in un nuovo progetto Vercel.
2. In **Settings → Environment Variables**, aggiungi:
   - Nome: `OPENAI_API_KEY`
   - Valore: la tua chiave API OpenAI
3. Esegui il deploy.

Non inserire mai la chiave API nel codice, nei file pubblici o in GitHub.

## Limiti del primo MVP

Il riconoscimento vocale dipende dal supporto Web Speech API del browser. Per il primo test usa Chrome o Edge. In una fase successiva si potrà passare alla Realtime API per una conversazione vocale continua e più naturale.

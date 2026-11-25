# Keepa Buyer

Pannello grafico in italiano per usare gli avvisi Keepa come trigger di un tentativo d’acquisto su Amazon.it. Puoi scegliere una delle due fonti: messaggi Keepa ricevuti su Telegram, oppure la pagina Keepa **Tracking → Notifiche recenti**. Il secondo metodo usa il sito e non richiede Keepa API. Playwright controlla il browser Amazon autenticato e, se selezionato, quello del sito Keepa.

## Cosa fa

1. Legge i nuovi avvisi Keepa da Telegram oppure controlla periodicamente **Notifiche recenti** nel sito Keepa.
2. Ricava ASIN e prezzo dal messaggio o dalla riga dell’avviso e inoltra i dati al runner.
3. Cerca le offerte Amazon dello stesso ASIN entro quel tetto di prezzo.
4. Se l’acquisto automatico è attivo, controlla carrello e totale e prova a inviare l’ordine.

Keepa resta la fonte dei criteri di tracking e dell’avviso. Come richiesto, il runner non applica un secondo filtro per venditore o condizione: seleziona l’offerta più economica dell’ASIN entro il prezzo dell’avviso. Se vuoi che il venditore o la condizione siano vincolanti anche nel checkout, il codice attuale non li verifica.

Il prezzo dell’avviso è anche il limite massimo del totale dell’ordine, spedizione inclusa. Non viene aggiunto un margine: gli ordini con spedizione a pagamento oltre il prezzo indicato vengono fermati.

## Avvio su Windows

1. Clona il repository GitHub oppure scaricane ed estrai l’intera cartella. Non avviare l’EXE direttamente dentro un archivio.
2. Installa Node.js 20 o superiore.
3. Fai doppio clic su `KeepaBuyer.exe`.
4. Scegli **Telegram · messaggi Keepa** oppure **Sito Keepa · Notifiche recenti** e salva.
5. Per Telegram, premi **Inserisci** e salva `api_id` e `api_hash`, poi collega Telegram. Il programma cerca l’ultimo avviso Keepa nella cronologia recente e compila l’ID mittente; se non lo trova, lo rileva al primo avviso Keepa valido mentre il monitoraggio è in prova. Per il sito Keepa, premi **Accedi / verifica**, accedi nella finestra che si apre e premi **Conferma** nel pannello quando è visibile la pagina Tracking.
6. Premi **Accedi / verifica** per Amazon. Il pannello mostra lo stato della sessione Amazon verificata.
7. Avvia il monitoraggio in modalità prova e controlla gli eventi. La prima lettura del sito Keepa serve da riferimento e ignora gli avvisi già visibili: saranno presi in considerazione solo quelli che compaiono dopo l’avvio.
8. Quando hai verificato il flusso, premi **Abilita acquisto automatico** e conferma nel popup del pannello. Gli eventi già elaborati in prova non vengono ripetuti.

L’acquisto automatico è disattivato all’avvio. Per Telegram richiede la sessione Telegram, la verifica Amazon e l’ID mittente Keepa. Per il sito Keepa richiede la sessione Keepa e la verifica Amazon. Cambiare fonte spegne sempre gli acquisti automatici, che dovranno essere riabilitati dopo aver controllato la nuova modalità. La conferma appare come popup interno al pannello.

Le credenziali `api_id`/`api_hash` hanno un indicatore: verde quando sono salvate, rosso quando vanno inserite. **Modifica** o **Inserisci** apre i campi senza mostrare i valori già salvati; lo stato di accesso all’account Telegram resta indicato separatamente nella scheda di collegamento.

### Sessioni e profili browser

Amazon usa un profilo persistente in `data/amazon-profile`; il sito Keepa usa `data/keepa-profile`; Telegram usa `data/telegram.session`. Il launcher termina dopo aver avviato il server: chiudere il browser del pannello non cancella le sessioni e non ferma il servizio. Sullo stesso PC e nella stessa cartella, di norma non occorre rifare l’accesso dopo aver riaperto il launcher. Amazon o Keepa possono comunque richiedere nuovamente accesso o verifica di sicurezza. Se sposti il progetto senza la cartella `data`, dovrai collegare di nuovo gli account.

L’indicatore mostra le identità verificate per Telegram e Amazon e la presenza della sessione Keepa confermata. Keepa non espone qui un nome account: il pannello mostra “Sessione Keepa verificata”. Gli indicatori leggono lo stato locale salvato e non verificano continuamente l’accesso remoto.

### Uso della sorgente sito Keepa

Il browser Keepa resta aperto mentre il monitoraggio è in funzione e controlla **Notifiche recenti** ogni cinque secondi. Il lettore usa il contenuto visibile della pagina, quindi una modifica del sito può richiedere un aggiornamento del programma. Non usa API né un piano API Keepa. La lettura automatica del DOM non è stata ancora verificata sulla pagina Keepa autenticata dell’utente: avvia prima in modalità prova e controlla che ASIN e prezzo riportati nel pannello siano corretti. Se la scheda non compare o i dati sono ambigui, il lettore registra l’errore e salta quella riga.

### Che cos’è l’EXE

`KeepaBuyer.exe` è un launcher silenzioso di prova, non un’applicazione autosufficiente. Facendo doppio clic si apre direttamente il pannello nel browser, senza mostrare una finestra del launcher. Richiede Node.js e i file `src`, `public` e `package.json` nella stessa cartella. Al primo avvio installa i pacchetti npm e Chromium mancanti; per questa operazione serve una connessione internet. Se l’avvio fallisce appare una finestra di errore; i dettagli sono registrati in `data/launcher.log`.

Su Windows il servizio usa la porta locale `8788`, così può convivere con una versione precedente in ascolto sulla `8787`. Il server e il monitoraggio restano in esecuzione in background anche dopo l’apertura del pannello. Il pulsante **Ferma** arresta il lettore della fonte selezionata; un comando grafico per arrestare anche il server non è ancora disponibile.

Per ricreare l’EXE da un ambiente Windows con PowerShell 5.1, esegui `build-windows-exe.ps1` dalla cartella del progetto.

## Avvio su Linux / VPS

La versione Linux usa gli stessi sorgenti, senza l’EXE Windows. Con Node.js 20 o superiore installato, esegui:

```bash
node src/launch.mjs
```

Il servizio ascolta solo su localhost, di norma sulla porta `8787`. Dal PC crea un tunnel SSH:

```bash
ssh -L 8787:127.0.0.1:8787 utente@server
```

Poi apri `http://127.0.0.1:8787` nel browser del PC. Chromium può richiedere librerie di sistema sulla VPS; l’accesso Amazon tramite browser visibile richiede inoltre un display remoto o virtuale. Il progetto non include ancora un servizio `systemd` per il riavvio automatico dopo un reboot.

## Configurazione e file

- `.env.example`: esempio senza credenziali personali. Il pannello crea/aggiorna `.env` quando salvi la configurazione.
- `data/amazon-profile/`: profilo persistente del browser Amazon.
- `data/keepa-profile/`: profilo persistente del sito Keepa, se selezionato.
- `data/telegram.session`: sessione Telegram.
- `data/telegram-account.json`, `data/amazon-account.json`, `data/keepa-account.json`: stato/identità mostrate nel pannello.
- `data/processed.json`: registro locale degli eventi già ricevuti, per ignorare i duplicati.
- `data/server.log`, `data/launcher.log`: log tecnici.

Non caricare `.env` o `data/` su GitHub: possono contenere credenziali, cookie e sessioni. `.gitignore` li esclude; il repository include `.env.example` senza dati personali.

## Controlli e limiti del checkout

- Accetta link Amazon.it e ASIN validi.
- Usa il prezzo attuale dell’avviso sia come tetto dell’articolo sia come tetto del totale ordine, spedizione inclusa.
- Controlla che il carrello contenga un solo articolo e che l’ASIN corrisponda all’avviso.
- Usa l’indirizzo e il metodo di pagamento mostrati da Amazon nel profilo autenticato; il programma non li seleziona né li verifica.
- Non compila CAPTCHA, MFA, password, indirizzi o dati carta e non recupera automaticamente pagamenti rifiutati.
- Se dopo il click finale non riconosce una conferma, registra l’evento come fermato. Controlla **I miei ordini** prima di riprovare: Amazon potrebbe aver creato un ordine in sospeso.
- Ogni ID evento viene gestito una sola volta. Anche un evento in prova o fermato non viene ripetuto se la sorgente lo rinvia con lo stesso ID.

Amazon e Keepa possono modificare le proprie pagine. I selettori del checkout e il lettore delle notifiche Keepa dal sito non sono ancora stati verificati con gli account dell’utente o con un ordine reale; prima di abilitare gli acquisti controlla gli eventi in modalità prova.

## API locale

Il server è accessibile solo su localhost. L’endpoint `POST /trigger` richiede l’header `Authorization: Bearer <HOOK_SECRET>` e un JSON come:

```json
{
  "notificationId": "keepa-event-id",
  "asin": "B0XXXXXXXX",
  "maxItemCents": 12000,
  "maxTotalCents": 12500
}
```

I prezzi sono in centesimi di euro. Sono disponibili anche `GET /health` e `GET /events/<notificationId>`.

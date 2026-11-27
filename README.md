# Keepa Buyer

Pannello grafico in italiano e inglese per usare gli avvisi Keepa come trigger di un tentativo d’acquisto sui marketplace Amazon europei. Il marketplace viene ricavato dal link Amazon nell’avviso; Amazon.co.uk è escluso. Sono supportati amazon.de, amazon.fr, amazon.it, amazon.es, amazon.nl, amazon.com.be, amazon.ie, amazon.pl e amazon.se. Puoi scegliere una delle due fonti: messaggi Keepa ricevuti su Telegram, oppure la pagina Keepa **Tracking → Notifiche recenti**. Il secondo metodo usa il sito e non richiede Keepa API. Playwright controlla il browser Amazon autenticato e, se selezionato, quello del sito Keepa. [Elenco ufficiale degli Amazon Europe store](https://sell.amazon.de/en/programme/verkaufen-in-ganz-europa).

## Cosa fa

1. Legge i nuovi avvisi Keepa da Telegram oppure controlla periodicamente **Notifiche recenti** nel sito Keepa.
2. Ricava ASIN, prezzo e marketplace dal messaggio o dal link nella riga dell’avviso e inoltra i dati al runner.
3. Cerca le offerte sullo stesso marketplace Amazon, nello stesso ASIN e nella valuta dell’avviso.
4. Se l’acquisto automatico è attivo, controlla carrello e totale e prova a inviare l’ordine.

Keepa resta la fonte dei criteri di tracking e dell’avviso. Come richiesto, il runner non applica un secondo filtro per venditore o condizione: seleziona l’offerta più economica dell’ASIN entro il prezzo dell’avviso. Se vuoi che il venditore o la condizione siano vincolanti anche nel checkout, il codice attuale non li verifica.

Il prezzo dell’avviso è anche il limite massimo del totale dell’ordine, spedizione inclusa. Non viene aggiunto un margine: gli ordini con spedizione a pagamento oltre il prezzo indicato vengono fermati.

## Avvio su Windows

1. Clona il repository GitHub oppure scaricane ed estrai l’intera cartella. Non avviare l’EXE direttamente dentro un archivio.
2. Installa Node.js 20 o superiore.
3. Fai doppio clic su `KeepaBuyer.exe`.
4. Scegli **Telegram · messaggi Keepa** oppure **Sito Keepa · Notifiche recenti** e salva.
5. Per Telegram, premi **Inserisci** e salva `api_id` e `api_hash`, poi collega Telegram. Il programma controlla fino a 50 messaggi nelle chat chiamate Keepa tra i dialoghi recenti, poi usa la ricerca globale Telegram in più lingue. Se trova un solo mittente, salva l’ID quando il campo è vuoto; se rileva un ID configurato diverso, lo segnala senza sovrascriverlo. Se non trova corrispondenze, può apprendere il mittente dal primo avviso valido in modalità prova. Per il sito Keepa, accedi nella finestra che si apre e premi **Conferma** nel pannello quando è visibile la pagina Tracking.
6. Premi **Accedi ad Amazon** per la verifica iniziale. Quando l’account è già connesso, il pulsante diventa **Verifica account**.
7. Avvia il monitoraggio in modalità prova e controlla gli eventi. La prima lettura del sito Keepa serve da riferimento e ignora gli avvisi già visibili: saranno presi in considerazione solo quelli che compaiono dopo l’avvio.
8. Quando hai verificato il flusso, premi **Abilita acquisto automatico** e conferma nel popup del pannello. Gli eventi già elaborati in prova non vengono ripetuti.

L’acquisto automatico è disattivato all’avvio. Per Telegram richiede la sessione Telegram, la verifica Amazon e l’ID mittente Keepa. Per il sito Keepa richiede la sessione Keepa e la verifica Amazon. Cambiare fonte spegne sempre gli acquisti automatici, che dovranno essere riabilitati dopo aver controllato la nuova modalità. La conferma appare come popup interno al pannello.

Le credenziali `api_id`/`api_hash` hanno un indicatore: verde quando sono salvate, rosso quando vanno inserite. **Modifica** o **Inserisci** apre i campi senza mostrare i valori già salvati; lo stato dell’account Telegram resta indicato separatamente. La pagina ha un pulsante con bandiera in alto per passare da italiano a inglese; la lingua scelta viene salvata nel browser.

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

- Accetta link dei marketplace Amazon europei supportati e ASIN validi; il Regno Unito è escluso. Telegram usa il link del pulsante Amazon Keepa. Keepa web elabora solo righe con un link Amazon europeo univoco per l’ASIN.
- Usa il prezzo attuale dell’avviso nella valuta del marketplace sia come tetto dell’articolo sia come tetto del totale ordine, spedizione inclusa. Sono gestiti EUR, PLN e SEK.
- Controlla che il carrello contenga un solo articolo e che l’ASIN corrisponda all’avviso.
- Usa l’indirizzo e il metodo di pagamento mostrati da Amazon nel profilo autenticato; il programma non li seleziona né li verifica.
- Non compila CAPTCHA, MFA, password, indirizzi o dati carta e non recupera automaticamente pagamenti rifiutati.
- Se dopo il click finale non riconosce una conferma, registra l’evento come fermato. Controlla **I miei ordini** prima di riprovare: Amazon potrebbe aver creato un ordine in sospeso.
- Ogni ID evento viene gestito una sola volta. Anche un evento in prova o fermato non viene ripetuto se la sorgente lo rinvia con lo stesso ID.

Amazon e Keepa possono modificare le proprie pagine. I selettori del checkout, i link per ciascun marketplace e il lettore delle notifiche Keepa dal sito non sono ancora stati verificati con gli account dell’utente o con un ordine reale. Il profilo Amazon è condiviso tra i marketplace; se il marketplace dell’avviso richiede un nuovo accesso, il tentativo si ferma prima dell’ordine. Prima di abilitare gli acquisti controlla gli avvisi in modalità prova sui paesi che usi.

## API locale

Il server è accessibile solo su localhost. L’endpoint `POST /trigger` richiede l’header `Authorization: Bearer <HOOK_SECRET>` e un JSON come:

```json
{
  "notificationId": "keepa-event-id",
  "asin": "B0XXXXXXXX",
  "marketplaceHost": "www.amazon.de",
  "maxItemCents": 12000,
  "maxTotalCents": 12000
}
```

`maxItemCents` e `maxTotalCents` sono unità minori della valuta del marketplace (ad esempio centesimi EUR, grosz PLN o öre SEK). Sono disponibili anche `GET /health` e `GET /events/<notificationId>`.


## Avvio automatico

- Il monitoraggio parte da solo all'apertura del programma e, se si chiude per un errore, viene riavviato con attese crescenti (10 s, 20 s… fino a 5 minuti). Per disattivarlo: `AUTO_START_MONITOR=false` nel file `.env`. Se premi **Ferma** nel pannello, resta fermo fino a quando lo riavvii.
- **Windows:** doppio clic su `Attiva avvio automatico.cmd` per avviare Keepa Buyer in background 20 secondi dopo ogni accesso a Windows, senza aprire il pannello (http://127.0.0.1:8788). Per toglierlo usa `Disattiva avvio automatico.cmd`. Non servono permessi di amministratore.
- **VPS Linux:** `sudo bash deploy/install-linux-service.sh` installa il servizio systemd `keepa-buyer`: parte all'avvio del server, riparte se si chiude e usa il browser senza schermo (`HEADLESS=true`).

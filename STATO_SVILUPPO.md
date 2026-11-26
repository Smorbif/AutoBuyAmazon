# Stato dello sviluppo — Keepa Buyer

**Aggiornato:** 26 novembre 2026
**Stato:** prototipo grafico Windows/Linux con due sorgenti notifiche (Telegram o sito Keepa), pronto per una prova controllata. L’estrazione dal sito Keepa e l’acquisto reale Amazon non sono stati collaudati con gli account dell’utente.

## Stato della revisione corrente

- La revisione include il selettore italiano/inglese nell’intestazione e mantiene la lingua scelta nel browser.
- Il pulsante Telegram riflette la sessione già riconosciuta: propone la verifica dell’account invece di invitare a collegarlo di nuovo.
- Gli avvisi Keepa vengono associati al marketplace Amazon indicato dal link, tra gli store europei supportati; il Regno Unito resta escluso. I prezzi sono trattati nella valuta del marketplace.
- Per rendere effettivi i cambiamenti ai listener e al checkout occorre riavviare l’applicazione. La navigazione dell’interfaccia aggiornata basta invece per caricare i testi IT/EN.
- Stato delle verifiche: controlli statici completati; autenticazione Keepa, parsing live dei marketplace e checkout reale non sono stati provati con gli account dell’utente.

## Correzione login Amazon — 26 novembre 2026

- La finestra usa il profilo Amazon persistente. Se la sessione è già attiva, il programma ora controlla automaticamente il saluto dell’account e salva identità e stato senza richiedere un nuovo login.
- Se serve autenticarsi, il controllo continua mentre l’utente completa l’accesso; **Conferma** esegue anche una verifica immediata.
- Chiudendo la finestra prima del completamento, il processo viene rilasciato e il pulsante torna disponibile per riprovare. Durante questo passaggio il pannello mostra solo **Conferma** e **Annulla**.
- Limite da verificare: il riconoscimento legge il selettore del saluto Amazon; cambiamenti del sito potrebbero richiedere un aggiornamento.
- Verifica ancora necessaria: provare il flusso con il profilo Amazon reale. Nessun login o ordine è stato eseguito durante questa correzione.

## Obiettivo

Leggere gli avvisi Keepa via Telegram oppure dalla pagina Keepa Tracking → Notifiche recenti e avviare il controllo/acquisto Amazon senza richiedere comandi durante l’uso quotidiano. Il pannello deve rendere visibili sorgente selezionata, connessioni, monitoraggio, eventi e stato dell’acquisto automatico.

## Lavoro completato

- Pannello web in italiano e inglese con selettore a bandiera nell’intestazione; la lingua scelta resta salvata nel browser.
- Scelta salvata tra Telegram e sito Keepa; il cambio sorgente disabilita gli acquisti automatici finché l’utente non li riabilita.
- Rilevamento automatico di `KEEPA_SENDER_ID`: alla verifica Telegram cerca gli avvisi Keepa recenti nella cronologia; se non ne trova, salva il mittente del primo avviso valido ricevuto durante la prova.
- Stato credenziali API Telegram nel pannello, con pallino verde quando `api_id`/`api_hash` sono salvati e rosso quando vanno inseriti; pulsante **Modifica/Inserisci** apre i campi.
- Rimosso il margine spedizione: il totale ordine, inclusa la spedizione, deve restare entro il prezzo dell’avviso.
- Login Keepa in browser Playwright con profilo persistente `data/keepa-profile` e indicatore di sessione confermata.
- Listener Keepa Web che apre Tracking → Notifiche recenti, ignora il primo elenco già presente e cerca nuove righe ogni cinque secondi. Inoltra solo righe con ASIN e prezzo riconoscibile al runner esistente.
- Favicon SVG con la “K” del pannello.
- Conferma per abilitare gli acquisti automatici resa come popup interno al pannello, con stile coordinato, Annulla predefinito ed escape/backdrop per chiudere.
- Launcher Windows `KeepaBuyer.exe` senza finestra propria: apre direttamente il pannello nel browser. Il sorgente C# e lo script di compilazione sono in `src/KeepaBuyerLauncher.cs` e `build-windows-exe.ps1`; una finestra di errore appare solo se l’avvio fallisce.
- ZIP di prova Windows/Linux generato e verificato senza `.env`, `data/` o `node_modules/`; rimosso dal repository di lavoro perché la distribuzione avverrà tramite GitHub.
- Avvio che installa le dipendenze npm e Chromium mancanti, poi avvia il server e apre il pannello.
- Listener Telegram basato sulla sessione locale `teleproto`; inoltra ASIN e prezzo attuale dell’avviso Keepa.
- Pulsante di collegamento sensibile allo stato: mostra **Collega** se manca la sessione e **Verifica account** quando una sessione è già presente.
- Acquisto indirizzato al marketplace Amazon contenuto nel link dell’avviso Keepa, senza forzare `.it`; sono inclusi gli store Amazon EU `.de`, `.fr`, `.it`, `.es`, `.nl`, `.com.be`, `.ie`, `.pl` e `.se`, mentre `.co.uk` è escluso.
- Prezzi e soglie checkout letti nella valuta del marketplace; sono gestiti EUR, PLN e SEK.
- Il listener Telegram estrae host Amazon e ASIN dal pulsante/link Keepa. Il lettore Keepa web procede solo se trova un link Amazon europeo univoco associato all’ASIN.
- Riconoscimento degli account: Telegram salva nome, username e ID in `data/telegram-account.json`; Amazon salva il nome mostrato nel profilo e una conferma locale in `data/amazon-account.json` e `data/amazon-login.ok`.
- La pagina mostra stato “Connesso” e identità riconosciuta per le sessioni verificate. L’indicatore legge i dati locali salvati; non esegue una verifica di rete continua.
- Toggle grafico per abilitare/disabilitare `AUTO_BUY`. L’attivazione richiede Amazon verificato e la sessione della sorgente selezionata; in modalità Telegram richiede anche `KEEPA_SENDER_ID`. Richiede conferma nella pagina.
- Condizione e venditore non sono filtrati una seconda volta: su richiesta, Keepa è la fonte dei criteri di tracking. L’offerta scelta è la più economica dell’ASIN entro il prezzo attuale dell’avviso.
- Controlli checkout: marketplace allowlistato dall’avviso, ASIN, singolo articolo nel carrello, tetto prezzo articolo e tetto totale nella valuta locale.
- Profilo browser Amazon persistente in `data/amazon-profile`; il launcher termina dopo l’avvio del server e chiudere il pannello non cancella la sessione.
- API locale `/trigger` protetta da bearer token e registro `data/processed.json` per ignorare gli eventi duplicati.
- Windows usa la porta locale 8788 dal launcher per convivere con processi precedenti sulla 8787. La versione Linux mantiene la porta 8787 predefinita e si apre via tunnel SSH.

## Scelte e motivazioni

| Scelta | Motivo |
| --- | --- |
| Pannello bilingue IT/EN | La bandiera nell’intestazione commuta la lingua e la conserva nel browser. |
| Playwright con profilo Amazon persistente | Riutilizza la sessione autenticata del browser senza salvare password o dati carta nel programma. |
| Telegram MTProto con sessione locale | Legge il messaggio Keepa già presente nella chat Telegram dell’utente; non usa Telegram per effettuare l’ordine. |
| Keepa web come sorgente alternativa | Per chi riceve avvisi nell’app Keepa senza Telegram/API, Playwright riusa l’accesso al sito e legge la scheda Notifiche recenti. Non usa il piano API. |
| Scraping Keepa limitato al DOM visibile | Evita API private o una dipendenza da un piano API; è però fragile se cambia il sito e va verificato con la pagina autenticata reale. |
| Keepa come fonte della condizione e del trigger | Evita una seconda configurazione potenzialmente incoerente con il tracking. Per questo il runner non impone un grado d’usato o un venditore. |
| Prezzo attuale dell’avviso come limite articolo e totale | Non aggiunge un margine spedizione; se il totale supera l’avviso, l’ordine viene fermato. |
| Acquisto automatico disattivato inizialmente | Evita che un’installazione nuova invii un ordine prima che account, mittente e checkout siano verificati. L’utente lo attiva dal pannello. |
| Mittente Keepa rilevato da cronologia o primo avviso valido | Evita la copia manuale dell’ID; dopo il rilevamento gli avvisi di altri mittenti vengono ignorati. |
| Server limitato a localhost | Il pannello e l’endpoint non sono pubblicati direttamente su Internet; sulla VPS si usa un tunnel SSH. |
| EXE silenzioso di prova come launcher, non bundle unico | Apre direttamente il pannello senza una seconda interfaccia, mantenendo i sorgenti condivisi con Linux. Richiede comunque Node.js e i file del progetto. |
| Dati personali esclusi dal repository Git | `.gitignore` esclude `.env`, `data/`, `node_modules/` e gli artefatti ZIP/staging, così cookie, sessioni e segreti restano locali. |

## Flusso operativo previsto

1. Installare Node.js 20 o superiore e avviare `KeepaBuyer.exe` su Windows oppure `node src/launch.mjs` su Linux.
2. Scegliere Telegram o sito Keepa, collegare la sorgente e verificare l’account Amazon.
3. Con Telegram, salvare `api_id`/`api_hash`; il mittente viene letto dagli avvisi recenti oppure dal primo avviso valido in modalità prova. Con Keepa web, accedere nel browser aperto e confermare la pagina Tracking.
4. Avviare il monitoraggio in prova e controllare ASIN e prezzo degli eventi. Il listener web ignora gli avvisi già presenti alla prima lettura.
5. Abilitare gli acquisti automatici dal pannello solo dopo aver verificato gli eventi. Si applicano solo a nuove notifiche; gli eventi già registrati non vengono rielaborati.

## Limiti noti

- Il launcher EXE non è autonomo: richiede Node.js e la cartella completa del progetto. Il primo avvio necessita di rete per installare eventuali pacchetti/browser mancanti. Non mostra una finestra durante l’avvio; in caso di errore indica `data/launcher.log`.
- La scelta Amazon non confronta venditore o condizione con i dati Keepa; considera tutte le offerte riconosciute dell’ASIN e prende la più economica entro il prezzo limite.
- Il login Amazon viene verificato nel profilo browser condiviso. L’accesso incrociato ai marketplace europei e il formato dei prezzi locali non sono stati provati; se il marketplace richiede un nuovo login, l’ordine viene fermato.
- Il parser Telegram riconosce le principali traduzioni della frase Keepa, legge `Prezzo attuale`/equivalenti e richiede un link di prodotto valido da uno store Amazon europeo supportato. Amazon.co.uk non viene accettato.
- La ricerca storica Telegram cerca fino a 50 avvisi Keepa recenti; se non trova un mittente, l’apprendimento dal primo avviso è consentito solo in modalità prova. Se è attivo l’acquisto automatico e l’ID non è ancora verificato, il listener si ferma senza inviare ordini.
- Il lettore Keepa web cerca righe visibili contenenti ASIN, prezzo e link Amazon univoco. I dati mancanti, ambigui o senza marketplace identificato vengono saltati. Il layout non è stato provato su una sessione Keepa reale.
- La connessione Keepa conferma che la pagina Tracking è accessibile e salva la sessione; non legge né mostra email/nome dell’account Keepa.
- Il profilo browser Keepa è persistente e contiene cookie/sessioni. Non caricare `data/` su GitHub o condividerla.
- Il codice clicca il pulsante finale d’ordine se i controlli previsti passano; non gestisce CAPTCHA, MFA, richieste di login, cambio indirizzo/carta o recupero di pagamento rifiutato.
- Dopo il click finale, una pagina di conferma non riconosciuta fa risultare l’evento fermato anche se Amazon potrebbe avere creato un ordine in sospeso. Controllare **I miei ordini** prima di qualunque tentativo manuale.
- Gli ID evento sono idempotenti: un avviso già gestito in prova o fermato non viene eseguito di nuovo.
- Il pulsante **Ferma** arresta il listener della sorgente selezionata; il server continua a funzionare anche se si chiude il pannello nel browser. Non è ancora presente un comando grafico per arrestare tutto il servizio.
- La VPS non ha ancora unità `systemd` o procedura di login Amazon headless pronta. Il browser Amazon visibile richiede un display grafico/virtuale.
- Amazon può modificare i selettori. Un accesso reale e un ordine controllato non sono stati usati per validare il checkout.

## Verifiche eseguite

- La favicon è pubblicata dal server come SVG e collegata nell’HTML.
- Il launcher Windows già distribuito carica i sorgenti presenti nella cartella estratta; per questa modifica al pannello non serve ricompilare il launcher.
- Le prove login Keepa, parsing live per ogni marketplace, valute, account Amazon e ordini reali restano da fare con l’utente. Il sito Keepa e gli account non sono stati aperti né modificati durante lo sviluppo.

## Prossimi passi

1. Provare la sorgente selezionata su Windows: Telegram oppure login Keepa e controllo di una nuova notifica in modalità prova.
2. Con Keepa web, verificare che il pannello estragga l’ASIN e il prezzo corretti dalla pagina autenticata.
3. Fare una prova Amazon in modalità dry-run e verificare l’offerta scelta, dato che condizione e venditore non vengono filtrati.
4. Confermare che i selettori Amazon e il riconoscimento dell’esito corrispondano al checkout reale dell’account prima di usare ordini automatici.
5. Migliorare la gestione dello stato “ordine incerto/in sospeso” in modo distinto da un errore prima dell’invio.
6. Aggiungere un comando grafico per arrestare il server e un’unità `systemd` per la VPS.
7. Valutare una distribuzione Windows installabile/standalone che non richieda Node.js installato manualmente.

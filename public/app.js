const $ = (selector) => document.querySelector(selector);
const translations = {
  it: {
    documentTitle: 'Keepa Buyer — Pannello', brandSubtitle: 'Amazon Europa · Resale', mainNavigation: 'Navigazione principale',
    navOverview: 'Panoramica', navSetup: 'Configurazione', navActivity: 'Attività', localProcessing: 'Elaborazione locale',
    breadcrumbAutomation: 'Automazioni', breadcrumbKeepa: 'Acquisto Keepa', refreshStatus: 'Aggiorna stato',
    heroEyebrow: 'MONITORAGGIO PREZZI', heroTitle: 'Pronto a cogliere<br>un’offerta <em>Resale</em>.',
    heroDescription: 'Scegli Telegram oppure il sito Keepa come fonte degli avvisi e collega il tuo account Amazon. Il programma segue il marketplace indicato dal link dell’avviso e applica i limiti impostati.',
    serviceStatus: 'Stato servizi', amazonEuropeLabel: 'AMAZON EUROPA', monitorStatusHint: 'Attiva gli acquisti automatici con il pulsante qui sotto',
    preferencesEyebrow: '01 · PREFERENZE', purchaseRules: 'Regole d’acquisto', savedOnDevice: 'Salvate sul dispositivo',
    configIntro: 'Keepa decide quando avvisarti in base al prezzo e alla tipologia che hai tracciato. Qui imposti la sorgente e i collegamenti necessari.',
    notificationSource: 'Fonte degli avvisi Keepa', telegramSource: 'Telegram · messaggi Keepa', keepaWebSource: 'Sito Keepa · Notifiche recenti',
    keepaSourceHelp: 'Usa il tuo accesso al sito Keepa nel browser. Non serve l’API Keepa; la sessione viene salvata in locale.',
    telegramApiIdLabel: 'api_id Telegram', telegramApiHashLabel: 'api_hash Telegram', configuredLeaveBlank: 'Già configurato, lascia vuoto per mantenerlo',
    senderIdLabel: 'ID mittente Keepa su Telegram', autoDetected: 'rilevato automaticamente', senderPlaceholder: 'Verrà rilevato dalla cronologia o dal prossimo avviso',
    senderAutoHelp: 'Legge fino a 50 messaggi nelle chat Keepa e usa la ricerca Telegram come ripiego. Se trova più mittenti non ne sceglie uno; senza corrispondenze apprende il primo avviso valido in modalità prova.',
    privacyNote: 'Sessioni e configurazione restano sul PC o server che ospita il programma.', saveConfiguration: 'Salva configurazione',
    protectionEyebrow: '02 · PROTEZIONI', activeLimits: 'Limiti attivi', marketplaceLimit: 'Marketplace europeo',
    marketplaceLimitDetail: 'Segue il link dell’avviso; Regno Unito escluso', maxPrice: 'Prezzo massimo', maxPriceDetail: 'Non supera il prezzo nell’avviso',
    keepaCondition: 'Tipologia Keepa', keepaConditionDetail: 'Stessa condizione dell’avviso (nuovo, usato, Warehouse…)', checkedCart: 'Carrello controllato',
    checkedCartDetail: 'Un solo articolo per ordine',
    orderNotice: 'Ogni avviso Keepa valido avvia il controllo dell’ASIN sul marketplace indicato dal link. Il totale, spedizione inclusa, non può superare il prezzo dell’avviso; viene scelta solo un’offerta nella condizione indicata dall’avviso Keepa (nuovo, Amazon, usato e grado, Warehouse, ricondizionato).',
    connectionsEyebrow: '03 · COLLEGAMENTI', connectAccounts: 'Accedi ai tuoi account', initialAccess: 'Accesso iniziale e verifica',
    telegramCardTitle: 'Collega Telegram', telegramConnectedTitle: 'Account Telegram', telegramCardDescription: 'Accedi una volta per permettere al programma di leggere gli avvisi Keepa.',
    keepaCardTitle: 'Collega il sito Keepa', keepaConnectedTitle: 'Account Keepa', keepaCardDescription: 'Accedi nel browser che si apre, poi conferma nel pannello. Il programma controlla “Notifiche recenti”.',
    amazonCardTitle: 'Accedi ad Amazon Europa', amazonConnectedTitle: 'Account Amazon', amazonCardDescription: 'La sessione Amazon viene rilevata automaticamente; accedi solo se richiesto. Ogni ordine segue il marketplace del link Keepa.',
    interactiveValuePlaceholder: 'Inserisci il valore richiesto', send: 'Invia', enter: 'Invio', cancel: 'Annulla',
    controlEyebrow: '04 · CONTROLLO', startMonitoring: 'Avvia il monitoraggio', startMonitoringButton: 'Avvia monitoraggio', stopMonitoring: 'Ferma',
    enableAutoBuy: 'Abilita acquisto automatico', disableAutoBuy: 'Disattiva acquisto', latestEvents: 'ULTIMI EVENTI',
    processedAlerts: 'Avvisi elaborati', noAlerts: 'Nessun avviso elaborato', alertsWillAppear: 'Gli eventi appariranno qui quando arriva una notifica Keepa.',
    systemStatus: 'STATO DEL SISTEMA', activityLog: 'Registro attività', clear: 'Pulisci', waitingActivity: 'In attesa di attività…',
    footerProduct: 'Keepa Buyer · Amazon Europa', footerPrivacy: 'Password e dati carta non vengono inviati al webhook.', warning: 'ATTENZIONE',
    confirmAutoBuyTitle: 'Abilitare gli acquisti automatici?',
    confirmAutoBuyDescription: 'Ogni nuova notifica Keepa valida può inviare un ordine usando indirizzo e pagamento selezionati su Amazon. Il programma sceglie solo offerte nella condizione indicata dall’avviso Keepa e non ripete gli avvisi già elaborati.',
    confirmAutoBuyNote: 'Prima di attivare, controlla offerta, account Amazon, prezzo massimo e metodo di pagamento.',
    confirmEnablePurchases: 'Abilita acquisti', switchToEnglish: 'Passa all’inglese', switchToItalian: 'Passa all’italiano',
    credentialsReady: 'Credenziali Telegram configurate', credentialsMissing: 'Credenziali Telegram da inserire',
    credentialsDetailReady: 'api_id e api_hash sono salvati in locale.', credentialsDetailMissing: 'Inserisci api_id e api_hash per collegare Telegram.',
    edit: 'Modifica', insert: 'Inserisci', undo: 'Annulla', connected: 'Connesso', notConnected: 'Non connesso',
    accessRequired: 'Accesso richiesto', verificationRequired: 'Verifica richiesta', setupRequired: 'Da configurare', accountNotVerified: 'Account non verificato',
    verifyAccount: 'Verifica account', linkTelegram: 'Collega Telegram', loginKeepa: 'Accedi al sito Keepa', loginAmazon: 'Accedi ad Amazon', marketConnected: '{market}: collegato come {account}. Premi per verificare di nuovo.', marketNotConnected: '{market}: non collegato. Premi per accedere.',
    sourceTelegramLabel: 'TELEGRAM', sourceKeepaLabel: 'SITO KEEPA', sourceTelegramName: 'Telegram', sourceKeepaName: 'il sito Keepa',
    telegramSessionNotConnected: 'Sessione non collegata', telegramSessionNeedsVerification: 'Sessione presente · identità da verificare',
    telegramConnected: '✓ Connesso: {account}', amazonConnected: '✓ Connesso: {account}', keepaConnected: '✓ Connesso: {account}',
    sessionFoundVerify: 'Sessione trovata · premi Verifica account', amazonCheckingBadge: 'Verifica automatica in corso…', amazonCheckingDescription: 'Completa l’accesso nella finestra Amazon; il pannello riconosce e salva l’account automaticamente.', monitorStopped: 'Fermo',
    monitorRunningOrders: 'In funzione · ordini attivi', monitorRunningTest: 'In funzione · prova',
    monitorBadgeRunning: 'IN FUNZIONE', monitorBadgeStopped: 'FERMO', autoBuyActive: 'Acquisto automatico attivo',
    autoBuyInactive: 'Acquisto automatico disattivato',
    monitorOrdersDescription: 'Il monitoraggio legge gli avvisi tramite {source} e può inviare ordini entro i limiti configurati. Eventi e risultati appariranno qui.',
    monitorTestDescription: 'Il monitoraggio legge gli avvisi tramite {source} e controlla le offerte senza inviare ordini. Eventi e risultati appariranno qui.',
    telegramInProgress: 'Telegram in corso…', keepaInProgress: 'Keepa in corso…', amazonInProgress: 'Verifica Amazon…', retryAmazon: 'Riprova verifica', amazonRetryStarted: 'Verifica Amazon riavviata.',
    telegramLoginTitle: 'Collegamento Telegram', keepaLoginTitle: 'Accesso al sito Keepa', amazonLoginTitle: 'Accesso ad Amazon',
    accountLoginTitle: 'Collegamento account', followInstructions: 'Segui il passaggio di accesso e invia qui il valore richiesto.',
    confirmWithoutValue: 'Non serve scrivere nulla: premi “Conferma”', localValueNotice: 'Il valore viene inviato solo al processo locale', confirm: 'Conferma',
    savedConfiguration: 'Configurazione salvata sul dispositivo.',
    loginAlreadyRunning: '{source} è già in corso: completa il passaggio nel browser e premi Conferma.', telegramLoginStarted: 'Accesso Telegram avviato.',
    loginWindowOpened: 'Finestra di accesso {source} aperta.', loginWaiting: '{source} è già in attesa: completa il login e premi Conferma, oppure Annulla per ripartire.',
    panelUnavailable: 'Pannello non raggiungibile: {message}', monitoringStarted: 'Monitoraggio Keepa avviato.',
    monitoringStopRequested: 'Arresto del monitoraggio richiesto.', autoBuyEnabled: 'Acquisto automatico abilitato.', autoBuyDisabled: 'Acquisto automatico disattivato.',
    eventProduct: 'Prodotto', eventWaiting: 'in attesa', eventQueued: 'In coda', eventProcessing: 'In elaborazione', eventDryRun: 'Prova', eventOrdered: 'Ordinato', eventPaymentDeclined: 'Ordine salvato, pagamento rifiutato', eventStopped: 'Fermato'
  },
  en: {
    documentTitle: 'Keepa Buyer — Dashboard', brandSubtitle: 'Amazon Europe · Resale', mainNavigation: 'Main navigation',
    navOverview: 'Overview', navSetup: 'Setup', navActivity: 'Activity', localProcessing: 'Local processing',
    breadcrumbAutomation: 'Automations', breadcrumbKeepa: 'Keepa purchasing', refreshStatus: 'Refresh status',
    heroEyebrow: 'PRICE MONITORING', heroTitle: 'Ready to catch<br>a <em>Resale</em> deal.',
    heroDescription: 'Choose Telegram or the Keepa website for alerts and connect your Amazon account. The program follows the marketplace in the alert link and applies your limits.',
    serviceStatus: 'Service status', amazonEuropeLabel: 'AMAZON EUROPE', monitorStatusHint: 'Enable automatic purchases with the button below',
    preferencesEyebrow: '01 · PREFERENCES', purchaseRules: 'Purchase rules', savedOnDevice: 'Saved on this device',
    configIntro: 'Keepa decides when to alert you based on the price and condition you track. Choose the alert source and configure the required connections here.',
    notificationSource: 'Keepa alert source', telegramSource: 'Telegram · Keepa messages', keepaWebSource: 'Keepa website · Recent notifications',
    keepaSourceHelp: 'Use your Keepa website login in the browser. No Keepa API is needed; the session is stored locally.',
    telegramApiIdLabel: 'Telegram api_id', telegramApiHashLabel: 'Telegram api_hash', configuredLeaveBlank: 'Already configured; leave blank to keep it',
    senderIdLabel: 'Keepa sender ID on Telegram', autoDetected: 'detected automatically', senderPlaceholder: 'Detected from message history or the next alert',
    senderAutoHelp: 'Checks up to 50 messages in Keepa chats, then falls back to Telegram search. It will not choose if multiple senders match; otherwise it learns from the first valid alert in test mode.',
    privacyNote: 'Sessions and settings stay on the PC or server running the program.', saveConfiguration: 'Save settings',
    protectionEyebrow: '02 · SAFEGUARDS', activeLimits: 'Active limits', marketplaceLimit: 'European marketplace',
    marketplaceLimitDetail: 'Follows the alert link; United Kingdom excluded', maxPrice: 'Maximum price', maxPriceDetail: 'Cannot exceed the alert price',
    keepaCondition: 'Keepa condition', keepaConditionDetail: 'Same condition as the alert (new, used, Warehouse…)', checkedCart: 'Cart verification', checkedCartDetail: 'One item per order',
    orderNotice: 'Each valid Keepa alert starts an ASIN check on the marketplace in its link. The order total, including shipping, cannot exceed the alert price; only an offer in the condition stated by the Keepa alert is chosen (new, Amazon, used and grade, Warehouse, refurbished).',
    connectionsEyebrow: '03 · CONNECTIONS', connectAccounts: 'Connect your accounts', initialAccess: 'Initial sign-in and verification',
    telegramCardTitle: 'Connect Telegram', telegramConnectedTitle: 'Telegram account', telegramCardDescription: 'Sign in once to let the program read Keepa alerts.',
    keepaCardTitle: 'Connect the Keepa website', keepaConnectedTitle: 'Keepa account', keepaCardDescription: 'Sign in in the browser that opens, then confirm in the dashboard. The program checks “Recent notifications”.',
    amazonCardTitle: 'Sign in to Amazon Europe', amazonConnectedTitle: 'Amazon account', amazonCardDescription: 'Amazon sessions are detected automatically; sign in only if asked. Each order follows the marketplace in its Keepa link.',
    interactiveValuePlaceholder: 'Enter the requested value', send: 'Send', enter: 'Enter', cancel: 'Cancel',
    controlEyebrow: '04 · CONTROL', startMonitoring: 'Start monitoring', startMonitoringButton: 'Start monitoring', stopMonitoring: 'Stop',
    enableAutoBuy: 'Enable automatic purchasing', disableAutoBuy: 'Disable purchasing', latestEvents: 'LATEST EVENTS',
    processedAlerts: 'Processed alerts', noAlerts: 'No alerts processed', alertsWillAppear: 'Events will appear here when a Keepa notification arrives.',
    systemStatus: 'SYSTEM STATUS', activityLog: 'Activity log', clear: 'Clear', waitingActivity: 'Waiting for activity…',
    footerProduct: 'Keepa Buyer · Amazon Europe', footerPrivacy: 'Passwords and card details are not sent to the webhook.', warning: 'WARNING',
    confirmAutoBuyTitle: 'Enable automatic purchases?',
    confirmAutoBuyDescription: 'Each new valid Keepa alert can submit an order using the address and payment method selected on Amazon. The program only picks offers in the condition stated by the Keepa alert, and it does not repeat alerts already processed.',
    confirmAutoBuyNote: 'Before enabling, check the offer, Amazon account, maximum price and payment method.',
    confirmEnablePurchases: 'Enable purchases', switchToEnglish: 'Switch to English', switchToItalian: 'Switch to Italian',
    credentialsReady: 'Telegram credentials configured', credentialsMissing: 'Telegram credentials required',
    credentialsDetailReady: 'api_id and api_hash are stored locally.', credentialsDetailMissing: 'Enter api_id and api_hash to connect Telegram.',
    edit: 'Edit', insert: 'Add', undo: 'Cancel', connected: 'Connected', notConnected: 'Not connected',
    accessRequired: 'Sign-in required', verificationRequired: 'Verification required', setupRequired: 'Setup required', accountNotVerified: 'Account not verified',
    verifyAccount: 'Verify account', linkTelegram: 'Connect Telegram', loginKeepa: 'Sign in to Keepa', loginAmazon: 'Sign in to Amazon', marketConnected: '{market}: connected as {account}. Press to verify again.', marketNotConnected: '{market}: not connected. Press to sign in.',
    sourceTelegramLabel: 'TELEGRAM', sourceKeepaLabel: 'KEEPA WEBSITE', sourceTelegramName: 'Telegram', sourceKeepaName: 'the Keepa website',
    telegramSessionNotConnected: 'Session not connected', telegramSessionNeedsVerification: 'Session found · identity not verified',
    telegramConnected: '✓ Connected: {account}', amazonConnected: '✓ Connected: {account}', keepaConnected: '✓ Connected: {account}',
    sessionFoundVerify: 'Session found · press Verify account', amazonCheckingBadge: 'Automatic verification in progress…', amazonCheckingDescription: 'Finish signing in in the Amazon window; the dashboard will detect and save the account automatically.', monitorStopped: 'Stopped',
    monitorRunningOrders: 'Running · orders enabled', monitorRunningTest: 'Running · test mode',
    monitorBadgeRunning: 'RUNNING', monitorBadgeStopped: 'STOPPED', autoBuyActive: 'Automatic purchasing enabled',
    autoBuyInactive: 'Automatic purchasing disabled',
    monitorOrdersDescription: 'Monitoring reads alerts from {source} and can submit orders within your configured limits. Events and results will appear here.',
    monitorTestDescription: 'Monitoring reads alerts from {source} and checks offers without submitting orders. Events and results will appear here.',
    telegramInProgress: 'Telegram in progress…', keepaInProgress: 'Keepa in progress…', amazonInProgress: 'Checking Amazon…', retryAmazon: 'Retry verification', amazonRetryStarted: 'Amazon verification restarted.',
    telegramLoginTitle: 'Telegram sign-in', keepaLoginTitle: 'Keepa website sign-in', amazonLoginTitle: 'Amazon sign-in',
    accountLoginTitle: 'Account connection', followInstructions: 'Follow the sign-in step and enter the requested value here.',
    confirmWithoutValue: 'Nothing to type: press “Confirm”', localValueNotice: 'This value is sent only to the local process', confirm: 'Confirm',
    savedConfiguration: 'Settings saved on this device.', loginAlreadyRunning: '{source} is already in progress: finish the step in the browser and press Confirm.',
    telegramLoginStarted: 'Telegram sign-in started.', loginWindowOpened: '{source} sign-in window opened.',
    loginWaiting: '{source} is already waiting: finish sign-in and press Confirm, or Cancel to start over.',
    panelUnavailable: 'Dashboard unavailable: {message}', monitoringStarted: 'Keepa monitoring started.',
    monitoringStopRequested: 'Monitoring stop requested.', autoBuyEnabled: 'Automatic purchasing enabled.', autoBuyDisabled: 'Automatic purchasing disabled.',
    eventProduct: 'Product', eventWaiting: 'waiting', eventQueued: 'Queued', eventProcessing: 'Processing', eventDryRun: 'Test', eventOrdered: 'Ordered', eventPaymentDeclined: 'Order saved, payment declined', eventStopped: 'Stopped'
  }
};
let currentLanguage = localStorage.getItem('keepa-buyer-language') === 'en' ? 'en' : 'it';
const tr = (key, values = {}) => (translations[currentLanguage][key] || translations.it[key] || key)
  .replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');

function applyLanguage(language) {
  currentLanguage = language === 'en' ? 'en' : 'it';
  localStorage.setItem('keepa-buyer-language', currentLanguage);
  document.documentElement.lang = currentLanguage;
  for (const element of document.querySelectorAll('[data-i18n]')) element.textContent = tr(element.dataset.i18n);
  for (const element of document.querySelectorAll('[data-i18n-html]')) element.innerHTML = tr(element.dataset.i18nHtml);
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) element.placeholder = tr(element.dataset.i18nPlaceholder);
  for (const element of document.querySelectorAll('[data-i18n-aria]')) element.setAttribute('aria-label', tr(element.dataset.i18nAria));
  for (const element of document.querySelectorAll('[data-i18n-title]')) element.title = tr(element.dataset.i18nTitle);
  const flag = currentLanguage === 'it' ? '🇬🇧' : '🇮🇹';
  $('#languageToggle').innerHTML = `<span class="language-flag" aria-hidden="true">${flag}</span><span id="languageToggleLabel">${currentLanguage === 'it' ? 'EN' : 'IT'}</span>`;
  $('#languageToggle').setAttribute('aria-label', tr(currentLanguage === 'it' ? 'switchToEnglish' : 'switchToItalian'));
  document.title = tr('documentTitle');
  updateSourceChoice();
  updateTelegramCredentials(latestConfig);
}

const toast = $('#toast');
let toastTimer;
let configDirty = false;
let latestActivity = [];
let latestInteractiveKind = null;
let hiddenThrough = '';
let telegramCredentialsEditorOpen = false;
let latestConfig = { notificationSource: 'telegram', telegramApiIdSet: false, telegramApiHashSet: false, keepaSenderId: '' };

function showToast(message, error = false) {
  toast.textContent = message;
  toast.style.background = error ? '#8d413a' : '#1c2e39';
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `${currentLanguage === 'it' ? 'Errore' : 'Error'} ${response.status}`);
  return result;
}

function setDot(selector, connected) {
  $(selector).classList.toggle('online', Boolean(connected));
}

function setValueUnlessEditing(selector, value) {
  const input = $(selector);
  if (document.activeElement !== input) input.value = value;
}

function updateConfigDirty() {
  configDirty = $('#notificationSource').value !== (latestConfig.notificationSource || 'telegram') ||
    $('#senderId').value.trim() !== (latestConfig.keepaSenderId || '') ||
    Boolean($('#telegramApiId').value.trim()) || Boolean($('#telegramApiHash').value.trim());
}

function telegramAccountText(account) {
  if (!account) return '';
  const name = [account.firstName, account.lastName].filter(Boolean).join(' ');
  const handle = account.username ? `@${account.username}` : `ID ${account.id}`;
  return [name, handle].filter(Boolean).join(' · ');
}

function eventPrice(event) {
  if (!event.offerCents) return tr('eventWaiting');
  const host = String(event.marketplaceHost || '');
  const currency = host.endsWith('.pl') ? 'PLN' : host.endsWith('.se') ? 'SEK' : 'EUR';
  const locale = currentLanguage === 'it' ? 'it-IT' : 'en-GB';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(event.offerCents / 100);
}

function eventStatus(status) {
  const labels = {
    queued: tr('eventQueued'), processing: tr('eventProcessing'), dry_run: tr('eventDryRun'), ordered: tr('eventOrdered'), payment_declined: tr('eventPaymentDeclined'), stopped: tr('eventStopped')
  };
  return labels[status] || status || tr('eventQueued');
}

function renderEvents(events) {
  const list = $('#eventsList');
  $('#eventCount').textContent = String(events.length);
  if (!events.length) {
    list.innerHTML = `<div class="empty-state"><span>◷</span><strong>${tr('noAlerts')}</strong><small>${tr('alertsWillAppear')}</small></div>`;
    return;
  }
  list.replaceChildren(...events.map((event) => {
    const row = document.createElement('div');
    row.className = 'event-row';
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = `${event.asin || tr('eventProduct')} · ${eventPrice(event)}`;
    const state = document.createElement('span');
    state.className = 'event-state';
    state.textContent = eventStatus(event.status);
    const sub = document.createElement('div');
    sub.className = 'event-sub';
    sub.textContent = event.error || new Date(event.createdAt || Date.now()).toLocaleString(currentLanguage === 'it' ? 'it-IT' : 'en-GB');
    row.append(title, state, sub);
    return row;
  }));
}

function renderActivity(activity) {
  const list = $('#activityList');
  if (!activity.length) {
    list.innerHTML = `<div class="empty-log">${tr('waitingActivity')}</div>`;
    return;
  }
  list.replaceChildren(...activity.slice().reverse().map((entry) => {
    const row = document.createElement('div');
    row.className = `log-row ${entry.level || 'info'}`;
    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date(entry.time).toLocaleTimeString(currentLanguage === 'it' ? 'it-IT' : 'en-GB');
    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = entry.message;
    row.append(time, message);
    return row;
  }));
}

function updateInteractive(state) {
  const area = $('#interactiveArea');
  if (!state.interactiveKind || state.interactiveKind === 'amazon') {
    area.classList.add('hidden');
    return;
  }
  const recent = state.activity.slice().reverse();
  const promptEntry = recent.find((entry) => /Numero Telegram|Codice ricevuto|Password Telegram|premi (?:Invio|Conferma)/i.test(entry.message));
  let promptText = promptEntry?.message.replace(/^(Telegram|Amazon|Keepa):\s*/, '') || tr('followInstructions');
  if (currentLanguage === 'en') {
    const promptTranslations = [
      [/Numero Telegram con prefisso internazionale/i, 'Enter your Telegram phone number with country code:'],
      [/Codice ricevuto da Telegram/i, 'Enter the login code sent by Telegram:'],
      [/Password Telegram di verifica in due passaggi \(se attiva\)/i, 'Enter your Telegram two-step verification password (if enabled):'],
      [/Accedi ad Amazon, poi premi Conferma per verificare l.account\. Se sei già connesso, il rilevamento avviene automaticamente/i, 'Sign in to Amazon, then press Confirm to verify the account. If you are already signed in, it will be detected automatically.'],
      [/premi Invio|premi Conferma/i, 'Sign in in the browser, then press Confirm here.']
    ];
    for (const [pattern, replacement] of promptTranslations) {
      if (pattern.test(promptText)) { promptText = promptText.replace(pattern, replacement); break; }
    }
  }
  const titles = { telegram: tr('telegramLoginTitle'), amazon: tr('amazonLoginTitle'), keepa: tr('keepaLoginTitle') };
  $('#interactiveTitle').textContent = titles[state.interactiveKind] || tr('accountLoginTitle');
  $('#interactivePrompt').textContent = promptText;
  const confirmPrompt = /premi (?:Invio|Conferma)|press (?:Enter|Confirm)/i.test(promptText);
  const amazonFlow = state.interactiveKind === 'amazon';
  $('#interactiveInput').classList.toggle('hidden', amazonFlow);
  $('#interactiveSend').classList.toggle('hidden', amazonFlow);
  $('#interactiveInput').placeholder = confirmPrompt ? tr('confirmWithoutValue') : tr('localValueNotice');
  $('#interactiveInput').type = /Password|password/i.test(promptText) ? 'password' : 'text';
  $('#interactiveEnter').textContent = confirmPrompt ? tr('confirm') : tr('enter');
  area.classList.remove('hidden');
}

function updateSourceChoice() {
  const source = $('#notificationSource').value;
  const isKeepaWeb = source === 'keepa-web';
  $('#telegramFields').classList.toggle('hidden', isKeepaWeb);
  $('#keepaSourceHelp').classList.toggle('hidden', !isKeepaWeb);
  $('#telegramConnectionCard').classList.toggle('hidden', isKeepaWeb);
  $('#keepaConnectionCard').classList.toggle('hidden', !isKeepaWeb);
  $('#sourceStatusLabel').textContent = isKeepaWeb ? tr('sourceKeepaLabel') : tr('sourceTelegramLabel');
  $('#sourceStatusIcon').textContent = isKeepaWeb ? 'K' : '✈';
  $('#sourceStatusIcon').classList.toggle('telegram-icon', !isKeepaWeb);
  $('#sourceStatusIcon').classList.toggle('keepa-brand', isKeepaWeb);
}

function updateTelegramCredentials(config) {
  const ready = Boolean(config.telegramApiIdSet && config.telegramApiHashSet);
  const dot = $('#telegramCredentialsDot');
  dot.classList.toggle('online', ready);
  dot.classList.toggle('offline', !ready);
  $('#telegramCredentialsLabel').textContent = ready ? tr('credentialsReady') : tr('credentialsMissing');
  $('#telegramCredentialsDetail').textContent = ready
    ? tr('credentialsDetailReady')
    : tr('credentialsDetailMissing');
  $('#telegramCredentialsEditor').classList.toggle('hidden', !telegramCredentialsEditorOpen);
  $('#telegramCredentialsToggle').textContent = telegramCredentialsEditorOpen ? tr('undo') : ready ? tr('edit') : tr('insert');
  $('#telegramCredentialsToggle').setAttribute('aria-expanded', String(telegramCredentialsEditorOpen));
}

function renderAmazonMarkets(markets, accessInProgress) {
  const container = $('#amazonMarkets');
  if (!container) return;
  container.replaceChildren(...markets.map((market) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `market-button${market.connected ? ' connected' : ''}`;
    button.textContent = market.label;
    button.disabled = Boolean(accessInProgress);
    button.title = market.connected
      ? tr('marketConnected', { market: market.host.replace(/^www\./, ''), account: market.displayName || '—' })
      : tr('marketNotConnected', { market: market.host.replace(/^www\./, '') });
    button.addEventListener('click', () => startLogin('amazon', market.host));
    return button;
  }));
}

async function refresh() {
  try {
    const state = await api('/api/state');
    latestInteractiveKind = state.interactiveKind || null;
    const config = state.config;
    latestConfig = config;
    const telegramAccount = state.telegramAccount;
    const keepaAccount = state.keepaAccount;
    const amazonAccount = state.amazonAccount;
    const notificationSource = config.notificationSource || 'telegram';
    if (!configDirty) $('#notificationSource').value = notificationSource;
    const displayedSource = $('#notificationSource').value || notificationSource;
    const telegramReady = state.telegramSessionExists && Boolean(telegramAccount?.id);
    const keepaReady = state.keepaSessionConfirmed && Boolean(keepaAccount?.displayName);
    const amazonReady = state.amazonSessionConfirmed && Boolean(amazonAccount?.displayName);
    $('#telegramConnectionCard h3').textContent = telegramReady ? tr('telegramConnectedTitle') : tr('telegramCardTitle');
    $('#keepaConnectionCard h3').textContent = keepaReady ? tr('keepaConnectedTitle') : tr('keepaCardTitle');
    $('#amazonConnectionCard h3').textContent = amazonReady ? tr('amazonConnectedTitle') : tr('amazonCardTitle');
    $('#autoBuyStatus').innerHTML = `<span class="tiny-dot"></span>${state.autoBuy ? tr('autoBuyActive') : tr('autoBuyInactive')}`;
    const sourceName = displayedSource === 'keepa-web' ? tr('sourceKeepaName') : tr('sourceTelegramName');
    $('#monitorDescription').textContent = state.autoBuy
      ? tr('monitorOrdersDescription', { source: sourceName })
      : tr('monitorTestDescription', { source: sourceName });
    const sourceReady = displayedSource === 'keepa-web' ? keepaReady : telegramReady;
    $('#sourceStatus').textContent = sourceReady ? tr('connected') : displayedSource === 'keepa-web'
      ? (state.keepaSessionConfirmed ? tr('verificationRequired') : tr('accessRequired'))
      : (state.telegramSessionExists ? tr('verificationRequired') : (config.telegramApiIdSet && config.telegramApiHashSet ? tr('accessRequired') : tr('setupRequired')));
    $('#amazonStatus').textContent = amazonReady ? tr('connected') : state.amazonSessionConfirmed ? tr('verificationRequired') : tr('accessRequired');
    $('#amazonCardDescription').textContent = state.interactiveKind === 'amazon' ? tr('amazonCheckingDescription') : tr('amazonCardDescription');
    $('#monitorStatus').textContent = state.monitorRunning ? (state.autoBuy ? tr('monitorRunningOrders') : tr('monitorRunningTest')) : tr('monitorStopped');
    $('#monitorBadge').innerHTML = state.monitorRunning ? `<span class="tiny-dot"></span>${tr('monitorBadgeRunning')}` : `<span class="tiny-dot"></span>${tr('monitorBadgeStopped')}`;
    $('#monitorBadge').classList.toggle('running', state.monitorRunning);
    $('#monitorStartButton').classList.toggle('hidden', state.monitorRunning);
    $('#monitorStopButton').classList.toggle('hidden', !state.monitorRunning);
    $('#autoBuyEnableButton').classList.toggle('hidden', state.autoBuy);
    $('#autoBuyDisableButton').classList.toggle('hidden', !state.autoBuy);
    setDot('#sourceStatusDot', sourceReady);
    setDot('#amazonStatusDot', amazonReady);
    setDot('#monitorStatusDot', state.monitorRunning);
    $('#sourceAccountDetail').textContent = displayedSource === 'keepa-web'
      ? (keepaReady ? keepaAccount.displayName : state.keepaSessionConfirmed ? tr('sessionFoundVerify') : tr('accountNotVerified'))
      : (telegramReady ? telegramAccountText(telegramAccount) : state.telegramSessionExists ? tr('sessionFoundVerify') : tr('accountNotVerified'));
    $('#amazonAccountDetail').textContent = amazonReady ? amazonAccount.displayName : state.interactiveKind === 'amazon' ? tr('amazonCheckingBadge') : state.amazonSessionConfirmed ? tr('sessionFoundVerify') : tr('accountNotVerified');
    $('#telegramSessionBadge').textContent = telegramReady ? tr('telegramConnected', { account: telegramAccountText(telegramAccount) }) : state.telegramSessionExists ? tr('telegramSessionNeedsVerification') : tr('telegramSessionNotConnected');
    $('#telegramSessionBadge').classList.toggle('connected', telegramReady);
    $('#amazonSessionBadge').textContent = amazonReady ? tr('amazonConnected', { account: amazonAccount.displayName }) : state.interactiveKind === 'amazon' ? tr('amazonCheckingBadge') : state.amazonSessionConfirmed ? tr('sessionFoundVerify') : tr('notConnected');
    $('#amazonSessionBadge').classList.toggle('connected', amazonReady);
    $('#keepaSessionBadge').textContent = keepaReady ? tr('keepaConnected', { account: keepaAccount.displayName }) : state.keepaSessionConfirmed ? tr('sessionFoundVerify') : tr('notConnected');
    $('#keepaSessionBadge').classList.toggle('connected', keepaReady);
    if (!configDirty) {
      setValueUnlessEditing('#senderId', config.keepaSenderId || '');
    }
    updateSourceChoice();
    updateTelegramCredentials(config);
    $('#telegramApiId').placeholder = config.telegramApiIdSet ? tr('configuredLeaveBlank') : currentLanguage === 'it' ? 'Inserisci api_id' : 'Enter api_id';
    $('#telegramApiHash').placeholder = config.telegramApiHashSet ? tr('configuredLeaveBlank') : currentLanguage === 'it' ? 'Inserisci api_hash' : 'Enter api_hash';
    const accessInProgress = Boolean(state.interactiveKind);
    $('#telegramLoginButton').disabled = accessInProgress;
    $('#keepaLoginButton').disabled = accessInProgress;
    const amazonFlow = state.interactiveKind === 'amazon';
    $('#amazonLoginButton').disabled = accessInProgress && !amazonFlow;
    $('#monitorStartButton').disabled = configDirty || accessInProgress;
    $('#autoBuyEnableButton').disabled = configDirty || accessInProgress;
    $('#telegramLoginButton').textContent = state.interactiveKind === 'telegram' ? tr('telegramInProgress') : state.telegramSessionExists ? tr('verifyAccount') : tr('linkTelegram');
    $('#keepaLoginButton').textContent = state.interactiveKind === 'keepa' ? tr('keepaInProgress') : state.keepaSessionConfirmed ? tr('verifyAccount') : tr('loginKeepa');
    renderAmazonMarkets(state.amazonMarketplaces || [], accessInProgress);
    $('#amazonLoginButton').textContent = state.interactiveKind === 'amazon' ? tr('retryAmazon') : state.amazonSessionConfirmed ? tr('verifyAccount') : tr('loginAmazon');
    renderEvents(state.events || []);
    latestActivity = state.activity || [];
    renderActivity(latestActivity.filter((entry) => entry.time > hiddenThrough));
    updateInteractive(state);
  } catch (error) {
    showToast(tr('panelUnavailable', { message: error.message }), true);
  }
}

$('#configForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('/api/config', {
      method: 'POST',
      body: JSON.stringify({
        telegramApiId: $('#telegramApiId').value,
        telegramApiHash: $('#telegramApiHash').value,
        notificationSource: $('#notificationSource').value,
        keepaSenderId: $('#senderId').value
      })
    });
    configDirty = false;
    telegramCredentialsEditorOpen = false;
    $('#telegramApiId').value = '';
    $('#telegramApiHash').value = '';
    showToast(tr('savedConfiguration'));
    await refresh();
  } catch (error) {
    showToast(error.message, true);
  }
});

$('#configForm').addEventListener('input', updateConfigDirty);
$('#notificationSource').addEventListener('change', () => {
  updateConfigDirty();
  updateSourceChoice();
});

$('#telegramCredentialsToggle').addEventListener('click', () => {
  const closing = telegramCredentialsEditorOpen;
  telegramCredentialsEditorOpen = !telegramCredentialsEditorOpen;
  if (closing) {
    $('#telegramApiId').value = '';
    $('#telegramApiHash').value = '';
    updateConfigDirty();
  }
  updateTelegramCredentials(latestConfig);
});

async function startLogin(kind, marketplace = '') {
  try {
    const retryAmazon = kind === 'amazon' && latestInteractiveKind === 'amazon';
    if (retryAmazon) {
      await api('/api/login/stop', { method: 'POST', body: '{}' });
      let stopped = false;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const state = await api('/api/state');
        latestInteractiveKind = state.interactiveKind || null;
        if (!latestInteractiveKind) { stopped = true; break; }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      if (!stopped) throw new Error(currentLanguage === 'it' ? 'Il controllo Amazon è ancora in chiusura. Riprova tra qualche secondo.' : 'Amazon verification is still stopping. Try again in a few seconds.');
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    const result = await api('/api/login/start', { method: 'POST', body: JSON.stringify({ kind, marketplace }) });
    const sourceName = kind === 'telegram' ? tr('sourceTelegramName') : kind === 'amazon' ? 'Amazon' : tr('sourceKeepaName');
    if (result.alreadyRunning) {
      showToast(tr('loginAlreadyRunning', { source: sourceName }));
    } else {
      showToast(retryAmazon ? tr('amazonRetryStarted') : kind === 'telegram' ? tr('telegramLoginStarted') : tr('loginWindowOpened', { source: sourceName }));
    }
    await refresh();
  } catch (error) {
    if (/già attivo il passaggio/i.test(error.message)) {
      const sourceName = kind === 'telegram' ? tr('sourceTelegramName') : kind === 'amazon' ? 'Amazon' : tr('sourceKeepaName');
      showToast(tr('loginWaiting', { source: sourceName }));
      await refresh();
      return;
    }
    showToast(error.message, true);
  }
}

$('#telegramLoginButton').addEventListener('click', () => startLogin('telegram'));
$('#keepaLoginButton').addEventListener('click', () => startLogin('keepa'));
$('#amazonLoginButton').addEventListener('click', () => startLogin('amazon'));
$('#interactiveSend').addEventListener('click', async () => {
  try {
    await api('/api/login/input', { method: 'POST', body: JSON.stringify({ value: $('#interactiveInput').value }) });
    $('#interactiveInput').value = '';
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#interactiveEnter').addEventListener('click', async () => {
  const isConfirmPrompt = /premi (?:Invio|Conferma)|press (?:Enter|Confirm)/i.test($('#interactivePrompt').textContent);
  try {
    await api('/api/login/input', { method: 'POST', body: JSON.stringify({ value: isConfirmPrompt ? '' : $('#interactiveInput').value }) });
    $('#interactiveInput').value = '';
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#interactiveStop').addEventListener('click', async () => {
  await api('/api/login/stop', { method: 'POST', body: '{}' }).catch((error) => showToast(error.message, true));
  await refresh();
});
$('#monitorStartButton').addEventListener('click', async () => {
  try {
    await api('/api/monitor/start', { method: 'POST', body: '{}' });
    showToast(tr('monitoringStarted'));
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#monitorStopButton').addEventListener('click', async () => {
  await api('/api/monitor/stop', { method: 'POST', body: '{}' }).catch((error) => showToast(error.message, true));
  showToast(tr('monitoringStopRequested'));
  await refresh();
});

const autoBuyConfirmDialog = $('#autoBuyConfirmDialog');
$('#cancelAutoBuyConfirm').addEventListener('click', () => autoBuyConfirmDialog.close('cancel'));
$('#acceptAutoBuyConfirm').addEventListener('click', () => autoBuyConfirmDialog.close('confirm'));
autoBuyConfirmDialog.addEventListener('click', (event) => {
  if (event.target === autoBuyConfirmDialog) autoBuyConfirmDialog.close('cancel');
});

function confirmAutoBuyInPanel() {
  return new Promise((resolve) => {
    autoBuyConfirmDialog.addEventListener('close', () => resolve(autoBuyConfirmDialog.returnValue === 'confirm'), { once: true });
    autoBuyConfirmDialog.showModal();
  });
}

$('#autoBuyEnableButton').addEventListener('click', async () => {
  const accepted = await confirmAutoBuyInPanel();
  if (!accepted) return;
  try {
    await api('/api/auto-buy', { method: 'POST', body: JSON.stringify({ enabled: true }) });
    showToast(tr('autoBuyEnabled'));
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#autoBuyDisableButton').addEventListener('click', async () => {
  try {
    await api('/api/auto-buy', { method: 'POST', body: JSON.stringify({ enabled: false }) });
    showToast(tr('autoBuyDisabled'));
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#refreshButton').addEventListener('click', refresh);
$('#clearLogButton').addEventListener('click', () => {
  hiddenThrough = latestActivity.at(-1)?.time || new Date().toISOString();
  renderActivity([]);
});

$('#languageToggle').addEventListener('click', async () => {
  applyLanguage(currentLanguage === 'it' ? 'en' : 'it');
  await refresh();
});

applyLanguage(currentLanguage);
updateSourceChoice();
refresh();
setInterval(refresh, 2500);

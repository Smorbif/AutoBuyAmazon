const $ = (selector) => document.querySelector(selector);
const toast = $('#toast');
let toastTimer;
let configDirty = false;
let latestActivity = [];
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
  if (!response.ok) throw new Error(result.error || `Errore ${response.status}`);
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

function renderEvents(events) {
  const list = $('#eventsList');
  $('#eventCount').textContent = String(events.length);
  if (!events.length) {
    list.innerHTML = '<div class="empty-state"><span>◷</span><strong>Nessun avviso elaborato</strong><small>Gli eventi appariranno qui quando arriva una notifica Keepa.</small></div>';
    return;
  }
  list.replaceChildren(...events.map((event) => {
    const row = document.createElement('div');
    row.className = 'event-row';
    const title = document.createElement('div');
    title.className = 'event-title';
    title.textContent = `${event.asin || 'Prodotto'} · ${event.offerCents ? (event.offerCents / 100).toFixed(2) + ' €' : 'in attesa'}`;
    const state = document.createElement('span');
    state.className = 'event-state';
    state.textContent = event.status || 'queued';
    const sub = document.createElement('div');
    sub.className = 'event-sub';
    sub.textContent = event.error || new Date(event.createdAt || Date.now()).toLocaleString('it-IT');
    row.append(title, state, sub);
    return row;
  }));
}

function renderActivity(activity) {
  const list = $('#activityList');
  if (!activity.length) {
    list.innerHTML = '<div class="empty-log">In attesa di attività…</div>';
    return;
  }
  list.replaceChildren(...activity.slice().reverse().map((entry) => {
    const row = document.createElement('div');
    row.className = `log-row ${entry.level || 'info'}`;
    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date(entry.time).toLocaleTimeString('it-IT');
    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = entry.message;
    row.append(time, message);
    return row;
  }));
}

function updateInteractive(state) {
  const area = $('#interactiveArea');
  if (!state.interactiveKind) {
    area.classList.add('hidden');
    return;
  }
  const recent = state.activity.slice().reverse();
  const promptEntry = recent.find((entry) => /Numero Telegram|Codice ricevuto|Password Telegram|premi (?:Invio|Conferma)/i.test(entry.message));
  const promptText = promptEntry?.message.replace(/^(Telegram|Amazon):\s*/, '') || 'Segui il passaggio di accesso e invia qui il valore richiesto.';
  const titles = { telegram: 'Collegamento Telegram', amazon: 'Accesso Amazon.it', keepa: 'Accesso al sito Keepa' };
  $('#interactiveTitle').textContent = titles[state.interactiveKind] || 'Collegamento account';
  $('#interactivePrompt').textContent = promptText;
  $('#interactiveInput').placeholder = /premi (?:Invio|Conferma)/i.test(promptText) ? 'Non serve scrivere nulla: premi “Conferma”' : 'Il valore viene inviato solo al processo locale';
  $('#interactiveInput').type = /Password/i.test(promptText) ? 'password' : 'text';
  $('#interactiveEnter').textContent = /premi (?:Invio|Conferma)/i.test(promptText) ? 'Conferma' : 'Invio';
  area.classList.remove('hidden');
}

function updateSourceChoice() {
  const source = $('#notificationSource').value;
  const isKeepaWeb = source === 'keepa-web';
  $('#telegramFields').classList.toggle('hidden', isKeepaWeb);
  $('#keepaSourceHelp').classList.toggle('hidden', !isKeepaWeb);
  $('#telegramConnectionCard').classList.toggle('hidden', isKeepaWeb);
  $('#keepaConnectionCard').classList.toggle('hidden', !isKeepaWeb);
  $('#sourceStatusLabel').textContent = isKeepaWeb ? 'SITO KEEPA' : 'TELEGRAM';
  $('#sourceStatusIcon').textContent = isKeepaWeb ? 'K' : '✈';
  $('#sourceStatusIcon').classList.toggle('telegram-icon', !isKeepaWeb);
  $('#sourceStatusIcon').classList.toggle('keepa-brand', isKeepaWeb);
}

function updateTelegramCredentials(config) {
  const ready = Boolean(config.telegramApiIdSet && config.telegramApiHashSet);
  const dot = $('#telegramCredentialsDot');
  dot.classList.toggle('online', ready);
  dot.classList.toggle('offline', !ready);
  $('#telegramCredentialsLabel').textContent = ready ? 'Credenziali Telegram configurate' : 'Credenziali Telegram da inserire';
  $('#telegramCredentialsDetail').textContent = ready
    ? 'api_id e api_hash sono salvati in locale.'
    : 'Inserisci api_id e api_hash per collegare Telegram.';
  $('#telegramCredentialsEditor').classList.toggle('hidden', !telegramCredentialsEditorOpen);
  $('#telegramCredentialsToggle').textContent = telegramCredentialsEditorOpen ? 'Annulla' : ready ? 'Modifica' : 'Inserisci';
  $('#telegramCredentialsToggle').setAttribute('aria-expanded', String(telegramCredentialsEditorOpen));
}

async function refresh() {
  try {
    const state = await api('/api/state');
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
    $('#autoBuyStatus').innerHTML = `<span class="tiny-dot"></span>Acquisto automatico ${state.autoBuy ? 'attivo' : 'disattivato'}`;
    const sourceName = displayedSource === 'keepa-web' ? 'il sito Keepa' : 'Telegram';
    $('#monitorDescription').textContent = state.autoBuy
      ? `Il monitoraggio legge gli avvisi da ${sourceName} e può inviare ordini secondo i limiti configurati. Gli eventi e i risultati appariranno qui.`
      : `Il monitoraggio legge gli avvisi da ${sourceName} e controlla le offerte senza inviare ordini. Gli eventi e i risultati appariranno qui.`;
    const sourceReady = displayedSource === 'keepa-web' ? keepaReady : telegramReady;
    $('#sourceStatus').textContent = sourceReady ? 'Connesso' : displayedSource === 'keepa-web'
      ? (state.keepaSessionConfirmed ? 'Verifica richiesta' : 'Accesso richiesto')
      : (telegramReady ? 'Connesso' : state.telegramSessionExists ? 'Verifica account' : (config.telegramApiIdSet && config.telegramApiHashSet ? 'Accesso richiesto' : 'Da configurare'));
    $('#amazonStatus').textContent = amazonReady ? 'Connesso' : state.amazonSessionConfirmed ? 'Verifica account' : 'Accesso richiesto';
    $('#monitorStatus').textContent = state.monitorRunning ? (state.autoBuy ? 'In funzione · ordini attivi' : 'In funzione · prova') : 'Fermo';
    $('#monitorBadge').innerHTML = state.monitorRunning ? '<span class="tiny-dot"></span>IN FUNZIONE' : '<span class="tiny-dot"></span>FERMO';
    $('#monitorBadge').classList.toggle('running', state.monitorRunning);
    $('#monitorStartButton').classList.toggle('hidden', state.monitorRunning);
    $('#monitorStopButton').classList.toggle('hidden', !state.monitorRunning);
    $('#autoBuyEnableButton').classList.toggle('hidden', state.autoBuy);
    $('#autoBuyDisableButton').classList.toggle('hidden', !state.autoBuy);
    setDot('#sourceStatusDot', sourceReady);
    setDot('#amazonStatusDot', amazonReady);
    setDot('#monitorStatusDot', state.monitorRunning);
    $('#sourceAccountDetail').textContent = displayedSource === 'keepa-web'
      ? (keepaReady ? keepaAccount.displayName : state.keepaSessionConfirmed ? 'Sessione trovata · premi Accedi / verifica' : 'Account non verificato')
      : (telegramReady ? telegramAccountText(telegramAccount) : state.telegramSessionExists ? 'Sessione trovata · premi Collega / verifica' : 'Account non verificato');
    $('#amazonAccountDetail').textContent = amazonReady ? amazonAccount.displayName : state.amazonSessionConfirmed ? 'Sessione trovata · premi Accedi / verifica' : 'Account non verificato';
    $('#telegramSessionBadge').textContent = telegramReady ? `✓ Connesso: ${telegramAccountText(telegramAccount)}` : state.telegramSessionExists ? 'Sessione presente · identità da verificare' : 'Sessione non collegata';
    $('#telegramSessionBadge').classList.toggle('connected', telegramReady);
    $('#amazonSessionBadge').textContent = amazonReady ? `✓ Connesso: ${amazonAccount.displayName}` : state.amazonSessionConfirmed ? 'Sessione presente · identità da verificare' : 'Da collegare';
    $('#amazonSessionBadge').classList.toggle('connected', amazonReady);
    $('#keepaSessionBadge').textContent = keepaReady ? `✓ Connesso: ${keepaAccount.displayName}` : state.keepaSessionConfirmed ? 'Sessione presente · verifica richiesta' : 'Sessione non collegata';
    $('#keepaSessionBadge').classList.toggle('connected', keepaReady);
    if (!configDirty) {
      setValueUnlessEditing('#senderId', config.keepaSenderId || '');
    }
    updateSourceChoice();
    updateTelegramCredentials(config);
    $('#telegramApiId').placeholder = config.telegramApiIdSet ? 'Già configurato, lascia vuoto per mantenerlo' : 'Inserisci api_id';
    $('#telegramApiHash').placeholder = config.telegramApiHashSet ? 'Già configurato, lascia vuoto per mantenerlo' : 'Inserisci api_hash';
    const accessInProgress = Boolean(state.interactiveKind);
    $('#telegramLoginButton').disabled = accessInProgress;
    $('#keepaLoginButton').disabled = accessInProgress;
    $('#amazonLoginButton').disabled = accessInProgress;
    $('#monitorStartButton').disabled = configDirty || accessInProgress;
    $('#autoBuyEnableButton').disabled = configDirty || accessInProgress;
    $('#telegramLoginButton').textContent = state.interactiveKind === 'telegram' ? 'Telegram in corso…' : 'Collega / verifica';
    $('#keepaLoginButton').textContent = state.interactiveKind === 'keepa' ? 'Keepa in corso…' : 'Accedi / verifica';
    $('#amazonLoginButton').textContent = state.interactiveKind === 'amazon' ? 'Amazon in corso…' : 'Accedi / verifica';
    renderEvents(state.events || []);
    latestActivity = state.activity || [];
    renderActivity(latestActivity.filter((entry) => entry.time > hiddenThrough));
    updateInteractive(state);
  } catch (error) {
    showToast(`Pannello non raggiungibile: ${error.message}`, true);
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
    showToast('Configurazione salvata sul dispositivo.');
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

async function startLogin(kind) {
  try {
    const result = await api('/api/login/start', { method: 'POST', body: JSON.stringify({ kind }) });
    const sourceName = kind === 'telegram' ? 'Telegram' : kind === 'amazon' ? 'Amazon' : 'Keepa';
    if (result.alreadyRunning) {
      showToast(`${sourceName} è già in corso: completa il passaggio nel browser e premi Conferma.`);
    } else {
      showToast(kind === 'telegram' ? 'Accesso Telegram avviato.' : `Finestra di accesso ${sourceName} aperta.`);
    }
    await refresh();
  } catch (error) {
    if (/già attivo il passaggio/i.test(error.message)) {
      const sourceName = kind === 'telegram' ? 'Telegram' : kind === 'amazon' ? 'Amazon' : 'Keepa';
      showToast(`${sourceName} è già in attesa: completa il login e premi Conferma, oppure Annulla per ripartire.`);
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
  const isConfirmPrompt = /Amazon|Keepa|premi Invio/i.test($('#interactivePrompt').textContent);
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
    showToast('Monitoraggio Keepa avviato.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#monitorStopButton').addEventListener('click', async () => {
  await api('/api/monitor/stop', { method: 'POST', body: '{}' }).catch((error) => showToast(error.message, true));
  showToast('Arresto del monitoraggio richiesto.');
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
    showToast('Acquisto automatico abilitato.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#autoBuyDisableButton').addEventListener('click', async () => {
  try {
    await api('/api/auto-buy', { method: 'POST', body: JSON.stringify({ enabled: false }) });
    showToast('Acquisto automatico disattivato.');
    await refresh();
  } catch (error) { showToast(error.message, true); }
});
$('#refreshButton').addEventListener('click', refresh);
$('#clearLogButton').addEventListener('click', () => {
  hiddenThrough = latestActivity.at(-1)?.time || new Date().toISOString();
  renderActivity([]);
});

updateSourceChoice();
refresh();
setInterval(refresh, 2500);

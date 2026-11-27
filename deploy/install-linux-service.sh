#!/usr/bin/env bash
# Installa Keepa Buyer come servizio systemd sulla VPS Linux:
# parte all'avvio del server, riparte se si chiude e avvia da solo il monitoraggio.
# Uso (dalla cartella del progetto):  sudo bash deploy/install-linux-service.sh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="${SUDO_USER:-$(whoami)}"
NODE_BIN="$(sudo -u "$RUN_USER" bash -lc 'command -v node' || true)"
[ -n "$NODE_BIN" ] || { echo "Node.js non trovato per l'utente $RUN_USER: installalo prima (versione 20 o superiore)."; exit 1; }

# Sulla VPS il browser deve girare senza schermo.
if [ -f "$PROJECT_DIR/.env" ]; then
  if grep -q '^HEADLESS=' "$PROJECT_DIR/.env"; then sed -i 's/^HEADLESS=.*/HEADLESS=true/' "$PROJECT_DIR/.env"; else echo 'HEADLESS=true' >> "$PROJECT_DIR/.env"; fi
  grep -q '^AUTO_START_MONITOR=' "$PROJECT_DIR/.env" || echo 'AUTO_START_MONITOR=true' >> "$PROJECT_DIR/.env"
fi

cat > /etc/systemd/system/keepa-buyer.service <<UNIT
[Unit]
Description=Keepa Buyer (avvisi Keepa -> acquisti Amazon)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$PROJECT_DIR
Environment=KEEP_BUY_NO_OPEN=1
Environment=KEEP_BUY_PORT=8788
ExecStart=$NODE_BIN $PROJECT_DIR/src/server.mjs
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now keepa-buyer.service
echo "Servizio installato e avviato. Stato:   systemctl status keepa-buyer"
echo "Log in tempo reale:                      journalctl -u keepa-buyer -f"
echo "Pannello: http://127.0.0.1:8788 (dal PC usa un tunnel SSH: ssh -L 8788:127.0.0.1:8788 ubuntu@IP)"

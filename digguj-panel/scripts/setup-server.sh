#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────
#  Instalacja panelu na serwerze (Ubuntu / Debian, np. VPS OVH).
#  Uruchom w katalogu digguj-panel:
#      bash scripts/setup-server.sh
#  Skrypt można bezpiecznie uruchomić ponownie – nie nadpisze istniejącej konfiguracji.
# ─────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

say()  { printf '\n\033[1;33m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;31m! %s\033[0m\n' "$*"; }
ask_yes() { local a; read -rp "$1 [T/n] " a || return 1; [[ -z "$a" || "$a" =~ ^[TtYy] ]]; }

# ── 1. Docker ───────────────────────────────────────────────────────────
say "1/6 Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "Instaluję Dockera (oficjalny skrypt get.docker.com)…"
  curl -fsSL https://get.docker.com | $SUDO sh
fi
if [ -n "$SUDO" ] && ! id -nG "$USER" | grep -qw docker; then
  $SUDO usermod -aG docker "$USER"   # po ponownym zalogowaniu docker działa bez sudo (potrzebne m.in. dla kopii zapasowych z crona)
fi
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then DOCKER="$SUDO docker"; fi
$DOCKER compose version >/dev/null
ok "Docker gotowy"

# ── 2. Konfiguracja (.env) ──────────────────────────────────────────────
say "2/6 Konfiguracja"
rand_hex() { openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
if [ ! -f .env ]; then
  SERVER_IP="$(curl -fs4 --max-time 5 https://api.ipify.org || true)"
  echo "Podaj domenę panelu, np. panel.twojadomena.pl"
  [ -n "$SERVER_IP" ] && echo "(Nie masz domeny? Do testów możesz wpisać: panel.${SERVER_IP//./-}.sslip.io)"
  read -rp "Domena: " DOMAIN || DOMAIN=""
  DOMAIN="$(echo "$DOMAIN" | tr -d '[:space:]' | sed -E 's#^https?://##; s#/.*$##')"
  if [ -z "$DOMAIN" ]; then warn "Domena jest wymagana."; exit 1; fi
  umask 077
  cat > .env <<EOF
DOMAIN=$DOMAIN
POSTGRES_USER=digguj
POSTGRES_PASSWORD=$(rand_hex 24)
POSTGRES_DB=digguj
SESSION_SECRET=$(rand_hex 32)
MAX_UPLOAD_MB=25
EOF
  ok "Zapisano .env z losowymi hasłami (nie udostępniaj tego pliku)"
else
  ok ".env już istnieje – zostawiam bez zmian"
fi
DOMAIN="$(grep '^DOMAIN=' .env | cut -d= -f2-)"

# ── 3. DNS ──────────────────────────────────────────────────────────────
say "3/6 Sprawdzam DNS dla $DOMAIN"
SERVER_IP="$(curl -fs4 --max-time 5 https://api.ipify.org || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
DNS_IP6="$(getent ahostsv6 "$DOMAIN" 2>/dev/null | awk '$1 ~ /:/ && $1 !~ /^::ffff:/ {print $1; exit}' || true)"
if [ -z "$DNS_IP" ]; then
  warn "Domena $DOMAIN nie ma jeszcze rekordu A. Dodaj go (cel: ${SERVER_IP:-IP serwera}) i uruchom skrypt ponownie."
  ask_yes "Kontynuować mimo to? (certyfikat HTTPS pobierze się, gdy DNS zacznie działać)" || exit 1
elif [ -n "$SERVER_IP" ] && [ "$DNS_IP" != "$SERVER_IP" ]; then
  warn "Domena wskazuje na $DNS_IP, a ten serwer ma IP $SERVER_IP. Popraw rekord A."
  ask_yes "Kontynuować mimo to?" || exit 1
else
  ok "$DOMAIN → $DNS_IP"
fi
if [ -n "$DNS_IP6" ]; then
  warn "Domena ma też rekord AAAA ($DNS_IP6). Jeśli nie jest to IPv6 tego serwera, usuń go – inaczej certyfikat HTTPS może się nie wydać."
fi

# ── 4. Zapora ───────────────────────────────────────────────────────────
say "4/6 Zapora"
if command -v ufw >/dev/null 2>&1; then
  $SUDO ufw allow OpenSSH >/dev/null
  $SUDO ufw allow 80/tcp >/dev/null
  $SUDO ufw allow 443 >/dev/null
  if $SUDO ufw status | grep -q "Status: active"; then
    ok "ufw aktywny – dodano reguły dla SSH, 80 i 443"
  elif ask_yes "Włączyć zaporę ufw (otwarte tylko SSH:22, HTTP:80, HTTPS:443)? Jeśli SSH działa u Ciebie na innym porcie niż 22, wybierz n."; then
    $SUDO ufw --force enable >/dev/null && ok "Zapora włączona"
  fi
else
  echo "Brak ufw – pomijam (upewnij się, że porty 80 i 443 są otwarte)."
fi

# ── 5. Start ────────────────────────────────────────────────────────────
say "5/6 Buduję i uruchamiam panel (pierwszy raz: kilka minut)"
$DOCKER compose up -d --build </dev/null
echo -n "Czekam na aplikację"
for _ in $(seq 1 60); do
  if $DOCKER compose exec -T app wget -qO- http://127.0.0.1:3000/healthz </dev/null >/dev/null 2>&1; then echo; ok "Aplikacja działa"; break; fi
  echo -n "."; sleep 2
done
$DOCKER compose exec -T app wget -qO- http://127.0.0.1:3000/healthz </dev/null >/dev/null 2>&1 || { echo; warn "Aplikacja nie odpowiada – sprawdź: $DOCKER compose logs app"; exit 1; }

# ── 6. Konto i kopie zapasowe ───────────────────────────────────────────
say "6/6 Konto i kopie zapasowe"
if ask_yes "Założyć konto do logowania?"; then
  read -rp "Login (np. rafal): " LOGIN || LOGIN=""
  if [ -n "$LOGIN" ]; then
    $DOCKER compose exec app node scripts/create-user.js "$LOGIN" \
      || warn "Nie udało się założyć konta. Spróbuj ponownie: $DOCKER compose exec app node scripts/create-user.js <login>"
  else
    warn "Pominięto. Konto założysz później: $DOCKER compose exec app node scripts/create-user.js <login>"
  fi
fi
CRON_LINE="15 3 * * * cd $PWD && ./scripts/backup.sh >> backups/backup.log 2>&1"
if crontab -l 2>/dev/null | grep -qF "scripts/backup.sh"; then
  ok "Kopia zapasowa w cronie już ustawiona"
elif ask_yes "Robić automatyczną kopię zapasową bazy i zdjęć codziennie o 3:15?"; then
  mkdir -p backups
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  ok "Dodano do crona (kopie w $PWD/backups, trzymane 14 dni)"
fi

printf '\n\033[1;32m══════════════════════════════════════════════\033[0m\n'
printf '\033[1;32m  Gotowe!  https://%s\033[0m\n' "$DOMAIN"
printf '\033[1;32m══════════════════════════════════════════════\033[0m\n'
echo "Certyfikat HTTPS pobiera się przy pierwszym wejściu (do minuty)."
echo "Logi: $DOCKER compose logs -f app  •  Aktualizacja: git pull && $DOCKER compose up -d --build"
if [ -n "$SUDO" ] && [ "$DOCKER" != "docker" ]; then
  echo "Wyloguj się i zaloguj ponownie przez SSH, żeby używać polecenia docker bez sudo."
fi

# DIGGUJ FAKTY – panel twórcy

Zabezpieczony hasłem panel WWW do tworzenia postów na Instagram: **karuzel 4:5**, **rolek 9:16**, **wideo MP4** i **kalendariów** („Tego dnia w muzyce”). Wyrósł z jednoplikowego generatora uruchamianego przez Live Server – wszystkie jego funkcje zostały zachowane, a posty zapisują się teraz w bazie danych na serwerze.

## Co potrafi

- **Logowanie** – brak publicznej rejestracji, konta zakłada się z konsoli serwera.
- **Lista postów** – miniatury, statusy (Szkic → Gotowy → Zaplanowany → Opublikowany), planowana data publikacji, wyszukiwarka, filtry, duplikowanie, usuwanie, licznik postów w każdym statusie.
- **Edytor** (Twój dotychczasowy generator):
  - tryby: Album / Ogólny / Kalendarium; formaty: Karuzela 4:5 / Rolka 9:16 / Pełne wideo,
  - **autozapis do bazy** (ok. 1 s po ostatniej zmianie, `Ctrl+S` zapisuje od razu),
  - zdjęcia wysyłane na serwer (JPG/PNG/WEBP/GIF) – dostępne z każdego komputera,
  - kadrowanie zdjęć przeciąganiem (także na tablecie – obsługa dotyku),
  - zmiana kolejności slajdów (↑ ↓), usuwanie zdjęć ze slajdów,
  - eksport ZIP (slajdy + `opis_posta.txt`), JPG (kalendarium), wideo MP4 + okładka rolki + opis,
  - podgląd wideo z przejściami, wsad treści z JSON, licznik znaków opisu (limit IG 2200), kopiowanie opisu do schowka,
  - wykrywanie konfliktów: gdy ten sam post jest otwarty w dwóch kartach/na dwóch urządzeniach, panel nie nadpisze po cichu zmian.

## Technologia

| Warstwa | Co | Dlaczego |
|---|---|---|
| Serwer | Node.js 22 + Express 5 | prosty, jeden język (JS) na froncie i backendzie |
| Baza | PostgreSQL 16 | solidna, darmowa; stan edytora w kolumnie `JSONB`, więc nowe opcje edytora nie wymagają zmian w bazie |
| Frontend | czysty JavaScript (moduły ES), bez frameworka | brak kroku budowania – edytujesz plik i odświeżasz |
| Wdrożenie | Docker Compose + Caddy | jedna komenda uruchamia całość, Caddy sam załatwia certyfikat HTTPS |

### Struktura

```
digguj-panel/
├── server/                 # backend
│   ├── index.js            # start: migracje + serwer HTTP
│   ├── app.js              # konfiguracja Express (nagłówki bezpieczeństwa, sesje, trasy)
│   ├── auth.js             # logowanie, hasła (scrypt), ochrona CSRF
│   ├── config.js           # zmienne środowiskowe
│   ├── db.js, migrate.js   # połączenie z bazą, system migracji
│   └── routes/
│       ├── posts.js        # API postów
│       └── media.js        # upload i serwowanie zdjęć
├── migrations/             # zmiany schematu bazy (001_init.sql, 002_..., ...)
├── public/
│   ├── pages/              # login.html, index.html (lista), editor.html
│   ├── css/                # base.css (wspólne), editor.css, dashboard.css
│   ├── js/
│   │   ├── render.js       # ★ silnik rysowania slajdów (canvas) – czyste funkcje, bez DOM
│   │   ├── export.js       # ZIP / JPG / MP4, podgląd wideo
│   │   ├── editor.js       # logika edytora, autozapis
│   │   ├── dashboard.js    # lista postów
│   │   ├── api.js, ui.js   # komunikacja z serwerem, drobne elementy UI
│   │   └── login.js
│   └── assets/             # logotypy: digguj-fakty.png (+ opcjonalnie logo.png)
├── scripts/                # create-user, migrate, cleanup-media, backup.sh
├── test/                   # testy API
├── Dockerfile, docker-compose.yml, Caddyfile
└── .env.example
```

## Logotypy

Główne logo „DIGGUJ FAKTY” jest już w `public/assets/digguj-fakty.png`. Opcjonalnie możesz dodać drugie, małe logo jako `public/assets/logo.png` – pojawi się obok głównego (55×55 px).

## Uruchomienie lokalnie (na własnym komputerze)

Potrzebujesz **Node.js 22+** i **PostgreSQL** (albo Dockera – patrz niżej).

```bash
cd digguj-panel
npm install

# Baza danych – najprościej w Dockerze:
docker run -d --name digguj-db -e POSTGRES_USER=digguj -e POSTGRES_PASSWORD=haslo -e POSTGRES_DB=digguj -p 5432:5432 postgres:16-alpine

# Konfiguracja
cp .env.example .env
#  w .env ustaw:
#    DATABASE_URL=postgres://digguj:haslo@localhost:5432/digguj
#    SESSION_SECRET=<wynik: openssl rand -hex 32>
#    COOKIE_SECURE=false

npm run user:create -- admin     # zapyta o hasło (min. 10 znaków)
npm run dev                      # http://localhost:3000 (restart po każdej zmianie w server/)
```

## Wdrożenie na serwer (VPS) – krok po kroku

**Serwer:** wystarczy najmniejszy VPS z **2 GB RAM** i Ubuntu 24.04 (np. Hetzner CX22, OVH VPS, Mikrus 3.0 itp.). Generowanie grafik i wideo odbywa się w przeglądarce, więc serwer tylko przechowuje dane.

**Domena:** w panelu DNS dodaj rekord **A** (np. `panel.twojadomena.pl`) wskazujący na IP serwera.

```bash
# 1. Zaloguj się na serwer i zainstaluj Dockera
ssh root@IP_SERWERA
curl -fsSL https://get.docker.com | sh

# 2. Zapora – tylko SSH i WWW
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# 3. Pobierz projekt
git clone https://github.com/<twoje-konto>/<repo>.git /opt/digguj
cd /opt/digguj/digguj-panel

# 4. Konfiguracja
cp .env.example .env
nano .env
#   DOMAIN=panel.twojadomena.pl
#   POSTGRES_PASSWORD=<openssl rand -hex 24>
#   SESSION_SECRET=<openssl rand -hex 32>

# 5. Start (pierwsze uruchomienie trwa kilka minut)
docker compose up -d --build

# 6. Konto
docker compose exec app node scripts/create-user.js rafal
```

Gotowe – panel działa pod `https://panel.twojadomena.pl` (certyfikat HTTPS pobiera się sam przy pierwszym wejściu).

### Aktualizacja do nowej wersji

```bash
cd /opt/digguj/digguj-panel
git pull
docker compose up -d --build     # migracje bazy wykonują się automatycznie przy starcie
```

### Kopie zapasowe

```bash
./scripts/backup.sh              # → backups/RRRR-MM-DD_HHMM/{db.dump, uploads.tar.gz}
```

Automatycznie co noc (`crontab -e`):

```
15 3 * * * cd /opt/digguj/digguj-panel && ./scripts/backup.sh >> backups/backup.log 2>&1
```

Kopie warto co jakiś czas ściągać poza serwer (np. `rsync`/`scp` na własny komputer albo do chmury).

Przywracanie:

```bash
docker compose exec -T db pg_restore -U digguj -d digguj --clean --if-exists < backups/<data>/db.dump
docker compose exec -T app tar -xzf - -C /app < backups/<data>/uploads.tar.gz
```

### Przydatne komendy

```bash
docker compose logs -f app                                    # logi aplikacji
docker compose exec app node scripts/create-user.js <login>   # nowe konto / reset hasła
docker compose exec app node scripts/cleanup-media.js         # ile miejsca zajmują nieużywane zdjęcia
docker compose exec app node scripts/cleanup-media.js --delete
```

## Bezpieczeństwo – co jest zrobione

- HTTPS z automatycznym certyfikatem (Caddy + Let's Encrypt), HSTS.
- Hasła hashowane **scrypt** (z solą); ochrona przed zgadywaniem – max 10 nieudanych prób / 15 min z jednego IP.
- Sesje w bazie, ciasteczko `HttpOnly` + `Secure` + `SameSite=Lax`, nowe ID sesji po zalogowaniu, zmiana hasła wylogowuje inne urządzenia.
- Ochrona **CSRF** (wymagany nagłówek `X-Requested-With` + weryfikacja `Origin`).
- Nagłówki bezpieczeństwa (Helmet): restrykcyjne **CSP** (skrypty tylko z własnego serwera), zakaz osadzania w ramkach itd.
- Upload: rozpoznawanie typu pliku po zawartości (nie po rozszerzeniu), limit rozmiaru, losowe nazwy plików, zdjęcia dostępne tylko po zalogowaniu.
- Biblioteki (JSZip, mp4-muxer) i fonty serwowane z własnego serwera – żadnych zewnętrznych CDN.
- Panel ukryty przed wyszukiwarkami (`noindex`).
- Baza danych nie jest wystawiona do internetu (dostępna tylko wewnątrz Dockera).

## Jak rozwijać projekt

### Nowa opcja w edytorze (np. suwak)

1. Dodaj pole do `public/pages/editor.html` z unikalnym `id` (np. `<input type="range" id="szCaption" data-unit="px">` + `<span id="szCaptionVal">`).
2. Dodaj domyślną wartość do `DEFAULTS` w `public/js/render.js` (`szCaption: '40'`).
3. Użyj jej w funkcji rysującej: `cfg.szCaption`.

To wszystko – pole automatycznie się zapisuje, wczytuje i odświeża podgląd. Baza nie wymaga zmian (stan edytora siedzi w `posts.data`).

### Zmiana w bazie danych

Dodaj **nowy** plik `migrations/002_opis_zmiany.sql` (nigdy nie edytuj już wykonanych). Wykona się automatycznie przy starcie serwera.

### Testy

```bash
createdb digguj_test   # osobna, pusta baza – testy ją czyszczą!
TEST_DATABASE_URL=postgres://digguj:haslo@localhost:5432/digguj_test npm test
```

### API (dla przyszłych integracji)

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` · `/api/auth/password` | logowanie / wylogowanie / zmiana hasła |
| GET | `/api/posts?q=&status=&mode=&sort=` | lista postów |
| GET · PUT · DELETE | `/api/posts/:id` | pobranie / zapis (wymaga `version`) / usunięcie |
| POST | `/api/posts` · `/api/posts/:id/duplicate` | nowy post / kopia |
| POST | `/api/media` | upload zdjęcia (`multipart/form-data`, pole `file`) |

Zapytania zmieniające dane muszą mieć nagłówek `X-Requested-With: digguj`.

## Pomysły na kolejne etapy

- **Kalendarz publikacji** – widok miesiąca z zaplanowanymi postami (dane już są: `scheduled_at`).
- **Szablony** – zapisywanie ustawień wyglądu (kolory, rozmiary, blur) jako szablonu do ponownego użycia.
- **Publikacja prosto na Instagram** przez Instagram Graph API (wymaga konta firmowego/twórcy i aplikacji Meta).
- **Generowanie treści przez AI** – np. przycisk „wygeneruj ciekawostki” wypełniający slajdy z JSON (format wsadu już istnieje).
- **Role użytkowników** – kolumna `role` (`admin` / `editor`) już jest w bazie, można ograniczyć np. usuwanie postów.
- **Historia wersji posta** – tabela `post_versions` zapisywana przy każdym zapisie.
- Zmniejszanie dużych zdjęć przed wysłaniem (szybszy upload z telefonu).

## Migracja z wersji lokalnej (Live Server)

Stara wersja trzymała dane w przeglądarce (IndexedDB) – nie przeniosą się automatycznie. Aby przenieść aktualnie otwarty post: utwórz nowy post w panelu i wklej treść przez **⚡ Wsad Danych (JSON)** (np. `{"mode":"album","artist":"…","title":"…","slides":[{"text":"…"}]}`), a zdjęcia wgraj ponownie.

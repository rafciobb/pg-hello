# DIGGUJ FAKTY – panel twórcy

Zabezpieczony hasłem panel WWW do tworzenia postów na Instagram: **karuzel 4:5**, **rolek 9:16**, **wideo MP4** i **kalendariów** („Tego dnia w muzyce”). Wyrósł z jednoplikowego generatora uruchamianego przez Live Server – wszystkie jego funkcje zostały zachowane, a posty zapisują się w bazie danych na serwerze.

Działa na **zwykłym hostingu WWW z PHP i MySQL** (np. OVH Hosting Perso/Pro/Performance) – bez VPS-a, bez Node.js, bez Dockera.

## Co potrafi

- **Logowanie** – brak publicznej rejestracji; pierwsze konto zakłada instalator, kolejne (i reset zapomnianego hasła) strona `/install` z kluczem odzyskiwania.
- **Lista postów** – miniatury, statusy (Szkic → Gotowy → Zaplanowany → Opublikowany), planowana data publikacji, wyszukiwarka, filtry, duplikowanie, usuwanie, licznik postów w każdym statusie.
- **Edytor** (Twój dotychczasowy generator):
  - tryby: Album / Ogólny / Kalendarium; formaty: Karuzela 4:5 / Rolka 9:16 / Pełne wideo,
  - **autozapis do bazy** (ok. 1 s po ostatniej zmianie, `Ctrl+S` zapisuje od razu),
  - zdjęcia wysyłane na serwer (JPG/PNG/WEBP/GIF) – dostępne z każdego komputera,
  - kadrowanie zdjęć przeciąganiem (także na tablecie – obsługa dotyku),
  - zmiana kolejności slajdów (↑ ↓), usuwanie zdjęć ze slajdów,
  - **slajd końcowy CTA** („Udostępnij i zrepostuj”) doklejany automatycznie do karuzel 4:5 (bez rolek i wideo): tło to ta sama rozmyta okładka co na 1. slajdzie, 3 style do wyboru (szklana karta / karta z logo w medalionie / tekst na rozmytym tle), teksty edytowalne, opcjonalnie „Obserwuj @profil”; domyślne ustawienia zapisuje się raz dla wszystkich nowych postów,
  - eksport ZIP (slajdy + `opis_posta.txt`), JPG (kalendarium), wideo MP4 + okładka rolki + opis,
  - podgląd wideo z przejściami, wsad treści z JSON, licznik znaków opisu (limit IG 2200), kopiowanie opisu do schowka,
  - wykrywanie konfliktów: gdy ten sam post jest otwarty w dwóch kartach/na dwóch urządzeniach, panel nie nadpisze po cichu zmian.

## Technologia

| Warstwa | Co | Dlaczego |
|---|---|---|
| Serwer | PHP 8.1+ (bez frameworka i bez Composera) | działa na każdym zwykłym hostingu; jeden publiczny plik `index.php` |
| Baza | MySQL 5.7+ / MariaDB 10.3+ | standard na hostingu; stan edytora w kolumnie JSON, więc nowe opcje edytora nie wymagają zmian w bazie |
| Frontend | czysty JavaScript (moduły ES) | cała grafika (canvas), ZIP i MP4 powstają w przeglądarce – serwer tylko przechowuje dane |

### Struktura

```
digguj-panel/                ← zawartość tego folderu wgrywasz na hosting
├── index.php                # jedyny publiczny plik PHP: strony, API, zdjęcia
├── .htaccess                # HTTPS, blokada plików serwera, przekierowanie do index.php
├── .ovhconfig               # wersja PHP na hostingu OVH
├── config.sample.php        # wzór konfiguracji (config.php tworzy instalator)
├── app/                     # kod serwera (niedostępny z przeglądarki)
│   ├── Core.php             # konfiguracja, baza, migracje, nagłówki bezpieczeństwa, CSRF
│   ├── Auth.php             # logowanie, sesje w bazie, limit prób, zmiana hasła
│   ├── Posts.php            # API postów
│   ├── Media.php            # upload i serwowanie zdjęć, ustawienia (CTA)
│   └── Installer.php        # strona /install (instalacja, reset hasła, nowe konta)
├── migrations/              # schemat bazy (001_init.sql, 002_..., ...)
├── pages/                   # login.html, index.html (lista postów), editor.html
├── css/  js/  assets/       # wygląd i logika w przeglądarce
│   └── js/render.js         # ★ silnik rysowania slajdów (canvas)
├── fonts/  vendor/          # fonty i biblioteki (JSZip, mp4-muxer) – bez zewnętrznych CDN
├── storage/uploads/         # przesłane zdjęcia (niedostępne bez logowania)
└── dev/                     # tylko do pracy lokalnej: Docker, testy, skrypt budujący fonty
```

## Wdrożenie na hosting OVH – krok po kroku

Potrzebujesz: dostępu do **OVH Managera**, programu do FTP (np. darmowa **[FileZilla](https://filezilla-project.org/)**) i folderu `digguj-panel` (pobierz ZIP z GitHuba: gałąź `claude/epic-knuth-y21dv5` → **Code → Download ZIP**).

### 1. Baza danych
**Web Cloud → Hosting → Twój hosting → zakładka „Bazy danych” → Utwórz bazę danych** (MySQL). Zapisz: **serwer** (np. `xxxxxx.mysql.db`), **nazwę bazy**, **użytkownika** i **hasło**.

### 2. Adres panelu (subdomena)
**Web Cloud → Hosting → zakładka „Multisite” → Dodaj domenę lub subdomenę**:
- domena: np. `panel.twojadomena.pl`,
- **katalog główny: `panel`** (osobny folder – Twoja obecna strona zostaje nietknięta),
- zaznacz **SSL**.

Po kilku minutach w zakładce **„Informacje ogólne” → Certyfikat SSL** upewnij się, że certyfikat obejmuje nową subdomenę (w razie potrzeby „Wygeneruj ponownie certyfikat SSL”).

> Panel musi działać w „korzeniu” adresu (np. `https://panel.twojadomena.pl/`), a nie w podfolderze typu `twojadomena.pl/panel/`.

### 3. Wgranie plików (FTP)
Dane FTP: **Hosting → zakładka „FTP – SSH”** (serwer, login; hasło możesz tam zmienić).
W FileZilli połącz się i wgraj **całą zawartość** folderu `digguj-panel` do folderu **`panel`** (tego z kroku 2).
Folderów `dev/` i `node_modules/` nie musisz wgrywać (a gdyby trafiły na serwer – i tak są zablokowane).

> Włącz w FileZilli pokazywanie ukrytych plików (**Serwer → Wymuś pokazywanie ukrytych plików**) – `.htaccess` i `.ovhconfig` muszą trafić na serwer.

### 4. Instalacja
Otwórz **`https://panel.twojadomena.pl/install`** i wpisz dane bazy z kroku 1 oraz login i hasło do panelu. Instalator:
- sprawdzi połączenie z bazą i utworzy tabele,
- założy Twoje konto,
- zapisze plik `config.php` i pokaże **klucz odzyskiwania** – zapisz go (jest też w `config.php`).

Gotowe – zaloguj się pod `https://panel.twojadomena.pl`.

**Wersja PHP:** panel wymaga PHP 8.1+. Plik `.ovhconfig` ustawia PHP 8.2 – jeśli mimo to zobaczysz komunikat o wersji PHP, ustaw ją w **Hosting → Informacje ogólne → Konfiguracja → Zmień konfigurację** (uwaga: to ustawienie może dotyczyć całego hostingu, sprawdź potem swoją główną stronę).

### Aktualizacja do nowej wersji
Wgraj nowe pliki przez FTP w to samo miejsce (nadpisz). **Nie usuwaj** `config.php` ani `storage/uploads/` – to Twoja konfiguracja i zdjęcia. Zmiany w bazie wykonają się same przy pierwszym wejściu.

### Zapomniane hasło / kolejne konto
Wejdź na `/install`, podaj **klucz odzyskiwania** (`setup_key` z pliku `config.php` – podejrzysz go przez FTP), login i nowe hasło. Istniejący login → zmiana hasła, nowy login → nowe konto.

### Kopie zapasowe
OVH robi automatyczne kopie plików i baz danych hostingu (Manager → Hosting → „FTP – SSH” → Przywróć kopię zapasową / „Bazy danych” → Kopie zapasowe). Dodatkowo co jakiś czas:
- pobierz przez FTP folder `storage/uploads/` (zdjęcia),
- w **„Bazy danych”** użyj **„Utwórz kopię zapasową”** i pobierz plik.

### Limity hostingu
Zdjęcia są automatycznie zmniejszane w przeglądarce przed wysłaniem (maks. 2600 px, zwykle < 3 MB), więc limity uploadu na hostingu nie powinny przeszkadzać. Maksymalny rozmiar pliku ustawisz w `config.php` (`max_upload_mb`).

## Test na własnym komputerze

Przez Docker Desktop – ten sam PHP + MySQL co na hostingu. Instrukcja krok po kroku i lista rzeczy do sprawdzenia: **[TESTOWANIE.md](TESTOWANIE.md)**.

```bash
docker compose -f dev/docker-compose.yml up --build   # → http://localhost:3000  (admin / testowe-haslo)
```

## Bezpieczeństwo – co jest zrobione

- Wymuszony HTTPS (`.htaccess`), HSTS.
- Hasła hashowane **bcrypt**; limit 10 nieudanych prób logowania / 15 min z jednego IP; porównanie hasła zajmuje tyle samo czasu niezależnie od tego, czy konto istnieje.
- Sesje w bazie danych, ciasteczko `HttpOnly` + `Secure` + `SameSite=Lax`, nowe ID sesji po zalogowaniu, zmiana hasła wylogowuje inne urządzenia.
- Ochrona **CSRF** (wymagany nagłówek `X-Requested-With` + weryfikacja `Origin`).
- Restrykcyjne **CSP** (skrypty tylko z własnego serwera), zakaz osadzania w ramkach, `nosniff`.
- Kod serwera, konfiguracja, migracje i zdjęcia **niedostępne** z przeglądarki (`.htaccess`); zdjęcia wydawane tylko zalogowanym.
- Upload: rozpoznawanie typu po zawartości pliku, limit rozmiaru, losowe nazwy plików.
- Zapytania do bazy wyłącznie przez parametry (PDO) – brak SQL injection.
- Fonty i biblioteki z własnego serwera – żadnych zewnętrznych CDN; panel ukryty przed wyszukiwarkami.

## Jak rozwijać projekt

### Nowa opcja w edytorze (np. suwak)

1. Dodaj pole do `pages/editor.html` z unikalnym `id` (np. `<input type="range" id="szCaption" data-unit="px">` + `<span id="szCaptionVal">`).
2. Dodaj domyślną wartość do `DEFAULTS` w `js/render.js` (`szCaption: '40'`).
3. Użyj jej w funkcji rysującej: `cfg.szCaption`.

To wszystko – pole automatycznie się zapisuje, wczytuje i odświeża podgląd. Baza nie wymaga zmian (stan edytora siedzi w `posts.data`).

### Zmiana w bazie danych

Dodaj **nowy** plik `migrations/002_opis_zmiany.sql` (nigdy nie edytuj już wykonanych; każde polecenie zakończ średnikiem na końcu linii). Wykona się automatycznie przy pierwszym wejściu na panel.

### Testy

```bash
docker compose -f dev/docker-compose.yml up -d --build
npm test            # testy API (Node.js 20+); BASE_URL=... żeby testować inny adres
```

### API (dla przyszłych integracji)

| Metoda | Ścieżka | Opis |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` · `/api/auth/password` | logowanie / wylogowanie / zmiana hasła |
| GET | `/api/auth/me` | zalogowany użytkownik |
| GET | `/api/posts?q=&status=&mode=&sort=` | lista postów |
| GET · PUT · DELETE | `/api/posts/{id}` | pobranie / zapis (wymaga `version`) / usunięcie |
| POST | `/api/posts` · `/api/posts/{id}/duplicate` | nowy post / kopia |
| POST | `/api/media` | upload zdjęcia (`multipart/form-data`, pole `file`) |
| GET | `/media/{id}` | zdjęcie (tylko dla zalogowanych) |
| GET · PUT | `/api/settings/ctaDefaults` | domyślne ustawienia slajdu CTA dla nowych postów |

Zapytania zmieniające dane muszą mieć nagłówek `X-Requested-With: digguj`. PUT/DELETE można wysłać jako POST z nagłówkiem `X-HTTP-Method-Override` (część hostingów blokuje te metody).

## Pomysły na kolejne etapy

- **Kalendarz publikacji** – widok miesiąca z zaplanowanymi postami (dane już są: `scheduled_at`).
- **Szablony** – zapisywanie ustawień wyglądu (kolory, rozmiary, blur) jako szablonu do ponownego użycia.
- **Publikacja prosto na Instagram** przez Instagram Graph API (wymaga konta firmowego/twórcy i aplikacji Meta).
- **Generowanie treści przez AI** – np. przycisk „wygeneruj ciekawostki” wypełniający slajdy z JSON (format wsadu już istnieje).
- **Role użytkowników** – kolumna `role` (`admin` / `editor`) już jest w bazie, można ograniczyć np. usuwanie postów.
- **Historia wersji posta** – tabela `post_versions` zapisywana przy każdym zapisie.
- Przycisk „wyczyść nieużywane zdjęcia” (pliki po usuniętych postach).

## Migracja z wersji lokalnej (Live Server)

Stara wersja trzymała dane w przeglądarce (IndexedDB) – nie przeniosą się automatycznie. Aby przenieść aktualnie otwarty post: utwórz nowy post w panelu i wklej treść przez **⚡ Wsad Danych (JSON)** (np. `{"mode":"album","artist":"…","title":"…","slides":[{"text":"…"}]}`), a zdjęcia wgraj ponownie.

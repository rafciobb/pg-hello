# Testowanie panelu na własnym komputerze

Całość (panel + baza danych) uruchamia się w Dockerze jedną komendą. Nic nie instalujesz poza Docker Desktop, a po testach możesz wszystko usunąć.

## 1. Przygotowanie (jednorazowo)

1. Zainstaluj **Docker Desktop**: https://www.docker.com/products/docker-desktop/
   - Windows: przy instalacji zostaw zaznaczone „Use WSL 2”, po instalacji uruchom ponownie komputer.
   - Uruchom Docker Desktop i poczekaj, aż w lewym dolnym rogu pojawi się „Engine running”.
2. Pobierz kod z gałęzi `claude/epic-knuth-y21dv5`:
   - **bez gita:** otwórz https://github.com/rafciobb/pg-hello/tree/claude/epic-knuth-y21dv5 → zielony przycisk **Code** → **Download ZIP** → rozpakuj,
   - **z gitem:** `git clone -b claude/epic-knuth-y21dv5 https://github.com/rafciobb/pg-hello.git`
3. (Opcjonalnie) wrzuć drugie, małe logo do `digguj-panel/public/assets/logo.png`.

## 2. Uruchomienie

W VS Code: **File → Open Folder** → wybierz folder `digguj-panel`, potem **Terminal → New Terminal** i wpisz:

```bash
docker compose -f docker-compose.local.yml up --build
```

Pierwsze uruchomienie trwa kilka minut (pobieranie obrazów). Gdy w terminalu pojawi się
`DIGGUJ panel działa na http://localhost:3000`, otwórz w przeglądarce (najlepiej **Chrome**):

**http://localhost:3000** → login: **`admin`**, hasło: **`testowe-haslo`**

- Zatrzymanie: `Ctrl+C` w terminalu. Dane (posty, zdjęcia) zostają na następny raz.
- Ponowne uruchomienie: ta sama komenda.
- Usunięcie wszystkiego razem z danymi testowymi: `docker compose -f docker-compose.local.yml down -v`
- Po pobraniu nowszej wersji kodu uruchom z `--build` (jak wyżej) – zmiany w bazie wykonają się same.

## 3. Lista kontrolna

### Logowanie i bezpieczeństwo
- [ ] Wejście na http://localhost:3000 bez logowania przekierowuje na stronę logowania
- [ ] Złe hasło → komunikat „Nieprawidłowy login lub hasło”
- [ ] 🔑 Zmień hasło → wylogowanie → logowanie nowym hasłem
- [ ] ⎋ Wyloguj → powrót do logowania; przycisk „wstecz” nie pokazuje postów

### Lista postów
- [ ] Utworzenie postu każdego typu: 💿 Album, 🎸 Ogólny, 📅 Kalendarium
- [ ] Miniatury pojawiają się po chwili edycji
- [ ] Zmiana statusu z listy, liczniki u góry się aktualizują, kliknięcie licznika filtruje
- [ ] Wyszukiwarka, filtry trybu i sortowanie; odświeżenie strony nie gubi filtrów
- [ ] ⧉ Duplikuj i 🗑️ Usuń

### Edytor – album (karuzela 4:5)
- [ ] Wgranie zdjęcia głównego, uzupełnienie artysty / tytułu / roku / wytwórni
- [ ] Dodanie kilku slajdów ze zdjęciami i tekstem, zmiana kolejności ↑ ↓, usunięcie zdjęcia ze slajdu
- [ ] Przeciąganie zdjęcia na podglądzie (kadrowanie)
- [ ] Suwaki blur / przyciemnienie / rozmiary / kolory
- [ ] Kliknięcie slajdu → powiększenie, strzałki ← → przełączają, Esc zamyka
- [ ] Status „✓ Zapisano” po każdej zmianie; odświeżenie strony (F5) – wszystko zostaje
- [ ] **Slajd CTA** na końcu: przełączanie 3 stylów, edycja tekstów, pole „@profil”, wyłączenie przełącznikiem
- [ ] 💾 Ustaw jako domyślne → nowy post ma te same ustawienia CTA; ↺ Przywróć domyślne
- [ ] ⬇ Pobierz karuzelę (.ZIP) – slajdy (z CTA) + `opis_posta.txt`

### Edytor – rolka, wideo, kalendarium
- [ ] Rolka 9:16 – podgląd w pionie, **bez** slajdu CTA
- [ ] Full Wideo – ▶ Podgląd wideo, różne przejścia; ⬇ Pobierz wideo (.ZIP) – MP4 + okładka + opis
- [ ] Kalendarium – data, wydarzenia z rokiem na początku linii, kolor akcentu, ⬇ Pobierz grafikę (.JPG)

### Inne
- [ ] ⚡ Wsad JSON (np. `{"mode":"album","artist":"…","title":"…","slides":[{"text":"…"}]}`)
- [ ] 📋 Kopiuj opis, licznik znaków (limit 2200)
- [ ] Ten sam post otwarty w dwóch kartach → w drugiej pojawia się ostrzeżenie o konflikcie
- [ ] Panel na telefonie (w tej samej sieci Wi-Fi: `http://<IP-komputera>:3000`)

Znalazłeś błąd? Zapisz, co kliknąłeś, co się stało i czego się spodziewałeś (najlepiej ze zrzutem ekranu).

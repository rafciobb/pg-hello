# EuroFrance: content plan bloga 2026/2027, Etap C: podsumowanie i kontrola jakości

Źródło danych: `03-content-plan-eurofrance.csv` (60 wpisów). Statystyki policzone skryptem `tools/analyze_plan.py`.

---

## 1. Plan w liczbach i odchylenia od założeń z Etapu A

| Wymiar | Założenie (Etap A) | Wynik planu | Komentarz |
|---|---|---|---|
| Liczba wpisów | 60, po 5 miesięcznie | 60, po 5 w każdym z 12 miesięcy | ✔ |
| Pillary / clustery / supporty | 10 / 50 | 10 / 47 / 3 | ✔ Supporty to szybkie wygrane na start (EF-2611-04, EF-2611-05, EF-2708-01) |
| Wpisy na klaster | K1 6 · K2 6 · K3 6 · K4 6 · K5 6 · K6 7 · K7 6 · K8 5 · K9 7 · K10 5 | identycznie | ✔ |
| Lejek TOFU / MOFU / BOFU-inf. | 26 / 20 / 14 | 24 / 28 / 8 | ⚠ Mniej BOFU niż planowano. Część wpisów MOFU jest jednak mocno zakupowa (skrzynia AL4, pompa ABS, maglownica). Backlog uzupełnia BOFU (pkt 4). |
| Ryzyko (flaga dominująca): bezpieczeństwo / prawne / merytoryczne / brak | 10 / 5 / 20 / 25 | 20 / 13 / 21 / 6 | ⚠ Dwa razy więcej tematów wymagających ostrożności: 33 wpisy mają flagę bezpieczeństwa lub prawną (20 i 15, dwa mają obie). To argument za stałą weryfikacją merytoryczną (pkt 5). |
| Priorytety P1 / P2 / P3 | – | 37 / 23 / 0 | ⚠ Za dużo P1, żeby różnicowały kolejność. Propozycja korekty poniżej. |
| Tematy [INTL] | 15–20 | 22 | ✔ Lista w pkt 6 |
| Title ≤ 60 znaków | – | maks. 60 | ✔ |

### Propozycja kalibracji priorytetów
Przy obecnych progach (P1 ≥ 3,8; P2 ≥ 3,0) aż 37 z 60 wpisów to P1. Proponuję zaostrzyć progi, żeby priorytet realnie wskazywał kolejność pracy (np. przy opóźnieniach albo braku eksperta):

| Wariant | P1 | P2 | P3 |
|---|---|---|---|
| Obecny (P1 ≥ 3,8; P2 ≥ 3,0) | 37 | 23 | 0 |
| **Rekomendowany (P1 ≥ 4,0; P2 ≥ 3,5)** | **29** | **21** | **10** |

Pillary pozostają P1 niezależnie od wyniku. Zmiana to jedna linijka w `tools/export_csv.py`. Wprowadzę ją po Twojej akceptacji.

---

## 2. Pokrycie kategorii sklepu linkami z bloga

**Razem:** 208 linków do kategorii, prowadzących do 138 z 417 URL-i w drzewie (33%). To świadoma koncentracja: linkujemy do najbardziej szczegółowych podkategorii w obszarach o najwyższym potencjale.

| Kategoria główna | URL w drzewie | URL z linkiem | Linków z bloga | Ocena |
|---|---|---|---|---|
| Silnik i osprzęt | 77 | 29 | 48 | ✔ mocne wsparcie (rozrząd, EGR, turbo, czujniki, rozruch) |
| Układ hamulcowy | 24 | 16 | 31 | ✔ bardzo dobre |
| Układ elektryczny | 13 | 7 | 20 | ✔ bardzo dobre (sterowniki, akumulatory) |
| Układ napędowy | 21 | 12 | 17 | ✔ dobre |
| Zawieszenie, amortyzacja | 29 | 13 | 16 | ✔ dobre |
| Chłodzenie silnika | 11 | 8 | 14 | ✔ bardzo dobre |
| Ogrzewanie, wentylacja, klimatyzacja | 19 | 11 | 12 | ✔ dobre |
| Układ paliwowy | 25 | 6 | 8 | ◐ średnie (brak: pompa paliwa, LPG, czujniki paliwa) |
| Filtry | 5 | 3 | 5 | ✔ dobre |
| Układ kierowniczy | 9 | 5 | 5 | ✔ dobre |
| Oświetlenie | 16 | 5 | 5 | ◐ średnie (brak: lampy tylne, DRL, kierunkowskazy jako temat) |
| Koła, felgi | 21 | 4 | 4 | ◐ świadomie niskie (opony w backlogu) |
| Wycieraczki, spryskiwacze | 14 | 4 | 4 | ◐ średnie |
| Części karoserii | 31 | 4 | 5 | ⚠ słabe względem wartości koszyka |
| Części blacharskie | 19 | 2 | 2 | ⚠ słabe względem wartości koszyka |
| Sprzęt audio fabryczny | 9 | 3 | 3 | ✔ wystarczające (nisza) |
| Wyposażenie wnętrza, bezpieczeństwo | 42 | 3 | 3 | ⚠ słabe (brak: podnośniki szyb, pasy, poduszki powietrzne) |
| Układ wydechowy | 10 | 2 | 2 | ⚠ słabe (brak: katalizator, tłumik) |
| **System zamykania** | 7 | 0 | 0 | ✖ brak wsparcia |
| **Systemy komfortowe (PDC)** | 3 | 0 | 0 | ✖ brak wsparcia |
| **Wyposażenie dodatkowe** | 11 | 0 | 0 | ✖ brak wsparcia |

**Najczęściej linkowane podkategorie:** zestawy rozrządu (8), klocki hamulcowe (6), sterowniki/komputery (6), akumulatory (5), przekaźniki (4), zaciski hamulcowe (4). To właściwe cele: wysoka wartość koszyka albo częsty zakup.

**Wnioski:**
1. **Obszary bez wsparcia lub ze słabym wsparciem** (zamykanie, czujniki parkowania, wyposażenie dodatkowe, karoseria, wnętrze, wydech) to główne źródło tematów w backlogu (pkt 4). Pierwszeństwo mają te o wysokim koszyku: elementy karoserii, podnośniki szyb, katalizatory.
2. **Rekomendacja techniczna:** w opisach 15–20 najczęściej linkowanych kategorii dodać moduł „Poradniki”, czyli link zwrotny z kategorii do bloga. Bez tego autorytet płynie tylko w jedną stronę.
3. **Duplikaty kategorii** (spojlery, spryskiwacze reflektorów, recyrkulacja spalin, relingi) są w planie omijane. Blog linkuje zawsze do wersji głównej, np. EGR: `/silnik-i-osprzet/recyrkulacja-spalin-egr/…`.

---

## 3. Mapa linkowania wewnętrznego (pillar → clustery)

Zasady:
- **pillar** linkuje do wszystkich wpisów swojego klastra;
- każdy wpis linkuje do swojego **pillara** i do 1–2 wpisów sąsiednich (szczegóły w kolumnie „Linki wewnętrzne blog”);
- kolumna „Zaktualizować” mówi, które **wcześniejsze** wpisy trzeba uzupełnić o link po publikacji nowego.

| Klaster | Pillar | Clustery / supporty |
|---|---|---|
| **K1** Świadomy zakup | EF-2611-01 Części oryginalne, OEM i zamienniki | EF-2612-05 Numer OE · EF-2701-05 Podróbki · EF-2704-05 Kod silnika · EF-2707-05 Zamówienie online (hub zakupowy) · EF-2709-05 Eurorepar i Motrio |
| **K2** Rozrząd i napęd pasowy | EF-2612-03 Rozrząd: pasek czy łańcuch | EF-2701-02 1.2 PureTech · EF-2704-04 Pompa wody · EF-2706-04 Pasek wielorowkowy · EF-2708-02 Łańcuch rozrządu · EF-2710-03 Koło pasowe wału |
| **K3** Sprzęgło i skrzynia | EF-2701-01 Sprzęgło i dwumasa | EF-2702-04 Ciężko wchodzą biegi · EF-2703-04 Skrzynia AL4/DP0 · EF-2705-04 Przegub półosi · EF-2707-01 Kod skrzyni · EF-2708-03 Pedał sprzęgła |
| **K4** Hamulce | EF-2702-02 Klocki, tarcze, płyn | EF-2703-03 Piszczące hamulce · EF-2704-03 Zapieczony zacisk · EF-2706-03 Hamulce bębnowe · EF-2708-05 EPB · EF-2710-04 Przewody hamulcowe |
| **K5** Zawieszenie i kierownica | EF-2702-01 Stuki w zawieszeniu | EF-2703-02 Wahacz · EF-2705-02 Hydropneumatyka Citroëna · EF-2706-05 Amortyzatory · EF-2707-04 Maglownica · EF-2710-05 Łożysko koła |
| **K6** Chłodzenie, ogrzewanie, klima | EF-2702-03 Układ chłodzenia | EF-2611-03 Nagrzewnica ⚑ · EF-2703-01 Filtr kabinowy · EF-2704-02 Sprężarka klimatyzacji · EF-2705-01 Przegrzewanie · EF-2706-01 Wentylator · EF-2709-03 Dmuchawa |
| **K7** Elektronika | EF-2612-04 Sterowniki ECU/BSI/UCH/ABS | EF-2611-05 Karta Renault ⚑ · EF-2701-04 BSI · EF-2703-05 Pompa ABS · EF-2707-02 Nawigacja Renault · EF-2708-01 Kod do radia |
| **K8** Elektryka i rozruch | EF-2611-02 Samochód nie odpala | EF-2612-02 Świece żarowe · EF-2702-05 Rozrusznik · EF-2709-01 Akumulator · EF-2710-01 Alternator |
| **K9** Diagnostyka i emisja | EF-2612-01 Kontrolka silnika i komunikaty | EF-2611-04 Anti-pollution ⚑ · EF-2701-03 DPF/FAP · EF-2705-03 Wtryskiwacze · EF-2706-02 Turbo · EF-2707-03 AdBlue · EF-2709-04 Zawór EGR |
| **K10** Karoseria, oświetlenie | EF-2704-01 Kod lakieru i dobór karoserii | EF-2705-05 Felgi · EF-2708-04 Wkład lusterka · EF-2709-02 Żarówki · EF-2710-02 Wycieraczki |

⚑ = wpis opublikowany przed pillarem (świadomy wyjątek: sezon albo szybka wygrana). Po publikacji pillara trzeba go uzupełnić o link do pillara.

**Kluczowe mosty między klastrami** (wzmacniają topical authority całego serwisu):
- **K1 ↔ wszystkie:** pillar K1 i hub zakupowy EF-2707-05 linkują do wpisów o kodach (silnik, skrzynia, lakier, numer OE).
- **K2 ↔ K6:** pompa wody (EF-2704-04) łączy rozrząd z chłodzeniem.
- **K4 ↔ K7:** pompa ABS (EF-2703-05) i EPB (EF-2708-05) łączą hamulce z elektroniką.
- **K8 ↔ K2:** alternator ↔ pasek wielorowkowy ↔ koło pasowe wału.
- **K9 ↔ K7:** kontrolka silnika ↔ sterowniki.

**Weryfikacja grafu linków:** każdy z 60 wpisów ma co najmniej jeden link przychodzący; wszystkie ID w linkach istnieją w planie.

---

## 4. Backlog: 30 tematów rezerwowych

Kolejność = sugerowany priorytet. Wpisy z backlogu mogą zastąpić tematy z planu przy zmianie priorytetów albo zwiększyć tempo publikacji. Wszystkie oceny to szacunki do weryfikacji w narzędziach.

| # | Roboczy tytuł | Fraza główna | Klaster | Luka, którą zamyka | Prio (szac.) |
|---|---|---|---|---|---|
| B01 | Skrzynia EDC w Renault: typowe usterki i objawy | skrzynia edc renault problemy | K3 | BOFU, skrzynie automatyczne | P1 |
| B02 | Skrzynie EAT6/EAT8 w Peugeocie i Citroënie: usterki i serwis | eat6 problemy | K3 | BOFU, skrzynie automatyczne | P1 |
| B03 | Najczęstsze usterki silnika 1.5 dCi (K9K) | 1.5 dci usterki | K2/K9 | wpis modelowy, wysoki popyt | P1 |
| B04 | Najczęstsze usterki silnika 1.6 HDi | 1.6 hdi usterki | K9 | wpis modelowy | P1 |
| B05 | Mechanizm podnoszenia szyby: objawy i wymiana | szyba nie podnosi się | K10 | wnętrze (0 wsparcia), wysoki popyt | P1 |
| B06 | Czujniki parkowania nie działają: przyczyny i wymiana | czujniki parkowania nie działają | K7 | systemy komfortowe (0 wsparcia) | P1 |
| B07 | Centralny zamek nie działa: siłownik, sterownik czy pilot? | centralny zamek nie działa | K7 | system zamykania (0 wsparcia) | P1 |
| B08 | Uszczelka pod głowicą: objawy i test | uszczelka pod głowicą objawy | K6/K9 | zapowiedziany w EF-2702-03 | P1 |
| B09 | Klimatyzacja nie chłodzi: diagnoza krok po kroku | klimatyzacja nie chłodzi | K6 | wydzielenie z EF-2704-02 | P1 |
| B10 | Katalizator: objawy uszkodzenia i czym grozi jazda bez niego | katalizator objawy | K9 | układ wydechowy (słabe wsparcie) | P2 |
| B11 | Sonda lambda: objawy i jak ją sprawdzić | sonda lambda objawy | K9 | wydech/czujniki | P2 |
| B12 | Przepływomierz: objawy uszkodzenia | przepływomierz objawy | K9 | system tworzenia mieszanki | P2 |
| B13 | Czujnik położenia wału korbowego: objawy | czujnik wału korbowego objawy | K9 | czujniki silnika | P2 |
| B14 | Cewka zapłonowa: objawy (benzyna, PureTech, TCe) | cewka zapłonowa objawy | K9 | układ zapłonowy benzyny | P2 |
| B15 | Pompa paliwa: objawy uszkodzenia | pompa paliwa objawy | K9 | układ paliwowy (słabe wsparcie) | P2 |
| B16 | Poduszki silnika: objawy zużycia | poduszki silnika objawy | K5 | zawieszenie silnika | P2 |
| B17 | Wymiana silnika na inny egzemplarz a dokumenty auta | wymiana silnika a dowód rejestracyjny | K1 | zapowiedziany w EF-2704-05; prawne | P2 |
| B18 | Hak holowniczy: jak dobrać i czy trzeba go zgłaszać | montaż haka holowniczego przepisy | K10 | wyposażenie dodatkowe (0 wsparcia) | P2 |
| B19 | Relingi i bagażnik dachowy: jak dobrać do auta | jak dobrać bagażnik dachowy | K10 | wyposażenie dodatkowe (0 wsparcia) | P2 |
| B20 | Reflektory matowe: regeneracja czy wymiana lampy | matowe reflektory | K10 | oświetlenie | P2 |
| B21 | Czujniki ciśnienia w oponach (TPMS): działanie, wymiana, kodowanie | czujniki ciśnienia w oponach | K10 | koła i felgi | P2 |
| B22 | Najczęstsze usterki Dacii Duster | dacia duster usterki | K1 | wpis modelowy, silna marka | P2 |
| B23 | Poduszki powietrzne po kolizji: co trzeba wymienić | wymiana poduszek powietrznych po wypadku | K7 | wnętrze/SRS; prawne i bezpieczeństwo | P2 |
| B24 | Pasy bezpieczeństwa i napinacze: kiedy wymienić | napinacz pasa bezpieczeństwa | K7 | wnętrze/SRS | P3 |
| B25 | Tłumik: objawy przepalenia i wymiana | tłumik końcowy wymiana | K9 | układ wydechowy | P3 |
| B26 | Opony zimowe w Europie: gdzie są obowiązkowe | opony zimowe obowiązek europa | K10 | [INTL], koła i opony | P3 |
| B27 | Instalacja LPG w aucie francuskim: na co uważać | lpg peugeot | K9 | LPG (nisza) | P3 |
| B28 | Zamek w drzwiach nie otwiera: wkładka, cięgna, siłownik | zamek drzwi nie otwiera | K7 | system zamykania | P3 |
| B29 | Komunikaty Renault „Sprawdź…”: słownik | komunikaty renault znaczenie | K9 | rozbudowa pillara K9 lub osobny wpis | P3 |
| B30 | Kontrolki na desce rozdzielczej: kompletny przewodnik | kontrolki w samochodzie | K9 | bardzo konkurencyjna fraza, na drugi rok | P3 |

---

## 5. Rekomendacje do procesu

### Workflow jednego artykułu
1. **Weryfikacja frazy** (Senuto/Ahrefs + GSC): potwierdzić frazę główną i long-taile; w razie potrzeby zamienić na temat z backlogu.
2. **Brief** (kolejny prompt w procesie): nagłówki, krótka odpowiedź na początku, encje i atrybuty z kolumny EAV, FAQ, linki, grafiki.
3. **Tekst** według briefu.
4. **Weryfikacja merytoryczna:** obowiązkowa dla flag „Bezpieczeństwo” i „Prawne” (33 wpisy). Fakty liczbowe tylko jako widełki, ze źródłem.
5. **Publikacja** z danymi strukturalnymi i datą aktualizacji.
6. **Linkowanie po publikacji:** wykonać wszystkie aktualizacje z kolumny „Zaktualizować” w ciągu 48 h.
7. **Przegląd po 90 dniach:** pozycje, CTR i zapytania z GSC; rozbudowa o brakujące pytania.

### KPI i pomiar
| KPI | Źródło | Cel orientacyjny |
|---|---|---|
| Wyświetlenia i kliknięcia bloga (per klaster) | GSC, filtr `/blog/` + grupy URL | trend rosnący m/m, cel liczbowy po 3 miesiącach |
| Liczba fraz w TOP 10 / TOP 3 | Senuto / Ahrefs | wzrost kwartalny |
| CTR z bloga do kategorii i produktów | GA4 (zdarzenia kliknięć) | do ustalenia po 3 miesiącach |
| Konwersje wspomagane przez blog | GA4 (ścieżki, atrybucja) | raport kwartalny |
| Widoczność w odpowiedziach AI | ręczne testy promptów (ChatGPT, Perplexity, AI Overviews) dla 20 kluczowych pytań | cytowania/wzmianki EuroFrance |
| Indeksacja | GSC, raport stron | 100% wpisów zaindeksowanych w ciągu 14 dni |

Cele liczbowe ustalić po 3 miesiącach, na podstawie realnych danych startowych.

### Odświeżanie treści
- **Pillary:** przegląd co 6 miesięcy, rozbudowa zamiast nowych, bliźniaczych tekstów. Pierwszy przegląd w październiku 2027 (koniec planu).
- **Wpisy z datą w treści lub zmiennymi zaleceniami** (1.2 PureTech, przepisy o LED, DPF, AdBlue): przegląd co 6 miesięcy.
- **Wpisy sezonowe:** aktualizacja 6–8 tygodni przed sezonem w kolejnym roku.

### Przed startem (listopad 2026)
- Zrealizować fundamenty bloga z Etapu A, pkt 2.
- Zweryfikować w narzędziach 15 fraz z pierwszego kwartału.
- Potwierdzić z klientem kwestie otwarte (pkt 8).

---

## 6. Artykuły z potencjałem międzynarodowym [INTL] (22)

| ID | Temat | Co zlokalizować |
|---|---|---|
| EF-2611-01 | Oryginał vs OEM vs zamiennik | Przepisy gwarancyjne (GVO obowiązuje w całej UE; lokalne przykłady) |
| EF-2611-04 | Anti-pollution défaillant | Brzmienie komunikatów w lokalnych wersjach językowych aut |
| EF-2611-05 | Karta Renault nie wykryta | Nazwy modeli na rynkach |
| EF-2612-01 | Kontrolka silnika i komunikaty | Słownik komunikatów w lokalnym języku |
| EF-2612-04 | Sterowniki ECU/BSI/UCH/ABS | Minimalnie |
| EF-2612-05 | Numer OE części | Dokumenty pojazdu (położenie VIN w lokalnym dowodzie) |
| EF-2701-02 | 1.2 PureTech | Nazwy modeli, lokalne akcje serwisowe |
| EF-2701-03 | DPF/FAP | Przepisy o kontroli emisji w danym kraju |
| EF-2701-04 | BSI | Minimalnie |
| EF-2701-05 | Podróbki części | Lokalne instytucje i prawa konsumenta |
| EF-2703-04 | Skrzynia AL4/DP0 | Nazwy modeli |
| EF-2703-05 | Pompa ABS | Minimalnie |
| EF-2704-01 | Kod lakieru i karoseria | Minimalnie |
| EF-2704-05 | Kod silnika | Dokumenty pojazdu |
| EF-2705-02 | Hydropneumatyka Citroëna | Minimalnie (silna nisza we Francji i Beneluksie) |
| EF-2705-03 | Wtryskiwacze | Minimalnie |
| EF-2707-01 | Kod skrzyni biegów | Minimalnie |
| EF-2707-02 | Nawigacja Renault | Dostępność map i usług na rynku |
| EF-2707-03 | AdBlue BlueHDi | Brzmienie komunikatów, przepisy |
| EF-2707-05 | Zamówienie części online | Warunki sklepu na danym rynku (zwroty, dostawa) |
| EF-2708-01 | Kod do radia Renault | Procedury serwisowe na rynku |
| EF-2709-05 | Eurorepar i Motrio | Dostępność marek na rynku |

**Rekomendacja:** nie tłumaczyć 1:1. Najpierw sprawdzić popyt w lokalnych narzędziach i zacząć od 5–8 tematów o najwyższym wyniku na 2–3 kluczowych rynkach z tegorocznej ekspansji.

---

## 7. Autokontrola

| # | Kryterium | Wynik | Jak sprawdzone |
|---|---|---|---|
| 1 | Dokładnie 60 artykułów, po 5 w każdym miesiącu | ✔ | skrypt (walidacja) |
| 2 | Brak zdublowanych fraz głównych i slugów | ✔ | skrypt; dodatkowo ręcznie usunięto nakładanie intencji („przegrzewanie” z pillara K6 przeniesione do EF-2705-01; „stuk przy skręcaniu” rozdzielony między EF-2702-01 i EF-2705-04) |
| 3 | Każdy URL kategorii występuje w drzewie (znak w znak) | ✔ | skrypt: 208/208 linków zgodnych |
| 4 | Każdy artykuł ma 2–5 linków do kategorii i ≥ 1 link blog ↔ blog | ✔ | skrypt |
| 5 | Pillar nie później niż pierwsze clustery (lub uzasadniony wyjątek) | ✔ | 7 klastrów bez wyjątków; 3 wyjątki uzasadnione w komentarzach (EF-2611-03 sezon, EF-2611-04 i EF-2611-05 szybkie wygrane) |
| 6 | Tematy sezonowe z wyprzedzeniem 4–8 tygodni | ✔ | ręcznie: zima (XI–XII), klimatyzacja (IV), przegrzewanie (V–VI), akumulator (IX), wycieraczki i oświetlenie (IX–X) |
| 7 | Żaden temat nie celuje w frazę transakcyjną kategorii | ✔ | ręcznie: frazy mają charakter „objawy / jak / co / kiedy / gdzie / kod” |
| 8 | Tematy bezpieczeństwa i prawne mają flagę ryzyka | ✔ | 33 wpisy z flagą: 20 × bezpieczeństwo, 15 × prawne (2 mają obie) |
| 9 | Brak wymyślonych wolumenów i cen jako faktów | ✔ | wszystkie oceny ruchu i konkurencji oznaczone „szac.”; koszty tylko jako „widełki” w briefie |
| 10 | Każde ID w linkach wewnętrznych istnieje; każdy wpis ma link przychodzący | ✔ | skrypt (graf linków) |

**Uwagi z autokontroli wprowadzone w trakcie:** usunięcie nakładania fraz między EF-2702-03 a EF-2705-01; doprecyzowanie linków EF-2611-03 → EF-2702-03.

---

## 8. Kwestie otwarte do potwierdzenia z klientem

1. **Wyszukiwarka po numerze OE i dobór po VIN:** od tego zależą CTA we wpisach K1 (EF-2612-05, EF-2707-05).
2. **Warunki sklepu** (zwroty 30 dni, wysyłka, gwarancja na części nowe): czy można je cytować we wpisach.
3. **Stan wysyłanych elementów karoserii** (surowe / w podkładzie / lakierowane): wpływa na EF-2704-01.
4. **Czy sklep sprzedaje Eurorepar / Motrio** (EF-2709-05).
5. **Ekspert po stronie klienta:** kto może konsultować 33 wpisy z flagą bezpieczeństwa lub prawną; czy możliwe są zdjęcia z magazynu.
6. **Nowa kategoria „Układ AdBlue / SCR”** (rekomendacja z EF-2707-03).
7. **Porządki w strukturze kategorii:** duplikaty, literówki w URL-ach, sonda lambda i FAP w nielogicznych miejscach (Etap A, pkt 3).
8. **Moduł „Poradniki” w kategoriach sklepu** (linki zwrotne z kategorii do bloga).

---

**Pliki planu:**
- `02-etap-a-strategia.md`: strategia, klastry, kalendarz, model priorytetów;
- `03-content-plan-eurofrance.csv`: 60 tematów w 26 kolumnach (import do Google Sheets / Excela);
- `04-etap-c-podsumowanie.md`: ten dokument;
- `data/plan_q*.py` + `tools/`: źródło danych i skrypty (walidacja, eksport CSV, analiza).

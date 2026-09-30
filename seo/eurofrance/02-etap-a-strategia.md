# EuroFrance: content plan bloga 2026/2027, Etap A: strategia

Okres planu: **listopad 2026 – październik 2027**, 5 artykułów miesięcznie (60 łącznie).
Status: Etap A do akceptacji. Po akceptacji (`DALEJ`) powstaje Etap B, czyli tabela tematów kwartał po kwartale.

---

## 1. Profil klienta i założenia

### Fakty (z komunikatu prasowego i strony sklepu)
- Od 1997 r., start w Bielsku-Białej. Magazyn 2000 m² od 2001 r. Allegro od 2007 r., własny sklep od 2009 r.
- Od 2015 r. **nowe, oryginalne części**, potem **elektronika do wszystkich marek** (sterowniki, nawigacje, pompy ABS). Dziś sklep sprzedaje **głównie części nowe**.
- Rdzeń marek: **Renault, Peugeot, Citroën, Dacia**. Rozszerzenie: VW, Nissan, BMW, Audi.
- W 2025 r. otwarcie na **20 nowych rynkach europejskich**.
- Ocena **4.83/5 w Trusted Shops**. Wysyłka InPost, DHL, DPD, UPS; silniki na palecie.
- Hasło marki: „części, na których możesz polegać”. Ton na „Ty”, rzeczowy.
- **Blog startuje od zera** w domenie z wieloletnią historią.

### Założenia (brak danych od klienta, do weryfikacji w trakcie realizacji)
| # | Założenie | Wpływ na plan |
|---|---|---|
| Z1 | Marki francuskie to ok. 75–85% tematów związanych z konkretnymi modelami | Przykłady, tabele i long-taile opieramy na Renault/PSA/Dacii |
| Z2 | Brak danych sprzedażowych i marżowych | Wartość biznesową szacuję z wartości koszyka, częstotliwości wymiany i kierunków strategicznych firmy |
| Z3 | Brak danych z GSC/Senuto/Ahrefs | Potencjał ruchu i konkurencyjność to szacunki jakościowe (W/Ś/N), do weryfikacji przed startem |
| Z4 | Dobór po VIN i warunki gwarancji niepotwierdzone | CTA neutralne („sprawdź po numerze części”, „zapytaj doradcę”) z adnotacją „do potwierdzenia” |
| Z5 | Nie wiadomo, czy dostępny będzie ekspert po stronie klienta | Cytaty eksperta i zdjęcia z magazynu planuję jako elementy opcjonalne |
| Z6 | Części używane to margines | Nie budujemy na nich tematów. Najwyżej jako kontekst porównań |
| Z7 | Liczby magazynowe (1 mln części, 490 silników itd.) mogą być nieaktualne | Nie używamy ich w treściach bez potwierdzenia |

### Obserwacje z rekonesansu SERP (próbka, nie pełna analiza)
- **Ogólne frazy diagnostyczne są nasycone.** Na „objawy uszkodzonego koła dwumasowego” rankuje kilkanaście blogów sklepowych i portali (Deler, InCar, Magazyn Ceneo, Tedex, Gezet, Sprzegla24). Wejście z kolejnym ogólnym tekstem da słaby efekt. **Wniosek:** w takich tematach potrzebujemy kąta „francuskiego” (konkretne silniki/modele, numery OE, typowe przebiegi awarii) albo odpuszczamy frazę ogólną na rzecz long-taili.
- **Komunikaty i usterki specyficzne dla PSA/Renault mają lukę po polsku.** Na „Service Anti-Pollution Défaillant” dominują strony francuskojęzyczne i fora. To idealny obszar na szybkie wygrane i budowę eksperckości „od francuzów”.
- **Oryginał vs OEM vs zamiennik:** tematy obsadzone (InCar, Autoparts24, Ucando), ale bez wyraźnego lidera. Jako pillar marki jest konieczny, a wyróżnikiem będzie praktyka (numery OE, rozpoznawanie oryginału, konkretne przykłady z aut francuskich).
- **Wymiana i kodowanie sterowników:** odpowiadają głównie fora (Elektroda, kluby marek) i małe portale. To okazja dla rzetelnego poradnika sklepu, który sprzedaje sterowniki.

---

## 2. Fundamenty startującego bloga (do zrobienia przed 1. publikacją)

1. **Adresy wpisów:** `eurofrance.pl/blog/{slug}`, płaskie, bez daty i bez kategorii w URL-u. Kategorie bloga mogą wtedy się zmieniać bez przekierowań.
2. **Kategorie bloga = klastry** z punktu 4 (10 kategorii). Każda kategoria bloga ma krótki opis i link do odpowiadającej kategorii sklepu.
3. **Autor i E-E-A-T:**
   - strona „Redakcja / Eksperci EuroFrance” z informacją, kto pisze i kto konsultuje merytorycznie;
   - przy wpisie: autor, data publikacji i aktualizacji, informacja o konsultacji technicznej;
   - krótka nota o firmie (od 1997 r., specjalizacja w autach francuskich).
4. **Szablon artykułu:**
   - krótka odpowiedź (2–3 zdania) zaraz pod H1;
   - spis treści z kotwicami;
   - tabele: objawy/przyczyny, kompatybilność, numery OE;
   - sekcja „Części powiązane” z linkami do kategorii;
   - FAQ;
   - ramka bezpieczeństwa przy tematach ryzykownych.
5. **Dane strukturalne:** `Article` (autor, daty), `BreadcrumbList`, `FAQPage` tam, gdzie jest realne FAQ. Rich results FAQ są dziś ograniczone, ale znaczniki porządkują treść dla wyszukiwarek i LLM-ów.
6. **Linkowanie z kategorii sklepu do bloga:** moduł „Poradniki” w opisach kluczowych kategorii (rozrząd, sprzęgła, hamulce, chłodzenie, sterowniki). Bez tego blog długo nie zbierze autorytetu.
7. **Technika:** blog w mapie strony XML (osobna mapa `sitemap-blog.xml`), zgłoszenie w GSC, indeksowalne paginacje kategorii bloga, poprawne canonicale, szybkie ładowanie grafik (WebP, lazy-load).
8. **Pomiar od pierwszego dnia:** w GA4 i GSC segment `/blog/`, zdarzenia kliknięć z bloga do kategorii i produktów, konwersje wspomagane.
9. **Pod przyszłą ekspansję [INTL]:** struktura gotowa na wersje językowe (`hreflang`), a w treściach unikanie odniesień, których nie da się zlokalizować (np. wyłącznie polskie przepisy w artykułach uniwersalnych, osobno ramki „w Polsce”).

---

## 3. Analiza drzewa kategorii

### Obszary o najwyższym potencjale (content × sprzedaż)
| Obszar | Dlaczego | Potencjał contentowy | Wartość biznesowa |
|---|---|---|---|
| Rozrząd i napęd pasowy | Wysoka świadomość problemu, interwały, znane problemy silników PSA/Renault (np. pasek w oleju 1.2 PureTech) | W | W (zestawy, pompy wody) |
| Sprzęgło, dwumasa, skrzynia | Drogie naprawy, dużo pytań „objawy / czy wymieniać”, znane skrzynie PSA/Renault (np. automat AL4) | W | W (wysoki koszyk) |
| Elektronika (ECU, BSI/UCH, ABS, nawigacje, radio) | Strategiczny kierunek firmy, słaba konkurencja rzetelnych treści, tematy „francuskie” (BSI, karta Renault, kod radia) | W | W |
| Emisja i paliwo (EGR, DPF/FAP, wtryski, AdBlue, turbo) | Duży popyt diagnostyczny, komunikaty PSA/Renault, drogie części | W | W |
| Chłodzenie, ogrzewanie, klimatyzacja | Silna sezonowość (zima: nagrzewnica; lato: klima, przegrzewanie) | W | Ś–W |
| Hamulce | Stały popyt, częsta wymiana, bezpieczeństwo, ale duża konkurencja | Ś–W | Ś–W |
| Zawieszenie i kierownica | Popyt po zimie (dziury), unikalna hydropneumatyka Citroëna (sfery, pompa) | Ś–W | Ś–W |
| Elektryka i rozruch | Sezon zimowy (akumulator, rozrusznik, świece żarowe, alternator) | W | Ś |
| Karoseria i oświetlenie | Kod lakieru, dobór elementów, homologacja oświetlenia, sezon jesienny | Ś | Ś–W (duże elementy) |
| Silniki i skrzynie kompletne | Bardzo wysoki koszyk, treści głównie „dobór po kodzie” | N–Ś | Bardzo W |

### Obszary o niskim potencjale (backlog lub brak)
Popielniczki, rolety, zapalniczki/gniazda 12V, dekielki, kołpaki, emblematy, zmieniarki CD, radioodtwarzacze kasetowe, podsufitki, wykładziny, lampy ostrzegawcze (koguty), tachografy (nisza B2B), LPG (nisza, konkurencja wyspecjalizowanych serwisów). Te kategorie dostaną linki tylko przy okazji, bez dedykowanych wpisów w roku 1.

**Wyjątki, czyli „perełki” w niskopotencjalnych działach:**
- **kod do radia Renault/Peugeot** (dział audio fabryczne): bardzo duży, stały popyt;
- **karta Renault / „karta nie wykryta”** (stacyjki i czytniki kart);
- **mapy w fabrycznej nawigacji Renault** (nawigacje fabryczne);
- **wkład lusterka** (lusterka zewnętrzne): prosta naprawa, niski próg zakupu.

### Uwagi SEO do struktury kategorii (dodatkowa wartość dla klienta)
**Zdublowane lub nakładające się kategorie.** Ryzyko rozproszenia sygnałów i kanibalizacji między kategoriami:
- **Spojlery** ×3: `/czesci-karoserii/spojlery.html`, `/czesci-karoserii/zderzaki-wzmocnienia/spojlery.html`, `/wyposazenie-dodatkowe/spojlery.html`
- **Spryskiwacze reflektorów** ×2: `/systemy-komfortowe/spryskiwacze-reflektorow.html`, `/wycieraczki-spryskiwacze/spryskiwacze-reflektorow.html`
- **Recyrkulacja spalin** ×2: `/silnik-i-osprzet/recyrkulacja-spalin-egr.html`, `/silnik-i-osprzet/system-tworzenia-mieszanki-paliwa/recyrkulacja-spalin.html`
- **Relingi** ×2: `/czesci-blacharskie/dachy/relingi-dachowe.html`, `/wyposazenie-dodatkowe/relingi.html`
- **Panele sterowania / przełączniki** ×3: `/ogrzewanie-wentylacja-klimatyzacja/panele-sterowania.html`, `/wyposazenie-wnetrza-syst-bezpieczenstwa/panele-sterowania-przelaczniki.html`, `/uklad-elektryczny/przelaczniki-przyciski.html`
- **Czujniki** w 4 miejscach (oświetlenie, silnik, klimatyzacja, układ elektryczny „pozostałe”) i **elementy mocujące** w 3 miejscach. Nazwy kategorii (H1, title) powinny doprecyzowywać kontekst, np. „Czujniki silnika” zamiast samego „Czujniki”.

**Rekomendacja:** dla każdej pary wybrać kategorię główną. Druga ma kierować do niej linkiem lub canonicalem albo różnić się wyraźnie H1 i opisem. Blog linkuje zawsze do wybranej kategorii głównej.

**Niespójności logiczne:**
- **Sonda lambda** w `/uklad-wydechowy/tlumiki-rury-mocowania-poduszki/sonda-lambda.html`: sonda nie jest elementem tłumika. Lepiej pod układem wydechowym bezpośrednio lub w czujnikach silnika.
- **FAP/DPF** pod `/uklad-paliwowy/`: filtr cząstek stałych to element układu wydechowego. Ma to sens dla zbiorników dodatku FAP (Eolys) w PSA, ale sam filtr warto dodatkowo osadzić w układzie wydechowym lub wyjaśnić to w opisie kategorii.
- **Powtórzone slugi w ścieżkach:** `/blotniki/blotniki.html`, `/dachy/dachy.html`, `/progi/progi.html`. Nie jest to błąd, ale osłabia czytelność. Lepiej użyć opisowych slugów, np. `/blotniki/blotniki-przednie-tylne.html`.
- **Opony terenowe mają tylko podkategorię „zimowe”.** Albo brakuje letnich/całorocznych, albo podkategoria jest zbędna.

**Literówki w URL-ach:**
- `nadkola-oslony-pod-karosrie` → „karoserię”;
- `pompy-podcisnienieniowe` → „podciśnieniowe”;
- `winda-kola-kosz-kola-zpasowego` → „zapasowego”;
- `serwa-hamulca-pompy-podcisnienia-vacum` → „vacuum”.

Poprawiać tylko z przekierowaniem 301 i aktualizacją linków wewnętrznych. **Priorytet niski**, bo zysk SEO jest niewielki, a ryzyko przy migracji realne. Warto natomiast poprawić pisownię w H1 i title.

---

## 4. Mapa tematyczna: 10 klastrów

Suma: **60 artykułów** (10 pillarów + 50 clusterów/supportów).

| # | Klaster | Encja główna | Wspierane kategorie sklepu (główne) | Proponowany pillar | Liczba wpisów | Uzasadnienie priorytetu |
|---|---|---|---|---|---|---|
| K1 | **Świadomy zakup i dobór części** | Część samochodowa (oryginalna / OEM / zamiennik), numer OE | przekrojowo; szczególnie filtry, hamulce, rozrząd | „Części oryginalne, OEM i zamienniki: czym się różnią i które wybrać” | 6 | Rdzeń oferty (nowe, oryginalne części), buduje zaufanie, najwyższa konwersja, [INTL] |
| K2 | **Rozrząd i napęd pasowy** | Rozrząd (pasek/łańcuch) | mechanizmy-rozrzadu/*, elementy-napedu/*, chlodzenie-silnika/pompy-wody | „Rozrząd w samochodzie: pasek czy łańcuch, kiedy wymieniać i co wymienić razem” | 6 | Wysoki popyt i koszyk (zestawy), znane problemy silników PSA/Renault |
| K3 | **Sprzęgło, dwumasa i skrzynia biegów** | Sprzęgło / koło dwumasowe / skrzynia biegów | uklad-napedowy/sprzegla/*, skrzynie-*, polosie | „Sprzęgło i koło dwumasowe: budowa, objawy zużycia i wymiana” | 6 | Drogie naprawy, wysoki koszyk; wyróżnik: francuskie skrzynie i silniki |
| K4 | **Hamulce** | Układ hamulcowy | uklad-hamulcowy/* | „Układ hamulcowy: jak działa, co się zużywa i kiedy wymieniać” | 6 | Stały popyt; bezpieczeństwo, czyli wymóg rzetelności (E-E-A-T) |
| K5 | **Zawieszenie i układ kierowniczy** | Zawieszenie / układ kierowniczy | uklad-zawieszenia-amortyzacja/*, uklad-kierowniczy/* | „Stuki w zawieszeniu: skąd się biorą i jak znaleźć winną część” | 6 | Popyt wiosenny po zimie; unikalny temat hydropneumatyki Citroëna |
| K6 | **Chłodzenie, ogrzewanie i klimatyzacja** | Układ chłodzenia / klimatyzacja | chlodzenie-silnika/*, ogrzewanie-wentylacja-klimatyzacja/* | „Układ chłodzenia silnika: budowa, najczęstsze usterki i objawy” | 7 | Silna sezonowość w obie strony (zima i lato) |
| K7 | **Elektronika samochodowa** | Sterownik (ECU, BSI/UCH, moduł ABS) | uklad-elektryczny/sterowniki-komputery, pompy-hamulcowe-abs-esp, stacyjki-czytniki-kart, nawigacje, radioodtwarzacze | „Sterowniki w samochodzie: ECU, BSI, moduł ABS; jak działają, co się psuje i co z kodowaniem po wymianie” | 6 | Strategiczny kierunek firmy, słaba konkurencja, tematy dla wszystkich marek [INTL] |
| K8 | **Elektryka, rozruch i ładowanie** | Akumulator / rozruch | uklad-elektryczny/akumulatory, alternator, rozrusznik, swiece-zarowe | „Samochód nie odpala: przyczyny krok po kroku (akumulator, rozrusznik, świece żarowe)” | 5 | Szczyt zimowy, wysoki popyt, most do wielu kategorii |
| K9 | **Silnik: diagnostyka, emisja i układ paliwowy** | Kontrolka / komunikat silnika; EGR, DPF/FAP, wtryskiwacz, turbo | recyrkulacja-spalin-egr/*, filtry-czastek-stalych-fap-czujniki, wtryskiwacze, turbosprezarki, czujniki silnika, sonda-lambda | „Kontrolka silnika i komunikaty w autach francuskich: co oznaczają i co robić” | 7 | Luka po polsku w komunikatach PSA/Renault, drogie części, duży popyt |
| K10 | **Karoseria, oświetlenie i widoczność** | Element karoserii / oświetlenie | czesci-karoserii/*, czesci-blacharskie/*, oswietlenie/*, wycieraczki-spryskiwacze/*, kola-felgi/felgi | „Jak dobrać element karoserii do auta: kod lakieru, wersja, numer części” | 5 | Duże elementy o wysokim koszyku, sezon jesienny (światła, wycieraczki) |

**Uwagi do mapy:**
- **Koła i opony** mają jeden wpis w K10 (dobór felg: rozstaw śrub, ET, średnica otworu centrującego w autach francuskich). Szerszy temat opon zostaje w backlogu, bo frazy „opony zimowe/letnie” mocno zdominowały wyspecjalizowane sklepy, a opony nie są rdzeniem EuroFrance.
- **Silniki i skrzynie kompletne** są wspierane przez K2, K3 i K9 poradnikami typu „jak odczytać kod silnika / skrzyni i dobrać zamiennik”, a nie osobnym klastrem.
- **VW, Audi, BMW i Nissan** pojawiają się głównie w K1 i K7 (tematy uniwersalne) oraz w K2 i K3 przy wspólnych silnikach Renault–Nissan.

---

## 5. Kalendarz strategiczny

Zasada timingu: temat sezonowy publikujemy **4–8 tygodni przed szczytem popytu**. Pillary klastrów pojawiają się przed ich clusterami.

| Miesiąc | Dominujące klastry | Motyw i uzasadnienie |
|---|---|---|
| **Lis 2026** | K1 (pillar), K8 (pillar), K6, K9, K7 | **Start bloga i zima.** Pillar marki (oryginał vs zamiennik) wyznacza oś. „Nie odpala” przed mrozami. Nagrzewnica/dmuchawa (szczyt XII–I). Dwie szybkie wygrane z luką po polsku: komunikat PSA anti-pollution i karta Renault. |
| **Gru 2026** | K9 (pillar), K7 (pillar), K2 (pillar), K8, K1 | Pillary trzech klastrów o najwyższej wartości. Świece żarowe (szczyt mrozów). Dobór części po VIN / numerze OE. |
| **Sty 2027** | K3 (pillar), K2, K9, K7, K1 | Budowa klastrów zimowych i całorocznych: PureTech pasek w oleju, EGR/DPF przy krótkich trasach zimą, BSI w PSA, podróbki części. |
| **Lut 2027** | K5 (pillar), K4 (pillar), K6 (pillar), K3, K8 | Przygotowanie wiosny: zawieszenie po zimie (dziury), hamulce po sezonie, pillar chłodzenia/klimy przed wiosną. |
| **Mar 2027** | K6, K5, K4, K3, K7 | Klimatyzacja: serwis i przygotowanie (szczyt V–VII). Wahacze i łączniki (szczyt wiosenny). Tarcze i klocki. Automat AL4 / skrzynie PSA. Pompa ABS. |
| **Kwi 2027** | K10 (pillar), K6, K4, K2, K1 | Kod lakieru i dobór elementów karoserii (sezon napraw blacharskich po zimie). Sprężarka klimatyzacji. Pompa wody. |
| **Maj 2027** | K6, K5, K9, K3, K10 | Przegrzewanie silnika (szczyt VII–VIII). Hydropneumatyka Citroëna. Wtryskiwacze. Felgi przed wakacjami. |
| **Cze 2027** | K6, K9, K4, K2, K1 | Przed wakacjami: wentylator chłodnicy, turbo, hamulce przed trasą, rozrząd (co ile w popularnych silnikach). |
| **Lip 2027** | K3, K7, K9, K5, K1 | Evergreeny i long-taile modelowe (niższa konkurencja sezonowa): dobór skrzyni po kodzie, moduły elektroniki, AdBlue w BlueHDi, maglownica. |
| **Sie 2027** | K7, K2, K3, K10, K4 | Domknięcie klastrów: radio (kod), pasek wielorowkowy, sprzęgło hydrauliczne, lusterko (wkład), EPB. |
| **Wrz 2027** | K8, K10, K6, K9, K1 | Przygotowanie do jesieni i zimy: akumulator przed zimą (szczyt XI–I), oświetlenie i żarówki (krótszy dzień), nagrzewnica, DPF. |
| **Paź 2027** | K8, K10, K6, K9, K1 | Zima tuż-tuż: alternator/ładowanie, wycieraczki. Plus **odświeżenie pillarów** z roku 1 na podstawie danych z GSC (rozbudowa zamiast nowych bliźniaczych tekstów). |

---

## 6. Model priorytetyzacji

Każdy temat dostaje oceny 1–5 w czterech wymiarach:

| Wymiar | Waga | Jak oceniam |
|---|---|---|
| **Wartość biznesowa (WB)** | 40% | Wartość koszyka w linkowanej kategorii, częstotliwość zakupu, zgodność z kierunkami firmy (nowe oryginały, elektronika, napęd), bliskość do zakupu |
| **Potencjał ruchu (PR)** | 30% | Szacowana skala popytu (W=5, Ś=3, N=2, nisza=1), liczba long-taili i pytań pokrewnych |
| **Łatwość rankowania (Ł)** | 20% | Odwrotność konkurencyjności SERP (W=1, Ś=3, N=5), z premią za lukę po polsku i kąt „francuski” |
| **Pilność sezonowa (PS)** | 10% | 5 = publikacja w oknie 4–8 tyg. przed szczytem, 3 = evergreen, 1 = poza sezonem |

**Wynik = 0,4·WB + 0,3·PR + 0,2·Ł + 0,1·PS**, a z niego priorytet:
- **P1**: wynik ≥ 3,8 → pisać w pierwszej kolejności, najlepszy autor/ekspert, pełne E-E-A-T;
- **P2**: wynik 3,0–3,79 → standard;
- **P3**: wynik < 3,0 → wpisy uzupełniające; można przesuwać lub zamieniać z backlogiem.

**Korekty:**
- **Pillary** zawsze dostają P1, niezależnie od wyniku, bo pełnią rolę strukturalną.
- **Na starcie bloga (listopad 2026 – styczeń 2027)** Łatwość rankowania liczymy z wagą 30% kosztem Potencjału ruchu (20%). Dzięki temu nowy blog szybciej zbiera pierwsze sygnały.

---

## 7. Rozkład planu

### Wg klastra
K1: 6 · K2: 6 · K3: 6 · K4: 6 · K5: 6 · K6: 7 · K7: 6 · K8: 5 · K9: 7 · K10: 5 → **60**

### Wg typu treści (orientacyjnie)
| Typ | Liczba | Udział |
|---|---|---|
| Pillar / kompendium | 10 | 17% |
| Objawy i diagnostyka | 18 | 30% |
| Komunikaty, kontrolki, kody | 6 | 10% |
| Dobór części / zakup (numery OE, kody silników i skrzyń, kod lakieru, felgi) | 10 | 17% |
| Porównania i decyzje (oryginał vs zamiennik, naprawa vs wymiana, pasek vs łańcuch) | 6 | 10% |
| Poradniki sezonowe i checklisty | 6 | 10% |
| Typowe usterki konkretnych silników/modeli | 4 | 6% |

(Część wpisów łączy dwa typy. W tabeli zliczony jest typ dominujący.)

### Wg etapu lejka
- **TOFU** (świadomość problemu, np. objawy, komunikaty): ok. 26 (43%)
- **MOFU** (rozważanie rozwiązania, np. naprawa vs wymiana, porównania, pillary): ok. 20 (33%)
- **BOFU-informacyjny** (dobór konkretnej części): ok. 14 (24%)

### Wg ryzyka
| Flaga | Liczba (ok.) | Gdzie |
|---|---|---|
| **Bezpieczeństwo** | 10 | Hamulce (K4), zawieszenie i kierownica (K5), pompa ABS (K7) |
| **Prawne** | 5 | DPF/FAP (bez treści o usuwaniu), homologacja oświetlenia LED, kodowanie sterowników i immobilizer (bez obchodzenia zabezpieczeń), wymiana silnika a dokumenty, AdBlue |
| **Merytoryczne** | 20 | Interwały wymiany, koszty (tylko widełki), specyfika silników i skrzyń, numery OE |
| **Brak** | 25 | Pozostałe |

### Wg marek (tematy modelowe)
Renault/Dacia ok. 45%, Peugeot/Citroën/DS ok. 40%, VW/Audi/BMW/Nissan ok. 15% (głównie elektronika i wspólne silniki Renault–Nissan).

### Tematy z potencjałem [INTL]
Ok. 15–20 wpisów, głównie K1 (oryginał vs zamiennik, numery OE), K7 (sterowniki, BSI, ABS), K9 (komunikaty PSA/Renault) i K2/K3 (silniki i skrzynie). Pełna lista powstanie w Etapie C.

---

**Następny krok:** po akceptacji (`DALEJ`) lub korektach (np. inne proporcje klastrów, inne kategorie priorytetowe) przygotuję **Etap B, część 1: listopad 2026 – styczeń 2027 (15 artykułów)** w pełnym formacie 26 kolumn, jako plik XLSX/CSV gotowy do Google Sheets.

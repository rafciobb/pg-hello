"""Analiza gotowego content planu EuroFrance (dane do Etapu C).

Uruchomienie (z katalogu repozytorium):
    python3 seo/eurofrance/tools/analyze_plan.py
"""
import os
import re
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plan import PROMPT, load_rows, validate  # noqa: E402
from export_csv import P1_FROM, P2_FROM, WEIGHTS  # noqa: E402

BASE = "https://www.eurofrance.pl/autoczesci/"


def score(r):
    phase = "Start" if r["id"][3:7] in ("2611", "2612", "2701") else "Standard"
    w = WEIGHTS[phase]
    return r["wb"] * w[0] + r["s_pr"] * w[1] + r["s_l"] * w[2] + r["s_ps"] * w[3]


def main():
    rows = load_rows()
    print("Walidacja:", validate(rows) or "OK")
    with open(PROMPT, encoding="utf-8") as fh:
        tree = [l.strip() for l in fh if l.startswith("https://www.eurofrance.pl/autoczesci")]

    # --- pokrycie kategorii
    links = Counter()
    for r in rows:
        for url in re.findall(r"https://\S+?\.html", r["linki_kat"]):
            links[url] += 1
    top = defaultdict(lambda: {"all": 0, "covered": 0, "links": 0, "uncovered": []})
    for url in tree:
        path = url[len(BASE):] if url.startswith(BASE) else "(root)"
        key = path.split("/")[0].replace(".html", "")
        top[key]["all"] += 1
        if links[url]:
            top[key]["covered"] += 1
            top[key]["links"] += links[url]
        else:
            top[key]["uncovered"].append(path)
    print("\n## Pokrycie kategorii (URL w drzewie / URL z linkiem / liczba linków)")
    for key, v in sorted(top.items(), key=lambda kv: -kv[1]["links"]):
        print(f"{key}: {v['all']} / {v['covered']} / {v['links']}")
    print(f"RAZEM: {len(tree)} URL, z linkiem: {sum(1 for u in tree if links[u])}, linków: {sum(links.values())}")
    print("\nTop 15 najczęściej linkowanych:")
    for url, n in links.most_common(15):
        print(n, url[len(BASE):])

    # --- klastry i pillary
    clusters = defaultdict(list)
    for r in rows:
        clusters[r["klaster"]].append(r)
    print("\n## Klastry: pillar vs pierwsze wpisy")
    for k, rs in sorted(clusters.items(), key=lambda kv: int(kv[0].split()[0][1:])):
        pillar = [r for r in rs if r["rola"] == "Pillar"][0]
        before = [r["id"] for r in rs if r["id"] < pillar["id"]]
        print(f"{k}: pillar {pillar['id']}; przed pillarem: {before or '-'}; wpisy: {[r['id'] for r in rs]}")

    # --- graf linków blog
    ids = {r["id"] for r in rows}
    incoming = Counter()
    outgoing = {}
    for r in rows:
        out = re.findall(r"EF-\d{4}-\d{2}", r["linki_blog"].split("|")[0])
        outgoing[r["id"]] = out
        for t in set(out):
            incoming[t] += 1
    # „Zaktualizować: X linkuje tutaj” = link przychodzący do bieżącego wpisu z X.
    upd = Counter()
    for r in rows:
        parts = r["linki_blog"].split("|")
        if len(parts) > 1 and re.search(r"EF-\d{4}-\d{2}", parts[1]):
            upd[r["id"]] += 1
    # Pillar linkuje do wszystkich wpisów swojego klastra.
    for rs in clusters.values():
        for r in rs:
            if r["rola"] != "Pillar":
                incoming[r["id"]] += 1
    print("\n## Graf linków blog")
    print("Nieistniejące ID w linkach:", sorted({t for o in outgoing.values() for t in o} - ids) or "-")
    no_in = sorted(i for i in ids if incoming[i] == 0 and upd[i] == 0)
    print("Wpisy bez żadnego linku przychodzącego (poza „linki przychodzące: wszystkie”):", no_in or "-")

    # --- priorytety
    sc = sorted(((score(r), r["id"], r["rola"]) for r in rows), reverse=True)
    print("\n## Rozkład wyników")
    for p1_th, p2_th in ((3.8, 3.0), (4.0, 3.5)):
        cnt = Counter("P1" if rola == "Pillar" or s >= p1_th else "P2" if s >= p2_th else "P3" for s, _, rola in sc)
        print(f"Progi P1≥{p1_th}, P2≥{p2_th}: {dict(cnt)}")
    print("Wyniki:", [(i, round(s, 2)) for s, i, _ in sc])

    # --- INTL, ryzyka, typy
    print("\n## INTL")
    print([r["id"] for r in rows if "[INTL]" in r["komentarz"]])
    print("\n## Lejek")
    print(Counter(r["intencja"].split("/")[-1].strip() for r in rows))
    print("\n## Tytuły: najdłuższy title", max(len(r["title"]) for r in rows))


if __name__ == "__main__":
    main()

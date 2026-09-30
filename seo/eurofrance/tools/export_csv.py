"""Eksportuje content plan EuroFrance do CSV (separator ;, UTF-8 z BOM) do importu w Google Sheets / Excelu.

Uruchomienie (z katalogu repozytorium):
    python3 seo/eurofrance/tools/export_csv.py
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_plan import COLUMNS, ROOT, load_rows, validate  # noqa: E402

OUT = os.path.join(ROOT, "03-content-plan-eurofrance.csv")

# Wagi i progi z Etapu A, pkt 6 (faza „Start” = XI 2026 – I 2027).
WEIGHTS = {"Start": (0.4, 0.2, 0.3, 0.1), "Standard": (0.4, 0.3, 0.2, 0.1)}
P1_FROM, P2_FROM = 3.8, 3.0


def priority(row):
    phase = "Start" if row["id"][3:7] in ("2611", "2612", "2701") else "Standard"
    w_wb, w_pr, w_l, w_ps = WEIGHTS[phase]
    score = row["wb"] * w_wb + row["s_pr"] * w_pr + row["s_l"] * w_l + row["s_ps"] * w_ps
    if row["rola"] == "Pillar":
        label = "P1"
    elif score >= P1_FROM:
        label = "P1"
    elif score >= P2_FROM:
        label = "P2"
    else:
        label = "P3"
    return f"{label} (wynik {score:.1f})".replace(".", ",")


if __name__ == "__main__":
    rows = load_rows()
    problems = validate(rows)
    if problems:
        print("BŁĘDY WALIDACJI:\n" + "\n".join(problems))
        sys.exit(1)
    with open(OUT, "w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.writer(fh, delimiter=";", quoting=csv.QUOTE_ALL)
        writer.writerow([name for name, _, _ in COLUMNS])
        for r in rows:
            writer.writerow([priority(r) if key is None else r[key] for _, key, _ in COLUMNS])
    print(f"OK: {len(rows)} wierszy → {OUT}")

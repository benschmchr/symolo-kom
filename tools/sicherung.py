"""Tägliche Sicherung der SQLite-Datei: Kopie mit Datum, die letzten 14 bleiben.

Aufruf (z. B. täglich per Aufgabenplanung oder cron):
    KOM_DATENBANK=/pfad/bestand.sqlite3 python tools/sicherung.py [Zielordner]
Ohne Zielordner liegen die Kopien neben der Datenbank im Ordner „sicherung“.
Die Datenbank wird nur gelesen (SQLite-Sicherungsfunktion, auch bei laufendem Server sicher).
"""

import os
import sqlite3
import sys
from datetime import date
from pathlib import Path

BEHALTEN = 14


def sichern(datenbank, ziel=None, heute=None, behalten=BEHALTEN):
    quelle = Path(datenbank)
    if not quelle.is_file():
        raise SystemExit(f"Datenbank nicht gefunden: {quelle}")
    ordner = Path(ziel) if ziel else quelle.parent / "sicherung"
    ordner.mkdir(parents=True, exist_ok=True)
    tag = (heute or date.today()).isoformat()
    datei = ordner / f"{quelle.stem}_{tag}{quelle.suffix}"
    von = sqlite3.connect(f"file:{quelle.as_posix()}?mode=ro", uri=True)
    nach = sqlite3.connect(datei)
    try:
        von.backup(nach)
    finally:
        nach.close()
        von.close()
    alle = sorted(ordner.glob(f"{quelle.stem}_????-??-??{quelle.suffix}"))
    for alt in alle[:-behalten] if behalten > 0 else []:
        alt.unlink()
    return datei


if __name__ == "__main__":
    pfad = os.environ.get("KOM_DATENBANK", "").strip()
    if not pfad:
        raise SystemExit("KOM_DATENBANK fehlt (Pfad der Datenbank-Datei).")
    print(f"Gesichert: {sichern(pfad, sys.argv[1] if len(sys.argv) > 1 else None)}")

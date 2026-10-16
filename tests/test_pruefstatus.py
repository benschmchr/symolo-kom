"""Prüffall 9.1: pruef_status.csv wurde mit den originalen Excel-Formeln gerechnet. Jede Zeile muss exakt passen."""

import csv
from decimal import Decimal

import pytest

from bestand import ansicht
from bestand.ab_nummer import ab_form
from bestand.models import Teil

from .hilfe import DATEN, LISTE_204, LISTE_624, importiere

pytestmark = pytest.mark.django_db

# Eingabe laut Übergabe 9.1
BG200 = {"SK1990-977452.001.0": 10, "SK1990-977452.004.0": 42, "SK1145-977452.005.0": 50}


def _pruefdaten_eintragen():
    a1 = importiere(LISTE_204)
    a2 = importiere(LISTE_624)
    for t in Teil.objects.filter(auftrag=a1).select_related("baugruppe"):
        if t.baugruppe.kurz == "100":
            t.vorhanden = t.menge_gesamt
        elif t.baugruppe.kurz == "200":
            t.vorhanden = Decimal(BG200[t.zeichnungsnummer]) if t.zeichnungsnummer in BG200 else None
        t.save()
    Teil.objects.filter(auftrag=a2).update(vorhanden=None)
    for t in Teil.objects.filter(auftrag=a2):
        t.vorhanden = t.menge_gesamt
        t.save()


def _zeilen_web():
    """Alle Zeilen in Excel-Reihenfolge mit den Spalten der CSV, wie die Web-App sie rechnet."""
    aus = []
    for a in ansicht.baum():
        sort_ab = round(a.w.sort, 4)
        sort_bg = -9
        for z in a.zeilen:
            o, w = z.o, z.w
            if isinstance(z, ansicht.ABZ):
                ebene, bg, zn, bn, soll, vh = "AB", "", o.ab_anzeige, o.verkaufsartikel, "", ""
            elif isinstance(z, ansicht.BGZ):
                ebene, bg, zn, bn, soll, vh = "BG", o.name, o.zeichnungsnummer, o.benennung, o.soll_anzeige, ""
                sort_bg = round(w.sort, 4)
            else:
                ebene, bg, zn, bn = "Teil", o.bg_name, o.zeichnungsnummer, o.benennung
                soll = o.soll_anzeige
                vh = "" if o.vorhanden is None else str(int(o.vorhanden))
            aus.append(
                {
                    "Ebene": ebene,
                    "AB": a.o.ab_anzeige,
                    "Baugruppe": bg,
                    "Zeichnungsnummer": zn,
                    "Benennung": bn,
                    "Menge Gesamt": soll,
                    "Vorhanden": vh,
                    "Status": w.status,
                    "Fortschritt": w.fortschritt,
                    "Prozent": round(w.prozent, 4),
                    "SortAB": sort_ab,
                    "SortBG": sort_bg,
                    "Entnehmen": "» entnehmen" if w.entnehmen else "",
                }
            )
    return aus


def _zeilen_csv():
    with (DATEN / "pruef_status.csv").open(encoding="utf-8") as f:
        zeilen = list(csv.DictReader(f, delimiter=";"))
    for z in zeilen:
        z["AB"] = ab_form(z["AB"])  # U6: CSV schreibt „2616624“, Import macht „AB2616624“
        if z["Zeichnungsnummer"] == "2616624":
            z["Zeichnungsnummer"] = "AB2616624"
        z["Prozent"] = round(float(z["Prozent"]), 4)
        z["SortAB"] = round(float(z["SortAB"]), 4)
        z["SortBG"] = round(float(z["SortBG"]), 4)
    return zeilen


def test_9_1_pruef_status_jede_zeile_exakt():
    _pruefdaten_eintragen()
    web, soll = _zeilen_web(), _zeilen_csv()
    assert len(web) == len(soll) == 36
    for nr, (w, s) in enumerate(zip(web, soll), start=2):
        assert w == s, f"CSV-Zeile {nr} weicht ab"


def test_9_1_kennzahlen_aus_der_uebergabe():
    _pruefdaten_eintragen()
    a1, a2 = ansicht.baum()
    assert (a1.w.status, a1.w.fortschritt, round(a1.w.prozent * 100, 2)) == ("Teilweise", "10 von 25", 37.43)
    bg = {b.o.kurz: b for b in a1.bgs}
    assert (bg["100"].w.status, bg["100"].w.fortschritt) == ("Komplett", "8 von 8")
    assert (bg["200"].w.status, bg["200"].w.fortschritt, round(bg["200"].w.prozent * 100, 2)) == (
        "Teilweise",
        "2 von 14",
        21.32,
    )
    assert bg["300"].w.status == "Offen"
    assert any(t.w.fortschritt == "50 / 42  (+8 zu viel)" and t.w.status == "Komplett" for t in bg["200"].teile)
    assert (a2.w.status, a2.w.fortschritt) == ("Komplett", "5 von 5")

"""Erzeugt symolo/lokal/beispieldaten.js: die Beispiel- und Demo-Daten der bisherigen App im Tabellenformat von Symolo,
für den lokalen Nachbau (symolo/lokal/symolo-nachbau.js). Nur Entwicklung, greift nie auf Symolo zu.

Aufruf:  python tools/symolo_beispieldaten.py
Ablauf: leere Datenbank in einem Temp-Ordner, `beispieldaten` und `demo_daten` laden, dann je Tabelle ausgeben.
Tabellen- und Spaltennamen wie in symolo/quelle/20_tabellen.js (der Test tests/test_symolo.py prüft, dass sie passen).
Standardfelder wie in Symolo: id, iuser, idate, uuser, udate. Zeitformat wie in Symolo: …T13:19:33.0000000Z.
"""

import json
import os
import sys
import tempfile
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent
ZIEL = BASIS / "symolo" / "lokal" / "beispieldaten.js"
STANDARD = ["id", "iuser", "idate", "uuser", "udate"]
BENUTZER = 1  # erfundener Beispiel-Benutzer

# Aus Bens Nachricht vom 16.10.2026 (Ergebnis von „select * from fwm.stamm_prozesse“ in einer Testsitzung).
STAMM_PROZESSE = [
    ("Oberflächenbeschichtung", 1, "2026-01-05T13:19:33.0000000Z", None, "2026-05-11T16:41:29.0000000Z", 6, 3),
    ("Montage", 1, "2026-01-05T13:19:37.0000000Z", None, "2026-05-11T16:41:35.0000000Z", 7, 3),
    ("Qualitätssicherung", 5, "2026-01-13T14:17:10.0000000Z", 5, "2026-09-18T12:15:00.0000000Z", 9, 5),
    ("Indexänderung", 5, "2026-02-21T07:20:11.0000000Z", None, None, 11, None),
    ("Sonstiges", 5, "2026-02-21T07:20:53.0000000Z", None, None, 13, None),
]
# ERFUNDEN: Die echten Gruppennamen sind nicht bekannt (auch nicht, in welcher Tabelle sie stehen).
GRUPPEN = [(3, "Beispielgruppe 3"), (5, "Beispielgruppe 5")]


def zeit(wert):
    """Python-Wert -> Wert wie in Symolo. OFFEN (Symolo): echte Typen von Datum, ja/nein, JSON."""
    if isinstance(wert, datetime):
        if wert.tzinfo:
            wert = wert.astimezone(timezone.utc)
        return wert.strftime("%Y-%m-%dT%H:%M:%S.0000000Z")
    if isinstance(wert, date):
        return wert.strftime("%Y-%m-%dT00:00:00.0000000Z")
    return wert


def wert(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)  # JSON als Text (OFFEN: JSON-Typ in Symolo?)
    return zeit(v)


def tabelle(felder, zeilen):
    return {"felder": STANDARD + felder, "zeilen": zeilen}


def standard(id_, angelegt=None):
    return {"id": id_, "iuser": BENUTZER, "idate": zeit(angelegt) or HEUTE, "uuser": None, "udate": None}


def aus_modell(objekte, felder, umbenennen=None, extra=None):
    """Django-Objekte -> Symolo-Zeilen. umbenennen: Django-Feld -> Spalte (für Verweise)."""
    umbenennen = umbenennen or {}
    zeilen = []
    for o in objekte:
        z = standard(o.id, getattr(o, "importiert_am", None))
        for f in felder:
            quelle = next((k for k, v in umbenennen.items() if v == f), f)
            z[f] = wert(getattr(o, quelle))
        z.update((extra or (lambda o: {}))(o))
        zeilen.append(z)
    return zeilen


ZEILE = [
    "zeile", "zeichnungsnummer", "benennung", "menge_bg", "menge_gesamt", "menge_gesamt_text", "index",
    "lk_nummer", "arbeitsgang", "material", "profil", "abmasse", "bemerkung", "lagerort",
]  # fmt: skip


def exportieren():
    from bestand import models as m

    auftrag_felder = [
        "ab_anzeige", "ab_schluessel", "forecast_schluessel", "haupt_ab", "kunde", "verkaufsartikel", "ersteller",
        "datum_liste", "dispoliste", "lagerort", "regal_geteilt", "bereich", "reihenfolge", "quelldatei",
        "archiviert", "archiviert_am", "archiv_herkunft", "archiv_status",
    ]  # fmt: skip
    auftraege = aus_modell(
        m.Auftrag.objects.order_by("id"),
        auftrag_felder[:14],
        extra=lambda o: {"archiviert": False, "archiviert_am": None, "archiv_herkunft": "", "archiv_status": ""},
    )
    # Archiv: nur die Köpfe als archivierte ABs. Ihre Zeilen kommen mit dem Archiv (Phase 4).
    naechste = max([a["id"] for a in auftraege] or [0]) + 1
    for i, v in enumerate(m.Archivvorgang.objects.order_by("id")):
        z = standard(naechste + i, v.geloescht_am)
        z.update({f: "" for f in auftrag_felder})
        z.update(
            ab_anzeige=v.ab_anzeige, ab_schluessel=v.ab_schluessel, kunde=v.kunde, verkaufsartikel=v.verkaufsartikel,
            quelldatei=v.quelldatei, reihenfolge=v.reihenfolge, regal_geteilt=False, bereich="archiv",
            archiviert=True, archiviert_am=zeit(v.geloescht_am), archiv_herkunft=v.herkunft, archiv_status=v.status,
        )  # fmt: skip
        auftraege.append(z)

    bg_felder = ["auftrag_id_auftrag", "name", "kurz"] + ZEILE
    teil_felder = ["auftrag_id_auftrag", "baugruppe_id_baugruppe"] + ZEILE + [
        "vorhanden", "datum_eingelagert", "datum_komplett",
    ]  # fmt: skip
    sw_felder = [
        "nr", "ab_nr", "ab_schluessel", "anzeige", "ebene", "baugruppe", "zeichnungsnummer", "benennung", "menge_bg",
        "menge_gesamt", "index", "lk_nummer", "arbeitsgang", "material", "profil", "abmasse", "bemerkung", "vorhanden",
        "lagerort", "status", "fortschritt", "eingelagert", "komplett", "entnommen", "mitarbeiter", "arbeitsplatz",
        "liefertermin_stahlbau", "termin_versand", "kopf", "ap_geteilt",
    ]  # fmt: skip
    ap_felder = ["name", "reihenfolge", "farbe", "spalte", "zeile", "breite", "hoehe"]

    pe = m.Protokolleinstellung.objects.first()
    fe = m.Forecasteinstellung.objects.first()
    einstellungen = [
        ("protokoll_aktiv", "1" if (pe is None or pe.aktiv) else "0"),
        ("protokoll_namen", "1" if (pe is None or pe.namen) else "0"),
        ("protokoll_tage", str(pe.tage if pe else 90)),
        ("forecast_link", fe.quelle if fe else ""),
    ]

    planung = []
    for p in m.Planungsmarke.objects.order_by("id"):
        z = standard(p.id, p.gesetzt_am)
        z["ab_schluessel"] = p.ab_schluessel
        planung.append(z)

    forecasts = []
    for f in m.ForecastImport.objects.order_by("id"):
        z = standard(f.id, f.zeit)
        z.update(zeit=zeit(f.zeit), datei=f.datei, blatt=f.blatt, stand=f.stand, kopf=wert(f.kopf))
        forecasts.append(z)

    return {
        "fwm.stamm_prozesse": {
            "felder": ["name", "iuser", "idate", "uuser", "udate", "id", "standard_gruppe_id_gruppe"],
            "zeilen": [
                dict(zip(["name", "iuser", "idate", "uuser", "udate", "id", "standard_gruppe_id_gruppe"], p))
                for p in STAMM_PROZESSE
            ],
        },
        "fwm.standard_gruppe": tabelle(["name"], [{**standard(i), "name": n} for i, n in GRUPPEN]),
        "fwm.kom_auftrag": tabelle(auftrag_felder, auftraege),
        "fwm.kom_baugruppe": tabelle(
            bg_felder, aus_modell(m.Baugruppe.objects.order_by("id"), bg_felder, {"auftrag_id": "auftrag_id_auftrag"})
        ),
        "fwm.kom_teil": tabelle(
            teil_felder,
            aus_modell(
                m.Teil.objects.order_by("id"),
                teil_felder,
                {"auftrag_id": "auftrag_id_auftrag", "baugruppe_id": "baugruppe_id_baugruppe"},
            ),
        ),
        "fwm.kom_schweisszeile": tabelle(
            sw_felder + ["archiviert"],
            aus_modell(m.Schweisszeile.objects.order_by("id"), sw_felder, extra=lambda o: {"archiviert": False}),
        ),
        "fwm.kom_mitarbeiter": tabelle(
            ["name", "aktiv"],
            aus_modell(m.Mitarbeiter.objects.order_by("id"), ["name"], extra=lambda o: {"aktiv": True}),
        ),
        "fwm.kom_arbeitsplatz": tabelle(ap_felder, aus_modell(m.Arbeitsplatz.objects.order_by("id"), ap_felder)),
        "fwm.kom_planungsmarke": tabelle(["ab_schluessel"], planung),
        "fwm.kom_forecast": tabelle(["zeit", "datei", "blatt", "stand", "kopf"], forecasts),
        "fwm.kom_forecast_zeile": tabelle(
            ["forecast_id_forecast", "nr", "schluessel", "termin", "werte"],
            aus_modell(
                m.ForecastZeile.objects.order_by("id"),
                ["forecast_id_forecast", "nr", "schluessel", "termin", "werte"],
                {"forecast_id": "forecast_id_forecast"},
            ),
        ),
        "fwm.kom_einstellung": tabelle(
            ["name", "wert"], [{**standard(i + 1), "name": n, "wert": w} for i, (n, w) in enumerate(einstellungen)]
        ),
    }


def js_text(daten) -> str:
    kopf = (
        "/* Beispieldaten für den lokalen Nachbau von Symolo. Automatisch erzeugt mit tools/symolo_beispieldaten.py\n"
        "   aus den Beispiel- und Demo-Daten der bisherigen App. Nicht von Hand ändern.\n"
        "   fwm.stamm_prozesse: aus Bens Testsitzung (16.10.2026). fwm.standard_gruppe: ERFUNDEN (echte Namen unbekannt).\n"
        "   Alle fwm.kom_*-Tabellen: VERMUTET, unser Vorschlag (es gibt sie in Symolo noch nicht).\n"
        "   Erstellt: Ben Schumacher, 09.10.2026 */\n"
    )
    teile = []
    for name, t in daten.items():
        zeilen = ",\n    ".join(json.dumps(z, ensure_ascii=False) for z in t["zeilen"])
        teile.append(
            f'  {json.dumps(name)}: {{\n   "felder": {json.dumps(t["felder"], ensure_ascii=False)},\n'
            f'   "zeilen": [\n    {zeilen}\n   ]\n  }}'
        )
    return kopf + "window.KOM_BEISPIELDATEN = {\n" + ",\n".join(teile) + "\n};\n"


HEUTE = None


def main():
    global HEUTE
    with tempfile.TemporaryDirectory() as ordner:
        os.environ["KOM_DEBUG"] = "1"
        os.environ["KOM_DATENBANK"] = str(Path(ordner) / "beispiel.sqlite3")
        sys.path.insert(0, str(BASIS))
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
        import django
        from django.core.management import call_command

        django.setup()
        call_command("migrate", verbosity=0)
        call_command("beispieldaten", stdout=open(os.devnull, "w"))
        call_command("demo_daten", stdout=open(os.devnull, "w"))
        HEUTE = zeit(datetime.now(timezone.utc).replace(microsecond=0))
        daten = exportieren()
    ZIEL.write_text(js_text(daten), encoding="utf-8")
    print(f"geschrieben: {ZIEL.relative_to(BASIS)} ({sum(len(t['zeilen']) for t in daten.values())} Zeilen)")


if __name__ == "__main__":
    main()

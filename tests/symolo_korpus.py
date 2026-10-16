"""Excel-Dateien für den Vergleich Python gegen JavaScript (tests/symolo/excel_lesen.test.js).

Dieselben Dateien lesen bestand/importer.py und bestand/forecast.py (bisherige App) und
symolo/quelle/4P_excel.js, 4Q_import_lesen.js, 4R_forecast_lesen.js. Beide müssen gleich lesen.
Jeder Fall trägt in seinem Namen die Regelnummer.
"""

import base64
from datetime import date, datetime

from bestand import forecast, importer

from .hilfe import DATEN, LISTE_048, LISTE_204, LISTE_624, LISTE_LOS
from .test_forecast import fc_datei, zeile
from .test_import import xlsx, z


def _fall(name, art, dateiname, inhalt=None, groesse=None):
    return {"name": name, "art": art, "dateiname": dateiname, "inhalt": inhalt, "groesse": groesse}


def _kom():
    f = []

    def datei(name, pfad):
        f.append(_fall(name, "kom", pfad.name, pfad.read_bytes()))

    datei("R_I Beispiel 204 mit Zahlen und Kopfwerten", LISTE_204)
    datei("R_I6 Beispiel 624 BG mit LK 10 über die Farbe", LISTE_624)
    datei("R_I5 Haupt-Baugruppe über der Kopfzeile (AB2616048)", LISTE_048)
    datei("R_I5 Haupt-Baugruppe Los 1", LISTE_LOS)

    def neu(name, inhalt, dateiname="t.xlsx"):
        f.append(_fall(name, "kom", dateiname, inhalt))

    neu(
        "R_I6 Ersatzregel ohne Farbe",
        xlsx(
            [z("A-100", "BAUGRUPPE EINS", 2, 100), z("A-101", "TEIL", 4, 101), z("A-200", "BAUGRUPPE ZWEI", 2, "200")]
        ),
    )
    neu(
        "R_I6 Farbe hat Vorrang",
        xlsx([z("A-10", "BG ZEHN", 1, 10), z("A-11", "T", 1, 11), z("A-100", "KEINE BG", 1, 100)], farbe={0: "blau"}),
    )
    neu(
        "R_I6 Füllung mit weißer fetter Schrift",
        xlsx([z("A-10", "BG", 1, 10), z("A-11", "T", 1, 11)], farbe={0: "weiss_fett"}),
    )
    neu(
        "R_D4 Teile vor der ersten BG und leerer BG-Name",
        xlsx(
            [z("X-1", "VORAB", 3), ["B-1", None, 1, 2, "", None, "", "", "", "", None, ""], z("T-1", "T", 1)],
            farbe={1: "blau"},
        ),
    )
    neu(
        "R_I5 leere Zeile zählt nicht",
        xlsx([z("X-1", "VORAB", 3), [None, None, 1, 2, "", None, "", "", "", "", None, "Bem."]], farbe={1: "blau"}),
    )
    neu("R_I2 Kopfzeile 60 geht", xlsx([z("A", "B", 1)], kopfzeile=60))
    neu("R_I2 Kopfzeile 61 geht nicht", xlsx([z("A", "B", 1)], kopfzeile=61))
    neu("R_I3 Pflichtspalte Menge Gesamt fehlt", xlsx([["A", "B"]], spalten=["Zeichnungsnummer", "Benennung"]))
    neu(
        "R_I3 Spaltennamen ohne Leerzeichen und Umbruch",
        xlsx(
            [z("A", "B", 7, 5, 3)],
            spalten=[
                "ZEICHNUNGSNUMMER",
                "Benennung",
                "Menge/BG",
                "Menge\nGesamt",
                "Index",
                "LKNummer",
                "Arbeitsgang",
                "Material",
                "Profil",
                "Abmaße",
                "vorhanden",
                "Bemerkung",
            ],
        ),
    )

    # Listen für die Speichertests (tests/symolo/import.test.js), dieselben Fälle wie tests/test_import.py
    neu("S Teil 5 Stück", xlsx([z("T-1", "TEIL", 5, 1)]))
    neu("S Teil 5 Stück, 4 vorhanden", xlsx([z("T-1", "TEIL", 5, 1, 4)]))
    neu(
        "S Schlüssel erste Liste",
        xlsx([z("b-1", "BG", 1, 100), z("t-1", "TEIL", 5, 101), z("T-2", "TEIL", 5, 102)], farbe={0: "blau"}),
    )
    neu(
        "S Schlüssel zweite Liste",
        xlsx([z("B-1", "BG", 1, 100), z("T-1", "TEIL", 5, 101), z("T-2", "TEIL", 5, 999)], farbe={0: "blau"}),
    )
    neu("S doppelte Teile", xlsx([z("T-1", "A", 5, 1), z("T-1", "B", 5, 1)]))
    neu("S Los 1 Schreibweise", xlsx([z("T", "T", 1)], ab="2616200 / Los 1"))
    neu("S AB999", xlsx([z("T", "T", 1)], ab="AB999"))
    neu("S Los 01 andere Schreibweise", xlsx([z("T", "T", 1)], ab="AB2616200 L01"))
    neu("S Daten der Mengen", xlsx([z("T-1", "T", 5, 1, 5), z("T-2", "T", 5, 2, 2), z("T-3", "T", 5, 3)]))
    neu("S ohne Fertigungs-AB", xlsx([z("T-1", "T", 5, 1)], kopf={"Kunde:": "KNDS"}))

    def kopf(ws):
        ws["D2"] = "Verkaufsartikel"
        ws["F2"] = "  Rahmen  "

    neu("R_I4 Kopfwerte, Doppelpunkt egal, Datum", xlsx([z("A", "B", 1)], extra=kopf))
    neu("R_I4 ohne Fertigungs-AB", xlsx([z("A", "B", 1)], kopf={"Kunde:": "KNDS"}))
    neu(
        "R_I4 Haupt AB wird in die Anzeigeform gebracht",
        xlsx([z("A", "B", 1)], kopf={"Fertigungs AB:": "AB1", "Haupt AB:": "2515202"}),
    )

    ueber = lambda menge: lambda ws: [ws.cell(9, c, v) for c, v in enumerate(["H-0", "HAUPT", 1, menge], 1)]  # noqa: E731
    neu(
        "R_I5 Zeile über der Kopfzeile mit Menge, farbige BG hat Vorrang",
        xlsx([z("A-10", "BG", 1, 10), z("A-11", "T", 1, 11)], farbe={0: "blau"}, extra=ueber(3)),
    )
    neu("R_I5 Zeile über der Kopfzeile ohne Menge ist keine BG", xlsx([z("A-11", "T", 1, 11)], extra=ueber("Text")))
    neu("R_I5 Zeile über der Kopfzeile mit Menge wird BG", xlsx([z("A-11", "T", 1, 11)], extra=ueber(3)))
    neu("R_I5 nur Teile ohne Baugruppe", xlsx([z("A-1", "TEIL", 2, 11), z("A-2", "TEIL", 2, 12)]))

    def fehler(ws):
        ws["D12"] = "#N/A"
        ws["D12"].data_type = "e"

    neu(
        "R_I7 Werte: Text bleibt Text, Fehlerwert leer, BG ohne Vorhanden",
        xlsx(
            [
                ["007", "TEIL", 1, 4, "", 1, "", "", "", "", "viele", ""],
                [12345, "ZAHL", 1, "#NV", "", 2, "", "", "", "", " 3 ", ""],
                ["C", "BG", 1, 2, "", 100, "", "", "", "", 9, ""],
                ["D", "KOMMA", 1, "0,5", "", 3, "", "", "", "", "2,25", ""],
                ["E", "BRUCH", 1, 0.06, "", 4, "", "", "", "", 1.5, ""],
                ["F", "ZEIT", 1, 2, "", 5, "", "", "", "", None, datetime(2026, 7, 3, 8, 30)],
                ["G", "WAHR", 1, 2, "", 6, "", "", "", "", None, True],
            ],
            farbe={2: "blau"},
            extra=fehler,
        ),
    )
    neu(
        "R_M4 zu große Zahl wird Text und warnt",
        xlsx([z("A1", "x", 10**12, vh=2), z("A2", "y", 999_999_999, vh=10**12), z("A3", "z", 5)]),
    )
    neu("R_I8 doppelte Teile geben einen Hinweis", xlsx([z("T-1", "A", 5, 1), z("T-1", "B", 5, 1)]))
    neu("R_D1 Umlaute, Entitäten und Leerzeichen", xlsx([z("A&B <1>", "ÄÖÜ ß  \"x\" 'y'", 2, 1)]))

    f.append(_fall("R_I1 .xls wird abgelehnt", "kom", "alt.xls", b"\xd0\xcf\x11\xe0"))
    f.append(_fall("R_I1 nur Excel-Dateien", "kom", "liste.csv", b"a;b"))
    f.append(_fall("R_I1 keine gültige Datei", "kom", "kaputt.xlsx", b"kein zip"))
    f.append(_fall("R_I1 leere Zip-Datei", "kom", "leer.xlsm", b"PK\x05\x06" + b"\0" * 18))
    f.append(_fall("R_I1 Größenlimit 10 MB", "kom", "gross.xlsx", None, importer.MAX_GROESSE + 1))
    return f


def _forecast():
    f = []

    def neu(name, inhalt, dateiname="f.xlsx"):
        f.append(_fall(name, "forecast", dateiname, inhalt))

    t = datetime(2026, 12, 2)
    f.append(
        _fall(
            "R_F4 Datei mit mehreren Terminen",
            "forecast",
            "ABs_mehrere_Termine.xlsx",
            (DATEN / "ABs_mehrere_Termine.xlsx").read_bytes(),
        )
    )
    andere = ("Planung Stahlbau", [["Auftrag.-Nr", "Liefertermin"], ["AB2699999", datetime(2026, 11, 1)]])
    neu("R_F2 zuerst Auftragsübersicht", fc_datei([zeile("AB2515204", t)], davor=[andere]))
    leer = ("Info", [["nur Text"], ["Auftrag", "Termin"]])
    neu(
        "R_F2 sonst das erste Blatt mit Kopfzeile",
        fc_datei([zeile("AB2515204", t)], blatt="Planung Stahlbau", davor=[leer]),
    )
    for ab_kopf, termin_kopf in [
        ("Auftrag.-Nr", "Liefertermin"),
        ("Auftrags-Nr.", "Liefer-termin"),
        ("AUFTRAG_NR", "LIEFERTERMIN"),
        ("Auftrag\nNr.", "Liefer termin"),
        (" Auftragsnr ", "Liefertermin "),
    ]:
        kopf = ["Filterhilfe", "Auftrag-ID", ab_kopf, "Kunde", "Bezeichnung", "Ampel", termin_kopf]
        neu(f"R_F2 Kopf normiert ({ab_kopf!r})", fc_datei([zeile("AB2515204", t)], kopf=kopf))
    neu("R_F2 Kopfzeile 40 geht", fc_datei([zeile("AB1", t)], kopfzeile=40))
    neu("R_F2 Kopfzeile 41 geht nicht", fc_datei([zeile("AB1", t)], kopfzeile=41))
    neu("R_F2 nur Spalten 1 bis 80", fc_datei([], kopf=["x"] * 79 + ["Auftrag.-Nr", "Liefertermin"]))
    neu("R_F2 ohne Spalte Ampel", fc_datei([["AB2515204", t]], kopf=["Auftrag.-Nr", "Liefertermin"]))
    f.append(_fall("R_F2 .xls wird abgelehnt", "forecast", "f.xls", b"kein excel"))
    f.append(_fall("R_F2 nur Excel-Dateien", "forecast", "f.csv", b"kein excel"))
    f.append(_fall("R_F2 keine gültige Datei", "forecast", "f.xlsx", b"kein excel"))
    f.append(_fall("R_F2 Größenlimit 20 MB", "forecast", "gross.xlsx", None, forecast.MAX_GROESSE + 1))
    neu(
        "R_F3 nur Zeilen mit Schlüssel",
        fc_datei(
            [
                zeile("AB2515204", t),
                zeile("", t),
                zeile("-", None),
                zeile("Summe", None),
                zeile("2616200 / Los 2", None),
                zeile("AB2515204L1", None),
            ]
        ),
    )
    for ampel in ["bereits geliefert", "Bereits geliefert", "  BEREITS GELIEFERT "]:
        neu(
            f"R_F3 bereits geliefert hat keinen Termin ({ampel.strip()})",
            fc_datei([zeile("AB2515204", datetime(2026, 10, 20), ampel)]),
        )
    werte = [
        datetime(2026, 12, 2, 13, 45), date(2026, 12, 2), 46358, 46358.75, "02.12.2026", "2.12.26", "02.12.2026 08:30",
        "2026-12-02", "2026-12-02 08:30:00", 20000, 80000, 100, "KW 49", "31.02.2026", "", None, "#N/A", "12/02/2026", "5.5.99",
    ]  # fmt: skip
    neu("R_F3 Datum erkennen", fc_datei([zeile(f"AB{2600000 + i}", w) for i, w in enumerate(werte)]))
    kopf = [
        "Filterhilfe",
        "Auftrag-ID",
        "Auftrag.-Nr",
        "Kunde",
        "Bezeichnung",
        "Ampel",
        "Liefertermin",
        "",
        "Showstopper",
    ]
    neu(
        "R_F4 Stand, Spaltennamen und alle Spalten",
        fc_datei([zeile("AB2515204", t, "Gelb", "KNDS", "HALTER") + [None, "x"]], kopf=kopf),
        "Forecast_Kundenauftragsliste_SCRIPT_v1.5.xlsm",
    )
    neu("R_F4 Stand nur mit Doppelpunkt (ohne)", fc_datei([zeile("AB1", None)], stand="Stand 13.10."))
    neu("R_F4 Stand nur mit Doppelpunkt (mit)", fc_datei([zeile("AB1", None)], stand="stand: heute"))
    neu("R_F3 keine Auftragsnummern", fc_datei([zeile("", None)]))
    neu(
        "R_F4 Zahlen und Uhrzeit in den Spalten",
        fc_datei([zeile("AB1", datetime(2026, 12, 2, 8, 30), None, "K", 12.5), zeile("AB2", 7.25, None, "K", True)]),
    )
    return f


def korpus():
    """Liste der Fälle mit Ergebnis der bisherigen App (Python)."""
    ergebnis = []

    for fall in _kom() + _forecast():
        inhalt = fall["inhalt"] if fall["inhalt"] is not None else b"PK" + b"0" * (fall["groesse"] - 2)
        try:
            if fall["art"] == "kom":
                g = importer.lesen(inhalt, fall["dateiname"])
                erwartet = {"ergebnis": g.als_dict()}
            else:
                g = forecast.lesen(inhalt, fall["dateiname"])
                erwartet = {
                    "ergebnis": {
                        "datei": g.datei,
                        "blatt": g.blatt,
                        "stand": g.stand,
                        "kopf": g.kopf,
                        "zeilen": [[k, None if t is None else t.isoformat(), w] for k, t, w in g.zeilen],
                    }
                }
        except (importer.ImportFehler, forecast.ForecastFehler) as e:
            erwartet = {"fehler": str(e)}
        ergebnis.append(
            {
                "name": fall["name"],
                "art": fall["art"],
                "dateiname": fall["dateiname"],
                "groesse": fall["groesse"],
                "daten": None if fall["groesse"] else base64.b64encode(inhalt).decode(),
                "erwartet": erwartet,
            }
        )
    return ergebnis

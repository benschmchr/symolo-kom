"""Demo-Daten: erfundene ABs in allen Lagen (Bestandsliste, Schweißen, aufgeteilt, archiviert, gelöscht), damit
Dashboard, Regal, Arbeitsplätze, Forecast, Planung, Statistik, Archiv und Protokoll Inhalt zeigen.

Die Nummern sehen echt aus (2515…, 2616…, 2615…), liegen aber fest im Endbereich 900 bis 999 (z. B. AB2515901).
Erkannt werden die Demo-Daten an dieser festen Nummernliste und zusätzlich an der Quelldatei „Demo-Daten“
(Bestandsliste, Schweißen, Archiv), am Zusatz „(Demo)“ in der Forecast-Bezeichnung und an den Mitarbeiternamen „Demo …“. Bestehende Daten werden weder gelöscht noch überschrieben:
ein Demo-AB, den es schon gibt (in Bestandsliste, Schweißen oder Archiv), wird übersprungen. `entfernen()` löscht
genau diese Demo-Daten wieder. Alle Termine sind relativ zu „heute“ (Vergangenheit und Zukunft).
Es werden die echten Abläufe benutzt (Entnehmen, Archivieren, Löschen, Lagerort setzen), damit die Daten den Regeln folgen.
"""

import re
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from . import archiv, forecast, lagerort, protokoll, schweissen
from .ab_nummer import ab_form, ab_schluessel, forecast_schluessel
from .models import (
    Aenderung,
    Archivvorgang,
    Archivzeile,
    Auftrag,
    Baugruppe,
    ForecastImport,
    ForecastZeile,
    Mitarbeiter,
    Planungsmarke,
    Schweisszeile,
    Teil,
)
from .rechnen import zahl_text

QUELLE = "Demo-Daten"
FORECAST_DATEI = "Demo-Daten (Forecast)"
MITARBEITER = ["Demo Anna", "Demo Bernd", "Demo Chris", "Demo Dana"]

KUNDEN = ["KNDS", "Rheinmetall", "DIEHL"]
PRAEFIXE = ["2515", "2616", "2615"]
MARKE = " (Demo)"  # Zusatz in der Forecast-Bezeichnung
ARTIKEL = ["Rahmen Förderband", "Gehäuse Steuerung", "Podest mit Geländer", "Halter Sensorik", "Treppenkonstruktion"]
BENENNUNGEN = ["WINKEL", "BLECH GEBOGEN", "ROHR GESCHWEISST", "FLANSCH", "DECKEL", "STREBE", "KONSOLE", "LASCHE"]
BG_NAMEN = ["HALTER", "RAHMEN", "STUETZE", "VERKLEIDUNG", "TRAEGER", "KONSOLE"]
PLAETZE_ARBEIT = ["AP01", "AP02", "AP03", "AP04", "AP05", "AP06", "Schweißplatz", "Laser-Kabine", "Schleifen / Finish"]


def demo_nummern() -> list[str]:
    """Alle festen Demo-Nummern (ohne „AB“, mit Los wie angelegt)."""
    return [d.nr for d in AKTIV + GELOESCHT] + [archiv_nummer(k) for k in range(ARCHIV_MAX)]


def demo_schluessel() -> set:
    return {ab_schluessel(ab_form(n)) for n in demo_nummern()}


def demo_forecast_schluessel() -> set:
    return {f"AB{b}" for b in FORECAST} | {forecast_schluessel(ab_form(n)) for n in demo_nummern()}


def ist_demo(schluessel_oder_anzeige: str) -> bool:
    s, alle = schluessel_oder_anzeige or "", demo_schluessel()
    return s in alle or ab_schluessel(s) in alle


# ---------- Beschreibung ----------
@dataclass
class BG:
    kurz: str
    fuell: str  # komplett, teilweise, offen, gemischt
    teile: int = 3
    platz: str = ""


@dataclass
class Demo:
    nr: str  # „2515901“ oder „2616902 / Los 1“
    kunde: int
    artikel: int
    bgs: list = field(default_factory=list)
    ohne: int = 0  # Teile ohne Baugruppe
    ohne_fuell: str = "gemischt"
    platz: str = ""  # Platz am ganzen AB
    geteilt: bool = False  # Regal: in Baugruppen aufgesplittet
    ein: int = 10  # eingelagert vor so vielen Tagen
    dauer: int = 4  # bis komplett in Tagen
    entnommen: list | None = None  # None = nicht entnehmen; [None] = ganzer AB; ["100"] = nur diese BG(s)
    ent_tage: int = 3  # entnommen vor so vielen Tagen
    zuweisung: list = field(default_factory=list)  # (Ziel „AB“ oder BG-Nummer, Feld, Text oder Tage ab heute)
    archiviert: int | None = None  # Tage seit dem Archivieren (setzt Versand = archiviert − 1)
    loeschen: int | None = None  # Tage seit dem Löschen aus der Bestandsliste


AKTIV = [
    Demo("2515901", 0, 0, [BG("100", "offen"), BG("200", "offen"), BG("300", "offen", 2)], ein=0),
    Demo("2616901", 1, 1, [BG("100", "gemischt", 4), BG("200", "gemischt", 4)], platz="L3", ein=9),
    Demo(
        "2615901",
        2,
        2,
        [BG("100", "komplett", 3, "R2"), BG("200", "teilweise", 3, "L4"), BG("300", "offen", 2)],
        geteilt=True,
        ein=6,
        dauer=3,
    ),
    Demo("2515902", 0, 3, [BG("100", "komplett"), BG("200", "komplett")], platz="R5", ein=12, dauer=4),
    Demo("2616902 / Los 1", 3, 4, [BG("100", "komplett"), BG("200", "komplett")], platz="L1", ein=8, dauer=5),
    Demo("2616902 / Los 2", 3, 4, [BG("100", "teilweise"), BG("200", "teilweise")], platz="L2", ein=3),
    Demo("2615902", 1, 0, ohne=5, platz="R6", ein=4),
    Demo(
        "2515903",
        2,
        1,
        [
            BG("100", "komplett", 3, "R1"),
            BG("200", "gemischt", 3, "L6"),
            BG("300", "offen"),
            BG("400", "komplett", 2, "R3"),
        ],
        geteilt=True,
        ein=15,
        dauer=10,
    ),
    # komplett im Schweißen
    Demo(
        "2616903",
        3,
        4,
        [BG("100", "komplett", 4), BG("200", "komplett", 4)],
        ein=14,
        dauer=5,
        entnommen=[None],
        ent_tage=3,
        zuweisung=[("AB", "mitarbeiter", "Demo Anna, Demo Bernd"), ("AB", "arbeitsplatz", "AP01"), ("AB", "lt", 6)],
    ),
    Demo(
        "2615903",
        0,
        2,
        [BG("100", "komplett"), BG("200", "komplett"), BG("300", "komplett", 2)],
        ein=16,
        dauer=6,
        entnommen=[None],
        ent_tage=5,
        zuweisung=[
            ("AB", "lt", 15),
            ("100", "mitarbeiter", "Demo Chris"),
            ("100", "arbeitsplatz", "AP02"),
            ("100", "tv", 9),
            ("200", "mitarbeiter", "Demo Dana"),
            ("200", "arbeitsplatz", "AP04"),
            ("300", "mitarbeiter", "Demo Anna, Demo Dana"),
            ("300", "arbeitsplatz", "Schweißplatz"),
        ],
    ),
    # aufgeteilt: Baugruppen teils im Schweißen, Rest in der Bestandsliste
    Demo(
        "2515904",
        2,
        3,
        [BG("100", "komplett"), BG("200", "komplett", 3, "R4"), BG("300", "teilweise", 3, "L5")],
        ein=11,
        dauer=4,
        entnommen=["100"],
        ent_tage=2,
        zuweisung=[("100", "mitarbeiter", "Demo Bernd"), ("100", "arbeitsplatz", "AP05"), ("100", "lt", 8)],
    ),
    Demo(
        "2616904",
        1,
        1,
        [BG("100", "komplett"), BG("200", "komplett"), BG("300", "offen", 3, "R2")],
        ein=10,
        dauer=3,
        entnommen=["100", "200"],
        ent_tage=1,
        zuweisung=[
            ("100", "mitarbeiter", "Demo Chris, Demo Dana"),
            ("100", "arbeitsplatz", "Laser-Kabine"),
            ("100", "lt", 12),
            ("200", "mitarbeiter", "Demo Anna"),
            ("200", "arbeitsplatz", "AP03"),
            ("200", "lt", 12),
        ],
    ),
    # überfällig (Liefertermin vorbei, kein Versand) und pünktlich versendet, aber noch nicht archiviert
    Demo(
        "2615904",
        3,
        0,
        [BG("100", "komplett"), BG("200", "komplett")],
        ein=30,
        dauer=6,
        entnommen=[None],
        ent_tage=20,
        zuweisung=[
            ("AB", "mitarbeiter", "Demo Bernd"),
            ("AB", "arbeitsplatz", "Schleifen / Finish"),
            ("AB", "lt", -5),
        ],
    ),
    Demo(
        "2515905",
        0,
        3,
        [BG("100", "komplett")],
        ein=12,
        dauer=3,
        entnommen=[None],
        ent_tage=6,
        zuweisung=[
            ("AB", "mitarbeiter", "Demo Dana"),
            ("AB", "arbeitsplatz", "AP06"),
            ("AB", "lt", -3),
            ("AB", "tv", -4),
        ],
    ),
]

# Archivierte ABs aus dem Schweißen über 52 Wochen, fest berechnet (kein Zufall): jede Kalenderwoche und jeder Monat ist
# belegt, die letzten 7 Tage jeden Tag. Die Liefertreue steigt von etwa 55 % auf etwa 90 %, die Durchlaufzeit sinkt von
# etwa 18 auf etwa 8 Tage, die Verspätung wird kürzer; dazwischen feste Ausreißer nach oben und unten.
WOCHEN = 52
ARCHIV_MAX = 100  # so viele Nummern sind für archivierte ABs reserviert (910 bis 943), unabhängig vom Wochentag
_GOLD = 0.6180339887  # gleichmäßig verteilte, aber unregelmäßig wirkende Folge statt Zufall


def archiv_nummer(k: int) -> str:
    return f"{PRAEFIXE[k % 3]}{910 + k // 3}"


def _versandtage(heute: date) -> list[date]:
    """Versanddaten, älteste zuerst: letzte 2 Wochen jeden Tag, bis KW −4 drei je Woche, davor eins bis zwei je Woche."""
    tage = []
    for w in range(WOCHEN - 1, -1, -1):
        montag = heute - timedelta(days=heute.weekday()) - timedelta(weeks=w)
        if w < 2:
            versetzt = range(7)
        elif w < 5:
            versetzt = [(w * 3 + k) % 5 for k in (0, 2, 3)]
        else:
            versetzt = [(w * 3) % 5, (w * 3 + 2) % 5][: 1 + w % 2]
        tage += sorted(d for d in (montag + timedelta(days=v) for v in versetzt) if d <= heute)
    return tage


def archivierte(heute: date | None = None) -> list[Demo]:
    heute = heute or timezone.localdate()
    tage = _versandtage(heute)
    n = len(tage)
    spaet = []
    for k in range(n):
        p = k / (n - 1)
        spaet.append(((0.5 + k * _GOLD) % 1) < 0.45 - 0.35 * p)  # etwa 45 % zu spät am Anfang, 10 % am Ende
    for w in (1, 3):  # feste Ausreißer in den letzten fünf Wochen
        spaet[next(k for k, d in enumerate(tage) if (heute - d).days >= 7 * w)] = True
    monate = {}
    for k, d in enumerate(tage):
        monate.setdefault((d.year, d.month), []).append(k)
    for ks in monate.values():  # jeder Monat hat mindestens einen verspäteten AB (Kachel „Verspätung“ ohne Lücke)
        if not any(spaet[k] for k in ks):
            spaet[ks[len(ks) // 2]] = True
    liste = []
    for k, tag in enumerate(tage):
        p = k / (n - 1)
        zurueck = (heute - tag).days
        dlz = max(3, round(18 - 10 * p) + (k * 7) % 5 - 2 + (5 if k % 9 == 4 else 0))
        if spaet[k]:
            off = -max(1, round(6 - 4 * p) + k % 3 - 1)
        else:
            off = (0, 1, 2, 3, 5, 1, 4)[k % 7]
        bgs = [BG(str((j + 1) * 100), "komplett", 2 + (k + j) % 2) for j in range(1 + k % 2)]
        ma = MITARBEITER[k % 4] + (f", {MITARBEITER[(k + 1) % 4]}" if k % 3 == 0 else "")
        zu = [
            ("AB", "mitarbeiter", ma),
            ("AB", "arbeitsplatz", PLAETZE_ARBEIT[k % len(PLAETZE_ARBEIT)]),
            ("AB", "lt", -zurueck + off),
            ("AB", "tv", -zurueck),
        ]
        liste.append(
            Demo(
                archiv_nummer(k),
                k % len(KUNDEN),
                k % len(ARTIKEL),
                bgs,
                ein=zurueck + dlz,
                dauer=max(1, dlz // 3),
                entnommen=[None],
                ent_tage=zurueck + dlz - max(1, dlz // 2),
                zuweisung=zu,
                archiviert=max(0, zurueck - 1),
            )
        )
    return liste


GELOESCHT = [
    Demo("2615950", 4, 0, [BG("100", "offen"), BG("200", "offen", 2)], ein=0, loeschen=40),
    Demo("2515951", 5, 2, [BG("100", "teilweise")], ein=0, loeschen=120),
]

# Liefertermine im Forecast: Tage ab heute (negativ = überfällig); None = ohne Termin
FORECAST = {
    "2515901": 9,
    "2616901": 20,
    "2615901": 4,
    "2515902": -3,
    "2616902": 35,
    "2615902": 28,
    "2515903": 55,
    "2616903": 6,
    "2615903": 15,
    "2515904": 10,
    "2616904": 25,
    "2615904": -5,
    "2515905": None,
    "2616999": 40,  # noch nicht in der Bestandsliste
}
GEPLANT = ["2615901", "2515903", "2615903", "2615904"]


# ---------- Hilfen ----------
def _zeit(tag: date, stunde: int = 14) -> datetime:
    return timezone.make_aware(datetime.combine(tag, time(stunde, 20)))


def _basis(nr: str) -> str:
    return nr.split(" ")[0]


def rechnen_text(x) -> str:
    return zahl_text(x)


def vorhanden() -> set:
    """AB-Schlüssel, die es schon gibt (Bestandsliste, Schweißen, Archiv)."""
    s = set(Auftrag.objects.values_list("ab_schluessel", flat=True))
    s |= set(Schweisszeile.objects.values_list("ab_schluessel", flat=True))
    s |= set(Archivvorgang.objects.values_list("ab_schluessel", flat=True))
    return s


def _teile_fuellen(fuell: str, i: int) -> str:
    if fuell == "gemischt":
        return ("komplett", "teilweise", "offen")[i % 3]
    if fuell == "teilweise":
        return "teilweise" if i % 2 == 0 else "komplett"
    return fuell


def _anlegen(d: Demo, heute: date) -> Auftrag:
    """Den AB samt Baugruppen und Teilen anlegen; Mengen, Daten und Lagerorte wie nach echter Bearbeitung."""
    anzeige = ab_form(d.nr)
    basis = _basis(d.nr)
    ein = heute - timedelta(days=d.ein)
    a = Auftrag.objects.create(
        ab_anzeige=anzeige,
        ab_schluessel=ab_schluessel(anzeige),
        forecast_schluessel=forecast_schluessel(anzeige),
        haupt_ab=f"AB{int(basis) - 1}-01",
        kunde=KUNDEN[d.kunde % len(KUNDEN)],
        verkaufsartikel=ARTIKEL[d.artikel],
        ersteller="Demo",
        datum_liste=(ein - timedelta(days=2)).strftime("%d.%m.%Y"),
        dispoliste=f"Dispo Demo {basis[-3:]}",
        quelldatei=QUELLE,
        reihenfolge=(Auftrag.objects.aggregate(m=Max("reihenfolge"))["m"] or 0) + 1,
    )
    Auftrag.objects.filter(id=a.id).update(importiert_am=_zeit(ein - timedelta(days=2), 8))
    zeile = 0
    zahl = int(basis[-4:])

    def teil(i, bg, fuell):
        nonlocal zeile
        zeile += 1
        soll = Decimal(4 + (i * 7 + zahl) % 30)
        status = _teile_fuellen(fuell, i)
        if status == "komplett":
            v, e, k = soll, ein, ein + timedelta(days=d.dauer)
        elif status == "teilweise":
            v, e, k = Decimal(max(1, int(soll) // 2)), ein, None
        else:
            v, e, k = None, None, None
        Teil.objects.create(
            auftrag=a,
            baugruppe=bg,
            zeile=zeile,
            zeichnungsnummer=f"SK{(zahl + i) % 1000:03d}-{basis[-6:]}.{i + 1:03d}.0",
            benennung=BENENNUNGEN[(i + zahl) % len(BENENNUNGEN)],
            menge_bg="1",
            menge_gesamt=soll,
            index="A",
            lk_nummer=f"LK{(zahl * 3 + i) % 9000 + 1000}",
            arbeitsgang="Laser, Kanten",
            material="S235JR",
            profil="Blech 3 mm" if i % 2 == 0 else "Rohr 40x40x3",
            abmasse=f"{100 + i * 25} x {60 + i * 10}",
            vorhanden=v,
            datum_eingelagert=e,
            datum_komplett=k,
        )

    for i in range(d.ohne):
        teil(i, None, d.ohne_fuell)
    for n, b in enumerate(d.bgs):
        zeile += 1
        name = f"{b.kurz} {BG_NAMEN[(n + zahl) % len(BG_NAMEN)]} {ARTIKEL[d.artikel].split()[0].upper()}"
        bg = Baugruppe.objects.create(
            auftrag=a, zeile=zeile, name=name, kurz=b.kurz, menge_bg="1", menge_gesamt=Decimal(1), index="A"
        )
        for i in range(b.teile):
            teil(n * 10 + i, bg, b.fuell)
    # Lagerorte: geteilter AB zuerst markieren, damit der Platz an der BG den AB nicht angleicht (Ben, 14.10.)
    if d.geteilt:
        Auftrag.objects.filter(id=a.id).update(regal_geteilt=True)
        a.regal_geteilt = True
    if d.platz:
        lagerort.setze_ab(a, d.platz)
    for bg in a.baugruppen.all():
        platz = next((b.platz for b in d.bgs if b.kurz == bg.kurz and b.platz), "")
        if platz:
            lagerort.setze_bg(bg, platz)
    return a


def _platz(name: str) -> str:
    """Der Arbeitsplatz, falls es ihn in der Liste gibt (die Liste ist im Admin pflegbar); sonst der erste."""
    return schweissen.platz_finden(name) or (schweissen.platz_namen() or [""])[0]


def _zuweisen(d: Demo, heute: date) -> None:
    schl = ab_schluessel(ab_form(d.nr))
    for ziel, feld, wert in d.zuweisung:
        qs = Schweisszeile.objects.filter(ab_schluessel=schl)
        z = (
            qs.filter(ebene="AB").first()
            if ziel == "AB"
            else qs.filter(ebene="BG", baugruppe__startswith=f"{ziel} ").first()
        )
        if z is None:
            continue
        if feld == "lt":
            schweissen.setzen(z.id, "liefertermin_stahlbau", (heute + timedelta(days=wert)).strftime("%d.%m.%Y"))
        elif feld == "tv":
            schweissen.setzen(z.id, "termin_versand", (heute + timedelta(days=wert)).strftime("%d.%m.%Y"))
        elif feld == "arbeitsplatz":
            schweissen.setzen(z.id, feld, _platz(wert))
        else:
            schweissen.setzen(z.id, feld, wert)


def _entnehmen(d: Demo, a: Auftrag, heute: date) -> None:
    tag = heute - timedelta(days=d.ent_tage)
    for kurz in d.entnommen:
        bg_id = None if kurz is None else Baugruppe.objects.get(auftrag_id=a.id, kurz=kurz).id
        schweissen.entnehmen(a.id, bg_id, tag)


def _datum_patchen(v: Archivvorgang, tag: date) -> None:
    z = _zeit(tag, 15)
    Archivvorgang.objects.filter(id=v.id).update(geloescht_am=z)
    Archivzeile.objects.filter(vorgang_id=v.id).update(geloescht_am=z)


# ---------- Änderungsprotokoll ----------
def _log(heute: date, vor_tagen: int, art: str, ab: str, objekt: str = "", alt: str = "", neu: str = "", wer: int = 0):
    e = protokoll.einstellung()
    if not e.aktiv or (e.tage and vor_tagen > e.tage - 1):
        return  # ist das Protokoll aus oder wäre der Eintrag zu alt, wird nichts geschrieben
    name = ("Demo Planung", "Demo Lager", "Demo Schweißen")[wer % 3] if e.namen else ""
    Aenderung.objects.create(
        zeit=_zeit(heute - timedelta(days=vor_tagen), 8 + wer % 8),
        art=art,
        ab=ab[:80],
        objekt=objekt[:400],
        alt=alt,
        neu=neu,
        benutzer_name=name,
    )


def _protokoll_aktiv(d: Demo, heute: date, teile: list, bgs: list) -> None:
    """Einträge für einen AB in Bestandsliste oder Schweißen: Import, Mengen, Lagerorte, Entnehmen, Zuweisungen."""
    anzeige = ab_form(d.nr)
    _log(heute, d.ein + 2, "import", anzeige, "", "", QUELLE, 0)
    for n, (nummer, menge) in enumerate(teile):
        _log(heute, max(0, d.ein - n), "menge", anzeige, f"Teil {nummer}", "leer", menge, 1)
    for kurz, platz in bgs:
        _log(heute, max(0, d.ein - 1), "lagerort", anzeige, f"BG {kurz}", "leer", platz, 1)
    if d.platz:
        _log(heute, max(0, d.ein - 1), "lagerort", anzeige, "", "leer", d.platz, 1)
    if d.entnommen:
        was = "AB" if None in d.entnommen else "BG " + ", ".join(d.entnommen)
        _log(heute, d.ent_tage, "entnommen", anzeige, was, "Bestandsliste", "Schweißen", 2)
        for ziel, feld, wert in d.zuweisung:
            if feld in ("mitarbeiter", "arbeitsplatz"):
                _log(
                    heute,
                    max(0, d.ent_tage - 1),
                    "schweissen",
                    anzeige,
                    f"{feld.capitalize()}: {ziel}",
                    "leer",
                    wert,
                    2,
                )


def _protokoll_archiv(d: Demo, heute: date) -> None:
    anzeige = ab_form(d.nr)
    if d.archiviert is not None:
        _log(heute, d.archiviert, "archiviert", anzeige, "", "Schweißen", "Archiv", 2)
        _log(heute, d.ent_tage, "entnommen", anzeige, "AB", "Bestandsliste", "Schweißen", 2)
    if d.loeschen is not None:
        _log(heute, d.loeschen, "geloescht", anzeige, "", "", "Archiv", 0)


# ---------- Hauptläufe ----------
def _eine(d: Demo, heute: date) -> None:
    a = _anlegen(d, heute)
    teile = [(t.zeichnungsnummer, rechnen_text(t.vorhanden)) for t in a.teile.order_by("zeile") if t.vorhanden][:3]
    bgs = [(b.kurz, b.lagerort) for b in a.baugruppen.exclude(lagerort="")[:2]]
    if d.entnommen:
        _entnehmen(d, a, heute)
        _zuweisen(d, heute)
    if d.archiviert is not None:
        ab_zeile = Schweisszeile.objects.get(ab_schluessel=a.ab_schluessel, ebene="AB")
        v, _ = schweissen.archivieren(ab_zeile.id)
        _datum_patchen(v, heute - timedelta(days=d.archiviert))
        _protokoll_archiv(d, heute)
    elif d.loeschen is not None:
        v, _ = archiv.loeschen(a.id)
        _datum_patchen(v, heute - timedelta(days=d.loeschen))
        _protokoll_archiv(d, heute)
    else:
        _protokoll_aktiv(d, heute, teile, bgs)


def _forecast(heute: date) -> int:
    """Demo-Zeilen in den vorhandenen Forecast einfügen (nichts ersetzen); gibt es keinen, entsteht ein Demo-Forecast."""
    f = forecast.aktuell()
    if f is None:
        f = ForecastImport.objects.create(
            zeit=timezone.now(),
            datei=FORECAST_DATEI,
            blatt="Auftragsübersicht",
            stand=f"Stand: {heute:%d.%m.%Y}",
            kopf=[
                "Filterhilfe",
                "Auftrag-ID",
                "Auftrag.-Nr",
                "Hauptauftrag",
                "Kunde",
                "Bezeichnung",
                "Best.-M.",
                "Ampel",
                "Liefertermin",
            ],
        )
    schon = set(ForecastZeile.objects.filter(forecast=f).values_list("schluessel", flat=True))
    nr = (ForecastZeile.objects.filter(forecast=f).aggregate(m=Max("nr"))["m"] or 0) + 1
    neu = []
    for basis, tage in FORECAST.items():
        schl = f"AB{basis}"
        if schl in schon:
            continue
        d = next((x for x in AKTIV if _basis(x.nr) == basis), None)
        termin = heute + timedelta(days=tage) if tage is not None else None
        ampel = forecast.ampel(termin, heute) if termin else ""
        feld = {
            "auftrag-id": f"{schl}|1",
            "auftragnr": schl,
            "hauptauftrag": f"AB{int(basis) - 1}-01",
            "kunde": KUNDEN[d.kunde % len(KUNDEN)] if d else KUNDEN[0],
            "bezeichnung": (ARTIKEL[d.artikel].upper() if d else "NOCH NICHT IN DER BESTANDSLISTE") + MARKE,
            "bestm": str(4 + int(basis) % 20),
            "ampel": {"rot": "Rot", "gelb": "Gelb", "weiss": ""}.get(ampel, ""),
            "liefertermin": termin.strftime("%d.%m.%Y") if termin else "",
        }
        werte = [
            feld.get(forecast.kopf_norm(k), "FA" if forecast.kopf_norm(k) == "filterhilfe" else "") for k in f.kopf
        ]
        neu.append(ForecastZeile(forecast=f, nr=nr + len(neu), schluessel=schl, termin=termin, werte=werte))
    ForecastZeile.objects.bulk_create(neu)
    return len(neu)


@transaction.atomic
def anlegen(heute: date | None = None) -> dict:
    """Alle Demo-Daten anlegen, die es noch nicht gibt. Liefert Zahlen für die Ausgabe."""
    heute = heute or timezone.localdate()
    schon = vorhanden()
    z = {"aktiv": 0, "archiviert": 0, "geloescht": 0, "uebersprungen": 0, "forecast": 0, "geplant": 0}
    for m in MITARBEITER:
        Mitarbeiter.objects.get_or_create(name=m)
    for gruppe, schluessel in (("aktiv", AKTIV), ("archiviert", archivierte(heute)), ("geloescht", GELOESCHT)):
        for d in schluessel:
            if ab_schluessel(ab_form(d.nr)) in schon:
                z["uebersprungen"] += 1
                continue
            with transaction.atomic():
                _eine(d, heute)
            z[gruppe] += 1
    z["forecast"] = _forecast(heute)
    for basis in GEPLANT:
        _, neu = Planungsmarke.objects.get_or_create(ab_schluessel=f"AB{basis}")
        z["geplant"] += neu
    return z


MUSTER = re.compile(r"^AB(2515|2616|2615)9\d\d(\|L\d+)?$")  # fester Demo-Bereich 900 bis 999 (auch früherer Stände)


@transaction.atomic
def entfernen() -> dict:
    """Genau die Demo-Daten löschen: Nummer im festen Bereich UND Kennzeichnung im Datensatz (Quelldatei „Demo-Daten“).
    Ein echter AB mit zufällig gleicher Nummer bleibt samt Protokoll, Planungs-Häkchen und Forecast-Zeile erhalten."""
    abs_ = [a for a in Auftrag.objects.filter(quelldatei=QUELLE) if MUSTER.match(a.ab_schluessel)]
    sw = [z for z in Schweisszeile.objects.filter(kopf__quelldatei=QUELLE) if MUSTER.match(z.ab_schluessel)]
    ar = [v for v in Archivvorgang.objects.filter(quelldatei=QUELLE) if MUSTER.match(v.ab_schluessel)]
    weg = {x.ab_schluessel for x in [*abs_, *sw, *ar]}
    z = {
        "bestandsliste": len(abs_),
        "schweissen": sum(x.ebene == "AB" for x in sw),
        "archiv": len(ar),
    }
    Auftrag.objects.filter(id__in=[a.id for a in abs_]).delete()
    Schweisszeile.objects.filter(id__in=[x.id for x in sw]).delete()
    Archivvorgang.objects.filter(id__in=[v.id for v in ar]).delete()
    weg -= vorhanden()  # was noch zu einem echten AB gehört, bleibt
    ids = [a.id for a in Aenderung.objects.filter(ab__startswith="AB") if ab_schluessel(a.ab) in weg]
    z["protokoll"] = Aenderung.objects.filter(id__in=ids).delete()[0]
    z["planung"] = Planungsmarke.objects.filter(ab_schluessel__in=weg).delete()[0]
    markiert = [
        zeile.id
        for zeile in ForecastZeile.objects.filter(schluessel__startswith="AB2")
        if MUSTER.match(zeile.schluessel) and any(str(w).endswith(MARKE) for w in zeile.werte)
    ]
    z["forecast"] = ForecastZeile.objects.filter(id__in=markiert).delete()[0]
    f = ForecastImport.objects.filter(datei=FORECAST_DATEI).first()
    if f is not None and not f.zeilen.exists():
        f.delete()
    Mitarbeiter.objects.filter(name__in=MITARBEITER).delete()
    return z

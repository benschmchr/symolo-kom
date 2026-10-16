"""Planung: Häkchen an ABs im Dashboard und im Forecast (ein gemeinsamer Stand), Reiter „Planung“, und die Spalten
„Station“ und „Lagerort“ im Forecast und in der Planung (Bestandsliste → Lagerort im Regal, Schweißen → Arbeitsplatz).

Das Häkchen hängt am AB-Schlüssel (R-AB3, Beispiel „AB2616200|L1“) und gilt für alle Benutzer.
Wer haken darf: Kommissionierung, Stahlbau und Admin (Entscheidung Ben, 14.10.); alle anderen sehen es nur.
"""

from kern.rollen import KOMMISSIONIERUNG, STAHLBAU, hat_rolle

from . import ansicht, forecast, schweissen
from .models import Auftrag, Planungsmarke, Schweisszeile

STATION_BESTAND = "Kom."  # Bestandsliste (Kommissionierung), gekürzt: sonst überschneidet sich die Spalte (Ben, 15.10.)
STATION_SCHWEISSEN = "Schw."
STATION_BEIDE = "Kom. + Schw."  # AB liegt teils in der Bestandsliste, teils (einzelne BGs) im Schweißen


def darf_planen(user) -> bool:
    return hat_rolle(user, KOMMISSIONIERUNG, STAHLBAU)


def gesetzt() -> set:
    return set(Planungsmarke.objects.values_list("ab_schluessel", flat=True))


def existiert(schluessel: str) -> bool:
    """Gibt es diesen AB in der Bestandsliste oder (ganz) im Schweißen?"""
    return (
        Auftrag.objects.filter(ab_schluessel=schluessel, bereich="bestand").exists()
        or Schweisszeile.objects.filter(ab_schluessel=schluessel, ebene="AB").exists()
    )


def umschalten(schluessel: str, an: bool, benutzer=None) -> bool:
    """Häkchen setzen oder entfernen. False, wenn es den AB nicht gibt (beim Entfernen immer erlaubt)."""
    if not an:
        Planungsmarke.objects.filter(ab_schluessel=schluessel).delete()
        return True
    if not existiert(schluessel):
        return False
    Planungsmarke.objects.get_or_create(ab_schluessel=schluessel, defaults={"gesetzt_von": benutzer})
    return True


def alle_abs() -> list:
    """Alle ABs aus Bestandsliste und Schweißen (ganze ABs) mit ihren Werten, wie im Forecast (W11)."""
    return forecast.mit_schweissen(ansicht.baum())


def markieren(liste: list) -> None:
    """Setzt .geplant an jedem DashAB der Liste."""
    marken = gesetzt()
    for d in liste:
        d.geplant = d.a.o.ab_schluessel in marken


def geplante(abs_: list) -> list:
    marken = gesetzt()
    return [a for a in abs_ if a.o.ab_schluessel in marken]


# ---------- Station und Lagerort ----------
def _plaetze(namen) -> str:
    return ", ".join(dict.fromkeys(n for n in namen if n and n != schweissen.VERSCHIEDEN))


def orte_setzen(liste: list) -> None:
    """Setzt an jedem DashAB und jeder Gruppe .station und .ort, an jedem Teil .ort.
    Bestandsliste: Lagerort im Regal. Schweißen: Arbeitsplatz. Liegen einzelne BGs eines AB im Schweißen
    (Einzelblöcke), steht beim AB „Kom. + Schw.“ und beides unter Lagerort."""
    einzeln = {}
    for b in schweissen.bloecke(schweissen.lesen()):
        if b.ab is None:
            einzeln.setdefault(b.bgs[0].bg.ab_schluessel, []).extend(g.bg.p for g in b.bgs)
    for d in liste:
        a = d.a
        if a.schweissen:
            d.station, d.ort = STATION_SCHWEISSEN, getattr(a.o, "arbeitsplatz", "") or ""
            for g in d.gruppen:
                g.station = STATION_SCHWEISSEN
                g.ort = (getattr(g.bg.o, "arbeitsplatz", "") if g.bg else "") or d.ort
                for t in g.teile:
                    t.ort = getattr(t.o, "arbeitsplatz", "") or g.ort
            continue
        plaetze = einzeln.get(a.o.ab_schluessel)
        d.station = STATION_BEIDE if plaetze else STATION_BESTAND
        d.ort = " · ".join(x for x in (a.o.lagerort, _plaetze(plaetze or [])) if x)
        for g in d.gruppen:
            g.station = STATION_BESTAND
            g.ort = g.bg.o.lagerort if g.bg else ""
            for t in g.teile:
                t.ort = t.o.lagerort

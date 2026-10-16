"""Statistik: Liefertreue (Woche, Monat), Durchlaufzeit, überfällige ABs, Verspätung.

Grundlage sind die Termine aus dem Schweißen und dem Archiv (archivierte ABs zählen mit, sonst gingen frühere Monate verloren):
  Liefertermin     = „Liefertermin Stahlbau“ (liefertermin_stahlbau)
  Versand          = „Termin Versand“ (termin_versand)
  pünktlich        = Versand am Liefertermin oder davor
  gezählt          = hat einen Versand, oder der Liefertermin liegt vor heute (ohne Versand = nicht pünktlich);
                     liegt der Liefertermin heute oder später und es gibt noch keinen Versand, zählt der Eintrag noch nicht
  Liefertreue in % = pünktliche geteilt durch gezählte (Zahl)
  Durchlaufzeit    = Versand − Eingelagert in Tagen (wie die Spalte DLZ im Schweißen), nach dem Versanddatum eingeordnet
„AB“ ist eine AB-Zeile (oder ein Einzelblock aus einer BG); „Bauteil“ ist jede Teil-Zeile. Sind die Termine der BGs eines AB
verschieden, gilt der früheste Liefertermin, und der Versand zählt erst, wenn alle BGs einen haben (dann der späteste).
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.db.models import Q

from . import schweissen
from .models import Archivzeile

SOLL = 80  # Soll der Liefertreue in % (Linie im Diagramm)
GELB_AB = 70  # ab hier „leicht darunter“ (gelb), darunter rot
WAS = [("abs", "ABs"), ("teile", "Alle Bauteile")]
WAS_STANDARD = "abs"
ZEITEN = [("woche", "Woche"), ("monat", "Monat"), ("jahr", "Jahr")]
ZEIT_STANDARD = "monat"
MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]
TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


@dataclass
class Eintrag:
    """Ein AB (art „ab“) oder ein Bauteil (art „teil“) mit seinen Terminen."""

    art: str
    anzeige: str
    lt: date | None  # Liefertermin Stahlbau
    tv: date | None  # Termin Versand
    eingelagert: date | None = None
    platz: str = ""
    mitarbeiter: str = ""
    kunde: str = ""
    archiviert: bool = False

    @property
    def dlz(self):
        return (self.tv - self.eingelagert).days if self.tv and self.eingelagert else None


def _datum(x):
    return x if isinstance(x, date) and not isinstance(x, datetime) else None


def _ab_termine(lt, tv, bg_lt, bg_tv):
    """Liefertermin und Versand eines AB: eigener Wert, sonst aus den BGs (siehe Kopf des Moduls)."""
    lt, tv = _datum(lt), _datum(tv)
    if lt is None and bg_lt:
        lt = min(bg_lt)
    if tv is None and bg_tv and all(bg_tv):
        tv = max(bg_tv)
    return lt, tv


def aus_schweissen() -> list[Eintrag]:
    ergebnis = []
    for b in schweissen.bloecke(schweissen.lesen()):
        kopf = b.kopf
        bgs = [g.bg for g in b.bgs]
        if b.ab is not None:
            lt, tv = _ab_termine(
                b.ab.lt, b.ab.tv, [_datum(x.lt) for x in bgs if _datum(x.lt)], [_datum(x.tv) for x in bgs]
            )
        else:
            lt, tv = _datum(kopf.lt), _datum(kopf.tv)
        kunde = (kopf.kopf or {}).get("kunde", "")
        ergebnis.append(
            Eintrag(
                "ab",
                kopf.anzeige,
                lt,
                tv,
                kopf.eingelagert,
                "" if kopf.p == schweissen.VERSCHIEDEN else kopf.p,
                "" if kopf.m == schweissen.VERSCHIEDEN else kopf.m,
                kunde,
            )
        )
        for z in b.zeilen:
            if z.ebene == "Teil":
                ergebnis.append(Eintrag("teil", z.anzeige, _datum(z.lt), _datum(z.tv), z.eingelagert))
    return ergebnis


def aus_archiv() -> list[Eintrag]:
    """Archivierte ABs aus dem Schweißen (nur sie haben Termine); Bestandsliste-Löschungen haben keine."""
    zeilen = Archivzeile.objects.filter(
        Q(ebene="AB") | Q(liefertermin_stahlbau__isnull=False) | Q(termin_versand__isnull=False)
    ).values_list("vorgang_id", "ebene", "ab", "liefertermin_stahlbau", "termin_versand", "eingelagert")
    je = {}
    for v, ebene, ab, lt, tv, ein in zeilen:
        je.setdefault(v, []).append((ebene, ab, lt, tv, ein))
    ergebnis = []
    for rows in je.values():
        ab_zeile = next((r for r in rows if r[0] == "AB"), None)
        bgs = [r for r in rows if r[0] == "BG"]
        lt, tv = _ab_termine(
            ab_zeile[2] if ab_zeile else None,
            ab_zeile[3] if ab_zeile else None,
            [r[2] for r in bgs if r[2]],
            [r[3] for r in bgs],
        )
        if lt or tv:
            ergebnis.append(
                Eintrag("ab", (ab_zeile or rows[0])[1], lt, tv, ab_zeile[4] if ab_zeile else None, archiviert=True)
            )
        for r in rows:
            if r[0] == "Teil" and (r[2] or r[3]):
                ergebnis.append(Eintrag("teil", r[1], r[2], r[3], r[4], archiviert=True))
    return ergebnis


def alle_eintraege() -> list[Eintrag]:
    return aus_schweissen() + aus_archiv()


# ---------- Rechnen ----------
def kw(d: date) -> tuple:
    j, w, _ = d.isocalendar()
    return (j, w)


def montag(d: date) -> date:
    return d - timedelta(days=d.weekday())


def letzte_kws(heute: date, n: int) -> list[tuple]:
    """Die letzten n Kalenderwochen bis einschließlich der aktuellen, älteste zuerst."""
    m = montag(heute)
    return [kw(m - timedelta(weeks=i)) for i in range(n - 1, -1, -1)]


def letzte_monate(heute: date, n: int) -> list[tuple]:
    """Die letzten n Monate bis einschließlich des aktuellen, ältester zuerst."""
    j, m = heute.year, heute.month
    liste = []
    for _ in range(n):
        liste.append((j, m))
        m -= 1
        if m == 0:
            j, m = j - 1, 12
    return liste[::-1]


@dataclass
class Balken:
    label: str
    wert: float | None
    text: str
    hoehe: int = 0  # 0 bis 100 (% der Diagrammhöhe)
    farbe: str = "neutral"  # gruen, gelb, rot, neutral
    n: int = 0
    titel: str = ""


def liefertreue(eintraege: list[Eintrag], art: str, zeitraeume: list, schluessel, label, heute: date) -> list[Balken]:
    """Je Zeitraum: Anteil pünktlich versandter Einträge, deren Liefertermin in diesem Zeitraum liegt."""
    zaehler = {z: [0, 0] for z in zeitraeume}  # [gezählt, pünktlich]
    for e in eintraege:
        if e.art != art or e.lt is None:
            continue
        z = schluessel(e.lt)
        if z not in zaehler or (e.tv is None and e.lt >= heute):
            continue
        zaehler[z][0] += 1
        zaehler[z][1] += bool(e.tv and e.tv <= e.lt)
    balken = []
    for z in zeitraeume:
        n, p = zaehler[z]
        if n == 0:
            balken.append(Balken(label(z), None, "–", 0, "neutral", 0, f"{label(z)}: keine Liefertermine"))
            continue
        pct = round(p / n * 100)
        farbe = "gruen" if pct >= SOLL else "gelb" if pct >= GELB_AB else "rot"
        balken.append(Balken(label(z), pct, f"{pct} %", pct, farbe, n, f"{label(z)}: {p} von {n} pünktlich"))
    return balken


def liefertreue_monat(eintraege, art, heute) -> list[Balken]:
    """Fünf Balken: die letzten vier Kalenderwochen und die aktuelle."""
    return liefertreue(eintraege, art, letzte_kws(heute, 5), lambda d: kw(d), lambda z: f"KW {z[1]}", heute)


def liefertreue_ia(eintraege, art, heute) -> list[Balken]:
    """Zwölf Balken: die letzten zwölf Monate bis einschließlich des aktuellen."""
    return liefertreue(
        eintraege,
        art,
        letzte_monate(heute, 12),
        lambda d: (d.year, d.month),
        lambda z: f"{MONATE[z[1] - 1]} {str(z[0])[2:]}",
        heute,
    )


def _zahl(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def durchschnitt(werte: dict, zeitraeume: list, label, einheit="Tage", farbe="neutral") -> list[Balken]:
    """Mittelwert je Zeitraum; Balkenhöhe relativ zum größten Wert."""
    mittel = {z: (sum(werte[z]) / len(werte[z]) if werte.get(z) else None) for z in zeitraeume}
    groesst = max([m for m in mittel.values() if m is not None and m > 0] or [0])
    balken = []
    for z in zeitraeume:
        m, n = mittel[z], len(werte.get(z, []))
        if m is None:
            balken.append(Balken(label(z), None, "–", 0, "neutral", 0, f"{label(z)}: keine Daten"))
        else:
            h = round(max(m, 0) / groesst * 100) if groesst else 0
            balken.append(
                Balken(
                    label(z),
                    m,
                    _zahl(m),
                    max(h, 2),
                    farbe,
                    n,
                    f"{label(z)}: Ø {_zahl(m)} {einheit} bei {n} AB{'s' if n != 1 else ''}",
                )
            )
    return balken


def durchlaufzeit(eintraege: list[Eintrag], zeit: str, heute: date) -> list[Balken]:
    """Ø Durchlaufzeit der ABs (Versand − Eingelagert), nach Versanddatum: Woche = letzte 7 Tage (je Tag),
    Monat = letzte 4 Kalenderwochen, Jahr = letzte 12 Monate."""
    abs_ = [e for e in eintraege if e.art == "ab" and e.dlz is not None]
    if zeit == "woche":
        tage = [heute - timedelta(days=i) for i in range(6, -1, -1)]
        je = {t: [e.dlz for e in abs_ if e.tv == t] for t in tage}
        return durchschnitt(je, tage, lambda t: f"{TAGE[t.weekday()]} {t.day}.{t.month}.")
    if zeit == "jahr":
        monate = letzte_monate(heute, 12)
        je = {m: [e.dlz for e in abs_ if (e.tv.year, e.tv.month) == m] for m in monate}
        return durchschnitt(je, monate, lambda z: f"{MONATE[z[1] - 1]} {str(z[0])[2:]}")
    kws = letzte_kws(heute, 4)
    je = {k: [e.dlz for e in abs_ if kw(e.tv) == k] for k in kws}
    return durchschnitt(je, kws, lambda z: f"KW {z[1]}")


def ueberfaellig(eintraege: list[Eintrag], heute: date) -> list[Eintrag]:
    """ABs im Schweißen, deren Liefertermin vorbei ist und die noch keinen Versand haben, älteste zuerst."""
    return sorted(
        (e for e in eintraege if e.art == "ab" and not e.archiviert and e.lt and e.tv is None and e.lt < heute),
        key=lambda e: (e.lt, e.anzeige),
    )


def verspaetung(eintraege: list[Eintrag], heute: date) -> tuple[list[Balken], dict]:
    """Ø Verspätung der zu spät versandten ABs je Monat (Versand nach Liefertermin), letzte 12 Monate, dazu die Summe."""
    monate = letzte_monate(heute, 12)
    je = {m: [] for m in monate}
    versandt = spaet = 0
    for e in eintraege:
        if e.art != "ab" or not (e.lt and e.tv) or (e.tv.year, e.tv.month) not in je:
            continue
        versandt += 1
        if e.tv > e.lt:
            spaet += 1
            je[(e.tv.year, e.tv.month)].append((e.tv - e.lt).days)
    alle = [t for v in je.values() for t in v]
    zusammen = {"versandt": versandt, "spaet": spaet, "mittel": _zahl(sum(alle) / len(alle)) if alle else "–"}
    return durchschnitt(je, monate, lambda z: f"{MONATE[z[1] - 1]} {str(z[0])[2:]}", farbe="neutral"), zusammen

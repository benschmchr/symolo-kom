"""Dashboard (R-DB1 bis R-DB6): alle ABs mit BGs und Teilen, sortiert wie die Excel-Formel DASH (dashformel.py).

Die Werte (Status, Prozent, Stand) kommen aus dem Rechenkern (rechnen.py, über ansicht.baum()); hier wird nur sortiert,
gefiltert, der Kopf gezählt und der Klappzustand bestimmt.
"""

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from . import ansicht, rechnen

# R-DB2 Ansicht = wie weit aufgeklappt wird (Wert in der Adresse, Beschriftung)
ANSICHTEN = [("ab", "Nur ABs"), ("bg", "ABs + Baugruppen"), ("alles", "Alles")]
STANDARD = "bg"
ALLE_KUNDEN = "Alle"


def _text(x) -> str:
    """Textvergleich wie Excel (SORT, UNIQUE, =): ohne Groß-/Kleinschreibung."""
    return (x or "").strip().casefold()


def prozent_text(p: float) -> str:
    """Fortschritt % wie das Excel-Format „0 %“: ganze Zahl, kaufmännisch gerundet (0,3743 → „37 %“)."""
    return f"{Decimal(repr(round(p * 100, 9))).quantize(Decimal(1), ROUND_HALF_UP)} %"


@dataclass
class Gruppe:
    """Eine BG mit ihren Teilen, oder die Teile direkt unter dem AB (bg = None, R-DB4: klappen wie Teile einer BG)."""

    bg: "ansicht.BGZ | None"
    teile: list
    schluessel: str  # stabil über ein Ersetzen hinweg: „ab-schlüssel|bg-name“ (wie Excel)
    offen: bool = False

    @property
    def html_id(self):
        return self.bg.schluessel if self.bg else f"o{self.teile[0].o.auftrag_id}"


@dataclass
class DashAB:
    a: "ansicht.ABZ"
    gruppen: list = field(default_factory=list)
    offen: bool = False
    termin: object = None  # nur Forecast (R-F6): frühester Liefertermin oder None
    ampel: str = ""  # nur Forecast (R-F7): rot, gelb, weiss
    im_sw: list = field(default_factory=list)  # nur Dashboard (Ben, 15.10.): Baugruppen, die schon im Schweißen liegen

    @property
    def schluessel(self):
        return _text(self.a.o.ab_schluessel)

    @property
    def ohne(self):
        return next((g for g in self.gruppen if g.bg is None), None)


SORTIERUNGEN = [
    ("ab", "Absteigend"),
    ("auf", "Aufsteigend"),
]  # nach Fortschritt in % (Ben, 14.10.), Standard absteigend
SORT_STANDARD = "ab"


def sortieren(abs_: list, nach_prozent: str = "") -> list[DashAB]:
    """R-DB3: 1. Sortierschlüssel des AB (R-S7), 2. AB-Nummer, 3. AB-Zeile vor dem Rest, 4. Schlüssel der BG,
    5. BG-Name, 6. BG-Zeile vor ihren Teilen, 7. Schlüssel des Teils, 8. Zeichnungsnummer.

    Teile ohne BG haben in Excel den BG-Schlüssel −9 (von der AB-Zeile geerbt) und stehen deshalb vor allen BGs.
    """

    def teile_sortiert(teile):
        return sorted(teile, key=lambda t: (t.w.sort, _text(t.o.zeichnungsnummer)))

    if nach_prozent in ("ab", "auf"):  # Ben, 14.10.: ABs nach Fortschritt in %, gleiche Prozent nach AB-Nummer
        vorzeichen = -1 if nach_prozent == "ab" else 1
        reihenfolge = sorted(abs_, key=lambda a: (vorzeichen * a.w.prozent, _text(a.o.ab_anzeige)))
    else:
        reihenfolge = sorted(abs_, key=lambda a: (a.w.sort, _text(a.o.ab_anzeige)))
    ergebnis = []
    for a in reihenfolge:
        d = DashAB(a)
        ab = d.schluessel
        if a.ohne:
            d.gruppen.append(Gruppe(None, teile_sortiert(a.ohne), ab + "|"))
        for b in sorted(a.bgs, key=lambda b: (b.w.sort, _text(b.o.name))):
            d.gruppen.append(Gruppe(b, teile_sortiert(b.teile), f"{ab}|{_text(b.o.name)}"))
        ergebnis.append(d)
    return ergebnis


def kunden(abs_: list) -> list[str]:
    """R-DB2: „Alle“ + alphabetische Liste aller Kunden der ABs (ohne doppelte, ohne leere)."""
    je = {}
    for a in abs_:
        k = (a.o.kunde or "").strip()
        if k:
            je.setdefault(k.casefold(), k)
    return [ALLE_KUNDEN] + [je[k] for k in sorted(je)]


def filtern(abs_: list, suche: str = "", kunde: str = "") -> list:
    """R-DB2: AB-Suche (Teilwort in der AB-Nummer) und Kunde (Alle = alle)."""
    q, kd = _text(suche), _text(kunde)
    if kd == _text(ALLE_KUNDEN):
        kd = ""
    return [a for a in abs_ if q in _text(a.o.ab_anzeige) and (not kd or _text(a.o.kunde) == kd)]


def kopf(abs_: list) -> dict:
    """R-DB5: n Aufträge, n komplett, n teilweise, n offen und Gesamt-% (R-S6) über alle ABs, unabhängig vom Filter."""
    teile = [t.w for a in abs_ for t in a.alle_teile]
    gesamt = rechnen.gesamt(teile)
    n = len(abs_)
    z = {"ab": n}
    for st in (rechnen.KOMPLETT, rechnen.TEILWEISE, rechnen.OFFEN):
        z[st.lower()] = sum(a.w.status == st for a in abs_)
        z[st.lower() + "_anteil"] = round(z[st.lower()] / n * 100) if n else 0
    z["gesamt"] = gesamt
    z["gesamt_txt"] = f"{gesamt * 100:.1f} %".replace(".", ",")
    return z


def klappen(liste: list[DashAB], ansicht_wert: str, gemerkt: dict) -> None:
    """R-DB4: Startzustand aus der Ansicht (Nur ABs: alles zu; ABs + Baugruppen: ABs auf; Alles: alles auf),
    davon abweichend, was der Benutzer bei dieser Ansicht selbst auf- oder zugeklappt hat (gemerkt: Schlüssel → offen)."""
    stufe = {"ab": 1, "bg": 2, "alles": 3}.get(ansicht_wert, 2)
    for d in liste:
        d.offen = gemerkt.get(d.schluessel, stufe >= 2)
        for g in d.gruppen:
            g.offen = gemerkt.get(g.schluessel, stufe == 3)


# ---------- Klappzustand je Benutzer merken (R-DB4) ----------
SEITE = "dashboard"
SEITEN = ("dashboard", "forecast")  # Forecast klappt wie das Dashboard, mit eigenem Zustand


def zustand_lesen(request, seite: str = SEITE) -> dict:
    """{„ansicht“: …, „klappen“: {Schlüssel: offen}}; angemeldet in der Datenbank, Gäste in ihrer Sitzung."""
    from .models import Ansichtszustand

    if request.user.is_authenticated:
        z = Ansichtszustand.objects.filter(benutzer=request.user, seite=seite).first()
        return {"ansicht": z.ansicht, "klappen": dict(z.klappen)} if z else {}
    return dict(request.session.get(f"{seite}_klappen") or {})


def zustand_schreiben(request, zustand: dict, seite: str = SEITE) -> None:
    from .models import Ansichtszustand

    if request.user.is_authenticated:
        Ansichtszustand.objects.update_or_create(
            benutzer=request.user, seite=seite, defaults={"ansicht": zustand["ansicht"], "klappen": zustand["klappen"]}
        )
    else:
        request.session[f"{seite}_klappen"] = zustand

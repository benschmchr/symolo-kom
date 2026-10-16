"""Aufbereitung für die Anzeige: Baum AB › BG › Teil mit berechneten Werten, Suche und Filter (R-A1 bis R-A4)."""

from dataclasses import dataclass

from django.db.models import Prefetch

from . import rechnen
from .models import Auftrag, Baugruppe, Teil

# R-A2 Anzeige, R-A3 Status-Filter: (Wert in der Adresse, Beschriftung)
ANZEIGEN = [("alles", "Alles"), ("ab", "ABs"), ("bg", "BGs")]  # Knöpfe „ABs“, „BGs“, „Alles“ (Ben, 14.10.)
SORTIERUNGEN = [
    ("import", "Wie importiert"),
    ("az", "A-Z"),
    ("za", "Z-A"),
    ("auf", "Fortschritt aufsteigend"),
    ("ab", "Fortschritt absteigend"),
]
SORT_STANDARD = "import"  # R-A4: ohne Auswahl bleibt die Reihenfolge wie importiert
STATUS = [
    ("alle", "Alle"),
    ("offene", "Offene (Teilweise + Offen)"),
    ("teilweise", "Nur Teilweise"),
    ("offen", "Nur Offen"),
    ("komplett", "Nur Komplett"),
]
STATUS_LISTE = {
    "offene": {rechnen.TEILWEISE, rechnen.OFFEN},
    "teilweise": {rechnen.TEILWEISE},
    "offen": {rechnen.OFFEN},
    "komplett": {rechnen.KOMPLETT},
}


@dataclass
class TeilZ:
    o: Teil
    w: rechnen.Werte
    zeigen: bool = True

    @property
    def schluessel(self):
        return f"t{self.o.id}"


@dataclass
class BGZ:
    o: Baugruppe
    w: rechnen.Werte
    teile: list
    zeigen: bool = True
    offen: bool = True

    @property
    def schluessel(self):
        return f"b{self.o.id}"


@dataclass
class ABZ:
    o: Auftrag
    w: rechnen.Werte
    ohne: list  # Teile direkt unter dem AB („(ohne BG)“)
    bgs: list
    zeigen: bool = True
    offen: bool = True
    schweissen: bool = False  # nur Forecast (W11): ganzer AB liegt im Schweißen, Status „Schweißen“

    @property
    def schluessel(self):
        return f"a{self.o.id}"

    @property
    def alle_teile(self):
        return self.ohne + [t for b in self.bgs for t in b.teile]

    @property
    def zeilen(self):
        """Alle Zeilen in der Reihenfolge wie importiert (Teile ohne BG stehen vorn)."""
        yield self
        yield from self.ohne
        for b in self.bgs:
            yield b
            yield from b.teile

    @property
    def hat_unter(self):
        return any(z.zeigen for z in self.zeilen if z is not self)


def teil_werte(t: Teil) -> rechnen.Werte:
    return rechnen.teil(t.vorhanden, t.menge_gesamt, t.datum_eingelagert, t.datum_komplett)


def baum(auftraege=None) -> list[ABZ]:
    """ABs mit Baugruppen und Teilen und allen berechneten Werten (3 Datenbankabfragen)."""
    qs = auftraege if auftraege is not None else Auftrag.objects.filter(bereich="bestand")
    qs = qs.prefetch_related(
        Prefetch("baugruppen", queryset=Baugruppe.objects.order_by("zeile")),
        Prefetch("teile", queryset=Teil.objects.order_by("zeile")),
    )
    ergebnis = []
    for a in qs:
        je_bg = {}
        ohne = []
        for t in a.teile.all():
            z = TeilZ(t, teil_werte(t))
            (je_bg.setdefault(t.baugruppe_id, []) if t.baugruppe_id else ohne).append(z)
        bgs = [
            BGZ(b, rechnen.sammel([t.w for t in je_bg.get(b.id, [])]), je_bg.get(b.id, [])) for b in a.baugruppen.all()
        ]
        alle = ohne + [t for b in bgs for t in b.teile]
        ergebnis.append(ABZ(a, rechnen.sammel([t.w for t in alle]), ohne, bgs))
    return ergebnis


def zaehler(abs_: list[ABZ]) -> dict:
    """R-S9: ABs gesamt · komplett · teilweise · offen; Einzelteile komplett · teilweise · offen."""
    z = {"ab": len(abs_)}
    for st in (rechnen.KOMPLETT, rechnen.TEILWEISE, rechnen.OFFEN):
        z[st.lower()] = sum(a.w.status == st for a in abs_)
        z["teile_" + st.lower()] = sum(t.w.status == st for a in abs_ for t in a.alle_teile)
    return z


def sortieren(abs_: list[ABZ], wie: str) -> list[ABZ]:
    """Ben, 14.10.: ABs nach Nummer A-Z / Z-A oder nach Fortschritt; gleiche Werte nach AB-Nummer."""

    def nummer(a):
        return a.o.ab_anzeige.casefold()

    if wie not in ("az", "za", "auf", "ab"):
        return list(abs_)
    if wie == "za":
        return sorted(abs_, key=nummer, reverse=True)
    if wie in ("auf", "ab"):
        return sorted(abs_, key=lambda a: ((1 if wie == "auf" else -1) * a.w.prozent, nummer(a)))
    return sorted(abs_, key=nummer)


def _treffer(q, *texte) -> bool:
    return any(q in (t or "").casefold() for t in texte)


def suchen(abs_: list[ABZ], begriff: str) -> int:
    """R-A1: setzt .zeigen; liefert die Zahl der Treffer (0 = „Kein Treffer für …“)."""
    q = begriff.strip().casefold()
    treffer = 0
    for a in abs_:
        for z in a.zeilen:
            z.zeigen = False
        if q in a.o.ab_anzeige.casefold():  # AB-Nummer → ganzer AB
            for z in a.zeilen:
                z.zeigen = True
            treffer += 1
            continue
        for t in a.ohne:
            if _treffer(q, t.o.zeichnungsnummer, t.o.benennung, t.o.lk_nummer, t.o.lagerort):
                t.zeigen = a.zeigen = True
                treffer += 1
        for b in a.bgs:
            if _treffer(q, b.o.zeichnungsnummer, b.o.benennung, b.o.lk_nummer, b.o.lagerort):
                b.zeigen = a.zeigen = True  # BG → mit allen Teilen
                for t in b.teile:
                    t.zeigen = True
                treffer += 1
            for t in b.teile:
                if _treffer(q, t.o.zeichnungsnummer, t.o.benennung, t.o.lk_nummer, t.o.lagerort):
                    t.zeigen = b.zeigen = a.zeigen = True  # Teil → mit AB- und BG-Kopf
                    treffer += 1
    return treffer


def filtern(abs_: list[ABZ], anzeige: str, status: str) -> int:
    """R-A2/R-A3: Anzeige (Ebene) und Status der jeweiligen Zeile, mit ihren Kopfzeilen. Liefert Trefferzahl."""
    stl = STATUS_LISTE.get(status)
    treffer = 0
    for a in abs_:
        for z in a.zeilen:
            z.zeigen = False

        def passt(z, ebene):
            ok = {"ab": ebene == "AB", "bg": ebene in ("AB", "BG")}.get(anzeige, True)
            return ok and (stl is None or z.w.status in stl)

        if passt(a, "AB"):
            a.zeigen = True
            treffer += 1
        for t in a.ohne:
            if passt(t, "Teil"):
                t.zeigen = a.zeigen = True
                treffer += 1
        for b in a.bgs:
            if passt(b, "BG"):
                b.zeigen = a.zeigen = True
                treffer += 1
            for t in b.teile:
                if passt(t, "Teil"):
                    t.zeigen = b.zeigen = a.zeigen = True
                    treffer += 1
        if (
            anzeige in ("ab", "bg") and status == "alle" and a.zeigen
        ):  # Ben, 14.10.: darunter aufklappbar (zunächst zugeklappt)
            for z in a.zeilen:
                z.zeigen = True
    return treffer


def zeile_json(z) -> dict:
    """Werte einer Zeile für die Aktualisierung im Browser (bestand.js)."""
    w = z.w
    d = {
        "status": w.status,
        "css": w.css,
        "fortschritt": w.fortschritt,
        "prozent": round(w.prozent * 100, 2),
        "eingelagert": w.eingelagert.strftime("%d.%m.%Y") if w.eingelagert else "",
        "komplett": w.komplett.strftime("%d.%m.%Y") if w.komplett else "",
        "entnehmen": w.entnehmen,
        "lagerort": z.o.lagerort,
    }
    if isinstance(z, TeilZ):
        d["vorhanden"] = rechnen.zahl_text(z.o.vorhanden) if z.o.vorhanden is not None else ""
        d["version"] = z.o.version
    return d

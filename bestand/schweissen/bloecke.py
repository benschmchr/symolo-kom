from dataclasses import dataclass, field

from ..models import (
    Auftrag,
    Schweisszeile,
)
from .hilfen import OHNE_BG
from .mitarbeiter import mitarbeiter_liste


# ---------- Blöcke für die Anzeige ----------
@dataclass
class Gruppe:
    bg: Schweisszeile
    teile: list = field(default_factory=list)

    @property
    def html_id(self):
        return f"g{self.bg.id}"


@dataclass
class Block:
    """Ein AB mit allen Zeilen, oder ein Einzelblock (BG + Teile, AB noch teils in der Bestandsliste)."""

    sammlung = False  # Vorlagen: ganzer AB (kein Sammelblock)
    ab: Schweisszeile | None
    ohne: list = field(default_factory=list)
    bgs: list = field(default_factory=list)
    offen: bool = False
    bgs_offen: bool = False
    zeigen: bool = True

    @property
    def einzeln(self):
        return self.ab is None

    @property
    def kopf(self):
        return self.ab or self.bgs[0].bg

    @property
    def schluessel(self):
        return f"s{self.kopf.id}"

    @property
    def zeilen(self):
        if self.ab:
            yield self.ab
        yield from self.ohne
        for g in self.bgs:
            yield g.bg
            yield from g.teile

    @property
    def hat_unter(self):
        return any(z.zeigen for z in self.zeilen if z is not self.kopf)


@dataclass
class Sammlung:
    """Ben, 15.10.: Die Einzelblöcke eines AB (Baugruppen im Schweißen, der Rest noch in der Bestandsliste) stehen
    gemeinsam unter der AB-Überschrift. Die Baugruppen im Kommissionierlager stehen als rote Hinweiskacheln dabei."""

    ab_schluessel: str
    bloecke: list
    kom_bgs: list = field(default_factory=list)  # Namen der Baugruppen, die noch in der Bestandsliste stehen
    auftrag_id: int | None = None
    offen: bool = True  # Ben, 15.10.: die Überschrift klappt alle Baugruppen-Kacheln darunter auf und zu
    sammlung = True

    @property
    def zu(self):
        return not self.offen

    @property
    def kopf(self):
        return self.bloecke[0].kopf

    @property
    def schluessel(self):
        return f"sa{self.kopf.id}"

    @property
    def anzeige(self):
        return self.kopf.anzeige.rsplit("_BG", 1)[0]

    @property
    def benennung(self):
        return (self.kopf.kopf or {}).get("verkaufsartikel", "")

    @property
    def kunde(self):
        return (self.kopf.kopf or {}).get("kunde", "")


def sammeln(bl: list[Block]) -> list:
    """Einzelblöcke desselben AB zu einer Sammlung (an der Stelle des ersten); ganze ABs bleiben Blöcke."""
    ergebnis, sammlungen = [], {}
    for b in bl:
        if not b.einzeln:
            ergebnis.append(b)
            continue
        s = sammlungen.get(b.kopf.ab_schluessel)
        if s is None:
            s = sammlungen[b.kopf.ab_schluessel] = Sammlung(b.kopf.ab_schluessel, [])
            ergebnis.append(s)
        s.bloecke.append(b)
    if sammlungen:
        for a in Auftrag.objects.filter(ab_schluessel__in=list(sammlungen)).prefetch_related("baugruppen"):
            sammlungen[a.ab_schluessel].auftrag_id = a.id
            sammlungen[a.ab_schluessel].kom_bgs = [g.name for g in a.baugruppen.all()]
    return ergebnis


def im_schweissen(schluessel) -> dict:
    """Je AB-Schlüssel die Baugruppen, die einzeln im Schweißen liegen (für die roten Kacheln in der Bestandsliste)."""
    ergebnis = {}
    for z in Schweisszeile.objects.filter(ebene="BG", anzeige__contains="_BG", ab_schluessel__in=list(schluessel)):
        ergebnis.setdefault(z.ab_schluessel, []).append(z)
    return ergebnis


def bloecke(zeilen) -> list[Block]:
    """Zeilen (in Reihenfolge nr) zu Blöcken: AB-Zeile beginnt einen Block; eine BG mit anderer Anzeige (AB…_BGnnn)
    oder ohne AB-Zeile davor ist ein Einzelblock."""
    ergebnis, akt = [], None
    for z in zeilen:
        if z.ebene == "AB":
            akt = Block(ab=z)
            ergebnis.append(akt)
        elif z.ebene == "BG":
            if (
                akt is not None
                and akt.ab is not None
                and akt.ab.ab_schluessel == z.ab_schluessel
                and z.anzeige == akt.ab.anzeige
            ):
                akt.bgs.append(Gruppe(z))
            else:
                akt = Block(ab=None, bgs=[Gruppe(z)])
                ergebnis.append(akt)
        elif akt is not None:  # Teil
            if z.baugruppe == OHNE_BG and akt.ab is not None and not akt.bgs:
                akt.ohne.append(z)
            elif akt.bgs:
                akt.bgs[-1].teile.append(z)
            else:
                akt.ohne.append(z)
    return ergebnis


def _treffer(q, *texte) -> bool:
    return any(q in (t or "").casefold() for t in texte)


def suchen(bl: list[Block], begriff: str) -> int:
    """R-W10: Teilwort in AB/Anzeige (→ ganzer Block), Zeichnungsnummer, Benennung, LK Nummer, Mitarbeiter, Arbeitsplatz
    (BG → mit allen Teilen, Teil → mit BG- und AB-Kopf). Setzt .zeigen; liefert die Zahl der Treffer."""
    q = begriff.strip().casefold()
    treffer = 0
    for b in bl:
        for z in b.zeilen:
            z.zeigen = False
        b.zeigen = False
        if _treffer(q, b.kopf.anzeige, b.kopf.ab_nr):
            for z in b.zeilen:
                z.zeigen = True
            b.zeigen = True
            treffer += 1
            continue

        def passt(z):
            return _treffer(q, z.zeichnungsnummer, z.benennung, z.lk_nummer, z.m, z.p)

        if b.ab and passt(b.ab):
            for z in b.zeilen:
                z.zeigen = True
            b.zeigen = True
            treffer += 1
            continue
        for t in b.ohne:
            if passt(t):
                t.zeigen = b.zeigen = True
                if b.ab:
                    b.ab.zeigen = True
                treffer += 1
        for g in b.bgs:
            if passt(g.bg):
                g.bg.zeigen = b.zeigen = True
                for t in g.teile:
                    t.zeigen = True
                if b.ab:
                    b.ab.zeigen = True
                treffer += 1
            for t in g.teile:
                if passt(t):
                    t.zeigen = g.bg.zeigen = b.zeigen = True
                    if b.ab:
                        b.ab.zeigen = True
                    treffer += 1
    return treffer


ANZEIGEN = [("alles", "Alles"), ("ab", "ABs"), ("bg", "BGs")]


def filtern(bl: list[Block], anzeige: str) -> None:
    """R-W10 Anzeige (Ben, 14.10.): „ABs“ und „BGs“ zeigen alle Zeilen, nur zugeklappt (ABs: alles zu; BGs: ABs auf,
    Baugruppen zu), damit man darunter aufklappen kann. „Alles“ zeigt alles."""
    for b in bl:
        b.zeigen = True
        for z in b.zeilen:
            z.zeigen = True


SORTIERUNGEN = [
    ("lt_auf", "Liefertermin aufsteigend"),
    ("lt_ab", "Liefertermin absteigend"),
    ("ab_auf", "AB aufsteigend"),
    ("ab_ab", "AB absteigend"),
]


def block_filtern(bl: list[Block], mitarbeiter: str = "", platz: str = "") -> list[Block]:
    """Ben, 14.10.: nur Blöcke, in denen dieser Mitarbeiter / dieser Arbeitsplatz vorkommt."""

    def passt(b):
        zs = list(b.zeilen)
        if mitarbeiter and not any(
            mitarbeiter.casefold() in (n.casefold() for n in mitarbeiter_liste(z.m)) for z in zs
        ):
            return False
        if platz and not any((z.p or "").casefold() == platz.casefold() for z in zs):
            return False
        return True

    return [b for b in bl if passt(b)]


def block_sortieren(bl: list[Block], wie: str) -> list[Block]:
    """Liefertermin (Stahlbau) oder AB-Nummer; Blöcke ohne Termin stehen immer hinten."""
    if wie.startswith("ab_"):
        return sorted(bl, key=lambda b: (b.kopf.ab_nr or "").casefold(), reverse=wie == "ab_ab")
    mit = sorted(
        (b for b in bl if b.kopf.lt), key=lambda b: (b.kopf.lt, (b.kopf.ab_nr or "").casefold()), reverse=wie == "lt_ab"
    )
    return mit + [b for b in bl if not b.kopf.lt]

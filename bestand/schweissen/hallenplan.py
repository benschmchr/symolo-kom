from dataclasses import dataclass

from django.db import transaction

from ..models import (
    Arbeitsplatz,
    Schweisszeile,
)
from .abgleich import lesen
from .hilfen import VERSCHIEDEN, SchweissenFehler, _gleich, bg_nummer
from .mitarbeiter import setzen


# ---------- R-AP1 bis R-AP5 Hallenplan ----------
@dataclass
class Eintrag:
    name: str  # „AB2515204“ oder „AB2515204_BG100“
    platz: str  # Name aus der Platzliste oder wie gespeichert (leer = nicht einsortiert)
    mitarbeiter: str
    ganz: bool = True  # Eintrag steht für den ganzen AB (sonst für eine BG)
    komplett: bool = False  # der AB liegt vollständig im Schweißen (AB-Zeile da), nur dann aufsplitten/zusammenführen
    bgs: int = 0  # Zahl der BGs des AB

    @property
    def anzeige(self):
        return f"{self.name} · {self.mitarbeiter}" if self.mitarbeiter else self.name

    @property
    def ab(self):
        """Der AB hinter dem Eintrag („AB2515204_BG100“ → „AB2515204“), zum Suchen im Schweißen."""
        i = self.name.upper().find("_BG")
        return self.name if i < 0 else self.name[:i]


def _rein(x) -> str:
    x = (x or "").strip() if isinstance(x, str) else ""
    return "" if x == VERSCHIEDEN else x


def eintraege(zeilen=None) -> list[Eintrag]:
    """R-AP3 (Formel AP): je AB bzw. BG im Schweißen ein Eintrag mit Platz und Mitarbeiter.
    - zusammengefasster AB, alle BGs am selben Platz (auch keinem) → ein Eintrag „AB…“;
    - BGs an verschiedenen Plätzen → jede BG einzeln als „AB…_BGnnn“; AB ohne BG → der AB selbst;
    - Einzelblöcke „AB…_BGnnn“ → immer einzeln.
    Platz einer BG = eigener, sonst der des AB; Mitarbeiter ebenso; „(verschieden)“ zählt als leer."""
    zeilen = lesen() if zeilen is None else zeilen
    schl = lambda s: (s or "").casefold()  # noqa: E731  Excel vergleicht ohne Groß-/Kleinschreibung
    ab_platz, ab_mit, nbg, geteilt = {}, {}, {}, set()
    for z in zeilen:
        if z.ebene == "AB":
            ab_platz.setdefault(schl(z.ab_nr), _rein(z.p))
            ab_mit.setdefault(schl(z.ab_nr), _rein(z.m))
            if z.ap_geteilt:
                geteilt.add(schl(z.ab_nr))
        elif z.ebene == "BG":
            nbg[schl(z.ab_nr)] = nbg.get(schl(z.ab_nr), 0) + 1
    roh = []
    for z in zeilen:
        if z.ebene == "BG" or (z.ebene == "AB" and not nbg.get(schl(z.ab_nr))):
            xp, xm = ab_platz.get(schl(z.ab_nr), ""), ab_mit.get(schl(z.ab_nr), "")
            roh.append(
                {
                    "en": z.ab_nr,
                    "ed": z.anzeige,
                    "enr": bg_nummer(z.baugruppe),
                    "eeb": z.ebene,
                    "ep": _rein(z.p) or xp,
                    "em": _rein(z.m) or xm,
                    "xm": xm,
                }
            )
    kombis = {}
    for r in roh:
        kombis.setdefault(schl(r["en"]), set()).add(schl(r["ep"]))
    aus, gesehen = [], set()
    for r in roh:
        einz = "_bg" in r["ed"].casefold()
        ganz = (len(kombis[schl(r["en"])]) == 1 and not einz and schl(r["en"]) not in geteilt) or r["eeb"] == "AB"
        name = r["en"] if ganz else (r["ed"] if einz else f"{r['en']}_BG{r['enr']}")
        mit = r["xm"] if ganz and r["eeb"] != "AB" else r["em"]
        schluessel = (schl(name), schl(r["ep"]))
        if schluessel in gesehen:
            continue
        gesehen.add(schluessel)
        aus.append(Eintrag(name, r["ep"], mit, ganz, schl(r["en"]) in ab_platz, nbg.get(schl(r["en"]), 0)))
    return sorted(aus, key=lambda e: e.name.casefold())


def hallenplan(zeilen=None) -> dict:
    """R-AP2 bis R-AP4: die Plätze mit ihren Einträgen und die drei Listen unter dem Plan."""
    plaetze = list(Arbeitsplatz.objects.order_by("reihenfolge"))
    alle = eintraege(zeilen)
    je_platz = {p.id: [] for p in plaetze}
    nicht, ungueltig, einsortiert = [], [], []
    for e in alle:
        if not e.platz:
            nicht.append(e)
            continue
        p = next((p for p in plaetze if p.name.casefold() == e.platz.casefold()), None)  # COUNTIF: exakt
        if p is None:
            ungueltig.append(e)
        else:
            je_platz[p.id].append(e)
            einsortiert.append((e, p))
    return {
        "plaetze": [{"p": p, "eintraege": je_platz[p.id]} for p in plaetze],
        "nicht": nicht,
        "ungueltig": ungueltig,
        "einsortiert": einsortiert,
        "anzahl": len(alle),
    }


def _ziel(eintrag: str) -> Schweisszeile:
    """Die AB-Zeile („AB…“) bzw. BG-Zeile („AB…_BGnnn“) hinter einem Eintrag des Hallenplans."""
    p = eintrag.upper().find("_BG")
    ab_nr, bg_nr = (eintrag[:p], eintrag[p + 3 :]) if p >= 0 else (eintrag, "")
    ziel = None
    for z in Schweisszeile.objects.order_by("nr", "id"):
        if not _gleich(z.ab_nr, ab_nr):
            continue
        if not bg_nr and z.ebene == "AB":
            ziel = z
            break
        if bg_nr and z.ebene == "BG" and _gleich(bg_nummer(z.baugruppe), bg_nr):
            ziel = z
            break
    if ziel is None:
        raise SchweissenFehler(f"{eintrag} wurde im Bereich Schweißen nicht gefunden.")
    return ziel


@transaction.atomic
def platz_setzen(eintrag: str, platz: str):
    """R-AP5 (ApSetzen): Arbeitsplatz eines AB („AB…“) bzw. einer BG („AB…_BGnnn“) im Schweißen eintragen; die Vererbung
    gibt ihn an BGs und Teile weiter. Liefert (Zeile, alt, neu)."""
    return setzen(_ziel(eintrag).id, "arbeitsplatz", platz)


@transaction.atomic
def mitarbeiter_setzen(eintrag: str, wert: str):
    """Rechtsklick im Hallenplan: Mitarbeiter eines Eintrags ändern (Auswahl aus der Liste). Liefert (Zeile, alt, neu)."""
    return setzen(_ziel(eintrag).id, "mitarbeiter", wert)


def _ab_zeile(eintrag: str) -> Schweisszeile:
    """Die AB-Zeile zu einem Eintrag; nur vorhanden, wenn der ganze AB im Schweißen liegt."""
    ziel = _ziel(eintrag)
    ab = (
        Schweisszeile.objects.select_for_update()
        .filter(ab_schluessel=ziel.ab_schluessel, ebene="AB")
        .order_by("nr")
        .first()
    )
    if ab is None or ziel.anzeige != ab.anzeige:
        raise SchweissenFehler(
            "Aufsplitten und Zusammenführen geht nur, wenn alle Baugruppen des AB im Schweißen liegen. "
            "Dieser AB ist noch zwischen Bestandsliste und Schweißen aufgeteilt."
        )
    return ab


@transaction.atomic
def ap_teilen(eintrag: str) -> Schweisszeile:
    """Hallenplan: der AB wird in seine Baugruppen aufgesplittet (je BG ein Eintrag, alle am bisherigen Platz)."""
    ab = _ab_zeile(eintrag)
    if Schweisszeile.objects.filter(ab_schluessel=ab.ab_schluessel, ebene="BG").count() < 2:  # Ben, 15.10.
        raise SchweissenFehler("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).")
    ab.ap_geteilt = True
    ab.save(update_fields=["ap_geteilt"])
    return ab


@transaction.atomic
def ap_zusammenfuehren(eintrag: str):
    """Hallenplan, Rechtsklick auf eine Baugruppe: der ganze AB kommt dorthin, wo diese Baugruppe liegt.
    Liefert (AB-Zeile, Platz, alt, neu)."""
    ab = _ab_zeile(eintrag)
    bg = _ziel(eintrag)
    platz = next((e.platz for e in eintraege() if e.name.casefold() == eintrag.casefold()), "")
    if bg.ebene != "BG":
        raise SchweissenFehler("Dieser Eintrag ist schon der ganze AB.")
    ab.ap_geteilt = False
    ab.save(update_fields=["ap_geteilt"])
    z, alt, neu = setzen(ab.id, "arbeitsplatz", platz)
    return z, platz, alt, neu

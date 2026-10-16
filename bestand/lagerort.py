"""Lagerort und Regal (R-L1 bis R-L5, R-R1 bis R-R5).

Nachbau von LagerortUebernehmen, ABAbgleichen, LagerortVonTeilen und LagerortSetzen (modBestand.tpl) sowie der
Regal-Formeln LAGER und OFFEN (dashformel.py). Abweichungen von Excel (Prüfung Phase 0/1, von Ben bestätigt):
- X1: ABs ohne Baugruppe erscheinen im Regal bzw. unter „Nicht einsortiert“ (Excel lässt sie weg).
- X2: R3-Kurzformen („R3S“, „SPERR“ …) werden beim Speichern zu „R3“, damit der Abgleich AB ↔ BG sie als gleich sieht.
"""

from dataclasses import dataclass

from django.db import transaction

from . import rechnen
from .models import Auftrag, Baugruppe, Teil

# R-L4: gültige Plätze, Etage 6 oben … 1 unten, links L, rechts R
ETAGEN = [6, 5, 4, 3, 2, 1]
PLAETZE = [f"{s}{e}" for e in ETAGEN for s in "LR"]
R3_ALIASE = {"R3S", "R3-S", "R3V", "R3-V", "SPERRLAGER", "SPERR", "VERMESSEN"}
R3_NAME = "Sperrlager / Teile zum Vermessen"
LEEREN = {"", "0", "-"}  # R-L2: Eingabe 0 oder - leert den Platz
MAX_LAENGE = 40


class PlatzFehler(ValueError):
    pass


def _kern(text) -> str:
    """Vergleichsform: Großbuchstaben, ohne Leerzeichen (R-L4: Groß-/Kleinschreibung und Leerzeichen egal)."""
    return "".join((text or "").split()).upper()


def platz_norm(text) -> str:
    """Platz für Regal und Abgleich: gültiger Platz oder R3-Kurzform → „L2“, „R3“; sonst der Text in Großbuchstaben."""
    k = _kern(text)
    if k in R3_ALIASE:
        return "R3"
    if k in PLAETZE:
        return k
    return " ".join((text or "").split()).upper()


def ist_gueltig(text) -> bool:
    return platz_norm(text) in PLAETZE


def eingabe(text) -> str:
    """Was gespeichert wird: leer (bei „“, „0“, „-“), ein gültiger Platz („l 2“ → „L2“, „SPERR“ → „R3“, X2)
    oder der freie Text ohne Leerzeichen vorn und hinten."""
    t = " ".join((text or "").split())
    if t in LEEREN:
        return ""
    if len(t) > MAX_LAENGE:
        raise PlatzFehler(f"Der Lagerort ist zu lang (höchstens {MAX_LAENGE} Zeichen).")
    return platz_norm(t) if ist_gueltig(t) else t


# ---------- Eintragen (R-L1 bis R-L3) ----------
@transaction.atomic
def setze_ab(auftrag: Auftrag, text) -> str:
    """R-L2: Platz am AB → alle BGs und alle Teile des AB (auch „(ohne BG)“) bekommen ihn; leer leert alle.
    Ein aufgesplitteter AB (Regal) bleibt aufgesplittet, bis er zusammengeführt wird."""
    p = eingabe(text)
    Auftrag.objects.filter(id=auftrag.id).update(lagerort=p)
    Baugruppe.objects.filter(auftrag_id=auftrag.id).update(lagerort=p)
    Teil.objects.filter(auftrag_id=auftrag.id).update(lagerort=p)
    auftrag.lagerort = p
    return p


@transaction.atomic
def setze_bg(bg: Baugruppe, text) -> str:
    """R-L2: Platz an der BG → alle Teile der BG; danach R-L3 (AB an seine BGs angleichen)."""
    p = eingabe(text)
    Baugruppe.objects.filter(id=bg.id).update(lagerort=p)
    Teil.objects.filter(baugruppe_id=bg.id).update(lagerort=p)
    bg.lagerort = p
    if not Auftrag.objects.filter(id=bg.auftrag_id, regal_geteilt=True).exists():
        abgleichen(bg.auftrag_id)  # Ben, 14.10.: ein aufgesplitteter AB wird nie von selbst zusammengeführt
    return p


def teilen(auftrag: Auftrag) -> None:
    """Regal: der AB wird in seine Baugruppen aufgesplittet (je Baugruppe ein Eintrag, alle am bisherigen Platz)."""
    if auftrag.baugruppen.count() < 2:  # Ben, 15.10.: bei nur einer Baugruppe gibt es nichts aufzusplitten
        raise PlatzFehler("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).")
    p = platz_norm(auftrag.lagerort) if auftrag.lagerort.strip() else ""
    if p:  # jede Baugruppe bekommt ihren Platz ausdrücklich (auch die ohne eigenen)
        for b in auftrag.baugruppen.all():
            if not b.lagerort.strip():
                Baugruppe.objects.filter(id=b.id).update(lagerort=p)
                Teil.objects.filter(baugruppe_id=b.id).update(lagerort=p)
    Auftrag.objects.filter(id=auftrag.id).update(regal_geteilt=True)
    auftrag.regal_geteilt = True


def alle_bgs_gleich(auftrag_id: int) -> bool:
    """Liegen alle Baugruppen (mindestens zwei) des AB am selben Platz (auch alle auf „Nicht einsortiert“)? (für die Rückfrage im Regal)"""
    plaetze = {
        platz_norm(b.lagerort) if b.lagerort.strip() else "" for b in Baugruppe.objects.filter(auftrag_id=auftrag_id)
    }
    return Baugruppe.objects.filter(auftrag_id=auftrag_id).count() > 1 and len(plaetze) == 1


@transaction.atomic
def zusammenfuehren(bg: Baugruppe) -> str:
    """Regal: der ganze AB kommt dorthin, wo die gewählte Baugruppe liegt (leer = nicht einsortiert), als ein Eintrag."""
    a = Auftrag.objects.select_for_update().get(id=bg.auftrag_id)
    if bg.lagerort.strip():
        p = platz_norm(bg.lagerort)
    else:  # ohne Platz: aufgesplittet = „Nicht einsortiert“, sonst der Platz des AB
        p = "" if a.regal_geteilt or not a.lagerort.strip() else platz_norm(a.lagerort)
    setze_ab(a, p)
    Auftrag.objects.filter(id=a.id).update(regal_geteilt=False)
    return p


def abgleichen(auftrag_id: int) -> bool:
    """R-L3 (ABAbgleichen):
    - alle BGs haben denselben Platz, keine ist leer → AB bekommt ihn;
    - ein Platz, Rest leer, AB leer oder gleich → nichts ändern;
    - sonst (verschiedene Plätze, oder ein Platz, Rest leer und AB hat einen anderen, X3) → BGs ohne Platz
      bekommen den bisherigen Platz des AB (mit ihren Teilen), danach wird der AB leer.
    Teile „(ohne BG)“ bleiben wie in Excel unberührt. Liefert True, wenn etwas geändert wurde."""
    a = Auftrag.objects.select_for_update().get(id=auftrag_id)
    bgs = list(Baugruppe.objects.select_for_update().filter(auftrag_id=auftrag_id).order_by("zeile"))
    belegt = [platz_norm(b.lagerort) for b in bgs if b.lagerort.strip()]
    leere = [b for b in bgs if not b.lagerort.strip()]
    if not belegt:
        return False
    erster = belegt[0]
    verschieden = any(p != erster for p in belegt)
    alt = platz_norm(a.lagerort) if a.lagerort.strip() else ""
    if not verschieden and not leere:  # alle gleich
        if alt != erster:
            a.lagerort = erster
            a.save(update_fields=["lagerort"])
            return True
        return False
    if not verschieden and alt in ("", erster):  # ein Platz, Rest offen
        return False
    if not alt:
        return False
    for b in leere:  # verschieden: Rest bekommt den AB-Platz
        Baugruppe.objects.filter(id=b.id).update(lagerort=a.lagerort)
        Teil.objects.filter(baugruppe_id=b.id).update(lagerort=a.lagerort)
    a.lagerort = ""
    a.save(update_fields=["lagerort"])
    return True


@transaction.atomic
def von_teilen(auftrag_id: int) -> bool:
    """R-L5 (LagerortVonTeilen, Übergang Altbestand, einmal bei der Datenübernahme): BG ohne Platz bekommt den Platz
    ihrer Teile, wenn alle Teile mit Platz denselben haben; danach R-L3."""
    geaendert = False
    for b in Baugruppe.objects.select_for_update().filter(auftrag_id=auftrag_id):
        if b.lagerort.strip():
            continue
        plaetze = {_kern(t.lagerort): t.lagerort.strip() for t in b.teile.all() if t.lagerort.strip()}
        if len(plaetze) == 1:
            b.lagerort = eingabe(next(iter(plaetze.values())))
            b.save(update_fields=["lagerort"])
            geaendert = True
    return abgleichen(auftrag_id) or geaendert


# ---------- Regal (R-R1 bis R-R4) ----------
@dataclass
class Eintrag:
    name: str  # „AB2515204“ oder „AB2515204_BG100“ (R-D5)
    platz: str  # normiert (R-L4), leer bei „Nicht einsortiert“
    status: str
    ab_id: int
    bg_id: int | None = None
    ab_schluessel: str = ""
    ab_anzeige: str = ""
    bgs: int = 0  # Zahl der Baugruppen des AB (für „AB in Baugruppen aufsplitten“)

    @property
    def css(self) -> str:
        return {rechnen.KOMPLETT: "komplett", rechnen.TEILWEISE: "teilweise"}.get(self.status, "offen")

    @property
    def gueltig(self) -> bool:
        return self.platz in PLAETZE


def _sortiert(liste):
    return sorted(liste, key=lambda e: (e.name.casefold(), e.platz))


def regal(abs_) -> dict:
    """Einträge je Platz (R-R1) und die Listen unter dem Regal (R-R3, R-R4). abs_ = ansicht.baum().

    Je AB: Platz einer BG = eigener Platz, sonst der des AB. Haben alle BGs denselben Platz und ist keine ohne Platz,
    gibt es einen Eintrag „AB…“ mit dem AB-Status, sonst je BG und Platz einen Eintrag „AB…_BGnnn“ mit dem BG-Status.
    X1: ein AB ohne Baugruppen steht mit seinem eigenen Platz (oder unter „Nicht einsortiert“) da.
    """
    einsortiert, nicht = [], []
    for a in abs_:
        ab = a.o
        ab_platz = platz_norm(ab.lagerort) if ab.lagerort.strip() else ""
        basis = {"ab_id": ab.id, "ab_schluessel": ab.ab_schluessel, "ab_anzeige": ab.ab_anzeige, "bgs": len(a.bgs)}
        geteilt = ab.regal_geteilt and bool(a.bgs)  # Ben, 14.10.: AB in Baugruppen aufgesplittet
        if not a.bgs:  # X1
            ziel = einsortiert if ab_platz else nicht
            ziel.append(Eintrag(ab.ab_anzeige, ab_platz, a.w.status, **basis))
            continue
        je_bg = [
            (b, platz_norm(b.o.lagerort) if b.o.lagerort.strip() else ("" if geteilt else ab_platz)) for b in a.bgs
        ]
        mit = {p for _, p in je_bg if p}
        ohne = [b for b, p in je_bg if not p]
        if not mit and not geteilt:  # R-R4: keine BG hat einen Platz
            nicht.append(Eintrag(ab.ab_anzeige, "", a.w.status, **basis))
            continue
        if len(mit) == 1 and not ohne and not geteilt:  # R-R1: ein Eintrag für den AB
            einsortiert.append(Eintrag(ab.ab_anzeige, mit.pop(), a.w.status, **basis))
            continue
        gesehen = set()
        for b, p in je_bg:
            name = f"{ab.ab_anzeige}_BG{b.o.kurz}"
            if p and (name, p) not in gesehen:  # je Name und Platz einmal (UNIQUE)
                gesehen.add((name, p))
                einsortiert.append(Eintrag(name, p, b.w.status, bg_id=b.o.id, **basis))
            elif not p:
                nicht.append(Eintrag(name, "", b.w.status, bg_id=b.o.id, **basis))
    einsortiert, nicht = _sortiert(einsortiert), _sortiert(nicht)
    faecher = {p: [e for e in einsortiert if e.platz == p] for p in PLAETZE}
    return {
        "etagen": [{"nr": n, "L": faecher[f"L{n}"], "R": faecher[f"R{n}"]} for n in ETAGEN],
        "faecher": faecher,
        "einsortiert": einsortiert,
        "nicht": nicht,
        "ungueltig": [e for e in einsortiert if not e.gueltig],
    }

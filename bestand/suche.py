"""Suche von überall (R-SU1 bis R-SU3): ein Suchfeld in der Kopfleiste, das ABs und Baugruppen nach Nummer und Name
in Bestandsliste und Schweißen findet (Ben, 15.10.). Gesucht wird in AB-Nummer, AB-Benennung, Baugruppen-Name und
-Nummer und, nur bei vollständiger Eingabe, in Zeichnungsnummern; Kunde, Lagerort, Fortschritt, Arbeitsplatz und Mitarbeiter werden nur angezeigt.

Ein AB, der ungeteilt in einem Bereich liegt, ist ein Vorschlag („AB…“). Ist er aufgesplittet (Regal bzw. Arbeitsplätze:
dieselben Einträge wie dort), stehen seine Baugruppen einzeln da („AB…_BGnnn“). Nur Lesen; Treffer sind Links."""

from dataclasses import dataclass, field
from urllib.parse import urlencode

from django.db.models import Q
from django.urls import reverse

from kern.rollen import hat_rolle

from . import ansicht, lagerort
from .models import Auftrag, Baugruppe, Teil
from .schweissen.abgleich import lesen as sw_lesen
from .schweissen.bloecke import im_schweissen
from .schweissen.hallenplan import eintraege as sw_eintraege
from .schweissen.hilfen import bg_nummer

MIN_ZEICHEN = 2  # R-SU1: kürzere Eingaben suchen nichts
JE_BEREICH = 8  # R-SU2: so viele Treffer je Bereich in der Kurzliste


@dataclass
class Treffer:
    titel: str  # „AB2515204“ oder „AB2515204_BG100“
    benennung: str  # Name des AB bzw. der Baugruppe
    infos: list  # [(Beschriftung, Wert)]
    url: str

    def __post_init__(self):
        self.infos = [(n, w) for n, w in self.infos if w]  # leere Angaben weglassen


@dataclass
class Gruppe:
    schluessel: str
    titel: str
    treffer: list = field(default_factory=list)
    gesamt: int = 0
    alle_url: str = ""

    @property
    def mehr(self):
        return self.gesamt - len(self.treffer)


def bereinigen(q) -> str:
    return " ".join((q or "").split())


def _url(name, **kw):
    return reverse(name) + ("?" + urlencode(kw) if kw else "")


def _passt(q, *texte) -> bool:
    return any(q in (t or "").casefold() for t in texte)


def _prozent(w) -> str:
    return f"{round(w.prozent * 100)} %"


def _bestand(q):
    """AB-Einträge wie im Regal (R-R1): ungeteilter AB = ein Eintrag, aufgesplitteter AB = je Baugruppe einer."""
    ab_text = Q(ab_anzeige__icontains=q) | Q(haupt_ab__icontains=q) | Q(verkaufsartikel__icontains=q)
    bg_text = Q(name__icontains=q) | Q(kurz__icontains=q)
    ids = set(Auftrag.objects.filter(bereich="bestand").filter(ab_text).values_list("id", flat=True))
    ids |= set(
        Baugruppe.objects.filter(auftrag__bereich="bestand").filter(bg_text).values_list("auftrag_id", flat=True)
    )
    # Zeichnungsnummer nur bei vollständiger Eingabe (Ben, 15.10.): dann der AB bzw. die Baugruppe, in der sie steht
    zn = [
        (a, b)
        for a, b in Teil.objects.filter(auftrag__bereich="bestand", zeichnungsnummer__iexact=q).values_list(
            "auftrag_id", "baugruppe_id"
        )
    ]
    zn += list(
        Baugruppe.objects.filter(auftrag__bereich="bestand", zeichnungsnummer__iexact=q).values_list("auftrag_id", "id")
    )
    ids |= {a for a, _ in zn}
    if not ids:
        return [], ""
    abs_ = ansicht.baum(Auftrag.objects.filter(id__in=ids))
    je_id = {a.o.id: a for a in abs_}
    e = lagerort.regal(abs_)
    eintraege = e["einsortiert"] + e["nicht"]
    # Liegt eine Baugruppe im Schweißen, ist der AB geteilt (Ben, 15.10.): die übrigen stehen einzeln da
    geteilt = set(im_schweissen(a.o.ab_schluessel for a in abs_))
    eintraege = [x for x in eintraege if je_id[x.ab_id].o.ab_schluessel not in geteilt]
    for a in abs_:
        if a.o.ab_schluessel in geteilt and a.bgs:
            ab_platz = lagerort.platz_norm(a.o.lagerort) if a.o.lagerort.strip() else ""
            for b in a.bgs:
                platz = lagerort.platz_norm(b.o.lagerort) if b.o.lagerort.strip() else ab_platz
                eintraege.append(
                    lagerort.Eintrag(f"{a.o.ab_anzeige}_BG{b.o.kurz}", platz, b.w.status, a.o.id, bg_id=b.o.id)
                )
    treffer = []
    for eintrag in eintraege:
        a = je_id[eintrag.ab_id]
        ab_passt = _passt(q, a.o.ab_anzeige, a.o.haupt_ab, a.o.verkaufsartikel)
        if eintrag.bg_id:  # aufgesplittet: die Baugruppe selbst
            b = next(b for b in a.bgs if b.o.id == eintrag.bg_id)
            if not (ab_passt or _passt(q, b.o.name, b.o.kurz, eintrag.name) or (a.o.id, b.o.id) in zn):
                continue
            benennung, w = b.o.name, b.w
        else:  # ganzer AB; auch gefunden über den Namen einer seiner Baugruppen
            if not (ab_passt or any(_passt(q, b.o.name, b.o.kurz) for b in a.bgs) or any(x == a.o.id for x, _ in zn)):
                continue
            benennung, w = a.o.verkaufsartikel, a.w
        infos = [("Kunde", a.o.kunde), ("Lagerort", eintrag.platz or "nicht einsortiert"), ("Fortschritt", _prozent(w))]
        treffer.append(Treffer(eintrag.name, benennung, infos, _url("bestandsliste", ab=a.o.id)))
    return treffer, _url("bestandsliste", q=q)


def _schweissen(q):
    """Einträge wie in den Arbeitsplätzen (R-AP3)."""
    zeilen = sw_lesen()
    ab_zeile, bgs, kunde = {}, {}, {}
    for z in zeilen:
        k = z.ab_nr.casefold()
        if z.ebene == "AB":
            ab_zeile.setdefault(k, z)
        elif z.ebene == "BG":
            bgs.setdefault(k, []).append(z)
        kunde.setdefault(k, (z.kopf or {}).get("kunde", ""))
    anzeigen = {z.anzeige.casefold() for z in zeilen}
    zn = {
        (z.ab_nr.casefold(), bg_nummer(z.baugruppe))
        for z in zeilen
        if z.ebene != "AB" and z.zeichnungsnummer.casefold() == q
    }
    treffer = []
    for e in sw_eintraege(zeilen):
        p = e.name.upper().find("_BG")
        ab_nr, bg_nr = (e.name[:p], e.name[p + 3 :]) if p >= 0 else (e.name, "")
        k = ab_nr.casefold()
        az = ab_zeile.get(k)
        ab_benennung = az.benennung if az else ""
        ab_passt = _passt(q, ab_nr, ab_benennung)
        if bg_nr:  # einzelne Baugruppe
            z = next((z for z in bgs.get(k, []) if bg_nummer(z.baugruppe) == bg_nr), None)
            if not (ab_passt or _passt(q, e.name, bg_nr, z.baugruppe if z else "") or (k, bg_nr) in zn):
                continue
            benennung = z.baugruppe if z else ""
        else:  # ganzer AB; auch gefunden über den Namen einer seiner Baugruppen
            if not (ab_passt or any(_passt(q, z.baugruppe) for z in bgs.get(k, [])) or any(x == k for x, _ in zn)):
                continue
            benennung = ab_benennung
        infos = [
            ("Kunde", kunde.get(k, "")),
            ("Arbeitsplatz", e.platz or "nicht einsortiert"),
            ("Mitarbeiter", e.mitarbeiter),
        ]
        # Einzelblöcke „AB…_BGnnn“ hat die Seite unter diesem Namen, aufgesplittete BGs eines AB-Blocks unter der AB-Nummer
        treffer.append(
            Treffer(e.name, benennung, infos, _url("schweissen", q=e.name if e.name.casefold() in anzeigen else ab_nr))
        )
    return treffer, _url("schweissen", q=q)


# (Schlüssel, Titel, Suchfunktion, nötige Rollen; leer = alle, auch Gäste). Neue Bereiche mit Rollen hier eintragen.
BEREICHE = [
    ("bestand", "Bestandsliste", _bestand, ()),
    ("schweissen", "Schweißen", _schweissen, ()),
]


def suchen(q, user) -> list[Gruppe]:
    """R-SU1/R-SU3: Treffer je Bereich, den die Rolle sehen darf (serverseitig geprüft); leer bei zu kurzer Eingabe."""
    q = bereinigen(q)
    if len(q) < MIN_ZEICHEN:
        return []
    q = q.casefold()
    gruppen = []
    for schluessel, titel, finder, rollen in BEREICHE:
        if rollen and not hat_rolle(user, *rollen):
            continue
        alle, alle_url = finder(q)
        if alle:
            gruppen.append(Gruppe(schluessel, titel, alle[:JE_BEREICH], len(alle), alle_url))
    return gruppen

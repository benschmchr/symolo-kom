from dataclasses import dataclass
from datetime import date

from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .. import ansicht, archiv, rechnen
from ..ab_nummer import ab_schluessel, forecast_schluessel
from ..models import (
    Archivvorgang,
    Archivzeile,
    Auftrag,
    Baugruppe,
    Planungsmarke,
    Schweisszeile,
    Teil,
)
from .abgleich import _ab_ableiten, _werte, abgleich_alle
from .hilfen import HERKUNFT, OHNE_BG, SPALTEN, VERSCHIEDEN, SchweissenFehler, _bg_sortkey, bg_nummer, heute


# ---------- Hilfen zur Bestandsliste ----------
def hat_ab(ab: str) -> bool:
    """R-I10: Liegt der AB (Vergleich nach R-AB3) schon ganz oder teilweise im Bereich Schweißen?"""
    return bool(ab) and Schweisszeile.objects.filter(ab_schluessel=ab_schluessel(ab)).exists()


def _kopf(a: Auftrag) -> dict:
    return {
        "kunde": a.kunde,
        "haupt_ab": a.haupt_ab,
        "verkaufsartikel": a.verkaufsartikel,
        "ersteller": a.ersteller,
        "datum_liste": a.datum_liste,
        "dispoliste": a.dispoliste,
        "quelldatei": a.quelldatei,
        "reihenfolge": a.reihenfolge,
        "forecast_schluessel": a.forecast_schluessel,
    }


def _naechste_nr() -> int:
    return (Schweisszeile.objects.aggregate(m=Max("nr"))["m"] or 0) + 1


# ---------- R-W2 Entnehmen ----------
@dataclass
class Plan:
    """Was beim Entnehmen passiert (für die Sicherheitsfrage und zum Ausführen)."""

    a: ansicht.ABZ
    bg: ansicht.BGZ | None
    mit_ab: bool
    n_bg: int
    n_teil: int

    @property
    def name(self):
        return f"AB {self.a.o.ab_anzeige}" if self.bg is None else f"Baugruppe {self.bg.o.name} ({self.a.o.ab_anzeige})"

    @property
    def frage(self):
        """Sicherheitsfrage wie in Excel."""
        if self.bg is None:
            return (
                f"AB {self.a.o.ab_anzeige} mit {self.n_bg} Baugruppe(n) und {self.n_teil} Teil(en) "
                f"ins Blatt Schweißen verschieben?"
            )
        return f"{self.name} mit {self.n_teil} Teil(en) ins Blatt Schweißen verschieben?"

    @property
    def anzeige(self):
        """Wie die Zeilen im Schweißen heißen: „AB…“ oder „AB…_BGnnn“."""
        if self.bg is None or self.mit_ab:
            return self.a.o.ab_anzeige
        return f"{self.a.o.ab_anzeige}_BG{bg_nummer(self.bg.o.name)}"


def pruefen_entnehmen(auftrag_id: int, bg_id: int | None = None, sperren: bool = False) -> Plan:
    """R-W2: nur ganze ABs oder BGs mit Status Komplett. Wirft SchweissenFehler mit der Meldung wie in Excel."""
    qs = Auftrag.objects.filter(id=auftrag_id, bereich="bestand")
    a = next(iter(ansicht.baum(qs.select_for_update() if sperren else qs)), None)
    if a is None:
        raise SchweissenFehler("Dieser Arbeitsauftrag ist nicht (mehr) in der Bestandsliste.")
    bg = None
    if bg_id is not None:
        bg = next((b for b in a.bgs if b.o.id == bg_id), None)
        if bg is None:
            raise SchweissenFehler("Diese Baugruppe ist nicht (mehr) in der Bestandsliste.")
    ziel = bg or a
    if ziel.w.status != rechnen.KOMPLETT:
        name = f"AB {a.o.ab_anzeige}" if bg is None else f"Baugruppe {bg.o.name} ({a.o.ab_anzeige})"
        raise SchweissenFehler(
            f"Nur ABs und Baugruppen mit Status „Komplett“ können entnommen werden. {name}: {ziel.w.status}"
        )
    if bg is None:
        return Plan(a, None, True, len(a.bgs), len(a.alle_teile))
    return Plan(a, bg, len(a.bgs) == 1 and not a.ohne, 0, len(bg.teile))  # letzte BG: der AB kommt mit (R-W3)


def _zeile(nr, ab: Auftrag, anzeige, ebene, bg_name, o, w, heute_, kopf, **extra) -> Schweisszeile:
    felder = {f: getattr(o, f) for f in SPALTEN if f != "lagerort"}
    return Schweisszeile(
        nr=nr,
        ab_nr=ab.ab_anzeige,
        ab_schluessel=ab.ab_schluessel,
        anzeige=anzeige,
        ebene=ebene,
        baugruppe=bg_name,
        lagerort=o.lagerort,
        status=w.status,
        fortschritt=w.fortschritt,
        eingelagert=w.eingelagert,
        komplett=w.komplett,
        entnommen=heute_,
        kopf=kopf,
        menge_gesamt=o.soll_anzeige,
        **felder,
        **extra,
    )


def _kopieren(p: Plan, nr: int, heute_) -> list[Schweisszeile]:
    """Die Zeilen für das Schweißen in der Reihenfolge der Bestandsliste (Teile ohne BG vorn)."""
    a = p.a
    kopf = _kopf(a.o)
    ab = a.o
    z = []

    def teil(t, bg_name):
        return _zeile(
            nr + len(z),
            ab,
            p.anzeige,
            "Teil",
            bg_name,
            t.o,
            t.w,
            heute_,
            kopf,
            vorhanden=rechnen.zahl_text(t.o.vorhanden) if t.o.vorhanden is not None else "",
        )

    def bgz(b):
        z.append(_zeile(nr + len(z), ab, p.anzeige, "BG", b.o.name, b.o, b.w, heute_, kopf))
        for t in b.teile:
            z.append(teil(t, b.o.name))

    if p.bg is None or p.mit_ab:  # AB-Zeile (R-D2: wie in Excel „Kunde: …“ usw.)
        extra = {
            f: (v + getattr(ab, feld) if getattr(ab, feld) else "") for f, (v, feld) in archiv.KOPF_ETIKETTEN.items()
        }
        z.append(
            Schweisszeile(
                nr=nr,
                ab_nr=ab.ab_anzeige,
                ab_schluessel=ab.ab_schluessel,
                anzeige=p.anzeige,
                ebene="AB",
                zeichnungsnummer=ab.ab_anzeige,
                benennung=ab.verkaufsartikel,
                lagerort=ab.lagerort,
                status=a.w.status,
                fortschritt=a.w.fortschritt,
                eingelagert=a.w.eingelagert,
                komplett=a.w.komplett,
                entnommen=heute_,
                kopf=kopf,
                **extra,
            )
        )
    if p.bg is None:
        for t in a.ohne:
            z.append(teil(t, OHNE_BG))
        for b in a.bgs:
            bgz(b)
    else:
        bgz(p.bg)
    return z


@transaction.atomic
def entnehmen(auftrag_id: int, bg_id: int | None = None, jetzt: date | None = None) -> Plan:
    """R-W2/R-W3: AB oder BG ins Schweißen kopieren, in der Bestandsliste löschen. Die letzte BG nimmt die AB-Zeile mit;
    dann werden alle Zeilen des AB zusammengefasst. Entnommen = heute; Mitarbeiter, Arbeitsplatz, Termine leer."""
    p = pruefen_entnehmen(auftrag_id, bg_id, sperren=True)
    jetzt = jetzt or heute()
    neu = _kopieren(p, _naechste_nr(), jetzt)  # erst kopieren, dann löschen
    Schweisszeile.objects.bulk_create(neu)
    if p.bg is None or p.mit_ab:
        p.a.o.delete()  # AB samt BGs und Teilen (CASCADE)
    else:
        Baugruppe.objects.filter(id=p.bg.o.id).delete()
    if p.bg is None or p.mit_ab:
        zusammenfassen(p.a.o.ab_schluessel)
    abgleich_alle()
    return p


def _gruppen(zeilen):
    """Zeilen eines AB (in Reihenfolge) → (AB-Zeilen, Teile ohne BG, [(BG-Zeile, Teile)])."""
    abz, ohne, bgs = [], [], []
    for z in zeilen:
        if z.ebene == "AB":
            abz.append(z)
        elif z.ebene == "BG":
            bgs.append((z, []))
        elif bgs:
            bgs[-1][1].append(z)
        else:
            ohne.append(z)
    return abz, ohne, bgs


@transaction.atomic
def zusammenfassen(schluessel: str) -> None:
    """R-W3 (SwZusammenfassen): alle Zeilen eines AB unter der AB-Zeile zusammenfassen: AB-Zeile, Teile ohne BG, dann die
    BGs nach Nummer (Teile bleiben hinter ihrer BG); Anzeige wieder „AB…“. Mitarbeiter, Plätze, Termine und das
    Entnommen-Datum jeder Zeile bleiben. Die Zeilen stehen danach am Ende der Liste."""
    zeilen = list(Schweisszeile.objects.select_for_update().filter(ab_schluessel=schluessel).order_by("nr", "id"))
    if not zeilen:
        return
    abz, ohne, bgs = _gruppen(zeilen)
    bgs.sort(key=lambda g: _bg_sortkey(g[0].baugruppe))
    ordnung = abz + ohne + [x for g in bgs for x in [g[0], *g[1]]]
    nr = _naechste_nr()
    for i, z in enumerate(ordnung):
        z.nr = nr + i
        z.anzeige = z.ab_nr
    Schweisszeile.objects.bulk_update(ordnung, ["nr", "anzeige"])


# ---------- R-W8 Archivieren ----------
def pruefen_archivieren(zeile_id: int):
    """Nur ganze ABs (AB-Zeile). Liefert (Zeile, Zahl der Zeilen) oder wirft SchweissenFehler wie in Excel."""
    z = Schweisszeile.objects.filter(id=zeile_id).first()
    if z is None:
        raise SchweissenFehler("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.")
    if z.ebene == "BG" and "_BG" in z.anzeige.upper():
        raise SchweissenFehler(
            "Diese Baugruppe kann erst archiviert werden, wenn der ganze AB im Blatt Schweißen liegt."
        )
    if z.ebene != "AB":
        raise SchweissenFehler("Archiviert werden nur ganze ABs: bitte in der AB-Zeile archivieren.")
    return z, Schweisszeile.objects.filter(ab_schluessel=z.ab_schluessel).count()


@transaction.atomic
def archivieren(zeile_id: int):
    """R-W8: alle Zeilen des AB ins Archiv (R-X2, Herkunft „Archiviert aus Schweißen“), aus dem Schweißen löschen."""
    z, _ = pruefen_archivieren(zeile_id)
    alle = list(Schweisszeile.objects.select_for_update().filter(ab_schluessel=z.ab_schluessel).order_by("nr", "id"))
    ebene, ab, w = [x.ebene for x in alle], [x.ab_nr for x in alle], _werte(alle)
    _ab_ableiten(ebene, ab, w)
    jetzt = timezone.now()
    k = z.kopf or {}
    ab_zeile = next(x for x in alle if x.ebene == "AB")
    v = Archivvorgang.objects.create(
        ab_anzeige=ab_zeile.ab_nr,
        ab_schluessel=ab_zeile.ab_schluessel,
        kunde=k.get("kunde", ""),
        verkaufsartikel=k.get("verkaufsartikel", ""),
        geloescht_am=jetzt,
        herkunft=HERKUNFT,
        status=ab_zeile.status,
        reihenfolge=k.get("reihenfolge"),
        quelldatei=k.get("quelldatei", ""),
    )
    zeilen = []
    for nr, (x, wx) in enumerate(zip(alle, w), start=1):
        zeilen.append(
            Archivzeile(
                vorgang=v,
                nr=nr,
                ab=x.ab_nr,
                zeichnungsnummer=x.zeichnungsnummer,
                benennung=x.benennung,
                menge_bg=x.menge_bg,
                menge_gesamt=x.menge_gesamt,
                index=x.index,
                lk_nummer=x.lk_nummer,
                arbeitsgang=x.arbeitsgang,
                material=x.material,
                profil=x.profil,
                abmasse=x.abmasse,
                vorhanden=x.vorhanden,
                bemerkung=x.bemerkung,
                status=x.status,
                fortschritt=x.fortschritt,
                ebene=x.ebene,
                baugruppe=x.baugruppe,
                geloescht_am=jetzt,
                eingelagert=x.eingelagert,
                komplett=x.komplett,
                dlz=x.dlz,
                lagerort=x.lagerort,
                mitarbeiter=wx[0],
                arbeitsplatz=wx[1],
                entnommen=x.entnommen,
                liefertermin_stahlbau=x.liefertermin_stahlbau,
                termin_versand=x.termin_versand,
                herkunft=HERKUNFT,
            )
        )
    Archivzeile.objects.bulk_create(zeilen)
    Schweisszeile.objects.filter(id__in=[x.id for x in alle]).delete()
    if not Auftrag.objects.filter(ab_schluessel=ab_zeile.ab_schluessel, bereich="bestand").exists():
        Planungsmarke.objects.filter(
            ab_schluessel=ab_zeile.ab_schluessel
        ).delete()  # Planungs-Häkchen fällt mit dem AB weg
    return v, len(zeilen)


def aus_archiv(v: Archivvorgang) -> int:
    """Wiederherstellen eines aus Schweißen archivierten AB (Admin): die Zeilen kommen mit allen Angaben zurück ins
    Schweißen. Liefert die Zahl der Zeilen."""
    if hat_ab(v.ab_schluessel or v.ab_anzeige):
        raise archiv.ArchivFehler(
            f"{v.ab_anzeige} liegt schon wieder im Schweißen. Erst dort archivieren, dann wiederherstellen."
        )
    zeilen = list(v.zeilen.order_by("nr"))
    kopf_z = next((z for z in zeilen if z.ebene == "AB"), None)
    kopf = {
        "quelldatei": v.quelldatei,
        "reihenfolge": v.reihenfolge,
        "kunde": v.kunde,
        "verkaufsartikel": v.verkaufsartikel,
        "forecast_schluessel": forecast_schluessel(v.ab_anzeige),
    }
    if kopf_z:
        for f, (vorsatz, feld) in archiv.KOPF_ETIKETTEN.items():
            kopf[feld] = archiv._ohne(vorsatz, getattr(kopf_z, f))
    schl = v.ab_schluessel or ab_schluessel(v.ab_anzeige)
    nr = _naechste_nr()
    neu = []
    for i, z in enumerate(zeilen):
        neu.append(
            Schweisszeile(
                nr=nr + i,
                ab_nr=v.ab_anzeige,
                ab_schluessel=schl,
                anzeige=v.ab_anzeige,
                ebene=z.ebene,
                baugruppe=z.baugruppe,
                zeichnungsnummer=z.zeichnungsnummer,
                benennung=z.benennung,
                menge_bg=z.menge_bg,
                menge_gesamt=z.menge_gesamt,
                index=z.index,
                lk_nummer=z.lk_nummer,
                arbeitsgang=z.arbeitsgang,
                material=z.material,
                profil=z.profil,
                abmasse=z.abmasse,
                bemerkung=z.bemerkung,
                vorhanden=z.vorhanden,
                lagerort=z.lagerort,
                status=z.status,
                fortschritt=z.fortschritt,
                eingelagert=z.eingelagert,
                komplett=z.komplett,
                entnommen=z.entnommen,
                mitarbeiter="" if z.mitarbeiter == VERSCHIEDEN else z.mitarbeiter,
                arbeitsplatz="" if z.arbeitsplatz == VERSCHIEDEN else z.arbeitsplatz,
                liefertermin_stahlbau=z.liefertermin_stahlbau,
                termin_versand=z.termin_versand,
                kopf=kopf,
            )
        )
    Schweisszeile.objects.bulk_create(neu)
    abgleich_alle()
    return len(neu)


# ---------- R-W9 Zurück in die Bestandsliste ----------
@dataclass
class Rueck:
    zeile: Schweisszeile
    auswahl: list
    mit_ab: bool

    @property
    def name(self):
        z = self.zeile
        return f"AB {z.ab_nr}" if z.ebene == "AB" else f"Baugruppe {z.baugruppe} ({z.ab_nr})"

    @property
    def frage(self):
        z = self.zeile
        if z.ebene == "AB":
            text = f"AB {z.ab_nr} mit allen Baugruppen zurück in die Bestandsliste schieben?"
        else:
            text = f"Baugruppe {z.baugruppe} ({z.ab_nr}) zurück in die Bestandsliste schieben?"
            if self.mit_ab:
                text += " Die AB-Zeile geht mit zurück, die übrigen Baugruppen bleiben einzeln im Schweißen."
        return text

    @property
    def verlust(self):
        return "Mengen, Lagerort und Daten kommen mit. Mitarbeiter, Arbeitsplatz, Termine und das Entnahmedatum gehen verloren."


def pruefen_zurueck(zeile_id: int) -> Rueck:
    z = Schweisszeile.objects.filter(id=zeile_id).first()
    if z is None:
        raise SchweissenFehler("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.")
    if z.ebene not in ("AB", "BG"):
        raise SchweissenFehler("Bitte die Zeile des AB oder der Baugruppe wählen (nicht ein Einzelteil).")
    alle = list(Schweisszeile.objects.filter(ab_schluessel=z.ab_schluessel).order_by("nr", "id"))
    if z.ebene == "AB":
        return Rueck(z, alle, True)
    abz, ohne, bgs = _gruppen(alle)
    mein = next(g for g in bgs if g[0].id == z.id)
    auswahl = [mein[0], *mein[1]]
    mit_ab = bool(abz)
    if mit_ab:  # AB-Zeile und Teile ohne BG gehen mit zurück
        auswahl = abz + ohne + auswahl
    return Rueck(z, auswahl, mit_ab)


@transaction.atomic
def zurueck(zeile_id: int) -> Auftrag:
    """R-W9: AB bzw. BG zurück in die Bestandsliste. Eine BG eines zusammengefassten AB nimmt die AB-Zeile mit; die
    übrigen BGs stehen danach wieder einzeln als AB…_BGnnn. Mitarbeiter, Arbeitsplatz, Termine und Entnommen gehen verloren."""
    r = pruefen_zurueck(zeile_id)
    ids = [x.id for x in r.auswahl]
    sel = list(Schweisszeile.objects.select_for_update().filter(id__in=ids).order_by("nr", "id"))
    erste = sel[0]
    schl = erste.ab_schluessel
    abz, ohne, bgs = _gruppen(sel)
    a = Auftrag.objects.select_for_update().filter(ab_schluessel=schl, bereich="bestand").first()
    k = (abz[0].kopf if abz else None) or erste.kopf or {}
    if a is None:  # AB-Zeile wird neu aufgebaut
        a = Auftrag(
            ab_anzeige=erste.ab_nr,
            ab_schluessel=schl,
            forecast_schluessel=k.get("forecast_schluessel") or forecast_schluessel(erste.ab_nr),
            haupt_ab=k.get("haupt_ab", ""),
            kunde=k.get("kunde", ""),
            verkaufsartikel=k.get("verkaufsartikel", ""),
            ersteller=k.get("ersteller", ""),
            datum_liste=k.get("datum_liste", ""),
            dispoliste=k.get("dispoliste", ""),
            quelldatei=k.get("quelldatei", ""),
            lagerort=abz[0].lagerort if abz else "",
        )
        belegt = k.get("reihenfolge")
        frei = belegt and not Auftrag.objects.filter(reihenfolge=belegt).exists()
        a.reihenfolge = belegt if frei else (Auftrag.objects.aggregate(m=Max("reihenfolge"))["m"] or 0) + 1
        a.save()
    zeile = max(
        list(a.baugruppen.values_list("zeile", flat=True)) + list(a.teile.values_list("zeile", flat=True)) + [0]
    )

    def felder(x):
        return {f: getattr(x, f) for f in SPALTEN}

    def soll(x):
        s, s_text = archiv._zahl(x.menge_gesamt)
        return {"menge_gesamt": s, "menge_gesamt_text": s_text}

    def neues_teil(x, bg):
        nonlocal zeile
        zeile += 1
        v, _ = archiv._zahl(x.vorhanden)
        Teil.objects.create(
            auftrag=a,
            baugruppe=bg,
            zeile=zeile,
            vorhanden=v,
            datum_eingelagert=x.eingelagert,
            datum_komplett=x.komplett,
            **soll(x),
            **felder(x),
        )

    for x in ohne:
        neues_teil(x, None)
    for bgz, teile in bgs:
        zeile += 1
        b = Baugruppe.objects.create(
            auftrag=a, zeile=zeile, name=bgz.baugruppe, kurz=bg_nummer(bgz.baugruppe), **soll(bgz), **felder(bgz)
        )
        for x in teile:
            neues_teil(x, b)
    Schweisszeile.objects.filter(id__in=ids).delete()
    if r.zeile.ebene == "BG" and r.mit_ab:  # SwEinzelnBeschriften: übrige BGs wieder einzeln
        rest = list(Schweisszeile.objects.filter(ab_schluessel=schl).order_by("nr", "id"))
        for x in rest:
            x.anzeige = f"{x.ab_nr}_BG{bg_nummer(x.baugruppe)}"
        Schweisszeile.objects.bulk_update(rest, ["anzeige"])
    return a

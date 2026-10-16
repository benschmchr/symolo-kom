"""AB löschen und Archiv (R-X1 bis R-X3).

Nachbau von AB_Loeschen, LoescheABZeilen, ArchivKopf und ArchivSchreiben (modBestand.tpl):
- R-X1: AB über die Eingabe finden (R-AB4), Sicherheitsfrage mit Zeilenzahl, Kopie ins Archiv, aus der Liste entfernen.
- R-X2: je Zeile (AB, BG, Teil) eine flache Archivzeile mit 28 Spalten in der Reihenfolge von ArchivKopf.
  Die AB-Zeile sieht aus wie in Excel (Zeichnungsnummer = AB, Benennung = Verkaufsartikel, Arbeitsgang = „Kunde: …“,
  Material = „Haupt-AB: …“, Profil = „Ersteller: …“, Abmaße = „Datum: …“, Bemerkung = „Dispoliste: …“).
- R-X3: Archiv nur lesen und durchsuchen; neu: Wiederherstellen (Kommissionierung) baut den AB aus seinen Archivzeilen
  wieder auf (an seinem alten Platz in der Liste) und nimmt ihn aus dem Archiv.
"""

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from . import ansicht, rechnen
from .ab_nummer import ab_form, ab_schluessel, forecast_schluessel
from .models import Archivvorgang, Archivzeile, Auftrag, Baugruppe, Planungsmarke, Schweisszeile, Teil

GELOESCHT = "Gelöscht aus Bestandsliste"
OHNE_BG = "(ohne BG)"

# R-X2 / ArchivKopf: (Spaltenname wie Excel, Feld in Archivzeile)
ARCHIV_KOPF = [
    ("AB", "ab"),
    ("Zeichnungsnummer", "zeichnungsnummer"),
    ("Benennung", "benennung"),
    ("Menge / BG", "menge_bg"),
    ("Menge Gesamt", "menge_gesamt"),
    ("Index", "index"),
    ("LK Nummer", "lk_nummer"),
    ("Arbeitsgang", "arbeitsgang"),
    ("Material", "material"),
    ("Profil", "profil"),
    ("Abmaße", "abmasse"),
    ("Vorhanden", "vorhanden"),
    ("Bemerkung", "bemerkung"),
    ("Status", "status"),
    ("Fortschritt", "fortschritt"),
    ("Ebene", "ebene"),
    ("Baugruppe", "baugruppe"),
    ("Gelöscht am", "geloescht_am"),
    ("Eingelagert", "eingelagert"),
    ("Komplett", "komplett"),
    ("DLZ", "dlz"),
    ("Lagerort", "lagerort"),
    ("Zuweisung Mitarbeiter", "mitarbeiter"),
    ("Zuweisung Arbeitsplatz", "arbeitsplatz"),
    ("Entnommen", "entnommen"),
    ("Liefertermin Stahlbau", "liefertermin_stahlbau"),
    ("Termin Versand", "termin_versand"),
    ("Herkunft", "herkunft"),
]

# Kopfdaten in der AB-Zeile (R-D2, wie ImportiereBlatt): Feld der Archivzeile → (Vorsatz, Feld im Auftrag)
KOPF_ETIKETTEN = {
    "arbeitsgang": ("Kunde: ", "kunde"),
    "material": ("Haupt-AB: ", "haupt_ab"),
    "profil": ("Ersteller: ", "ersteller"),
    "abmasse": ("Datum: ", "datum_liste"),
    "bemerkung": ("Dispoliste: ", "dispoliste"),
}
SPALTEN = [
    "zeichnungsnummer",
    "benennung",
    "menge_bg",
    "index",
    "lk_nummer",
    "arbeitsgang",
    "material",
    "profil",
    "abmasse",
    "bemerkung",
    "lagerort",
]


class ArchivFehler(Exception):
    pass


# ---------- R-X1: AB finden ----------
def finde_ab(eingabe: str):
    """R-AB4: erst Anzeigeform (R-AB1), dann über den Schlüssel (R-AB3) die vorhandene Schreibweise finden.
    „2515204“ → AB2515204, „AB2616200 Los1“ → „AB2616200 / Los 1“. Liefert den Auftrag oder None."""
    ab = ab_form(eingabe)
    if not ab:
        return None
    qs = Auftrag.objects.filter(bereich="bestand")
    return qs.filter(ab_anzeige=ab).first() or qs.filter(ab_schluessel=ab_schluessel(ab)).first()


def zeilenzahl(a: ansicht.ABZ) -> int:
    """Zeilen wie in Excel: die AB-Zeile, jede BG und jedes Teil."""
    return 1 + len(a.bgs) + len(a.alle_teile)


# ---------- R-X2: Archivzeilen ----------
def _etikett(vorsatz, wert):
    return f"{vorsatz}{wert}" if wert else ""


def _menge(o) -> str:
    return o.soll_anzeige


def _zeilen(a: ansicht.ABZ, jetzt, herkunft):
    """Archivzeilen eines AB in der Reihenfolge der Bestandsliste (Teile ohne BG vorn)."""
    ab = a.o
    gemeinsam = {"ab": ab.ab_anzeige, "geloescht_am": jetzt, "herkunft": herkunft}

    def werte(w):
        return {"status": w.status, "fortschritt": w.fortschritt, "eingelagert": w.eingelagert, "komplett": w.komplett}

    kopf = {f: _etikett(vorsatz, getattr(ab, feld)) for f, (vorsatz, feld) in KOPF_ETIKETTEN.items()}
    yield Archivzeile(
        ebene="AB",
        zeichnungsnummer=ab.ab_anzeige,
        benennung=ab.verkaufsartikel,
        lagerort=ab.lagerort,
        **kopf,
        **werte(a.w),
        **gemeinsam,
    )

    def teil(t, bg_name):
        o = t.o
        return Archivzeile(
            ebene="Teil",
            baugruppe=bg_name,
            menge_gesamt=_menge(o),
            vorhanden=rechnen.zahl_text(o.vorhanden) if o.vorhanden is not None else "",
            **{f: getattr(o, f) for f in SPALTEN},
            **werte(t.w),
            **gemeinsam,
        )

    for t in a.ohne:
        yield teil(t, OHNE_BG)
    for b in a.bgs:
        yield Archivzeile(
            ebene="BG",
            baugruppe=b.o.name,
            menge_gesamt=_menge(b.o),
            **{f: getattr(b.o, f) for f in SPALTEN},
            **werte(b.w),
            **gemeinsam,
        )
        for t in b.teile:
            yield teil(t, b.o.name)


@transaction.atomic
def loeschen(auftrag_id: int, herkunft: str = GELOESCHT) -> tuple[Archivvorgang, int]:
    """R-X1: Kopie ins Archiv (R-X2), dann den AB mit allen BGs und Teilen aus der Bestandsliste entfernen.
    Liefert (Archivvorgang, Zeilenzahl)."""
    gesperrt = Auftrag.objects.select_for_update().filter(id=auftrag_id, bereich="bestand")
    a = next(iter(ansicht.baum(gesperrt)), None)
    if a is None:
        raise ArchivFehler("Diesen Arbeitsauftrag gibt es nicht (mehr) in der Bestandsliste.")
    jetzt = timezone.now()
    v = Archivvorgang.objects.create(
        ab_anzeige=a.o.ab_anzeige,
        ab_schluessel=a.o.ab_schluessel,
        kunde=a.o.kunde,
        verkaufsartikel=a.o.verkaufsartikel,
        geloescht_am=jetzt,
        herkunft=herkunft,
        status=a.w.status,
        reihenfolge=a.o.reihenfolge,
        quelldatei=a.o.quelldatei,
    )
    zeilen = list(_zeilen(a, jetzt, herkunft))
    for nr, z in enumerate(zeilen, start=1):
        z.vorgang, z.nr = v, nr
    Archivzeile.objects.bulk_create(zeilen)
    a.o.delete()  # BGs und Teile gehen mit (CASCADE)
    if not Schweisszeile.objects.filter(
        ab_schluessel=a.o.ab_schluessel
    ).exists():  # Planungs-Häkchen fällt mit dem AB weg
        Planungsmarke.objects.filter(ab_schluessel=a.o.ab_schluessel).delete()
    return v, len(zeilen)


# ---------- R-X3: durchsuchen ----------
def suchen(q: str):
    """Archiv-Einträge, deren AB, Kunde oder eine Zeile (Zeichnungsnummer, Benennung, LK, Lagerort) passt.
    Teilwort, ohne Groß-/Kleinschreibung (wie R-A1)."""
    qs = Archivvorgang.objects.all()
    q = " ".join((q or "").split())
    if not q:
        return qs
    zeilen = Archivzeile.objects.filter(
        Q(zeichnungsnummer__icontains=q)
        | Q(benennung__icontains=q)
        | Q(lk_nummer__icontains=q)
        | Q(lagerort__icontains=q)
        | Q(baugruppe__icontains=q)
    ).values("vorgang_id")
    return qs.filter(
        Q(ab_anzeige__icontains=q) | Q(kunde__icontains=q) | Q(verkaufsartikel__icontains=q) | Q(id__in=zeilen)
    )


def treffer(z: Archivzeile, q: str) -> bool:
    q = (q or "").strip().casefold()
    return bool(q) and any(
        q in (getattr(z, f) or "").casefold()
        for f in ("zeichnungsnummer", "benennung", "lk_nummer", "lagerort", "baugruppe")
    )


# ---------- R-X3 neu: wiederherstellen (Kommissionierung) ----------
def darf_wiederherstellen(v: Archivvorgang) -> bool:
    """Alle: aus der Bestandsliste gelöschte ABs (und alte Excel-Zeilen) kommen in die Bestandsliste zurück,
    aus Schweißen archivierte ins Schweißen."""
    return True


def _zahl(text: str):
    """Text aus dem Archiv → Zahl, sonst (None, Text)."""
    t = (text or "").strip()
    if not t:
        return None, ""
    try:
        d = Decimal(t.replace(".", "").replace(",", ".") if "," in t else t)
    except InvalidOperation:
        return None, t
    return (d, "") if d.is_finite() else (None, t)


def _ohne(vorsatz, text):
    return text[len(vorsatz) :].strip() if (text or "").startswith(vorsatz) else (text or "").strip()


@transaction.atomic
def wiederherstellen(vorgang_id: int) -> Auftrag:
    """Den AB aus seinen Archivzeilen wieder in die Bestandsliste bringen: Kopfdaten, BGs, Teile mit Vorhanden,
    Lagerort und den Daten Eingelagert/Komplett. Status usw. rechnet die App wie immer selbst."""
    v = Archivvorgang.objects.select_for_update().filter(id=vorgang_id).first()
    if v is None:
        raise ArchivFehler("Diesen Archiv-Eintrag gibt es nicht (mehr).")
    if v.herkunft == "Archiviert aus Schweißen":  # zurück ins Schweißen (Phase 6)
        from . import schweissen

        schweissen.aus_archiv(v)
        v.delete()
        return None
    if Auftrag.objects.filter(ab_schluessel=v.ab_schluessel).exists():
        raise ArchivFehler(
            f"{v.ab_anzeige} steht schon wieder in der Bestandsliste "
            f"(neu importiert). Erst dort löschen, dann wiederherstellen."
        )
    zeilen = list(v.zeilen.order_by("nr"))
    kopf = next((z for z in zeilen if z.ebene == "AB"), None)
    a = Auftrag(
        ab_anzeige=v.ab_anzeige,
        ab_schluessel=v.ab_schluessel or ab_schluessel(v.ab_anzeige),
        forecast_schluessel=forecast_schluessel(v.ab_anzeige),
        quelldatei=v.quelldatei,
    )
    if kopf:
        a.verkaufsartikel, a.lagerort = kopf.benennung, kopf.lagerort
        for f, (vorsatz, feld) in KOPF_ETIKETTEN.items():
            setattr(a, feld, _ohne(vorsatz, getattr(kopf, f)))
    belegt = Auftrag.objects.filter(reihenfolge=v.reihenfolge).exists() if v.reihenfolge else True
    a.reihenfolge = (Auftrag.objects.aggregate(m=Max("reihenfolge"))["m"] or 0) + 1 if belegt else v.reihenfolge
    a.save()
    bgs = {}
    for nr, z in enumerate((z for z in zeilen if z.ebene != "AB"), start=1):
        soll, soll_text = _zahl(z.menge_gesamt)
        felder = {f: getattr(z, f) for f in SPALTEN}
        if z.ebene == "BG":
            bgs[z.baugruppe] = Baugruppe.objects.create(
                auftrag=a,
                zeile=nr,
                name=z.baugruppe,
                kurz=z.baugruppe.split(" ")[0],
                menge_gesamt=soll,
                menge_gesamt_text=soll_text,
                **felder,
            )
            continue
        vorhanden, _ = _zahl(z.vorhanden)
        Teil.objects.create(
            auftrag=a,
            baugruppe=bgs.get(z.baugruppe) if z.baugruppe != OHNE_BG else None,
            zeile=nr,
            menge_gesamt=soll,
            menge_gesamt_text=soll_text,
            vorhanden=vorhanden,
            datum_eingelagert=z.eingelagert,
            datum_komplett=z.komplett,
            **felder,
        )
    v.delete()
    return a

"""Änderungsprotokoll (W7): wer hat wann welche Menge, welchen Platz, welches Soll geändert; Import, Löschen,
Wiederherstellen.

Betriebsrat/Datenschutz sind noch offen (Übergabe 7.3). Darum lässt sich das Protokoll von einem Admin
- ganz abschalten (es wird nichts mehr geschrieben),
- ohne Namen führen (nur was, wann, alt → neu; beim Ausschalten werden auch die Namen alter Einträge entfernt),
- zeitlich begrenzen (ältere Einträge werden automatisch gelöscht),
- und ganz leeren.
Sehen dürfen es nur Admins. Folgeänderungen (Vererbung des Lagerorts an BGs und Teile, Abgleich R-L3, Datum R-T1)
stehen nicht einzeln darin, nur die Eingabe selbst.
"""

from datetime import timedelta

from django.utils import timezone

from .models import Aenderung, Protokolleinstellung


def einstellung() -> Protokolleinstellung:
    e, _ = Protokolleinstellung.objects.get_or_create(pk=1)
    return e


def aufraeumen(e: Protokolleinstellung | None = None) -> int:
    """Einträge löschen, die älter als die Aufbewahrungszeit sind. Liefert die Zahl der gelöschten Einträge."""
    e = e or einstellung()
    if not e.tage:
        return 0
    return Aenderung.objects.filter(zeit__lt=timezone.now() - timedelta(days=e.tage)).delete()[0]


def schreiben(benutzer, art: str, ab: str, objekt: str = "", alt="", neu="") -> None:
    """Einen Eintrag schreiben, wenn das Protokoll an ist. Namen nur, wenn eingeschaltet."""
    e = einstellung()
    if not e.aktiv:
        return
    mit_namen = e.namen and getattr(benutzer, "is_authenticated", False)
    Aenderung.objects.create(
        zeit=timezone.now(),
        art=art,
        ab=ab[:80],
        objekt=objekt[:400],
        alt=str(alt)[:200],
        neu=str(neu)[:200],
        benutzer=benutzer if mit_namen else None,
        benutzer_name=(benutzer.get_full_name() or benutzer.username)[:150] if mit_namen else "",
    )
    aufraeumen(e)


def namen_entfernen() -> int:
    """Namen aus allen Einträgen entfernen (wenn „Namen speichern“ ausgeschaltet wird)."""
    return Aenderung.objects.exclude(benutzer=None, benutzer_name="").update(benutzer=None, benutzer_name="")


def teil_objekt(teil) -> str:
    """„Teil SK1990-977452.002.0 (BG 100)“ für das Protokoll."""
    bg = f" (BG {teil.baugruppe.kurz})" if teil.baugruppe_id else ""
    return f"Teil {teil.zeichnungsnummer or '(ohne Nr.)'}{bg}"

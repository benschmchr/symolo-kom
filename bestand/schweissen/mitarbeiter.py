from datetime import date

from django.db import transaction

from ..models import (
    Arbeitsplatz,
    Mitarbeiter,
    Schweisszeile,
)
from .abgleich import _ab_ableiten, _speichern, _werte, abgleich_kern
from .hilfen import DATUMSFELDER, FELDER, SONSTIGES, VERSCHIEDEN, SchweissenFehler, datum_aus_text

# ---------- Mitarbeiter-Liste (Ben, 14.10.): Namen verwalten, mehrere je AB oder BG wählen ----------
TRENNER = ", "
MAX_NAME = 80


def mitarbeiter_namen() -> list[str]:
    return list(Mitarbeiter.objects.order_by("name").values_list("name", flat=True))


def mitarbeiter_liste(text) -> list[str]:
    """„Anna, Bernd“ → [„Anna“, „Bernd“] (ohne Doppelte, ohne „(verschieden)“)."""
    aus, gesehen = [], set()
    for n in (text or "").split(","):
        n = " ".join(n.split())
        if n and n != VERSCHIEDEN and n.casefold() not in gesehen:
            gesehen.add(n.casefold())
            aus.append(n)
    return aus


def mitarbeiter_neu(name: str) -> str:
    n = " ".join((name or "").replace(",", " ").split())
    if not n:
        raise SchweissenFehler("Bitte einen Namen eintragen.")
    if len(n) > MAX_NAME:
        raise SchweissenFehler(f"Der Name ist zu lang (höchstens {MAX_NAME} Zeichen).")
    if n == VERSCHIEDEN:
        raise SchweissenFehler("„(verschieden)“ ist kein Name.")
    if Mitarbeiter.objects.filter(name__iexact=n).exists():
        raise SchweissenFehler(f"{n} steht schon in der Liste.")
    Mitarbeiter.objects.create(name=n)
    return n


def mitarbeiter_weg(name: str) -> str:
    m = Mitarbeiter.objects.filter(name__iexact=(name or "").strip()).first()
    if m is None:
        raise SchweissenFehler("Dieser Name steht nicht (mehr) in der Liste.")
    n = m.name
    m.delete()  # bereits eingetragene Zuweisungen bleiben stehen
    return n


# ---------- R-W6 Eingaben ----------
def platz_namen() -> list[str]:
    return list(Arbeitsplatz.objects.order_by("reihenfolge").values_list("name", flat=True))


def _ap_kern(text: str) -> str:
    """ApGleich: ohne Leerzeichen, Bindestriche, Schrägstriche und Punkte, ohne Groß-/Kleinschreibung."""
    for zeichen in " -/.":
        text = text.replace(zeichen, "")
    return text.casefold()


def platz_finden(text: str) -> str | None:
    """„AP 05“ = „AP05“: der Name aus der Platzliste (R-AP1) oder None."""
    k = _ap_kern(text or "")
    if k == SONSTIGES.casefold():
        return SONSTIGES
    return next((n for n in platz_namen() if _ap_kern(n) == k), None) if k else None


def eingabe_pruefen(feld: str, text: str):
    """Text → Wert für das Feld: Mitarbeiter (freier Text), Arbeitsplatz (aus der Liste, „“ = entfernen), Termine (R-W7)."""
    text = (text or "").strip()
    if feld == "mitarbeiter":
        if text == VERSCHIEDEN:
            raise SchweissenFehler("„(verschieden)“ kann man nicht eintragen.")
        text = TRENNER.join(mitarbeiter_liste(text))  # mehrere Namen: „Anna, Bernd“ (ohne Doppelte)
        if len(text) > 200:
            raise SchweissenFehler("Es sind zu viele Namen gewählt (höchstens 200 Zeichen zusammen).")
        return text
    if feld == "arbeitsplatz":
        if text in ("", "0"):
            return ""
        name = platz_finden(text)
        if name is None:
            raise SchweissenFehler(f"„{text}“ ist kein Arbeitsplatz. Bitte einen aus der Liste wählen.")
        return name
    if feld in DATUMSFELDER:
        if text == "":
            return None
        d = datum_aus_text(text)
        if d is None:
            raise SchweissenFehler(
                f"„{text}“ ist kein gültiges Datum (z. B. 15.10.2026, 15.10. oder 151026; Jahr 2020 bis 2099)."
            )
        return d
    raise SchweissenFehler("Unbekanntes Feld.")


def anzeigename(z: Schweisszeile) -> str:
    return z.anzeige if z.ebene == "AB" else f"{z.anzeige} / {z.baugruppe}" if z.ebene == "BG" else z.zeichnungsnummer


@transaction.atomic
def setzen(zeile_id: int, feld: str, text: str):
    """R-W6: Eintrag an einer AB- oder BG-Zeile; wird an alles darunter vererbt. Ein Teil nimmt keinen Eintrag an.
    Liefert (Zeile, alt, neu) als Text für das Änderungsprotokoll."""
    if feld not in FELDER:
        raise SchweissenFehler("Unbekanntes Feld.")
    z = Schweisszeile.objects.select_for_update().filter(id=zeile_id).first()
    if z is None:
        raise SchweissenFehler("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.")
    if z.ebene == "Teil":
        raise SchweissenFehler(
            "Einzelteile übernehmen den Eintrag ihrer Baugruppe. Bitte bei der Baugruppe oder beim AB eintragen."
        )
    wert = eingabe_pruefen(feld, text)
    k = FELDER.index(feld)
    zeilen = list(Schweisszeile.objects.select_for_update().order_by("nr", "id"))
    ebene, ab = [x.ebene for x in zeilen], [x.ab_nr for x in zeilen]
    w = _werte(zeilen)
    _ab_ableiten(ebene, ab, w)
    i = next(n for n, x in enumerate(zeilen) if x.id == z.id)
    alt = w[i][k]
    w[i][k] = wert
    abgleich_kern(ebene, ab, w, {(i, k)} if z.ebene == "AB" else set())
    _speichern(zeilen, w)
    return z, _text(alt, feld), _text(wert, feld)


def _text(wert, feld) -> str:
    if wert in ("", None):
        return "leer"
    return wert.strftime("%d.%m.%Y") if isinstance(wert, date) else str(wert)

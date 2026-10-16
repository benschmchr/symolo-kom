from django import template

from ..rechnen import zahl_text

register = template.Library()


@register.filter
def zahl(x):
    """Menge wie in Excel (deutsch): 21 → „21“, 0.06 → „0,06“, leer → „“."""
    return "" if x is None else zahl_text(x)


@register.filter
def hat_werte(balken):
    """Statistik: gibt es im Diagramm mindestens einen Balken mit Wert?"""
    return any(b.wert is not None for b in balken)


@register.simple_tag
def platz_optionen(wert):
    """Auswahl Lagerort (R-L4: Auswahl aus Liste statt Freitext): kein Platz, L1–L6, R1–R6, bisheriger freier Text,
    „Anderer Platz …“ (fragt nach und braucht eine Bestätigung)."""
    from django.utils.html import format_html, format_html_join

    from ..lagerort import R3_NAME, ist_gueltig, platz_norm

    wert = wert or ""
    aktiv = platz_norm(wert) if ist_gueltig(wert) else wert

    def gruppe(seite, titel):
        zeilen = [
            (p, " selected" if p == aktiv else "", f"{p} · Sperrlager" if p == "R3" else p)
            for p in (f"{seite}{e}" for e in range(1, 7))
        ]
        return format_html(
            '<optgroup label="{}">{}</optgroup>',
            titel,
            format_html_join("", '<option value="{}"{}>{}</option>', zeilen),
        )

    frei = (
        format_html('<option value="{}" selected>{} (kein Regalplatz)</option>', wert, wert)
        if wert and not ist_gueltig(wert)
        else ""
    )
    return format_html(
        '<option value=""{}>–</option>{}{}{}<option value="__frei__">Anderer Platz …</option>',
        "" if wert else " selected",
        gruppe("L", "Links"),
        gruppe("R", f"Rechts (R3 = {R3_NAME})"),
        frei,
    )


@register.filter
def prozent(p):
    """Fortschritt % wie in Excel (Format „0 %“): 0,3743 → „37 %“ (R-DB1)."""
    from ..dashboard import prozent_text

    return prozent_text(p or 0)


@register.simple_tag
def archivwert(zeile, feld):
    """Eine Zelle der Archivzeile wie im Excel-Archiv: Gelöscht am „TT.MM.JJJJ hh:mm“, andere Daten „TT.MM.JJJJ“."""
    from datetime import date, datetime

    from django.utils import timezone

    w = getattr(zeile, feld)
    if w is None:
        return ""
    if isinstance(w, datetime):
        return timezone.localtime(w).strftime("%d.%m.%Y %H:%M")
    if isinstance(w, date):
        return w.strftime("%d.%m.%Y")
    return w


@register.filter
def swdatum(x):
    """Termin im Schweißen: Datum „TT.MM.JJJJ“; „(verschieden)“ bleibt Text; leer → „“."""
    from datetime import date

    if isinstance(x, date):
        return x.strftime("%d.%m.%Y")
    return x or ""


@register.filter
def swnamen(wert):
    """Gewählte Mitarbeiter eines Textes „Anna, Bernd“ als Liste."""
    from ..schweissen import mitarbeiter_liste

    return mitarbeiter_liste(wert)


@register.filter
def swfehlt(wert, namen):
    """Gewählte Mitarbeiter, die nicht (mehr) in der Mitarbeiterliste stehen (bleiben sichtbar und abwählbar)."""
    from ..schweissen import mitarbeiter_liste

    bekannt = {n.casefold() for n in namen}
    return [n for n in mitarbeiter_liste(wert) if n.casefold() not in bekannt]


@register.filter
def tage_bis(frueher, spaeter):
    """Tage von `frueher` bis `spaeter` (zum Beispiel: seit wie vielen Tagen ein Liefertermin vorbei ist)."""
    return (spaeter - frueher).days

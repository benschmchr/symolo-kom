"""AB-Nummern, Lose und Schlüssel (R-AB1 bis R-AB5).

Nachbau der VBA-Funktionen ABForm, Ziffern, LosNr, ABSchluessel und FcSchluessel
aus excel_quellen/modBestand.tpl, Zeichen für Zeichen.
"""

import re

ZIFFERN = "0123456789"


def _ab_weg(s: str) -> str:
    """Führendes „AB“ (beliebige Schreibweise) entfernen."""
    return s[2:].lstrip(" ") if s[:2].upper() == "AB" else s


def ziffern(s: str) -> str:
    """Führende Ziffern: „123456 L1“ → „123456“."""
    i = 0
    while i < len(s) and s[i] in ZIFFERN:
        i += 1
    return s[:i]


def los_nr(rest: str) -> str:
    """R-AB2: Losnummer aus dem Los-Teil („ L1“, „/ Los 1“, „Los01“ → „1“); „“ = kein Los."""
    k = rest.upper()
    for z in " /-.":
        k = k.replace(z, "")
    if k.startswith("LOS"):
        k = k[3:]
    elif k.startswith("L"):
        k = k[1:]
    else:
        return ""
    if not k or any(c not in ZIFFERN for c in k):
        return ""
    return k.lstrip("0") or "0"


def ab_form(t) -> str:
    """R-AB1 Anzeigeform: „123456“ → „AB123456“, „Ab123456 / Los 2“ → „AB123456 / Los 2“."""
    t = re.sub(r" {2,}", " ", str(t or "").strip(" "))
    s = _ab_weg(t)
    d = ziffern(s)
    if not d:
        return t
    rest = s[len(d) :]
    if rest == "":
        return "AB" + d
    if rest[0] in " /" or los_nr(rest):
        return "AB" + d + rest
    return t


def ab_schluessel(t) -> str:
    """R-AB3 Vergleichsschlüssel: „AB123456 L1“, „123456 / Los 1“, „AB123456 Los1“ → „AB123456|L1“."""
    s = _ab_weg(str(t or "").strip(" "))
    d = ziffern(s)
    if not d:
        return s.replace(" ", "").upper()
    rest = s[len(d) :]
    if rest.strip(" ") == "":
        return "AB" + d
    los = los_nr(rest)
    if los:
        return f"AB{d}|L{los}"
    return f"AB{d}|" + rest.replace(" ", "").upper()


def forecast_schluessel(t) -> str:
    """R-AB5 Forecast-Schlüssel ohne Los: „AB2515204 L1“ → „AB2515204“; ohne Ziffern „“."""
    s = str(t or "").strip(" ")
    if not s:
        return ""
    d = ziffern(_ab_weg(s))
    return "AB" + d if d else ""

import re
from datetime import date

from .. import archiv


def heute():
    """Heutiges Datum; geht über das Paket, damit ein Austausch von `schweissen.heute` (Tests) überall wirkt."""
    from .. import schweissen

    return schweissen.heute()


VERSCHIEDEN = "(verschieden)"
SONSTIGES = "Sonstiges"  # Arbeitsplatz ohne Platz auf der Tafel (Ben, 14.10.)
OHNE_BG = archiv.OHNE_BG
HERKUNFT = "Archiviert aus Schweißen"

# R-W6: die vier vererbten Eingaben (Reihenfolge wie in AbgleichKern: w[i][0..3])
EINGABEN = [
    ("mitarbeiter", "Zuweisung Mitarbeiter"),
    ("arbeitsplatz", "Zuweisung Arbeitsplatz"),
    ("liefertermin_stahlbau", "Liefertermin Stahlbau"),
    ("termin_versand", "Termin Versand"),
]
FELDER = [f for f, _ in EINGABEN]
DATUMSFELDER = ("liefertermin_stahlbau", "termin_versand")

# R-W4: Spalten, die aus der Bestandsliste kopiert werden (wie archiv.SPALTEN)
SPALTEN = archiv.SPALTEN


class SchweissenFehler(Exception):
    """Verständliche Meldung für den Benutzer (so wie die MsgBox in Excel)."""


# ---------- Hilfen ----------
def _t(x) -> str:
    """Excel Txt(): leer → „“, Datum → ISO (nur zum Vergleichen), sonst getrimmter Text."""
    if x is None:
        return ""
    if isinstance(x, date):
        return x.isoformat()
    return str(x).strip()


def _gleich(a, b) -> bool:
    return _t(a).casefold() == _t(b).casefold()


def bg_nummer(bg: str) -> str:
    """„100 HALTER …“ → „100“ (BgNummer)."""
    bg = (bg or "").strip()
    return bg.split(" ", 1)[0] if " " in bg else bg


def _val(text: str) -> float:
    """VBA Val(): führende Zahl, sonst 0."""
    m = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", text or "")
    return float(m.group(1)) if m else 0.0


def _bg_sortkey(name: str):
    """BgVor: erst die Nummer, dann der Name (ohne Groß-/Kleinschreibung)."""
    return (_val(bg_nummer(name)), (name or "").casefold())


# ---------- R-W7 Datumseingabe ----------
def _nur_ziffern(s: str) -> bool:
    return 0 < len(s) <= 8 and all(c in "0123456789" for c in s)


def datum_aus_text(text: str, jetzt: date | None = None):
    """„15.10.2026“, „15.10.26“, „15.10“, „151026“, „15102026“, „1510“ (auch mit „/“ oder „-“). None = ungültig.
    Jahr nur 2020–2099, ungültige Tage (31.02.) werden abgelehnt (Nachbau von DatumAusText)."""
    jetzt = jetzt or heute()
    t = (text or "").replace("/", ".").replace("-", ".").strip()
    if not t:
        return None
    d = m = y = 0
    if "." in t:
        p = t.split(".")
        if len(p) < 2 or len(p) > 3:
            return None
        a, b = p[0].strip(), p[1].strip()
        if not _nur_ziffern(a) or not _nur_ziffern(b):
            return None
        d, m = int(a), int(b)
        if len(p) == 3 and p[2].strip():
            if not _nur_ziffern(p[2].strip()):
                return None
            y = int(p[2].strip())
    else:
        if not _nur_ziffern(t):
            return None
        if len(t) == 4:
            d, m = int(t[:2]), int(t[2:4])
        elif len(t) == 6:
            d, m, y = int(t[:2]), int(t[2:4]), int(t[4:])
        elif len(t) == 8:
            d, m, y = int(t[:2]), int(t[2:4]), int(t[4:])
        else:
            return None
    if y == 0:
        y = jetzt.year
    if y < 100:
        y += 2000
    if y < 2020 or y > 2099 or m < 1 or m > 12 or d < 1 or d > 31:
        return None
    try:
        return date(y, m, d)
    except ValueError:
        return None

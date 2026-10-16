"""Rechenkern: Status, Prozent, Fortschritt, Sortierung, Daten (R-S1 bis R-S9, R-T1, R-T2).

Nachbau der Tabellenformeln aus excel_quellen/build.py (dict F). Leere oder Text-Mengen zählen als 0
(Excel-Funktion N). Nichts davon wird gespeichert, alles wird beim Anzeigen berechnet.
"""

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

KOMPLETT, TEILWEISE, OFFEN, LEER = "Komplett", "Teilweise", "Offen", "-"
STATUSWERT = {KOMPLETT: 0, TEILWEISE: 2}  # R-S7, alles andere 4

MAX_MENGE = 999_999_999  # R-M4: größer passt nicht ins Mengenfeld (12 Stellen mit 3 Nachkommastellen)
MELDUNG_ZU_GROSS = "Bitte eine Zahl bis 999.999.999 eintragen."
MELDUNG_PUNKT = "Bitte ohne Punkt eintragen (1000 statt 1.000)."
_TAUSENDERPUNKT = re.compile(r"[1-9]\d{0,2}([.,]\d{3})+")


def n(x) -> Decimal:
    """Excel N(): Zahl bleibt, leer/Text wird 0."""
    if x is None or isinstance(x, bool):
        return Decimal(0)
    if isinstance(x, Decimal):
        return x
    if isinstance(x, (int, float)):
        return Decimal(str(x))
    return Decimal(0)


def zahl_text(x) -> str:
    """Zahl wie Excel (deutsch): 21 → „21“, 0.06 → „0,06“."""
    d = n(x)
    if d == d.to_integral_value():
        return str(int(d))
    return format(d.normalize(), "f").replace(".", ",")


def punkt_mehrdeutig(text: str) -> bool:
    """R-M4: „1.000“ oder „1,000“ kann 1 oder 1000 heißen; wird nicht geraten, sondern abgelehnt."""
    return bool(_TAUSENDERPUNKT.fullmatch((text or "").strip()))


@dataclass
class Werte:
    status: str
    prozent: float
    fortschritt: str
    anz_teile: int = 0
    anz_komplett: int = 0
    eingelagert: date | None = None
    komplett: date | None = None
    code: int | None = None  # nur Teile: 0 offen, 1 teilweise, 2 komplett
    ist: Decimal = field(default_factory=Decimal)  # nur Teile: min(max(V,0),S)
    soll: Decimal = field(default_factory=Decimal)

    @property
    def sort(self) -> float:
        """R-S7 Sortierschlüssel: Komplett 0, Teilweise 2, sonst 4, minus Prozent."""
        return STATUSWERT.get(self.status, 4) - self.prozent

    @property
    def css(self) -> str:
        return {KOMPLETT: "komplett", TEILWEISE: "teilweise", OFFEN: "offen"}.get(self.status, "leer")

    @property
    def entnehmen(self) -> bool:
        """R-W1: „» entnehmen“ nur bei AB/BG mit Status Komplett (Teile: nie)."""
        return self.code is None and self.status == KOMPLETT


def teil_code(vorhanden, soll) -> int:
    """R-S1: V ≤ 0 oder leer → 0 (Offen); V ≥ S → 2 (Komplett, auch S leer/0); sonst 1 (Teilweise)."""
    v, s = n(vorhanden), n(soll)
    if v <= 0:
        return 0
    return 2 if v >= s else 1


def teil(vorhanden, soll, eingelagert=None, komplett=None) -> Werte:
    """Werte eines Teils (R-S1, R-S3, R-S5)."""
    v, s = n(vorhanden), n(soll)
    code = teil_code(vorhanden, soll)
    status = (OFFEN, TEILWEISE, KOMPLETT)[code]
    if code == 2:
        prozent = 1.0
    elif code == 0:
        prozent = 0.0
    else:
        prozent = min(0.99, max(0.01, float(v / s)))
    text = f"{zahl_text(v)} / {zahl_text(s)}"
    if v > s:
        text += f"  (+{zahl_text(v - s)} zu viel)"
    return Werte(
        status,
        prozent,
        text,
        code=code,
        ist=min(max(v, Decimal(0)), s),
        soll=s,
        eingelagert=eingelagert,
        komplett=komplett,
    )


def sammel(teile: list[Werte]) -> Werte:
    """Werte einer BG oder eines AB direkt aus allen Teilen darunter (R-S2, R-S4, R-S5, R-T2)."""
    anz = len(teile)
    summe = sum(t.code for t in teile)
    anz_k = sum(t.code == 2 for t in teile)
    if anz == 0:
        status = LEER
    elif summe == 2 * anz:
        status = KOMPLETT
    elif summe == 0:
        status = OFFEN
    else:
        status = TEILWEISE
    if status == KOMPLETT:
        prozent = 1.0
    elif status == TEILWEISE:
        soll = sum((t.soll for t in teile), Decimal(0))
        roh = float(sum((t.ist for t in teile), Decimal(0)) / soll) if soll else 0.0  # IFERROR(…;0)
        prozent = min(0.99, max(0.01, roh))
    else:
        prozent = 0.0
    ein = [t.eingelagert for t in teile if t.eingelagert]
    fertig = [t.komplett for t in teile if t.komplett]
    return Werte(
        status,
        prozent,
        f"{anz_k} von {anz}",
        anz_teile=anz,
        anz_komplett=anz_k,
        eingelagert=min(ein) if ein else None,
        komplett=max(fertig) if fertig and status == KOMPLETT else None,
    )


def gesamt(teile: list[Werte]) -> float:
    """R-S6 Gesamtfortschritt: Σ Ist / Σ Soll über alle Teile."""
    soll = sum((t.soll for t in teile), Decimal(0))
    return float(sum((t.ist for t in teile), Decimal(0)) / soll) if soll else 0.0


def daten_stempeln(vorhanden, soll, eingelagert, komplett, heute: date):
    """R-T1: neue Daten (Eingelagert, Komplett) eines Teils nach einer Änderung von Vorhanden oder Soll."""
    v, s = n(vorhanden), n(soll)
    if v <= 0:
        return None, None  # Tippfehler korrigiert: beide leer
    eingelagert = eingelagert or heute
    komplett = (komplett or heute) if v >= s else None
    return eingelagert, komplett

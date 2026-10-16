"""R-W6 (Vererbung) und R-W7 (Datumseingabe): Prüffälle 9.1b aus Uebergabe/pruefdaten/pruef_schweissen.md,
dort mit dem echten VBA-Code (AbgleichKern, DatumAusText) in LibreOffice gerechnet."""

from datetime import date

import pytest

from bestand.schweissen import VERSCHIEDEN, abgleich_kern, datum_aus_text

EBENE = ["AB", "BG", "Teil", "Teil", "BG", "Teil", "BG", "Teil"]
AB = ["AB1", "AB1", "AB1", "AB1", "AB1", "AB1", "AB9", "AB9"]
M, P, L, T = 0, 1, 2, 3


def leer():
    return [["", "", None, None] for _ in EBENE]


def spalte(w, k):
    return ["-" if x[k] in ("", None) else x[k] for x in w]


def test_R_W6_pruefdaten_schritt_fuer_schritt():
    """Die 7 Schritte der Prüfdatei; jeder Schritt baut auf dem vorigen auf."""
    w = leer()
    w[0][M] = "Paskal"  # 1 Mitarbeiter am AB1
    abgleich_kern(EBENE, AB, w, {(0, M)})
    assert spalte(w, M) == ["Paskal"] * 6 + ["-", "-"]

    w[1][P], w[4][P] = "AP02", "AP01"  # 2 BG100 = AP02, BG200 = AP01
    abgleich_kern(EBENE, AB, w)
    assert spalte(w, P) == [VERSCHIEDEN, "AP02", "AP02", "AP02", "AP01", "AP01", "-", "-"]

    w[4][P] = "AP02"  # 3 BG200 auch AP02
    abgleich_kern(EBENE, AB, w)
    assert spalte(w, P) == ["AP02"] * 6 + ["-", "-"]  # AB bekommt den gemeinsamen Wert

    w[0][P] = "Trumpf"  # 4 AB = Trumpf
    abgleich_kern(EBENE, AB, w, {(0, P)})
    assert spalte(w, P) == ["Trumpf"] * 6 + ["-", "-"]

    w[2][P] = "AP05"  # 5 Teil direkt = AP05 → verworfen
    abgleich_kern(EBENE, AB, w)
    assert spalte(w, P) == ["Trumpf"] * 6 + ["-", "-"]

    w[1][M] = "Tim"  # 6 Mitarbeiter BG100 = Tim
    abgleich_kern(EBENE, AB, w)
    assert spalte(w, M) == [VERSCHIEDEN, "Tim", "Tim", "Tim", "Paskal", "Paskal", "-", "-"]

    w[6][L] = date(2026, 11, 2)  # 7 Liefertermin am Einzelblock AB9_BG300
    abgleich_kern(EBENE, AB, w)
    assert spalte(w, L) == ["-"] * 6 + [date(2026, 11, 2)] * 2


def test_R_W6_ab_eintrag_ueberschreibt_alle_bgs_und_teile():
    w = leer()
    w[1][M], w[4][M] = "Tim", "Paskal"
    abgleich_kern(EBENE, AB, w)
    assert w[0][M] == VERSCHIEDEN
    w[0][M] = "Anna"
    abgleich_kern(EBENE, AB, w, {(0, M)})
    assert spalte(w, M) == ["Anna"] * 6 + ["-", "-"]  # Einzelblock AB9 bleibt unberührt


def test_R_W6_verschieden_wird_nicht_an_bgs_vererbt():
    w = leer()
    w[1][M], w[4][M] = "Tim", "Paskal"
    abgleich_kern(EBENE, AB, w)
    abgleich_kern(EBENE, AB, w, {(0, M)})  # AB zeigt „(verschieden)“, nichts eingegeben
    assert spalte(w, M)[1:6] == ["Tim", "Tim", "Tim", "Paskal", "Paskal"]


@pytest.mark.parametrize(
    "text", ["15.10.2026", "15.10.26", "15.10", "151026", "15102026", "1510", "15/10/26", "15-10-2026", " 15.10.2026 "]
)
def test_R_W7_datum_kurzformen(text):
    assert datum_aus_text(text, date(2026, 3, 1)) == date(2026, 10, 15)


@pytest.mark.parametrize(
    "text", ["31.02.2026", "32.10", "15.13", "abc", "1.1.2019", "", "15", "15.10.2100", "1.2.3.4", "15.10.20269"]
)
def test_R_W7_datum_ungueltig(text):
    assert datum_aus_text(text, date(2026, 3, 1)) is None


def test_R_W7_jahr_fehlt_nimmt_aktuelles_jahr():
    assert datum_aus_text("15.10", date(2027, 1, 1)) == date(2027, 10, 15)

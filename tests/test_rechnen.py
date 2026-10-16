"""R-S1 bis R-S7, R-T1, R-T2: Rechenkern."""

from datetime import date
from decimal import Decimal as D

import pytest

from bestand import rechnen as r

H = date(2026, 10, 14)


@pytest.mark.parametrize(
    "v, s, status",
    [
        (None, 21, "Offen"),
        (0, 21, "Offen"),
        (-1, 21, "Offen"),
        (10, 21, "Teilweise"),
        (21, 21, "Komplett"),
        (50, 42, "Komplett"),
        (1, 0, "Komplett"),
        (1, None, "Komplett"),
        (None, None, "Offen"),
        ("x", 5, "Offen"),
        (1, D("0.06"), "Komplett"),
    ],
)
def test_R_S1_status_teil(v, s, status):
    assert r.teil(v, s).status == status


def test_R_S2_status_bg_ab_aus_den_teilen():
    k, t, o = r.teil(5, 5), r.teil(2, 5), r.teil(None, 5)
    assert r.sammel([]).status == "-"
    assert r.sammel([k, k]).status == "Komplett"
    assert r.sammel([o, o]).status == "Offen"
    assert r.sammel([k, o]).status == "Teilweise"
    assert r.sammel([t]).status == "Teilweise"


@pytest.mark.parametrize(
    "v, s, p", [(21, 21, 1.0), (None, 21, 0.0), (10, 21, 10 / 21), (1, 1000, 0.01), (999, 1000, 0.99)]
)
def test_R_S3_prozent_teil(v, s, p):
    assert r.teil(v, s).prozent == pytest.approx(p)


def test_R_S4_prozent_sammel_uebermenge_zaehlt_nicht():
    w = r.sammel([r.teil(50, 42), r.teil(None, 42)])
    assert w.prozent == pytest.approx(42 / 84)
    assert r.sammel([r.teil(1, 10000), r.teil(None, 10000)]).prozent == 0.01
    assert r.sammel([r.teil(1, 0), r.teil(None, 0)]).prozent == 0.01  # Soll 0: Excel IFERROR → 0 → 1 %


def test_R_S5_fortschrittstext():
    assert r.teil(10, 21).fortschritt == "10 / 21"
    assert r.teil(None, 21).fortschritt == "0 / 21"
    assert r.teil(50, 42).fortschritt == "50 / 42  (+8 zu viel)"
    assert r.teil(None, D("0.06")).fortschritt == "0 / 0,06"
    assert r.sammel([r.teil(5, 5), r.teil(None, 5)]).fortschritt == "1 von 2"


def test_R_S6_gesamtfortschritt():
    assert r.gesamt([r.teil(50, 42), r.teil(10, 20), r.teil(None, 38)]) == pytest.approx(52 / 100)
    assert r.gesamt([]) == 0.0


def test_R_S7_sortierschluessel():
    assert r.teil(5, 5).sort == -1  # Komplett 0 minus 100 %
    assert r.teil(None, 5).sort == 4
    assert r.teil(2, 5).sort == pytest.approx(2 - 0.4)
    assert r.sammel([]).sort == 4
    abs_ = sorted([r.teil(None, 5), r.teil(4, 5), r.teil(5, 5), r.teil(1, 5)], key=lambda w: w.sort)
    assert [w.fortschritt for w in abs_] == ["5 / 5", "4 / 5", "1 / 5", "0 / 5"]


def test_R_T1_daten_je_teil():
    assert r.daten_stempeln(5, 10, None, None, H) == (H, None)
    assert r.daten_stempeln(10, 10, date(2026, 10, 1), None, H) == (date(2026, 10, 1), H)
    assert r.daten_stempeln(12, 10, date(2026, 10, 1), date(2026, 10, 2), H) == (date(2026, 10, 1), date(2026, 10, 2))
    assert r.daten_stempeln(5, 10, date(2026, 10, 1), date(2026, 10, 2), H) == (date(2026, 10, 1), None)
    assert r.daten_stempeln(0, 10, date(2026, 10, 1), date(2026, 10, 2), H) == (None, None)
    assert r.daten_stempeln(None, 10, date(2026, 10, 1), None, H) == (None, None)


def test_R_T2_daten_bg_ab():
    a = r.teil(5, 5, date(2026, 10, 3), date(2026, 10, 5))
    b = r.teil(5, 5, date(2026, 10, 1), date(2026, 10, 7))
    c = r.teil(2, 5, date(2026, 10, 2), None)
    w = r.sammel([a, b])
    assert (w.eingelagert, w.komplett) == (date(2026, 10, 1), date(2026, 10, 7))
    w = r.sammel([a, c])
    assert (w.eingelagert, w.komplett) == (date(2026, 10, 2), None)  # nicht Komplett → kein Komplett-Datum


def test_R_W1_entnehmen_nur_komplette_ab_bg():
    assert r.sammel([r.teil(5, 5)]).entnehmen
    assert not r.sammel([r.teil(4, 5)]).entnehmen
    assert not r.teil(5, 5).entnehmen

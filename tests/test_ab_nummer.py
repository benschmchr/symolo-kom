"""R-AB1 bis R-AB5: AB-Nummern, Lose, Schlüssel (Beispiele aus der Übergabe und 9.2)."""

import pytest

from bestand.ab_nummer import ab_form, ab_schluessel, forecast_schluessel, los_nr


@pytest.mark.parametrize(
    "ein, aus",
    [
        ("123456", "AB123456"),
        ("ab123456", "AB123456"),
        ("123456 L1", "AB123456 L1"),
        ("Ab123456 / Los 2", "AB123456 / Los 2"),
        ("AB 123456", "AB123456"),
        ("123456-L01", "AB123456-L01"),
        ("  AB2515204  ", "AB2515204"),
        ("AB2616200   /  Los 1", "AB2616200 / Los 1"),
        ("123456X", "123456X"),
        ("-", "-"),
        ("", ""),
        ("Lager", "Lager"),
        ("2616624", "AB2616624"),
    ],
)
def test_R_AB1_anzeigeform(ein, aus):
    assert ab_form(ein) == aus


@pytest.mark.parametrize(
    "rest, los",
    [
        (" L1", "1"),
        ("/ Los 1", "1"),
        ("Los01", "1"),
        ("-L01", "1"),
        (" L 10", "10"),
        (" L0", "0"),
        ("X", ""),
        (" Lager", ""),
        ("", ""),
        (" L", ""),
        (" Los", ""),
    ],
)
def test_R_AB2_losnummer(rest, los):
    assert los_nr(rest) == los


@pytest.mark.parametrize(
    "ein, aus",
    [
        ("AB123456 L1", "AB123456|L1"),
        ("123456 / Los 1", "AB123456|L1"),
        ("AB123456 Los1", "AB123456|L1"),
        ("ab123456", "AB123456"),
        ("123456", "AB123456"),
        ("AB123456 X 2", "AB123456|X2"),
        ("-", "-"),
        ("", ""),
        ("lager a", "LAGERA"),
        ("AB2616200 / Los 1", "AB2616200|L1"),
    ],
)
def test_R_AB3_vergleichsschluessel(ein, aus):
    assert ab_schluessel(ein) == aus


def test_R_AB4_eingabe_findet_vorhandene_schreibweise():
    # Eingabe des Benutzers: erst R-AB1, dann über den Schlüssel die vorhandene Schreibweise
    vorhanden = {ab_schluessel(a): a for a in ["AB2616200 / Los 1", "AB2515204"]}
    assert vorhanden[ab_schluessel(ab_form("2616200 L1"))] == "AB2616200 / Los 1"
    assert vorhanden[ab_schluessel(ab_form("ab2515204"))] == "AB2515204"


@pytest.mark.parametrize(
    "ein, aus",
    [
        ("AB2515204 L1", "AB2515204"),
        ("AB2515204L1", "AB2515204"),
        ("2515204 / Los 2", "AB2515204"),
        ("AB2515204", "AB2515204"),
        ("-", ""),
        ("", ""),
    ],
)
def test_R_AB5_forecast_schluessel(ein, aus):
    assert forecast_schluessel(ein) == aus

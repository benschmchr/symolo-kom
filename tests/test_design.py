"""Design: Tokens aus dem FWM-Designsystem, Schrift lokal, eigene Stile nur über Variablen."""

import json
import re
from pathlib import Path

import pytest

from tools.tokens_erzeugen import QUELLE, ZIEL, css_erzeugen

BASIS = Path(__file__).resolve().parent.parent
STATIC = BASIS / "kern" / "static" / "kern"
HEX = re.compile(r"#[0-9a-fA-F]{3,8}\b")


def test_design_tokens_css_passt_zu_tokens_json():
    erwartet = css_erzeugen(json.loads(QUELLE.read_text(encoding="utf-8")))
    assert ZIEL.read_text(encoding="utf-8") == erwartet, "tools/tokens_erzeugen.py neu laufen lassen"


def test_design_statusfarben_als_tokens_vorhanden():
    css = ZIEL.read_text(encoding="utf-8")
    for t in [
        "status-komplett",
        "status-komplett-bg",
        "status-teilweise",
        "status-teilweise-bg",
        "status-offen",
        "status-offen-bg",
        "on-status",
        "ampel-rot",
        "ampel-gelb",
    ]:
        assert f"--{t}:" in css


def test_design_app_css_ohne_eigene_farbwerte():
    assert not HEX.findall((STATIC / "css" / "app.css").read_text(encoding="utf-8"))


def test_design_listen_css_farben_nur_als_tafelfarben():
    css = (STATIC / "css" / "listen.css").read_text(encoding="utf-8")
    block = css.split(":root {", 1)[1].split("}", 1)[0]
    rest = css.replace(block, "")
    assert not HEX.findall(rest)
    assert all(name.startswith("--tafel-") for name in re.findall(r"(--[a-z-]+):", block))


def test_design_schrift_open_sans_lokal():
    for w in (400, 600, 700):
        assert (STATIC / "fonts" / f"open-sans-latin-{w}-normal.woff2").stat().st_size > 10000
    for f in list(BASIS.glob("*/templates/**/*.html")) + list(STATIC.glob("css/*.css")):
        assert "googleapis" not in f.read_text(encoding="utf-8"), f


def test_design_kopfzeile_nicht_fest_wenn_liste_waagerecht_scrollt():
    """Ben, 14.10.: schmaler als 1440 px scrollt die Liste waagerecht; eine feste Kopfzeile rutschte dann über die
    erste AB-Karte. Dort (und bei „Weitere Spalten“) steht die Kopfzeile deshalb normal im Fluss."""
    css = (STATIC / "css" / "listen.css").read_text(encoding="utf-8")
    regel = css.split("@media (max-width: 1439px) {", 1)[1].split("\n", 1)[0]
    assert (
        ".karten-liste { overflow-x: auto; }" in regel
        and ".karten-liste .kopfzeile" in regel
        and "position: static" in regel
    )
    assert (
        ".karten-liste.alle-spalten .kopfzeile, .karten-liste.alle-spalten .kopfzeile th { position: static; }" in css
    )


@pytest.mark.django_db
def test_konto_icon_neben_dem_benutzernamen(client):
    from .hilfe import benutzer

    assert 'class="konto-icon"' in client.get("/").content.decode()  # Gäste: Symbol mit „Anmelden“
    client.force_login(benutzer("kontotest"))
    html = client.get("/").content.decode()
    assert 'class="konto-link ' in html and 'class="konto-icon"' in html and "<span>kontotest</span>" in html


@pytest.mark.django_db
def test_rueckfragen_als_dialog_in_der_mitte(client):
    from pathlib import Path

    assert "kern/js/dialog.js" in client.get("/").content.decode()
    js = Path("kern/static/kern/js/dialog.js").read_text(encoding="utf-8")
    assert "showModal" in js and "window.FWM" in js
    css = Path("kern/static/kern/css/listen.css").read_text(encoding="utf-8")
    assert ".mitte-dialog::backdrop" in css  # Hintergrund ausgegraut
    for datei in Path("bestand/static/bestand").glob("*.js"):
        assert "window.confirm" not in datei.read_text(encoding="utf-8") and "window.prompt" not in datei.read_text(
            encoding="utf-8"
        )


def test_design_menue_und_konto_formate_15_10():
    """Rechtsklick-Menü klein mit gleich großen Knöpfen, Statistik-Tabelle ohne Kachel-Zahlenschrift, Konto-Knöpfe nebeneinander."""
    listen = (STATIC / "css" / "listen.css").read_text(encoding="utf-8")
    assert ".mitte-dialog:has(.ab-menue)" in listen and ".ab-menue .knopfzeile > *" in listen
    app = (STATIC / "css" / "app.css").read_text(encoding="utf-8")
    assert ".kachel :not(td):not(th).zahl" in app and ".karte-konto .knopfreihe" in app

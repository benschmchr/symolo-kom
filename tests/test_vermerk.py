"""R-P3 Vermerk „Erstellt: Ben Schumacher, 09.10.2026“ auf jeder Seite."""

from pathlib import Path

import pytest

from kern.context_processors import MENUE

pytestmark = pytest.mark.django_db
VERMERK = "Erstellt: Ben Schumacher, 09.10.2026"
SEITEN = ["/", "/anmelden/"] + [f"/{n}/" for n, _, _ in MENUE]  # enthält /dashboard/ (seit Phase 3 echt)


@pytest.mark.parametrize("url", SEITEN)
def test_R_P3_vermerk_in_fusszeile(client, url):
    antwort = client.get(url)
    assert antwort.status_code == 200
    html = antwort.content.decode()
    assert VERMERK in html.split('<footer class="fuss">', 1)[1]
    assert 'name="author" content="Ben Schumacher"' in html


def test_R_P3_vermerk_auch_auf_fehlerseite(client):
    antwort = client.get("/gibt-es-nicht/")
    assert antwort.status_code == 404 and VERMERK in antwort.content.decode()


@pytest.mark.parametrize("url", ["/bestandsliste/", "/regal/"])
def test_design_arbeitsseiten_im_hellen_thema(client, url):
    assert '<html lang="de" data-theme="light">' in client.get(url).content.decode()


def test_R_P3_fusszeile_bleibt_unten_sichtbar():
    css = (Path(__file__).resolve().parent.parent / "kern/static/kern/css/app.css").read_text()
    regel = css.split(".fuss {", 1)[1].split("}", 1)[0]
    assert "position: sticky" in regel and "bottom: 0" in regel

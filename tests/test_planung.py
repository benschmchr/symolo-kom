"""Planung: Häkchen in Dashboard und Forecast (ein gemeinsamer Stand), Reiter „Planung“, Station und Lagerort im Forecast."""

import json
import re

import pytest

from bestand import planung, schweissen, views, views_forecast
from bestand.models import Auftrag, Planungsmarke, Schweisszeile
from kern.rollen import ADMIN, KOMMISSIONIERUNG, STAHLBAU

from .hilfe import HEUTE, LISTE_204, LISTE_624, benutzer, importiere
from .test_dashboard import ab_anlegen
from .test_schweissen import entnehmen_ab, voll

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    for m in (views, schweissen, views_forecast):
        monkeypatch.setattr(m, "heute", lambda: HEUTE, raising=False)


def als(client, name, *rollen):
    client.force_login(benutzer(name, *rollen))
    return client


def haken(client, schluessel, an=True):
    return client.post(
        "/planung/haken/", data=json.dumps({"schluessel": schluessel, "an": an}), content_type="application/json"
    )


def kasten(html, schluessel):
    """Das Häkchen-Feld dieses AB (erstes Vorkommen)."""
    m = re.search(rf'<input type="checkbox" data-plan="{re.escape(schluessel)}"[^>]*>', html)
    assert m, f"kein Häkchen für {schluessel}"
    return m.group(0)


@pytest.fixture
def zwei_abs():
    a = importiere(LISTE_204)
    b = importiere(LISTE_624)
    return a, b


# ---------- Wer darf haken ----------
def test_haken_gast_wird_zur_anmeldung_geleitet(client, zwei_abs):
    a, _ = zwei_abs
    r = haken(client, a.ab_schluessel)
    assert r.status_code == 302 and "/anmelden" in r["Location"] or "login" in r["Location"]
    assert not Planungsmarke.objects.exists()


def test_haken_ohne_rolle_ist_verboten(client, zwei_abs):
    als(client, "ohne")
    assert haken(client, zwei_abs[0].ab_schluessel).status_code == 403
    assert not Planungsmarke.objects.exists()


@pytest.mark.parametrize("rolle", [KOMMISSIONIERUNG, STAHLBAU, ADMIN])
def test_haken_planung_schweissen_admin_duerfen(client, zwei_abs, rolle):
    als(client, "wer", rolle)
    r = haken(client, zwei_abs[0].ab_schluessel)
    assert r.status_code == 200 and r.json()["ok"]
    assert Planungsmarke.objects.get().ab_schluessel == zwei_abs[0].ab_schluessel


def test_haken_unbekannter_ab_wird_abgelehnt(client):
    als(client, "plan", ADMIN)
    assert haken(client, "AB9999999").status_code == 404
    assert haken(client, "").status_code == 404
    assert not Planungsmarke.objects.exists()


def test_haken_setzen_ist_wiederholbar_und_entfernbar(client, zwei_abs):
    als(client, "plan", ADMIN)
    k = zwei_abs[0].ab_schluessel
    haken(client, k), haken(client, k)
    assert Planungsmarke.objects.count() == 1
    haken(client, k, an=False)
    assert not Planungsmarke.objects.exists()


def test_haken_ungueltige_angabe_400(client):
    als(client, "plan", ADMIN)
    r = client.post("/planung/haken/", data="kein json", content_type="application/json")
    assert r.status_code == 400


def test_haken_nur_per_post(client):
    als(client, "plan", ADMIN)
    assert client.get("/planung/haken/").status_code == 405


# ---------- Dashboard und Forecast zeigen denselben Stand ----------
def test_haken_aus_dashboard_steht_auch_im_forecast_und_umgekehrt(client, zwei_abs):
    a, b = zwei_abs
    als(client, "plan", ADMIN)
    haken(client, a.ab_schluessel)
    assert "checked" in kasten(client.get("/dashboard/").content.decode(), a.ab_schluessel)
    assert "checked" in kasten(client.get("/forecast/?termin=alle").content.decode(), a.ab_schluessel)
    assert "checked" not in kasten(client.get("/dashboard/").content.decode(), b.ab_schluessel)
    haken(client, b.ab_schluessel)
    haken(client, a.ab_schluessel, an=False)
    d, f = (client.get(u).content.decode() for u in ("/dashboard/", "/forecast/?termin=alle"))
    for seite in (d, f):
        assert "checked" not in kasten(seite, a.ab_schluessel) and "checked" in kasten(seite, b.ab_schluessel)


def test_haken_gilt_fuer_alle_benutzer(client, zwei_abs):
    a, _ = zwei_abs
    als(client, "plan", ADMIN)
    haken(client, a.ab_schluessel)
    client.logout()
    html = client.get("/dashboard/").content.decode()  # Gast sieht es, kann es aber nicht ändern
    k = kasten(html, a.ab_schluessel)
    assert "checked" in k and "disabled" in k


def test_haken_nicht_aenderbar_ohne_rolle_im_html(client, zwei_abs):
    als(client, "ohne")
    assert "disabled" in kasten(client.get("/dashboard/").content.decode(), zwei_abs[0].ab_schluessel)
    als(client, "plan", ADMIN)
    assert "disabled" not in kasten(client.get("/dashboard/").content.decode(), zwei_abs[0].ab_schluessel)


def test_spalte_planung_im_kopf_von_dashboard_und_forecast(client, zwei_abs):
    for url in ("/dashboard/", "/forecast/?termin=alle"):
        kopf = client.get(url).content.decode().split('<table class="tabelle kopfzeile">', 1)[1].split("</thead>", 1)[0]
        assert re.findall(r"<th[^>]*>([^<]*)</th>", kopf)[-1] == "Planung"


# ---------- Reiter Planung ----------
def test_planung_zeigt_nur_gehakte_abs_mit_bg_und_teilen(client, zwei_abs):
    a, b = zwei_abs
    als(client, "plan", ADMIN)
    html = client.get("/planung/?ansicht=alles").content.decode()
    assert "Noch kein Arbeitsauftrag zur Planung vorgemerkt" in html
    haken(client, a.ab_schluessel)
    html = client.get("/planung/?ansicht=alles").content.decode()
    assert a.ab_anzeige in html and b.ab_anzeige not in html
    assert "100 HALTER ANZEIGEGERAET GE" in html and "SK1145-977452.005.0" in html  # BG und Teil wie im Dashboard
    assert 'data-plan="%s"' % a.ab_schluessel in html and "Liefertermin" in html and "Station" in html


def test_planung_abhaken_nimmt_ab_heraus(client, zwei_abs):
    a, _ = zwei_abs
    als(client, "plan", ADMIN)
    haken(client, a.ab_schluessel)
    haken(client, a.ab_schluessel, an=False)
    assert a.ab_anzeige not in client.get("/planung/").content.decode().split("<h1>", 1)[1]


def test_planung_ist_fuer_gaeste_lesbar_und_im_menue(client, zwei_abs):
    r = client.get("/planung/")
    assert (
        r.status_code == 200 and 'href="/planung/"' in r.content.decode() and 'href="/statistik/"' in r.content.decode()
    )


def test_planung_sortierung_nach_liefertermin_ohne_termin_unten(client):
    for n in ("AB2600001", "AB2600002"):
        ab_anlegen(n, ohne=[("Z1", "1", None)])
    als(client, "plan", ADMIN)
    for n in ("AB2600001", "AB2600002"):
        haken(client, n)
    for sort in ("termin", "ab", "auf", "unsinn"):
        assert client.get(f"/planung/?sort={sort}").status_code == 200


# ---------- Das Häkchen folgt dem AB ----------
def test_haken_bleibt_beim_entnehmen_und_faellt_beim_archivieren_weg(client):
    a = importiere(LISTE_204)
    voll(a)
    als(client, "plan", ADMIN, STAHLBAU)
    haken(client, a.ab_schluessel)
    entnehmen_ab(client, a)
    assert Planungsmarke.objects.filter(ab_schluessel=a.ab_schluessel).exists()
    html = client.get("/planung/?ansicht=alles").content.decode()
    assert a.ab_anzeige in html and "Schweißen" in html  # liegt im Schweißen, bleibt in der Planung
    ab_zeile = Schweisszeile.objects.get(ebene="AB")
    schweissen.archivieren(ab_zeile.id)
    assert not Planungsmarke.objects.exists()
    assert a.ab_anzeige not in client.get("/planung/").content.decode().split("<h1>", 1)[1]


def test_haken_faellt_beim_loeschen_aus_der_bestandsliste_weg(client):
    a = importiere(LISTE_204)
    als(client, "plan", ADMIN)
    haken(client, a.ab_schluessel)
    client.post(f"/bestandsliste/ab/{a.id}/loeschen/", follow=True)
    assert not Auftrag.objects.filter(id=a.id).exists() and not Planungsmarke.objects.exists()


# ---------- Station und Lagerort im Forecast ----------
def forecast_zeile(html, nr):
    return html.split(f">{nr}<", 1)[1].split("</tr>", 1)[0]


def test_forecast_station_bestandsliste_mit_lagerort(client):
    a = importiere(LISTE_204)
    from bestand import lagerort

    lagerort.setze_ab(a, "L2")
    html = client.get("/forecast/?termin=alle").content.decode()
    zeile = forecast_zeile(html, a.ab_anzeige)
    assert 'data-feld="station">Kom.<' in zeile and 'data-feld="ort">L2<' in zeile


def test_forecast_station_schweissen_mit_arbeitsplatz(client):
    a = importiere(LISTE_204)
    voll(a)
    als(client, "plan", ADMIN, STAHLBAU)
    entnehmen_ab(client, a)
    client.post(
        f"/schweissen/zeile/{Schweisszeile.objects.get(ebene='AB').id}/eintragen/",
        {"feld": "arbeitsplatz", "wert": "AP04"},
    )
    html = client.get("/forecast/?termin=alle&ansicht=alles").content.decode()
    zeile = forecast_zeile(html, a.ab_anzeige)
    assert 'data-feld="station">Schw.<' in zeile and 'data-feld="ort">AP04<' in zeile
    assert "Kom." not in zeile


def test_forecast_station_einzelne_bg_im_schweissen(client):
    a = importiere(LISTE_204)
    from bestand import lagerort

    lagerort.setze_ab(a, "L3")
    voll(a, "100")
    als(client, "plan", ADMIN, STAHLBAU)
    from .test_schweissen import entnehmen_bg

    entnehmen_bg(client, a, "100")
    z = Schweisszeile.objects.filter(ebene="BG").first()
    client.post(f"/schweissen/zeile/{z.id}/eintragen/", {"feld": "arbeitsplatz", "wert": "AP02"})
    html = client.get("/forecast/?termin=alle").content.decode()
    zeile = forecast_zeile(html, a.ab_anzeige)
    assert planung.STATION_BEIDE in zeile and "L3" in zeile and "AP02" in zeile


def test_orte_setzen_bg_und_teile_in_der_bestandsliste():
    from bestand import ansicht, dashboard, lagerort

    a = importiere(LISTE_204)
    bg = a.baugruppen.order_by("zeile").first()
    lagerort.setze_bg(bg, "R4")
    liste = dashboard.sortieren(ansicht.baum())
    planung.orte_setzen(liste)
    g = next(g for g in liste[0].gruppen if g.bg and g.bg.o.id == bg.id)
    assert g.station == planung.STATION_BESTAND and g.ort == "R4" and {t.ort for t in g.teile} == {"R4"}

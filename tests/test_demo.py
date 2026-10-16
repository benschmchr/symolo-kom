"""Demo-Daten (Befehl demo_daten): erfundene ABs in allen Lagen, regelkonform, wiederholbar und wieder entfernbar."""

import io

import pytest
from django.core.management import call_command

from bestand import demo, forecast, rechnen, schweissen, statistik, views, views_forecast
from bestand.ab_nummer import ab_form
from bestand.models import (
    Aenderung,
    Archivvorgang,
    Auftrag,
    ForecastZeile,
    Mitarbeiter,
    Planungsmarke,
    Protokolleinstellung,
    Schweisszeile,
)
from kern.rollen import ADMIN

from .hilfe import HEUTE, LISTE_204, benutzer, importiere

pytestmark = pytest.mark.django_db

DEMO = demo.demo_schluessel()
DEMO_FC = demo.demo_forecast_schluessel()
ANZEIGEN = [ab_form(n) for n in demo.demo_nummern()]


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    for m in (views, schweissen, views_forecast):
        monkeypatch.setattr(m, "heute", lambda: HEUTE, raising=False)


def staende():
    """Alles, was die Demo-Daten nicht anfassen dürfen, als Vergleichswert."""
    return (
        sorted(Auftrag.objects.exclude(ab_schluessel__in=DEMO).values_list("ab_schluessel", "kunde")),
        Schweisszeile.objects.exclude(ab_schluessel__in=DEMO).count(),
        Archivvorgang.objects.exclude(ab_schluessel__in=DEMO).count(),
        sorted(ForecastZeile.objects.exclude(schluessel__in=DEMO_FC).values_list("schluessel", "termin"), key=str),
        Aenderung.objects.exclude(ab__in=ANZEIGEN).count(),
    )


def test_R_S4_demo_abs_zeigen_alle_drei_status():
    demo.anlegen(HEUTE)
    from bestand import ansicht

    status = {a.o.ab_anzeige: a.w.status for a in ansicht.baum() if demo.ist_demo(a.o.ab_schluessel)}
    assert {rechnen.KOMPLETT, rechnen.TEILWEISE, rechnen.OFFEN} <= set(status.values())
    assert status["AB2616902 / Los 1"] == rechnen.KOMPLETT and status["AB2616902 / Los 2"] == rechnen.TEILWEISE


def test_R_AB3_zweiter_lauf_legt_nichts_doppelt_an():
    demo.anlegen(HEUTE)
    vorher = (Auftrag.objects.count(), Schweisszeile.objects.count(), Archivvorgang.objects.count())
    protokoll, forecast_zeilen = Aenderung.objects.count(), ForecastZeile.objects.count()
    z = demo.anlegen(HEUTE)
    assert (z["aktiv"], z["archiviert"], z["geloescht"], z["forecast"], z["geplant"]) == (0, 0, 0, 0, 0)
    assert z["uebersprungen"] == len(demo.AKTIV) + len(demo.archivierte(HEUTE)) + len(demo.GELOESCHT)
    assert vorher == (Auftrag.objects.count(), Schweisszeile.objects.count(), Archivvorgang.objects.count())
    assert (protokoll, forecast_zeilen) == (Aenderung.objects.count(), ForecastZeile.objects.count())


def test_R_F4_vorhandene_daten_und_forecast_bleiben_dann_entfernen():
    importiere(LISTE_204)
    forecast.speichern(forecast.lesen(_forecast_datei(), "vorhanden.xlsx"))
    vorher = staende()
    termine_vorher = forecast.termine()
    demo.anlegen(HEUTE)
    assert staende() == vorher  # nichts Bestehendes verändert
    assert forecast.aktuell().datei == "vorhanden.xlsx"  # der Forecast wurde ergänzt, nicht ersetzt
    assert forecast.termine()["AB2515204"] == termine_vorher["AB2515204"]
    z = demo.entfernen()
    assert z["archiv"] == len(demo.archivierte(HEUTE)) + 2 and z["planung"] == 4
    assert staende() == vorher
    assert not Mitarbeiter.objects.exists() and not Planungsmarke.objects.exists()
    assert demo.vorhanden() == {"AB2515204"}


def _forecast_datei():
    from bestand.management.commands.beispieldaten import beispiel_forecast

    return beispiel_forecast(HEUTE)


def test_R_F7_demo_forecast_hat_rot_gelb_und_weiss():
    demo.anlegen(HEUTE)
    assert forecast.aktuell().datei == demo.FORECAST_DATEI  # ohne Forecast entsteht ein eigener
    termine = forecast.termine()
    ampeln = {forecast.ampel(t, HEUTE) for k, t in termine.items() if k in DEMO_FC}
    assert ampeln == {forecast.ROT, forecast.GELB, forecast.WEISS}
    assert any(t < HEUTE for k, t in termine.items() if k in DEMO_FC)  # überfällig
    demo.entfernen()
    assert forecast.aktuell() is None  # der Demo-Forecast geht ganz weg


def test_R_W6_demo_schweissen_hat_gruppen_und_verschiedene_plaetze():
    demo.anlegen(HEUTE)
    bg = Schweisszeile.objects.filter(ab_schluessel="AB2615903", ebene="BG")
    assert bg.count() == 3 and len({z.arbeitsplatz for z in bg}) == 3
    assert any("," in z.mitarbeiter for z in bg)  # Mitarbeitergruppe
    ab = next(z for z in schweissen.lesen() if z.ab_schluessel == "AB2615903" and z.ebene == "AB")
    assert ab.p == schweissen.VERSCHIEDEN and ab.m == schweissen.VERSCHIEDEN
    # aufgeteilter AB: eine BG im Schweißen, der Rest noch in der Bestandsliste
    assert Schweisszeile.objects.filter(ab_schluessel="AB2515904", ebene="BG").count() == 1
    assert Auftrag.objects.get(ab_schluessel="AB2515904").baugruppen.count() == 2


def test_R_L4_demo_lagerorte_sind_gueltig_und_verschieden():
    from bestand import lagerort

    demo.anlegen(HEUTE)
    plaetze = set(
        Auftrag.objects.filter(ab_schluessel__in=DEMO).exclude(lagerort="").values_list("lagerort", flat=True)
    )
    for a in Auftrag.objects.filter(ab_schluessel__in=DEMO):
        plaetze |= {b.lagerort for b in a.baugruppen.exclude(lagerort="")}
    assert len(plaetze) >= 8 and all(lagerort.ist_gueltig(p) for p in plaetze)
    assert Auftrag.objects.get(ab_schluessel="AB2615901").regal_geteilt


def test_R_X2_demo_archiv_reicht_ueber_monate_und_zaehlt_in_der_statistik():
    demo.anlegen(HEUTE)
    vorgaenge = Archivvorgang.objects.filter(ab_schluessel__in=DEMO)
    tage = [(HEUTE - v.geloescht_am.date()).days for v in vorgaenge]
    assert max(tage) > 300 and min(tage) < 5
    assert {v.herkunft for v in vorgaenge} == {"Archiviert aus Schweißen", "Gelöscht aus Bestandsliste"}
    archiviert = [e for e in statistik.aus_archiv() if e.archiviert and e.art == "ab"]
    assert len(archiviert) == len(demo.archivierte(HEUTE))
    puenktlich = [e for e in archiviert if e.tv <= e.lt]
    assert 0.5 * len(archiviert) < len(puenktlich) < len(archiviert)  # pünktliche und verspätete gemischt
    assert all(e.dlz and e.dlz > 0 for e in archiviert)


def test_R_P1_demo_planung_und_protokoll_haben_inhalt():
    demo.anlegen(HEUTE)
    assert Planungsmarke.objects.filter(ab_schluessel__in=DEMO).count() == 4
    arten = set(Aenderung.objects.filter(ab__in=ANZEIGEN).values_list("art", flat=True))
    assert {"import", "menge", "lagerort", "entnommen", "schweissen", "archiviert", "geloescht"} <= arten
    assert not Aenderung.objects.filter(benutzer__isnull=False).exists()  # keine echten Konten


def test_R_P1_ausgeschaltetes_protokoll_bleibt_leer():
    Protokolleinstellung.objects.update_or_create(pk=1, defaults={"aktiv": False})
    demo.anlegen(HEUTE)
    assert not Aenderung.objects.exists()


def test_R_P1_ohne_namen_keine_namen_im_protokoll():
    Protokolleinstellung.objects.update_or_create(pk=1, defaults={"namen": False})
    demo.anlegen(HEUTE)
    assert Aenderung.objects.exists() and not Aenderung.objects.exclude(benutzer_name="").exists()


def test_R_AB6_demo_seiten_laden_mit_inhalt(client):
    demo.anlegen(HEUTE)
    client.force_login(benutzer("chef", ADMIN))
    for url, text in [
        ("/dashboard/", "AB2615901"),
        ("/bestandsliste/", "AB2616901"),
        ("/regal/", "AB2515903"),
        ("/schweissen/", "AB2615903"),
        ("/arbeitsplaetze/", "Demo Chris"),
        ("/forecast/?zeitraum=alle", "AB2515901"),
        ("/planung/", "AB2615904"),
        ("/statistik/", "Liefertreue"),
        ("/archiv/", ab_form(demo.archiv_nummer(len(demo.archivierte(HEUTE)) - 1))),
        ("/protokoll/", "AB2515901"),
    ]:
        antwort = client.get(url)
        assert antwort.status_code == 200, url
        assert text in antwort.content.decode(), url


def test_befehl_legt_an_und_entfernt():
    aus = io.StringIO()
    call_command("demo_daten", stdout=aus)
    assert "Demo-Daten angelegt" in aus.getvalue() and Auftrag.objects.filter(ab_schluessel="AB2515901").exists()
    aus = io.StringIO()
    call_command("demo_daten", "--entfernen", stdout=aus)
    assert "Demo-Daten entfernt" in aus.getvalue() and not Auftrag.objects.exists()


def test_R_AB3_echter_ab_mit_demo_nummer_wird_uebersprungen_und_bleibt():
    echt = Auftrag.objects.create(
        ab_anzeige="AB2515901", ab_schluessel="AB2515901", kunde="Echt", quelldatei="echt.xlsx"
    )
    z = demo.anlegen(HEUTE)
    assert z["uebersprungen"] == 1
    demo.entfernen()
    assert Auftrag.objects.get(id=echt.id).kunde == "Echt"
    assert Auftrag.objects.count() == 1


def test_R_ST1_archiv_belegt_jede_kalenderwoche_und_jeden_monat():
    demo.anlegen(HEUTE)
    versand = [e.tv for e in statistik.aus_archiv() if e.archiviert and e.art == "ab"]
    wochen = {d.isocalendar()[:2] for d in versand}
    assert set(statistik.letzte_kws(HEUTE, demo.WOCHEN)) <= wochen
    monate = {(d.year, d.month) for d in versand}
    assert set(statistik.letzte_monate(HEUTE, 12)) <= monate
    archiv_am = [v.geloescht_am.date() for v in Archivvorgang.objects.filter(ab_schluessel__in=DEMO)]
    assert all(d <= HEUTE for d in archiv_am)


def test_R_AB3_demo_nummern_sind_eindeutig_im_bereich_900_bis_999():
    nummern = [n for n in demo.demo_nummern()]
    assert len(set(demo.demo_schluessel())) == len(nummern)
    assert all(900 <= int(n.split(" ")[0][4:]) <= 999 for n in nummern)


def test_R_AB3_frueherer_demo_stand_wird_beim_entfernen_mit_gelöscht():
    """Ein Demo-AB im festen Bereich, der nicht (mehr) in der Liste steht (älterer Stand), geht mit weg."""
    alt = Auftrag.objects.create(ab_anzeige="AB2515999", ab_schluessel="AB2515999", quelldatei=demo.QUELLE)
    echt = Auftrag.objects.create(ab_anzeige="AB2515204", ab_schluessel="AB2515204", quelldatei="echt.xlsx")
    demo.entfernen()
    assert not Auftrag.objects.filter(id=alt.id).exists() and Auftrag.objects.filter(id=echt.id).exists()


def _mittel(balken):
    return sum(b.wert for b in balken) / len(balken)


def test_R_ST1_statistik_zeigt_aufwaertstrend_ohne_luecken_und_nicht_ueberall_100():
    demo.anlegen(HEUTE)
    e = statistik.alle_eintraege()
    for art in ("ab", "teil"):
        monat = statistik.liefertreue_monat(e, art, HEUTE)
        ia = statistik.liefertreue_ia(e, art, HEUTE)
        for reihe in (monat, ia):
            assert all(b.wert is not None for b in reihe)  # keine Lücke
            assert any(b.wert < 100 for b in reihe)  # nicht überall 100 %
        assert len({b.wert for b in ia}) > 4  # Unregelmäßigkeiten
        assert _mittel(ia[-4:]) >= _mittel(ia[:4]) + 10  # Liefertreue steigt
    ia = statistik.liefertreue_ia(e, "ab", HEUTE)
    assert 50 <= _mittel(ia[:3]) <= 70 and 80 <= _mittel(ia[-2:]) <= 95  # etwa 55 % bis 90 %
    for zeit in ("woche", "monat", "jahr"):
        assert all(b.wert is not None for b in statistik.durchlaufzeit(e, zeit, HEUTE))  # keine Lücke
    jahr = statistik.durchlaufzeit(e, "jahr", HEUTE)
    assert _mittel(jahr[:4]) >= _mittel(jahr[-4:]) + 5  # Durchlaufzeit sinkt
    assert any(jahr[i].wert < jahr[i - 1].wert for i in range(1, 12)) and any(
        jahr[i].wert > jahr[i - 1].wert for i in range(1, 12)
    )  # mit Ausreißern in beide Richtungen
    woche = statistik.durchlaufzeit(e, "woche", HEUTE)
    assert _mittel(woche[:3]) > _mittel(woche[-3:])
    balken, summe = statistik.verspaetung(e, HEUTE)
    assert all(b.wert is not None for b in balken)  # jeder Monat belegt
    assert _mittel(balken[:4]) >= _mittel(balken[-4:]) + 1  # Verspätung sinkt
    assert summe["spaet"] > 0 and summe["spaet"] < summe["versandt"]
    assert len(statistik.ueberfaellig(e, HEUTE)) >= 1


def test_R_ST1_demo_werte_sind_fest_und_wiederholbar():
    assert [(d.nr, d.ein, d.zuweisung) for d in demo.archivierte(HEUTE)] == [
        (d.nr, d.ein, d.zuweisung) for d in demo.archivierte(HEUTE)
    ]

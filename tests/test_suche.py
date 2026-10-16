"""Suche von überall (R-SU1 bis R-SU4): ABs und Baugruppen in Bestandsliste und Schweißen."""

import pytest
from django.urls import reverse

from bestand import archiv, lagerort, suche
from bestand.models import Auftrag, Schweisszeile, Teil
from kern.rollen import ADMIN

from .hilfe import LISTE_204, LISTE_624, benutzer, importiere

pytestmark = pytest.mark.django_db


def sw(nr, ebene, anzeige="AB2999001", bg="", **kw):
    return Schweisszeile.objects.create(
        nr=nr,
        ab_nr="AB2999001",
        ab_schluessel="AB2999001",
        anzeige=anzeige,
        ebene=ebene,
        baugruppe=bg,
        kopf={"kunde": "Rheinmetall"},
        **kw,
    )


@pytest.fixture
def daten():
    a = importiere(LISTE_204)
    sw(1, "AB", benennung="Gehäuse vollständig", arbeitsplatz="Platz 3", mitarbeiter="Anna")
    sw(2, "BG", bg="100 Deckel", arbeitsplatz="Platz 3", mitarbeiter="Anna")
    sw(3, "BG", bg="200 Boden", arbeitsplatz="Platz 3", mitarbeiter="Anna")
    sw(4, "Teil", bg="200 Boden", zeichnungsnummer="ZZ-4711", benennung="Winkel")
    archiv.loeschen(importiere(LISTE_624).id)
    return a


def html(client, q):
    r = client.get(reverse("suche_treffer"), {"q": q})
    assert r.status_code == 200
    return r.content.decode()


def test_R_SU1_ungeteilter_ab_ist_ein_vorschlag_mit_kunde_lagerort_fortschritt(client, daten):
    daten.lagerort = "R1"
    daten.save()
    h = html(client, "2515204")
    assert "AB2515204" in h and "_BG" not in h
    assert "Kunde: KNDS" in h and "Lagerort: " in h and "Fortschritt: 0 %" in h
    assert f"?ab={daten.id}" in h


def test_R_SU1_baugruppenname_findet_den_ungeteilten_ab(client, daten):
    h = html(client, "ACHSE")
    assert "AB2515204" in h and "_BG" not in h


def test_R_SU1_aufgesplittet_zeigt_die_einzelnen_baugruppen(client, daten):
    lagerort.teilen(daten)
    h = html(client, "2515204")
    assert "AB2515204_BG100" in h and "AB2515204_BG300" in h
    assert "Kunde: KNDS" in h and "Fortschritt:" in h
    h = html(client, "ACHSE")  # nur die passende Baugruppe
    assert "AB2515204_BG300" in h and "AB2515204_BG100" not in h


def test_R_SU1_bg_im_schweissen_macht_die_restlichen_einzeln(client, daten):
    sw(5, "BG", anzeige="AB2515204_BG100", bg="100 HALTER")
    Schweisszeile.objects.filter(anzeige="AB2515204_BG100").update(ab_nr="AB2515204", ab_schluessel=daten.ab_schluessel)
    h = html(client, "2515204")
    assert "AB2515204_BG200" in h and "AB2515204_BG300" in h
    assert 'href="/bestandsliste/?ab=' in h and "<strong>AB2515204</strong>" not in h


def test_R_SU1_zeichnungsnummer_nur_bei_vollstaendiger_eingabe(client, daten):
    t = Teil.objects.filter(auftrag=daten, baugruppe__isnull=False).exclude(zeichnungsnummer="").first()
    h = html(client, t.zeichnungsnummer)  # vollständig → der AB, in dem das Teil steht
    assert "AB2515204" in h
    assert "Kein Treffer" in html(client, t.zeichnungsnummer[:-1])  # nur ein Stück → kein Treffer über Teile
    lagerort.teilen(daten)
    assert f"AB2515204_BG{t.baugruppe.kurz}" in html(client, t.zeichnungsnummer)  # aufgesplittet → seine Baugruppe
    h = html(client, "ZZ-4711")  # im Schweißen
    assert "AB2999001" in h and "Schweißen" in h
    assert "Kein Treffer" in html(client, "ZZ-471")


def test_R_SU1_lk_kunde_und_archiv_werden_nicht_gesucht(client, daten):
    assert "Kein Treffer" in html(client, "KNDS")
    assert "Kein Treffer" in html(client, "2616624")  # gelöscht, nur im Archiv
    assert [g.schluessel for g in suche.suchen("2515204", None)] == ["bestand"]


def test_R_SU1_schweissen_ungeteilt_und_aufgesplittet(client, daten):
    h = html(client, "2999001")
    assert "Schweißen" in h and "AB2999001" in h and "_BG" not in h
    assert "Kunde: Rheinmetall" in h and "Arbeitsplatz: Platz 3" in h and "Mitarbeiter: Anna" in h
    assert "Gehäuse vollständig" in h and "/schweissen/?q=AB2999001" in h
    assert "AB2999001" in html(client, "Boden")  # über den Namen einer Baugruppe
    Schweisszeile.objects.filter(ebene="AB").update(ap_geteilt=True)
    h = html(client, "2999001")
    assert "AB2999001_BG100" in h and "AB2999001_BG200" in h
    h = html(client, "Boden")
    assert "AB2999001_BG200" in h and "AB2999001_BG100" not in h


def test_R_SU1_zu_kurz_und_kein_treffer(client, daten):
    assert "mindestens 2 Zeichen" in html(client, "a")
    assert suche.suchen("a", None) == []
    assert "Kein Treffer" in html(client, "gibtesnicht99")


def test_R_SU2_kurzliste_begrenzt_und_zeigt_rest(client, daten):
    for i in range(suche.JE_BEREICH + 3):
        Auftrag.objects.create(ab_anzeige=f"AB77{i:04d}", ab_schluessel=f"AB77{i:04d}", reihenfolge=900 + i)
    g = next(x for x in suche.suchen("AB77", None) if x.schluessel == "bestand")
    assert len(g.treffer) == suche.JE_BEREICH and g.gesamt == suche.JE_BEREICH + 3 and g.mehr == 3
    assert "3 weitere in Bestandsliste" in html(client, "AB77")


def test_R_SU3_bereiche_mit_rollen_bleiben_fuer_gaeste_zu(client, daten, monkeypatch):
    nur_planung = ("planung", "Nur Planung", lambda q: ([suche.Treffer("X", "", [], "/x/")], "/x/"), (ADMIN,))
    monkeypatch.setattr(suche, "BEREICHE", suche.BEREICHE + [nur_planung])
    assert "Nur Planung" not in html(client, "2515204")
    client.force_login(benutzer("plan", ADMIN))
    assert "Nur Planung" in html(client, "2515204")


def test_R_SU3_suche_aendert_nichts_und_seite_laeuft_ohne_javascript(client, daten):
    vorher = (Auftrag.objects.count(), Schweisszeile.objects.count())
    r = client.get(reverse("suche"), {"q": "2515204"})
    assert r.status_code == 200 and "AB2515204" in r.content.decode()
    assert client.post(reverse("suche"), {"q": "x"}).status_code in (200, 405)
    assert vorher == (Auftrag.objects.count(), Schweisszeile.objects.count())


def test_R_SU4_suchfeld_in_der_kopfleiste_auf_jeder_seite(client, daten):
    h = client.get(reverse("bestandsliste")).content.decode()
    assert 'id="suche-feld"' in h and 'class="knopf knopf-klein suche-knopf"' in h

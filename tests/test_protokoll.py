"""Änderungsprotokoll (W7, Übergabe Abschnitt 6): wer hat wann welche Menge / welchen Platz geändert.
Betriebsrat/Datenschutz sind offen: abschaltbar, ohne Namen, begrenzte Aufbewahrung, leeren, nur Admin sieht es."""

from datetime import timedelta

import pytest
from django.utils import timezone

from bestand import protokoll, rechnen, views
from bestand.models import Aenderung, Teil
from kern.rollen import ADMIN, KOMMISSIONIERUNG, STAHLBAU

from .hilfe import HEUTE, LISTE_204, benutzer, importiere

pytestmark = pytest.mark.django_db
ZN = "SK1990-977452.002.0"


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    monkeypatch.setattr(views, "heute", lambda: HEUTE)


@pytest.fixture
def ab():
    return importiere(LISTE_204)


@pytest.fixture
def lager(client):
    client.force_login(benutzer("lager", KOMMISSIONIERUNG, first_name="Lena", last_name="Lager"))
    return client


def teil():
    return Teil.objects.get(auftrag__ab_schluessel="AB2515204", zeichnungsnummer=ZN)


def einstellen(**kw):
    e = protokoll.einstellung()
    for k, v in kw.items():
        setattr(e, k, v)
    e.save()


def test_W7_menge_mit_wer_wann_alt_neu(lager, ab):
    t = teil()
    lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": "3"})
    lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": "3"})  # gleicher Wert: kein Eintrag
    lager.post(f"/bestandsliste/teil/{t.id}/umschalten/")
    e = list(Aenderung.objects.order_by("id"))
    assert [(x.art, x.ab, x.alt, x.neu, x.benutzer_name) for x in e] == [
        ("menge", "AB2515204", "leer", "3", "Lena Lager"),
        ("menge", "AB2515204", "3", e[1].neu, "Lena Lager"),
    ]
    assert ZN in e[0].objekt and "BG" in e[0].objekt
    assert abs(e[0].zeit - timezone.now()) < timedelta(minutes=1)


def test_W7_alles_vorhanden_je_teil_ein_eintrag(lager, ab):
    lager.post(f"/bestandsliste/ab/{ab.id}/alles/")
    n = Teil.objects.filter(auftrag=ab).exclude(menge_gesamt=None).count()
    assert Aenderung.objects.filter(art="menge").count() == n


def test_W7_lagerort(lager, ab):
    bg = ab.baugruppen.order_by("zeile").first()
    lager.post("/regal/platz/", {"bg": bg.id, "platz": "l2"})
    lager.post("/regal/platz/", {"ab": ab.id, "platz": "R3"})
    e = list(Aenderung.objects.filter(art="lagerort").order_by("id"))
    assert [(x.objekt, x.alt, x.neu) for x in e] == [(f"BG {bg.name}", "leer", "L2"), ("", e[1].alt, "R3")]


def test_W7_soll_import_loeschen_wiederherstellen(client, ab):
    client.force_login(benutzer("chef", ADMIN))
    t = teil()
    client.post(
        f"/bestandsliste/ab/{ab.id}/bearbeiten/",
        {
            f"soll_{x.id}": (
                "7" if x.id == t.id else (rechnen.zahl_text(x.menge_gesamt) if x.menge_gesamt is not None else "")
            )
            for x in Teil.objects.filter(auftrag=ab)
        },
    )
    soll = Aenderung.objects.get(art="soll")
    assert soll.neu == "7" and ZN in soll.objekt
    client.post(f"/bestandsliste/ab/{ab.id}/loeschen/")
    from bestand.models import Archivvorgang

    client.post(f"/archiv/{Archivvorgang.objects.get().id}/wiederherstellen/")
    assert list(Aenderung.objects.order_by("id").values_list("art", flat=True)) == [
        "soll",
        "geloescht",
        "wiederhergestellt",
    ]


def test_W7_import_ueber_die_seite(client):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client.force_login(benutzer("planung", ADMIN))
    datei = SimpleUploadedFile(LISTE_204.name, LISTE_204.read_bytes())
    client.post("/bestandsliste/import/", {"dateien": [datei]})
    client.post("/bestandsliste/import/pruefen/")
    e = Aenderung.objects.get()
    assert e.art == "import" and e.ab == "AB2515204" and e.neu == LISTE_204.name and e.benutzer_name == "planung"


def test_W7_abschalten(lager, ab):
    einstellen(aktiv=False)
    lager.post(f"/bestandsliste/teil/{teil().id}/vorhanden/", {"wert": "3"})
    assert not Aenderung.objects.exists()
    assert teil().vorhanden == 3  # die Arbeit selbst geht weiter


def test_W7_ohne_namen(lager, ab):
    einstellen(namen=False)
    lager.post(f"/bestandsliste/teil/{teil().id}/vorhanden/", {"wert": "3"})
    e = Aenderung.objects.get()
    assert e.benutzer is None and e.benutzer_name == "" and e.neu == "3"


def test_W7_aufbewahrung(ab):
    einstellen(tage=30)
    Aenderung.objects.create(zeit=timezone.now() - timedelta(days=31), art="menge", ab="AB1")
    Aenderung.objects.create(zeit=timezone.now() - timedelta(days=29), art="menge", ab="AB2")
    protokoll.schreiben(None, "menge", "AB3")
    assert sorted(Aenderung.objects.values_list("ab", flat=True)) == ["AB2", "AB3"]
    einstellen(tage=0)  # 0 = unbegrenzt
    Aenderung.objects.create(zeit=timezone.now() - timedelta(days=3000), art="menge", ab="AB0")
    protokoll.schreiben(None, "menge", "AB4")
    assert Aenderung.objects.count() == 4


def test_W7_nur_admin_sieht_und_stellt_ein(client, ab):
    for url in ("/protokoll/",):
        assert client.get(url).status_code == 302  # Gast → Anmeldung
    for rolle in (KOMMISSIONIERUNG, STAHLBAU):
        client.force_login(benutzer(f"u_{rolle}", rolle))
        assert client.get("/protokoll/").status_code == 403
        assert client.post("/protokoll/einstellen/", {"tage": "1"}).status_code == 403
        assert client.post("/protokoll/leeren/", {"sicher": "ja"}).status_code == 403
        assert 'href="/protokoll/"' not in client.get("/").content.decode()
    client.force_login(benutzer("chef", ADMIN))
    assert client.get("/protokoll/").status_code == 200
    assert 'href="/protokoll/"' in client.get("/").content.decode()


def test_W7_einstellungen_ueber_die_seite(client, ab):
    client.force_login(benutzer("chef", ADMIN))
    protokoll.schreiben(benutzer("x", KOMMISSIONIERUNG), "menge", "AB1", "Teil 1", "1", "2")
    r = client.post("/protokoll/einstellen/", {"aktiv": "1", "tage": "60"}, follow=True)  # Namen aus
    assert "Namen aus 1 Einträgen entfernt" in r.content.decode()
    e = protokoll.einstellung()
    assert e.aktiv and not e.namen and e.tage == 60
    assert Aenderung.objects.get().benutzer_name == ""
    assert "ohne Namen" in client.get("/protokoll/").content.decode()
    client.post("/protokoll/einstellen/", {"tage": "abc"})
    assert protokoll.einstellung().tage == 60
    client.post("/protokoll/einstellen/", {"tage": "0"})
    assert not protokoll.einstellung().aktiv
    assert "ausgeschaltet" in client.get("/protokoll/").content.decode()


def test_W7_leeren_nur_mit_bestaetigung(client, ab):
    client.force_login(benutzer("chef", ADMIN))
    protokoll.schreiben(None, "menge", "AB1")
    client.post("/protokoll/leeren/")
    assert Aenderung.objects.count() == 1
    client.post("/protokoll/leeren/", {"sicher": "ja"})
    assert not Aenderung.objects.exists()


def test_W7_seite_zeigt_und_filtert(client, ab):
    client.force_login(benutzer("chef", ADMIN, first_name="Ben"))
    protokoll.schreiben(benutzer("lena", KOMMISSIONIERUNG), "menge", "AB2515204", f"Teil {ZN}", "leer", "3")
    protokoll.schreiben(None, "lagerort", "AB2616624", "", "leer", "L1")
    html = client.get("/protokoll/").content.decode()
    assert "AB2515204" in html and "AB2616624" in html and "lena" in html
    html = client.get("/protokoll/", {"art": "lagerort"}).content.decode()
    assert "AB2616624" in html and ZN not in html
    html = client.get("/protokoll/", {"q": ZN}).content.decode()
    assert ZN in html and "AB2616624" not in html.split("<tbody>")[1]

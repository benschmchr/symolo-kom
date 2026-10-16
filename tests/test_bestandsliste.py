"""Bestandsliste im Browser: Rollen, Mengen (R-M1–R-M4), Daten (R-T1), Suche und Ansichten (R-A1–R-A5),
Import über die Seite (R-I1, R-I8, R-I9), „AB bearbeiten“ (Soll ändern), gleichzeitiges Arbeiten."""

import re
from datetime import date

import pytest

from bestand import ansicht, rechnen, views
from bestand.models import Auftrag, Teil
from kern.rollen import ADMIN, KOMMISSIONIERUNG, STAHLBAU

from .hilfe import HEUTE, LISTE_048, LISTE_204, LISTE_624, LISTE_LOS, benutzer, importiere

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    monkeypatch.setattr(views, "heute", lambda: HEUTE)


@pytest.fixture
def daten():
    return importiere(LISTE_204), importiere(LISTE_624), importiere(LISTE_048)


@pytest.fixture
def lager(client):
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    return client


def teil(zn, ab="AB2515204"):
    return Teil.objects.get(auftrag__ab_schluessel=ab, zeichnungsnummer=zn)


def zeilen(html):
    """data-zeile-Schlüssel der PC-Ansicht in Reihenfolge."""
    pc = html.split('<div class="nur-handy">')[0]
    return re.findall(r'<tr class="[^"]*" data-zeile="([abt]\d+)"', pc)


# ---------- Rollen (serverseitig) ----------
def test_R_P2_gast_sieht_liste_ohne_eingabefelder(client, daten):
    html = client.get("/bestandsliste/").content.decode()
    assert "AB2515204" in html and "AB2616048" in html
    assert 'data-url="/bestandsliste/teil/' not in html and "AB bearbeiten" not in html and "importieren" not in html


@pytest.mark.parametrize(
    "url", ["/bestandsliste/teil/{t}/vorhanden/", "/bestandsliste/teil/{t}/umschalten/", "/bestandsliste/ab/{a}/alles/"]
)
def test_R_P2_mengen_nur_rolle_lager(client, daten, url):
    t = teil("SK1990-977452.002.0")
    url = url.format(t=t.id, a=t.auftrag_id)
    assert client.post(url, {"wert": "5"}).status_code == 302  # Gast → Anmeldung
    client.force_login(benutzer("sw", STAHLBAU))
    assert client.post(url, {"wert": "5"}).status_code == 403
    teil_neu = teil("SK1990-977452.002.0")
    assert teil_neu.vorhanden is None


def test_R_P2_import_und_soll_nur_rolle_planung(lager, daten):
    a = daten[0]
    assert lager.get("/bestandsliste/import/").status_code == 200  # Kommissionierung importiert
    assert lager.get(f"/bestandsliste/ab/{a.id}/bearbeiten/").status_code == 200  # ersetzen: Kommissionierung
    lager.force_login(benutzer("sw", STAHLBAU))
    assert lager.get("/bestandsliste/import/").status_code == 403
    assert lager.get(f"/bestandsliste/ab/{a.id}/bearbeiten/").status_code == 403
    assert lager.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", {}).status_code == 403
    lager.force_login(benutzer("plan", ADMIN))
    assert lager.get("/bestandsliste/import/").status_code == 200
    assert lager.get(f"/bestandsliste/ab/{a.id}/bearbeiten/").status_code == 200


def test_R_P2_mengen_nur_per_post(lager, daten):
    t = teil("SK1990-977452.002.0")
    assert lager.get(f"/bestandsliste/teil/{t.id}/vorhanden/").status_code == 405


# ---------- Mengen ----------
@pytest.mark.parametrize("ein, gespeichert", [("5", 5), (" 7 ", 7), ("8,0", 8), ("", None), ("0", 0)])
def test_R_M1_ganze_zahlen_ab_null(lager, daten, ein, gespeichert):
    t = teil("SK1990-977452.002.0")
    r = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": ein})
    assert r.status_code == 200
    assert teil("SK1990-977452.002.0").vorhanden == gespeichert


@pytest.mark.parametrize("ein", ["-1", "2,5", "abc", "1e3x", "NaN"])
def test_R_M1_ungueltige_eingabe_abgelehnt(lager, daten, ein):
    t = teil("SK1990-977452.002.0")
    r = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": ein})
    assert r.status_code == 400 and "ganze Zahl" in r.json()["fehler"]
    assert teil("SK1990-977452.002.0").vorhanden is None


def test_R_M1_antwort_enthaelt_neue_werte_fuer_ab_bg_teil(lager, daten):
    t = teil("SK1990-977452.002.0")
    j = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": "21"}).json()
    assert j["zeilen"][f"t{t.id}"]["status"] == "Komplett"
    assert j["zeilen"][f"b{t.baugruppe_id}"]["fortschritt"] == "1 von 14"
    assert j["zeilen"][f"a{t.auftrag_id}"]["status"] == "Teilweise"
    assert j["zaehler"]["teile_komplett"] == 1


def test_R_M2_vorhanden_gleich_soll_und_zurueck(lager, daten):
    t = teil("SK1990-977452.002.0")
    lager.post(f"/bestandsliste/teil/{t.id}/umschalten/")
    assert teil("SK1990-977452.002.0").vorhanden == 21
    lager.post(f"/bestandsliste/teil/{t.id}/umschalten/")
    assert teil("SK1990-977452.002.0").vorhanden == 0
    Teil.objects.filter(id=t.id).update(vorhanden=5)
    lager.post(f"/bestandsliste/teil/{t.id}/umschalten/")
    assert teil("SK1990-977452.002.0").vorhanden == 21


def test_R_M3_alles_vorhanden_an_bg_und_ab(lager, daten):
    a = daten[0]
    bg200 = a.baugruppen.get(kurz="200")
    Teil.objects.filter(id=teil("SK1145-977452.005.0").id).update(vorhanden=50)  # Übermenge bleibt
    lager.post(f"/bestandsliste/ab/{a.id}/alles/", {"bg": bg200.id})
    assert teil("SK1145-977452.005.0").vorhanden == 50
    assert all(t.vorhanden == t.menge_gesamt for t in bg200.teile.exclude(zeichnungsnummer="SK1145-977452.005.0"))
    assert teil("SK1990-977451.009.0").vorhanden is None  # BG 100 unberührt
    assert teil("SK1990-977452.001.0").datum_eingelagert == HEUTE  # R-T1
    lager.post(f"/bestandsliste/ab/{a.id}/alles/", {"bg": bg200.id})  # komplett → alle 0
    assert set(bg200.teile.values_list("vorhanden", flat=True)) == {0}
    lager.post(f"/bestandsliste/ab/{a.id}/alles/")
    assert all(t.vorhanden == t.menge_gesamt for t in a.teile.all())
    j = lager.post(f"/bestandsliste/ab/{a.id}/alles/").json()
    assert j["zeilen"][f"a{a.id}"]["status"] == "Offen"


def test_R_M3_ab_ohne_baugruppe(lager, daten):
    a = daten[2]
    lager.post(f"/bestandsliste/ab/{a.id}/alles/")
    assert ansicht.baum(Auftrag.objects.filter(id=a.id))[0].w.status == "Komplett"


def test_R_M4_klappen_ab_und_bg(client, daten):
    html = client.get("/bestandsliste/").content.decode()
    assert html.count('data-klapp="ab"') == 3  # je AB ein Knopf (PC-Ansicht)
    assert 'data-klapp="b' in html


# ---------- Daten ----------
def test_R_T1_datum_bei_eingabe(lager, daten, monkeypatch):
    t = teil("SK1990-977452.002.0")
    url = f"/bestandsliste/teil/{t.id}/vorhanden/"
    lager.post(url, {"wert": "5"})
    t = teil("SK1990-977452.002.0")
    assert (t.datum_eingelagert, t.datum_komplett) == (HEUTE, None)
    monkeypatch.setattr(views, "heute", lambda: date(2026, 10, 15))
    lager.post(url, {"wert": "21"})
    t = teil("SK1990-977452.002.0")
    assert (t.datum_eingelagert, t.datum_komplett) == (HEUTE, date(2026, 10, 15))
    lager.post(url, {"wert": "20"})
    assert teil("SK1990-977452.002.0").datum_komplett is None
    lager.post(url, {"wert": ""})
    t = teil("SK1990-977452.002.0")
    assert (t.datum_eingelagert, t.datum_komplett) == (None, None)


# ---------- Suche und Ansichten ----------
def test_R_A1_suche_ab_nummer_zeigt_ganzen_ab(client, daten):
    html = client.get("/bestandsliste/?q=2515204").content.decode()
    assert len(zeilen(html)) == 1 + 3 + 25 and "AB2616624" not in html.split('<div class="nur-handy">')[0]


def test_R_A1_suche_bg_zeigt_bg_mit_teilen_und_ab(client, daten):
    html = client.get("/bestandsliste/?q=achse gesch").content.decode()
    z = zeilen(html)
    assert len(z) == 1 + 1 + 3 and z[0].startswith("a") and z[1].startswith("b")


def test_R_A1_suche_teil_zeigt_teil_mit_ab_und_bg(client, daten):
    html = client.get("/bestandsliste/?q=flanschplatte").content.decode()
    assert [k[0] for k in zeilen(html)] == ["a", "b", "t"]
    html = client.get("/bestandsliste/?q=kühlkörper").content.decode()  # Teil unter der Haupt-BG
    assert [k[0] for k in zeilen(html)] == ["a", "b", "t"]


def test_R_A1_suche_lk_und_ohne_treffer(client, daten):
    assert [k[0] for k in zeilen(client.get("/bestandsliste/?q=302").content.decode())] == ["a", "b", "t"]
    html = client.get("/bestandsliste/?q=gibtsnicht").content.decode()
    assert "Kein Treffer für „gibtsnicht“" in html and zeilen(html) == []


def sichtbare(html):
    """Schlüssel der PC-Zeilen, die nicht per hidden zugeklappt sind."""
    pc = html.split('<div class="nur-handy">')[0]
    return [
        k for k, rest in re.findall(r'<tr class="[^"]*" data-zeile="([abt]\d+)"([^>]*)>', pc) if "hidden" not in rest
    ]


def test_R_A2_anzeige(client, daten):
    html = client.get("/bestandsliste/?anzeige=ab").content.decode()
    assert [k[0] for k in sichtbare(html)] == ["a", "a", "a"]
    assert len(zeilen(html)) > 3  # darunter vorhanden, nur zugeklappt (Ben, 14.10.)
    assert 'aria-expanded="true"' not in html.split('<div class="nur-handy">')[0].split('class="nur-pc')[1]
    html = client.get("/bestandsliste/?anzeige=bg").content.decode()
    assert [k[0] for k in sichtbare(html)] == ["a", "b", "b", "b", "a", "b", "a", "b"]
    assert len(zeilen(html)) > len(sichtbare(html))  # Teile der Baugruppen sind aufklappbar
    html = client.get("/bestandsliste/?anzeige=ein&ab=AB2616624").content.decode()  # entfällt (Ben, 14.10.)
    assert "Ausgewählter AB" not in html
    assert zeilen(html) == zeilen(client.get("/bestandsliste/").content.decode())  # wie „Alles anzeigen“


def test_ab_nummer_klappt_auf_und_zu(client, daten):
    """Ben, 14.10.: Klick auf die AB-Nummer klappt den AB auf und zu (statt den AB einzeln anzuzeigen)."""
    html = client.get("/bestandsliste/").content.decode()
    assert 'class="ab-klapp" data-klapp-ref="ab"' in html and "anzeige=ein" not in html


def test_R_A3_status_filter_mit_kopfzeilen(client, daten):
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=100)
    Teil.objects.filter(zeichnungsnummer="SK1990-977452.001.0").update(vorhanden=10)
    z = zeilen(client.get("/bestandsliste/?status=teilweise").content.decode())
    t = teil("SK1990-977452.001.0")
    assert z == [f"a{t.auftrag_id}", f"b{t.baugruppe_id}", f"t{t.id}"]
    z = zeilen(client.get("/bestandsliste/?status=komplett&anzeige=ab").content.decode())
    assert z == [f"a{daten[1].id}"]
    z = zeilen(client.get("/bestandsliste/?status=offen&anzeige=ab").content.decode())
    assert z == [f"a{daten[2].id}"]
    z = zeilen(client.get("/bestandsliste/?status=offene&anzeige=ab").content.decode())
    assert z == [f"a{daten[0].id}", f"a{daten[2].id}"]


def test_R_A3_suche_setzt_auswahl_zurueck(client, daten):
    html = client.get("/bestandsliste/?q=flanschplatte&anzeige=ab&status=komplett").content.decode()
    assert len(zeilen(html)) == 3
    assert (
        '<option value="alle" selected>' in html and 'name="anzeige"' not in html
    )  # Dropdown „Anzeige“ entfernt (Ben, 14.10.)


def test_R_A4_reihenfolge_wie_importiert(client, daten):
    abs_ = re.findall(
        r'<section class="ab-block kacheln" id="ab-(\d+)"', client.get("/bestandsliste/").content.decode()
    )
    assert abs_ == [str(a.id) for a in daten]


def test_R_A5_spalten(client, daten):
    html = client.get("/bestandsliste/").content.decode()
    for s in [
        "AB / Zeichnungsnummer",
        "Benennung",
        "Menge / BG",
        ">Soll<",
        ">Index<",
        ">LK<",
        "Arbeitsgang",
        "Material",
        "Profil",
        "Abmaße",
        "Vorhanden",
        "Lagerort",
        "Bemerkung",
        "Status",
        "Fortschritt",
        "Eingelagert",
        ">Komplett<",
        "Entnehmen",
    ]:
        assert s in html, s
    assert "Haupt-AB: AB2515202" in html and "Dispoliste: DispositionslisteAB2515204.xlsm" in html  # R-D2 Anzeige
    assert 'class="nur-handy"' in html and 'class="teil-details"' in html  # Handy: Details


def test_R_S9_zaehler(client, daten):
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=100)
    z = ansicht.zaehler(ansicht.baum())
    assert z == {
        "ab": 3,
        "komplett": 1,
        "teilweise": 0,
        "offen": 2,
        "teile_komplett": 5,
        "teile_teilweise": 0,
        "teile_offen": 36,
    }
    html = client.get("/bestandsliste/").content.decode()
    assert '<b data-zaehler="teile_offen">' not in html and '<b data-zaehler="komplett">1</b>' in html


def test_X1_ab_mit_haupt_baugruppe_wird_angezeigt(client, daten):
    html = client.get("/bestandsliste/?q=AB2616048").content.decode()
    assert len(zeilen(html)) == 1 + 1 + 11 and "Kühlkörper" in html and "200 Gehäuse, vollst." in html


def test_X1_ab_ohne_baugruppe_wird_angezeigt(client):
    from .test_import import xlsx, z

    importiere(xlsx([z("N-1", "NUR TEIL EINS", 2, 11), z("N-2", "NUR TEIL ZWEI", 2, 12)], ab="AB777"))
    html = client.get("/bestandsliste/?q=AB777").content.decode()
    assert [k[0] for k in zeilen(html)] == ["a", "t", "t"] and "NUR TEIL ZWEI" in html


def test_R_W1_entnehmen_wird_angezeigt(client, daten):
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=100)
    html = client.get("/bestandsliste/?q=AB2616624").content.decode()
    pc = html.split('<div class="nur-handy">')[0]
    assert pc.count("Entnehmen</span>") == 2 and "hidden>Entnehmen" not in pc.split("data-zeile")[1]


# ---------- Gleichzeitiges Arbeiten ----------
def test_gleichzeitig_hinweis_wenn_zeile_inzwischen_geaendert(lager, daten):
    t = teil("SK1990-977452.002.0")
    url = f"/bestandsliste/teil/{t.id}/vorhanden/"
    assert lager.post(url, {"wert": "5", "version": "0"}).json()["hinweis"] == ""
    j = lager.post(url, {"wert": "7", "version": "0"}).json()  # zweite Person, alter Stand
    assert "inzwischen von jemand anderem geändert" in j["hinweis"] and "zuletzt 5" in j["hinweis"]
    assert teil("SK1990-977452.002.0").vorhanden == 7  # die letzte Eingabe gilt


# ---------- Import über die Seite ----------
def _hochladen(client, *pfade):
    from django.core.files.uploadedfile import SimpleUploadedFile

    dateien = [SimpleUploadedFile(p.name, p.read_bytes()) for p in pfade]
    return client.post("/bestandsliste/import/", {"dateien": dateien})


def test_R_I1_mehrere_dateien_und_R_I9_meldung(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    r = _hochladen(client, LISTE_LOS, LISTE_624)
    assert r.status_code == 302
    html = client.get("/bestandsliste/import/pruefen/").content.decode()
    assert "AB2616200 / Los 1" in html and "Neu" in html and "ist schon in der Bestandsliste" in html
    r = client.post("/bestandsliste/import/pruefen/", {})  # Ersetzen nicht angehakt
    a = Auftrag.objects.get(ab_schluessel="AB2616200|L1")
    assert r["Location"].endswith(f"?zu={a.id}#ab-{a.id}")
    assert "1 Arbeitsauftrag importiert." in client.get(r["Location"]).content.decode()
    assert Auftrag.objects.count() == 4


def test_R_I8_ersetzen_nur_mit_ja(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=3)
    _hochladen(client, LISTE_624)
    client.post("/bestandsliste/import/pruefen/", {"ersetzen_0": "nein"})
    assert set(Teil.objects.filter(auftrag__ab_schluessel="AB2616624").values_list("vorhanden", flat=True)) == {3}
    _hochladen(client, LISTE_624)
    r = client.post("/bestandsliste/import/pruefen/", {"ersetzen_0": "ja"})
    assert "Davon ersetzt: 1" in client.get(r["Location"]).content.decode()
    assert Auftrag.objects.count() == 3


def test_R_I1_fehlerhafte_datei_wird_gemeldet(client, daten):
    from django.core.files.uploadedfile import SimpleUploadedFile

    client.force_login(benutzer("plan", ADMIN))
    client.post("/bestandsliste/import/", {"dateien": [SimpleUploadedFile("alt.xls", b"x")]})
    html = client.get("/bestandsliste/import/pruefen/").content.decode()
    assert "alt.xls" in html and "als .xlsx speichern" in html


def test_R_I4_fehlende_ab_nummer_eingeben(client):
    from django.core.files.uploadedfile import SimpleUploadedFile

    from .test_import import xlsx, z

    client.force_login(benutzer("plan", ADMIN))
    client.post("/bestandsliste/import/", {"dateien": [SimpleUploadedFile("o.xlsx", xlsx([z("T", "T", 1)], kopf={}))]})
    assert "Fertigungs-AB fehlt" in client.get("/bestandsliste/import/pruefen/").content.decode()
    client.post("/bestandsliste/import/pruefen/", {"ab_0": "777 l2"})
    assert Auftrag.objects.get().ab_anzeige == "AB777 l2"


# ---------- AB bearbeiten (Soll ändern) ----------
def test_soll_aendern_mit_R_T1(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    t = teil("SK1990-977452.002.0")
    Teil.objects.filter(id=t.id).update(vorhanden=10)
    a = daten[0]
    werte = {f"soll_{x.id}": rechnen.zahl_text(x.menge_gesamt) for x in a.teile.all()}
    werte[f"soll_{t.id}"] = "10"
    r = client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte)
    assert r.status_code == 302
    t = teil("SK1990-977452.002.0")
    assert t.menge_gesamt == 10 and t.datum_komplett == HEUTE  # jetzt komplett
    assert "Soll bei 1 Teil geändert" in client.get(r["Location"]).content.decode()


def test_soll_aendern_dezimal_und_fehler(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    a = daten[2]
    t = a.teile.get(zeichnungsnummer="WN2.004-3--AL5183")
    werte = {f"soll_{x.id}": rechnen.zahl_text(x.menge_gesamt) for x in a.teile.all()}
    werte[f"soll_{t.id}"] = "0,08"
    client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte)
    assert str(a.teile.get(id=t.id).menge_gesamt) == "0.080"
    werte[f"soll_{t.id}"] = "-1"
    r = client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte)
    assert r.status_code == 400 and "ungueltig" in r.content.decode()


def test_ab_bearbeiten_knopf_nur_fuer_planung(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    html = client.get("/bestandsliste/").content.decode()
    assert "AB bearbeiten" not in html and "AB löschen" not in html  # Knöpfe entfernt (Ben, 14.10.)
    assert 'data-ab-menue="AB2515204"' in html and "/bestandsliste/ab/1/bearbeiten/" in html  # Rechtsklick-Menü


def test_ab_menue_nur_fuer_planung(client, daten):
    assert "data-ab-menue" not in client.get("/bestandsliste/").content.decode()


def test_status_klassen_an_ab_und_bg_zeilen(client, daten):
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=100)
    html = client.get("/bestandsliste/").content.decode().split('<div class="nur-handy">')[0]
    assert re.search(r'<tr class="ab komplett" data-zeile="a\d+" data-statusfarbe>', html)
    assert re.search(r'<tr class="bg unter komplett"', html)


def test_suchzeile_mit_lupe_und_anzeigeknoepfen(client, daten):
    html = client.get("/bestandsliste/").content.decode()
    assert 'class="knopf such-knopf"' in html and ">ABs</a>" in html and ">BGs</a>" in html and ">Alles</a>" in html
    assert '?anzeige=ab&amp;sort=import"' in html and '?anzeige=bg&amp;sort=import"' in html


# ---------- Startseite (D3) mit echten Zahlen ----------
def test_startseite_kennzahlen_aus_der_bestandsliste(client, daten):
    from bestand.uebersicht import kennzahlen

    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=100, datum_komplett=HEUTE)
    u = kennzahlen(HEUTE)
    assert (u["anz_ab"], u["z"]["Komplett"], u["teile"], u["teile_komplett"]) == (3, 1, 41, 5)
    assert u["tage"][-1] == {"tag": "14.10.", "n": 5, "hoehe": 100} and len(u["tage"]) == 10
    assert [a.o.ab_anzeige for a in u["zuletzt"]] == ["AB2616624"]
    html = client.get("/").content.decode()
    assert "Beispieldaten" not in html and u["gesamt_txt"] in html and "AB2616624" in html


def test_R_P3_vermerk_auf_import_und_bearbeiten(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    _hochladen(client, LISTE_LOS)
    for url in [
        "/bestandsliste/import/",
        "/bestandsliste/import/pruefen/",
        f"/bestandsliste/ab/{daten[0].id}/bearbeiten/",
    ]:
        html = client.get(url).content.decode()
        assert "Erstellt: Ben Schumacher, 09.10.2026" in html.split('<footer class="fuss">', 1)[1], url


def test_sortierung_az_za_fortschritt(client, daten):
    def abs_(sort):
        html = client.get(f"/bestandsliste/?sort={sort}").content.decode()
        return re.findall(r'<button type="button" class="ab-klapp" data-klapp-ref="ab"[^>]*>([^<]+)</button>', html)

    az = abs_("az")
    assert len(az) == 3 and az == sorted(az, key=str.casefold)
    assert abs_("za") == az[::-1]
    assert sorted(abs_("auf")) == sorted(abs_("ab")) == sorted(az)
    html = client.get("/bestandsliste/").content.decode()
    for text in ("A-Z", "Z-A", "Fortschritt aufsteigend", "Fortschritt absteigend"):
        assert f">{text}</option>" in html


def test_zaehler_mitte_ohne_einzelteile(client, daten):
    html = client.get("/bestandsliste/").content.decode()
    kopf = html.split('<form class="leiste"')[0]
    assert "Arbeitsaufträge:" in kopf and "Einzelteile" not in html and "zaehler-mitte" in kopf


def test_nur_ein_ab_und_klappen_per_namen(client, daten):
    a = Auftrag.objects.get(ab_schluessel="AB2616624")
    html = client.get(f"/bestandsliste/?ab={a.id}").content.decode()
    assert len(re.findall(r'data-klapp-ref="ab"', html)) == 1 and "Nur dieser AB" in html
    assert 'data-klapp-ref="b' in html  # auch der Name der Baugruppe klappt


def test_vorhanden_doppelklick_hat_soll(lager, daten):
    html = lager.get("/bestandsliste/").content.decode()
    assert 'data-soll="' in html.split('<div class="nur-handy">')[0]


def test_entnehmen_knopf_rot_und_teile_der_bg_dunkler(client):
    css = open("kern/static/kern/css/listen.css", encoding="utf-8").read()
    assert ".knopf-rot" in css and "var(--brand-red)" in css and "tr.bg.offen" in css


def test_R_M3_status_von_ab_und_bg_ist_der_alles_knopf(lager, daten):
    """Ben, 15.10.: Der Status von AB und BG ist antippbar und ersetzt den Knopf „alles ✓“."""
    html = lager.get("/bestandsliste/").content.decode()
    assert "alles ✓" not in html
    assert re.search(
        r'<button[^>]*status-knopf[^>]*data-feld="status"[^>]*data-alles="/bestandsliste/ab/\d+/alles/"', html
    )
    assert 'data-bg="' in html


def test_baugruppen_sind_eigene_kacheln_in_der_ab_karte(lager, daten):
    """Ben, 15.10.: Jede Baugruppe ist eine eigene Kachel in der Überkachel des AB (PC und Handy)."""
    html = lager.get("/bestandsliste/").content.decode()
    pc = html.split('<div class="nur-handy">')[0]
    assert '<section class="ab-block kacheln"' in pc and pc.count('<tbody class="bg-kachel">') >= 1
    assert '<article class="ab-karte kacheln' in html
    css = open("kern/static/kern/css/listen.css", encoding="utf-8").read()
    assert ".bg-kachel" in css and "var(--line-strong)" in css and ".ab-karte.kacheln > .bg-block" in css
    assert "--ab-farbe" in css  # AB-Zeile füllt die Überschrift der großen Kachel


def test_R_A4_eingeklappter_ab_einfarbig_ohne_streifen_und_zentriert():
    from pathlib import Path

    css = Path("kern/static/kern/css/listen.css").read_text(encoding="utf-8")
    zu = ".ab-block.kacheln:not(:has(tr.unter:not([hidden])))"
    assert zu + " { padding-bottom: 0; }" in css
    assert zu + " tr.ab > td { text-align: center; }" in css


# ---------- Obergrenze und Punkt-Schreibweise (R-M4) ----------
def test_R_M4_vorhanden_zu_gross_abgelehnt_und_seiten_laufen_weiter(lager, daten):
    t = teil("SK1990-977452.002.0")
    for ein in ["1000000000", "99999999999999999999"]:
        r = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": ein})
        assert r.status_code == 400 and "999.999.999" in r.json()["fehler"]
    assert teil("SK1990-977452.002.0").vorhanden is None
    assert lager.get("/bestandsliste/").status_code == 200
    r = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": "999999999"})
    assert r.status_code == 200 and teil("SK1990-977452.002.0").vorhanden == 999999999
    assert lager.get("/bestandsliste/").status_code == 200


def test_R_M4_soll_zu_gross_abgelehnt_und_seiten_laufen_weiter(client, daten):
    client.force_login(benutzer("plan", ADMIN))
    a = daten[2]
    t = a.teile.get(zeichnungsnummer="WN2.004-3--AL5183")
    werte = {f"soll_{x.id}": rechnen.zahl_text(x.menge_gesamt) for x in a.teile.all()}
    vorher = a.teile.get(id=t.id).menge_gesamt
    werte[f"soll_{t.id}"] = "1000000000"
    r = client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte)
    assert r.status_code == 400 and "999.999.999" in r.content.decode()
    assert a.teile.get(id=t.id).menge_gesamt == vorher
    assert client.get("/bestandsliste/").status_code == 200
    werte[f"soll_{t.id}"] = "999999999"
    assert client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte).status_code == 302
    assert client.get("/bestandsliste/").status_code == 200


@pytest.mark.parametrize("ein", ["1.000", "1,000", "12.500", "1.000.000", "2,000"])
def test_R_M4_punkt_schreibweise_wird_abgelehnt(lager, client, daten, ein):
    t = teil("SK1990-977452.002.0")
    r = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": ein})
    assert r.status_code == 400 and "ohne Punkt" in r.json()["fehler"]
    assert teil("SK1990-977452.002.0").vorhanden is None
    client.force_login(benutzer("plan", ADMIN))
    a = daten[2]
    t = a.teile.get(zeichnungsnummer="WN2.004-3--AL5183")
    werte = {f"soll_{x.id}": rechnen.zahl_text(x.menge_gesamt) for x in a.teile.all()}
    werte[f"soll_{t.id}"] = ein
    r = client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte)
    assert r.status_code == 400 and "ohne Punkt" in r.content.decode()


@pytest.mark.parametrize("ein", ["0,125", "0,06", "8,0", "2,5"])
def test_R_M4_dezimalkomma_bleibt_erlaubt(client, daten, ein):
    client.force_login(benutzer("plan", ADMIN))
    a = daten[2]
    t = a.teile.get(zeichnungsnummer="WN2.004-3--AL5183")
    werte = {f"soll_{x.id}": rechnen.zahl_text(x.menge_gesamt) for x in a.teile.all()}
    werte[f"soll_{t.id}"] = ein
    assert client.post(f"/bestandsliste/ab/{a.id}/bearbeiten/", werte).status_code == 302

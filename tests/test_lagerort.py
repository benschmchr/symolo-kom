"""Lagerort (R-L1–R-L5), Regal (R-R1–R-R5), Abweichungen X1–X3."""

from decimal import Decimal

import pytest

from bestand import ansicht, lagerort
from bestand.models import Auftrag, Baugruppe, Teil
from kern.rollen import KOMMISSIONIERUNG, STAHLBAU

from .hilfe import HEUTE, LISTE_204, LISTE_624, LISTE_LOS, benutzer, importiere

pytestmark = pytest.mark.django_db


@pytest.fixture
def ab():
    return importiere(LISTE_204)  # BG 100, 200, 300


@pytest.fixture
def lager(client):
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    return client


def bg(a, kurz):
    return Baugruppe.objects.get(auftrag=a, kurz=kurz)


def plaetze(a):
    """(AB, {BG: Platz}, {Platz der Teile je BG})"""
    a.refresh_from_db()
    bgs = {b.kurz: b.lagerort for b in a.baugruppen.all()}
    teile = {b.kurz: set(b.teile.values_list("lagerort", flat=True)) for b in a.baugruppen.all()}
    return a.lagerort, bgs, teile


def regal():
    return lagerort.regal(ansicht.baum())


def namen(liste):
    return [(e.name, e.platz) for e in liste]


def ohne_bg_ab(nr="AB2600001"):
    """AB nur mit Teilen (gibt es laut Ben): zwei Teile direkt unter dem AB."""
    a = Auftrag.objects.create(ab_anzeige=nr, ab_schluessel=nr, reihenfolge=99)
    Teil.objects.create(auftrag=a, zeile=1, zeichnungsnummer="X-1", menge_gesamt=Decimal(2), vorhanden=Decimal(2))
    Teil.objects.create(auftrag=a, zeile=2, zeichnungsnummer="X-2", menge_gesamt=Decimal(3))
    return a


# ---------- R-L4: gültige Plätze, Schreibweise ----------
@pytest.mark.parametrize(
    "text, gespeichert",
    [
        ("L2", "L2"),
        ("l 2", "L2"),
        ("  r6 ", "R6"),
        ("R3", "R3"),
        ("R3S", "R3"),
        ("r3-s", "R3"),
        ("R3V", "R3"),
        ("R3-V", "R3"),
        ("Sperrlager", "R3"),
        ("SPERR", "R3"),
        ("vermessen", "R3"),
        ("", ""),
        ("0", ""),
        ("-", ""),
        ("  ", ""),
        ("Kiste 4", "Kiste 4"),
        ("  Kiste   4 ", "Kiste 4"),
        ("L7", "L7"),
    ],
)
def test_R_L4_eingabe(text, gespeichert):
    assert lagerort.eingabe(text) == gespeichert


def test_R_L4_gueltige_plaetze_und_zu_lang():
    assert lagerort.PLAETZE == ["L6", "R6", "L5", "R5", "L4", "R4", "L3", "R3", "L2", "R2", "L1", "R1"]
    assert lagerort.ist_gueltig("sperr") and lagerort.ist_gueltig("l1") and not lagerort.ist_gueltig("L7")
    with pytest.raises(lagerort.PlatzFehler):
        lagerort.eingabe("x" * 41)


# ---------- R-L1, R-L2: Eintrag an AB oder BG, Vererbung ----------
def test_R_L2_ab_vererbt_an_alle_bgs_und_teile(ab):
    lagerort.setze_ab(ab, "l2")
    assert plaetze(ab) == ("L2", {"100": "L2", "200": "L2", "300": "L2"}, {"100": {"L2"}, "200": {"L2"}, "300": {"L2"}})
    lagerort.setze_ab(ab, "0")  # 0 = leeren, auch darunter
    assert plaetze(ab) == ("", {"100": "", "200": "", "300": ""}, {"100": {""}, "200": {""}, "300": {""}})


def test_R_L2_ab_ohne_bg_vererbt_an_seine_teile():
    a = ohne_bg_ab()
    lagerort.setze_ab(a, "R4")
    assert set(a.teile.values_list("lagerort", flat=True)) == {"R4"}


def test_R_L2_bg_vererbt_nur_an_ihre_teile(ab):
    lagerort.setze_bg(bg(ab, "200"), "L1")
    assert plaetze(ab) == ("", {"100": "", "200": "L1", "300": ""}, {"100": {""}, "200": {"L1"}, "300": {""}})
    lagerort.setze_bg(bg(ab, "200"), "-")
    assert plaetze(ab)[2]["200"] == {""}


# ---------- R-L3: AB nach BG-Änderung abgleichen ----------
def test_R_L3_alle_bgs_gleich_ab_bekommt_platz(ab):
    for k in ("100", "200", "300"):
        lagerort.setze_bg(bg(ab, k), "R5")
    assert plaetze(ab)[0] == "R5"


def test_R_L3_verschiedene_plaetze_ab_wird_leer(ab):
    lagerort.setze_ab(ab, "L1")
    lagerort.setze_bg(bg(ab, "100"), "R6")
    assert plaetze(ab) == ("", {"100": "R6", "200": "L1", "300": "L1"}, {"100": {"R6"}, "200": {"L1"}, "300": {"L1"}})


def test_R_L3_verschieden_bgs_ohne_platz_bekommen_bisherigen_ab_platz(ab):
    Auftrag.objects.filter(id=ab.id).update(lagerort="L2")  # z. B. AB-Platz, BGs noch leer
    Baugruppe.objects.filter(id=bg(ab, "200").id).update(lagerort="R1")
    lagerort.setze_bg(bg(ab, "100"), "R6")
    assert plaetze(ab) == ("", {"100": "R6", "200": "R1", "300": "L2"}, {"100": {"R6"}, "200": {""}, "300": {"L2"}})


def test_R_L3_ein_platz_rest_leer_ab_leer_nichts_aendern(ab):
    lagerort.setze_bg(bg(ab, "100"), "L1")
    assert plaetze(ab)[:2] == ("", {"100": "L1", "200": "", "300": ""})


def test_R_L3_ein_platz_rest_leer_ab_gleich_nichts_aendern(ab):
    lagerort.setze_ab(ab, "L1")
    lagerort.setze_bg(bg(ab, "100"), "")  # BG leeren: AB behält L1
    assert plaetze(ab)[:2] == ("L1", {"100": "", "200": "L1", "300": "L1"})


def test_R_L3_X3_ein_platz_rest_leer_ab_anders_wie_verschieden(ab):
    """X3 (Code ABAbgleichen): ein Platz, Rest leer, AB hat einen anderen → Rest bekommt den AB-Platz, AB leer."""
    Auftrag.objects.filter(id=ab.id).update(lagerort="R2")
    lagerort.setze_bg(bg(ab, "100"), "L1")
    assert plaetze(ab) == ("", {"100": "L1", "200": "R2", "300": "R2"}, {"100": {"L1"}, "200": {"R2"}, "300": {"R2"}})


def test_R_L3_X2_r3_kurzformen_gelten_als_gleich(ab):
    """X2: „R3S“, „SPERR“, „vermessen“ werden beim Speichern „R3“; der AB bekommt R3 statt leer zu werden."""
    for k, t in (("100", "R3S"), ("200", "SPERR"), ("300", "vermessen")):
        lagerort.setze_bg(bg(ab, k), t)
    assert plaetze(ab)[:2] == ("R3", {"100": "R3", "200": "R3", "300": "R3"})


def test_R_L3_teile_ohne_bg_bleiben_wie_in_excel():
    a = importiere(LISTE_204)
    t = Teil.objects.create(auftrag=a, zeile=0, zeichnungsnummer="LOSE-1", menge_gesamt=Decimal(1), lagerort="")
    for k in ("100", "200", "300"):
        lagerort.setze_bg(bg(a, k), "L4")
    t.refresh_from_db()
    assert plaetze(a)[0] == "L4" and t.lagerort == ""
    lagerort.setze_ab(a, "L5")  # am AB gesetzt: auch die Teile ohne BG
    t.refresh_from_db()
    assert t.lagerort == "L5"


# ---------- R-L5: Übergang Altbestand ----------
def test_R_L5_bg_bekommt_platz_ihrer_teile(ab):
    teile100 = list(bg(ab, "100").teile.all())
    Teil.objects.filter(id__in=[t.id for t in teile100[:3]]).update(lagerort="l4")
    teile200 = list(bg(ab, "200").teile.all())
    Teil.objects.filter(id=teile200[0].id).update(lagerort="L4")
    Teil.objects.filter(id=teile200[1].id).update(lagerort="L5")  # verschieden → BG bleibt leer
    assert lagerort.von_teilen(ab.id)
    assert plaetze(ab)[:2] == ("", {"100": "L4", "200": "", "300": ""})


def test_R_L5_danach_abgleich(ab):
    Teil.objects.filter(auftrag=ab).update(lagerort="R1")
    lagerort.von_teilen(ab.id)
    assert plaetze(ab)[:2] == ("R1", {"100": "R1", "200": "R1", "300": "R1"})


# ---------- R-R1 bis R-R4: Regal ----------
def test_R_R1_ein_eintrag_wenn_alle_bgs_gleich(ab):
    importiere(LISTE_624)
    lagerort.setze_ab(ab, "L2")
    r = regal()
    assert namen(r["einsortiert"]) == [("AB2515204", "L2")]
    assert namen(r["faecher"]["L2"]) == [("AB2515204", "L2")]
    assert namen(r["nicht"]) == [("AB2616624", "")]


def test_R_R1_je_bg_ein_eintrag_bei_verschiedenen_plaetzen(ab):
    lagerort.setze_ab(ab, "L1")
    lagerort.setze_bg(bg(ab, "100"), "R6")
    lagerort.setze_bg(bg(ab, "300"), "L2")
    r = regal()
    assert namen(r["einsortiert"]) == [("AB2515204_BG100", "R6"), ("AB2515204_BG200", "L1"), ("AB2515204_BG300", "L2")]
    assert r["nicht"] == [] and r["ungueltig"] == []


def test_R_R1_bg_ohne_eigenen_platz_nimmt_den_des_ab(ab):
    Auftrag.objects.filter(id=ab.id).update(lagerort="L2")
    Baugruppe.objects.filter(id=bg(ab, "100").id).update(lagerort="R6")
    assert namen(regal()["einsortiert"]) == [
        ("AB2515204_BG100", "R6"),
        ("AB2515204_BG200", "L2"),
        ("AB2515204_BG300", "L2"),
    ]


def test_R_R1_aliase_im_regal_und_sortierung():
    a = importiere(LISTE_LOS)  # „AB2616200 / Los 1“: eigener AB (R-AB6)
    b = importiere(LISTE_624)
    c = importiere(LISTE_204)
    for x in (a, b, c):
        Auftrag.objects.filter(id=x.id).update(lagerort="r3s")  # Altbestand: Kurzform noch im Text
        Baugruppe.objects.filter(auftrag=x).update(lagerort="r3s")
    assert namen(regal()["faecher"]["R3"]) == [("AB2515204", "R3"), ("AB2616200 / Los 1", "R3"), ("AB2616624", "R3")]


def test_R_R1_status_der_eintraege_wie_pruefdaten(ab):
    """Status wie Prüffall 9.1: BG 100 komplett, BG 200 teilweise, BG 300 offen, AB teilweise."""
    werte = {"SK1990-977452.001.0": 10, "SK1990-977452.004.0": 42, "SK1145-977452.005.0": 50}
    for t in Teil.objects.filter(auftrag=ab).select_related("baugruppe"):
        if t.baugruppe.kurz == "100":
            t.vorhanden = t.menge_gesamt
        elif t.zeichnungsnummer in werte:
            t.vorhanden = Decimal(werte[t.zeichnungsnummer])
        t.save()
    lagerort.setze_ab(ab, "L1")
    e = regal()["einsortiert"][0]
    assert (e.name, e.status, e.css) == ("AB2515204", "Teilweise", "teilweise")
    lagerort.setze_bg(bg(ab, "100"), "R6")
    assert [(e.name, e.status, e.css) for e in regal()["einsortiert"]] == [
        ("AB2515204_BG100", "Komplett", "komplett"),
        ("AB2515204_BG200", "Teilweise", "teilweise"),
        ("AB2515204_BG300", "Offen", "offen"),
    ]


def test_R_R3_ohne_gueltigen_platz_und_einsortiert(ab):
    lagerort.setze_ab(ab, "Kiste 4")
    r = regal()
    assert namen(r["ungueltig"]) == [("AB2515204", "KISTE 4")]
    assert namen(r["einsortiert"]) == [("AB2515204", "KISTE 4")]  # Excel: auch in „Einsortiert“
    assert all(not v for v in r["faecher"].values())


def test_R_R4_ab_ohne_platz_und_einzelne_bg_ohne_platz(ab):
    assert namen(regal()["nicht"]) == [("AB2515204", "")]
    lagerort.setze_bg(bg(ab, "100"), "L1")
    lagerort.setze_bg(bg(ab, "200"), "L1")
    r = regal()
    assert namen(r["einsortiert"]) == [("AB2515204_BG100", "L1"), ("AB2515204_BG200", "L1")]
    assert namen(r["nicht"]) == [("AB2515204_BG300", "")]
    assert r["nicht"][0].status == "Offen"


def test_R_R4_X1_ab_ohne_baugruppe_erscheint():
    """X1: ABs nur mit Teilen erscheinen (Excel lässt sie weg), mit dem Status des AB."""
    a = ohne_bg_ab()
    r = regal()
    assert namen(r["nicht"]) == [("AB2600001", "")] and r["nicht"][0].status == "Teilweise"
    lagerort.setze_ab(a, "L3")
    assert namen(regal()["faecher"]["L3"]) == [("AB2600001", "L3")]


def test_R_R4_W6_ersetzter_ab_ist_nicht_einsortiert(ab):
    """W6 = wie Excel: nach dem Ersetzen sind AB/BG ohne Platz (Teile behalten ihn) → „Nicht einsortiert“."""
    lagerort.setze_ab(ab, "L2")
    importiere(LISTE_204)
    assert namen(regal()["nicht"]) == [("AB2515204", "")]
    assert set(Teil.objects.filter(auftrag__ab_schluessel="AB2515204").values_list("lagerort", flat=True)) == {"L2"}


def test_R_R4_nur_bestandsliste_im_regal(ab):
    lagerort.setze_ab(ab, "L2")
    Auftrag.objects.filter(id=ab.id).update(bereich="schweissen")  # R-W4: entnommen → Platz frei
    assert regal()["einsortiert"] == []


# ---------- R-R2, R-R3: Seite ----------
def test_R_R2_regal_seite(client, ab):
    importiere(LISTE_624)
    lagerort.setze_ab(ab, "R3S")
    html = client.get("/regal/").content.decode()
    assert "Sperrlager / Teile zum Vermessen" in html
    fach = html.split('data-ablage="R3"')[1].split('data-ablage="L2"')[0]
    assert "AB2515204" in fach and "eintrag offen" in fach
    assert "Nicht einsortiert" in html and "AB2616624" in html
    assert "Sonstiges" in html and "keine" in html
    assert "Erstellt: Ben Schumacher, 09.10.2026" in html


def test_R_R3_leere_listen(client):
    html = client.get("/regal/").content.decode()
    assert "Alles einsortiert" in html and html.count("keine") >= 2


def test_R_P2_regal_gast_ohne_aendern(client, ab):
    lagerort.setze_ab(ab, "L1")
    html = client.get("/regal/").content.decode()
    assert "data-platz-auf" not in html and "platz-dialog" not in html
    assert 'href="/bestandsliste/?q=AB2515204"' in html


def test_R_R5_regal_lager_kann_aendern(lager, ab):
    html = lager.get("/regal/").content.decode()
    assert "data-platz-auf" in html and 'id="platz-dialog"' in html and 'draggable="true"' in html


# ---------- R-R5: Platz ändern ----------
URL = "/regal/platz/"


def test_R_R5_rollen(client, ab):
    assert client.post(URL, {"ab": ab.id, "platz": "L1"}).status_code == 302  # Gast → Anmeldung
    client.force_login(benutzer("sw", STAHLBAU))
    assert client.post(URL, {"ab": ab.id, "platz": "L1"}).status_code == 403
    assert plaetze(ab)[0] == ""
    assert client.get(URL).status_code == 405


def test_R_R5_platz_am_ab_und_an_bg(lager, ab):
    r = lager.post(URL, {"ab": ab.id, "platz": "l1"})
    assert r.status_code == 200
    j = r.json()
    assert j["platz"] == "L1" and "AB2515204: Platz L1" in j["meldung"]
    assert {w["lagerort"] for w in j["zeilen"].values()} == {"L1"}
    j = lager.post(URL, {"bg": bg(ab, "100").id, "platz": "R6"}).json()  # R-L3: AB wird leer
    assert j["zeilen"][f"a{ab.id}"]["lagerort"] == ""
    assert j["zeilen"][f"b{bg(ab, '100').id}"]["lagerort"] == "R6"
    assert "AB2515204_BG100: Platz R6" in j["meldung"]


def test_R_R5_freier_text_nur_mit_bestaetigung(lager, ab):
    r = lager.post(URL, {"ab": ab.id, "platz": "Kiste 4"})
    assert r.status_code == 409 and "kein Regalplatz" in r.json()["frage"]
    assert plaetze(ab)[0] == ""
    assert lager.post(URL, {"ab": ab.id, "platz": "Kiste 4", "frei": "1"}).status_code == 200
    assert plaetze(ab)[0] == "Kiste 4"


def test_R_R5_leeren_und_fehler(lager, ab):
    lager.post(URL, {"ab": ab.id, "platz": "L1"})
    assert lager.post(URL, {"ab": ab.id, "platz": "-"}).json()["platz"] == ""
    assert plaetze(ab)[0] == ""
    assert lager.post(URL, {"ab": ab.id, "platz": "x" * 41}).status_code == 400
    assert lager.post(URL, {"platz": "L1"}).status_code == 404
    assert lager.post(URL, {"bg": "abc", "platz": "L1"}).status_code == 404
    assert lager.post(URL, {"ab": 999999, "platz": "L1"}).status_code == 404
    Auftrag.objects.filter(id=ab.id).update(bereich="archiv")
    assert lager.post(URL, {"ab": ab.id, "platz": "L1"}).status_code == 404


def test_R_L1_bestandsliste_auswahl_nur_an_ab_und_bg(lager, ab):
    html = lager.get("/bestandsliste/").content.decode()
    pc = html.split('<div class="nur-handy">')[0]
    assert pc.count('class="platz-wahl"') == 4  # 1 AB + 3 BG, keine Teile
    assert 'data-art="ab"' in pc and 'data-art="bg"' in pc and "Anderer Platz" in pc


def test_R_L1_bestandsliste_gast_sieht_platz(client, ab):
    lagerort.setze_bg(bg(ab, "100"), "R6")
    html = client.get("/bestandsliste/").content.decode()
    assert "platz-wahl" not in html and ">R6<" in html


def test_R_L4_bestandsliste_auswahl_zeigt_aktuellen_platz(lager, ab):
    lagerort.setze_ab(ab, "Kiste 4")
    html = lager.get("/bestandsliste/").content.decode()
    assert '<option value="Kiste 4" selected>Kiste 4 (kein Regalplatz)</option>' in html
    lagerort.setze_ab(ab, "sperr")
    html = lager.get("/bestandsliste/").content.decode()
    assert '<option value="R3" selected>R3 · Sperrlager</option>' in html


def test_R_A1_suche_nach_lagerort(client, ab):
    lagerort.setze_bg(bg(ab, "300"), "R6")
    html = client.get("/bestandsliste/?q=r6").content.decode()
    assert "300 " in html and "Kein Treffer" not in html


def test_mengen_antwort_enthaelt_lagerort(lager, ab, monkeypatch):
    from bestand import views

    monkeypatch.setattr(views, "heute", lambda: HEUTE)
    lagerort.setze_ab(ab, "L2")
    t = bg(ab, "100").teile.first()
    j = lager.post(f"/bestandsliste/teil/{t.id}/vorhanden/", {"wert": "1"}).json()
    assert j["zeilen"][f"t{t.id}"]["lagerort"] == "L2"


# ---------- Regal: Drag-and-Drop, aufsplitten, zusammenführen (Ben, 14.10.) ----------
def test_regal_aufsplitten_zeigt_je_bg_einen_eintrag_am_selben_platz(lager, ab):
    lagerort.setze_ab(ab, "L2")
    assert namen(regal()["einsortiert"]) == [("AB2515204", "L2")]
    j = lager.post("/regal/teilen/", {"ab": ab.id}).json()
    assert "aufgesplittet" in j["meldung"]
    assert namen(regal()["einsortiert"]) == [
        ("AB2515204_BG100", "L2"),
        ("AB2515204_BG200", "L2"),
        ("AB2515204_BG300", "L2"),
    ]


def test_regal_aufsplitten_nicht_einsortierter_ab(lager, ab):
    lager.post("/regal/teilen/", {"ab": ab.id})
    assert namen(regal()["nicht"]) == [("AB2515204_BG100", ""), ("AB2515204_BG200", ""), ("AB2515204_BG300", "")]


def test_regal_aufgesplittete_bg_laesst_sich_verschieben_und_bleibt_einzeln(lager, ab):
    lager.post("/regal/teilen/", {"ab": ab.id})
    lager.post("/regal/platz/", {"bg": bg(ab, "100").id, "platz": "L1"})
    lager.post("/regal/platz/", {"bg": bg(ab, "200").id, "platz": "L1"})
    lager.post("/regal/platz/", {"bg": bg(ab, "300").id, "platz": "L1"})
    assert len(regal()["faecher"]["L1"]) == 3  # alle gleich, bleibt trotzdem einzeln


def test_regal_zusammenfuehren_an_der_stelle_der_bg(lager, ab):
    lager.post("/regal/teilen/", {"ab": ab.id})
    lager.post("/regal/platz/", {"bg": bg(ab, "100").id, "platz": "L1"})
    lager.post("/regal/platz/", {"bg": bg(ab, "200").id, "platz": "R4"})
    j = lager.post("/regal/zusammenfuehren/", {"bg": bg(ab, "200").id}).json()
    assert "zusammengeführt" in j["meldung"] and "R4" in j["meldung"]
    assert namen(regal()["einsortiert"]) == [("AB2515204", "R4")]
    ab.refresh_from_db()
    assert ab.regal_geteilt is False and plaetze(ab)[0] == "R4"


def test_regal_zusammenfuehren_aus_nicht_einsortiert(lager, ab):
    lager.post("/regal/teilen/", {"ab": ab.id})
    lager.post("/regal/platz/", {"bg": bg(ab, "100").id, "platz": "L1"})
    lager.post("/regal/zusammenfuehren/", {"bg": bg(ab, "300").id})
    assert namen(regal()["nicht"]) == [("AB2515204", "")] and not regal()["einsortiert"]


def test_regal_aufsplitten_ohne_baugruppen_und_rollen(client, lager, ab):
    o = ohne_bg_ab()
    assert lager.post("/regal/teilen/", {"ab": o.id}).status_code == 400
    assert lager.post("/regal/teilen/", {"ab": 99999}).status_code == 404
    gast = type(client)()
    assert gast.post("/regal/teilen/", {"ab": ab.id}).status_code in (302, 403)
    assert gast.post("/regal/zusammenfuehren/", {"bg": bg(ab, "100").id}).status_code in (302, 403)
    ab.refresh_from_db()
    assert not ab.regal_geteilt


def test_regal_seite_hat_ablage_fuer_nicht_einsortiert_und_aufsplitt_daten(lager, ab):
    html = lager.get("/regal/").content.decode()
    assert '<section class="karte" data-ablage="">' in html
    assert 'data-bgs="3"' in html and 'role="button"' in html and 'data-teilen="/regal/teilen/"' in html
    assert '<button type="button" class="eintrag' not in html  # kein Button (Firefox kann Buttons nicht ziehen)


# ---------- Rundgang entfernt (Ben, 14.10.) ----------
def test_rundgang_ist_entfernt(client, ab):
    assert client.get("/rundgang/").status_code == 404 and client.get(f"/rundgang/ab/{ab.id}/").status_code == 404
    assert "Rundgang" not in client.get("/regal/").content.decode()


def test_start_kachel_regal(client, ab):
    importiere(LISTE_624)
    lagerort.setze_ab(ab, "L1")
    html = client.get("/").content.decode()
    assert 'href="/regal/"' in html and "1 nicht einsortiert" in html


# ---------- Regal, Runde 2 (Ben, 14.10.) ----------
def test_regal_aufgesplittete_bg_zurueck_auf_nicht_einsortiert(lager, ab):
    lagerort.setze_ab(ab, "L2")
    lager.post("/regal/teilen/", {"ab": ab.id})
    j = lager.post("/regal/platz/", {"bg": bg(ab, "200").id, "platz": "", "regal": "1"}).json()
    assert j["meldung"] == "AB2515204_BG200: kein Platz mehr."
    r = regal()
    assert namen(r["nicht"]) == [("AB2515204_BG200", "")]
    assert [e for e, _ in namen(r["einsortiert"])] == ["AB2515204_BG100", "AB2515204_BG300"]


def test_regal_kein_automatisches_zusammenfuehren(lager, ab):
    lager.post("/regal/teilen/", {"ab": ab.id})
    for k in ("100", "200"):
        j = lager.post("/regal/platz/", {"bg": bg(ab, k).id, "platz": "L1", "regal": "1"}).json()
        assert "zusammen" not in j
    j = lager.post("/regal/platz/", {"bg": bg(ab, "300").id, "platz": "L1", "regal": "1"}).json()
    assert j["zusammen"] == str(bg(ab, "300").id)  # nur die Rückfrage, nichts passiert von selbst
    ab.refresh_from_db()
    assert ab.regal_geteilt and len(regal()["faecher"]["L1"]) == 3
    lager.post("/regal/zusammenfuehren/", {"bg": bg(ab, "300").id})  # „Ja“
    assert namen(regal()["einsortiert"]) == [("AB2515204", "L1")]


def test_regal_einzelne_bg_verschieben_teilt_den_ab(lager, ab):
    lagerort.setze_ab(ab, "L2")
    lager.post("/regal/platz/", {"bg": bg(ab, "100").id, "platz": "R1", "regal": "1"})
    ab.refresh_from_db()
    assert ab.regal_geteilt
    assert len(regal()["faecher"]["R1"]) == 1 and len(regal()["faecher"]["L2"]) == 2


def test_regal_sonstiges_und_bestandsliste_nur_dieser_ab(lager, ab):
    html = lager.get("/regal/").content.decode()
    assert "Sonstiges" in html and "Ohne gültigen Platz" not in html
    js = open("bestand/static/bestand/lagerort.js", encoding="utf-8").read()
    assert "AB ist zusammengeführt." in js and '"?ab="' in js


def test_regal_alle_bgs_auf_nicht_einsortiert_fragt_nach_zusammenfuehren(lager, ab):
    lagerort.setze_ab(ab, "L2")
    lager.post("/regal/teilen/", {"ab": ab.id})
    antworten = [
        lager.post("/regal/platz/", {"bg": bg(ab, k).id, "platz": "", "regal": "1"}).json()
        for k in ("100", "200", "300")
    ]
    assert "zusammen" not in antworten[0] and "zusammen" in antworten[2]
    lager.post("/regal/zusammenfuehren/", {"bg": bg(ab, "300").id})
    assert namen(regal()["nicht"]) == [("AB2515204", "")]


def test_regal_aufsplitten_nicht_bei_nur_einer_baugruppe(lager):
    a = importiere(LISTE_LOS)  # nur eine Baugruppe
    lagerort.setze_ab(a, "L2")
    assert regal()["einsortiert"][0].bgs == 1  # die Seite zeigt „AB aufsplitten“ erst ab zwei Baugruppen
    assert lager.post("/regal/teilen/", {"ab": a.id}).status_code == 400
    assert [x.platz for x in regal()["einsortiert"]] == ["L2"] and regal()["einsortiert"][0].bg_id is None


def test_R_R5_platzfenster_nur_grosse_knoepfe_abbrechen_rot(lager):
    html = lager.get("/regal/").content.decode()
    dialog = html.split('id="platz-dialog"', 1)[1].split("</dialog>", 1)[0]
    assert "Kein Platz" in dialog and "pd-liste" not in dialog and "In der Bestandsliste" not in dialog
    assert '<button class="knopf-rot" value="abbrechen">Abbrechen</button>' in dialog
    assert "AB aufsplitten" not in dialog and "AB zusammenführen" not in dialog  # nur im Rechtsklick


def test_R_R5_rechtsklick_ab_mit_einer_baugruppe_zeigt_fenster_mit_ansehen_und_abbrechen():
    js = open("bestand/static/bestand/lagerort.js", encoding="utf-8").read()
    assert "q.bgs < 2) return" not in js  # kein stilles Nichts mehr
    assert '"In der Bestandsliste anzeigen"' in js
    assert 'if (q.art !== "ab" || q.bgs > 1)' in js
    assert (
        'zu.className = "knopf-rot"' in js
    )  # Abbrechen auch im Rechtsklick-Fenster rot  # „AB aufsplitten“ nur ab zwei Baugruppen


def test_R_R5_handy_knopf_ab_menue_im_platzfenster(lager):
    html = lager.get("/regal/").content.decode()
    dialog = html.split('id="platz-dialog"', 1)[1].split("</dialog>", 1)[0]
    assert "data-menue-knopf>AB-Menü</button>" in dialog
    assert '<button class="knopf-rot" value="abbrechen">Abbrechen</button>' in dialog
    js = open("bestand/static/bestand/lagerort.js", encoding="utf-8").read()
    assert "#platz-dialog [data-menue-knopf]" in js and "menue(aktiv)" in js  # dasselbe Menü wie der Rechtsklick
    css = open("kern/static/kern/css/listen.css", encoding="utf-8").read()
    assert ".menue-knopf { display: none; }" in css and ".menue-knopf { display: inline-flex; }" in css  # nur Handy

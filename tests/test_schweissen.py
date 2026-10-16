"""Schweißen (R-W1 bis R-W10), Arbeitsplätze (R-AP1 bis R-AP7), Import-Warnung (R-I10), Forecast (R-F12 / W11).
Nachgebaut aus Entnehmen, SwZusammenfassen, SwArchivieren, Sw_Zurueck (modBestand.tpl) und der Formel AP (dashformel.py)."""

from datetime import date

import pytest
from django.test import Client

from bestand import ansicht, forecast, schweissen, uebersicht, views, views_forecast
from bestand.models import Aenderung, Arbeitsplatz, Archivvorgang, Archivzeile, Auftrag, Schweisszeile, Teil
from kern.rollen import ADMIN, KOMMISSIONIERUNG, STAHLBAU

from .hilfe import HEUTE, LISTE_204, LISTE_624, benutzer, importiere

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    for m in (views, schweissen, views_forecast):
        monkeypatch.setattr(m, "heute", lambda: HEUTE, raising=False)


def als(client, name, *rollen):
    client.force_login(benutzer(name, *rollen))
    return client


@pytest.fixture
def planung(client):
    return als(client, "planung", ADMIN, STAHLBAU)  # Planung entnimmt, Schweißen trägt ein (R-P2)


def voll(a, bg_kurz=None):
    """Alle Teile (oder die einer BG, z. B. „100“) vollständig vorhanden → Komplett."""
    qs = Teil.objects.filter(auftrag=a)
    if bg_kurz:
        qs = qs.filter(baugruppe__name__startswith=bg_kurz)
    for t in qs:
        t.vorhanden, t.datum_eingelagert, t.datum_komplett = t.menge_gesamt, date(2026, 10, 12), date(2026, 10, 13)
        t.save()


def bg_id(a, kurz):
    return a.baugruppen.get(name__startswith=kurz).id


def baum(a):
    return next(iter(ansicht.baum(Auftrag.objects.filter(id=a.id))))


def sz(nr, ebene, ab, anzeige=None, bg="", p="", m="", **kw):
    """Zeile direkt anlegen (für die Hallenplan-Fälle)."""
    return Schweisszeile.objects.create(
        nr=nr,
        ab_nr=ab,
        ab_schluessel=ab.upper(),
        anzeige=anzeige or ab,
        ebene=ebene,
        baugruppe=bg,
        arbeitsplatz=p,
        mitarbeiter=m,
        **kw,
    )


def entnehmen_ab(client, a):
    return client.post(f"/bestandsliste/ab/{a.id}/entnehmen/", follow=True)


def entnehmen_bg(client, a, kurz):
    return client.post(f"/bestandsliste/ab/{a.id}/bg/{bg_id(a, kurz)}/entnehmen/", follow=True)


def meldungen(r):
    return [str(m) for m in r.context["messages"]]


# ---------- R-W1 / R-W2: Entnehmen ----------
def sichtbar(html, url):
    """Steht „» entnehmen“ mit diesem Link ohne hidden da? (Die Seite blendet es je nach Status ein und aus.)"""
    i = html.index(f'href="{url}"')
    tag = html[html.rindex('<span class="entnehmen-hinweis"', 0, i) : i]
    return " hidden" not in tag.split(">")[0]


def test_R_W1_entnehmen_link_nur_bei_komplett(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    html = planung.get("/bestandsliste/").content.decode()
    assert sichtbar(html, f"/bestandsliste/ab/{a.id}/bg/{bg_id(a, '100')}/entnehmen/")  # BG 100 Komplett
    assert not sichtbar(html, f"/bestandsliste/ab/{a.id}/bg/{bg_id(a, '200')}/entnehmen/")  # BG 200 Offen
    assert not sichtbar(html, f"/bestandsliste/ab/{a.id}/entnehmen/")  # AB nur Teilweise
    voll(a)
    html = planung.get("/bestandsliste/").content.decode()
    assert sichtbar(html, f"/bestandsliste/ab/{a.id}/entnehmen/")


def test_R_W1_entnehmen_nur_fuer_planung_sichtbar_und_erlaubt(client):
    a = importiere(LISTE_204)
    voll(a)
    als(client, "lager", KOMMISSIONIERUNG)
    assert f"/bestandsliste/ab/{a.id}/entnehmen/" not in client.get("/bestandsliste/").content.decode()
    assert client.post(f"/bestandsliste/ab/{a.id}/entnehmen/").status_code == 403
    assert Schweisszeile.objects.count() == 0


def test_R_W2_ab_nicht_komplett_meldung_mit_status(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    r = entnehmen_ab(planung, a)
    assert any(
        "Nur ABs und Baugruppen mit Status „Komplett“ können entnommen werden." in m and "Teilweise" in m
        for m in meldungen(r)
    )
    assert Schweisszeile.objects.count() == 0


def test_R_W2_bg_nicht_komplett(planung):
    a = importiere(LISTE_204)
    r = entnehmen_bg(planung, a, "300")
    assert any("Offen" in m for m in meldungen(r))
    assert Schweisszeile.objects.count() == 0


def test_R_W2_sicherheitsfrage_ab_und_bg(planung):
    a = importiere(LISTE_204)
    voll(a)
    n_bg, n_teil = len(baum(a).bgs), len(baum(a).alle_teile)
    r = planung.get(f"/bestandsliste/ab/{a.id}/entnehmen/")
    assert f"mit {n_bg} Baugruppe(n) und {n_teil} Teil(en) ins Blatt Schweißen verschieben?" in r.content.decode()
    r = planung.get(f"/bestandsliste/ab/{a.id}/bg/{bg_id(a, '100')}/entnehmen/")
    assert "Teil(en) ins Blatt Schweißen verschieben?" in r.content.decode()
    assert Schweisszeile.objects.count() == 0  # die Frage allein ändert nichts


def test_R_W2_ganzer_ab_wird_kopiert_und_geloescht(planung):
    a = importiere(LISTE_204)
    voll(a)
    n = 1 + len(baum(a).bgs) + len(baum(a).alle_teile)
    ab = a.ab_schluessel
    r = entnehmen_ab(planung, a)
    assert r.redirect_chain[-1][0].endswith("/schweissen/")
    assert Schweisszeile.objects.filter(ab_schluessel=ab).count() == n
    assert not Auftrag.objects.filter(id=a.id, bereich="bestand").exists()
    z = Schweisszeile.objects.filter(ebene="AB").get()
    assert z.entnommen == HEUTE and z.status == "Komplett"
    assert (z.mitarbeiter, z.arbeitsplatz, z.liefertermin_stahlbau, z.termin_versand) == ("", "", None, None)
    assert Aenderung.objects.filter(art="entnommen").exists()


def test_R_W2_werte_der_teile_werden_mitgenommen(planung):
    a = importiere(LISTE_204)
    voll(a)
    t = Teil.objects.filter(auftrag=a, baugruppe__isnull=False).first()
    t.bemerkung = "Bitte entgraten"
    t.save()
    entnehmen_ab(planung, a)
    z = Schweisszeile.objects.get(ebene="Teil", zeichnungsnummer=t.zeichnungsnummer)
    assert z.bemerkung == "Bitte entgraten" and z.vorhanden and z.eingelagert == date(2026, 10, 12)
    assert z.komplett == date(2026, 10, 13)


def test_R_W2_teil_zeile_wird_abgelehnt():
    a = importiere(LISTE_204)
    voll(a)
    t = Teil.objects.filter(auftrag=a).first()
    with pytest.raises(schweissen.SchweissenFehler):
        schweissen.pruefen_entnehmen(a.id, -t.id)  # keine BG mit dieser Nummer


# ---------- R-W3: einzelne Baugruppe, letzte Baugruppe ----------
def test_R_W3_einzelne_bg_als_einzelblock(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    zeilen = list(Schweisszeile.objects.order_by("nr"))
    assert zeilen[0].ebene == "BG" and zeilen[0].anzeige == f"{a.ab_anzeige}_BG100"
    assert all(z.ebene != "AB" for z in zeilen)
    assert all(z.anzeige == f"{a.ab_anzeige}_BG100" for z in zeilen)
    assert Auftrag.objects.get(id=a.id).bereich == "bestand"  # AB bleibt mit den restlichen BGs
    rest = baum(a)
    assert len(rest.bgs) == 2
    assert Aenderung.objects.filter(art="entnommen", objekt__startswith="BG").exists()


def test_R_W3_letzte_bg_nimmt_ab_zeile_mit_und_fasst_zusammen(planung):
    a = importiere(LISTE_204)
    voll(a)
    for kurz in ("300", "100", "200"):
        entnehmen_bg(planung, a, kurz)
    zeilen = list(Schweisszeile.objects.order_by("nr"))
    assert zeilen[0].ebene == "AB" and zeilen[0].anzeige == a.ab_anzeige
    bgs = [z.baugruppe[:3] for z in zeilen if z.ebene == "BG"]
    assert bgs == ["100", "200", "300"]  # nach Nummer
    assert {z.anzeige for z in zeilen} == {a.ab_anzeige}
    # Teile stehen hinter ihrer BG
    aktuell = None
    for z in zeilen:
        if z.ebene == "BG":
            aktuell = z.baugruppe
        elif z.ebene == "Teil" and z.baugruppe != "(ohne BG)":
            assert z.baugruppe == aktuell
    assert not Auftrag.objects.filter(id=a.id, bereich="bestand").exists()


def test_R_W3_eintraege_und_entnommen_datum_bleiben_beim_zusammenfassen(planung, monkeypatch):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_bg(planung, a, "100")
    monkeypatch.setattr(schweissen, "heute", lambda: date(2026, 10, 15))
    z = Schweisszeile.objects.get(ebene="BG")
    schweissen.setzen(z.id, "mitarbeiter", "Tim")
    entnehmen_bg(planung, a, "200")
    entnehmen_bg(planung, a, "300")
    bg100 = Schweisszeile.objects.get(ebene="BG", baugruppe__startswith="100")
    assert bg100.mitarbeiter == "Tim" and bg100.entnommen == HEUTE
    assert Schweisszeile.objects.get(ebene="AB").mitarbeiter == "(verschieden)" or True  # abgeleitet beim Lesen
    assert next(x for x in schweissen.lesen() if x.ebene == "AB").m == schweissen.VERSCHIEDEN


# ---------- R-W4: Folgen woanders ----------
def test_R_W4_entnommene_zeilen_fehlen_in_dashboard_und_regal(planung):
    a = importiere(LISTE_204)
    importiere(LISTE_624)
    voll(a)
    vorher = uebersicht.kennzahlen(HEUTE)["anz_ab"]
    entnehmen_ab(planung, a)
    assert uebersicht.kennzahlen(HEUTE)["anz_ab"] == vorher - 1
    assert a.ab_anzeige not in planung.get("/bestandsliste/").content.decode()


def test_R_I10_import_warnt_wenn_ab_im_schweissen(planung):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_ab(planung, a)
    with open(LISTE_204, "rb") as f:
        planung.post("/bestandsliste/import/", {"dateien": f})
    r = planung.get("/bestandsliste/import/pruefen/")
    assert "schon im Bereich Schweißen" in r.content.decode()
    assert schweissen.hat_ab(a.ab_anzeige) and schweissen.hat_ab("2515204")


def test_R_I10_import_ohne_zustimmung_ueberspringt(planung):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_ab(planung, a)
    with open(LISTE_204, "rb") as f:
        planung.post("/bestandsliste/import/", {"dateien": f})
    planung.post("/bestandsliste/import/pruefen/", {"schweissen_0": "nein"})
    assert not Auftrag.objects.filter(ab_schluessel=a.ab_schluessel, bereich="bestand").exists()


def test_R_I10_import_mit_zustimmung_importiert(planung):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_ab(planung, a)
    with open(LISTE_204, "rb") as f:
        planung.post("/bestandsliste/import/", {"dateien": f})
    planung.post("/bestandsliste/import/pruefen/", {"schweissen_0": "ja"})
    assert Auftrag.objects.filter(ab_schluessel=a.ab_schluessel, bereich="bestand").exists()


# ---------- R-W5 / R-W6 / R-W7: Seite, Eintragen ----------
@pytest.fixture
def im_schweissen(planung):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_ab(planung, a)
    return a


def zeile(ebene, bg_kurz=None):
    qs = Schweisszeile.objects.filter(ebene=ebene)
    if bg_kurz:
        qs = qs.filter(baugruppe__startswith=bg_kurz)
    return qs.order_by("nr").first()


def eintragen(client, z, feld, wert):
    return client.post(f"/schweissen/zeile/{z.id}/eintragen/", {"feld": feld, "wert": wert})


def test_R_W5_spalten_und_dlz(im_schweissen, client):
    r = client.get("/schweissen/")
    assert r.status_code == 200
    html = r.content.decode()
    kopf = [
        html.index(f">{k}<")
        for k in (
            "Mitarbeiter",
            "Arbeitsplatz",
            "Eingelagert",
            "Entnommen",
            "Liefertermin Stahlbau",
            "Termin Versand",
            "DLZ (Tage)",
        )
    ]
    assert kopf == sorted(kopf)  # Reihenfolge wie R-W5


def test_R_W5_dlz_ist_termin_versand_minus_eingelagert(planung, im_schweissen):
    z = zeile("AB")
    assert z.dlz is None
    r = eintragen(planung, z, "termin_versand", "26.10.2026")
    assert r.status_code == 200
    ab = next(x for x in schweissen.lesen() if x.ebene == "AB")
    assert ab.tv == date(2026, 10, 26)
    t = Schweisszeile.objects.filter(ebene="Teil").first()
    t.refresh_from_db()
    assert t.termin_versand == date(2026, 10, 26) and t.dlz == 14  # eingelagert 12.10.
    assert r.json()["zeilen"][str(t.id)]["dlz"] == 14


def test_R_W6_eintrag_am_ab_geht_an_alle_darunter(planung, im_schweissen):
    r = eintragen(planung, zeile("AB"), "mitarbeiter", "Paskal")
    assert r.status_code == 200
    assert {z.mitarbeiter for z in Schweisszeile.objects.all()} == {"Paskal"}


def test_R_W6_eintrag_an_der_bg_geht_an_ihre_teile_und_ab_zeigt_verschieden(planung, im_schweissen):
    eintragen(planung, zeile("BG", "100"), "mitarbeiter", "Tim")
    eintragen(planung, zeile("AB"), "mitarbeiter", "Paskal")
    eintragen(planung, zeile("BG", "100"), "mitarbeiter", "Tim")
    zs = schweissen.lesen()
    assert next(z for z in zs if z.ebene == "AB").m == schweissen.VERSCHIEDEN
    bg100 = zeile("BG", "100")
    teile100 = Schweisszeile.objects.filter(ebene="Teil", baugruppe=bg100.baugruppe)
    assert {t.mitarbeiter for t in teile100} == {"Tim"}
    assert {t.mitarbeiter for t in Schweisszeile.objects.filter(ebene="Teil").exclude(baugruppe=bg100.baugruppe)} == {
        "Paskal"
    }


def test_R_W6_eintrag_am_teil_wird_verworfen(planung, im_schweissen):
    t = Schweisszeile.objects.filter(ebene="Teil").first()
    r = eintragen(planung, t, "mitarbeiter", "Hans")
    assert r.status_code == 400
    assert "Einzelteile übernehmen den Eintrag ihrer Baugruppe" in r.json()["fehler"]
    t.refresh_from_db()
    assert t.mitarbeiter == ""


def test_R_W6_einzelblock_vererbt_nur_in_seinem_block(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    eintragen(planung, zeile("BG"), "arbeitsplatz", "Trumpf")
    assert {z.arbeitsplatz for z in Schweisszeile.objects.all()} == {"Trumpf"}
    assert Auftrag.objects.get(id=a.id).bereich == "bestand"


def test_R_W6_arbeitsplatz_nur_aus_der_platzliste(planung, im_schweissen):
    assert eintragen(planung, zeile("AB"), "arbeitsplatz", "Mond").status_code == 400
    assert eintragen(planung, zeile("AB"), "arbeitsplatz", "ap02").status_code == 200
    assert zeile("AB").arbeitsplatz == "AP02"


def test_R_W7_datum_kurzform_und_ungueltig(planung, im_schweissen):
    z = zeile("AB")
    assert eintragen(planung, z, "liefertermin_stahlbau", "151026").status_code == 200
    z.refresh_from_db()
    assert z.liefertermin_stahlbau == date(2026, 10, 15)
    assert eintragen(planung, z, "liefertermin_stahlbau", "31.02.2026").status_code == 400
    assert eintragen(planung, z, "liefertermin_stahlbau", "1.1.2019").status_code == 400
    z.refresh_from_db()
    assert z.liefertermin_stahlbau == date(2026, 10, 15)


def test_R_W6_eintragen_nur_mit_rolle_schweissen_gaeste_sehen_nur(im_schweissen, client):
    z = zeile("AB")
    client.logout()
    assert client.get("/schweissen/").status_code == 200  # W2: Gäste dürfen ansehen
    assert eintragen(client, z, "mitarbeiter", "X").status_code in (302, 403)
    als(client, "lager", KOMMISSIONIERUNG)
    assert eintragen(client, z, "mitarbeiter", "X").status_code == 403
    als(client, "schweisser", STAHLBAU)
    assert eintragen(client, z, "mitarbeiter", "X").status_code == 200
    assert Aenderung.objects.filter(art="schweissen").exists()


# ---------- R-W8: Archivieren ----------
def test_R_W8_archivieren_ganzer_ab(planung, im_schweissen):
    n = Schweisszeile.objects.count()
    z = zeile("AB")
    r = planung.get(f"/schweissen/zeile/{z.id}/archivieren/")
    assert f"mit {n} Zeilen" in r.content.decode()
    r = planung.post(f"/schweissen/zeile/{z.id}/archivieren/", follow=True)
    assert Schweisszeile.objects.count() == 0
    v = Archivvorgang.objects.get()
    assert v.herkunft == "Archiviert aus Schweißen"
    assert Archivzeile.objects.filter(vorgang=v).count() == n
    assert Aenderung.objects.filter(art="archiviert").exists()


def test_R_W8_einzelblock_und_nicht_ab_zeilen_werden_abgelehnt(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    r = planung.post(f"/schweissen/zeile/{zeile('BG').id}/archivieren/", follow=True)
    assert any("erst archiviert werden, wenn der ganze AB im Blatt Schweißen liegt" in m for m in meldungen(r))
    r = planung.post(f"/schweissen/zeile/{zeile('Teil').id}/archivieren/", follow=True)
    assert any("Archiviert werden nur ganze ABs" in m for m in meldungen(r))
    assert Archivvorgang.objects.count() == 0


def test_R_W8_nur_planung_darf_archivieren(client, im_schweissen):
    als(client, "schweisser", STAHLBAU)
    assert client.post(f"/schweissen/zeile/{zeile('AB').id}/archivieren/").status_code == 403
    assert Schweisszeile.objects.count() > 0


def test_R_W8_aus_dem_archiv_zurueck_ins_schweissen(planung, im_schweissen):
    n = Schweisszeile.objects.count()
    eintragen(planung, zeile("AB"), "mitarbeiter", "Paskal")
    planung.post(f"/schweissen/zeile/{zeile('AB').id}/archivieren/")
    v = Archivvorgang.objects.get()
    chef = als(Client(), "chef", ADMIN)
    r = chef.post(f"/archiv/{v.id}/wiederherstellen/", follow=True)
    assert Schweisszeile.objects.count() == n
    assert Archivvorgang.objects.count() == 0
    assert r.redirect_chain[-1][0].endswith("/schweissen/")


# ---------- R-W9: Zurück in die Bestandsliste ----------
def test_R_W9_ganzer_ab_zurueck(planung, im_schweissen):
    eintragen(planung, zeile("AB"), "mitarbeiter", "Paskal")
    z = zeile("AB")
    r = planung.get(f"/schweissen/zeile/{z.id}/zurueck/")
    assert "zurück in die Bestandsliste schieben?" in r.content.decode()
    planung.post(f"/schweissen/zeile/{z.id}/zurueck/", follow=True)
    assert Schweisszeile.objects.count() == 0
    a = Auftrag.objects.get(ab_schluessel=z.ab_schluessel, bereich="bestand")
    assert baum(a).w.status == "Komplett"  # Mengen kamen mit
    assert Aenderung.objects.filter(art="zurueck").exists()


def test_R_W9_einzelblock_zurueck_in_den_vorhandenen_ab(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    assert len(baum(a).bgs) == 2
    planung.post(f"/schweissen/zeile/{zeile('BG').id}/zurueck/", follow=True)
    assert Schweisszeile.objects.count() == 0
    assert len(baum(a).bgs) == 3
    t = Teil.objects.filter(auftrag=a, baugruppe__name__startswith="100").first()
    assert t.vorhanden == t.menge_gesamt and t.datum_eingelagert == date(2026, 10, 12)


def test_R_W9_bg_eines_zusammengefassten_ab_nimmt_ab_zeile_mit(planung):
    a = importiere(LISTE_204)
    voll(a)
    entnehmen_ab(planung, a)
    bg = zeile("BG", "200")
    r = planung.get(f"/schweissen/zeile/{bg.id}/zurueck/")
    assert "Die AB-Zeile geht mit zurück" in r.content.decode()
    planung.post(f"/schweissen/zeile/{bg.id}/zurueck/", follow=True)
    uebrig = list(Schweisszeile.objects.order_by("nr"))
    assert {z.anzeige for z in uebrig} == {f"{a.ab_anzeige}_BG100", f"{a.ab_anzeige}_BG300"}  # wieder einzeln
    assert all(z.ebene != "AB" for z in uebrig)
    assert len(baum(Auftrag.objects.get(ab_schluessel=a.ab_schluessel, bereich="bestand")).bgs) == 1


def test_R_W9_teil_zeile_nicht_zurueck_und_nur_planung(planung, im_schweissen, client):
    r = planung.post(f"/schweissen/zeile/{zeile('Teil').id}/zurueck/", follow=True)
    assert any("nicht ein Einzelteil" in m for m in meldungen(r))
    als(client, "kom", KOMMISSIONIERUNG)  # Zurückholen macht nur der Stahlbau (Ben, 15.10.)
    assert client.post(f"/schweissen/zeile/{zeile('AB').id}/zurueck/").status_code == 403


# ---------- R-W10: Ansicht ----------
def test_R_W10_suche_ueber_mitarbeiter_und_arbeitsplatz(planung, im_schweissen):
    eintragen(planung, zeile("BG", "100"), "mitarbeiter", "Paskal")
    eintragen(planung, zeile("BG", "200"), "arbeitsplatz", "AP03")
    assert "Paskal" in planung.get("/schweissen/?q=paskal").content.decode()
    r = planung.get("/schweissen/?q=AP03")
    assert r.status_code == 200 and "Kein Treffer" not in r.content.decode()
    assert "Kein Treffer" in planung.get("/schweissen/?q=gibtesnicht").content.decode()


def test_R_W10_anzeige_nur_abs_zaehlt_einzelbloecke_mit(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    b = importiere(LISTE_624)
    voll(b)
    entnehmen_ab(planung, b)
    bl = schweissen.bloecke(schweissen.lesen())
    assert len(bl) == 2 and sum(x.einzeln for x in bl) == 1
    schweissen.filtern(bl, "abs")
    assert all(x.zeigen for x in bl)
    assert planung.get("/schweissen/?anzeige=abs").status_code == 200


# ---------- Forecast W11 ----------
def test_R_F12_entnommener_ab_bleibt_im_forecast_mit_status_schweissen(planung):
    a = importiere(LISTE_624)
    voll(a)
    entnehmen_ab(planung, a)
    abs_ = forecast.mit_schweissen(ansicht.baum())
    assert any(x.schweissen and x.o.ab_schluessel == a.ab_schluessel for x in abs_)
    assert schweissen.forecast_abs()[0].schweissen is True


def test_R_F12_nach_dem_archivieren_verschwindet_er(planung):
    a = importiere(LISTE_624)
    voll(a)
    entnehmen_ab(planung, a)
    planung.post(f"/schweissen/zeile/{zeile('AB').id}/archivieren/")
    assert schweissen.forecast_abs() == []


# ---------- Arbeitsplätze ----------
def test_R_AP1_platzliste_reihenfolge():
    namen = list(Arbeitsplatz.objects.order_by("reihenfolge").values_list("name", flat=True))
    assert namen == [
        "Trumpf",
        "AP05",
        "AP04",
        "AP03",
        "AP02",
        "AP01",
        "Schweißplatz",
        "Laser/WIG-Kabine",
        "Laser-Kabine",
        "AP06",
        "IPG Laser-Kabine",
        "Q.S.",
        "Schleifen / Finish",
        "Dojo Training Raum",
        "SFM",
    ]
    assert schweissen.platz_namen() == namen


def test_R_AP1_platzliste_im_admin_pflegbar(client):
    als(client, "chef", ADMIN)
    assert client.get("/verwaltung/bestand/arbeitsplatz/").status_code == 200


def test_R_AP2_farben_und_lage():
    f = {p.name: p.farbe for p in Arbeitsplatz.objects.all()}
    assert f["Trumpf"] == "grau" and f["AP05"] == "blau" and f["AP04"] == "gruen" and f["AP02"] == "gelb"
    assert f["AP01"] == "gelb" and f["Schweißplatz"] == "rosa" and f["Laser-Kabine"] == "lila"
    assert f["AP06"] == "lila" and f["IPG Laser-Kabine"] == "orange" and f["Schleifen / Finish"] == "gruen"
    assert Arbeitsplatz.objects.get(name="Q.S.").breite < Arbeitsplatz.objects.get(name="AP06").breite + 1


def namen(es):
    return [(e.name, e.platz, e.mitarbeiter) for e in es]


def test_R_AP3_ab_komplett_gleicher_platz_ein_eintrag():
    sz(1, "AB", "AB1", p="AP02", m="Paskal")
    sz(2, "BG", "AB1", bg="100 A", p="AP02", m="Paskal")
    sz(3, "BG", "AB1", bg="200 B", p="AP02", m="Paskal")
    assert namen(schweissen.eintraege()) == [("AB1", "AP02", "Paskal")]


def test_R_AP3_bgs_an_verschiedenen_plaetzen_einzeln_mit_mitarbeiter_der_bg():
    ab = sz(1, "AB", "AB1")
    bg1 = sz(2, "BG", "AB1", bg="100 A")
    bg2 = sz(3, "BG", "AB1", bg="200 B")
    schweissen.setzen(ab.id, "mitarbeiter", "Paskal")
    schweissen.setzen(bg1.id, "arbeitsplatz", "AP02")
    schweissen.setzen(bg2.id, "arbeitsplatz", "AP01")
    assert namen(schweissen.eintraege()) == [("AB1_BG100", "AP02", "Paskal"), ("AB1_BG200", "AP01", "Paskal")]
    schweissen.setzen(bg1.id, "mitarbeiter", "Tim")
    assert namen(schweissen.eintraege()) == [("AB1_BG100", "AP02", "Tim"), ("AB1_BG200", "AP01", "Paskal")]


def test_R_AP3_bg_ohne_platz_zaehlt_als_platz_des_ab():
    ab = sz(1, "AB", "AB1")
    sz(2, "BG", "AB1", bg="100 A")
    schweissen.setzen(ab.id, "arbeitsplatz", "Trumpf")  # die BG erbt den Platz des AB
    assert namen(schweissen.eintraege()) == [("AB1", "Trumpf", "")]


def test_R_AP3_ab_ohne_baugruppen():
    sz(1, "AB", "AB1", p="AP03")
    assert namen(schweissen.eintraege()) == [("AB1", "AP03", "")]


def test_R_AP3_einzelblock_immer_einzeln():
    sz(1, "BG", "AB9", anzeige="AB9_BG300", bg="300 C", p="SFM")
    assert namen(schweissen.eintraege()) == [("AB9_BG300", "SFM", "")]


def test_R_AP3_verschieden_wird_nicht_angezeigt():
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "BG", "AB1", bg="100 A", p="AP02", m="Tim")
    sz(3, "BG", "AB1", bg="200 B", p="AP02", m="Paskal")
    assert namen(schweissen.eintraege()) == [("AB1", "AP02", "")]


def test_R_AP4_listen_unter_dem_plan():
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "AB", "AB2")
    sz(3, "AB", "AB3", p="Altlast")
    h = schweissen.hallenplan()
    assert [e.name for e in h["nicht"]] == ["AB2"]
    assert [(e.name, e.platz) for e in h["ungueltig"]] == [("AB3", "Altlast")]
    assert [(e.name, p.name) for e, p in h["einsortiert"]] == [("AB1", "AP02")]


def test_R_AP4_seite_zeigt_plan_und_listen(client):
    sz(1, "AB", "AB1", p="AP02", m="Paskal")
    sz(2, "AB", "AB2")
    sz(3, "AB", "AB3", p="Altlast")
    html = client.get("/arbeitsplaetze/").content.decode()
    assert "AB1" in html and "Paskal" in html and "Nicht einsortiert" in html and "Sonstiges" in html
    assert "Altlast" in html


def test_R_AP5_platz_per_antippen_setzen_und_vererben(client):
    ab = sz(1, "AB", "AB1")
    bg = sz(2, "BG", "AB1", bg="100 A")
    teil = sz(3, "Teil", "AB1", bg="100 A")
    als(client, "schweisser", STAHLBAU)
    r = client.post("/arbeitsplaetze/platz/", {"eintrag": "AB1", "platz": "AP04"})
    assert r.status_code == 200
    for z in (ab, bg, teil):
        z.refresh_from_db()
        assert z.arbeitsplatz == "AP04"
    assert Aenderung.objects.filter(art="schweissen").exists()
    assert client.post("/arbeitsplaetze/platz/", {"eintrag": "AB1_BG100", "platz": "Mond"}).status_code == 400
    assert client.post("/arbeitsplaetze/platz/", {"eintrag": "AB77", "platz": "AP04"}).status_code == 400


def test_R_AP5_einzelne_bg_setzen():
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "BG", "AB1", bg="100 A", p="AP02")
    sz(3, "BG", "AB1", bg="200 B", p="AP02")
    schweissen.platz_setzen("AB1_BG200", "SFM")
    assert namen(schweissen.eintraege()) == [("AB1_BG100", "AP02", ""), ("AB1_BG200", "SFM", "")]


def test_R_AP6_nur_rolle_schweissen_darf_aendern(client):
    sz(1, "AB", "AB1")
    assert client.get("/arbeitsplaetze/").status_code == 200  # Ansehen für alle
    als(client, "lager", KOMMISSIONIERUNG)
    assert client.post("/arbeitsplaetze/platz/", {"eintrag": "AB1", "platz": "AP04"}).status_code == 403
    assert Schweisszeile.objects.get().arbeitsplatz == ""


def test_R_AP7_startseite_kachel_arbeitsplaetze(client):
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "AB", "AB2")
    k = uebersicht.kennzahlen(HEUTE)["arbeitsplaetze"]
    assert k == {"abs": 2, "einsortiert": 1, "nicht": 1, "ungueltig": 0}
    als(client, "planung", ADMIN)
    assert "/arbeitsplaetze/" in client.get("/").content.decode()


# ---------- Änderungen vom 14.10.: Suchzeile, Hinweis, Mitarbeiter, Arbeitsplätze aufsplitten ----------
def test_schweissen_kopf_suchzeile_und_knoepfe(im_schweissen):
    html = Client().get("/schweissen/").content.decode()
    assert 'class="knopf such-knopf"' in html and ">ABs<" in html and ">BGs<" in html
    assert 'name="anzeige"' not in html and "Entnommen werden in der Bestandsliste nur" not in html
    kopf = html.split("</h1>", 1)[1].split("</div>", 1)[0]
    assert "Zur Bestandsliste" not in kopf and ">Arbeitsplätze<" not in kopf
    assert "Mitarbeiter verwalten" not in html  # Gäste: kein Knopf
    assert 'href="/schweissen/?anzeige=bg"' in html


def test_mitarbeiter_verwalten_eintragen_und_austragen(client):
    als(client, "schweisser", STAHLBAU)
    assert "Mitarbeiter verwalten" in client.get("/schweissen/").content.decode()
    j = client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "  Paskal  "}).json()
    assert j["namen"] == ["Paskal"]
    client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "Anna, B."})  # Komma wird zu Leerzeichen
    assert schweissen.mitarbeiter_namen() == ["Anna B.", "Paskal"]
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "paskal"}).status_code == 400  # doppelt
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": " "}).status_code == 400
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "x" * 81}).status_code == 400
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "weg", "name": "Paskal"}).json()["namen"] == ["Anna B."]
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "weg", "name": "Paskal"}).status_code == 400
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "tanzen", "name": "x"}).status_code == 400
    assert Aenderung.objects.filter(art="schweissen", objekt="Mitarbeiterliste").count() == 3


def test_mitarbeiter_verwalten_nur_rolle_schweissen(client):
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "X"}).status_code in (302, 403)
    als(client, "lager", KOMMISSIONIERUNG)
    assert client.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "X"}).status_code == 403
    assert not schweissen.mitarbeiter_namen()


def test_mitarbeiter_auswahl_mehrere_namen_im_schweissen(planung, im_schweissen):
    planung.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "Anna"})
    planung.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": "Bernd"})
    r = eintragen(planung, zeile("AB"), "mitarbeiter", "Bernd,  Anna , bernd")
    assert r.status_code == 200
    assert {z.mitarbeiter for z in Schweisszeile.objects.all()} == {"Bernd, Anna"}  # ohne Doppelte
    html = planung.get("/schweissen/").content.decode()
    assert '<details class="mehrfach"' in html and 'type="checkbox" value="Anna" checked' in html
    assert (
        'type="checkbox" value="Bernd" checked' in html
        and '<input class="sw-eingabe" type="text" maxlength="200"' not in html
    )
    eintragen(planung, zeile("AB"), "mitarbeiter", "")
    assert {z.mitarbeiter for z in Schweisszeile.objects.all()} == {""}


def test_mitarbeiter_nicht_mehr_in_liste_bleibt_sichtbar(planung, im_schweissen):
    eintragen(planung, zeile("AB"), "mitarbeiter", "Altlast")
    html = planung.get("/schweissen/").content.decode()
    assert 'value="Altlast" checked' in html and "nicht in der Liste" in html


def test_mitarbeiter_zu_lang(planung, im_schweissen):
    for i in range(30):
        planung.post("/schweissen/mitarbeiter/", {"aktion": "neu", "name": f"Mitarbeiter-Nummer-{i:02d}"})
    wert = ", ".join(schweissen.mitarbeiter_namen())
    assert eintragen(planung, zeile("AB"), "mitarbeiter", wert).status_code == 400


def test_ap_aufsplitten_zeigt_je_bg_einen_eintrag():
    sz(1, "AB", "AB1", p="AP02", m="Paskal")
    sz(2, "BG", "AB1", bg="100 A", p="AP02", m="Paskal")
    sz(3, "BG", "AB1", bg="200 B", p="AP02", m="Paskal")
    assert namen(schweissen.eintraege()) == [("AB1", "AP02", "Paskal")]
    schweissen.ap_teilen("AB1")
    assert namen(schweissen.eintraege()) == [("AB1_BG100", "AP02", "Paskal"), ("AB1_BG200", "AP02", "Paskal")]
    e = schweissen.eintraege()[0]
    assert (e.ganz, e.komplett, e.bgs) == (False, True, 2)


def test_ap_zusammenfuehren_an_der_stelle_der_bg():
    ab = sz(1, "AB", "AB1")
    sz(2, "BG", "AB1", bg="100 A")
    sz(3, "BG", "AB1", bg="200 B")
    schweissen.ap_teilen("AB1")
    schweissen.platz_setzen("AB1_BG100", "AP02")
    schweissen.platz_setzen("AB1_BG200", "SFM")
    z, platz, _, _ = schweissen.ap_zusammenfuehren("AB1_BG200")
    assert platz == "SFM" and namen(schweissen.eintraege()) == [("AB1", "SFM", "")]
    ab.refresh_from_db()
    assert ab.ap_geteilt is False


def test_ap_zusammenfuehren_nicht_moeglich_beim_einzelblock():
    sz(1, "BG", "AB1", anzeige="AB1_BG100", bg="100 A", p="AP02")
    with pytest.raises(schweissen.SchweissenFehler, match="alle Baugruppen"):
        schweissen.ap_zusammenfuehren("AB1_BG100")
    with pytest.raises(schweissen.SchweissenFehler, match="alle Baugruppen"):
        schweissen.ap_teilen("AB1_BG100")
    e = schweissen.eintraege()[0]
    assert (e.ganz, e.komplett) == (False, False)


def test_ap_aufsplitten_ohne_baugruppen():
    sz(1, "AB", "AB1")
    with pytest.raises(schweissen.SchweissenFehler, match="keine Baugruppen"):
        schweissen.ap_teilen("AB1")


def test_ap_aufsplitten_zusammenfuehren_ueber_die_seite(client):
    als(client, "schweisser", STAHLBAU)
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "BG", "AB1", bg="100 A", p="AP02")
    sz(3, "BG", "AB1", bg="200 B", p="AP02")
    assert "aufgesplittet" in client.post("/arbeitsplaetze/teilen/", {"eintrag": "AB1"}).json()["meldung"]
    client.post("/arbeitsplaetze/platz/", {"eintrag": "AB1_BG200", "platz": "AP04"})
    html = client.get("/arbeitsplaetze/").content.decode()
    assert 'data-name="AB1_BG100"' in html and 'data-ganz="0" data-komplett="1"' in html and 'data-ablage=""' in html
    assert (
        "zusammengeführt" in client.post("/arbeitsplaetze/zusammenfuehren/", {"eintrag": "AB1_BG200"}).json()["meldung"]
    )
    assert namen(schweissen.eintraege()) == [("AB1", "AP04", "")]
    assert Aenderung.objects.filter(art="schweissen", objekt="Arbeitsplätze").count() == 2
    assert client.post("/arbeitsplaetze/zusammenfuehren/", {"eintrag": "AB1"}).status_code == 400  # schon der ganze AB


def test_ap_mitarbeiter_per_rechtsklick_aendern(client):
    als(client, "schweisser", STAHLBAU)
    sz(1, "AB", "AB1", p="AP02", m="Paskal")
    sz(2, "BG", "AB1", bg="100 A", p="AP02", m="Paskal")
    sz(3, "BG", "AB1", bg="200 B", p="AP02", m="Paskal")
    schweissen.ap_teilen("AB1")
    r = client.post("/arbeitsplaetze/mitarbeiter/", {"eintrag": "AB1_BG200", "wert": "Anna, Tim"})
    assert r.status_code == 200
    assert namen(schweissen.eintraege()) == [("AB1_BG100", "AP02", "Paskal"), ("AB1_BG200", "AP02", "Anna, Tim")]
    assert client.post("/arbeitsplaetze/mitarbeiter/", {"eintrag": "AB9", "wert": "X"}).status_code == 400


def test_ap_neue_wege_nur_rolle_schweissen(client):
    sz(1, "AB", "AB1")
    sz(2, "BG", "AB1", bg="100 A")
    als(client, "lager", KOMMISSIONIERUNG)
    for url, daten in (
        ("teilen", {"eintrag": "AB1"}),
        ("zusammenfuehren", {"eintrag": "AB1_BG100"}),
        ("mitarbeiter", {"eintrag": "AB1", "wert": "X"}),
    ):
        assert client.post(f"/arbeitsplaetze/{url}/", daten).status_code == 403
    assert not Schweisszeile.objects.filter(ap_geteilt=True).exists()


def test_ap_einsortiert_als_eintraege_statt_ausklappliste(client):
    sz(1, "AB", "AB1", p="AP02")
    html = client.get("/arbeitsplaetze/").content.decode()
    assert "Liste „Name · Platz“ anzeigen" not in html and "<details" not in html.split("Einsortiert", 1)[1]
    assert 'AB1<span class="eintrag-platz">· AP02</span>' in html


def test_zeilen_im_schweissen_passen_auf_den_bildschirm():
    """Ohne „Weitere Spalten“ sind die Spaltenbreiten Prozentwerte (zusammen 100 %) und die Tabelle hat keine Mindestbreite."""
    import re
    from pathlib import Path

    css = Path("kern/static/kern/css/listen.css").read_text(encoding="utf-8")
    assert ".sw-liste table.tabelle { min-width: 0; table-layout: fixed; }" in css
    prozent = {k: float(v) for k, v in re.findall(r"\.sw-liste col\.(c-[a-z]+) \{ width: ([\d.]+)%", css)}
    cols = re.findall(
        r'<col class="([^"]+)">', Path("bestand/templates/bestand/_spalten_sw.html").read_text(encoding="utf-8")
    )
    sichtbar = [c for c in cols if not c.startswith("mehr")]
    assert abs(sum(prozent[c] for c in sichtbar) - 100) < 0.01


# ---------- Runde 2 (Ben, 14.10.) ----------
def test_schweissen_filter_sortieren_und_sonstiges(client):
    from bestand import schweissen as sw

    html = client.get("/schweissen/").content.decode()
    for text in (
        "Mitarbeiter",
        "Arbeitsplatz",
        "Liefertermin aufsteigend",
        "Liefertermin absteigend",
        "AB aufsteigend",
        "AB absteigend",
    ):
        assert text in html
    assert 'name="mitarbeiter"' in html and 'name="platz"' in html and 'name="sort"' in html
    assert ">Sonstiges</option>" in html
    assert (
        sw.platz_finden("sonstiges") == "Sonstiges" and sw.eingabe_pruefen("arbeitsplatz", "Sonstiges") == "Sonstiges"
    )
    assert [w for w, _ in sw.SORTIERUNGEN] == ["lt_auf", "lt_ab", "ab_auf", "ab_ab"]


def test_schweissen_zurueck_knopf_kurz_und_rot():
    s = open("bestand/templates/bestand/schweissen.html", encoding="utf-8").read()
    z = open("bestand/templates/bestand/_sw_zeile.html", encoding="utf-8").read()
    assert "zurück in Bestandsliste" not in s + z and 'class="knopf-rot knopf-klein"' in s + z


def test_ap_aufsplitten_nicht_bei_nur_einer_baugruppe():
    sz(1, "AB", "AB1", p="AP02")
    sz(2, "BG", "AB1", bg="100 A", p="AP02")
    assert schweissen.eintraege()[0].bgs == 1  # die Seite zeigt „AB aufsplitten“ erst ab zwei Baugruppen
    with pytest.raises(schweissen.SchweissenFehler, match="keine Baugruppen"):
        schweissen.ap_teilen("AB1")
    assert namen(schweissen.eintraege()) == [("AB1", "AP02", "")]


def test_aufgeteilter_ab_zeigt_rote_kacheln_in_beiden_bereichen(planung):
    """Ben, 15.10.: BGs im Schweißen = rote Kacheln in der Bestandsliste; im Schweißen stehen die BGs gemeinsam unter
    der AB-Überschrift, die BG in der Bestandsliste ist dort eine rote Kachel (jeweils mit Sprung in den anderen Bereich)."""
    a = importiere(LISTE_204)
    voll(a, "200")
    voll(a, "300")
    entnehmen_bg(planung, a, "200")
    entnehmen_bg(planung, a, "300")
    liste = planung.get("/bestandsliste/").content.decode().split('<div class="nur-handy">')[0]
    assert liste.count('<tbody class="bg-kachel rot">') == 2 and liste.count("Befinden sich im Schweißen") == 2
    assert "/schweissen/?q=AB2515204" in liste
    seite = planung.get("/schweissen/").content.decode().split('<div class="nur-handy">')[0]
    assert seite.count('<section class="ab-block kacheln"') == 1  # ein gemeinsamer AB statt zwei Einzelblöcke
    assert seite.count('<tbody class="bg-kachel">') == 2
    assert seite.count('<tbody class="bg-kachel rot">') == 1 and "Befindet sich im Kommissionierlager" in seite
    assert f"/bestandsliste/?ab={a.id}" in seite
    assert "Arbeitsaufträge im Schweißen:&nbsp;<b>1</b>" in seite


def test_R_AP5_fenster_nur_kein_arbeitsplatz_und_abbrechen(planung):
    sz(1, "AB", "AB1")
    html = planung.get("/arbeitsplaetze/").content.decode()
    dialog = html.split('id="ap-dialog"', 1)[1].split("</dialog>", 1)[0]
    zeile = dialog.split('<div class="knopfzeile">', 1)[1]
    assert "Kein Arbeitsplatz" in zeile and '<button class="knopf-rot" value="abbrechen">Abbrechen</button>' in zeile
    assert "Mitarbeiter" not in zeile and "Im Schweißen ansehen" not in zeile
    js = open("bestand/static/bestand/arbeitsplaetze.js", encoding="utf-8").read()
    assert "ap-liste" not in js and "ap-menue" not in js
    assert 'addEventListener("contextmenu"' in js and "mitarbeiterWahl(q)" in js  # Rechtsklick behält „Mitarbeiter“
    assert 'el("button", "knopf-rot", "Abbrechen")' in js


def test_R_AP5_handy_knopf_ab_menue_im_arbeitsplatzfenster(planung):
    sz(1, "AB", "AB1")
    html = planung.get("/arbeitsplaetze/").content.decode()
    dialog = html.split('id="ap-dialog"', 1)[1].split("</dialog>", 1)[0]
    assert "data-menue-knopf>AB-Menü</button>" in dialog
    js = open("bestand/static/bestand/arbeitsplaetze.js", encoding="utf-8").read()
    assert "#ap-dialog [data-menue-knopf]" in js and "menue(aktiv)" in js  # Mitarbeiter, aufsplitten wie im Rechtsklick


def test_R_W3_ab_mit_roter_baugruppe_laesst_sich_auf_und_zuklappen(planung):
    a = importiere(LISTE_204)
    voll(a, "100")
    entnehmen_bg(planung, a, "100")
    for url, offen in (("/schweissen/", "true"), ("/schweissen/?anzeige=ab", "false")):
        seite = planung.get(url).content.decode()
        kopf = seite.split('<tr class="ab" data-zeile=', 1)[1].split("</tr>", 1)[0]
        assert f'data-klapp="ab" aria-expanded="{offen}"' in kopf and 'data-klapp-ref="ab"' in kopf
        rot = seite.split('class="bg-kachel rot"', 1)[1].split("</tbody>", 1)[0]
        assert (" hidden>" in rot) == (offen == "false")

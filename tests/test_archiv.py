"""AB löschen und Archiv (R-X1 bis R-X3), nachgebaut aus AB_Loeschen, ArchivKopf und ArchivSchreiben (modBestand.tpl)."""

from datetime import date
from decimal import Decimal

import pytest
from django.utils import timezone

from bestand import ansicht, archiv, views
from bestand.models import Archivvorgang, Archivzeile, Auftrag, Teil
from kern.rollen import ADMIN, STAHLBAU

from .hilfe import HEUTE, LISTE_048, LISTE_204, LISTE_624, LISTE_LOS, benutzer, importiere

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    monkeypatch.setattr(views, "heute", lambda: HEUTE)


@pytest.fixture
def planung(client):
    client.force_login(benutzer("planung", ADMIN))
    return client


@pytest.fixture
def admin(client):
    client.force_login(benutzer("chef", ADMIN))
    return client


def ab_baum(schluessel):
    return next(iter(ansicht.baum(Auftrag.objects.filter(ab_schluessel=schluessel))))


def mengen_eintragen(a):
    """Ein paar Mengen und Plätze, damit Status, Daten und Lagerort im Archiv stehen."""
    from bestand import lagerort

    teile = list(Teil.objects.filter(auftrag=a).order_by("zeile"))
    for t, v in zip(teile[:3], (t.menge_gesamt for t in teile[:3])):
        t.vorhanden, t.datum_eingelagert, t.datum_komplett = v, date(2026, 10, 12), date(2026, 10, 13)
        t.save()
    teile[3].vorhanden, teile[3].datum_eingelagert = Decimal(1), date(2026, 10, 12)
    teile[3].save()
    bg = a.baugruppen.order_by("zeile").first()
    if bg:
        lagerort.setze_bg(bg, "L2")
    else:
        lagerort.setze_ab(a, "R3")


# ---------- R-X1: AB löschen ----------
def test_R_X1_loeschen_kopie_ins_archiv_und_aus_der_liste(planung):
    a = importiere(LISTE_204)
    importiere(LISTE_624)
    baum = ab_baum(a.ab_schluessel)
    n = 1 + len(baum.bgs) + len(baum.alle_teile)
    r = planung.post(f"/bestandsliste/ab/{a.id}/loeschen/", follow=True)
    html = r.content.decode()
    assert f"AB2515204 wurde gelöscht ({n} Zeilen). Eine Kopie liegt im Archiv." in html
    assert not Auftrag.objects.filter(ab_schluessel="AB2515204").exists()
    assert not Teil.objects.filter(auftrag_id=a.id).exists()
    assert Auftrag.objects.filter(ab_schluessel="AB2616624").exists()  # andere ABs bleiben
    v = Archivvorgang.objects.get()
    assert v.ab_anzeige == "AB2515204" and v.zeilen.count() == n and v.herkunft == "Gelöscht aus Bestandsliste"
    assert "AB2515204" not in planung.get("/bestandsliste/").content.decode()
    assert "AB2515204" not in planung.get("/dashboard/").content.decode()
    assert "AB2515204" not in planung.get("/regal/").content.decode()


def test_R_X1_sicherheitsfrage_mit_zeilenzahl(planung):
    a = importiere(LISTE_204)
    baum = ab_baum(a.ab_schluessel)
    n = 1 + len(baum.bgs) + len(baum.alle_teile)
    html = planung.get(f"/bestandsliste/ab/{a.id}/loeschen/").content.decode()
    assert f"<strong>AB2515204</strong> mit <strong>{n} Zeilen</strong> endgültig löschen?" in html
    assert "Archiv" in html
    assert Auftrag.objects.filter(id=a.id).exists()  # GET löscht nichts


@pytest.mark.parametrize(
    "eingabe, erwartet",
    [
        ("2515204", "AB2515204"),
        ("ab2515204", "AB2515204"),
        (" AB 2515204 ", "AB2515204"),
        ("AB2616200 Los1", "AB2616200 / Los 1"),
        ("2616200 L1", "AB2616200 / Los 1"),
        ("AB2616200/Los 01", "AB2616200 / Los 1"),
    ],
)
def test_R_X1_R_AB4_eingabe_findet_vorhandene_schreibweise(planung, eingabe, erwartet):
    importiere(LISTE_204)
    importiere(LISTE_LOS)
    a = archiv.finde_ab(eingabe)
    assert a is not None and a.ab_anzeige == erwartet
    r = planung.get("/bestandsliste/loeschen/", {"ab": eingabe, "los": "1"})
    assert r.status_code == 302 and r.url == f"/bestandsliste/ab/{a.id}/loeschen/"


def test_R_X1_nicht_in_der_liste(planung):
    importiere(LISTE_204)
    html = planung.get("/bestandsliste/loeschen/", {"ab": "999", "los": "1"}).content.decode()
    assert "AB „AB999“ ist nicht in der Liste." in html


def test_R_X1_vorschlag_ist_der_aktuelle_ab(planung):
    html = planung.get("/bestandsliste/loeschen/", {"ab": "AB2515204"}).content.decode()
    assert 'value="AB2515204"' in html


def test_R_X1_R_P2_loeschen_nur_rolle_planung(client):
    a = importiere(LISTE_204)
    url = f"/bestandsliste/ab/{a.id}/loeschen/"
    assert client.post(url).status_code == 302 and client.post(url).url.startswith("/anmelden/")  # Gast
    client.force_login(benutzer("sw", STAHLBAU))  # Löschen: Kommissionierung und Admin (Ben, 15.10.)
    assert client.post(url).status_code == 403
    assert client.get("/bestandsliste/loeschen/").status_code == 403
    assert Auftrag.objects.filter(id=a.id).exists() and not Archivzeile.objects.exists()
    assert "AB löschen" not in client.get("/bestandsliste/").content.decode()


def test_R_X1_knopf_an_der_ab_zeile_fuer_planung(planung):
    a = importiere(LISTE_204)
    html = planung.get("/bestandsliste/").content.decode()
    assert f'data-loeschen="/bestandsliste/ab/{a.id}/loeschen/"' in html  # Rechtsklick-Menü statt Knöpfen
    assert 'href="/bestandsliste/loeschen/"' not in html and "AB löschen" not in html


def test_R_X1_ersetzen_beim_import_archiviert_nicht():
    """Wie Excel (LoescheABZeilen … archivieren = False): ein neuer Import ersetzt ohne Kopie ins Archiv."""
    importiere(LISTE_204)
    importiere(LISTE_204)
    assert not Archivvorgang.objects.exists()


def test_R_X1_ein_ab_kann_danach_neu_importiert_werden(planung):
    a = importiere(LISTE_204)
    planung.post(f"/bestandsliste/ab/{a.id}/loeschen/")
    neu = importiere(LISTE_204)
    assert neu.ab_anzeige == "AB2515204" and Archivvorgang.objects.count() == 1


# ---------- R-X2: Archivzeile mit 28 Spalten ----------
def test_R_X2_archivkopf_28_spalten_in_excel_reihenfolge():
    assert [k for k, _ in archiv.ARCHIV_KOPF] == [
        "AB",
        "Zeichnungsnummer",
        "Benennung",
        "Menge / BG",
        "Menge Gesamt",
        "Index",
        "LK Nummer",
        "Arbeitsgang",
        "Material",
        "Profil",
        "Abmaße",
        "Vorhanden",
        "Bemerkung",
        "Status",
        "Fortschritt",
        "Ebene",
        "Baugruppe",
        "Gelöscht am",
        "Eingelagert",
        "Komplett",
        "DLZ",
        "Lagerort",
        "Zuweisung Mitarbeiter",
        "Zuweisung Arbeitsplatz",
        "Entnommen",
        "Liefertermin Stahlbau",
        "Termin Versand",
        "Herkunft",
    ]
    assert all(hasattr(Archivzeile, f) for _, f in archiv.ARCHIV_KOPF)


def test_R_X2_inhalt_je_zeile():
    a = importiere(LISTE_204)
    mengen_eintragen(a)
    baum = ab_baum(a.ab_schluessel)
    bg_namen = {b.o.id: b.o.name for b in baum.bgs}
    vorher = timezone.now()
    v, n = archiv.loeschen(a.id)
    zeilen = list(v.zeilen.order_by("nr"))
    assert len(zeilen) == n == 1 + len(baum.bgs) + len(baum.alle_teile)
    ebenen = ["AB"] + ["Teil"] * len(baum.ohne) + [e for b in baum.bgs for e in ["BG"] + ["Teil"] * len(b.teile)]
    assert [z.ebene for z in zeilen] == ebenen  # Reihenfolge wie die Liste
    assert all(z.ab == "AB2515204" and z.herkunft == "Gelöscht aus Bestandsliste" for z in zeilen)
    assert all(z.geloescht_am == zeilen[0].geloescht_am >= vorher for z in zeilen)  # Datum + Uhrzeit
    assert all(
        z.dlz is None
        and not z.mitarbeiter
        and not z.arbeitsplatz
        and z.entnommen is None
        and z.liefertermin_stahlbau is None
        and z.termin_versand is None
        for z in zeilen
    )  # nicht in der Quelle

    ab = zeilen[0]  # AB-Zeile wie in Excel (R-D2)
    o = baum.o
    assert ab.zeichnungsnummer == "AB2515204" and ab.benennung == o.verkaufsartikel and ab.baugruppe == ""
    assert ab.arbeitsgang == (f"Kunde: {o.kunde}" if o.kunde else "")
    assert ab.material == (f"Haupt-AB: {o.haupt_ab}" if o.haupt_ab else "")
    assert ab.profil == (f"Ersteller: {o.ersteller}" if o.ersteller else "")
    assert ab.abmasse == (f"Datum: {o.datum_liste}" if o.datum_liste else "")
    assert ab.bemerkung == (f"Dispoliste: {o.dispoliste}" if o.dispoliste else "")
    assert ab.status == baum.w.status and ab.fortschritt == baum.w.fortschritt and ab.vorhanden == ""
    assert ab.eingelagert == baum.w.eingelagert == date(2026, 10, 12)

    b0 = baum.bgs[0]
    bg = next(z for z in zeilen if z.ebene == "BG")
    assert bg.baugruppe == b0.o.name and bg.zeichnungsnummer == b0.o.zeichnungsnummer and bg.vorhanden == ""
    assert bg.menge_gesamt == b0.o.soll_anzeige and bg.status == b0.w.status and bg.fortschritt == b0.w.fortschritt
    assert bg.lagerort == "L2"

    for t, z in zip(baum.alle_teile, [z for z in zeilen if z.ebene == "Teil"]):
        assert z.zeichnungsnummer == t.o.zeichnungsnummer and z.lk_nummer == t.o.lk_nummer
        assert z.menge_gesamt == t.o.soll_anzeige and z.status == t.w.status and z.fortschritt == t.w.fortschritt
        assert z.vorhanden == ("" if t.o.vorhanden is None else str(int(t.o.vorhanden)))
        assert z.eingelagert == t.o.datum_eingelagert and z.komplett == t.o.datum_komplett
        assert z.lagerort == t.o.lagerort
        assert z.baugruppe == bg_namen.get(t.o.baugruppe_id, "(ohne BG)")


def test_R_X2_dezimal_soll_als_text_wie_angezeigt():
    a = importiere(LISTE_048)
    Teil.objects.filter(auftrag=a).update(menge_gesamt=None, menge_gesamt_text="")
    t = Teil.objects.filter(auftrag=a).order_by("zeile").first()
    t.menge_gesamt = Decimal("0.06")
    t.save()
    v, _ = archiv.loeschen(a.id)
    z = v.zeilen.get(
        ebene="Teil",
        zeichnungsnummer=t.zeichnungsnummer,
        nr=min(v.zeilen.filter(ebene="Teil", zeichnungsnummer=t.zeichnungsnummer).values_list("nr", flat=True)),
    )
    assert z.menge_gesamt == "0,06"


# ---------- R-X3: nur lesen und durchsuchen ----------
def test_R_X3_gast_sieht_archiv_und_zeilen(client, planung):
    a = importiere(LISTE_204)
    planung.post(f"/bestandsliste/ab/{a.id}/loeschen/")
    client.logout()
    v = Archivvorgang.objects.get()
    html = client.get("/archiv/").content.decode()
    assert "AB2515204" in html and f'href="/archiv/{v.id}/"' in html
    html = client.get(f"/archiv/{v.id}/").content.decode()
    assert "Gelöscht am" in html and "Herkunft" in html and "Zuweisung Arbeitsplatz" in html
    assert "SK1990-977452.002.0" in html
    assert "/wiederherstellen/" not in html


def test_R_X3_suche_ab_kunde_und_zeichnungsnummer():
    for pfad in (LISTE_204, LISTE_624):
        a = importiere(pfad)
        archiv.loeschen(a.id)
    assert {v.ab_anzeige for v in archiv.suchen("2515204")} == {"AB2515204"}
    assert {v.ab_anzeige for v in archiv.suchen("sk1990-977452.002")} == {"AB2515204"}  # Teil, Kleinschreibung
    assert {v.ab_anzeige for v in archiv.suchen("")} == {"AB2515204", "AB2616624"}
    assert not archiv.suchen("gibtsnicht").exists()


def test_R_X3_suche_auf_der_seite_und_hervorheben(client):
    a = importiere(LISTE_204)
    v, _ = archiv.loeschen(a.id)
    html = client.get("/archiv/", {"q": "gibtsnicht"}).content.decode()
    assert "Kein Treffer für „gibtsnicht“" in html
    html = client.get(f"/archiv/{v.id}/", {"q": "SK1990-977452.002.0"}).content.decode()
    assert html.count(' treffer"') >= 1


def test_R_X3_archiv_hat_keine_eingabefelder(client):
    client.force_login(benutzer("sw", STAHLBAU))
    a = importiere(LISTE_204)
    v, _ = archiv.loeschen(a.id)
    for url in ("/archiv/", f"/archiv/{v.id}/"):
        main = client.get(url).content.decode().split("<main")[1].split("</main>")[0]
        assert 'method="post"' not in main and "<select" not in main


# ---------- R-X3 neu: wiederherstellen (Kommissionierung und Admin) ----------
def test_R_X3_wiederherstellen_nur_admin(client):
    client.force_login(benutzer("sw", STAHLBAU))
    a = importiere(LISTE_204)
    v, _ = archiv.loeschen(a.id)
    url = f"/archiv/{v.id}/wiederherstellen/"
    assert "Wiederherstellen" not in client.get(f"/archiv/{v.id}/").content.decode()
    assert client.post(url).status_code == 403
    client.logout()
    assert client.post(url).status_code == 302 and not Auftrag.objects.exists()


def test_R_X3_wiederherstellen_bringt_alles_zurueck(admin):
    a = importiere(LISTE_204)
    importiere(LISTE_624)
    mengen_eintragen(a)
    vorher = ab_baum(a.ab_schluessel)
    reihe = a.reihenfolge
    v, _ = archiv.loeschen(a.id)
    assert "Wiederherstellen" in admin.get(f"/archiv/{v.id}/").content.decode()
    r = admin.post(f"/archiv/{v.id}/wiederherstellen/", follow=True)
    assert "AB2515204 ist wieder in der Bestandsliste." in r.content.decode()
    assert not Archivvorgang.objects.exists() and not Archivzeile.objects.exists()
    nachher = ab_baum("AB2515204")
    assert nachher.o.reihenfolge == reihe  # alter Platz in der Liste
    for f in (
        "ab_anzeige",
        "ab_schluessel",
        "forecast_schluessel",
        "kunde",
        "haupt_ab",
        "verkaufsartikel",
        "ersteller",
        "datum_liste",
        "dispoliste",
        "lagerort",
        "quelldatei",
    ):
        assert getattr(nachher.o, f) == getattr(vorher.o, f), f
    assert nachher.w == vorher.w
    assert [(b.o.name, b.o.kurz, b.o.lagerort, b.o.soll_anzeige, b.w) for b in nachher.bgs] == [
        (b.o.name, b.o.kurz, b.o.lagerort, b.o.soll_anzeige, b.w) for b in vorher.bgs
    ]
    felder = (
        "zeichnungsnummer",
        "benennung",
        "menge_bg",
        "menge_gesamt",
        "menge_gesamt_text",
        "index",
        "lk_nummer",
        "arbeitsgang",
        "material",
        "profil",
        "abmasse",
        "bemerkung",
        "lagerort",
        "vorhanden",
        "datum_eingelagert",
        "datum_komplett",
    )
    bg_vorher = {b.o.id: b.o.name for b in vorher.bgs}
    bg_nachher = {b.o.id: b.o.name for b in nachher.bgs}
    assert [
        tuple(getattr(t.o, f) for f in felder) + (bg_nachher.get(t.o.baugruppe_id),) for t in nachher.alle_teile
    ] == [tuple(getattr(t.o, f) for f in felder) + (bg_vorher.get(t.o.baugruppe_id),) for t in vorher.alle_teile]


def test_R_X3_wiederherstellen_ab_ohne_baugruppe_und_los(admin):
    for pfad in (LISTE_048, LISTE_LOS):
        a = importiere(pfad)
        vorher = ab_baum(a.ab_schluessel)
        v, _ = archiv.loeschen(a.id)
        archiv.wiederherstellen(v.id)
        nachher = ab_baum(a.ab_schluessel)
        assert nachher.o.ab_anzeige == vorher.o.ab_anzeige and nachher.w == vorher.w
        assert len(nachher.bgs) == len(vorher.bgs) and len(nachher.ohne) == len(vorher.ohne)


def test_R_X3_wiederherstellen_nicht_wenn_ab_wieder_da(admin):
    a = importiere(LISTE_204)
    v, _ = archiv.loeschen(a.id)
    importiere(LISTE_204)  # inzwischen neu importiert
    html = admin.post(f"/archiv/{v.id}/wiederherstellen/", follow=True).content.decode()
    assert "steht schon wieder in der Bestandsliste" in html
    assert Archivvorgang.objects.filter(id=v.id).exists() and Auftrag.objects.count() == 1


def test_R_X3_platz_belegt_dann_ans_ende():
    a = importiere(LISTE_204)
    v, _ = archiv.loeschen(a.id)
    b = importiere(LISTE_624)
    Auftrag.objects.filter(id=b.id).update(reihenfolge=v.reihenfolge)
    neu = archiv.wiederherstellen(v.id)
    assert neu.reihenfolge > v.reihenfolge

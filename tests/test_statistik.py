"""Statistik: Liefertreue Monat und IA, Durchlaufzeit, überfällige ABs, Verspätung (Rechenregeln im Kopf von statistik.py)."""

from datetime import date, datetime, timedelta, timezone

import pytest

from bestand import schweissen, statistik, views, views_forecast
from bestand.models import Archivvorgang, Archivzeile, Schweisszeile
from bestand.statistik import Eintrag

from .hilfe import HEUTE
from .test_schweissen import sz

pytestmark = pytest.mark.django_db  # HEUTE = Mittwoch, 14.10.2026 (KW 42)


@pytest.fixture(autouse=True)
def festes_heute(monkeypatch):
    for m in (views, schweissen, views_forecast):
        monkeypatch.setattr(m, "heute", lambda: HEUTE, raising=False)


def ab(lt, tv, art="ab", **kw):
    return Eintrag(art, "AB1", lt, tv, **kw)


# ---------- Zeiträume ----------
def test_fuenf_kalenderwochen_letzte_vier_und_aktuelle():
    assert statistik.letzte_kws(HEUTE, 5) == [(2026, 38), (2026, 39), (2026, 40), (2026, 41), (2026, 42)]


def test_kalenderwochen_ueber_den_jahreswechsel():
    assert statistik.letzte_kws(date(2027, 1, 6), 4) == [(2026, 51), (2026, 52), (2026, 53), (2027, 1)]


def test_zwoelf_monate_bis_einschliesslich_aktuellem():
    m = statistik.letzte_monate(HEUTE, 12)
    assert m[0] == (2025, 11) and m[-1] == (2026, 10) and len(m) == 12


# ---------- Liefertreue ----------
def test_beispiel_aus_der_aufgabe_zehn_abs_fuenf_puenktlich_ergibt_50_prozent():
    letzte_kw = date(2026, 10, 7)  # Mittwoch KW 41
    e = [ab(letzte_kw, letzte_kw - timedelta(days=1)) for _ in range(5)]  # Versand davor: pünktlich
    e += [ab(letzte_kw, letzte_kw + timedelta(days=3)) for _ in range(5)]  # Versand danach: zu spät
    b = {x.label: x for x in statistik.liefertreue_monat(e, "ab", HEUTE)}["KW 41"]
    assert b.wert == 50 and b.text == "50 %" and b.n == 10 and b.farbe == "rot"


def test_versand_am_selben_tag_ist_puenktlich():
    d = date(2026, 10, 7)
    b = statistik.liefertreue_monat([ab(d, d)], "ab", HEUTE)[3]
    assert b.wert == 100 and b.farbe == "gruen"


def test_ohne_versand_und_liefertermin_vorbei_zaehlt_als_nicht_puenktlich():
    b = statistik.liefertreue_monat(
        [ab(date(2026, 10, 7), None), ab(date(2026, 10, 7), date(2026, 10, 7))], "ab", HEUTE
    )[3]
    assert b.wert == 50


def test_ohne_versand_und_liefertermin_heute_oder_spaeter_zaehlt_noch_nicht():
    e = [ab(HEUTE, None), ab(HEUTE + timedelta(days=1), None)]
    aktuelle = statistik.liefertreue_monat(e, "ab", HEUTE)[-1]
    assert aktuelle.wert is None and aktuelle.text == "–" and aktuelle.n == 0
    mit_versand = statistik.liefertreue_monat(e + [ab(HEUTE, HEUTE - timedelta(days=1))], "ab", HEUTE)[-1]
    assert mit_versand.wert == 100 and mit_versand.n == 1


def test_farben_gruen_ab_80_gelb_70_bis_79_rot_darunter():
    def pct(p):
        d = date(2026, 10, 7)
        e = [ab(d, d) for _ in range(p)] + [ab(d, d + timedelta(days=1)) for _ in range(100 - p)]
        return statistik.liefertreue_monat(e, "ab", HEUTE)[3]

    assert [pct(p).farbe for p in (100, 80, 79, 70, 69, 0)] == ["gruen", "gruen", "gelb", "gelb", "rot", "rot"]
    assert statistik.SOLL == 80


def test_abs_und_bauteile_werden_getrennt_ausgewertet():
    d = date(2026, 10, 7)
    e = [ab(d, d), ab(d, d + timedelta(days=2)), ab(d, d, art="teil"), ab(d, d, art="teil"), ab(d, d, art="teil")]
    assert statistik.liefertreue_monat(e, "ab", HEUTE)[3].wert == 50
    assert statistik.liefertreue_monat(e, "teil", HEUTE)[3].wert == 100


def test_liefertermin_ausserhalb_der_fuenf_wochen_zaehlt_nicht():
    d = date(2026, 9, 1)
    assert all(b.wert is None for b in statistik.liefertreue_monat([ab(d, d)], "ab", HEUTE))


def test_liefertreue_ia_zwoelf_balken_nach_liefermonat():
    e = [
        ab(date(2026, 3, 10), date(2026, 3, 9)),
        ab(date(2026, 3, 20), date(2026, 3, 25)),
        ab(date(2024, 1, 1), date(2024, 1, 1)),
    ]
    balken = statistik.liefertreue_ia(e, "ab", HEUTE)
    assert len(balken) == 12 and balken[0].label == "Nov 25" and balken[-1].label == "Okt 26"
    maerz = next(b for b in balken if b.label == "Mär 26")
    assert maerz.wert == 50 and maerz.n == 2


# ---------- Durchlaufzeit ----------
def test_dlz_ist_versand_minus_eingelagert():
    assert ab(date(2026, 10, 20), date(2026, 10, 26), eingelagert=date(2026, 10, 12)).dlz == 14
    assert ab(None, None).dlz is None


def test_durchlaufzeit_woche_monat_jahr():
    e = [
        ab(None, HEUTE, eingelagert=HEUTE - timedelta(days=4)),
        ab(None, HEUTE, eingelagert=HEUTE - timedelta(days=8)),
        ab(None, date(2026, 10, 1), eingelagert=date(2026, 9, 21)),
        ab(None, date(2026, 5, 15), eingelagert=date(2026, 5, 1)),
    ]
    woche = statistik.durchlaufzeit(e, "woche", HEUTE)
    assert len(woche) == 7 and woche[-1].wert == 6.0 and woche[-1].text == "6,0"  # Ø aus 4 und 8
    assert sum(b.n for b in woche) == 2
    monat = statistik.durchlaufzeit(e, "monat", HEUTE)
    assert [b.label for b in monat] == ["KW 39", "KW 40", "KW 41", "KW 42"]
    assert monat[-1].wert == 6.0 and monat[1].wert == 10.0  # 1.10. liegt in KW 40
    jahr = statistik.durchlaufzeit(e, "jahr", HEUTE)
    assert len(jahr) == 12 and next(b for b in jahr if b.label == "Mai 26").wert == 14.0
    assert next(b for b in jahr if b.label == "Okt 26").n == 3


def test_durchlaufzeit_ohne_daten_ist_leer_nicht_null():
    assert all(b.wert is None and b.text == "–" for b in statistik.durchlaufzeit([], "monat", HEUTE))


def test_durchlaufzeit_zaehlt_nur_abs():
    t = ab(None, HEUTE, art="teil", eingelagert=HEUTE - timedelta(days=3))
    assert all(b.wert is None for b in statistik.durchlaufzeit([t], "woche", HEUTE))


# ---------- Überfällig und Verspätung ----------
def test_ueberfaellig_nur_offene_abs_aus_dem_schweissen_aelteste_zuerst():
    e = [
        ab(date(2026, 10, 10), None),
        ab(date(2026, 10, 1), None),
        ab(HEUTE, None),
        ab(date(2026, 10, 1), date(2026, 10, 2)),
        ab(date(2026, 10, 1), None, art="teil"),
        ab(date(2026, 10, 1), None, archiviert=True),
    ]
    assert [x.lt for x in statistik.ueberfaellig(e, HEUTE)] == [date(2026, 10, 1), date(2026, 10, 10)]


def test_verspaetung_mittel_nur_der_zu_spaeten():
    e = [
        ab(date(2026, 10, 1), date(2026, 10, 4)),
        ab(date(2026, 10, 1), date(2026, 10, 6)),
        ab(date(2026, 10, 1), date(2026, 9, 30)),
    ]
    balken, summe = statistik.verspaetung(e, HEUTE)
    assert summe == {"versandt": 3, "spaet": 2, "mittel": "4,0"}
    assert balken[-1].wert == 4.0 and balken[-1].label == "Okt 26"


# ---------- Quellen: Schweißen und Archiv ----------
def test_quelle_schweissen_ab_und_bauteile():
    sz(
        1,
        "AB",
        "AB2600001",
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 6),
        eingelagert=date(2026, 10, 1),
    )
    sz(2, "BG", "AB2600001", bg="100 X", liefertermin_stahlbau=date(2026, 10, 7), termin_versand=date(2026, 10, 6))
    sz(
        3,
        "Teil",
        "AB2600001",
        bg="100 X",
        zeichnungsnummer="T1",
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 6),
    )
    e = statistik.aus_schweissen()
    assert [x.art for x in e] == ["ab", "teil"]
    assert e[0].dlz == 5 and e[0].lt == date(2026, 10, 7)


def test_quelle_schweissen_verschiedene_bg_termine_frueheste_lieferung_spaetester_versand():
    sz(1, "AB", "AB2600001")
    sz(2, "BG", "AB2600001", bg="100 X", liefertermin_stahlbau=date(2026, 10, 9), termin_versand=date(2026, 10, 8))
    sz(3, "BG", "AB2600001", bg="200 Y", liefertermin_stahlbau=date(2026, 10, 7), termin_versand=date(2026, 10, 12))
    ab_e = statistik.aus_schweissen()[0]
    assert ab_e.lt == date(2026, 10, 7) and ab_e.tv == date(2026, 10, 12)
    Schweisszeile.objects.filter(baugruppe="200 Y").update(termin_versand=None)
    assert statistik.aus_schweissen()[0].tv is None  # nicht alle BGs versandt


def test_quelle_archiv_zaehlt_mit_und_bestandsliste_loeschungen_nicht():
    jetzt = datetime(2026, 10, 10, tzinfo=timezone.utc)
    v = Archivvorgang.objects.create(ab_anzeige="AB1", ab_schluessel="AB1", geloescht_am=jetzt, herkunft="schweissen")
    Archivzeile.objects.create(
        vorgang=v,
        nr=1,
        ab="AB1",
        ebene="AB",
        geloescht_am=jetzt,
        eingelagert=date(2026, 10, 1),
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 6),
    )
    Archivzeile.objects.create(
        vorgang=v,
        nr=2,
        ab="AB1",
        ebene="Teil",
        geloescht_am=jetzt,
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 8),
    )
    v2 = Archivvorgang.objects.create(ab_anzeige="AB2", ab_schluessel="AB2", geloescht_am=jetzt, herkunft="bestand")
    Archivzeile.objects.create(vorgang=v2, nr=1, ab="AB2", ebene="AB", geloescht_am=jetzt)
    e = statistik.aus_archiv()
    assert sorted(x.art for x in e) == ["ab", "teil"] and all(x.archiviert for x in e)
    assert next(x for x in e if x.art == "ab").dlz == 5
    assert statistik.liefertreue_monat(e, "ab", HEUTE)[3].wert == 100
    assert statistik.liefertreue_monat(e, "teil", HEUTE)[3].wert == 0


# ---------- Seite ----------
def _versendet():
    """Ein AB und ein Teil, versendet am 12.10. (diese Woche), dazu ein verspäteter AB: damit zeigen alle Diagramme Balken."""
    kw = dict(liefertermin_stahlbau=date(2026, 10, 14), termin_versand=date(2026, 10, 12))
    sz(1, "AB", "AB2600001", eingelagert=date(2026, 10, 1), **kw)
    sz(2, "Teil", "AB2600001", bg="100 X", **kw)
    sz(
        3, "AB", "AB2600002", liefertermin_stahlbau=date(2026, 10, 5), termin_versand=date(2026, 10, 9)
    )  # 4 Tage zu spät


def test_statistik_seite_fuer_gaeste_mit_allen_kacheln(client):
    _versendet()
    r = client.get("/statistik/")
    html = r.content.decode()
    assert r.status_code == 200
    for t in (
        "Liefertreue Monat",
        "Liefertreue IA",
        "Durchschnittliche Durchlaufzeit",
        "Überfällige ABs",
        "Verspätung",
    ):
        assert t in html
    assert html.count('class="sb-soll"') == 2 and "Soll 80 %" in html  # Linie bei 80 % in beiden Liefertreue-Kacheln
    assert html.count('class="sb-spalte"') == 5 + 12 + 4 + 12  # 5 Wochen, 12 Monate, 4 Wochen (Monat), 12 Monate


def test_statistik_schalter_abs_bauteile_und_zeit(client):
    _versendet()
    assert 'gewaehlt" href="?was=abs' in client.get("/statistik/").content.decode()
    html = client.get("/statistik/?was=teile&zeit=woche").content.decode()
    assert "aller Bauteile" in html and html.count('class="sb-spalte"') == 5 + 12 + 7 + 12
    jahr = client.get("/statistik/?zeit=jahr").content.decode()
    assert jahr.count('class="sb-spalte"') == 5 + 12 + 12 + 12
    assert client.get("/statistik/?was=quatsch&zeit=quatsch").status_code == 200


def test_statistik_zeigt_farben_mit_prozent_und_ueberfaellige(client):
    sz(
        1,
        "AB",
        "AB2600001",
        anzeige="AB2600001",
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 6),
    )
    sz(2, "AB", "AB2600002", anzeige="AB2600002", liefertermin_stahlbau=date(2026, 10, 1), p="AP05", m="Paskal")
    html = client.get("/statistik/").content.decode()
    assert "sb-balken sb-gruen" in html and ">100 %<" in html
    assert (
        "AB2600002" in html.split("Überfällige ABs", 1)[1] and "13 Tage" in html and "AP05" in html and "Paskal" in html
    )


def test_prozentzahl_steht_im_balken_und_soll_linie_bezieht_sich_auf_dieselbe_hoehe(client):
    sz(
        1,
        "AB",
        "AB2600001",
        anzeige="AB2600001",
        liefertermin_stahlbau=date(2026, 10, 7),
        termin_versand=date(2026, 10, 6),
    )
    html = client.get("/statistik/").content.decode()
    assert '<div class="sb-balken sb-gruen" style="height:100%"><span class="sb-wert">100 %</span></div>' in html
    assert '<div class="sb-soll" style="bottom:80%">' in html
    assert "sb-klein" in html  # Balken ohne Daten: Zeichen „–“ steht darüber


def test_statistik_ohne_daten_zeigt_leermeldung_statt_leerer_diagramme(client):
    html = client.get("/statistik/").content.decode()
    assert "sb-diagramm" not in html
    assert html.count("Dafür gibt es noch keine Daten.") == 4
    assert "im Schnitt um" not in html and "Noch kein AB mit Termin versendet." in html


def test_statistik_mit_daten_zeigt_diagramm_und_verspaetungssatz(client):
    sz(1, "AB", "AB2600001", liefertermin_stahlbau=date(2026, 10, 5), termin_versand=date(2026, 10, 9))
    html = client.get("/statistik/").content.decode()
    assert "sb-diagramm" in html
    assert "im Schnitt um 4,0 Tage" in html

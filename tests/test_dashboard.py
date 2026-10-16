"""Dashboard (R-DB1 bis R-DB6): Inhalt, Filter, Sortierung wie die Excel-Formel DASH, Klappen je Benutzer, Kopf, Aussehen."""

import json
import re
from decimal import Decimal
from pathlib import Path

import pytest
from django.test import Client

from bestand import ansicht, dashboard
from bestand.models import Ansichtszustand, Auftrag, Baugruppe, Teil
from kern.rollen import KOMMISSIONIERUNG

from .hilfe import LISTE_204, LISTE_624, benutzer, importiere
from .test_pruefstatus import _pruefdaten_eintragen, _zeilen_csv

pytestmark = pytest.mark.django_db


# ---------- Hilfen ----------
def ab_anlegen(nr, bgs=(), ohne=(), kunde="", artikel=""):
    """AB mit Baugruppen {Name: [(Zeichnungsnr., Soll, Vorhanden)]} und Teilen ohne BG [(Zeichnungsnr., Soll, Vorhanden)]."""
    a = Auftrag.objects.create(
        ab_anzeige=nr, ab_schluessel=nr, kunde=kunde, verkaufsartikel=artikel, reihenfolge=Auftrag.objects.count()
    )
    z = 0

    def teil(zn, soll, vh, bg=None):
        nonlocal z
        z += 1
        Teil.objects.create(
            auftrag=a,
            baugruppe=bg,
            zeile=z,
            zeichnungsnummer=zn,
            benennung="TEIL " + zn,
            menge_gesamt=Decimal(soll),
            vorhanden=None if vh is None else Decimal(vh),
        )

    for zn, soll, vh in ohne:
        teil(zn, soll, vh)
    for name, teile in dict(bgs).items():
        z += 1
        b = Baugruppe.objects.create(auftrag=a, zeile=z, name=name, kurz=name.split()[0], lk_nummer=name.split()[0])
        for zn, soll, vh in teile:
            teil(zn, soll, vh, b)
    return a


def liste(**kw):
    abs_ = ansicht.baum()
    return dashboard.sortieren(dashboard.filtern(abs_, **kw))


def zeilen(lst):
    """Dashboard flach wie in Excel: (Ebene, AB, BG, Zeichnungsnummer)."""
    aus = []
    for d in lst:
        aus.append(("AB", d.a.o.ab_anzeige, "", ""))
        for g in d.gruppen:
            name = g.bg.o.name if g.bg else ""
            if g.bg:
                aus.append(("BG", d.a.o.ab_anzeige, name, ""))
            aus += [("Teil", d.a.o.ab_anzeige, name, t.o.zeichnungsnummer) for t in g.teile]
    return aus


def html(client, url="/dashboard/"):
    a = client.get(url)
    assert a.status_code == 200
    return a.content.decode()


def karte(seite, nr):
    """Die PC-Karte eines AB aus der Seite."""
    for teil in seite.split('<section class="ab-block">')[1:]:
        if f">{nr}<" in teil.split("</tr>", 1)[0]:
            return teil.split("</section>", 1)[0]
    raise AssertionError(f"Karte {nr} fehlt")


@pytest.fixture
def pruef():
    _pruefdaten_eintragen()


# ---------- R-DB1 Inhalt ----------
def test_R_DB1_spalten(client, pruef):
    kopf = html(client).split('<table class="tabelle kopfzeile">', 1)[1].split("</thead>", 1)[0]
    assert re.findall(r"<th[^>]*>([^<]*)</th>", kopf) == [
        "",
        "Arbeitsauftrag",
        "Baugruppe",
        "Einzelteil",
        "Kunde",
        "Lagerort",
        "Status",
        "Fortschritt",
        "",
        "Stand",
        "Planung",
    ]


def test_R_DB1_alle_abs_mit_bgs_und_teilen(client, pruef):
    seite = html(client, "/dashboard/?ansicht=alles")
    assert seite.count('<section class="ab-block">') == 2
    assert seite.count('<tr class="dbg unter"') == 4  # BG 100, 200, 300, 10
    assert seite.count('class="dteil teil unter"') == 30  # 25 + 5 Teile


def test_R_DB1_ab_zeile_nummer_artikel_kunde(client, pruef):
    k = karte(html(client), "AB2515204")
    ab_zeile = k.split("</tr>", 1)[0]
    assert '>AB2515204</button><span class="ab-text">Halter Anzeigegeraet VO</span>' in ab_zeile
    assert ">KNDS</td>" in ab_zeile  # Kunde nur in der AB-Zeile
    assert "KNDS" not in k.split("</tr>", 1)[1]


def test_R_DB1_bg_und_teil_zeilen(client, pruef):
    from bestand import lagerort

    lagerort.setze_ab(Auftrag.objects.get(ab_anzeige="AB2515204"), "L2")
    k = karte(html(client, "/dashboard/?ansicht=alles"), "AB2515204")
    bg = k.split('<tr class="dbg unter"', 2)[1].split("</tr>", 1)[0]
    assert ">100 HALTER ANZEIGEGERAET GE</button>" in bg and "L2" not in bg  # Lagerort nur in Teil-Zeilen
    teil = next(z for z in k.split("<tr ") if "SK1145-977452.005.0" in z and "dteil" in z)
    assert 'SK1145-977452.005.0<span class="ab-text">' in teil  # Zeichnungsnummer + Benennung
    assert '<td class="mitte">L2</td>' in teil
    assert "50 / 42  (+8 zu viel)" in teil and ">Komplett<" in teil and "100 %" in teil


@pytest.mark.parametrize(
    "p, text",
    [
        (0.3743, "37 %"),
        (0.2132, "21 %"),
        (1.0, "100 %"),
        (0.0, "0 %"),
        (0.99, "99 %"),
        (0.125, "13 %"),
        (0.285, "29 %"),
        (0.4762, "48 %"),
        (0.01, "1 %"),
    ],
)
def test_R_DB1_fortschritt_prozent_wie_excel_format(p, text):
    assert dashboard.prozent_text(p) == text


def test_R_DB1_pruef_status_werte_im_dashboard(client, pruef):
    """Jede Zeile des Prüffalls: Status, Fortschritt % (Excel-Format „0 %“) und Stand stehen so im Dashboard."""
    seite = html(client, "/dashboard/?ansicht=alles").split('class="nur-handy')[0]
    reihen = [
        re.sub(r'<td class="[^"]*plan-zelle">.*?</td>\s*$', "", z.split("</tr>", 1)[0], flags=re.S)
        for z in seite.split("<tr ")[1:]
        if z.startswith('class="d')
    ]  # ohne die Spalte „Planung“ am Ende
    soll = _zeilen_csv()
    web = [
        (
            re.search(r'data-feld="status">([^<]*)<', z).group(1),
            re.search(r'<td class="zahl">([^<]*)</td>', z).group(1),
            re.findall(r"<td>([^<]*)</td>\s*$", z)[-1],
        )
        for z in reihen
    ]
    erwartet = {}
    for s in soll:
        erwartet.setdefault((s["Status"], dashboard.prozent_text(s["Prozent"]), s["Fortschritt"]), 0)
        erwartet[(s["Status"], dashboard.prozent_text(s["Prozent"]), s["Fortschritt"])] += 1
    gefunden = {}
    for w in web:
        gefunden[w] = gefunden.get(w, 0) + 1
    assert len(web) == 36
    assert gefunden == erwartet


# ---------- R-DB2 Filter ----------
def test_R_DB2_ansichten_und_standard(client, pruef):
    assert dashboard.ANSICHTEN == [("ab", "Nur ABs"), ("bg", "ABs + Baugruppen"), ("alles", "Alles")]
    seite = html(client)
    assert (
        'name="ansicht" value="bg"' in seite and 'name="ansicht"' in seite and '<select id="ansicht"' not in seite
    )  # Dropdown entfernt
    for knopf in (">ABs<", ">BGs<", ">Alles<"):
        assert knopf in seite
    assert 'class="knopf such-knopf"' in seite


def test_dashboard_kopf_vier_kacheln_in_einer_reihe(client, pruef):
    seite = html(client).split("<main", 1)[1]
    assert "bento dash-reihe" in seite and 'href="/regal/"' not in seite
    for weg in ("Regal</span>", 'data-kachel="forecast"'):
        assert weg not in seite
    reihe = seite.split("bento dash-reihe", 1)[1].split("</form>")[0]
    assert (
        reihe.index('data-kopf="komplett"')
        < reihe.index('data-kopf="teilweise"')
        < reihe.index('data-kopf="offen"')
        < reihe.index('data-kopf="ab"')
    )
    assert reihe.index("kachel-akzent") > reihe.index('data-kopf="offen"') and reihe.index(
        "Gesamtfortschritt"
    ) > reihe.index("kachel-akzent")


def test_dashboard_sortieren_nach_prozent(client, pruef):
    ab_anlegen("AB9001", bgs={"10 X": [("A", 10, 10)]})  # 100 %
    ab_anlegen("AB9002", bgs={"10 X": [("A", 10, 0)]})  # 0 %
    ab_anlegen("AB9003", bgs={"10 X": [("A", 10, 5)]})  # 50 %
    abs_ = ansicht.baum()
    nach = lambda r: [d.a.o.ab_anzeige for d in dashboard.sortieren(abs_, r) if d.a.o.ab_anzeige.startswith("AB900")]  # noqa: E731
    assert nach("ab") == ["AB9001", "AB9003", "AB9002"] and nach("auf") == ["AB9002", "AB9003", "AB9001"]
    seite = html(client, "/dashboard/?ansicht=alles")  # Standard: absteigend
    assert seite.index("AB9001") < seite.index("AB9003") < seite.index("AB9002")
    seite = html(client, "/dashboard/?ansicht=alles&sort=auf")
    assert seite.index("AB9002") < seite.index("AB9003") < seite.index("AB9001")
    assert '<option value="ab" selected>Absteigend</option>' in html(client)


def test_R_DB2_ab_suche_teilwort_ohne_gross_klein(pruef):
    assert [d.a.o.ab_anzeige for d in liste(suche="2515")] == ["AB2515204"]
    assert [d.a.o.ab_anzeige for d in liste(suche="ab26")] == ["AB2616624"]
    assert [d.a.o.ab_anzeige for d in liste(suche="  ")] == ["AB2616624", "AB2515204"]  # leer = alle
    assert liste(suche="2515204 ") and not liste(suche="SK1990")  # nur AB-Nummer


def test_R_DB2_ab_suche_findet_lose():
    importiere(LISTE_204)
    ab_anlegen("AB2616200 / Los 1", bgs={"10 X": [("A", 1, None)]})
    assert [d.a.o.ab_anzeige for d in liste(suche="los 1")] == ["AB2616200 / Los 1"]


def test_R_DB2_kunden_liste_alphabetisch_ohne_doppelte():
    ab_anlegen("AB1", kunde="Zeta GmbH")
    ab_anlegen("AB2", kunde="KNDS")
    ab_anlegen("AB3", kunde="knds ")
    ab_anlegen("AB4", kunde="")
    ab_anlegen("AB5", kunde="Alpha")
    assert dashboard.kunden(ansicht.baum()) == ["Alle", "Alpha", "KNDS", "Zeta GmbH"]


def test_R_DB2_kunde_filtert(client):
    ab_anlegen("AB1", kunde="KNDS", bgs={"10 X": [("A", 1, 1)]})
    ab_anlegen("AB2", kunde="Alpha", bgs={"10 X": [("A", 1, None)]})
    assert [d.a.o.ab_anzeige for d in liste(kunde="knds")] == ["AB1"]
    assert [d.a.o.ab_anzeige for d in liste(kunde="Alle")] == ["AB1", "AB2"]
    seite = html(client, "/dashboard/?kunde=Alpha")
    assert seite.count('<section class="ab-block">') == 1 and ">AB2<" in seite
    assert '<option value="Alpha" selected>Alpha</option>' in seite
    assert html(client, "/dashboard/?kunde=Gibtsnicht").count('<section class="ab-block">') == 2  # unbekannt = Alle


def test_R_DB2_suche_und_kunde_zusammen(client):
    ab_anlegen("AB2515001", kunde="KNDS")
    ab_anlegen("AB2515002", kunde="Alpha")
    ab_anlegen("AB2616003", kunde="KNDS")
    assert [d.a.o.ab_anzeige for d in liste(suche="2515", kunde="KNDS")] == ["AB2515001"]


def test_R_DB2_keine_eintraege(client, pruef):
    seite = html(client, "/dashboard/?q=xyz")
    assert "Keine Einträge für „xyz“" in seite and '<section class="ab-block">' not in seite


def test_R_DB2_leer_ohne_abs(client):
    assert "Noch keine Arbeitsaufträge" in html(client)


# ---------- R-DB3 Sortierung ----------
def test_R_DB3_reihenfolge_wie_excel_formel_pruef_status(pruef):
    """Erwartung aus der CSV (mit Excel gerechnet) und den Sortierstufen der Formel DASH (SORTBY)."""
    statuswert = {"Komplett": 0, "Teilweise": 2}
    stufe = {"AB": 1, "BG": 2, "Teil": 3}
    soll = sorted(
        _zeilen_csv(),
        key=lambda s: (
            s["SortAB"],
            s["AB"].casefold(),
            stufe[s["Ebene"]] > 1,
            s["SortBG"],
            s["Baugruppe"].casefold(),
            stufe[s["Ebene"]] > 2,
            statuswert.get(s["Status"], 4) - s["Prozent"],
            s["Zeichnungsnummer"].casefold(),
        ),
    )
    erwartet = [
        (s["Ebene"], s["AB"], s["Baugruppe"], s["Zeichnungsnummer"] if s["Ebene"] == "Teil" else "") for s in soll
    ]
    assert zeilen(liste()) == erwartet
    assert erwartet[0] == ("AB", "AB2616624", "", "")  # komplett zuerst


def test_R_DB3_abs_komplett_dann_teilweise_hoher_fortschritt_dann_offen():
    ab_anlegen("AB5", bgs={"10 X": [("A", 10, None)]})  # Offen
    ab_anlegen("AB4", bgs={"10 X": [("A", 10, 2)]})  # Teilweise 20 %
    ab_anlegen("AB3", bgs={"10 X": [("A", 10, 8)]})  # Teilweise 80 %
    ab_anlegen("AB2", bgs={"10 X": [("A", 10, 10)]})  # Komplett
    ab_anlegen("AB1", bgs={"10 X": [("A", 10, None)]})  # Offen, kleinere Nummer
    ab_anlegen("AB0")  # keine Teile: Status „-“ (Schlüssel 4)
    assert [d.a.o.ab_anzeige for d in liste()] == ["AB2", "AB3", "AB4", "AB0", "AB1", "AB5"]


def test_R_DB3_gleicher_schluessel_nach_ab_nummer_ohne_gross_klein():
    ab_anlegen("ab2", bgs={"10 X": [("A", 1, 1)]})
    ab_anlegen("AB1", bgs={"10 X": [("A", 1, 1)]})
    ab_anlegen("AB3", bgs={"10 X": [("A", 1, 1)]})
    assert [d.a.o.ab_anzeige for d in liste()] == ["AB1", "ab2", "AB3"]


def test_R_DB3_bgs_im_ab_und_teile_in_der_bg():
    ab_anlegen(
        "AB1",
        bgs={
            "300 C": [("Z", 4, None), ("Y", 4, None)],  # Offen
            "100 A": [("K2", 4, 4), ("K1", 4, 4)],  # Komplett
            "200 B": [("T3", 4, None), ("T2", 4, 1), ("T1", 4, 3), ("T0", 4, 4)],  # Teilweise
            "050 D": [("Q", 4, None)],  # Offen, Name kleiner als „300 C“
        },
    )
    assert zeilen(liste()) == [
        ("AB", "AB1", "", ""),
        ("BG", "AB1", "100 A", ""),
        ("Teil", "AB1", "100 A", "K1"),
        ("Teil", "AB1", "100 A", "K2"),
        ("BG", "AB1", "200 B", ""),
        ("Teil", "AB1", "200 B", "T0"),
        ("Teil", "AB1", "200 B", "T1"),
        ("Teil", "AB1", "200 B", "T2"),
        ("Teil", "AB1", "200 B", "T3"),
        ("BG", "AB1", "050 D", ""),
        ("Teil", "AB1", "050 D", "Q"),
        ("BG", "AB1", "300 C", ""),
        ("Teil", "AB1", "300 C", "Y"),
        ("Teil", "AB1", "300 C", "Z"),
    ]


def test_R_DB3_teile_ohne_bg_vor_den_baugruppen():
    """Excel: Teile ohne BG erben den BG-Schlüssel −9 der AB-Zeile und stehen deshalb vor allen BGs."""
    ab_anlegen("AB1", ohne=[("O2", 1, None), ("O1", 1, 1)], bgs={"100 A": [("K", 1, 1)]})
    assert zeilen(liste()) == [
        ("AB", "AB1", "", ""),
        ("Teil", "AB1", "", "O1"),
        ("Teil", "AB1", "", "O2"),
        ("BG", "AB1", "100 A", ""),
        ("Teil", "AB1", "100 A", "K"),
    ]


def test_R_DB3_unabhaengig_von_import_reihenfolge():
    importiere(LISTE_204)
    importiere(LISTE_624)
    Teil.objects.filter(auftrag__ab_schluessel="AB2616624").update(vorhanden=Decimal(1))
    assert [d.a.o.ab_anzeige for d in liste()] == ["AB2616624", "AB2515204"]  # Teilweise vor Offen


# ---------- R-DB4 Klappen ----------
def zustand(seite):
    """{aria-label-Anfang: offen} der PC-Pfeile und welche Zeilen versteckt sind."""
    pfeile = dict(
        re.findall(r'data-zustand="([^"]+)" aria-expanded="(true|false)"', seite.split('class="nur-handy')[0])
    )
    return {k: v == "true" for k, v in pfeile.items()}


def versteckt(seite, art):
    pc = seite.split('class="nur-handy')[0]
    return [("hidden" in z.split(">", 1)[0]) for z in pc.split("<tr ")[1:] if z.startswith(f'class="{art}')]


@pytest.fixture
def zwei_abs():
    ab_anlegen("AB1", ohne=[("O1", 1, None)], bgs={"100 A": [("K", 1, 1)], "200 B": [("L", 1, None)]})
    ab_anlegen("AB2", bgs={"100 A": [("M", 1, None)]})


@pytest.mark.parametrize("wahl, ab_offen, bg_offen", [("ab", False, False), ("bg", True, False), ("alles", True, True)])
def test_R_DB4_startzustand_je_ansicht(client, zwei_abs, wahl, ab_offen, bg_offen):
    seite = html(client, f"/dashboard/?ansicht={wahl}")
    z = zustand(seite)
    assert z["ab1"] is ab_offen and z["ab2"] is ab_offen
    assert z["ab1|100 a"] is bg_offen and z["ab1|200 b"] is bg_offen
    assert z["ab1|"] is bg_offen  # Teile ohne BG klappen wie eine BG
    assert all(h is not ab_offen for h in versteckt(seite, "dbg"))
    assert all(h is not (ab_offen and bg_offen) for h in versteckt(seite, "dteil"))
    handy = seite.split('class="nur-handy')[1]
    assert handy.count('class="dash-karte') == 2 and (" open>" in handy) is ab_offen


def merken(client, wahl, schluessel, offen):
    a = client.post(
        "/dashboard/klappen/",
        json.dumps({"ansicht": wahl, "schluessel": schluessel, "offen": offen}),
        content_type="application/json",
    )
    assert a.status_code == 200
    return a


def test_R_DB4_zustand_bleibt_je_benutzer(client, zwei_abs):
    u = benutzer("lager", KOMMISSIONIERUNG)
    client.force_login(u)
    html(client, "/dashboard/?ansicht=bg")
    merken(client, "bg", "ab2", False)
    merken(client, "bg", "ab1|200 b", True)
    z = zustand(html(client, "/dashboard/?ansicht=bg"))
    assert (z["ab1"], z["ab2"], z["ab1|100 a"], z["ab1|200 b"]) == (True, False, False, True)
    z = zustand(html(client, "/dashboard/?ansicht=bg&q=AB"))  # Suche/Kunde ändern den Zustand nicht
    assert (z["ab2"], z["ab1|200 b"]) == (False, True)
    z = zustand(html(client, "/dashboard/"))  # ohne Angabe: gemerkte Ansicht
    assert (z["ab2"], z["ab1|200 b"]) == (False, True)
    assert Ansichtszustand.objects.get(benutzer=u).klappen == {"ab2": False, "ab1|200 b": True}
    andere = Client()  # anderer Benutzer: eigener Zustand
    andere.force_login(benutzer("zweiter", KOMMISSIONIERUNG))
    assert zustand(html(andere, "/dashboard/?ansicht=bg"))["ab2"] is True


def test_R_DB4_ansicht_umstellen_setzt_zurueck(client, zwei_abs):
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    html(client, "/dashboard/?ansicht=bg")
    merken(client, "bg", "ab2", False)
    assert zustand(html(client, "/dashboard/?ansicht=alles"))["ab2"] is True
    assert zustand(html(client, "/dashboard/?ansicht=bg"))["ab2"] is True  # zurück: wieder Startzustand


def test_R_DB4_klappen_mit_alter_ansicht_beginnt_neu(client, zwei_abs):
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    html(client, "/dashboard/?ansicht=bg")
    merken(client, "bg", "ab2", False)
    merken(client, "ab", "ab1", True)  # aus einem anderen Fenster mit „Nur ABs“
    z = zustand(html(client, "/dashboard/"))
    assert (z["ab1"], z["ab2"]) == (True, False) and '<option value="ab" selected>' in html(client, "/dashboard/")


def test_R_DB4_gast_merkt_in_seiner_sitzung(client, zwei_abs):
    html(client, "/dashboard/?ansicht=bg")
    merken(client, "bg", "ab1", False)
    assert zustand(html(client, "/dashboard/?ansicht=bg"))["ab1"] is False
    assert zustand(html(Client(), "/dashboard/?ansicht=bg"))["ab1"] is True  # anderer Gast
    assert not Ansichtszustand.objects.exists()


def test_R_DB4_zustand_bleibt_nach_ersetzen_des_ab(client):
    """Schlüssel wie Excel: AB-Nummer bzw. AB|BG-Name, nicht die interne Nummer, die beim Ersetzen neu vergeben wird."""
    from bestand import importer

    importiere(LISTE_204)
    client.force_login(benutzer("lager", KOMMISSIONIERUNG))
    html(client, "/dashboard/?ansicht=bg")
    merken(client, "bg", "ab2515204|100 halter anzeigegeraet ge", True)
    assert importer.speichern(importer.lesen(LISTE_204.read_bytes(), LISTE_204.name))[1]  # ersetzt
    assert zustand(html(client, "/dashboard/"))["ab2515204|100 halter anzeigegeraet ge"] is True


@pytest.mark.parametrize(
    "daten",
    [
        "kein json",
        {"ansicht": "bg", "schluessel": "ab1"},
        {"ansicht": "x", "schluessel": "ab1", "offen": True},
        {"ansicht": "bg", "schluessel": "", "offen": True},
        {"ansicht": "bg", "schluessel": "x" * 501, "offen": True},
    ],
)
def test_R_DB4_ungueltige_angaben(client, daten):
    body = daten if isinstance(daten, str) else json.dumps(daten)
    assert client.post("/dashboard/klappen/", body, content_type="application/json").status_code == 400


def test_R_DB4_nur_post_und_csrf(zwei_abs):
    c = Client(enforce_csrf_checks=True)
    assert c.get("/dashboard/klappen/").status_code == 405
    a = c.post(
        "/dashboard/klappen/",
        json.dumps({"ansicht": "bg", "schluessel": "ab1", "offen": False}),
        content_type="application/json",
    )
    assert a.status_code == 403


def test_R_DB4_grenze_gemerkter_eintraege(client, monkeypatch):
    from bestand import views_dashboard

    monkeypatch.setattr(views_dashboard, "MAX_SCHLUESSEL", 2)
    merken(client, "bg", "a", True)
    merken(client, "bg", "b", True)
    a = client.post(
        "/dashboard/klappen/",
        json.dumps({"ansicht": "bg", "schluessel": "c", "offen": True}),
        content_type="application/json",
    )
    assert a.status_code == 400


# ---------- R-DB5 Kopf ----------
def test_R_DB5_kopf_zaehler_und_gesamt(client, pruef):
    ab_anlegen("AB9", bgs={"10 X": [("A", 10, 5)]})  # Teilweise
    ab_anlegen("AB8", bgs={"10 X": [("A", 10, None)]})  # Offen
    k = dashboard.kopf(ansicht.baum())
    assert (k["ab"], k["komplett"], k["teilweise"], k["offen"]) == (4, 1, 2, 1)
    # R-S6: Σ Ist / Σ Soll über alle Teile aller ABs (Prüffall + 5/10 + 0/10)
    teile = [t.w for a in ansicht.baum() for t in a.alle_teile]
    ist = sum(t.ist for t in teile)
    soll = sum(t.soll for t in teile)
    assert k["gesamt"] == pytest.approx(float(ist / soll))
    seite = html(client, "/dashboard/?q=AB9&kunde=Alle")  # Kopf unabhängig vom Filter
    for name, wert in (("ab", "4"), ("komplett", "1"), ("teilweise", "2"), ("offen", "1"), ("gesamt", k["gesamt_txt"])):
        assert f'data-kopf="{name}">{wert}<' in seite


def test_R_DB5_gesamt_pruef_status(pruef):
    k = dashboard.kopf(ansicht.baum())
    teile = [t.w for a in ansicht.baum() for t in a.alle_teile]
    assert k["gesamt"] == pytest.approx(float(sum(t.ist for t in teile) / sum(t.soll for t in teile)))
    assert (k["ab"], k["komplett"], k["teilweise"], k["offen"]) == (2, 1, 1, 0)


def test_R_DB5_ohne_abs():
    k = dashboard.kopf([])
    assert (k["ab"], k["komplett"], k["gesamt"], k["gesamt_txt"]) == (0, 0, 0.0, "0,0 %")


# ---------- R-DB6 Aussehen ----------
def test_R_DB6_zeilenarten_und_statusfarbe(client, pruef):
    seite = html(client, "/dashboard/?ansicht=alles")
    assert '<tr class="dab teilweise">' in karte(seite, "AB2515204")
    assert '<tr class="dab komplett">' in karte(seite, "AB2616624")
    css = (Path(__file__).resolve().parent.parent / "kern/static/kern/css/listen.css").read_text(encoding="utf-8")
    for regel in (
        ".tabelle.dash tr.dab.komplett td { background: var(--status-komplett-bg); }",
        ".tabelle.dash tr.dab.teilweise td { background: var(--status-teilweise-bg); }",
        ".dash-karten .ab-block { border-top: 4px solid var(--brand-gray); }",
        ".tabelle.dash tr.dab .ab-nr { font-weight: 700; font-size: var(--fs-h3);",
        ".tabelle.dash tr.dteil td { font-size: var(--fs-label); color: var(--ink-muted);",
    ):
        assert regel in css


def test_R_DB6_balken_proportional(client, pruef):
    seite = html(client, "/dashboard/?ansicht=alles")
    k = karte(seite, "AB2515204")
    ab_zeile = k.split("</tr>", 1)[0]
    assert 'aria-label="10 von 25"><span style="width:37%">' in ab_zeile  # 37,43 % → 37 % der Breite
    assert 'aria-label="2 von 14"><span style="width:21%">' in k
    assert 'aria-label="0 von 3"><span style="width:0%">' in k


# ---------- Rollen (R-P2, W2) ----------
def test_R_P2_dashboard_fuer_gaeste_ohne_aendern(client, pruef):
    seite = html(client)
    assert "data-alles" not in seite and 'data-feld="vorhanden"' not in seite and "platz-wahl" not in seite
    assert 'href="/dashboard/" class="aktiv"' in seite


def test_dashboard_im_menue_und_entwuerfe_entfernt(client):
    assert client.get("/entwurf/").status_code == 404
    assert 'href="/dashboard/"' in html(client, "/")


def test_dashboard_knoepfe_setzen_klappen_zurueck_und_kachel_text(client, pruef):
    seite = html(client)
    assert "in der Bestandsliste</span>" not in seite and "Aufträge</span>" in seite
    assert "&amp;neu=1" in seite
    assert client.get("/dashboard/?ansicht=bg&neu=1").status_code == 200


def test_R_DB1_baugruppen_im_schweissen_stehen_unten_grau_durchgestrichen(client):
    from .test_schweissen import ADMIN, als, entnehmen_bg, voll

    a = importiere(LISTE_204)  # BG 100, 200, 300
    voll(a, "100")
    als(client, "plan", ADMIN)
    entnehmen_bg(client, a, "100")
    seite = html(client)
    assert 'class="status schweissen">Schweißen<' in seite and "dsw" in seite
    karte_ = karte(seite, a.ab_anzeige)
    assert karte_.rindex("dsw") > karte_.rindex('class="dbg unter"')  # ganz unten, nach den eigenen BGs
    assert "100 HALTER" in karte_.split("dsw", 1)[1]
    assert 'class="status schweissen"' not in html(client, "/forecast/")  # nur im Dashboard
    css = Path("kern/static/kern/css/listen.css").read_text(encoding="utf-8")
    assert "tr.dsw td:not(:has(.status)) { text-decoration: line-through; }" in css


def test_R_DB1_ab_verschwindet_erst_wenn_alle_baugruppen_im_schweissen_liegen(client):
    from .test_schweissen import ADMIN, als, entnehmen_bg, voll

    a = importiere(LISTE_204)
    als(client, "plan", ADMIN)
    for kurz in ("100", "200"):
        voll(a, kurz)
        entnehmen_bg(client, a, kurz)
        assert a.ab_anzeige in html(client)  # noch eine BG in der Bestandsliste
    voll(a, "300")
    entnehmen_bg(client, a, "300")
    assert a.ab_anzeige not in html(client)  # alle im Schweißen: AB weg


def test_R_DB1_baugruppen_im_schweissen_zaehlen_nicht_in_status_und_zaehler(client):
    from .test_schweissen import ADMIN, als, entnehmen_bg, voll

    a = importiere(LISTE_204)
    voll(a, "100")
    vorher = dashboard.kopf(ansicht.baum())
    als(client, "plan", ADMIN)
    entnehmen_bg(client, a, "100")
    assert dashboard.kopf(ansicht.baum())["ab"] == vorher["ab"] == 1

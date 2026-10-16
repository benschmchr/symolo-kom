"""Symolo-Ansichten (symolo/): Bauschritt aktuell, Regeln aus dem Skill des Symolo-Entwicklers, Datenschicht.

Die Datenschicht selbst wird mit Node getestet (tests/symolo/*.test.js) und hier mit aufgerufen.
"""

import json
import os
import re
import shutil
import subprocess
from decimal import Decimal
from pathlib import Path

import pytest

from bestand import rechnen
from tools import symolo_bauen

BASIS = Path(__file__).resolve().parent.parent
SYMOLO = BASIS / "symolo"
VERMERK = "Erstellt: Ben Schumacher, 09.10.2026"
NODE = shutil.which("node")


def ansichten():
    return [(a, (symolo_bauen.FERTIG / f"{a['name']}.js").read_text(encoding="utf-8")) for a in symolo_bauen.ANSICHTEN]


def test_symolo_fertig_ist_aktuell():
    for pfad, text in symolo_bauen.alles_bauen().items():
        assert pfad.read_text(encoding="utf-8") == text, "python tools/symolo_bauen.py laufen lassen"


@pytest.mark.parametrize("a,text", ansichten(), ids=lambda x: x["name"] if isinstance(x, dict) else "")
def test_symolo_skill_css_und_hooks(a, text):
    # Skill, Abnahme: genau ein CSS-Block, zwei Backticks, rmcss mit derselben ID, Hooks vorhanden
    assert text.count("injector.css(`") == 1
    assert text.count("`") == 2
    gesetzt = re.search(r'injector\.css\(`[\s\S]*?`,\s*"([^"]+)"\)', text).group(1)
    entfernt = re.search(r'injector\.rmcss\("([^"]+)"\)', text).group(1)
    assert gesetzt == entfernt == a["css_id"]
    for hook in ("form_on_load: function", "before_set_values: async function", "onUnload: function"):
        assert hook in text
    css = text.split("injector.css(`", 1)[1].split("`", 1)[0]
    symolo_bauen.pruefen_css(a["name"], css, a["klasse"])


@pytest.mark.parametrize("a,text", ansichten(), ids=lambda x: x["name"] if isinstance(x, dict) else "")
def test_symolo_skill_verbotenes_fehlt(a, text):
    symolo_bauen.pruefen_js(a["name"], text.split("injector.css(`", 1)[0])


@pytest.mark.parametrize("a,text", ansichten(), ids=lambda x: x["name"] if isinstance(x, dict) else "")
def test_R_P3_vermerk_in_symolo_ansicht(a, text):
    assert VERMERK in text
    assert '"kom-vermerk", "' + VERMERK + '"' in text  # in der Fußzeile der Ansicht


def test_symolo_keine_zugangsdaten_und_kein_endpunkt():
    """Vorgabe Ben: nie auf Symolo zugreifen; Zugangsdaten aus test.html nirgends übernehmen."""
    for p in [*SYMOLO.rglob("*.js"), *SYMOLO.rglob("*.html")]:
        t = p.read_text(encoding="utf-8")
        assert "fwm.symolo.biz" not in t, p
        assert "assets.symolo.biz" not in t, p
        assert not re.search(r"pass\s*:\s*\"[^\"]", t), p


def test_symolo_schreibsperre_ist_an():
    """Bis der Entwickler die Namen geprüft hat, schreibt die App in Symolo nicht."""
    t = (SYMOLO / "quelle" / "10_einstellungen.js").read_text(encoding="utf-8")
    assert "schreibenErlaubtInSymolo: false" in t


@pytest.mark.skipif(NODE is None, reason="Node fehlt")
def test_symolo_ansichten_sind_gueltiges_javascript():
    # lokal_ansichten.js ist ein Skript; die Einzeldateien sind ein Objekt zum Einfügen (in Klammern prüfen)
    subprocess.run([NODE, "--check", str(symolo_bauen.FERTIG / "lokal_ansichten.js")], check=True)
    for a, _ in ansichten():
        pfad = str(symolo_bauen.FERTIG / f"{a['name']}.js")
        js = "new Function('return (' + require('fs').readFileSync(process.argv[1], 'utf8') + '\\n)')"
        subprocess.run([NODE, "-e", js, pfad], check=True)


NODE_TESTS = sorted((BASIS / "tests" / "symolo").glob("*.test.js"))


@pytest.mark.skipif(NODE is None, reason="Node fehlt")
@pytest.mark.parametrize("datei", NODE_TESTS, ids=lambda p: p.name)
def test_symolo_node(datei):
    """Datenschicht, Bestandsliste und Prüffall 9.1 (pruef_status_9_1.test.js) mit Node gegen den Nachbau."""
    erg = subprocess.run([NODE, "--test", str(datei)], capture_output=True, text=True)
    assert erg.returncode == 0, erg.stdout[-4000:] + erg.stderr[-2000:]


@pytest.mark.skipif(NODE is None, reason="Node fehlt")
def test_symolo_rechnet_wie_die_bisherige_app(tmp_path):
    """Alle Beispieldaten: Status, Fortschritt und Prozent aus 45_rechnen.js gleich wie bestand/rechnen.py."""
    ausgabe = tmp_path / "vergleich.json"
    datei = BASIS / "tests" / "symolo" / "bestand.test.js"
    env = {**os.environ, "KOM_VERGLEICH_AUSGABE": str(ausgabe)}
    erg = subprocess.run([NODE, "--test", str(datei)], capture_output=True, text=True, env=env)
    assert erg.returncode == 0, erg.stdout[-4000:]
    j = json.loads(ausgabe.read_text(encoding="utf-8"))

    def dec(x):
        return None if x is None else Decimal(str(x))

    teile = {t["id"]: rechnen.teil(dec(t["vorhanden"]), dec(t["menge_gesamt"])) for t in j["daten"]["teil"]}
    je_bg, je_ab = {}, {}
    for t in j["daten"]["teil"]:
        je_ab.setdefault(t["auftrag_id_auftrag"], []).append(teile[t["id"]])
        if t["baugruppe_id_baugruppe"] is not None:
            je_bg.setdefault(t["baugruppe_id_baugruppe"], []).append(teile[t["id"]])

    geprueft = 0
    for a in j["abs"]:
        for z in a["zeilen"]:
            if z["art"] == "teil":
                w = teile[z["id"]]
            elif z["art"] == "bg":
                w = rechnen.sammel(je_bg.get(z["id"], []))
            else:
                w = rechnen.sammel(je_ab.get(z["id"], []))
            assert (z["status"], z["fortschritt"], round(z["prozent"], 6)) == (
                w.status,
                w.fortschritt,
                round(w.prozent, 6),
            ), a["ab"]
            geprueft += 1
    assert geprueft > 100


@pytest.mark.skipif(NODE is None, reason="Node fehlt")
def test_symolo_ab_nummern_wie_die_bisherige_app(tmp_path):
    """R-AB1, R-AB3, R-AB5: 4C_ab_nummer.js gibt für viele Eingaben dasselbe aus wie bestand/ab_nummer.py."""
    from bestand.ab_nummer import ab_form, ab_schluessel, forecast_schluessel

    ausgabe = tmp_path / "ab.json"
    datei = BASIS / "tests" / "symolo" / "archiv.test.js"
    env = {**os.environ, "KOM_AB_AUSGABE": str(ausgabe)}
    erg = subprocess.run([NODE, "--test", str(datei)], capture_output=True, text=True, env=env)
    assert erg.returncode == 0, erg.stdout[-4000:]
    faelle = json.loads(ausgabe.read_text(encoding="utf-8"))
    assert len(faelle) > 40
    for f in faelle:
        assert (f["form"], f["schluessel"], f["forecast"]) == (
            ab_form(f["ein"]),
            ab_schluessel(f["ein"]),
            forecast_schluessel(f["ein"]),
        ), repr(f["ein"])


@pytest.mark.skipif(NODE is None, reason="Node fehlt")
def test_symolo_statistik_wie_die_bisherige_app(tmp_path):
    """Liefertreue, Durchlaufzeit, überfällige ABs und Verspätung: 4I_statistik.js rechnet für viele Zufallsfälle
    dasselbe wie bestand/statistik.py (Python: Wert und Text, Farbe, Anzahl, Hinweistext jedes Balkens)."""
    import random
    from datetime import date, timedelta

    from bestand import statistik

    zufall = random.Random(20261016)
    heute = date(2026, 10, 14)

    def tag(spanne):
        return None if zufall.random() < 0.15 else heute + timedelta(days=zufall.randint(-spanne, spanne // 4))

    eintraege = []
    for i in range(600):
        lt = tag(400)
        tv = None if lt is None or zufall.random() < 0.2 else lt + timedelta(days=zufall.randint(-6, 12))
        ein = None if tv is None or zufall.random() < 0.1 else tv - timedelta(days=zufall.randint(0, 30))
        eintraege.append(
            statistik.Eintrag(
                zufall.choice(["ab", "ab", "teil"]), f"AB{i}", lt, tv, ein, archiviert=zufall.random() < 0.3
            )
        )

    eingabe, ausgabe = tmp_path / "eingabe.json", tmp_path / "ausgabe.json"

    def iso(d):
        return None if d is None else d.isoformat()

    eingabe.write_text(
        json.dumps(
            {
                "heute": iso(heute),
                "eintraege": [
                    {
                        "art": e.art,
                        "anzeige": e.anzeige,
                        "lt": iso(e.lt),
                        "tv": iso(e.tv),
                        "eingelagert": iso(e.eingelagert),
                        "archiviert": e.archiviert,
                    }
                    for e in eintraege
                ],
            }
        ),
        encoding="utf-8",
    )
    env = {**os.environ, "KOM_STAT_EINGABE": str(eingabe), "KOM_STAT_AUSGABE": str(ausgabe)}
    erg = subprocess.run(
        [NODE, "--test", str(BASIS / "tests" / "symolo" / "statistik.test.js")], capture_output=True, text=True, env=env
    )
    assert erg.returncode == 0, erg.stdout[-4000:]
    js = json.loads(ausgabe.read_text(encoding="utf-8"))

    def b(liste):
        return [[x.label, x.wert, x.text, x.hoehe, x.farbe, x.n, x.titel] for x in liste]

    spaet_balken, spaet = statistik.verspaetung(eintraege, heute)
    py = {
        "monat_ab": b(statistik.liefertreue_monat(eintraege, "ab", heute)),
        "monat_teil": b(statistik.liefertreue_monat(eintraege, "teil", heute)),
        "ia_ab": b(statistik.liefertreue_ia(eintraege, "ab", heute)),
        "ia_teil": b(statistik.liefertreue_ia(eintraege, "teil", heute)),
        "dlz_woche": b(statistik.durchlaufzeit(eintraege, "woche", heute)),
        "dlz_monat": b(statistik.durchlaufzeit(eintraege, "monat", heute)),
        "dlz_jahr": b(statistik.durchlaufzeit(eintraege, "jahr", heute)),
        "ueberfaellig": [[e.anzeige, e.lt.strftime("%d.%m.%Y")] for e in statistik.ueberfaellig(eintraege, heute)],
        "verspaetung": [b(spaet_balken), spaet],
    }
    for name in py:
        assert json.loads(json.dumps(py[name])) == js[name], name
    assert py["ueberfaellig"] and any(x[1] is not None for x in py["monat_ab"] + py["ia_ab"])

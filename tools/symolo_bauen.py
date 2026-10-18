"""Baut die fertigen Symolo-Ansichten aus symolo/quelle und symolo/ansichten.

Aufruf:  python tools/symolo_bauen.py            (schreibt symolo/fertig/)
         python tools/symolo_bauen.py --pruefen  (ändert nichts, Fehler, wenn fertig/ veraltet ist)

Warum ein Bauschritt: Jede Ansicht muss in Symolo ein einziges, in sich geschlossenes Hook-Objekt sein
(form_on_load / before_set_values / onUnload). Gemeinsamer Code (Datenschicht, Anzeige) steht aber nur EINMAL
in symolo/quelle. Der Bauschritt setzt beides zusammen, ohne etwas zu übersetzen: Test und Symolo bekommen
denselben Text.

Ergebnis je Ansicht:
  symolo/fertig/<name>.js        Hook-Objekt für Symolo (Inhalt ins Formular einfügen)
  symolo/fertig/lokal_ansichten.js  dieselben Objekte für die Testseite symolo/test.html
Dabei werden die Regeln aus dem Skill geprüft (pruefen_css, pruefen_js); ein Verstoß bricht den Bau ab.
"""

import json
import re
import sys
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASIS))
from tools.tokens_erzeugen import QUELLE as TOKENS  # noqa: E402
from tools.tokens_erzeugen import variablen

SYMOLO = BASIS / "symolo"
FERTIG = SYMOLO / "fertig"

# Je Bereich eine Ansicht (Ben, 16.10.2026: „mach wie es übersichtlicher ist“).
# klasse: Wrapper-Klasse (jede CSS-Regel beginnt damit), praefix: für IDs, css_id: für injector.css/rmcss.
# satz: Beschreibung neben dem kurzen Titel (die Überschrift der bisherigen Seite); der Titel bleibt kurz wie im Menü.
ANSICHTEN = [
    {"name": "bestandsliste", "titel": "Bestandsliste", "klasse": "kom-bl", "praefix": "komBl", "css_id": "KOMBLCSS", "css": ["bestand"]},
    {"name": "dashboard", "titel": "Dashboard", "klasse": "kom-db", "praefix": "komDb", "css_id": "KOMDBCSS", "css": ["liste"], "satz": "Fortschritt der Arbeitsaufträge"},
    {"name": "forecast", "titel": "Forecast", "klasse": "kom-fc", "praefix": "komFc", "css_id": "KOMFCCSS", "css": ["liste"], "satz": "Offene Aufträge nach Liefertermin"},
    {"name": "planung", "titel": "Planung", "klasse": "kom-pl", "praefix": "komPl", "css_id": "KOMPLCSS", "css": ["liste"], "satz": "Zur Planung vorgemerkte Arbeitsaufträge"},
    {"name": "statistik", "titel": "Statistik", "klasse": "kom-st", "praefix": "komSt", "css_id": "KOMSTCSS"},
    {"name": "archiv", "titel": "Archiv", "klasse": "kom-ar", "praefix": "komAr", "css_id": "KOMARCSS"},
    {"name": "protokoll", "titel": "Änderungsprotokoll", "klasse": "kom-pr", "praefix": "komPr", "css_id": "KOMPRCSS"},
    {"name": "schweissen", "titel": "Schweißen", "klasse": "kom-sw", "praefix": "komSw", "css_id": "KOMSWCSS", "css": ["bestand"]},
    {"name": "arbeitsplaetze", "titel": "Arbeitsplätze", "klasse": "kom-ap", "praefix": "komAp", "css_id": "KOMAPCSS", "satz": "Hallenplan Schweißen"},
    {"name": "regal", "titel": "Regal", "klasse": "kom-rg", "praefix": "komRg", "css_id": "KOMRGCSS"},
    {"name": "verbindungstest", "titel": "Verbindungstest", "klasse": "kom-vt", "praefix": "komVt", "css_id": "KOMVTCSS"},
]  # fmt: skip

KOPF = """/* ===========================================================================
   Bestandsliste Kommissionierung Stahlbau – Ansicht „{titel}“ für Symolo
   Automatisch erzeugt mit tools/symolo_bauen.py aus symolo/quelle und
   symolo/ansichten/{name}. NICHT VON HAND ÄNDERN.

   Einbau: Alles ab der nächsten Zeile mit {{ bis zum Ende als Hook-Objekt
   ins Formular einfügen. Das Formular braucht ein Feld mit der Bindung
   "_output". Anpassungen nur in 10_einstellungen.js und 20_tabellen.js
   (dann neu bauen). Anleitung: docs/Symolo_Anbindung.md
   Erstellt: Ben Schumacher, 09.10.2026
   =========================================================================== */
"""

VERBOTEN_JS = {
    "document.querySelector": "Skill, Falle 4: eigene Elemente als Referenz am Objekt halten",
    "document.createElement": "Skill: Elemente nur mit window.symolo.tools.layout.create",
    "innerHTML": "Skill: kein innerHTML-Bau",
    "fetch(": "Vorgabe: kein fetch, nur WebSocket",
    "XMLHttpRequest": "Vorgabe: nur WebSocket",
    "functionWrapper": "Skill: Selbstbezug nur mit this",
    "DeleteObjectJson": "Vorgabe: nie löschen, archivieren",
    "Database.Execute": "Vorgabe: nie per SQL schreiben",
}
# localStorage ist erlaubt: der Skill nennt es für Zustände, die wiederkommen sollen (Klappzustand, R-DB4).
# Daten der Datenbank gehören nie hinein.


def ohne_kommentare_js(text: str) -> str:
    """Kommentare entfernen (für die Verbotsprüfung; Erklärungen dürfen die Wörter nennen)."""
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|[^:])//[^\n]*", r"\1", text)


def pruefen_js(name: str, js: str) -> None:
    code = ohne_kommentare_js(js)
    for wort, grund in VERBOTEN_JS.items():
        if wort in code:
            raise SystemExit(f"{name}: „{wort}“ ist nicht erlaubt ({grund}).")


def pruefen_css(name: str, css: str, klasse: str) -> None:
    """Skill, CSS-Scoping: kein Backtick, jede Regel beginnt mit der Wrapper-Klasse."""
    if "`" in css:
        raise SystemExit(f"{name}: Backtick im CSS beendet den Template-String (Skill, Falle 1).")
    ohne = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for selektoren in re.findall(r"([^{}]+)\{", ohne):
        selektoren = selektoren.strip()
        if selektoren.startswith("@"):
            continue
        for s in selektoren.split(","):
            erster = re.split(r"[\s>+~:\[]", s.strip(), maxsplit=1)[0]
            if erster != "." + klasse:
                raise SystemExit(f"{name}: CSS-Regel ohne Wrapper-Klasse .{klasse}: „{s.strip()}“")


def css_bauen(a: dict) -> str:
    _, gemeinsam, je_thema = variablen(json.loads(TOKENS.read_text(encoding="utf-8")))
    # Arbeitsseiten: Thema light ohne Glas (Design_Anwendung). Variablen an der Ansicht, nicht an :root.
    vars_ = "\n".join(gemeinsam + je_thema["light"])
    teile = [f".ANSICHT {{\n{vars_}\n}}", (SYMOLO / "quelle" / "gemeinsam.css").read_text(encoding="utf-8")]
    for name in a.get("css", []):  # weitere gemeinsame Stile, z. B. "liste" für die Karten-Liste
        teile.append((SYMOLO / "quelle" / f"{name}.css").read_text(encoding="utf-8"))
    eigen = SYMOLO / "ansichten" / a["name"] / "ansicht.css"
    if eigen.exists():
        teile.append(eigen.read_text(encoding="utf-8"))
    css = "\n\n".join(teile).replace(".ANSICHT", "." + a["klasse"])
    pruefen_css(a["name"], css, a["klasse"])
    return css


def objekt_bauen(a: dict) -> str:
    """Der Text des Hook-Objekts: { … }"""
    quellen = sorted((SYMOLO / "quelle").glob("*.js"))
    teile = [p.read_text(encoding="utf-8").rstrip() for p in quellen]
    teile.append((SYMOLO / "ansichten" / a["name"] / "ansicht.js").read_text(encoding="utf-8").rstrip())
    ansicht = (
        "/* Kenndaten dieser Ansicht (aus tools/symolo_bauen.py). */\n"
        f'ansicht: {{ name: "{a["name"]}", titel: "{a["titel"]}", klasse: "{a["klasse"]}", '
        f'praefix: "{a["praefix"]}", cssId: "{a["css_id"]}", satz: "{a.get("satz", "")}" }},'
    )
    css = css_bauen(a)
    hooks = (
        "/* ===========================================================================\n"
        "   HOOK 1: CSS. Nur CSS, jede Regel hängt an der Wrapper-Klasse.\n"
        "   =========================================================================== */\n"
        "form_on_load: function (FORM) {\n\n"
        f'    window.symolo.tools.injector.css(`\n{css}\n`, "{a["css_id"]}");\n'
        "},\n\n"
        "/* ===========================================================================\n"
        "   HOOK 3: Aufräumen. Genau die CSS-ID, die form_on_load gesetzt hat.\n"
        "   =========================================================================== */\n"
        "onUnload: function (FORM, {}) {\n\n"
        f'    window.symolo.tools.injector.rmcss("{a["css_id"]}");\n'
        "}"
    )
    js_teile = [ansicht, *teile]
    pruefen_js(a["name"], "\n\n".join(js_teile))
    return "{\n\n" + "\n\n\n".join([*js_teile, hooks]) + "\n\n}"


def alles_bauen() -> dict:
    dateien = {}
    lokal = [
        "/* Alle Ansichten für die Testseite symolo/test.html. Automatisch erzeugt mit tools/symolo_bauen.py.\n"
        "   Derselbe Text wie in den Einzeldateien, nur als Funktion verpackt, damit die Testseite\n"
        "   jede Ansicht frisch öffnen kann. Kommt NICHT nach Symolo. */",
        "window.KOM_ANSICHTEN = {};",
        "window.KOM_ANSICHTEN_TITEL = {};",
    ]
    for a in ANSICHTEN:
        obj = objekt_bauen(a)
        dateien[FERTIG / f"{a['name']}.js"] = KOPF.format(**a) + obj + "\n"
        lokal.append(f'window.KOM_ANSICHTEN_TITEL["{a["name"]}"] = "{a["titel"]}";')
        lokal.append(f'window.KOM_ANSICHTEN["{a["name"]}"] = function () {{ return {obj}; }};')
    dateien[FERTIG / "lokal_ansichten.js"] = "\n\n".join(lokal) + "\n"
    return dateien


def main():
    dateien = alles_bauen()
    if "--pruefen" in sys.argv:
        alt = [p for p, t in dateien.items() if not p.exists() or p.read_text(encoding="utf-8") != t]
        if alt:
            raise SystemExit(
                "Veraltet, bitte python tools/symolo_bauen.py laufen lassen: " + ", ".join(p.name for p in alt)
            )
        print("symolo/fertig ist aktuell.")
        return
    FERTIG.mkdir(parents=True, exist_ok=True)
    for p, t in dateien.items():
        p.write_text(t, encoding="utf-8")
        print(f"geschrieben: {p.relative_to(BASIS)}")


if __name__ == "__main__":
    main()

# Bestandsliste Kommissionierung Stahlbau

Interne Web-App (löst `bestand_kom_stahlbau.xlsm` ab). Ersteller-Vermerk „Erstellt: Ben Schumacher, 09.10.2026“ bleibt in jeder Fußzeile, Mail und jedem Ausdruck.

## Stack
Python 3.12, Django 5.2, SQLite, Vorlagen (Templates) mit eigenem CSS aus dem FWM-Design und einfachem JavaScript. Kein React, Astro oder WordPress.
Umbau für Symolo (ab 16.10.2026): Die App läuft künftig nur als Fenster in Symolo. Je Bereich eine Ansicht in JavaScript als Symolo-Hook-Objekt unter `symolo/`; Daten per WebSocket aus Symolo. Die Django-App bleibt bis zur Ablösung als Vergleich.

## Symolo (Pflicht, Ben 16.10.2026)
- Für jede Arbeit am Umbau gelten der Skill `.claude/skills/symolo-barebone-framework/` und alles in `docs/Symolo_Referenz.md` (Vorgaben, Befehlsliste, test.html-Ablauf, Entscheidungen, offene Punkte). Entwickler-Anleitung: `docs/Symolo_Anbindung.md`.
- Nie auf Symolo, `wss://fwm.symolo.biz` oder Symolo-Datenbanken zugreifen; Zugangsdaten aus test.html nirgends übernehmen. Getestet wird nur mit dem Nachbau (`symolo/lokal/`).
- Nur WebSocket, kein `fetch`. IDs intern erlaubt, aber nie anzeigen und beim Anlegen nicht mitgeben; Verknüpfungen als Namen auflösen, beim Ändern das komplette Objekt senden, archivieren statt löschen (je Tabelle Ja/Nein-Feld oder Status, `archivWerte` in `20_tabellen.js`).
- Datenbankzugriff nur über `symolo/quelle/40_daten.js`; Tabellen- und Spaltennamen nur in `symolo/quelle/20_tabellen.js`. Unklares mit `OFFEN (Symolo)`, Annahmen mit `VERMUTET` kommentieren.
- Anmeldung macht Symolo. Rechte nur über `currentRights` in `symolo/quelle/50_benutzer.js` (fünf Rechte `kom.<gruppe>.<recht>`, ohne Recht ist der Knopf aus; im Nachbau alle an). Excel einlesen macht die App selbst (Lesebibliothek erlaubt).

## Ordner
- `config/` Einstellungen, Adressen
- `kern/` Grundseiten, Rollen (`rollen.py`), Vorlagen, Stile (`static/kern/css`), Schrift, Logo
- `bestand/` Fachlogik: `models.py`, `rechnen.py`, `importer.py`, `lagerort.py`, `archiv.py`, `forecast.py`, `schweissen/` (Paket mit Modulen nach Thema), `planung.py`, `statistik.py`; Ansichten in `views*.py`, Adressen in `urls*.py`
- `design/tokens.json` Designwerte; `tools/tokens_erzeugen.py` erzeugt daraus `kern/static/kern/design/tokens.css`
- `tests/` automatische Tests, `tests/daten/pruef_status.csv` ist der Prüffall
- `docs/Entscheidungen.md` Entscheidungen (W…, D…) nach Phase
- `symolo/` Umbau für Symolo: `quelle/` gemeinsamer Code (Einstellungen, Tabellen, Datenschicht, Anzeige), `ansichten/<bereich>/` je Bereich, `fertig/` gebaute Hook-Objekte (nicht von Hand ändern), `lokal/` Nachbau und Beispieldaten, `test.html` Testseite; Tests in `tests/test_symolo.py` und `tests/symolo/*.test.js`

## Befehle
- Tests: `python -m pytest` (gezielt: `python -m pytest tests/test_schweissen.py -k R_W3`)
- Prüfen: `ruff check .` und `ruff format --check .`; Formatieren: `ruff format .`
- Symolo: bauen `python tools/symolo_bauen.py` (nach jeder Änderung in `symolo/quelle` oder `symolo/ansichten`, und nach jedem Merge oder Konflikt: `symolo/fertig/` nie von Hand lösen, immer neu bauen), Beispieldaten neu `python tools/symolo_beispieldaten.py`, testen `symolo/test.html` im Browser öffnen
- Starten: `KOM_DEBUG=1 KOM_DATENBANK=db.sqlite3 python manage.py runserver` (ohne `KOM_DATENBANK` bricht der Start ab)

## Konventionen
- Alle Texte für Benutzer auf Deutsch, kurz, ohne Fachbegriffe.
- Farben nur über die FWM-Variablen (`var(--…)`), keine festen Farbwerte. Statusfarben (grün/gelb/weiß, Ampel rot/gelb) sind Bedeutungsfarben und bleiben.
- Ändernde Ansichten tragen `@rolle_noetig(...)` aus `kern/rollen.py`; Rollen werden serverseitig geprüft.
- Jede Regel R-… hat einen Test; der Testname enthält die Regelnummer (z. B. `test_R_P2_…`). Der Prüffall muss grün bleiben. Tests nie abschalten, um grün zu werden.
- Hochgeladene Excel-Dateien werden nur gelesen (nie Makros), Passwörter gehasht.
- Neue Entscheidungen in `docs/Entscheidungen.md` nachtragen. Beim Arbeiten nur den Abschnitt der eigenen Phase lesen, nicht die ganze Datei.
- Keine neuen README- oder Übersichtsdateien anlegen, außer Ben verlangt es.

## Arbeitsregeln (Ben, 15.10.2026)
1. Tests: Während der Arbeit nur die betroffenen Tests ausführen. Die volle Testreihe läuft genau einmal, direkt vor dem PR.
2. Meldungen: Threads melden sich beim Koordinator nur bei einem fertigen Ergebnis, einer nötigen Entscheidung oder einem Fehler. Fortschritt wird nicht gemeldet.
3. Koordinator: Wenn eine Meldung keine Antwort braucht, nicht antworten und keine weiteren Schritte auslösen.
4. Bündeln: Zusammenhängende Wünsche kommen in einen Thread, nicht in mehrere.
5. Keine Vorschaubilder oder Screenshots ohne ausdrückliche Bitte.
6. Nur die Dateien lesen, die für die Aufgabe nötig sind. Große Dateien wie Uebergabe_Website.md nur gezielt abschnittsweise lesen.
7. Fertige Threads sofort beenden, nicht offen lassen.

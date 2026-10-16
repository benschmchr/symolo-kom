# Bestandsliste Kommissionierung Stahlbau

Interne Web-App, die die Excel-Lösung `bestand_kom_stahlbau.xlsm` ablöst (Bestandsliste, Dashboard, Regal, Forecast, Schweißen, Arbeitsplätze, Archiv, Morgenmail). Fachliche Grundlage: `Uebergabe_Website.md` (Regeln R-…), im Claude-Projekt unter `web/uebergabe/`.

Erstellt: Ben Schumacher, 09.10.2026

## Stand

- Phase 0 (Grundgerüst): Anmeldung, Rollen, FWM-Design, Platzhalter für alle Bereiche.
- Phase 1 (Kern): Datenmodell, Import der Kommissionierlisten, Bestandsliste mit Status, Mengen, Daten, Suche und Ansichten, „AB bearbeiten“ (Soll ändern), Startseite mit echten Zahlen. Prüffall 9.1 (`tests/daten/pruef_status.csv`) wird Zeile für Zeile geprüft.
- Phase 2 (Lagerort und Regal): Lagerort an AB/BG mit Vererbung und Abgleich (R-L1–R-L5), Regal mit Listen „Nicht einsortiert“, „Ohne gültigen Platz“, „Einsortiert“ (R-R1–R-R5), Platz ändern per Antippen oder Ziehen.
- Phase 3 (Dashboard): `/dashboard/` mit Kacheln (Zähler, Gesamtfortschritt), Ansicht, AB-Suche und Kunde, Sortierung wie die Excel-Formel, Auf-/Zuklappen je Benutzer gemerkt (R-DB1–R-DB6), Handy-Ansicht.
- Phase 4 (Löschen, Archiv, Änderungsprotokoll): „AB löschen“ mit Sicherheitsfrage und Kopie ins Archiv (R-X1, R-X2), `/archiv/` zum Ansehen und Durchsuchen, Wiederherstellen für Admins (R-X3), Änderungsprotokoll `/protokoll/` (nur Admin; abschaltbar, ohne Namen möglich, begrenzte Aufbewahrung).
- Phase 5 (Forecast): `/forecast/` mit Liefertermin je AB aus der hochgeladenen Forecast-Liste, Ampel rot/gelb, Filter und Sortierung wie die Excel-Formel (R-F1–R-F12), Forecast-Daten für die Planung, Kachel auf Startseite und Dashboard.
- Phase 6 (Schweißen und Arbeitsplätze): Entnehmen aus der Bestandsliste, `/schweissen/` mit Vererbung von Mitarbeiter, Arbeitsplatz und Terminen, Archivieren und Zurück (R-W1–R-W10), Hallenplan `/arbeitsplaetze/` (R-AP1–R-AP7), Import-Warnung (R-I10), Forecast-Marke „Schweißen“ (W11). Rollen statt Passwort 1234.

Entscheidungen: [docs/Entscheidungen.md](docs/Entscheidungen.md).

## Aufbau

Die Ordner und ihre Dateien sind in `CLAUDE.md` beschrieben (dort gepflegt, hier nicht doppelt). Kurz: `config/` Einstellungen, `kern/` Grundseiten und Design, `bestand/` Fachlogik, `tests/` automatische Tests.

## Entwickeln

```
pip install -r requirements.txt
KOM_DATENBANK=db.sqlite3 python manage.py migrate
KOM_DATENBANK=db.sqlite3 python manage.py createsuperuser        # erster Admin
KOM_DEBUG=1 KOM_DATENBANK=db.sqlite3 python manage.py beispieldaten   # nur Entwicklung: Beispiel-Kommissionierlisten laden
KOM_DEBUG=1 KOM_DATENBANK=db.sqlite3 python manage.py runserver
python -m pytest                        # alle Tests
```

## Testpaket für Windows

`python tools/windows_paket.py` baut `dist/Bestandsliste-Test.zip`: App mit portablem Python, Start per Doppelklick auf „App starten.bat“, nur auf dem eigenen PC (127.0.0.1). Beim ersten Start legt `windows/start.py` die Datenbank im Ordner `daten` an, ein Testkonto mit allen Rollen (`test` / `Test-Kommission-2026`) und lädt die Beispiel-Kommissionierlisten. Nur zum Testen, nicht für den Server. Der Ablauf `.github/workflows/windows-testpaket.yml` baut und prüft das Paket auf Windows und legt es nach jedem Stand auf main unter Releases („testpaket“) ab.

## Betrieb (für die IT, Entwurf)

Python 3.12+ und ein Dienst, der `waitress-serve --listen=127.0.0.1:8000 config.wsgi:application` startet (Windows: z. B. NSSM; Linux: systemd oder Docker), davor IIS, nginx oder Caddy mit HTTPS-Zertifikat der internen Zertifizierungsstelle.

Umgebungsvariablen: `KOM_SECRET_KEY` (Pflicht, lang und zufällig), `KOM_HOSTS` (interne Adresse), `KOM_HTTPS=1`, `KOM_DATENBANK` (Pfad der SQLite-Datei, Pflicht). Vor dem Start: `python manage.py migrate` und `python manage.py collectstatic`. Sicherung: täglich `python tools/sicherung.py` (Kopie mit Datum, letzte 14 bleiben).

Die Schrift Open Sans liegt in `kern/static/kern/fonts/` (SIL Open Font License, `OFL.txt`), htmx in `kern/static/kern/js/`. Es werden keine Dateien aus dem Internet geladen.

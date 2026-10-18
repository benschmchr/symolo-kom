# Anbindung der Bestandsliste an Symolo (für den Symolo-Entwickler)

Stand: 18.10.2026 · Erstellt: Ben Schumacher, 09.10.2026

Hier steht, was Sie tun müssen, damit die Bestandsliste in Symolo läuft. Die Fachlogik müssen Sie dafür nicht kennen. Alles Hintergrundwissen (Vorgaben, Befehlsliste, test.html, Skills) steht in [Symolo_Referenz.md](Symolo_Referenz.md).

## 1. Überblick

- Je Bereich gibt es eine Ansicht als **Hook-Objekt** nach dem Skill „Barebone → Framework“ (`form_on_load`, `before_set_values`, `onUnload`). Jede Ansicht ist in sich geschlossen.
- Alle Daten laufen über **WebSocket** (`{ cmd, par }`), nie über `fetch` oder die HTTP-Pfade.
- Daten kommen aus Symolo. Die App hat keine eigene Datenbank und keine eigene Anmeldung. Rechte liest sie aus `currentRights` (Abschnitt 2.3).
- Entwickelt und getestet wird mit einem **Nachbau von `window.symolo`** und Beispieldaten (`symolo/lokal/`). Auf Symolo wurde dabei nie zugegriffen.
- Im Code steht **OFFEN (Symolo)** an jeder Stelle, die Sie prüfen oder eintragen, und **VERMUTET** an jeder Annahme.

| Befehl | Nutzt die App? | Wofür |
|---|---|---|
| `dsf.Database.Select` | ja | Listen lesen |
| `dsf.dbo.GetDBObjectListByIDJson` | ja | Verweise (IDs) zu Namen auflösen, viele auf einmal |
| `dsf.dbo.GetEmptyObjectJson` | ja | leeres Objekt vor dem Anlegen |
| `dsf.dbo.CreateObjectJson` | ja | anlegen, ohne ID |
| `dsf.dbo.GetObjectByIdJson` | ja | frisch holen vor dem Ändern |
| `dsf.dbo.UpdateObjectJson` | ja | ändern und archivieren, immer komplettes Objekt |
| `dsf.dbo.GetAllDboTypesAvail` | nein | hilft Ihnen beim Ausfüllen von `20_tabellen.js` |
| `GetDboSelect`, `GetObjectById`, `CreateObjectFromDictJson` | nein | Zweck offen |
| `dsf.dbo.DeleteObjectJson`, `dsf.Database.Execute` | **nie** | Die App löscht nie und schreibt nie per SQL. |

## 2. Was Sie anpassen (nur 3 Dateien, dann neu bauen)

### 2.1 `symolo/quelle/20_tabellen.js`: Tabellen und Felder

Die **einzige** Stelle mit Tabellen- und Spaltennamen. Links stehen unsere Namen, die der Code benutzt. Rechts tragen Sie den echten Namen in Symolo ein.

```js
teil: {
    tabelle: "fwm.kom_teil",                 // echter Tabellenname
    felder: {
        auftrag: "auftrag_id_auftrag",       // VERMUTET: Muster wie standard_gruppe_id_gruppe
        vorhanden: "vorhanden",
        index: "index"                       // Zeichnungsindex, NICHT die ID
    },
    verweise: {
        auftrag: { ziel: "auftrag", anzeige: "ab_anzeige" }  // statt der ID wird ab_anzeige gezeigt
    }
},
```

- `archiv: "archiviert"` nennt das Feld, das beim Archivieren auf ja gesetzt wird. Gelöscht wird nie.
- Archiviert die Tabelle in Symolo über einen **Status** statt über ja/nein, rechts beim Archiv-Feld die Statusspalte eintragen und die Werte dazuschreiben: `archivWerte: { ja: "archiviert", nein: "aktiv" }`. Die App rechnet weiter mit ja/nein; `40_daten.js` übersetzt beim Lesen, in Abfragen und beim Schreiben.
- `_standard` enthält die Standardfelder aller Symolo-Tabellen (`id`, `iuser`, `idate`, `uuser`, `udate`).
- Die Tabellen `fwm.kom_…` sind unser Vorschlag. Es gibt sie in Symolo noch nicht. Die Felder stammen 1:1 aus der bisherigen App.

### 2.2 `symolo/quelle/10_einstellungen.js`: Quelle, Endpunkt, Schreibsperre

| Einstellung | Bedeutung |
|---|---|
| `quelle` | `"automatisch"`: im Fenster Symolo, sonst der Nachbau. `"symolo-test"`: nur für Sie, Test von außen über `network` mit eigener Anmeldung vorher |
| `endpunktSymolo` | OFFEN: falls `internal.connection` einen Endpunkt braucht |
| `timeoutMs` | Zeitlimit je Anfrage (15 s) |
| `schreibenErlaubtInSymolo` | **Schreibsperre**: steht auf `false`. Erst auf `true` setzen, wenn alle Namen in `20_tabellen.js` geprüft sind. Bis dahin liest die App nur. |

### 2.3 `symolo/quelle/50_benutzer.js`: Rechte

Die App liest ein einfaches Objekt `currentRights` (VERMUTET: `window.currentRights`). Es gibt fünf Rechte; was fehlt, gilt als nicht erlaubt.

| Recht | Ohne das Recht ist aus |
|---|---|
| `kom.bestand.bearbeiten` | Vorhanden, Soll, Lagerort, Regal, Entnehmen, Archivieren, Wiederherstellen |
| `kom.schweissen.bearbeiten` | Mitarbeiter, Arbeitsplatz, Termine, Archivieren, Zurück |
| `kom.planung.bearbeiten` | Häkchen in der Planung |
| `kom.import.excel` | Kommissionierliste und Forecast einlesen (kommt mit Phase 7) |
| `kom.protokoll.verwalten` | Protokoll ansehen, Einstellungen, leeren |

Ansehen darf jeder. Ohne `currentRights` hat in Symolo niemand ein Recht; im Nachbau sind alle an. Liefert Symolo die Rechte anders, ändert sich nur die Methode `rechte`. Die App schaltet nur Knöpfe aus. Geschützt ist es erst, wenn Symolo die Schreibrechte selbst prüft.

### 2.4 Neu bauen

```
python tools/symolo_bauen.py
```

Das schreibt `symolo/fertig/<bereich>.js` neu und prüft dabei die Regeln aus dem Skill. Bei einem Verstoß bricht der Bau ab.

## 3. Einbau in Symolo

1. `symolo/fertig/<bereich>.js` öffnen und alles ab der Zeile mit `{` als Hook-Objekt ins Formular einfügen.
2. Das Formular braucht ein Feld mit der Bindung `_output`. Die Ansicht holt es mit `this.ctrlbyBind("_output").SelfElement`.
3. Der Netzweg stellt sich selbst um: Ist `window.symolo.internal.connection` vorhanden, nutzt die App `internal.connection.websocket.request`, sonst `network.websocket.request` (Methode `netzweg` in `40_daten.js`). Das ist die einzige Stelle dafür.
4. Nicht einfügen: `symolo/lokal/` (Nachbau, Beispieldaten, Testleiste), `symolo/test.html` und `fertig/lokal_ansichten.js`.

Jede Ansicht hat eine eigene Wrapper-Klasse (`kom-bl`, `kom-db`, `kom-rg`, `kom-vt` …), eine eigene CSS-ID (`KOMBLCSS`, `KOMDBCSS`, `KOMRGCSS`, `KOMVTCSS` …) und ein eigenes ID-Präfix. So können auch mehrere Ansichten im selben Formular liegen.

## 4. Regeln, an die sich die App hält

1. IDs werden nie angezeigt. Sie stehen nur in Feldern mit `_` vorne (`_id`, `_gruppe_id`), und die Anzeige verweigert solche Felder.
2. Beim Anlegen wird keine ID mitgegeben. Intern benutzt die App IDs (zum Holen und Ändern), angezeigt werden sie nie.
3. Beim Ändern wird das Objekt direkt vorher frisch geholt, ein Feld geändert und das **komplette** Objekt zurückgeschickt. Hat sich `udate` seit dem Lesen geändert, bricht die App mit einem Hinweis ab.
4. Es gibt **einen** Schreibpfad (`schreiben` in `40_daten.js`). Gelöscht wird nie, nur archiviert.
5. Jede Anfrage hat ein Zeitlimit.
6. Spaltennamen werden ohne Rücksicht auf Groß- und Kleinschreibung gelesen. `null` erscheint nie als „undefined“.
7. SQL baut nur `sqlBauen`. Die Namen kommen nur aus `20_tabellen.js`, Werte werden maskiert. Benutzt werden nur `select * from … where … = / in / is null … order by …`, kein `limit` und kein `join`. Nur bei großen Tabellen (Zeilen des Forecast, archivierte Schweißzeilen für die Statistik) steht statt `*` eine Spaltenliste (`select id, udate, schluessel, termin from …`).

## 5. Beim Einbinden zu prüfen oder einzutragen

| Punkt | Wo | Was die App bis dahin annimmt |
|---|---|---|
| Tabellen und Felder | `20_tabellen.js` | Vorschlag `fwm.kom_…` |
| Verknüpfungsfelder, Gruppentabelle | `20_tabellen.js` | Muster `<feld>_id_<ziel>`, Gruppen in `fwm.standard_gruppe` (nur vermutet) |
| Archiv-Feld (Name, Typ) | `20_tabellen.js` | `archiviert`, ja/nein; bei einem Status `archivWerte` eintragen |
| Feldtypen (Mengen mit 3 Nachkommastellen bis 999.999.999, Datum, ja/nein, JSON) | Tabellen in Symolo | JSON als Text |
| Rückgabe von Create, Update und List; Fehlerformat | `antwortObjekt` in `40_daten.js` | JSON-Text in `data.result` |
| Reihenfolge von `par`, Form der `idList`, ID als Text oder Zahl | `40_daten.js` | wie der Pfad; `idList` als Text mit Kommas; ID als Text |
| Schreibweise der Felder (Get gegenüber Select) | nichts | egal, die App liest tolerant |
| SQL-Sprache, Zeilengrenze | `sqlBauen` | einfache Abfragen; einige tausend Zeilen |
| Spaltenliste statt `*` | `sqlBauen` in `40_daten.js` (Option `felder`) | wird verstanden; wenn nicht, die Option weglassen (dann kommen alle Spalten) |
| Tabellen `forecast`, `forecast_zeile`, `planungsmarke`, `schweisszeile` | `20_tabellen.js` | `fwm.kom_…`; `planungsmarke` mit Archiv-Feld `archiviert` (Häkchen entfernen = archivieren) |
| Forecast: der neueste gilt | `fcLaden` in `4G_forecast.js` | die Ansicht nimmt den Forecast mit der neuesten Zeit; der Import (Phase 7) blendet den alten aus |
| Felder für das Schweißen: `auftrag.bereich` (`bestand`, `schweissen`, `archiv`), `baugruppe.archiviert`, `teil.archiviert`, `schweisszeile.archiviert`, `schweisszeile.zurueckgeholt`; Tabellen `arbeitsplatz`, `mitarbeiter` | `20_tabellen.js` | Vorschlag; entnommene oder zurückgeholte Originale werden nur ausgeblendet, nie gelöscht. Ausgeblendete Zeilen bleiben in der Datenbank (IT räumt ggf. auf) |
| Bereichsleiste (Wechsel zwischen den Fenstern) | `bereichOeffnen` in `60_anzeige.js`; Einstellungen `bereichsleiste`, `bereiche` | In Symolo ist der Wechsel **nicht angebunden**: Es fehlt, wie ein Hook-Objekt ein anderes Formular öffnet. Der Entwickler trägt es in `window.KOM_BEREICH_WECHSELN(name, optionen)` ein (`optionen.suche` füllt das Suchfeld vor). Bis dahin zeigt die Leiste eine Meldung; mit `bereichsleiste: false` verschwindet sie |
| Länge einer Abfrage | `datenLesenIn` in `40_daten.js` | `in (…)` in Stücken zu 500 IDs |
| Mengen als Zahl oder Text | `mengeMilli` in `45_rechnen.js` | beides geht; Text, der keine Zahl ist, zählt 0 |
| Tabelle `aenderung` (Protokoll), Felder am AB für das Archiv | `20_tabellen.js` | `fwm.kom_aenderung`; `archiviert_am`, `archiv_herkunft`, `archiv_status` am Auftrag. Reichen Ihnen die Standardfelder als Protokoll, entfällt die Tabelle |
| Name der angemeldeten Person (Protokoll) | `benutzer` in `50_benutzer.js` | leer: das Protokoll zeigt „–“ |
| Protokoll leeren, Aufbewahren | `protokollLeeren`, `protokollAufraeumen` in `4B_protokoll.js` | blendet aus (`archiviert`), löscht nie |
| Suche im Archiv (Zeilen) | `archivZeilenAlle` in `4D_archiv.js` | lädt alle Zeilen der archivierten ABs; besser mit „like“ in der Abfrage |
| Klappzustand je Benutzer (Dashboard) | `gemerkt` in `dashboard/ansicht.js` | nur im offenen Fenster; dauerhaft braucht eine Tabelle und den Benutzer |
| Datumsformat beim Schreiben | `heuteText` in `45_rechnen.js` | wie beim Lesen (`…T00:00:00.0000000Z`) |
| Rückgabe von `UpdateObjectJson` | `schreiben` in `40_daten.js` | kein Objekt: das gesendete gilt |
| Sammel-Update | `datenAendernViele` in `40_daten.js` | einzeln, je 8 gleichzeitig |
| Endpunkt im Fenster | `10_einstellungen.js` | setzt `internal.connection` selbst |
| Rechte und Name der Person | `rechte` und `benutzer` in `50_benutzer.js` | `window.currentRights`; ohne es in Symolo kein Recht |
| Ausgeblendete Daten (Protokoll, Häkchen, Originale, alter Forecast) | Datenbank | bleiben stehen; wer endgültig löscht und wann, ist offen (Datenschutz, sobald Namen im Protokoll stehen) |
| Schrift und Farben im Fenster | `symolo/quelle/gemeinsam.css` | FWM-Variablen an der Ansicht, Thema light |
| Gemeinsame Skripte, Excel-Bibliothek | Aufbau der Ansichten | jede Ansicht in sich geschlossen; Excel-Bibliothek erlaubt, Adresse offen |

## 6. Abnahme (in dieser Reihenfolge)

**Zuerst nur lesen.** Solange `schreibenErlaubtInSymolo` auf `false` steht, kann nichts kaputtgehen. Je Tabelle aus `20_tabellen.js` einmal prüfen:

- [ ] `dsf.Database.Select` mit `select * from <tabelle>` liefert Zeilen, und jede Spalte aus `felder` ist dabei.
- [ ] `dsf.dbo.GetObjectByIdJson` holt einen Eintrag; die Felder heißen wie im Select.
- [ ] Ein Datum (`udate`, bei `teil` auch `datum_eingelagert`) kommt im Format `2026-10-16T00:00:00.0000000Z`.
- [ ] Eine Menge (`teil.vorhanden`, `teil.menge_gesamt`) kommt als Zahl oder als Text mit Punkt (`21.000`). Erscheint oben „Menge … ist unklar“, das Format hier notieren.
- [ ] Das Archiv-Feld: welche Werte stehen drin (ja/nein oder Status)? Bei einem Status `archivWerte` eintragen. Archivierte Einträge fehlen in der Bestandsliste und stehen im Archiv.
- [ ] Verweise (`gruppe`, `auftrag`, `baugruppe`) erscheinen als Namen, nie als Zahl.
- [ ] `currentRights`: Mit einem Recht ist der Knopf an, ohne ist er aus (z. B. „AB archivieren …“ für `kom.bestand.bearbeiten`).

Danach:

1. **Verbindungstest** (`fertig/verbindungstest.js`): Die Ansicht zeigt `fwm.stamm_prozesse` mit Gruppennamen und ohne IDs. Das ist die erste Ansicht, die Sie einbinden. Sie braucht nur `prozess` und `gruppe` in `20_tabellen.js`.
2. **Bestandsliste** (`fertig/bestandsliste.js`, nur lesen): braucht `auftrag`, `baugruppe` und `teil` in `20_tabellen.js`. Sie liest drei Abfragen (ABs mit `bereich = 'bestand'`, dann Baugruppen und Teile dieser ABs) und zeigt Status und Fortschritt wie die Excel-Liste.
3. Mit einer Testtabelle `schreibenErlaubtInSymolo` einschalten und anlegen und ändern prüfen. Die ID darf beim Anlegen nicht gesetzt werden, und beim Ändern muss das Komplettobjekt ankommen. Danach in der Bestandsliste eintragen (Vorhanden, Lagerort, Soll) und das **Regal** (`fertig/regal.js`) prüfen. Ein Lagerort am AB ändert alle Baugruppen und Teile darunter, also viele Einträge auf einmal.
4. **Dashboard** (`fertig/dashboard.js`, nur lesen): liest wie die Bestandsliste und braucht keine weitere Tabelle.
5. **Archiv** (`fertig/archiv.js`) und **Änderungsprotokoll** (`fertig/protokoll.js`): lesen `auftrag` (archivierte), `baugruppe`, `teil`, `schweisszeile`, `aenderung` und `einstellung`. Archivieren und Wiederherstellen schreiben nur Markierungen am AB (`archiviert`, `archiviert_am`, `archiv_herkunft`, `archiv_status`); das Protokoll schreibt eine Zeile je Änderung in `aenderung`. Es wird nichts gelöscht.
6. **Forecast** (`fertig/forecast.js`), **Planung** (`fertig/planung.js`) und **Statistik** (`fertig/statistik.js`): lesen `auftrag`, `baugruppe`, `teil`, `schweisszeile`, `forecast`, `forecast_zeile` und `planungsmarke`. Das **Dashboard** liest jetzt ebenfalls `planungsmarke`, `forecast`, `forecast_zeile` und `schweisszeile` (Spalte Planung, Kachel Forecast). Geschrieben wird nur das Häkchen „Planung“ in `planungsmarke`; ein entferntes Häkchen wird ausgeblendet (`archiviert`) und beim nächsten Setzen wieder eingeblendet. Das Einlesen der Forecast-Datei kommt mit dem Import (Phase 7).
7. **Schweißen** (`fertig/schweissen.js`) und **Arbeitsplätze** (`fertig/arbeitsplaetze.js`): lesen `auftrag`, `baugruppe`, `teil`, `schweisszeile`, `arbeitsplatz` und `mitarbeiter`. Die **Bestandsliste** schreibt jetzt auch: „Entnehmen“ legt Zeilen in `schweisszeile` an und blendet die Originale aus (`auftrag.bereich`, `baugruppe.archiviert`, `teil.archiviert`). Das geht nur mit Anlegen von mehreren Zeilen nacheinander; eine Transaktion gibt es nicht. Zuerst Entnehmen mit einem kleinen Test-AB prüfen, dann Archivieren und Zurückholen im Schweißen.
8. Die weiteren Bereiche der Reihe nach, sobald sie gebaut sind.
9. Tests: `python -m pytest tests/test_symolo.py`. Das umfasst die Skill-Prüfungen und die Datenschicht gegen den Nachbau.

## 7. Lokal testen (ohne Symolo)

`symolo/test.html` per Doppelklick öffnen. Die Testleiste bietet die Bereichswahl, „Beispieldaten zurücksetzen“ und drei Schalter: „Spaltennamen anders schreiben“ prüft das tolerante Lesen, „Verbindung tot“ prüft das Zeitlimit, „Ohne Rechte (nur ansehen)“ setzt ein leeres `currentRights`. Die Beispieldaten erzeugt `python tools/symolo_beispieldaten.py` aus den Demo-Daten der bisherigen App.

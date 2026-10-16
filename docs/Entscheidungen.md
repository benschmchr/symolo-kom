# Entscheidungen

| Nr. | Frage | Entscheidung | Datum |
|---|---|---|---|
| W1 | Technik | Python/Django + htmx + SQLite | 13.10.2026 |
| W2 | Ansehen ohne Anmeldung | Ja, im Firmennetz darf jeder ansehen; ändern nur angemeldet | 13.10.2026 |
| W3 | Rollen | Gast, Lager, Schweißen, Planung, Admin (R-P2); mehrere Rollen je Person möglich | 13.10.2026 |
| W6 | Lagerort von AB/BG beim Ersetzen eines AB | wie Excel: geht verloren (nur Teile behalten ihn) | 13.10.2026 |
| W10 | Code-Ablage | privates GitHub-Repository benschmchr/kom-website | 13.10.2026 |
| D1 | Design Bestandsliste | Entwurf D: eine flache, breite Karte je AB mit Tabelle wie Excel (Spalte LK Nummer), Kopfzeile einmal oben; am Handy Karten wie Entwurf B | 14.10.2026 |
| D2 | Design Dashboard | hell mit Kacheln, darunter eine Karte je AB (AB-Zeile in Statusfarbe), Kopfzeile ohne Hintergrund | 14.10.2026 |
| D3 | Startseite | Übersicht mit Kennzahlen-Kacheln und Auswertungen; Navigation über die Reiter oben | 14.10.2026 |
| D4 | Regal, Hallenplan | wie Entwurf | 14.10.2026 |
| W11 | Entnommene ABs im Forecast | anzeigen mit Status „Schweißen“, bis sie archiviert sind (Bens ursprüngliche Wahl S4 = A; **weicht von Excel ab**). Wird mit Schweißen in Phase 6 gebaut, bis dahin gibt es keine entnommenen ABs | 14.10.2026 |

Offen (werden vor ihrer Phase gefragt): W4 Morgenmail, W5 Datenübernahme, W7 Änderungsprotokoll (gebaut wie Empfehlung „ja“, aber einschränkbar und abschaltbar; Betriebsrat/Datenschutz klärt Ben), W8 Forecast-Abruf (gebaut wie Empfehlung: erst Hochladen), W9 Excel-Export.

## Festlegungen in Phase 0 (ohne eigene Frage)

- Rolle **Admin darf alles**, auch Mengen und Lagerort ändern.
- Angemeldet bleibt man 12 Stunden (eine Schicht). Passwörter mindestens 10 Zeichen.
- Die Tafelfarben der Arbeitsplätze (R-AP2) stehen als eigene Variablen `--tafel-…` in `listen.css`, nicht im Designsystem.

## Festlegungen in Phase 1

- **Haupt-Baugruppe über der Kopfzeile** (Ben, 14.10.2026: Variante B „Als Baugruppe“, **weicht von Excel ab**): Steht in der Zeile direkt über der Kopfzeile eine Zeichnungsnummer mit Zahl bei „Menge Gesamt“ (z. B. AB2616048 Zeile 9, AB2616200 / Los 1) und gibt es unter der Kopfzeile keine Baugruppe, wird diese Zeile als Baugruppe gelesen; alle Teile stehen darunter. Die Import-Vorschau sagt das als Hinweis. Excel liest diese Zeile nicht.
- **ABs nur mit Teilen** (Ben, 14.10.2026: gibt es): Ohne Baugruppe (auch keine über der Kopfzeile) stehen die Teile direkt unter dem AB.
- **Dateien:** nur `.xlsx` und `.xlsm` (Ben: „immer nur so wie bis jetzt“). `.xls` bekommt eine Meldung. Höchstens 10 MB je Datei, 30 Dateien auf einmal.
- **Soll ändern** (Ben: ja, aber nur über einen speziellen Knopf): kleiner Link „AB bearbeiten“ an der AB-Zeile, nur Rolle Planung (und Admin). R-T1 läuft danach. Ein neuer Import (Ersetzen) überschreibt die Änderung.
- **Soll kann eine Dezimalzahl sein** (z. B. 0,06 bei Schweißzusatz). Vorhanden bleibt ganze Zahl ≥ 0 (R-M1); „Vorhanden = Soll“ und „alles ✓“ setzen wie Excel genau das Soll.
- **„alles ✓“** an AB/BG fragt immer nach (auch wenn nicht komplett), weil man am Handy leicht danebentippt.
- **Ersetzen:** der AB bleibt an seinem Platz in der Liste (U3). Mehrere Dateien: eine Vorschau mit „Ersetzen / Nicht importieren“ je AB statt einzelner Rückfragen.
- **Text vorn/hinten abschneiden** in allen Textspalten (U2); als Text geschriebene Zahlen in Soll und Vorhanden werden Zahlen.
- **Gleichzeitig ändern:** die letzte Eingabe gilt; wer einen inzwischen geänderten Wert überschreibt, bekommt einen Hinweis (ohne Namen, wegen Betriebsrat/W7).
- **Weitere Spalten** (Menge / BG, Index, Arbeitsgang, Material, Profil, Abmaße, Bemerkung; an der AB-Zeile die Kopfdaten) über den Schalter „Weitere Spalten“, damit Entwurf D schmal bleibt (R-A5).

## Festlegungen in Phase 2 (Lagerort und Regal)

- **X1 ABs ohne Baugruppe** (Ben, 14.10.2026: gibt es, müssen erscheinen): stehen im Regal als eigener Eintrag „AB…“ mit ihrem Platz bzw. unter „Nicht einsortiert“. Excel lässt sie weg. Später auch in der Morgenmail.
- **X2 R3-Kurzformen** (`R3S`, `R3-S`, `R3V`, `R3-V`, `SPERRLAGER`, `SPERR`, `VERMESSEN`) werden beim Speichern zu „R3“; gültige Plätze werden groß und ohne Leerzeichen gespeichert („l 2“ → „L2“). So erkennt der Abgleich AB ↔ BG (R-L3) sie als gleich.
- **X3** (R-L3, ein Platz vergeben, Rest leer, AB hat einen anderen Platz): wie der Excel-Code, die übrigen BGs bekommen den bisherigen AB-Platz, der AB wird leer.
- **Platz wählen statt tippen** (R-L4): in der Bestandsliste eine Auswahl L1–L6, R1–R6 an AB- und BG-Zeilen; im Regal und im Rundgang eine Auswahl wie das Regal. „Anderer Platz …“ (freier Text, z. B. „Kiste 4“) nur mit Bestätigung; er erscheint unter „Ohne gültigen Platz“. Teile bekommen den Platz automatisch und haben keine eigene Auswahl (R-L1).
- **Regal:** Eintrag antippen → Platz ändern (Rolle Lager); am PC zusätzlich Ziehen und auf ein Fach ablegen. Gäste sehen das Regal; ein Eintrag führt sie zum AB in der Bestandsliste. Keine Grenze je Fach. „Einsortiert“ ist eine aufklappbare Liste.
- **Teile „(ohne BG)“** in einem AB mit Baugruppen bekommen den Platz nur, wenn er am AB gesetzt wird (wie Excel); der Abgleich ändert sie nicht.
- **Rundgang am Handy** (neu, eigener Menüpunkt): AB suchen (auch mit einem Barcode-Scanner, der wie eine Tastatur tippt; genau ein Treffer öffnet den AB sofort) oder ein Fach antippen und sehen, was dort liegt. Je AB: Platz ändern, Menge mit großen − / + Knöpfen oder eintippen, Status antippen = Vorhanden = Soll, „alles ✓“, Schalter „Nur offene Teile“. Scannen mit der Handykamera erst, wenn die Kommissionierlisten einen Barcode/QR haben.
- **Bestandsliste nach Bens Durchklicken (14.10.2026):** Anzeige „Ausgewählter AB“ entfällt (weicht von R-A2 ab). Klick auf die AB-Nummer klappt den AB auf und zu. Links aus Regal und Rundgang öffnen die Bestandsliste mit der Suche nach der AB-Nummer. Ist das Fenster schmaler als 1440 px, scrollt die Liste waagerecht und die Kopfzeile bleibt nicht mehr oben stehen (sie rutschte sonst über die erste Karte); die Spalte Benennung ist dafür breiter.

## Festlegungen in Phase 3 (Dashboard)

- **Seite** `/dashboard/` wie Entwurf D (D2): Kacheln oben, darunter eine Karte je AB. Spalten wie Excel (R-DB1): Arbeitsauftrag, Baugruppe, Einzelteil, Kunde, Lagerort, Status, Fortschritt %, Balken, Stand. Der Entwurf unter `/entwurf/dashboard/d/` ist entfernt.
- **Kopf (R-DB5)** zählt wie Excel immer alle ABs der Bestandsliste, auch wenn eine Suche oder ein Kunde gewählt ist. Gesamtfortschritt mit einer Nachkommastelle (wie Entwurf D), Fortschritt % in der Liste als ganze Zahl (Excel-Format „0 %“). Kacheln Regal (führt zum Regal) und Forecast (Platzhalter bis Phase 5) wie im Entwurf.
- **Klappen merken (R-DB4):** Angemeldete: Ansicht und Auf-/Zuklappen werden auf dem Server je Benutzer gespeichert (gilt auf jedem Gerät). Gäste: nur in ihrer Browser-Sitzung. Wer die Ansicht umstellt, bekommt den Startzustand der neuen Ansicht; Suche und Kunde ändern den Zustand nicht. Gemerkt wird über AB-Nummer und BG-Namen (wie Excel), deshalb bleibt der Zustand auch nach dem Ersetzen eines AB.
- **Teile ohne Baugruppe** stehen wie in Excel vor den Baugruppen. Damit man sie wie eine Baugruppe auf- und zuklappen kann, haben sie eine eigene graue Zeile „Teile ohne Baugruppe“ (Excel hat dafür nur das + / − am Rand).
- **Aussehen (R-DB6):** dicke Linie oben an jeder AB-Karte in Dunkelgrau aus dem Firmendesign statt Excel-Dunkelblau; Balken stufenlos statt 25 Blockzeichen. Nur AB-Zeile in Statusfarbe, Baugruppen und Teile weiß mit farbigem Status (wie Excel).
- **Kunde-Auswahl (R-DB2):** ohne leere Einträge, gleiche Namen in anderer Schreibweise nur einmal. Ein unbekannter Kunde in der Adresse zählt als „Alle“.
- **Sortieren von Text** (AB-Nummer, BG-Name, Zeichnungsnummer) ohne Groß-/Kleinschreibung, Zeichen für Zeichen. Excel übergeht beim Sortieren Bindestriche; das kann nur bei Teilen mit gleichem Status und gleichem Fortschritt eine andere Reihenfolge geben.
- **Handy:** eine Karte je AB, Kopf in Statusfarbe, Baugruppen und Teile zum Aufklappen.

## Festlegungen in Phase 4 (Löschen, Archiv, Änderungsprotokoll)

- **AB löschen (R-X1):** Knopf „AB löschen“ oben in der Bestandsliste (Eingabe der Nummer, auch ohne „AB“ und in anderer Los-Schreibweise, R-AB4) und als kleiner Link an jeder AB-Zeile (Vorschlag = dieser AB). Dann die Sicherheitsfrage mit Zeilenzahl wie Excel („… mit 13 Zeilen endgültig löschen?“), danach Kopie ins Archiv und weg aus Bestandsliste, Dashboard und Regal. Nur Rolle Planung (und Admin).
- **Ersetzen beim Import** legt wie Excel **keine** Kopie ins Archiv.
- **Archivzeile (R-X2):** 28 Spalten wie `ArchivKopf`, eine Zeile je AB, BG und Teil. Die AB-Zeile sieht aus wie in Excel („Kunde: …“, „Haupt-AB: …“ usw.). Zahlen stehen so da, wie sie angezeigt wurden (z. B. „0,06“). Wer gelöscht hat, steht nicht im Archiv, nur im Änderungsprotokoll.
- **Archiv ansehen (R-X3):** `/archiv/` für alle (auch Gäste), eine Zeile je gelöschtem AB, neueste oben, 50 je Seite. Suche nach AB, Kunde, Verkaufsartikel, Zeichnungsnummer, Benennung, LK, Lagerort, Baugruppe; Klick zeigt alle Zeilen wie im Excel-Archiv, Treffer hervorgehoben. Am Handy Karten statt Tabelle.
- **Wiederherstellen (neu, nur Admin):** baut den AB aus dem Archiv wieder auf, mit Mengen, Lagerort und Daten, an seinem alten Platz in der Liste (ist der belegt, ans Ende). Der Eintrag verschwindet danach aus dem Archiv. Geht nicht, wenn der AB inzwischen neu importiert wurde. Aus Schweißen archivierte ABs folgen in Phase 6.
- **Alte Excel-Archivzeilen** werden bei der Datenübernahme (Phase 8) je AB und „Gelöscht am“ zu einem Archiv-Eintrag zusammengefasst.
- **Änderungsprotokoll (W7):** schreibt Vorhanden (auch „alles ✓“ und Status antippen, je Teil ein Eintrag), Lagerort (AB/BG), Soll („AB bearbeiten“), Import, Ersetzen, Löschen und Wiederherstellen, jeweils mit Zeit, Name, alt → neu. Folgen der Vererbung und des Abgleichs (R-L2, R-L3) und die Daten R-T1 stehen nicht einzeln darin. Seite `/protokoll/` und Menüpunkt „Protokoll“ nur für Admins.
- **Einschränken bis Betriebsrat/Datenschutz geklärt sind:** auf der Protokoll-Seite (nur Admin) „Protokoll führen“ an/aus, „Namen speichern“ an/aus (beim Ausschalten werden auch die Namen alter Einträge entfernt), „Aufbewahren“ in Tagen (Start: 90, 0 = unbegrenzt; ältere Einträge werden automatisch gelöscht) und „Protokoll leeren“. Start: an, mit Namen, 90 Tage.

## Festlegungen in Phase 5 (Forecast)

- **Seite** `/forecast/` wie das Dashboard (Kacheln, eine Karte je AB, Handy-Karten). Spalten wie Dashboard, „Liefertermin“ statt „Status“ (nur in der AB-Zeile, mit Hinweis „überfällig“); der Status steckt in der Balkenfarbe (wie Excel).
- **Import (W8 = erst Hochladen):** `/forecast/import/`, nur Planung, eine Datei (.xlsx/.xlsm, bis 20 MB), wird nur gelesen. Ersetzt den ganzen Forecast. Meldung wie R-F5. Steht im Änderungsprotokoll („Forecast importiert“).
- **Link zur Forecast-Datei (R-F1):** kann auf der Import-Seite hinterlegt werden und wird bereinigt gespeichert. Bis die IT Lesezugriff gibt, ist er nur ein Knopf „Forecast-Datei öffnen“ zum Herunterladen; später kann der Server damit selbst abrufen.
- **Forecast-Daten (R-F11):** `/forecast/daten/` nur Planung: alle Spalten der Vorlage, vorn AB_Abgleich und Termin_Abgleich, Suche, 250 Zeilen je Seite.
- **Kopf (R-F10):** Zähler über die angezeigten ABs; „Forecast vom“ = Tag des Imports (wie Excel B3), dazu Datei, Blatt und „Stand:“ der Datei. Orange erst, wenn älter als 8 Tage (am 9. Tag).
- **Klappen** wird wie im Dashboard gemerkt, aber getrennt vom Dashboard.
- **Kunde** kommt nur aus der Bestandsliste (wie die Excel-Formel), nicht aus dem Forecast.
- **Kachel Forecast** auf Startseite und Dashboard: Zahl der offenen ABs rot (bis 14 Tage) und gelb (15–30 Tage), unabhängig vom Filter.
- **Testpaket:** lädt beim ersten Start zusätzlich einen erfundenen Beispiel-Forecast (Termine ab dem Starttag), damit Rot, Gelb und Weiß zu sehen sind. Die echte Vorlage kann man dort über „Forecast importieren“ hochladen. Die Vorlage selbst liegt wegen der Kundendaten nicht im Repository.

## Festlegungen in Phase 6 (Schweißen und Arbeitsplätze)

- **Rollen statt Passwort 1234 (R-P1, R-P2):** Entnehmen, Archivieren und „Zurück in die Bestandsliste“ macht die Planung (und Admin). Mitarbeiter, Arbeitsplatz und Termine tragen die Rolle Schweißen (und Admin) ein. Ansehen darf jeder, auch Gäste (W2). Die Rollen werden auf dem Server geprüft, nicht nur durch ausgeblendete Knöpfe.
- **Kopie wie in Excel:** Im Bereich Schweißen steht eine eigene Zeile je AB, BG und Teil (Kopie der Werte beim Entnehmen), nicht ein Verweis. Dadurch ändern spätere Eingaben in der Bestandsliste nichts mehr, wie in Excel. Mitarbeiter, Arbeitsplatz, Termine kommen hinzu. Der Kopf des AB (Kunde, Haupt-AB …) wird mitgeführt, damit „Zurück“ den AB wieder aufbauen kann.
- **Entnehmen (R-W1–R-W3):** Der Link „» entnehmen“ steht bei AB/BG mit Status Komplett (nur Planung als Knopf, sonst Hinweis) und wird mit dem Status ein- und ausgeblendet. Die Meldungen und die Sicherheitsfrage haben den Wortlaut von Excel. Die letzte BG nimmt die AB-Zeile mit; danach werden alle Zeilen in der Reihenfolge AB, Teile ohne BG, BGs nach Nummer (Teile dahinter) zusammengefasst. Entnommen-Datum, Mitarbeiter, Plätze und Termine bleiben erhalten.
- **Vererbung (R-W6):** Port von `AbgleichKern` mit ausdrücklichen „was wurde geändert“-Angaben statt der versteckten Spalte. „(verschieden)“ wird nie gespeichert, sondern beim Lesen aus den BGs berechnet. Eine Eingabe an einem Teil wird mit Excel-Meldung abgelehnt.
- **Datum (R-W7):** Eingabefeld mit allen Kurzformen der Tabelle plus Kalenderknopf. Die Zelle „151026“ geht anders als in Excel.
- **Spalten (R-W5):** Die Spalten Menge/BG, Index, Arbeitsgang, Material, Profil, Abmaße und Bemerkung stehen hinter „Weitere Spalten“ (merkt sich der Browser), damit die Eingabefelder auf den Bildschirm passen. DLZ in Tagen.
- **Archivieren (R-W8) und Zurück (R-W9)** wie beschrieben; beim Zurückholen wird der AB aus dem gespeicherten Kopf neu angelegt, falls er nicht mehr da ist. Aus Schweißen archivierte ABs kann der Admin im Archiv wiederherstellen; sie liegen dann wieder im Schweißen.
- **Import (R-I10):** Liegt ein AB schon im Schweißen, warnt die Vorschau. Voreinstellung „Nicht importieren“.
- **Forecast (W11):** Entnommene ganze ABs bleiben im Forecast mit Marke „Schweißen“, bis sie archiviert sind (Abweichung von Excel, so von Ben entschieden). Einzelblöcke zählen nicht, ihr AB steht ja noch in der Bestandsliste. Die Forecast-Kachel zählt sie mit. Dashboard, Regal und Startseite lesen weiter nur die Bestandsliste (R-W4).
- **Arbeitsplätze (R-AP1–R-AP7):** Platzliste mit Lage und Farbe in der Datenbank (15 Plätze, im Admin unter „Arbeitsplätze“ pflegbar). Die Einträge folgen der Formel `AP` (nicht in Excel gerechnet, siehe Testbericht). Platz ändern per Antippen oder Ziehen (nur Rolle Schweißen); der Platz gilt auch im Schweißen. Alle Einträge werden gezeigt, nicht „+n weitere“. Kachel auf der Startseite zählt Einträge auf einem Platz.
- **Änderungsprotokoll:** neue Arten „Entnommen“, „Zurück in Bestandsliste“, „Archiviert (Schweißen)“, „Zuweisung Schweißen“. Mitarbeiternamen stehen darin, wenn „Namen speichern“ an ist: das muss vor dem Echtbetrieb mit Betriebsrat und Datenschutz geklärt werden.
- **Nicht übernommen:** „Anzeige: Ausgewählter AB“ (wie in Phase 2 entschieden); die Zähler im Kopf zählen angezeigte Kopfzeilen (ABs und Einzelblöcke).
- **Beispieldaten und Testpaket:** `beispieldaten` legt AB2616624 und AB2515204_BG100 mit Mitarbeiter, Platz und Termin ins Schweißen, damit man beides sieht.

## Anpassungen nach Bens Test von Phase 1 bis 6 (14.10.2026)
- **Bestandsliste:** AB- und BG-Zeilen tragen die Statusfarbe (komplett grün, teilweise gelb, offen wie bisher), AB kräftig, Baugruppe hell mit Balken links, Teil zart. Die Zähler der Einzelteile sind gefärbt. Statt des Dropdowns „Anzeige“ gibt es die Knöpfe „ABs anzeigen“, „ABs + Baugruppen anzeigen“ und „Alles anzeigen“; „Suchen“ ist eine Lupe neben dem Suchfeld. „AB löschen“ und „AB bearbeiten“ stehen nicht mehr in der Liste, sondern im Menü (Rechtsklick auf einen AB oder eine seiner Zeilen, am Handy der Knopf „AB-Menü“).
- **Rückfragen in der Mitte:** Entnehmen, Archivieren, Zurückholen, Löschen, „alles ✓“ und freier Lagerort öffnen ein Fenster in der Mitte, der Hintergrund ist ausgegraut (`dialog.js`). Ohne Skript bleibt die Seite mit der Frage als Ausweg.
- **Dashboard:** Kacheln Forecast, Gesamtfortschritt und Regal entfallen; Komplett, Teilweise, Offen und Aufträge (rot, mit Gesamtfortschritt) stehen in einer Reihe. Suche links mit Lupe, Anzeige-Knöpfe, Dropdown „Sortieren“ (Absteigend ist Standard) nach Fortschritt in % (weicht von R-DB3 ab; ohne Auswahl gilt weiter die Excel-Reihenfolge im Code).
- **Regal:** Ziehen in jedes Fach und nach „Nicht einsortiert“. Rechtsklick auf einen AB: „AB in Baugruppen aufsplitten“ (Merkmal `regal_geteilt` am AB, je Baugruppe ein Eintrag, auch bei gleichem Platz). Rechtsklick auf eine Baugruppe: „AB zusammenführen“ an dem Platz, an dem diese Baugruppe liegt. Einträge sind keine Knöpfe mehr (Firefox kann Knöpfe nicht ziehen).
- **Rundgang** ist entfernt; Bestandsliste und Regal sind für das Handy gebaut (Karten, kein seitliches Scrollen).
- **Forecast:** Kacheln „ABs“ und „Heute“ entfallen, Kachelreihe, Suchzeile wie Bestandsliste mit Liefertermin und den drei Anzeige-Knöpfen.
- **Schweißen:** Spaltenbreiten in Prozent, die Zeile passt auf den Bildschirm; Hinweis zum Entnehmen entfernt; Knöpfe „Arbeitsplätze“ und „Zur Bestandsliste“ ersetzt durch „Mitarbeiter verwalten“ (Fenster in der Mitte, Namen eintragen und austragen). Mitarbeiter sind eine Mehrfachauswahl aus dieser Liste (gespeichert als „Anna, Bernd“); bereits eingetragene Namen, die ausgetragen wurden, bleiben sichtbar und abwählbar.
- **Arbeitsplätze:** Ziehen auch nach „Nicht einsortiert“. Rechtsklick: „AB in Baugruppen aufsplitten“ (Merkmal `ap_geteilt` an der AB-Zeile) und „AB zusammenführen“, beides nur, wenn alle Baugruppen des AB im Schweißen liegen (AB-Zeile da); sonst nur „Mitarbeiter ändern“ (Mehrfachauswahl). Die Karte „Einsortiert“ zeigt die Einträge „Name · Platz“ offen statt in einem Ausklappfeld.
- **Konto:** Symbol neben dem Namen, durch eine Linie von den Reitern getrennt.

## Änderungen vom 14.10.2026, Runde 2 (16 Punkte)
- **Aufklappen nach „ABs“/„BGs“:** Die Knöpfe zeigen jetzt alle Zeilen, nur zugeklappt („ABs“: alles zu; „BGs“: ABs auf, Baugruppen zu). Vorher fehlten die Zeilen darunter. Gilt in Bestandsliste und Schweißen; im Dashboard und Forecast setzt ein Druck auf den Knopf den gemerkten Klappzustand zurück (`neu=1`).
- **Bestandsliste:** Doppelklick auf „Vorhanden“ = Soll, nochmal = 0. Einfachklick auf AB- oder BG-Name klappt, Doppelklick zeigt nur diesen AB (`?ab=ID`). Entnehmen als roter Knopf. Zähler mittig, Einzelteile-Zähler entfernt. Teile einer Baugruppe dunkler, offen grau.
- **Sortierung** (Bestandsliste): A-Z, Z-A, Fortschritt auf-/absteigend. **Annahme:** zusätzlich „Wie importiert“ als Standard, weil Regel R-A4 die Importreihenfolge verlangt.
- **Regal:** Eine aufgesplittete Baugruppe fällt auf „Nicht einsortiert“ zurück (sie erbt den AB-Platz nicht mehr). Nie automatisch zusammenführen; liegen alle Baugruppen am selben Platz, fragt ein Popup „AB ist zusammengeführt.“ (Ja = zusammenführen, Nein = bleibt einzeln). Einzelne Baugruppe im Regal verschieben teilt den AB. „Kein Platz mehr“ erscheint beim Ablegen auf „Nicht einsortiert“.
- **Annahme zu Punkt 14:** Das Regal-Menü bekommt zusätzlich „In der Bestandsliste“, das nur diesen AB zeigt; der Knopf im Antippen-Dialog macht dasselbe.
- **„Sonstiges“** statt „Ohne gültigen Platz“ (Regal, Arbeitsplätze) und als Auswahl beim Arbeitsplatz im Schweißen.
- **Schweißen:** „Zurück“ im roten Knopf-Stil; Filter Mitarbeiter, Arbeitsplatz und Sortieren (Liefertermin/AB auf-/absteigend).
- **Dashboard:** Kachel „Aufträge“ ohne Zusatztext, Kacheln flacher. **Arbeitsplätze:** Knopf heißt „Mitarbeiter“.

## Änderungen vom 14.10.2026, Planung und Statistik
- **Planungs-Häkchen:** Spalte „Planung“ am Ende in Dashboard und Forecast, ein gemeinsamer Stand für alle (am AB-Schlüssel, nicht am Datensatz). Haken dürfen Planung, Schweißen und Admin; andere sehen es nur. Das Häkchen bleibt beim Entnehmen und fällt beim Archivieren und beim Löschen aus der Bestandsliste weg. Neuer Reiter „Planung“ zeigt die gehakten ABs wie im Dashboard, dazu Station, Lagerort und Liefertermin; Sortierung Standard nach Liefertermin.
- **Forecast:** neue Spalte „Station“ (Bestandsliste, Schweißen, oder „Bestandsliste + Schweißen“, wenn einzelne BGs eines AB im Schweißen liegen). „Lagerort“ zeigt in der Bestandsliste den Regalplatz, im Schweißen den Arbeitsplatz; auch in AB- und BG-Zeilen.
- **Statistik:** Liefertermin = „Liefertermin Stahlbau“, Versand = „Termin Versand“; pünktlich = Versand am Liefertermin oder davor. Ohne Versand zählt ein Eintrag mit Liefertermin vor heute als nicht pünktlich, ab heute noch nicht mit. Archivierte ABs zählen mit. Bauteile zählen je Zeile (nicht nach Menge). Soll 80 %: grün ab 80, gelb 70 bis 79, rot darunter. „Liefertreue Monat“: letzte 4 Kalenderwochen und die aktuelle; „Liefertreue IA“: letzte 12 Monate. Durchlaufzeit = Termin Versand − Eingelagert (nur ABs), nach Versanddatum: Woche = letzte 7 Tage, Monat = letzte 4 Kalenderwochen, Jahr = letzte 12 Monate; neutrale Balkenfarbe. Zusätzlich „Überfällige ABs“ (Liste) und „Verspätung“ (Ø Tage der zu spät versendeten ABs je Monat).
- **Annahmen:** Haben die BGs eines AB verschiedene Termine, gilt der früheste Liefertermin, und der Versand zählt erst, wenn alle BGs einen haben (dann der späteste). Die Spaltentests von Dashboard und Forecast kennen die neuen Spalten.
- **Aufsplitten (Ben, 15.10.):** „AB aufsplitten“ erscheint im Regal und bei den Arbeitsplätzen erst ab zwei Baugruppen; bei nur einer Baugruppe gibt es nichts aufzusplitten (auch der Server lehnt es ab). Ersetzt die frühere Regel, dass es schon ab einer Baugruppe geht.
- **Baugruppen als Kacheln (Ben, 15.10.):** In Bestandsliste und Schweißen (PC und Handy) ist der AB eine Überkachel mit Innenrand, jede Baugruppe samt ihren Teilen eine eigene Kachel mit Rahmen und runden Ecken. Statusfarben, Rechtsklick, Ziehen und Ablegen, Auf- und Zuklappen, Filter und Spalten bleiben gleich. Am PC bleibt es eine Tabelle je AB, die Baugruppe ist ein eigener Tabellenblock. Die AB-Zeile ist die Überschrift der großen Kachel: oben randlos über die ganze Breite, untere Ecken eckig (Ben, 15.10.).
- **Aufgeteilte ABs (Ben, 15.10.):** Liegen einzelne BGs im Schweißen, stehen sie in der Bestandsliste als rote, nicht aufklappbare Kacheln „Befinden sich im Schweißen“ (unter den eigenen BGs, Antippen springt ins Schweißen). Im Schweißen stehen die Einzel-BGs eines AB gemeinsam unter einer AB-Überschrift ohne Eingabefelder (Eingaben bleiben an der BG); die BGs der Bestandsliste sind dort rote Kacheln „Befindet sich im Kommissionierlager“ (Antippen springt zum AB). Die roten Kacheln zählen nicht in Status und Zähler; der Zähler im Schweißen zählt den AB einmal.
- **Fünf Änderungen (Ben, 15.10.):** (1) Rechtsklick im Regal auf einen AB mit nur einer Baugruppe öffnet ein Fenster „In der Bestandsliste anzeigen“ / „Abbrechen“ (vorher passierte nichts); „AB aufsplitten“ gibt es weiter erst ab zwei Baugruppen. (2) Dashboard: Baugruppen, die schon im Schweißen liegen, stehen ganz unten im AB, hellgrau, durchgestrichen, Status „Schweißen“ (Antippen springt ins Schweißen). Sie zählen nicht in Status, Fortschritt und Zähler; der AB verschwindet wie bisher, sobald seine letzte Baugruppe entnommen ist. Das erweitert R-W4 („Dashboard liest nur die Bestandsliste“) um diese Hinweiszeilen, wie die roten Kacheln in der Bestandsliste; Forecast und Planung bleiben unverändert. (3) Eingeklappter AB in Bestandsliste und Schweißen: einfarbig ohne weißen Streifen, Inhalt zentriert (nur PC, am Handy gibt es kein Einklappen des AB). (4) Arbeitsplätze, Antippen: nur „Kein Arbeitsplatz“ und „Abbrechen“ (rot) nebeneinander; „Mitarbeiter“ bleibt im Rechtsklick-Menü. (5) Regal, Antippen: es bleiben nur „Kein Platz“ und „Abbrechen“, „AB aufsplitten“/„zusammenführen“ gibt es nur im Rechtsklick (Ben, 15.10.); die Knöpfe sind größer, „Abbrechen“ ist rot, auch in den Rechtsklick-Fenstern von Regal und Arbeitsplätzen.
- **Schweißen, AB mit Baugruppen im Kommissionierlager (Ben, 15.10.):** Die gemeinsame AB-Überschrift hat wieder Pfeil und klappbare AB-Nummer; zu ist der AB einfarbig, auf zeigt er alle Baugruppen-Kacheln samt roten Hinweisen. Start offen, bei „ABs“ zu.
- **Oberfläche nach Durchklick-Test (15.10.):** (1) Schweißen am PC: Ohne „Weitere Spalten“ ist die Datumsspalte zu schmal für Datum und Kalenderknopf, deshalb entfällt dort der Kalenderknopf und das Datum bekommt die ganze Breite (Eintippen geht wie bisher); mit „Weitere Spalten“ bleibt der Knopf. Geprüft bei 1280, 1440 und 1920 px (scrollWidth ≤ clientWidth). (2) Statistik ohne Daten: je Kachel nur „Dafür gibt es noch keine Daten.“ statt leerer Diagramme; der Verspätungssatz nennt keinen „–“-Schnitt mehr. (3) Zähler-Pille am Handy läuft als Fließtext und bricht sauber um. (4) Rundgang aus der README gestrichen.

## Zu große Zahlen und Punkt-Schreibweise (R-M4, 15.10.2026)
- **Obergrenze 999.999.999** (`rechnen.MAX_MENGE`) für Vorhanden, Soll und Import. Das Mengenfeld fasst nur 12 Stellen; SQLite prüft das nicht, eine größere Zahl wurde gespeichert und legte danach alle Seiten mit Fehler 500 lahm.
- **Eingabe und AB bearbeiten:** größere Zahlen werden mit „Bitte eine Zahl bis 999.999.999 eintragen.“ abgelehnt, nichts wird gespeichert.
- **Import:** zu große Zahlen werden nicht übernommen. Bei „Menge Gesamt“ steht sie als Text und zählt als 0 (wie andere Text-Mengen), bei „Vorhanden“ bleibt das Feld leer; die Vorschau nennt die Zeilen.
- **„1.000“ und „1,000“ (Ben, A):** Eingaben mit Punkt oder Komma und genau drei Stellen danach (ab 1, z. B. „12.500“, „1.000.000“) werden mit „Bitte ohne Punkt eintragen“ abgelehnt, statt still als 1 gelesen zu werden. „0,125“, „0,06“, „8,0“ und „2,5“ bleiben wie bisher gültig. Für Zellen in importierten Excel-Dateien gilt das nicht (dort stehen Zahlen als Zahl).

## Ladezeit der Bestandsliste (Ben, 15.10.2026)
- **Zahlen:** Bei 50 bis 150 ABs gleichzeitig (Messung im Testclient, je ca. 14 Teile pro AB, echte ABs sind vermutlich größer): Bestandsliste 2,4 / 4,7 / 7,0 MB HTML, Dashboard 0,8 / 1,5 / 2,3 MB. Mit Kompression sinkt das auf 0,10 / 0,18 / 0,27 MB (Bestandsliste) und 0,02 bis 0,04 MB (Dashboard), also rund 25-mal kleiner. Die Rechenzeit im Server (1,1 / 1,7 / 2,3 s Bestandsliste) bleibt gleich.
- **Entscheidung (R-V1):** `GZipMiddleware` ist die äußerste Schicht in `config/settings.py`. Liegt später ein Proxy der IT davor, der schon komprimiert, ist das unschädlich (bereits komprimierte Antworten werden nicht doppelt gepackt).
- **Sicherheit (BREACH):** Der Angriff braucht, dass ein Angreifer eigenen Text in die Seite einschleusen und die Größe der verschlüsselten Antwort mitlesen kann. Die App ist nur intern, und Django maskiert das CSRF-Kennzeichen in jeder Antwort neu (jedes Mal anderer Wert), wodurch das Geheimnis nicht aus der Größe ableitbar ist. Das Risiko wird daher als gering bewertet; Anmeldung und Rollen bleiben unverändert.
- **Stufe B (zugeklappte ABs nachladen)** wird nicht gebaut; siehe Empfehlung im Pull Request.


## Datenbank-Start und Sicherung (Ben, 15.10.2026)
- **Datenbank-Start (R-DB1):** Der Pfad der Datenbank-Datei kommt nur noch aus `KOM_DATENBANK`. Fehlt er, bricht der Start mit einer deutschen Meldung ab (vorher legte ein Start ohne Angabe still eine leere `db.sqlite3` an, auch mit `KOM_DEBUG=1`). Ohne Pfad laufen nur `check`, `collectstatic`, `help`, `version` und die automatischen Tests. `runserver` bricht zusätzlich ab, wenn die Datei am Pfad nicht existiert; eine neue Datenbank entsteht nur durch bewusstes `migrate` mit gesetztem Pfad. Das Windows-Testpaket setzt den Pfad selbst (`daten/bestand.sqlite3`) und ändert sich nicht. Server der IT: `KOM_DATENBANK` bei Dienst und Sicherung setzen.
- **Entwicklung:** `KOM_DEBUG=1 KOM_DATENBANK=db.sqlite3 python manage.py runserver` (zuerst einmal dasselbe mit `migrate`).
- **Sicherung (R-DB2):** `KOM_DATENBANK=<Pfad> python tools/sicherung.py [Zielordner]` kopiert die Datenbank mit Datum (`bestand_2026-10-15.sqlite3`) in den Ordner `sicherung` neben der Datenbank, die letzten 14 Kopien bleiben. Die Datenbank wird nur gelesen, auch bei laufendem Server sicher. Täglich per Aufgabenplanung (Windows) oder cron starten.
- **Handy „AB-Menü“ (Ben, 15.10.):** Im Fenster nach dem Antippen im Regal und bei den Arbeitsplätzen gibt es am Handy (bis 700 px Breite) den Knopf „AB-Menü“; er öffnet dasselbe Menü wie der Rechtsklick (Regal: aufsplitten, zusammenführen, „In der Bestandsliste anzeigen“; Arbeitsplätze: aufsplitten, zusammenführen, Mitarbeiter). Am PC unverändert. In der Bestandsliste gab es den Knopf schon.

## Demo-Daten (Ben, 15.10.2026)
- **Befehl `python manage.py demo_daten`** legt erfundene ABs zusätzlich zu den vorhandenen Daten an: 14 aktuelle (Bestandsliste offen/teilweise/komplett mit verschiedenen Lagerorten und aufgesplittet, ganz im Schweißen mit Arbeitsplätzen, Mitarbeitern und Mitarbeitergruppen, aufgeteilt zwischen Bestandsliste und Schweißen, überfällig, versendet), rund 90 aus dem Schweißen archivierte über 52 Wochen (jede Kalenderwoche, jeder Monat und die letzten 7 Tage belegt). Die Werte sind fest berechnet, ohne Zufall: Liefertreue steigt von etwa 55 auf etwa 90 %, Durchlaufzeit sinkt von etwa 18 auf etwa 8 Tage, die Verspätung wird kürzer, jeweils mit Ausreißern und nie überall 100 %, 2 aus der Bestandsliste gelöschte, Forecast-Zeilen mit Rot/Gelb/Weiß, Planungs-Häkchen und Protokoll-Einträge. Alle Termine sind relativ zu „heute“.
- **Erkennbar und entfernbar (Ben, 15.10.):** Kunden nur KNDS, Rheinmetall und DIEHL; AB-Nummern beginnen mit 2515, 2616 oder 2615 und liegen fest im Endbereich 900 bis 999 (z. B. AB2515901), damit sie nicht mit echten ABs kollidieren. Wiedererkannt werden sie an dieser festen Liste plus Kennzeichnung im Datensatz (Quelldatei „Demo-Daten“, Zusatz „(Demo)“ in der Forecast-Bezeichnung, Mitarbeiter „Demo Anna/Bernd/Chris/Dana“). Gibt es eine dieser Nummern schon als echten AB, wird sie übersprungen und beim Entfernen nicht angefasst. Der Befehl benutzt die echten Abläufe (Entnehmen, Archivieren, Löschen).
- **Nichts Bestehendes wird verändert:** ein Demo-AB, den es schon gibt, wird übersprungen (zweiter Lauf legt nichts an). Ein vorhandener Forecast wird nur um Demo-Zeilen ergänzt (nicht ersetzt); ohne Forecast entsteht ein eigener „Demo-Daten (Forecast)“. Das Protokoll bleibt leer, wenn es ausgeschaltet ist, und bekommt keine Namen, wenn „Namen speichern“ aus ist; Einträge älter als die Aufbewahrungszeit entfallen.
- **`python manage.py demo_daten --entfernen`** löscht genau diese Demo-Daten. Vor dem ersten Lauf auf einer Datenbank mit echten Daten sichern.

## Suche von überall (Ben, 15.10.2026)
- **Was:** Lupe in der Kopfleiste (am Handy mit Text „Suche“, neben „Menü“) öffnet ein Suchfeld mit Trefferliste; Taste „/“ öffnet, „Esc“ schließt, Eingabetaste öffnet die Seite `/suche/` (geht auch ohne JavaScript). Ab 2 Zeichen, Teilwort, ohne Groß-/Kleinschreibung (R-SU1).
- **Gesucht** wird in AB-Nummer, AB-Benennung, Baugruppen-Name und -Nummer, und Zeichnungsnummern nur bei vollständiger Eingabe (dann der AB bzw. die Baugruppe, in der sie steht). Teile, LK Nummer, Kunde und Archiv werden nicht durchsucht (Archiv: Annahme, Ben nannte nur Bestandsliste und Schweißen).
- **Treffer:** Ein ungeteilter AB ist ein Vorschlag „AB…“; liegt eine seiner Baugruppen im Schweißen, steht der Rest in der Bestandsliste einzeln da (Ben, 15.10.). Ein aufgesplitteter AB zeigt seine Baugruppen „AB…_BGnnn“ (gleiche Einträge wie Regal und Arbeitsplätze); passt nur eine Baugruppe, steht nur sie da. Angezeigt: Bestandsliste Kunde, Lagerort, Fortschritt; Schweißen Kunde, Arbeitsplatz, Mitarbeiter. Höchstens 8 je Bereich, dann „n weitere“ (R-SU2).
- **Rollen (R-SU3):** Gäste sehen beide Bereiche schon (W2); der Server prüft je Bereich die nötigen Rollen (`BEREICHE` in `bestand/suche.py`).
- **Kopfleiste (R-SU4):** Am PC nur das Lupen-Symbol, Reiter bis 1500 px etwas enger (die Leiste bricht erst unter 1366 statt 1280 px um). Der Knopf ist ein eigenes Teil (`kern/_suche.html`, `_suche_feld.html`).

## Rollen neu, Menüs, Konto (Ben, 15.10.2026)
- **Rollen (R-P2):** *Lager* heißt jetzt **Kommissionierung** (Vorhanden eintragen, Lagerort setzen, ABs importieren, ABs archivieren). *Schweißen* heißt jetzt **Stahlbau** (Mitarbeiter ändern, Arbeitsplätze und Termine eintragen, Hallenplan bearbeiten, ABs aus der Bestandsliste übernehmen und zurückholen). *Planung* entfällt.
- **Annahmen, wo Ben nichts sagte:** ABs ersetzen/löschen und Archiv wiederherstellen darf die Kommissionierung, Forecast importieren und Forecast-Daten sehen der Stahlbau (Ben, 15.10., nach erster Fassung). „vorhanden eintragen“ = Bestand eintragen. Häkchen in der Planung dürfen Kommissionierung, Stahlbau und Admin (vorher Planung, Schweißen, Admin).
- **Bestehende Benutzer** (Migration `kern/0002_rollen_neu`): Lager → Kommissionierung, Schweißen → Stahlbau, Planung → Kommissionierung.
- **Konto:** „Benutzer und Rollen verwalten“ nur für Admin; der Knopf „Änderungsprotokoll“ entfällt im Konto (Seite und Reiter „Protokoll“ für Admin bleiben, bis Ben anderes sagt). Alle Knöpfe stehen nebeneinander; „Abmelden“ ist rot mit Leuchten.
- **Rechtsklick-Menü** (Arbeitsplätze, Regal, Bestandsliste): kleine Kachel, Titel mittig, alle Knöpfe untereinander gleich groß, „Abbrechen“ unten.
- **Statistik:** Die Spalte „Überfällig seit“ war durch die Kachel-Zahlenschrift zu groß; Tabellenzellen bleiben jetzt in normaler Schrift.
- **Hilfe-Seite (Punkt 7):** wartet auf Bens Ja zum Vorschaubild.

## Umbau für Symolo, Phase 0 (Ben, 16.10.2026)
- **Ziel:** Die App läuft nur noch als Fenster in Symolo; Daten (und später Benutzer) kommen aus Symolo, Zugriff nur per WebSocket. Einhängen und Datenbank-Anbindung macht der Symolo-Entwickler. Damit entfallen eigener Server, Teams-Reiter und Gäste ohne Anmeldung (ändert W1, W2 und das Hosting vom 14.10.).
- **Pflicht:** Skill `.claude/skills/symolo-barebone-framework/` und `docs/Symolo_Referenz.md` (alle gesammelten Informationen). Nie auf Symolo oder dessen Datenbanken zugreifen.
- **„Index nie eintragen“** meint die ID (beim Anlegen nie setzen); der Zeichnungsindex der Teile bleibt.
- **Archivieren statt Löschen**, auch bei „AB löschen“ und „AB ersetzen“ (weicht von Excel und R-X1/R-X2 ab, von Ben bestätigt).
- **Vorerst keine Anmeldung und keine Rechte**; `symolo/quelle/50_benutzer.js` ist vorbereitet.
- **Aufbau:** eine Ansicht je Bereich, jede ein in sich geschlossenes Hook-Objekt; gemeinsamer Code steht einmal in `symolo/quelle/` und wird mit `tools/symolo_bauen.py` eingesetzt (Ben: „mach wie es übersichtlicher ist“).
- **Excel einlesen** macht die App selbst; eine Lesebibliothek (z. B. SheetJS) ist erlaubt, Adresse offen.
- **Reihenfolge:** Schritt für Schritt (Phase 0 Grundlage, dann Bestandsliste, dann Bereich für Bereich).
- **Testen:** Nachbau von `window.symolo` mit den Beispiel- und Demo-Daten (`symolo/lokal/`), Testseite `symolo/test.html` per Doppelklick. In Symolo ist Schreiben gesperrt, bis der Entwickler die Tabellennamen geprüft hat (`schreibenErlaubtInSymolo`).
- **Tabellen:** eigene Annahmen `fwm.kom_…` (Felder 1:1 aus der Django-App), kommentiert mit VERMUTET/OFFEN; die Tabellenliste aus Symolo gibt es noch nicht.

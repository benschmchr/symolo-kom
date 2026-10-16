/* ===========================================================================
   TABELLEN UND FELDER
   Die EINZIGE Stelle mit Tabellen- und Spaltennamen der Datenbank.
   Der Code benutzt nur die Namen LINKS (unsere Namen). Der Entwickler trägt
   RECHTS den echten Namen in Symolo ein. Sonst ändert sich nichts.

   VERMUTET (alles unter "kom_"): Tabellen gibt es in Symolo noch nicht.
   Name und Felder sind unser Vorschlag (Umbauplan, Abschnitt 6), 1:1 aus
   der bisherigen App übernommen.

   Aufbau je Tabelle:
     tabelle   echter Tabellenname mit Schema
     felder    unser Name : Spalte in Symolo
     verweise  unser Feld, das auf eine andere Tabelle zeigt:
               ziel = unser Tabellenname, anzeige = Feld dort, das statt
               der ID angezeigt wird (IDs werden nie angezeigt)
     archiv    unser Feld für "archiviert" (j/n). Fehlt es, kann die
               Tabelle nicht archiviert werden. Gelöscht wird nie.
   =========================================================================== */
tabellen: {

    /* Standardfelder, die jede Symolo-Tabelle hat (gesehen in
       fwm.stamm_prozesse). Die ID ist nur intern, nie sichtbar. */
    _standard: {
        id: "id",
        angelegt_von: "iuser",
        angelegt_am: "idate",
        geaendert_von: "uuser",
        geaendert_am: "udate"
    },

    /* ---- Bekannt aus test.html: nur für den Verbindungstest ---- */

    prozess: {
        tabelle: "fwm.stamm_prozesse",
        felder: {
            name: "name",
            gruppe: "standard_gruppe_id_gruppe"
        },
        verweise: {
            gruppe: { ziel: "gruppe", anzeige: "name" }
        }
    },

    /* VERMUTET: Auf welche Tabelle standard_gruppe_id_gruppe zeigt, ist
       nicht bekannt. Möglich ist "fwm.standard_gruppe" oder eine Tabelle
       "gruppe". OFFEN (Symolo): Tabelle und Spalte des Gruppennamens. */
    gruppe: {
        tabelle: "fwm.standard_gruppe",
        felder: {
            name: "name"
        }
    },

    /* ---- Bestandsliste (VERMUTET, Vorschlag) ---- */

    auftrag: {
        tabelle: "fwm.kom_auftrag",
        felder: {
            ab_anzeige: "ab_anzeige",
            ab_schluessel: "ab_schluessel",
            forecast_schluessel: "forecast_schluessel",
            haupt_ab: "haupt_ab",
            kunde: "kunde",
            verkaufsartikel: "verkaufsartikel",
            ersteller: "ersteller",
            datum_liste: "datum_liste",
            dispoliste: "dispoliste",
            lagerort: "lagerort",
            regal_geteilt: "regal_geteilt",
            bereich: "bereich",
            reihenfolge: "reihenfolge",
            quelldatei: "quelldatei",
            /* Archiv statt Löschen (Ben, 16.10.2026).
               OFFEN (Symolo): Name und Typ des Archiv-Felds (ja/nein? 0/1?). */
            archiviert: "archiviert",
            archiviert_am: "archiviert_am",
            archiv_herkunft: "archiv_herkunft",
            archiv_status: "archiv_status"
        },
        archiv: "archiviert"
    },

    baugruppe: {
        tabelle: "fwm.kom_baugruppe",
        felder: {
            /* VERMUTET: Muster wie standard_gruppe_id_gruppe. */
            auftrag: "auftrag_id_auftrag",
            zeile: "zeile",
            name: "name",
            kurz: "kurz",
            zeichnungsnummer: "zeichnungsnummer",
            benennung: "benennung",
            menge_bg: "menge_bg",
            menge_gesamt: "menge_gesamt",
            menge_gesamt_text: "menge_gesamt_text",
            /* "index" ist der ZEICHNUNGSINDEX, nicht die ID. */
            index: "index",
            lk_nummer: "lk_nummer",
            arbeitsgang: "arbeitsgang",
            material: "material",
            profil: "profil",
            abmasse: "abmasse",
            bemerkung: "bemerkung",
            lagerort: "lagerort"
        },
        verweise: {
            auftrag: { ziel: "auftrag", anzeige: "ab_anzeige" }
        }
    },

    teil: {
        tabelle: "fwm.kom_teil",
        felder: {
            auftrag: "auftrag_id_auftrag",
            /* leer = Teil ohne Baugruppe ("(ohne BG)") */
            baugruppe: "baugruppe_id_baugruppe",
            zeile: "zeile",
            zeichnungsnummer: "zeichnungsnummer",
            benennung: "benennung",
            menge_bg: "menge_bg",
            /* OFFEN (Symolo): Zahl mit 3 Nachkommastellen bis 999.999.999 */
            menge_gesamt: "menge_gesamt",
            menge_gesamt_text: "menge_gesamt_text",
            index: "index",
            lk_nummer: "lk_nummer",
            arbeitsgang: "arbeitsgang",
            material: "material",
            profil: "profil",
            abmasse: "abmasse",
            bemerkung: "bemerkung",
            lagerort: "lagerort",
            vorhanden: "vorhanden",
            datum_eingelagert: "datum_eingelagert",
            datum_komplett: "datum_komplett"
        },
        verweise: {
            auftrag: { ziel: "auftrag", anzeige: "ab_anzeige" },
            baugruppe: { ziel: "baugruppe", anzeige: "name" }
        }
    },

    /* ---- Schweißen und Arbeitsplätze (VERMUTET, Vorschlag) ---- */

    schweisszeile: {
        tabelle: "fwm.kom_schweisszeile",
        felder: {
            nr: "nr",
            ab_nr: "ab_nr",
            ab_schluessel: "ab_schluessel",
            anzeige: "anzeige",
            ebene: "ebene",
            baugruppe: "baugruppe",
            zeichnungsnummer: "zeichnungsnummer",
            benennung: "benennung",
            menge_bg: "menge_bg",
            menge_gesamt: "menge_gesamt",
            index: "index",
            lk_nummer: "lk_nummer",
            arbeitsgang: "arbeitsgang",
            material: "material",
            profil: "profil",
            abmasse: "abmasse",
            bemerkung: "bemerkung",
            vorhanden: "vorhanden",
            lagerort: "lagerort",
            status: "status",
            fortschritt: "fortschritt",
            eingelagert: "eingelagert",
            komplett: "komplett",
            entnommen: "entnommen",
            mitarbeiter: "mitarbeiter",
            arbeitsplatz: "arbeitsplatz",
            liefertermin_stahlbau: "liefertermin_stahlbau",
            termin_versand: "termin_versand",
            /* OFFEN (Symolo): Gibt es einen JSON-Typ? Sonst langer Text. */
            kopf: "kopf",
            ap_geteilt: "ap_geteilt",
            archiviert: "archiviert"
        },
        archiv: "archiviert"
    },

    mitarbeiter: {
        tabelle: "fwm.kom_mitarbeiter",
        felder: {
            name: "name",
            /* statt Löschen: aktiv = nein */
            aktiv: "aktiv"
        }
    },

    arbeitsplatz: {
        tabelle: "fwm.kom_arbeitsplatz",
        felder: {
            name: "name",
            reihenfolge: "reihenfolge",
            farbe: "farbe",
            spalte: "spalte",
            zeile: "zeile",
            breite: "breite",
            hoehe: "hoehe"
        }
    },

    /* Häkchen "Planung" an einem AB. Entfernen heißt archivieren (nie löschen);
       setzt jemand das Häkchen wieder, wird der Eintrag wieder eingeblendet. */
    planungsmarke: {
        tabelle: "fwm.kom_planungsmarke",
        felder: {
            ab_schluessel: "ab_schluessel",
            archiviert: "archiviert"
        },
        archiv: "archiviert"
    },

    /* ---- Forecast (VERMUTET, Vorschlag) ---- */

    forecast: {
        tabelle: "fwm.kom_forecast",
        felder: {
            zeit: "zeit",
            datei: "datei",
            blatt: "blatt",
            stand: "stand",
            kopf: "kopf"
        }
    },

    forecast_zeile: {
        tabelle: "fwm.kom_forecast_zeile",
        felder: {
            forecast: "forecast_id_forecast",
            nr: "nr",
            schluessel: "schluessel",
            termin: "termin",
            werte: "werte"
        },
        verweise: {
            forecast: { ziel: "forecast", anzeige: "stand" }
        }
    },

    /* Einstellungen als Name/Wert-Paare (Protokoll, Link zur Forecast-Datei) */
    einstellung: {
        tabelle: "fwm.kom_einstellung",
        felder: {
            name: "name",
            wert: "wert"
        }
    },

    /* ---- Änderungsprotokoll (VERMUTET, Vorschlag; Umbauplan Abschnitt 6) ----
       OFFEN (Symolo): Reichen die Standardfelder (iuser, idate, uuser, udate)
       als Protokoll? Dann entfiele diese Tabelle. Bis dahin schreibt die App
       jede Änderung als eigene Zeile.
       archiviert: Ausblenden statt Löschen ("Aufbewahren", "Leeren"). */
    aenderung: {
        tabelle: "fwm.kom_aenderung",
        felder: {
            /* Zeitpunkt mit Uhrzeit (UTC) */
            zeit: "zeit",
            /* leer, wenn Namen nicht gespeichert werden */
            benutzer_name: "benutzer_name",
            art: "art",
            ab: "ab",
            objekt: "objekt",
            alt: "alt",
            neu: "neu",
            archiviert: "archiviert"
        },
        archiv: "archiviert"
    }
},

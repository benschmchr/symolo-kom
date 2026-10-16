/* ===========================================================================
   Bestandsliste Kommissionierung Stahlbau – Ansicht „Schweißen“ für Symolo
   Automatisch erzeugt mit tools/symolo_bauen.py aus symolo/quelle und
   symolo/ansichten/schweissen. NICHT VON HAND ÄNDERN.

   Einbau: Alles ab der nächsten Zeile mit { bis zum Ende als Hook-Objekt
   ins Formular einfügen. Das Formular braucht ein Feld mit der Bindung
   "_output". Anpassungen nur in 10_einstellungen.js und 20_tabellen.js
   (dann neu bauen). Anleitung: docs/Symolo_Anbindung.md
   Erstellt: Ben Schumacher, 09.10.2026
   =========================================================================== */
{

/* Kenndaten dieser Ansicht (aus tools/symolo_bauen.py). */
ansicht: { name: "schweissen", titel: "Schweißen", klasse: "kom-sw", praefix: "komSw", cssId: "KOMSWCSS" },


/* ===========================================================================
   EINSTELLUNGEN
   Was der Symolo-Entwickler beim Einbinden anpasst, steht hier und in
   20_tabellen.js. Sonst muss im Code nichts geändert werden.

   Kennzeichnung in allen Dateien:
     OFFEN (Symolo)    = noch nicht geklärt, der Entwickler prüft/trägt ein
     VERMUTET          = aus Beispielen geschlossen, nicht bestätigt
   =========================================================================== */
einstellungen: {

    /* Woher die Daten kommen:
         "automatisch" = im Symolo-Fenster Symolo, sonst lokaler Nachbau
         "lokal"       = immer der Nachbau mit Beispieldaten
         "symolo-test" = NUR für den Entwickler: Test von außen über
                         window.symolo.network (wie test.html, mit eigener
                         Anmeldung VOR dem Laden der Ansicht). Nie in der
                         fertigen App benutzen. */
    quelle: "automatisch",

    /* OFFEN (Symolo): Muss im Fenster ein Endpunkt übergeben werden, oder
       setzt internal.connection ihn selbst? In test.html stand
       "wss://…/cmd2". Hier eintragen, falls nötig. */
    endpunktSymolo: "",

    /* Nur für den lokalen Nachbau, erreicht nichts außerhalb des Browsers. */
    endpunktLokal: "lokal://beispieldaten",

    /* Jede Anfrage bricht nach dieser Zeit ab. Ohne Grenze hängt
       websocket.request bei totem Endpunkt endlos (Skill, API-Grenzen). */
    timeoutMs: 15000,

    /* SCHREIBSPERRE in Symolo: Erst auf true setzen, wenn alle Namen in
       20_tabellen.js geprüft sind. Bis dahin liest die App nur.
       Im lokalen Nachbau wird immer geschrieben. */
    schreibenErlaubtInSymolo: false,

    /* Bereichsleiste oben in jeder Ansicht (wie das Hauptmenü der bisherigen App, Ben 16.10.2026).
       Auf false setzen, wenn Symolo selbst zwischen den Formularen wechseln lässt. */
    bereichsleiste: true,

    /* Die Bereiche in der Reihenfolge des Hauptmenüs: [Name der Ansicht, Beschriftung]. */
    bereiche: [
        ["bestandsliste", "Bestandsliste"], ["dashboard", "Dashboard"], ["regal", "Regal"], ["forecast", "Forecast"],
        ["planung", "Planung"], ["statistik", "Statistik"], ["schweissen", "Schweißen"],
        ["arbeitsplaetze", "Arbeitsplätze"], ["archiv", "Archiv"], ["protokoll", "Protokoll"]
    ]
},


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
            /* "bestand" = steht in der Bestandsliste. "schweissen" = ganz ins Schweißen
               entnommen (Phase 6; die Zeile bleibt stehen, nur ausgeblendet).
               "archiv" = Kopf eines im Schweißen archivierten AB (die Zeilen liegen
               in schweisszeile). OFFEN (Symolo): Name und Werte des Felds. */
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
            lagerort: "lagerort",
            /* Entnommen ins Schweißen (Phase 6): nur diese Baugruppe, der AB bleibt. */
            archiviert: "archiviert"
        },
        verweise: {
            auftrag: { ziel: "auftrag", anzeige: "ab_anzeige" }
        },
        archiv: "archiviert"
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
            datum_komplett: "datum_komplett",
            /* Entnommen ins Schweißen (Phase 6), zusammen mit der Baugruppe. */
            archiviert: "archiviert"
        },
        verweise: {
            auftrag: { ziel: "auftrag", anzeige: "ab_anzeige" },
            baugruppe: { ziel: "baugruppe", anzeige: "name" }
        },
        archiv: "archiviert"
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
            /* ja = archiviert (Archiv) ODER zurück in die Bestandsliste geholt
               (dann zusätzlich zurueckgeholt = ja; solche Zeilen zählen nirgends mit). */
            archiviert: "archiviert",
            zurueckgeholt: "zurueckgeholt"
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


/* ===========================================================================
   HILFEN: tolerant lesen, Texte und Daten anzeigen
   =========================================================================== */

/* Spalte aus einer Zeile lesen, egal wie Symolo sie schreibt.
   toObject liefert die Spaltennamen in fremder Schreibweise; row.spalte
   wäre dann undefined und die Liste still leer (Skill, API-Grenzen). */
field: function (row, name) {

    if (!row) return undefined;
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];

    const wanted = String(name).toLowerCase();

    for (const key in row) {
        if (key.toLowerCase() === wanted) return row[key];
    }

    return undefined;
},

fieldAny: function (row, names) {

    for (let i = 0; i < names.length; i++) {
        const value = this.field(row, names[i]);
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return undefined;
},

/* Der echte Schlüssel in einem Objekt, egal welche Schreibweise. */
schluesselVon: function (objekt, name) {

    if (Object.prototype.hasOwnProperty.call(objekt, name)) return name;

    const wanted = String(name).toLowerCase();

    for (const key in objekt) {
        if (key.toLowerCase() === wanted) return key;
    }

    return null;
},

/* null ist nicht "": nie "undefined" oder "null" anzeigen. */
text: function (value) {

    const t = value === undefined || value === null ? "" : String(value).trim();
    return t === "undefined" || t === "null" ? "" : t;
},

/* "2026-01-05T13:19:33.0000000Z" -> "05.01.2026".
   Nur die Ziffern werden umgestellt, keine Zeitzone gerechnet.
   OFFEN (Symolo): Kommen reine Datumsfelder im selben Format? */
datumText: function (value) {

    const t = this.text(value);
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);

    return m ? m[3] + "." + m[2] + "." + m[1] : t;
},

/* "2026-01-05T13:19:33..." -> "05.01.2026 13:19" */
datumZeitText: function (value) {

    const t = this.text(value);
    const m = t.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);

    return m ? m[3] + "." + m[2] + "." + m[1] + " " + m[4] + ":" + m[5] : this.datumText(t);
},


/* ===========================================================================
   DATENZUGRIFF
   Alle Ansichten sprechen NUR über diese Methoden mit der Datenbank:
   nie SQL in einer Ansicht, nie websocket direkt, nie fetch.

     Lesen:      datenLesen(tabelle, optionen)
     Schreiben:  datenAnlegen, datenAendern, datenArchivieren
                 -> alle laufen durch EINEN Schreibpfad: schreiben()
     Löschen:    gibt es absichtlich nicht (archivieren statt löschen)

   Benutzte Symolo-Befehle (Befehlsliste vom 16.10.2026):
     dsf.Database.Select             Listen lesen
     dsf.dbo.GetDBObjectListByIDJson Verweise zu Namen auflösen
     dsf.dbo.GetEmptyObjectJson      leeres Objekt vor dem Anlegen
     dsf.dbo.CreateObjectJson        anlegen (ohne ID)
     dsf.dbo.GetObjectByIdJson       frisch holen vor dem Ändern
     dsf.dbo.UpdateObjectJson        ändern (immer komplettes Objekt)
   =========================================================================== */

datenHinweise: [],

/* "symolo", "symolo-test" oder "lokal" (siehe einstellungen.quelle). */
datenQuelle: function () {

    const q = this.einstellungen.quelle;
    if (q === "lokal" || q === "symolo-test") return q;

    /* internal.connection gibt es nur im Symolo-Fenster.
       Der lokale Nachbau hat es absichtlich nicht. */
    const s = window.symolo;
    return s && s.internal && s.internal.connection ? "symolo" : "lokal";
},

/* DIE EINE STELLE, an der sich Barebone und Framework unterscheiden
   (Skill, Abschnitt 6). Sie wird automatisch gewählt. */
netzweg: function () {

    if (this.datenQuelle() === "symolo") {
        return window.symolo.internal.connection.websocket;
    }
    return window.symolo.network.websocket;
},

endpunkt: function () {

    return this.datenQuelle() === "lokal"
        ? this.einstellungen.endpunktLokal
        : this.einstellungen.endpunktSymolo;
},

schreibenErlaubt: function () {

    return this.datenQuelle() === "lokal" || this.einstellungen.schreibenErlaubtInSymolo === true;
},

quelleText: function () {

    const q = this.datenQuelle();
    if (q === "lokal") return "Beispieldaten (lokaler Test, keine Verbindung zu Symolo)";
    if (q === "symolo-test") return "Symolo (Test von außen)";
    return "Symolo";
},


/* ---------------------------------------------------------------------------
   Anfrage
   --------------------------------------------------------------------------- */

/* Jede Anfrage mit Zeitlimit: request rejectet bei totem Endpunkt nicht,
   es hängt endlos (Skill, API-Grenzen). */
anfrage: function (cmd, par) {

    const ms = this.einstellungen.timeoutMs;
    let uhr = null;

    return Promise.race([
        this.netzweg().request(this.endpunkt(), { cmd: cmd, par: par }),
        new Promise((_, reject) => {
            uhr = setTimeout(() => {
                reject(new Error("Keine Antwort nach " + Math.round(ms / 1000) + " Sekunden."));
            }, ms);
        })
    ]).finally(() => clearTimeout(uhr));
},

/* Antwort eines dsf.dbo-Befehls als Objekt.
   Bekannt (test.html): Get… liefert JSON-Text in data.result.
   OFFEN (Symolo): Create, Update und GetDBObjectListByIDJson werden in
   test.html nicht ausgelesen. Angenommen: ebenfalls JSON-Text in
   data.result. Falls nicht, nur diese Methode anpassen.
   OFFEN (Symolo): Wie meldet Symolo Fehler (Pflichtfeld, Rechte)? */
antwortObjekt: function (antwort) {

    const data = antwort && antwort.data;
    const wert = data && data.result !== undefined ? data.result : data;

    if (typeof wert === "string") return wert === "" ? null : JSON.parse(wert);
    return wert === undefined ? null : wert;
},


/* ---------------------------------------------------------------------------
   Tabellen und SQL
   --------------------------------------------------------------------------- */

tabelleInfo: function (name) {

    const t = this.tabellen[name];
    if (!t || name === "_standard") throw new Error("Unbekannte Tabelle: " + name);
    return t;
},

/* Unser Feldname -> Spalte in Symolo. */
spalte: function (name, feld) {

    const st = this.tabellen._standard;
    if (Object.prototype.hasOwnProperty.call(st, feld)) return st[feld];

    const s = this.tabelleInfo(name).felder[feld];
    if (!s) throw new Error("Unbekanntes Feld „" + feld + "“ in " + name);
    return s;
},

/* Nur Namen aus 20_tabellen.js kommen ins SQL, und nur in dieser Form. */
sqlName: function (n) {

    if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)?$/.test(String(n))) {
        throw new Error("Ungültiger Name für die Abfrage: " + n);
    }
    return n;
},

/* Werte werden NUR hier zu SQL-Text. Texte in '…', ' wird verdoppelt.
   OFFEN (Symolo): Typ von ja/nein-Feldern. Angenommen: 1 / 0. */
sqlWert: function (v) {

    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "1" : "0";
    if (typeof v === "number") {
        if (!Number.isFinite(v)) throw new Error("Ungültige Zahl für die Abfrage.");
        return String(v);
    }
    return "'" + String(v).replace(/'/g, "''") + "'";
},

/* optionen.wo:         { feld: wert | [werte] | null }  (alles mit "und")
   optionen.sortierung: ["feld", "-feld"]  (- = absteigend)
   optionen.felder:     ["feld", …]  nur diese Spalten holen (plus ID, Änderungszeit
                        und Archiv-Feld). Für große Tabellen, bei denen man nur
                        wenige Spalten braucht (z. B. die Zeilen des Forecast).
                        Die anderen Felder der Zeile sind dann leer (null).
   OFFEN (Symolo): Welche SQL-Sprache (das Datumsformat …0000000Z spricht
   für SQL Server)? Wir benutzen nur: select * / select spalte, spalte from … where … = / in /
   is null … order by …  — kein limit/top, keine Verknüpfungen (join).
   VERMUTET: Symolo versteht eine Spaltenliste statt "*". */
sqlBauen: function (name, optionen) {

    const t = this.tabelleInfo(name);
    const o = optionen || {};
    const wo = [];
    const bedingungen = o.wo || {};

    let spalten = "*";
    if (o.felder && o.felder.length) {
        const st = this.tabellen._standard;
        const namen = [st.id, st.geaendert_am];
        if (t.archiv) namen.push(this.spalte(name, t.archiv));
        o.felder.forEach(f => namen.push(this.spalte(name, f)));
        spalten = namen.filter((n, i) => namen.indexOf(n) === i).map(n => this.sqlName(n)).join(", ");
    }

    let sql = "select " + spalten + " from " + this.sqlName(t.tabelle);

    for (const feld in bedingungen) {
        const sp = this.sqlName(this.spalte(name, feld));
        const w = bedingungen[feld];

        if (w === null) {
            wo.push(sp + " is null");
        } else if (Array.isArray(w)) {
            wo.push(sp + " in (" + w.map(x => this.sqlWert(x)).join(", ") + ")");
        } else {
            wo.push(sp + " = " + this.sqlWert(w));
        }
    }

    if (wo.length) sql += " where " + wo.join(" and ");

    const sortierung = o.sortierung || [];
    if (sortierung.length) {
        sql += " order by " + sortierung.map(f => {
            const ab = f.charAt(0) === "-";
            return this.sqlName(this.spalte(name, ab ? f.slice(1) : f)) + (ab ? " desc" : "");
        }).join(", ");
    }

    return sql;
},


/* ---------------------------------------------------------------------------
   Lesen
   --------------------------------------------------------------------------- */

/* Rohzeile aus Symolo -> Objekt mit UNSEREN Feldnamen.
   Alles, was eine ID ist, steht nur in Feldern mit _ vorne
   (_id, _gruppe_id …). Die Anzeige zeigt solche Felder nie. */
zeileLesen: function (name, row) {

    const t = this.tabelleInfo(name);
    const st = this.tabellen._standard;
    const verweise = t.verweise || {};

    const z = {
        _id: this.field(row, st.id),
        _angelegt_von: this.field(row, st.angelegt_von),
        _geaendert_von: this.field(row, st.geaendert_von),
        angelegt_am: this.field(row, st.angelegt_am),
        geaendert_am: this.field(row, st.geaendert_am)
    };

    for (const feld in t.felder) {
        const wert = this.field(row, t.felder[feld]);

        if (verweise[feld]) {
            z["_" + feld + "_id"] = wert === undefined ? null : wert;
            z[feld] = "";                 /* Name kommt aus datenAufloesen */
        } else {
            z[feld] = wert === undefined ? null : wert;
        }
    }

    return z;
},

/* optionen.archiv: "ohne" (Standard), "nur" oder "alle"
   optionen.aufloesen: false = Verweise nicht zu Namen auflösen */
datenLesen: async function (name, optionen) {

    const o = optionen || {};
    const bedingungen = o.wo || {};

    /* "in ()" mit leerer Liste ist kein gültiges SQL: dann gibt es nichts. */
    for (const feld in bedingungen) {
        if (Array.isArray(bedingungen[feld]) && bedingungen[feld].length === 0) return [];
    }

    const antwort = await this.anfrage("dsf.Database.Select", [this.sqlBauen(name, o)]);

    /* Format von data/schema kennt nur toObject; wir fassen es nie direkt an. */
    const rows = window.symolo.tools.parser.toObject(antwort.data.data, antwort.data.schema) || [];

    let liste = rows.map(row => this.zeileLesen(name, row));

    /* Archivierte ausblenden. Im Browser gefiltert, weil der Typ des
       Archiv-Felds offen ist (OFFEN, Symolo). Später ins SQL nehmen. */
    const archiv = this.tabelleInfo(name).archiv;
    if (archiv && o.archiv !== "alle") {
        const nurArchiv = o.archiv === "nur";
        liste = liste.filter(z => this.istJa(z[archiv]) === nurArchiv);
    }

    if (o.aufloesen !== false) await this.datenAufloesen(name, liste);

    return liste;
},

/* Wie datenLesen mit "feld in (werte)", aber in Stücken zu 500 Werten,
   damit die Abfrage nicht zu lang wird.
   OFFEN (Symolo): Gibt es eine Grenze für die Länge einer Abfrage? */
datenLesenIn: async function (name, feld, werte, optionen) {

    const o = Object.assign({ aufloesen: false }, optionen || {});
    let liste = [];

    for (let i = 0; i < werte.length; i += 500) {
        const wo = Object.assign({}, o.wo || {});
        wo[feld] = werte.slice(i, i + 500);
        liste = liste.concat(await this.datenLesen(name, Object.assign({}, o, { wo: wo })));
    }

    return liste;
},

/* OFFEN (Symolo): Typ von ja/nein. Wir verstehen alle üblichen Formen. */
istJa: function (wert) {

    if (wert === true || wert === 1) return true;
    const t = this.text(wert).toLowerCase();
    return t === "1" || t === "true" || t === "j" || t === "ja";
},

/* Verweise (IDs) zu Namen auflösen: z. B. gruppe = "Montage".
   Holt alle nötigen Einträge auf einmal, in Stücken zu 200.
   Klappt das nicht, bleibt der Name leer und es gibt einen Hinweis;
   die Liste selbst wird trotzdem angezeigt. */
datenAufloesen: async function (name, liste) {

    const verweise = this.tabelleInfo(name).verweise || {};
    const st = this.tabellen._standard;

    for (const feld in verweise) {
        const v = verweise[feld];
        const ziel = this.tabelleInfo(v.ziel);
        const idFeld = "_" + feld + "_id";

        const ids = [];
        liste.forEach(z => {
            const id = z[idFeld];
            if (id !== null && id !== undefined && id !== "" && ids.indexOf(id) < 0) ids.push(id);
        });

        if (ids.length === 0) continue;

        const namen = {};

        try {
            for (let i = 0; i < ids.length; i += 200) {
                /* OFFEN (Symolo): Form der idList. Angenommen: Text mit Kommas. */
                const antwort = await this.anfrage(
                    "dsf.dbo.GetDBObjectListByIDJson",
                    [ziel.tabelle, ids.slice(i, i + 200).join(",")]
                );
                const objekte = this.antwortObjekt(antwort) || [];
                objekte.forEach(obj => {
                    namen[String(this.field(obj, st.id))] = this.text(this.field(obj, ziel.felder[v.anzeige]));
                });
            }
        } catch (fehler) {
            console.warn("datenAufloesen:", name, feld, fehler);
            this.datenHinweise.push("Namen für „" + feld + "“ konnten nicht geladen werden.");
        }

        liste.forEach(z => {
            const id = z[idFeld];
            z[feld] = id === null || id === undefined ? "" : (namen[String(id)] || "");
        });
    }
},


/* ---------------------------------------------------------------------------
   Schreiben
   --------------------------------------------------------------------------- */

/* Unsere Feldnamen in ein Symolo-Objekt eintragen.
   OFFEN (Symolo): Haben die Felder aus GetEmptyObjectJson dieselbe
   Schreibweise wie die Spalten aus Select? Wir suchen den Schlüssel
   deshalb ohne Rücksicht auf Groß-/Kleinschreibung. */
rohSetzen: function (name, roh, werte) {

    const t = this.tabelleInfo(name);

    for (const feld in werte) {
        if (Object.prototype.hasOwnProperty.call(this.tabellen._standard, feld) || feld.charAt(0) === "_") {
            throw new Error("Die ID und die Standardfelder setzt nur Symolo.");
        }

        const sp = t.felder[feld];
        if (!sp) throw new Error("Unbekanntes Feld „" + feld + "“ in " + name);

        roh[this.schluesselVon(roh, sp) || sp] = werte[feld];
    }

    return roh;
},

/* DER EINZIGE SCHREIBPFAD (Skill, Abschnitt 8).
   art: "anlegen" oder "aendern". stand: geaendert_am, wie es die Ansicht
   gelesen hat (zum Erkennen, ob inzwischen jemand anderes geändert hat).
   werte: { feld: wert } oder beim Ändern eine Funktion (frisch) => werte,
   die mit dem frisch geholten Eintrag rechnet (z. B. Daten nach R-T1).
   optionen.trotzdem: bei fremder Änderung trotzdem speichern; das
   Ergebnis hat dann _inzwischen = true (für einen Hinweis). */
schreiben: async function (art, name, id, werte, stand, optionen) {

    if (!this.schreibenErlaubt()) {
        throw new Error("Speichern ist noch nicht freigegeben. Die Tabellen werden noch geprüft.");
    }

    const tabelle = this.tabelleInfo(name).tabelle;

    if (art === "anlegen") {

        /* Erst das leere Objekt holen: so ist die Struktur klar. */
        const roh = this.antwortObjekt(await this.anfrage("dsf.dbo.GetEmptyObjectJson", [tabelle]));
        if (!roh) throw new Error("Symolo hat kein leeres Objekt geliefert.");

        this.rohSetzen(name, roh, werte);

        /* KEINE ID setzen: Symolo vergibt sie (eine gesetzte würde ignoriert). */
        const neu = this.antwortObjekt(
            await this.anfrage("dsf.dbo.CreateObjectJson", [tabelle, JSON.stringify(roh)])
        );

        return this.zeileLesen(name, neu || {});
    }

    if (art === "aendern") {

        /* Immer frisch holen und das KOMPLETTE Objekt zurückschicken:
           Felder, die fehlen, würden in Symolo gelöscht (test.html).
           OFFEN (Symolo): ID als Text oder Zahl? Wir senden Text. */
        const roh = this.antwortObjekt(
            await this.anfrage("dsf.dbo.GetObjectByIdJson", [tabelle, String(id)])
        );
        if (!roh) throw new Error("Der Eintrag ist nicht mehr da. Bitte neu laden.");

        let inzwischen = false;
        if (stand !== undefined) {
            const jetzt = this.text(this.field(roh, this.tabellen._standard.geaendert_am));
            inzwischen = jetzt !== this.text(stand);
            if (inzwischen && !(optionen && optionen.trotzdem)) {
                throw new Error("Jemand anderes hat den Eintrag inzwischen geändert. Bitte neu laden.");
            }
        }

        const frisch = this.zeileLesen(name, roh);
        this.rohSetzen(name, roh, typeof werte === "function" ? werte(frisch) : werte);

        const neu = this.antwortObjekt(
            await this.anfrage("dsf.dbo.UpdateObjectJson", [tabelle, JSON.stringify(roh)])
        );

        /* OFFEN (Symolo): Was liefert UpdateObjectJson zurück? Ist es kein
           Objekt, gilt das gesendete. */
        const ergebnis = this.zeileLesen(name, neu && typeof neu === "object" ? neu : roh);
        ergebnis._inzwischen = inzwischen;
        ergebnis._vorher = frisch;
        return ergebnis;
    }

    throw new Error("Unbekannte Schreibart: " + art);
},

datenAnlegen: async function (name, werte) {

    return this.schreiben("anlegen", name, null, werte);
},

/* zeile = Objekt aus datenLesen (enthält _id und geaendert_am).
   optionen.ohnePruefung: Folgeänderungen (z. B. der Lagerort, den alle
   Teile eines AB erben) prüfen nicht, ob jemand anderes geändert hat. */
datenAendern: async function (name, zeile, werte, optionen) {

    const o = optionen || {};
    return this.schreiben("aendern", name, zeile._id, werte, o.ohnePruefung ? undefined : zeile.geaendert_am, o);
},

/* Mehrere Aufgaben, je 8 gleichzeitig (nicht alle auf einmal an Symolo). */
jeAcht: async function (liste, aufgabe) {

    for (let i = 0; i < liste.length; i += 8) {
        await Promise.all(liste.slice(i, i + 8).map(x => aufgabe(x)));
    }
},

/* Viele Einträge ändern. aufgaben: [{ name, zeile, werte }].
   Folgeänderungen ohne Prüfung auf fremde Änderungen.
   OFFEN (Symolo): Gibt es ein Sammel-Update? Bis dahin einzeln. */
datenAendernViele: async function (aufgaben) {

    await this.jeAcht(aufgaben, a => this.datenAendern(a.name, a.zeile, a.werte, { ohnePruefung: true }));
},

/* Archivieren statt löschen (Ben, 16.10.2026).
   OFFEN (Symolo): Name und Typ des Archiv-Felds. Angenommen: true. */
datenArchivieren: async function (name, zeile) {

    const feld = this.tabelleInfo(name).archiv;
    if (!feld) throw new Error("Diese Liste kann nicht archiviert werden.");

    const werte = {};
    werte[feld] = true;
    return this.datenAendern(name, zeile, werte);
},


/* ===========================================================================
   RECHNEN: Status, Prozent, Fortschritt (R-S1 bis R-S7)
   Nachbau von bestand/rechnen.py (dort die Excel-Formeln). Nichts davon
   wird gespeichert, alles wird beim Anzeigen berechnet.

   Mengen werden in Tausendsteln als ganze Zahl gerechnet (21 -> 21000),
   damit 0,06 + 0,02 genau 0,08 bleibt (Mengen haben 3 Nachkommastellen).
   =========================================================================== */

/* Menge -> Tausendstel. Leer oder Text zählt 0 (Excel-Funktion N).
   OFFEN (Symolo): Kommen Zahlen als Zahl oder als Text ("21.000")?
   Wir verstehen beides; Text, der keine Zahl ist, zählt 0. */
mengeMilli: function (wert) {

    if (typeof wert === "number") return Number.isFinite(wert) ? Math.round(wert * 1000) : 0;
    if (typeof wert !== "string") return 0;

    const t = wert.trim();
    if (!/^-?\d+([.,]\d+)?$/.test(t)) return 0;

    return Math.round(Number(t.replace(",", ".")) * 1000);
},

/* Tausendstel -> Text wie Excel (deutsch): 21000 -> "21", 60 -> "0,06". */
zahlText: function (milli) {

    const minus = milli < 0 ? "-" : "";
    const m = Math.abs(milli);
    const ganz = Math.floor(m / 1000);
    const rest = m % 1000;

    if (rest === 0) return minus + ganz;
    return minus + ganz + "," + String(rest).padStart(3, "0").replace(/0+$/, "");
},

/* Soll wie in der Liste: Zahl, sonst der Text aus der Kommissionierliste. */
sollText: function (o) {

    const w = o.menge_gesamt;
    if (w === null || w === undefined || w === "") return this.text(o.menge_gesamt_text);
    return this.zahlText(this.mengeMilli(w));
},

/* Werte eines Teils (R-S1, R-S3, R-S5).
   code: 0 offen, 1 teilweise, 2 komplett */
teilWerte: function (vorhanden, soll, eingelagert, komplett) {

    const v = this.mengeMilli(vorhanden);
    const s = this.mengeMilli(soll);
    const code = v <= 0 ? 0 : (v >= s ? 2 : 1);

    let prozent = 0;
    if (code === 2) prozent = 1;
    if (code === 1) prozent = Math.min(0.99, Math.max(0.01, v / s));

    let fortschritt = this.zahlText(v) + " / " + this.zahlText(s);
    if (v > s) fortschritt += "  (+" + this.zahlText(v - s) + " zu viel)";

    return {
        status: ["Offen", "Teilweise", "Komplett"][code],
        prozent: prozent,
        fortschritt: fortschritt,
        code: code,
        ist: Math.min(Math.max(v, 0), s),
        soll: s,
        eingelagert: this.text(eingelagert),
        komplett: this.text(komplett),
        istTeil: true
    };
},

/* Werte einer BG oder eines AB direkt aus allen Teilen darunter
   (R-S2, R-S4, R-S5, R-T2). Ohne Teile ist der Status "-". */
sammelWerte: function (teile) {

    const anz = teile.length;
    const summe = teile.reduce((a, t) => a + t.code, 0);
    const anzKomplett = teile.filter(t => t.code === 2).length;

    let status = "Teilweise";
    if (anz === 0) status = "-";
    else if (summe === 2 * anz) status = "Komplett";
    else if (summe === 0) status = "Offen";

    let prozent = 0;
    if (status === "Komplett") prozent = 1;
    if (status === "Teilweise") {
        const soll = teile.reduce((a, t) => a + t.soll, 0);
        const roh = soll ? teile.reduce((a, t) => a + t.ist, 0) / soll : 0;
        prozent = Math.min(0.99, Math.max(0.01, roh));
    }

    /* Datum: frühestes Eingelagert, spätestes Komplett (nur wenn komplett).
       ISO-Text lässt sich direkt vergleichen. */
    const ein = teile.map(t => t.eingelagert).filter(Boolean).sort();
    const fertig = teile.map(t => t.komplett).filter(Boolean).sort();

    return {
        status: status,
        prozent: prozent,
        fortschritt: anzKomplett + " von " + anz,
        code: null,
        anzTeile: anz,
        anzKomplett: anzKomplett,
        eingelagert: ein.length ? ein[0] : "",
        komplett: fertig.length && status === "Komplett" ? fertig[fertig.length - 1] : "",
        istTeil: false
    };
},

/* R-S7 Sortierschlüssel: Komplett 0, Teilweise 2, sonst 4, minus Prozent. */
sortWert: function (w) {

    const basis = w.status === "Komplett" ? 0 : (w.status === "Teilweise" ? 2 : 4);
    return basis - w.prozent;
},

/* R-W1: "» entnehmen" nur bei AB/BG mit Status Komplett, nie bei Teilen. */
entnehmenMoeglich: function (w) {

    return !w.istTeil && w.status === "Komplett";
},

/* CSS-Klasse für die Statusfarbe. */
statusKlasse: function (w) {

    return { Komplett: "kom-komplett", Teilweise: "kom-teilweise", Offen: "kom-offen" }[w.status] || "kom-leer-status";
},


/* ---------------------------------------------------------------------------
   Eingaben prüfen (R-M1, R-M4) und Daten stempeln (R-T1)
   --------------------------------------------------------------------------- */

mengeMeldungen: {
    ganz: "Bitte eine ganze Zahl eintragen (0 oder mehr).",
    zahl: "Bitte eine Zahl ab 0 eintragen.",
    punkt: "Bitte ohne Punkt eintragen (1000 statt 1.000).",
    gross: "Bitte eine Zahl bis 999.999.999 eintragen."
},

/* R-M4: "1.000" oder "1,000" kann 1 oder 1000 heißen; wird nicht geraten, sondern abgelehnt. */
punktMehrdeutig: function (text) {

    return /^[1-9]\d{0,2}([.,]\d{3})+$/.test(this.text(text));
},

/* Text -> Tausendstel, mit Prüfung. Gibt { milli, fehler } zurück; leer = milli null.
   ganz: true = nur ganze Zahlen (Vorhanden, R-M1), sonst bis 3 Nachkommastellen (Soll). */
mengeEingabe: function (text, ganz) {

    const roh = this.text(text);
    const t = roh.replace(",", ".");
    const falsch = { milli: null, fehler: ganz ? this.mengeMeldungen.ganz : this.mengeMeldungen.zahl };

    if (t === "") return { milli: null, fehler: "" };
    if (this.punktMehrdeutig(roh)) return { milli: null, fehler: this.mengeMeldungen.punkt };
    if (!/^\+?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return falsch;

    const zahl = Number(t);
    if (!Number.isFinite(zahl) || zahl < 0) return falsch;
    if (ganz && !Number.isInteger(zahl)) return falsch;
    if (zahl > 999999999) return { milli: null, fehler: this.mengeMeldungen.gross };

    return { milli: Math.round(zahl * 1000), fehler: "" };
},

/* Tausendstel -> Wert zum Speichern (Zahl), leer bleibt leer.
   OFFEN (Symolo): Feldtyp der Mengen (Zahl mit 3 Nachkommastellen?). */
mengeWert: function (milli) {

    return milli === null || milli === undefined ? null : milli / 1000;
},

/* Heute als Datum im Format, das Symolo liefert ("2026-10-16T00:00:00.0000000Z").
   OFFEN (Symolo): Erwartet Symolo beim Schreiben dasselbe Format? */
heuteText: function () {

    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0") + "T00:00:00.0000000Z";
},

/* R-T1: neue Daten (Eingelagert, Komplett) eines Teils nach einer Änderung
   von Vorhanden oder Soll. Gibt [eingelagert, komplett] zurück (null = leer). */
datenStempeln: function (vorhanden, soll, eingelagert, komplett, heute) {

    const v = this.mengeMilli(vorhanden);
    const s = this.mengeMilli(soll);

    if (v <= 0) return [null, null];   /* Tippfehler korrigiert: beide leer */

    const ein = this.text(eingelagert) || heute;
    const fertig = v >= s ? (this.text(komplett) || heute) : null;
    return [ein, fertig];
},


/* ===========================================================================
   BESTAND: ABs mit Baugruppen und Teilen laden, Baum bauen, suchen,
   filtern, sortieren (R-A1 bis R-A4, R-S9)
   Nachbau von bestand/ansicht.py. Gebraucht von der Bestandsliste und
   später von Dashboard, Regal und Forecast.

   Ein Knoten im Baum:
     AB:   { art: "ab",   o: Zeile aus kom_auftrag,   w: Werte, ohne: [Teile ohne BG], bgs: [BGs] }
     BG:   { art: "bg",   o: Zeile aus kom_baugruppe, w: Werte, teile: [Teile] }
     Teil: { art: "teil", o: Zeile aus kom_teil,      w: Werte }
   Dazu je Knoten zeigen (Treffer der Suche/des Filters) und offen (aufgeklappt).
   =========================================================================== */

/* Knöpfe "ABs", "BGs", "Alles" (Ben, 14.10.2026) */
bestandAnzeigen: [["ab", "ABs"], ["bg", "BGs"], ["alles", "Alles"]],

/* R-A4: ohne Auswahl bleibt die Reihenfolge wie importiert. */
bestandSortierungen: [
    ["import", "Wie importiert"],
    ["az", "A-Z"],
    ["za", "Z-A"],
    ["auf", "Fortschritt aufsteigend"],
    ["ab", "Fortschritt absteigend"]
],

/* R-A3 Status-Filter */
bestandStatusWahl: [
    ["alle", "Alle"],
    ["offene", "Offene (Teilweise + Offen)"],
    ["teilweise", "Nur Teilweise"],
    ["offen", "Nur Offen"],
    ["komplett", "Nur Komplett"]
],

bestandStatusListe: {
    offene: ["Teilweise", "Offen"],
    teilweise: ["Teilweise"],
    offen: ["Offen"],
    komplett: ["Komplett"]
},

/* IDs nur zum Zuordnen und Sortieren, nie zur Anzeige.
   OFFEN (Symolo): ID als Zahl oder Text? Beides geht. */
idVergleich: function (a, b) {

    const x = Number(a), y = Number(b);
    if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
    return String(a) < String(b) ? -1 : (String(a) > String(b) ? 1 : 0);
},

/* Alle ABs der Bestandsliste (nicht archiviert) mit BGs und Teilen.
   Drei Abfragen; BGs und Teile in Stücken über die AB-IDs.
   abIds: nur diese ABs neu laden (nach einer Änderung).
   optionen.archiv: "nur" lädt archivierte ABs (fürs Archiv), sonst nur nicht archivierte. */
bestandLaden: async function (abIds, optionen) {

    const wo = { bereich: "bestand" };
    if (abIds) wo.id = abIds;
    const auftraege = await this.datenLesen("auftrag", { wo: wo, aufloesen: false, archiv: (optionen || {}).archiv });

    auftraege.sort((a, b) =>
        (this.mengeMilli(a.reihenfolge) - this.mengeMilli(b.reihenfolge)) || this.idVergleich(a._id, b._id));

    const ids = auftraege.map(a => a._id);
    const baugruppen = await this.datenLesenIn("baugruppe", "auftrag", ids, { sortierung: ["zeile"] });
    const teile = await this.datenLesenIn("teil", "auftrag", ids, { sortierung: ["zeile"] });

    return this.bestandBaum(auftraege, baugruppen, teile);
},

/* Baum aus den drei Listen. Reihenfolge der BGs und Teile wie importiert
   (Feld zeile). Teile ohne BG stehen vorn, wie in Excel. */
bestandBaum: function (auftraege, baugruppen, teile) {

    const nachZeile = (a, b) => (this.mengeMilli(a.zeile) - this.mengeMilli(b.zeile)) || this.idVergleich(a._id, b._id);
    const leer = v => v === null || v === undefined || v === "";

    const teileJeAb = {};
    const teileJeBg = {};

    teile.slice().sort(nachZeile).forEach(t => {
        const knoten = {
            art: "teil",
            o: t,
            w: this.teilWerte(t.vorhanden, t.menge_gesamt, t.datum_eingelagert, t.datum_komplett),
            zeigen: true
        };
        if (leer(t._baugruppe_id)) {
            (teileJeAb[String(t._auftrag_id)] = teileJeAb[String(t._auftrag_id)] || []).push(knoten);
        } else {
            (teileJeBg[String(t._baugruppe_id)] = teileJeBg[String(t._baugruppe_id)] || []).push(knoten);
        }
    });

    const bgsJeAb = {};

    baugruppen.slice().sort(nachZeile).forEach(b => {
        const unter = teileJeBg[String(b._id)] || [];
        const knoten = { art: "bg", o: b, w: this.sammelWerte(unter.map(t => t.w)), teile: unter, zeigen: true, offen: true };
        (bgsJeAb[String(b._auftrag_id)] = bgsJeAb[String(b._auftrag_id)] || []).push(knoten);
    });

    return auftraege.map(a => {
        const ohne = teileJeAb[String(a._id)] || [];
        const bgs = bgsJeAb[String(a._id)] || [];
        const alle = ohne.concat(...bgs.map(b => b.teile));

        /* Für das Protokoll: jeder Teil kennt AB-Nummer und BG-Kurzname (nur Text, kein Rückverweis). */
        ohne.forEach(t => { t.abName = this.text(a.ab_anzeige); });
        bgs.forEach(b => b.teile.forEach(t => { t.abName = this.text(a.ab_anzeige); t.bgKurz = this.text(b.o.kurz); }));
        return { art: "ab", o: a, w: this.sammelWerte(alle.map(t => t.w)), ohne: ohne, bgs: bgs, zeigen: true, offen: true };
    });
},

/* Alle Teile eines AB (ohne BG zuerst). */
bestandTeile: function (ab) {

    return ab.ohne.concat(...ab.bgs.map(b => b.teile));
},

/* Alle Zeilen eines AB in der Reihenfolge wie importiert. */
bestandZeilen: function (ab) {

    const z = [ab].concat(ab.ohne);
    ab.bgs.forEach(b => { z.push(b); z.push(...b.teile); });
    return z;
},

/* R-S9: ABs gesamt, komplett, teilweise, offen. */
bestandZaehler: function (abs) {

    return {
        ab: abs.length,
        komplett: abs.filter(a => a.w.status === "Komplett").length,
        teilweise: abs.filter(a => a.w.status === "Teilweise").length,
        offen: abs.filter(a => a.w.status === "Offen").length
    };
},

/* Ben, 14.10.2026: nach Nummer A-Z / Z-A oder nach Fortschritt;
   gleiche Werte nach AB-Nummer. "import" lässt die Reihenfolge. */
bestandSortieren: function (abs, wie) {

    const nummer = a => this.text(a.o.ab_anzeige).toLowerCase();
    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    const liste = abs.slice();

    if (wie === "az") liste.sort((a, b) => vergleich(nummer(a), nummer(b)));
    if (wie === "za") liste.sort((a, b) => vergleich(nummer(b), nummer(a)));
    if (wie === "auf") liste.sort((a, b) => (a.w.prozent - b.w.prozent) || vergleich(nummer(a), nummer(b)));
    if (wie === "ab") liste.sort((a, b) => (b.w.prozent - a.w.prozent) || vergleich(nummer(a), nummer(b)));

    return liste;
},

/* R-A1 Suche: setzt zeigen und gibt die Zahl der Treffer zurück.
   AB-Nummer -> ganzer AB; BG -> mit allen Teilen; Teil -> mit AB- und BG-Kopf.
   Gesucht wird in Zeichnungsnummer, Benennung, LK-Nummer und Lagerort. */
bestandSuchen: function (abs, begriff) {

    const q = this.text(begriff).toLowerCase();
    const trifft = o => ["zeichnungsnummer", "benennung", "lk_nummer", "lagerort"]
        .some(f => this.text(o[f]).toLowerCase().indexOf(q) > -1);
    let treffer = 0;

    abs.forEach(a => {
        const zeilen = this.bestandZeilen(a);
        zeilen.forEach(z => { z.zeigen = false; });

        if (this.text(a.o.ab_anzeige).toLowerCase().indexOf(q) > -1) {
            zeilen.forEach(z => { z.zeigen = true; });
            treffer++;
            return;
        }

        a.ohne.forEach(t => {
            if (trifft(t.o)) { t.zeigen = a.zeigen = true; treffer++; }
        });

        a.bgs.forEach(b => {
            if (trifft(b.o)) {
                b.zeigen = a.zeigen = true;
                b.teile.forEach(t => { t.zeigen = true; });
                treffer++;
            }
            b.teile.forEach(t => {
                if (trifft(t.o)) { t.zeigen = b.zeigen = a.zeigen = true; treffer++; }
            });
        });
    });

    return treffer;
},

/* R-A2/R-A3: Anzeige (Ebene) und Status der jeweiligen Zeile, mit ihren
   Kopfzeilen. Gibt die Zahl der Treffer zurück. */
bestandFiltern: function (abs, anzeige, status) {

    const stl = this.bestandStatusListe[status] || null;
    let treffer = 0;

    const passt = (z, ebene) => {
        const ok = anzeige === "ab" ? ebene === "ab" : (anzeige === "bg" ? ebene !== "teil" : true);
        return ok && (stl === null || stl.indexOf(z.w.status) > -1);
    };

    abs.forEach(a => {
        const zeilen = this.bestandZeilen(a);
        zeilen.forEach(z => { z.zeigen = false; });

        if (passt(a, "ab")) { a.zeigen = true; treffer++; }

        a.ohne.forEach(t => {
            if (passt(t, "teil")) { t.zeigen = a.zeigen = true; treffer++; }
        });

        a.bgs.forEach(b => {
            if (passt(b, "bg")) { b.zeigen = a.zeigen = true; treffer++; }
            b.teile.forEach(t => {
                if (passt(t, "teil")) { t.zeigen = b.zeigen = a.zeigen = true; treffer++; }
            });
        });

        /* Ben, 14.10.2026: bei "ABs"/"BGs" bleibt alles darunter aufklappbar. */
        if ((anzeige === "ab" || anzeige === "bg") && status === "alle" && a.zeigen) {
            zeilen.forEach(z => { z.zeigen = true; });
        }
    });

    return treffer;
},


/* ===========================================================================
   EINTRAGEN: Vorhanden, Vorhanden = Soll, alles ✓, Soll ändern
   (R-M1 bis R-M4, R-T1). Nachbau von bestand/views.py.
   Alles läuft über datenAendern (der einzige Schreibpfad). Danach lädt die
   Ansicht den AB neu; gerechnet wird beim Anzeigen (45_rechnen.js).

   Geänderte Mengen kommen ins Änderungsprotokoll (4B_protokoll.js).
   =========================================================================== */

/* Ist der gespeicherte Wert gleich der Eingabe (Tausendstel oder null)? */
mengeGleich: function (wert, milli) {

    const leer = wert === null || wert === undefined || wert === "";
    if (leer || milli === null) return leer && milli === null;
    return this.mengeMilli(wert) === milli;
},

/* Vorhanden eines Teils setzen und R-T1 anwenden. Die letzte Eingabe gilt;
   hat jemand anderes inzwischen einen anderen Wert gespeichert, gibt es
   einen Hinweis (ohne Namen, Betriebsrat/W7). Gibt den Hinweis zurück. */
vorhandenSetzen: async function (teil, milli) {

    const neu = await this.datenAendern("teil", teil.o, frisch => {
        const [ein, fertig] = this.datenStempeln(this.mengeWert(milli), frisch.menge_gesamt,
            frisch.datum_eingelagert, frisch.datum_komplett, this.heuteText());
        return { vorhanden: this.mengeWert(milli), datum_eingelagert: ein, datum_komplett: fertig };
    }, { trotzdem: true });

    const alt = neu._vorher.vorhanden;
    const altText = this.protokollMenge(alt);

    if (!this.mengeGleich(alt, milli)) {
        await this.protokollSchreiben("menge", teil.abName, this.protokollTeil(teil), altText, this.protokollMenge(this.mengeWert(milli)));
    }

    if (neu._inzwischen && !this.mengeGleich(alt, milli)) {
        return "Achtung: " + this.text(teil.o.zeichnungsnummer) + " wurde inzwischen von jemand anderem geändert (zuletzt " +
            altText + "). Dein Wert gilt jetzt.";
    }
    return "";
},

/* R-M2: Status eines Teils antippen. Komplett -> 0, sonst Vorhanden = Soll. */
teilUmschalten: async function (teil) {

    const soll = teil.o.menge_gesamt;
    if (soll === null || soll === undefined || soll === "") return "";

    return this.vorhandenSetzen(teil, teil.w.code === 2 ? 0 : this.mengeMilli(soll));
},

/* R-M3: alles ✓ an AB oder BG. Nicht komplett -> alle Teile auf Soll
   (größere Mengen bleiben); komplett -> alle auf 0. */
allesSetzen: async function (knoten) {

    const teile = knoten.art === "ab" ? this.bestandTeile(knoten) : knoten.teile;
    const komplett = teile.length > 0 && knoten.w.status === "Komplett";

    const zuSetzen = [];
    teile.forEach(t => {
        const soll = t.o.menge_gesamt;
        const hatSoll = !(soll === null || soll === undefined || soll === "");
        const v = t.o.vorhanden;
        const leer = v === null || v === undefined || v === "";

        if (komplett) zuSetzen.push([t, 0]);
        else if (hatSoll && (leer || this.mengeMilli(v) < this.mengeMilli(soll))) zuSetzen.push([t, this.mengeMilli(soll)]);
    });

    await this.jeAcht(zuSetzen, ([t, milli]) => this.vorhandenSetzen(t, milli));
    return zuSetzen.length;
},

/* AB bearbeiten: Soll der Teile ändern. neu: [[teil, milli|null]].
   Nur geänderte Teile werden geschrieben; R-T1 läuft danach. */
sollSetzen: async function (neu) {

    const geaendert = neu.filter(([t, milli]) => !this.mengeGleich(t.o.menge_gesamt, milli));

    await this.jeAcht(geaendert, async ([t, milli]) => {
        const alt = this.sollText(t.o) || "leer";

        await this.datenAendern("teil", t.o, frisch => {
            const [ein, fertig] = this.datenStempeln(frisch.vorhanden, this.mengeWert(milli),
                frisch.datum_eingelagert, frisch.datum_komplett, this.heuteText());
            return { menge_gesamt: this.mengeWert(milli), menge_gesamt_text: "", datum_eingelagert: ein, datum_komplett: fertig };
        }, { ohnePruefung: true });

        await this.protokollSchreiben("soll", t.abName, this.protokollTeil(t), alt, this.protokollMenge(this.mengeWert(milli)));
    });

    return geaendert.length;
},


/* ===========================================================================
   LAGERORT UND REGAL (R-L1 bis R-L4, R-R1 bis R-R5)
   Nachbau von bestand/lagerort.py. Abweichungen von Excel wie dort:
   X1 ABs ohne Baugruppe erscheinen im Regal; X2 R3-Kurzformen werden "R3";
   X3 beim Abgleich (siehe abgleichen).
   Geschrieben wird über datenAendernViele (Folgeänderungen ohne Prüfung,
   wie bisher). Danach lädt die Ansicht den AB neu.
   =========================================================================== */

/* R-L4: gültige Plätze, Etage 6 oben … 1 unten, links L, rechts R */
regalEtagen: [6, 5, 4, 3, 2, 1],
regalPlaetze: ["L6", "R6", "L5", "R5", "L4", "R4", "L3", "R3", "L2", "R2", "L1", "R1"],
regalR3Name: "Sperrlager / Teile zum Vermessen",
regalR3Aliase: ["R3S", "R3-S", "R3V", "R3-V", "SPERRLAGER", "SPERR", "VERMESSEN"],

/* Vergleichsform: Großbuchstaben, ohne Leerzeichen. */
platzKern: function (text) {

    return this.text(text).split(/\s+/).join("").toUpperCase();
},

/* Gültiger Platz oder R3-Kurzform -> "L2", "R3"; sonst der Text groß. */
platzNorm: function (text) {

    const k = this.platzKern(text);
    if (this.regalR3Aliase.indexOf(k) > -1) return "R3";
    if (this.regalPlaetze.indexOf(k) > -1) return k;
    return this.text(text).split(/\s+/).filter(Boolean).join(" ").toUpperCase();
},

platzGueltig: function (text) {

    return this.regalPlaetze.indexOf(this.platzNorm(text)) > -1;
},

/* Was gespeichert wird: leer (bei "", "0", "-"), ein gültiger Platz
   ("l 2" -> "L2", "SPERR" -> "R3") oder der freie Text. Zu lang -> Fehler. */
platzEingabe: function (text) {

    const t = this.text(text).split(/\s+/).filter(Boolean).join(" ");
    if (t === "" || t === "0" || t === "-") return "";
    if (t.length > 40) throw new Error("Der Lagerort ist zu lang (höchstens 40 Zeichen).");
    return this.platzGueltig(t) ? this.platzNorm(t) : t;
},

/* Platz zum Vergleichen: normiert, leer bleibt leer. */
platzVon: function (o) {

    return this.text(o.lagerort) ? this.platzNorm(o.lagerort) : "";
},

/* Mehrere Knoten ändern und die Werte auch im Baum eintragen. */
knotenSetzen: async function (aufgaben) {

    await this.datenAendernViele(aufgaben.map(a => ({ name: a.name, zeile: a.knoten.o, werte: a.werte })));
    aufgaben.forEach(a => Object.assign(a.knoten.o, a.werte));
},

/* Lagerort an einem Knoten und an allen Teilen darunter (nur wo er anders ist). */
platzAufgaben: function (name, knoten, teile, p) {

    const liste = [];
    if (this.text(knoten.o.lagerort) !== p) liste.push({ name: name, knoten: knoten, werte: { lagerort: p } });
    teile.forEach(t => {
        if (this.text(t.o.lagerort) !== p) liste.push({ name: "teil", knoten: t, werte: { lagerort: p } });
    });
    return liste;
},

/* R-L2: Platz am AB -> alle BGs und alle Teile bekommen ihn; leer leert alle.
   Ein aufgesplitteter AB bleibt aufgesplittet. Gibt den Platz zurück. */
lagerortAb: async function (ab, text, ohneProtokoll) {

    const p = this.platzEingabe(text);
    const alt = this.platzVon(ab.o);
    let aufgaben = this.platzAufgaben("auftrag", ab, ab.ohne, p);
    ab.bgs.forEach(b => { aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, p)); });

    await this.knotenSetzen(aufgaben);

    if (!ohneProtokoll && alt !== p) {
        await this.protokollSchreiben("lagerort", ab.o.ab_anzeige, "", alt || "leer", p || "leer");
    }
    return p;
},

/* R-L2: Platz an der BG -> alle Teile der BG; danach R-L3 (außer der AB ist
   aufgesplittet). imRegal: eine BG einzeln verschieben splittet den AB auf. */
lagerortBg: async function (ab, bg, text, imRegal) {

    const p = this.platzEingabe(text);
    const alt = this.platzVon(bg.o);

    if (imRegal && ab.bgs.length > 1 && !this.istJa(ab.o.regal_geteilt)) await this.regalTeilenOhneProtokoll(ab);

    await this.knotenSetzen(this.platzAufgaben("baugruppe", bg, bg.teile, p));

    if (!this.istJa(ab.o.regal_geteilt)) await this.abgleichen(ab);

    if (alt !== p) {
        await this.protokollSchreiben("lagerort", ab.o.ab_anzeige, "BG " + this.text(bg.o.name), alt || "leer", p || "leer");
    }
    return p;
},

/* R-L3 (ABAbgleichen):
   - alle BGs haben denselben Platz, keine ist leer -> AB bekommt ihn;
   - ein Platz, Rest leer, AB leer oder gleich -> nichts ändern;
   - sonst (verschiedene Plätze, oder X3: ein Platz, Rest leer, AB hat einen
     anderen) -> BGs ohne Platz bekommen den bisherigen AB-Platz, der AB wird leer.
   Teile ohne BG bleiben wie in Excel unberührt. */
abgleichen: async function (ab) {

    const belegt = ab.bgs.filter(b => this.text(b.o.lagerort)).map(b => this.platzVon(b.o));
    const leere = ab.bgs.filter(b => !this.text(b.o.lagerort));
    if (belegt.length === 0) return false;

    const erster = belegt[0];
    const verschieden = belegt.some(p => p !== erster);
    const alt = this.platzVon(ab.o);

    if (!verschieden && leere.length === 0) {
        if (alt === erster) return false;
        await this.knotenSetzen([{ name: "auftrag", knoten: ab, werte: { lagerort: erster } }]);
        return true;
    }
    if (!verschieden && (alt === "" || alt === erster)) return false;
    if (!alt) return false;

    const abPlatz = this.text(ab.o.lagerort);
    let aufgaben = [];
    leere.forEach(b => { aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, abPlatz)); });
    aufgaben.push({ name: "auftrag", knoten: ab, werte: { lagerort: "" } });
    await this.knotenSetzen(aufgaben);
    return true;
},

/* Regal: AB in seine Baugruppen aufsplitten (mindestens zwei, Ben 15.10.).
   Jede BG ohne eigenen Platz bekommt den bisherigen AB-Platz ausdrücklich. */
regalTeilen: async function (ab) {

    await this.regalTeilenOhneProtokoll(ab);
    await this.protokollSchreiben("lagerort", ab.o.ab_anzeige, "Regal", "AB", "Baugruppen einzeln");
},

/* Wie regalTeilen, aber ohne Eintrag: wer eine BG einzeln verschiebt, trägt
   nur diesen Platzwechsel ein. */
regalTeilenOhneProtokoll: async function (ab) {

    if (ab.bgs.length < 2) throw new Error("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");

    const p = this.platzVon(ab.o);
    let aufgaben = [];
    if (p) {
        ab.bgs.forEach(b => {
            if (!this.text(b.o.lagerort)) aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, p));
        });
    }
    aufgaben.push({ name: "auftrag", knoten: ab, werte: { regal_geteilt: true } });
    await this.knotenSetzen(aufgaben);
},

/* Liegen alle Baugruppen (mindestens zwei) am selben Platz? (Rückfrage im Regal) */
alleBgsGleich: function (ab) {

    const plaetze = new Set(ab.bgs.map(b => this.platzVon(b.o)));
    return ab.bgs.length > 1 && plaetze.size === 1;
},

/* Regal: der ganze AB kommt dorthin, wo die gewählte Baugruppe liegt
   (leer = nicht einsortiert), als ein Eintrag. */
regalZusammenfuehren: async function (ab, bg) {

    let p = this.platzVon(bg.o);
    if (!p) p = this.istJa(ab.o.regal_geteilt) || !this.text(ab.o.lagerort) ? "" : this.platzVon(ab.o);

    await this.lagerortAb(ab, p, true);
    await this.knotenSetzen([{ name: "auftrag", knoten: ab, werte: { regal_geteilt: false } }]);
    await this.protokollSchreiben("lagerort", ab.o.ab_anzeige, "Regal", "Baugruppen einzeln", "AB zusammen (" + (p || "kein Platz") + ")");
    return p;
},

/* Regal (R-R1 bis R-R4): Einträge je Platz und die Listen darunter.
   Je AB: Platz einer BG = eigener Platz, sonst der des AB. Alle BGs am selben
   Platz und keine ohne -> ein Eintrag "AB…" mit AB-Status, sonst je BG und
   Platz ein Eintrag "AB…_BGnnn". X1: AB ohne BG steht mit eigenem Platz da. */
regalEintraege: function (abs) {

    const einsortiert = [], nicht = [];
    const eintrag = (name, platz, w, ab, bg) => ({ name: name, platz: platz, w: w, ab: ab, bg: bg || null });

    abs.forEach(a => {
        const abPlatz = this.platzVon(a.o);
        const name = this.text(a.o.ab_anzeige);
        const geteilt = this.istJa(a.o.regal_geteilt) && a.bgs.length > 0;

        if (a.bgs.length === 0) {
            (abPlatz ? einsortiert : nicht).push(eintrag(name, abPlatz, a.w, a));
            return;
        }

        const jeBg = a.bgs.map(b => [b, this.platzVon(b.o) || (geteilt ? "" : abPlatz)]);
        const mit = new Set(jeBg.filter(([, p]) => p).map(([, p]) => p));
        const ohne = jeBg.filter(([, p]) => !p);

        if (mit.size === 0 && !geteilt) {
            nicht.push(eintrag(name, "", a.w, a));
            return;
        }
        if (mit.size === 1 && ohne.length === 0 && !geteilt) {
            einsortiert.push(eintrag(name, [...mit][0], a.w, a));
            return;
        }

        const gesehen = new Set();
        jeBg.forEach(([b, p]) => {
            const bgName = name + "_BG" + this.text(b.o.kurz);
            if (p && !gesehen.has(bgName + "|" + p)) {
                gesehen.add(bgName + "|" + p);
                einsortiert.push(eintrag(bgName, p, b.w, a, b));
            } else if (!p) {
                nicht.push(eintrag(bgName, "", b.w, a, b));
            }
        });
    });

    const sortiert = l => l.slice().sort((x, y) => {
        const a = x.name.toLowerCase(), b = y.name.toLowerCase();
        return a < b ? -1 : (a > b ? 1 : (x.platz < y.platz ? -1 : (x.platz > y.platz ? 1 : 0)));
    });
    const eins = sortiert(einsortiert);
    const faecher = {};
    this.regalPlaetze.forEach(p => { faecher[p] = eins.filter(e => e.platz === p); });

    return {
        faecher: faecher,
        einsortiert: eins,
        nicht: sortiert(nicht),
        ungueltig: eins.filter(e => this.regalPlaetze.indexOf(e.platz) < 0)
    };
},


/* ===========================================================================
   DASHBOARD-LOGIK (R-DB1 bis R-DB6)
   Nachbau von bestand/dashboard.py: sortiert wie die Excel-Formel DASH,
   filtert, zählt den Kopf und bestimmt den Klappzustand. Die Werte (Status,
   Prozent, Stand) kommen aus 45_rechnen.js und 47_bestand.js.
   Gebraucht vom Dashboard, später vom Forecast.
   =========================================================================== */

/* R-DB2: wie weit aufgeklappt wird (Knöpfe ABs, BGs, Alles) */
dashAnsichten: [["ab", "ABs"], ["bg", "BGs"], ["alles", "Alles"]],
dashStandard: "bg",
dashAlleKunden: "Alle",

/* Fortschritt nach Ben (14.10.2026): absteigend ist der Standard. */
dashSortierungen: [["ab", "Absteigend"], ["auf", "Aufsteigend"]],

/* Textvergleich wie Excel: ohne Groß-/Kleinschreibung. */
dashText: function (wert) {

    return this.text(wert).toLowerCase();
},

/* Fortschritt % wie das Excel-Format "0 %": ganze Zahl, kaufmännisch
   gerundet (0,3743 -> "37 %", 0,125 -> "13 %"). */
prozentText: function (p) {

    const x = Math.round(p * 100 * 1e9) / 1e9;
    return Math.floor(x + 0.5) + " %";
},

/* Wie Python round(): bei genau .5 zur geraden Zahl (für die Anteile im Kopf). */
rundenGerade: function (x) {

    const f = Math.floor(x);
    const d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
},

/* R-DB3: 1. Sortierschlüssel des AB (R-S7), 2. AB-Nummer, 3. AB-Zeile vor
   dem Rest, 4. Schlüssel der BG, 5. BG-Name, 6. BG-Zeile vor ihren Teilen,
   7. Schlüssel des Teils, 8. Zeichnungsnummer.
   Teile ohne BG stehen vor allen BGs (Excel: BG-Schlüssel -9).
   nachProzent: "ab" oder "auf" sortiert die ABs nach Fortschritt, ohne
   Angabe gilt die Excel-Reihenfolge.
   Ergebnis je AB: { a, gruppen: [{ bg, teile, schluessel, offen }], offen } */
dashSortieren: function (abs, nachProzent) {

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    const teileSortiert = teile => teile.slice().sort((p, q) =>
        vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
        vergleich(this.dashText(p.o.zeichnungsnummer), this.dashText(q.o.zeichnungsnummer)));

    let reihenfolge;
    if (nachProzent === "ab" || nachProzent === "auf") {
        const vorzeichen = nachProzent === "ab" ? -1 : 1;
        reihenfolge = abs.slice().sort((p, q) =>
            vergleich(vorzeichen * p.w.prozent, vorzeichen * q.w.prozent) ||
            vergleich(this.dashText(p.o.ab_anzeige), this.dashText(q.o.ab_anzeige)));
    } else {
        reihenfolge = abs.slice().sort((p, q) =>
            vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
            vergleich(this.dashText(p.o.ab_anzeige), this.dashText(q.o.ab_anzeige)));
    }

    return reihenfolge.map(a => {
        const schluessel = this.dashText(a.o.ab_schluessel);
        const d = { a: a, schluessel: schluessel, gruppen: [], offen: false };

        if (a.ohne.length) {
            d.gruppen.push({ bg: null, teile: teileSortiert(a.ohne), schluessel: schluessel + "|", offen: false });
        }

        a.bgs.slice().sort((p, q) =>
            vergleich(this.sortWert(p.w), this.sortWert(q.w)) ||
            vergleich(this.dashText(p.o.name), this.dashText(q.o.name))
        ).forEach(b => {
            d.gruppen.push({ bg: b, teile: teileSortiert(b.teile), schluessel: schluessel + "|" + this.dashText(b.o.name), offen: false });
        });

        return d;
    });
},

/* R-DB2: "Alle" + alphabetische Liste aller Kunden (ohne doppelte, ohne leere). */
dashKunden: function (abs) {

    const je = {};
    abs.forEach(a => {
        const k = this.text(a.o.kunde);
        if (k && !(k.toLowerCase() in je)) je[k.toLowerCase()] = k;
    });
    return [this.dashAlleKunden].concat(Object.keys(je).sort().map(k => je[k]));
},

/* R-DB2: AB-Suche (Teilwort in der AB-Nummer) und Kunde (Alle = alle). */
dashFiltern: function (abs, suche, kunde) {

    const q = this.dashText(suche);
    let kd = this.dashText(kunde);
    if (kd === this.dashText(this.dashAlleKunden)) kd = "";

    return abs.filter(a => this.dashText(a.o.ab_anzeige).indexOf(q) > -1 && (!kd || this.dashText(a.o.kunde) === kd));
},

/* R-DB5: Aufträge, komplett, teilweise, offen und Gesamt-% (R-S6) über alle
   ABs, unabhängig vom Filter. */
dashKopf: function (abs) {

    const teile = [];
    abs.forEach(a => this.bestandTeile(a).forEach(t => teile.push(t.w)));

    const soll = teile.reduce((s, t) => s + t.soll, 0);
    const gesamt = soll ? teile.reduce((s, t) => s + t.ist, 0) / soll : 0;
    const n = abs.length;
    const z = { ab: n };

    ["Komplett", "Teilweise", "Offen"].forEach(st => {
        const schluessel = st.toLowerCase();
        z[schluessel] = abs.filter(a => a.w.status === st).length;
        z[schluessel + "_anteil"] = n ? this.rundenGerade(z[schluessel] / n * 100) : 0;
    });

    z.gesamt = gesamt;
    z.gesamt_txt = (gesamt * 100).toFixed(1).replace(".", ",") + " %";
    return z;
},

/* R-DB4: Startzustand aus der Ansicht (ABs: alles zu; BGs: ABs auf; Alles:
   alles auf), davon abweichend, was der Benutzer bei dieser Ansicht selbst
   auf- oder zugeklappt hat (gemerkt: Schlüssel -> offen). */
dashKlappen: function (liste, ansichtWert, gemerkt) {

    const stufe = { ab: 1, bg: 2, alles: 3 }[ansichtWert] || 2;
    const wert = (schluessel, standard) => (schluessel in gemerkt ? Boolean(gemerkt[schluessel]) : standard);

    liste.forEach(d => {
        d.offen = wert(d.schluessel, stufe >= 2);
        d.gruppen.forEach(g => { g.offen = wert(g.schluessel, stufe === 3); });
    });
},


/* ===========================================================================
   ÄNDERUNGSPROTOKOLL (W7)
   Nachbau von bestand/protokoll.py: wer hat wann welche Menge, welchen
   Platz, welches Soll geändert; Archivieren, Wiederherstellen, Import.

   Betriebsrat/Datenschutz sind noch offen (Übergabe 7.3). Darum lässt sich
   das Protokoll abschalten, ohne Namen führen und zeitlich begrenzen. Die
   Einstellungen stehen in der Tabelle "einstellung" (Name/Wert).

   Geschrieben wird immer über datenAnlegen (der einzige Schreibpfad). Ein
   Fehler im Protokoll darf die eigentliche Änderung nie verhindern: er
   steht als Hinweis oben im Fenster.

   Gelöscht wird nie (Ben, 16.10.2026): "Aufbewahren" und "Leeren" blenden
   Einträge aus (archiviert). Endgültig löschen kann nur die IT in der
   Datenbank. OFFEN (Symolo): Soll das Protokoll hier eine Ausnahme sein?
   Namen entfernen geht dagegen wirklich (die Namen werden überschrieben).

   OFFEN (Symolo): Wer ist angemeldet (Name)? Bis dahin steht kein Name
   drin. Symolo selbst führt Person und Zeit in den Standardfeldern
   (iuser, idate, uuser, udate) jeder Zeile.
   =========================================================================== */

protokollArten: [
    ["menge", "Vorhanden"],
    ["lagerort", "Lagerort"],
    ["soll", "Soll"],
    ["import", "Import"],
    ["ersetzt", "Ersetzt (Import)"],
    ["archiviert", "Archiviert"],
    ["wiederhergestellt", "Wiederhergestellt"],
    ["forecast", "Forecast importiert"],
    ["entnommen", "Entnommen (Schweißen)"],
    ["zurueck", "Zurück in Bestandsliste"],
    ["schweissen", "Zuweisung Schweißen"]
],

protokollEinst: null,
protokollSeite: 100,

/* Jetzt, als UTC im Format von Symolo ("2026-10-16T13:20:33.1230000Z"). */
zeitJetzt: function () {

    return new Date().toISOString().replace("Z", "0000Z");
},

/* "2026-10-16T13:20:33.0000000Z" -> Millisekunden (UTC); null, wenn es keine Zeit ist.
   Reine Datumsangaben zählen als 0 Uhr UTC. */
zeitMs: function (wert) {

    const m = this.text(wert).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;

    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
},

/* Zeit in der Ortszeit des Browsers: "16.10.2026 15:20" (mitSekunden: "… 15:20:33").
   Fehlt die Uhrzeit, bleibt es beim Datum. */
zeitOrtText: function (wert, mitSekunden) {

    const ms = this.zeitMs(wert);
    if (ms === null) return this.text(wert);
    if (!/[T ]\d{2}:/.test(this.text(wert))) return this.datumText(wert);

    const d = new Date(ms);
    const z = n => String(n).padStart(2, "0");
    return z(d.getDate()) + "." + z(d.getMonth() + 1) + "." + d.getFullYear() + " " +
        z(d.getHours()) + ":" + z(d.getMinutes()) + (mitSekunden ? ":" + z(d.getSeconds()) : "");
},

/* Einstellungen laden (einmal je Fenster, neuLaden = erzwingen).
   Ohne Eintrag gilt: an, mit Namen, 90 Tage. */
protokollEinstellung: async function (neuLaden) {

    if (this.protokollEinst && !neuLaden) return this.protokollEinst;

    const zeilen = await this.datenLesen("einstellung", { aufloesen: false });
    const e = { aktiv: true, namen: true, tage: 90, zeilen: {} };
    zeilen.forEach(z => { e.zeilen[this.text(z.name)] = z; });

    const wert = n => (n in e.zeilen ? this.text(e.zeilen[n].wert) : null);
    if (wert("protokoll_aktiv") !== null) e.aktiv = wert("protokoll_aktiv") === "1";
    if (wert("protokoll_namen") !== null) e.namen = wert("protokoll_namen") === "1";
    if (wert("protokoll_tage") !== null && /^\d+$/.test(wert("protokoll_tage"))) e.tage = Number(wert("protokoll_tage"));

    this.protokollEinst = e;
    return e;
},

/* Einstellungen speichern. tage: 0 bis 3650 (0 = unbegrenzt). */
protokollEinstellen: async function (aktiv, namen, tage) {

    const e = await this.protokollEinstellung(true);
    const paare = [
        ["protokoll_aktiv", aktiv ? "1" : "0"],
        ["protokoll_namen", namen ? "1" : "0"],
        ["protokoll_tage", String(tage)]
    ];

    for (const [name, wert] of paare) {
        const zeile = e.zeilen[name];
        if (zeile) await this.datenAendern("einstellung", zeile, { wert: wert });
        else await this.datenAnlegen("einstellung", { name: name, wert: wert });
    }

    this.protokollEinst = null;
    return this.protokollEinstellung(true);
},

/* Einen Eintrag schreiben, wenn das Protokoll an ist. Namen nur, wenn
   eingeschaltet. Gibt true zurück, wenn geschrieben wurde. */
protokollSchreiben: async function (art, ab, objekt, alt, neu) {

    const kurz = (t, n) => this.text(t).slice(0, n);

    try {
        const e = await this.protokollEinstellung();
        if (!e.aktiv) return false;

        await this.datenAnlegen("aenderung", {
            zeit: this.zeitJetzt(),
            art: art,
            ab: kurz(ab, 80),
            objekt: kurz(objekt, 400),
            alt: kurz(alt, 200),
            neu: kurz(neu, 200),
            benutzer_name: e.namen ? kurz(this.benutzer().name, 150) : "",
            archiviert: false
        });
        return true;
    } catch (fehler) {
        console.warn("Protokoll:", fehler);
        const hinweis = "Protokoll konnte nicht geschrieben werden";
        if (this.datenHinweise.indexOf(hinweis) < 0) this.datenHinweise.push(hinweis);
        if (this.infoZeigen) this.infoZeigen();
        return false;
    }
},

/* Alle sichtbaren Einträge, neueste zuerst. */
protokollLesen: async function () {

    const liste = await this.datenLesen("aenderung", { aufloesen: false });
    liste.sort((a, b) => ((this.zeitMs(b.zeit) || 0) - (this.zeitMs(a.zeit) || 0)) || this.idVergleich(b._id, a._id));
    return liste;
},

/* Teil im Protokoll: "Teil SK1990-977452.002.0 (BG 100)". Der Teil-Knoten
   kennt AB-Name und BG-Kurzname (47_bestand.js). */
protokollTeil: function (t) {

    const bg = t.bgKurz === undefined ? "" : " (BG " + t.bgKurz + ")";
    return "Teil " + (this.text(t.o.zeichnungsnummer) || "(ohne Nr.)") + bg;
},

/* Menge fürs Protokoll: Zahl wie in der Liste, leer = "leer". */
protokollMenge: function (wert) {

    return this.mengeGleich(wert, null) ? "leer" : this.zahlText(this.mengeMilli(wert));
},

/* Suche (AB oder Zeile, ohne Groß-/Kleinschreibung), Art und Person. */
protokollFiltern: function (liste, suche, art, wer) {

    const q = this.text(suche).toLowerCase();

    return liste.filter(z =>
        (!q || this.text(z.ab).toLowerCase().indexOf(q) > -1 || this.text(z.objekt).toLowerCase().indexOf(q) > -1) &&
        (!art || this.text(z.art) === art) &&
        (!wer || this.text(z.benutzer_name) === wer));
},

/* Namen aller Personen im Protokoll, alphabetisch. */
protokollNamen: function (liste) {

    const je = {};
    liste.forEach(z => { if (this.text(z.benutzer_name)) je[this.text(z.benutzer_name)] = true; });
    return Object.keys(je).sort();
},

/* Alte Einträge ausblenden (älter als tage; 0 = nichts tun). Gibt die Zahl zurück. */
protokollAufraeumen: async function (liste, tage) {

    if (!tage) return 0;

    const grenze = Date.now() - tage * 86400000;
    const alt = liste.filter(z => (this.zeitMs(z.zeit) || 0) < grenze);

    await this.jeAcht(alt, z => this.datenAendern("aenderung", z, { archiviert: true }, { ohnePruefung: true }));
    return alt.length;
},

/* Alle sichtbaren Einträge ausblenden. */
protokollLeeren: async function (liste) {

    await this.jeAcht(liste, z => this.datenAendern("aenderung", z, { archiviert: true }, { ohnePruefung: true }));
    return liste.length;
},

/* Namen aus allen Einträgen entfernen (wenn "Namen speichern" ausgeschaltet
   wird), auch aus den ausgeblendeten. Gibt die Zahl zurück. */
protokollNamenEntfernen: async function () {

    const alle = await this.datenLesen("aenderung", { archiv: "alle", aufloesen: false });
    const mit = alle.filter(z => this.text(z.benutzer_name));

    await this.jeAcht(mit, z => this.datenAendern("aenderung", z, { benutzer_name: "" }, { ohnePruefung: true }));
    return mit.length;
},


/* ===========================================================================
   AB-NUMMERN (R-AB1 bis R-AB5)
   Nachbau von bestand/ab_nummer.py, Zeichen für Zeichen (VBA: ABForm,
   Ziffern, LosNr, ABSchluessel, FcSchluessel). Gebraucht beim AB archivieren
   (Eingabe finden) und später beim Import.
   =========================================================================== */

/* Führendes "AB" (beliebige Schreibweise) samt Leerzeichen entfernen. */
abOhneAb: function (s) {

    return s.slice(0, 2).toUpperCase() === "AB" ? s.slice(2).replace(/^ +/, "") : s;
},

/* Nur Leerzeichen am Rand weg (wie Python strip(" ")). */
abRand: function (t) {

    return this.text(t).replace(/^ +| +$/g, "");
},

/* Führende Ziffern: "123456 L1" -> "123456". */
abZiffern: function (s) {

    return s.match(/^[0-9]*/)[0];
},

/* R-AB2: Losnummer aus dem Los-Teil (" L1", "/ Los 1", "Los01" -> "1"); "" = kein Los. */
abLosNr: function (rest) {

    let k = rest.toUpperCase().replace(/[ \/\-.]/g, "");

    if (k.indexOf("LOS") === 0) k = k.slice(3);
    else if (k.indexOf("L") === 0) k = k.slice(1);
    else return "";

    if (!k || !/^[0-9]+$/.test(k)) return "";
    return k.replace(/^0+/, "") || "0";
},

/* R-AB1 Anzeigeform: "123456" -> "AB123456", "Ab123456 / Los 2" -> "AB123456 / Los 2". */
abForm: function (eingabe) {

    const t = this.abRand(eingabe).replace(/ {2,}/g, " ");
    const s = this.abOhneAb(t);
    const d = this.abZiffern(s);
    if (!d) return t;

    const rest = s.slice(d.length);
    if (rest === "") return "AB" + d;
    if (rest.charAt(0) === " " || rest.charAt(0) === "/" || this.abLosNr(rest)) return "AB" + d + rest;
    return t;
},

/* R-AB3 Vergleichsschlüssel: "AB123456 L1", "123456 / Los 1" -> "AB123456|L1". */
abSchluessel: function (eingabe) {

    const s = this.abOhneAb(this.abRand(eingabe));
    const d = this.abZiffern(s);
    if (!d) return s.replace(/ /g, "").toUpperCase();

    const rest = s.slice(d.length);
    if (rest.replace(/^ +| +$/g, "") === "") return "AB" + d;

    const los = this.abLosNr(rest);
    if (los) return "AB" + d + "|L" + los;
    return "AB" + d + "|" + rest.replace(/ /g, "").toUpperCase();
},

/* R-AB5 Forecast-Schlüssel ohne Los: "AB2515204 L1" -> "AB2515204"; ohne Ziffern "". */
abForecastSchluessel: function (eingabe) {

    const s = this.abRand(eingabe);
    if (!s) return "";

    const d = this.abZiffern(this.abOhneAb(s));
    return d ? "AB" + d : "";
},

/* R-AB4 (AB finden): erst die Anzeigeform, dann über den Schlüssel die
   vorhandene Schreibweise. abs = Liste der ABs der Bestandsliste.
   "2515204" -> AB2515204, "AB2616200 Los1" -> "AB2616200 / Los 1". null = nicht da. */
abFinden: function (abs, eingabe) {

    const ab = this.abForm(eingabe);
    if (!ab) return null;

    const schluessel = this.abSchluessel(ab);
    return abs.find(a => this.text(a.o.ab_anzeige) === ab) ||
        abs.find(a => this.text(a.o.ab_schluessel) === schluessel) || null;
},


/* ===========================================================================
   ARCHIV (R-X1 bis R-X3)
   Nachbau von bestand/archiv.py. Ben (16.10.2026): Archivieren statt
   Löschen. Der AB bleibt mit allen BGs und Teilen in der Datenbank stehen
   und trägt nur die Markierung "archiviert" (Tabelle auftrag):
     archiviert, archiviert_am, archiv_herkunft, archiv_status.
   Das ersetzt die Kopie in die Archivtabelle: Wiederherstellen ist die
   Markierung wieder zu entfernen (kein Zurückbauen aus flachen Zeilen).

   Archiviert werden zwei Arten von ABs:
   - aus der Bestandsliste (Herkunft "Archiviert aus Bestandsliste"): BGs und
     Teile liegen in den Tabellen baugruppe und teil;
   - aus dem Schweißen (Herkunft "Archiviert aus Schweißen", Phase 6): die
     Zeilen liegen in der Tabelle schweisszeile (archiviert = ja).
   R-X2: Das Archiv zeigt je Zeile (AB, BG, Teil) die 28 Spalten wie das
   Excel-Blatt (ArchivKopf), hier aus diesen Tabellen zusammengesetzt.

   Planungshäkchen (Phase 5): archivierte ABs stehen nicht in der Planung,
   das Häkchen bleibt aber in der Tabelle (Django löschte es mit dem AB).
   =========================================================================== */

archivHerkunftBestand: "Archiviert aus Bestandsliste",
archivHerkunftSchweissen: "Archiviert aus Schweißen",
archivOhneBg: "(ohne BG)",
archivSeite: 50,

/* R-X2 / ArchivKopf: (Spaltenname wie Excel, Feld der Zeile) */
archivKopf: [
    ["AB", "ab"],
    ["Zeichnungsnummer", "zeichnungsnummer"],
    ["Benennung", "benennung"],
    ["Menge / BG", "menge_bg"],
    ["Menge Gesamt", "menge_gesamt"],
    ["Index", "index"],
    ["LK Nummer", "lk_nummer"],
    ["Arbeitsgang", "arbeitsgang"],
    ["Material", "material"],
    ["Profil", "profil"],
    ["Abmaße", "abmasse"],
    ["Vorhanden", "vorhanden"],
    ["Bemerkung", "bemerkung"],
    ["Status", "status"],
    ["Fortschritt", "fortschritt"],
    ["Ebene", "ebene"],
    ["Baugruppe", "baugruppe"],
    ["Gelöscht am", "geloescht_am"],
    ["Eingelagert", "eingelagert"],
    ["Komplett", "komplett"],
    ["DLZ", "dlz"],
    ["Lagerort", "lagerort"],
    ["Zuweisung Mitarbeiter", "mitarbeiter"],
    ["Zuweisung Arbeitsplatz", "arbeitsplatz"],
    ["Entnommen", "entnommen"],
    ["Liefertermin Stahlbau", "liefertermin_stahlbau"],
    ["Termin Versand", "termin_versand"],
    ["Herkunft", "herkunft"]
],

/* Spalten, die als Datum bzw. Zahl angezeigt werden. */
archivDatumFelder: ["eingelagert", "komplett", "entnommen", "liefertermin_stahlbau", "termin_versand"],
archivZahlFelder: ["menge_gesamt", "vorhanden", "dlz"],

/* Kopfdaten in der AB-Zeile (R-D2, wie ImportiereBlatt): Feld der Zeile -> [Vorsatz, Feld im AB] */
archivKopfEtiketten: {
    arbeitsgang: ["Kunde: ", "kunde"],
    material: ["Haupt-AB: ", "haupt_ab"],
    profil: ["Ersteller: ", "ersteller"],
    abmasse: ["Datum: ", "datum_liste"],
    bemerkung: ["Dispoliste: ", "dispoliste"]
},

/* Felder, die BG und Teil unverändert aus der Tabelle übernehmen. */
archivUebernehmen: ["zeichnungsnummer", "benennung", "menge_bg", "index", "lk_nummer", "arbeitsgang", "material",
    "profil", "abmasse", "bemerkung", "lagerort"],

archivAusSchweissen: function (kopf) {

    return this.text(kopf.archiv_herkunft) === this.archivHerkunftSchweissen;
},

/* Zeilen wie in Excel: die AB-Zeile, jede BG und jedes Teil (R-X1, Sicherheitsfrage). */
archivZeilenZahl: function (ab) {

    return 1 + ab.bgs.length + this.bestandTeile(ab).length;
},

/* ---------------------------------------------------------------------------
   Archivieren und Wiederherstellen
   --------------------------------------------------------------------------- */

/* R-X1: AB archivieren. ab = AB aus bestandLaden. Gibt die Zeilenzahl zurück. */
abArchivieren: async function (ab) {

    const n = this.archivZeilenZahl(ab);

    await this.datenAendern("auftrag", ab.o, frisch => {
        if (this.istJa(frisch.archiviert)) throw new Error(this.text(ab.o.ab_anzeige) + " ist schon im Archiv.");
        return {
            archiviert: true,
            archiviert_am: this.zeitJetzt(),
            archiv_herkunft: this.archivHerkunftBestand,
            archiv_status: ab.w.status
        };
    });

    await this.protokollSchreiben("archiviert", ab.o.ab_anzeige, "", n + " Zeilen", "Archiv");
    return n;
},

/* R-X3 neu: AB aus dem Archiv zurückholen. kopf = Zeile aus archivLaden. Ein AB aus der Bestandsliste kommt
   in die Bestandsliste, ein AB aus dem Schweißen ins Schweißen (swAusArchiv, 4L). Hat der AB inzwischen
   seinen Platz in der Reihenfolge verloren, kommt er ans Ende (wie bisher). Gibt "bestand" oder
   "schweissen" zurück: wohin er gekommen ist. */
archivWiederherstellen: async function (kopf) {

    const name = this.text(kopf.ab_anzeige);

    if (this.archivAusSchweissen(kopf)) {
        await this.swAusArchiv(kopf);
        return "schweissen";
    }

    /* derselbe AB, nicht archiviert, in der Bestandsliste */
    const da = await this.datenLesen("auftrag", {
        wo: { ab_schluessel: kopf.ab_schluessel, bereich: "bestand" }, aufloesen: false
    });
    if (da.length) {
        throw new Error(name + " steht schon wieder in der Bestandsliste (neu importiert). " +
            "Erst dort archivieren, dann wiederherstellen.");
    }

    const live = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false });
    const leer = v => v === null || v === undefined || v === "";
    const milli = live.map(a => this.mengeMilli(a.reihenfolge));
    const belegt = leer(kopf.reihenfolge) || milli.indexOf(this.mengeMilli(kopf.reihenfolge)) > -1;
    const ende = (milli.length ? Math.max(...milli) / 1000 : 0) + 1;

    await this.datenAendern("auftrag", kopf, frisch => {
        if (!this.istJa(frisch.archiviert)) throw new Error(name + " ist schon nicht mehr im Archiv.");
        return {
            archiviert: false,
            archiviert_am: null,
            archiv_herkunft: "",
            archiv_status: "",
            reihenfolge: belegt ? ende : frisch.reihenfolge
        };
    });

    await this.protokollSchreiben("wiederhergestellt", name, "", "Archiv", "Bestandsliste");
    return "bestand";
},

/* ---------------------------------------------------------------------------
   Lesen
   --------------------------------------------------------------------------- */

/* Alle archivierten ABs, zuletzt archivierte zuerst. */
archivLaden: async function () {

    const liste = await this.datenLesen("auftrag", { archiv: "nur", aufloesen: false });

    liste.sort((a, b) =>
        ((this.zeitMs(b.archiviert_am) || 0) - (this.zeitMs(a.archiviert_am) || 0)) || this.idVergleich(b._id, a._id));
    return liste;
},

/* R-X3: Treffer im Kopf eines AB (AB, Kunde, Verkaufsartikel), Teilwort, ohne Groß-/Kleinschreibung. */
archivKopfTreffer: function (kopf, suche) {

    const q = this.text(suche).toLowerCase();
    if (!q) return true;

    return ["ab_anzeige", "kunde", "verkaufsartikel"].some(f => this.text(kopf[f]).toLowerCase().indexOf(q) > -1);
},

/* R-X3: Treffer in einer Zeile (Zeichnungsnummer, Benennung, LK, Lagerort, Baugruppe). */
archivZeileTreffer: function (zeile, suche) {

    const q = this.text(suche).toLowerCase();
    return Boolean(q) && ["zeichnungsnummer", "benennung", "lk_nummer", "lagerort", "baugruppe"]
        .some(f => this.text(zeile[f]).toLowerCase().indexOf(q) > -1);
},

/* DLZ (R-W5): Termin Versand minus Eingelagert in Tagen; leer, solange eins fehlt. */
archivDlz: function (eingelagert, versand) {

    const a = this.zeitMs(eingelagert), b = this.zeitMs(versand);
    if (a === null || b === null) return "";
    return Math.round((b - a) / 86400000);
},

archivLeereZeile: function () {

    const z = {};
    this.archivKopf.forEach(([, feld]) => { z[feld] = ""; });
    return z;
},

/* Die 28 Spalten für einen AB aus der Bestandsliste (Teile ohne BG vorn, wie in Excel).
   Zahlen stehen als Text da, wie sie in der Bestandsliste angezeigt wurden. */
archivZeilenAusBestand: function (ab, kopf) {

    const gemeinsam = { geloescht_am: this.text(kopf.archiviert_am), herkunft: this.text(kopf.archiv_herkunft) };
    const mitWerten = (z, w) => Object.assign(z, {
        status: w.status, fortschritt: w.fortschritt, eingelagert: this.text(w.eingelagert), komplett: this.text(w.komplett)
    });
    const uebernehmen = (z, o) => this.archivUebernehmen.forEach(f => { z[f] = this.text(o[f]); });

    const zeilen = [];

    const abZeile = Object.assign(this.archivLeereZeile(), gemeinsam, {
        ab: this.text(ab.o.ab_anzeige),
        ebene: "AB",
        zeichnungsnummer: this.text(ab.o.ab_anzeige),
        benennung: this.text(ab.o.verkaufsartikel),
        lagerort: this.text(ab.o.lagerort)
    });
    for (const feld in this.archivKopfEtiketten) {
        const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
        const wert = this.text(ab.o[quelle]);
        abZeile[feld] = wert ? vorsatz + wert : "";
    }
    zeilen.push(mitWerten(abZeile, ab.w));

    const teilZeile = (t, bgName) => {
        const z = Object.assign(this.archivLeereZeile(), gemeinsam, {
            ab: this.text(ab.o.ab_anzeige),
            ebene: "Teil",
            baugruppe: bgName,
            menge_gesamt: this.sollText(t.o),
            vorhanden: this.mengeGleich(t.o.vorhanden, null) ? "" : this.zahlText(this.mengeMilli(t.o.vorhanden))
        });
        uebernehmen(z, t.o);
        return mitWerten(z, t.w);
    };

    ab.ohne.forEach(t => zeilen.push(teilZeile(t, this.archivOhneBg)));

    ab.bgs.forEach(b => {
        const z = Object.assign(this.archivLeereZeile(), gemeinsam, {
            ab: this.text(ab.o.ab_anzeige),
            ebene: "BG",
            baugruppe: this.text(b.o.name),
            menge_gesamt: this.sollText(b.o)
        });
        uebernehmen(z, b.o);
        zeilen.push(mitWerten(z, b.w));
        b.teile.forEach(t => zeilen.push(teilZeile(t, this.text(b.o.name))));
    });

    return zeilen;
},

/* Die 28 Spalten für einen AB aus dem Schweißen (Zeilen der Tabelle schweisszeile, nach nr). */
archivZeilenAusSchweissen: function (zeilen, kopf) {

    const felder = ["zeichnungsnummer", "benennung", "menge_bg", "menge_gesamt", "index", "lk_nummer", "arbeitsgang",
        "material", "profil", "abmasse", "vorhanden", "bemerkung", "status", "fortschritt", "ebene", "baugruppe",
        "eingelagert", "komplett", "lagerort", "mitarbeiter", "arbeitsplatz", "entnommen", "liefertermin_stahlbau",
        "termin_versand"];

    return zeilen.slice().sort((a, b) => (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id))
        .map(s => {
            const z = this.archivLeereZeile();
            felder.forEach(f => { z[f] = this.text(s[f]); });
            z.ab = this.text(s.ab_nr);
            z.geloescht_am = this.text(kopf.archiviert_am);
            z.herkunft = this.text(kopf.archiv_herkunft);
            z.dlz = this.archivDlz(s.eingelagert, s.termin_versand);
            return z;
        });
},

/* Zeilen eines archivierten AB (28 Spalten). kopf = Zeile aus archivLaden. */
archivZeilenLaden: async function (kopf) {

    if (this.archivAusSchweissen(kopf)) {
        const sz = await this.datenLesen("schweisszeile", {
            wo: { ab_schluessel: kopf.ab_schluessel }, archiv: "nur", aufloesen: false, sortierung: ["nr"]
        });
        return this.archivZeilenAusSchweissen(sz.filter(s => !this.istJa(s.zurueckgeholt)), kopf);
    }

    const baum = await this.bestandLaden([kopf._id], { archiv: "nur" });
    return baum.length ? this.archivZeilenAusBestand(baum[0], baum[0].o) : [];
},

/* Zeilen aller archivierten ABs für die Suche in den Zeilen (R-X3). Lädt BGs,
   Teile und Schweißzeilen in Stücken. Ergebnis: { AB-ID als Text: Zeilen }.
   OFFEN (Symolo): Das lädt alle Zeilen des Archivs. Gibt es eine Suche mit
   "like" oder einen Befehl dafür, wäre das nicht nötig. */
archivZeilenAlle: async function (koepfe) {

    const ergebnis = {};
    const bestand = koepfe.filter(k => !this.archivAusSchweissen(k));
    const schweissen = koepfe.filter(k => this.archivAusSchweissen(k));

    if (bestand.length) {
        const baum = await this.bestandLaden(bestand.map(k => k._id), { archiv: "nur" });
        baum.forEach(ab => { ergebnis[String(ab.o._id)] = this.archivZeilenAusBestand(ab, ab.o); });
    }

    if (schweissen.length) {
        const sz = await this.datenLesenIn("schweisszeile", "ab_schluessel", schweissen.map(k => k.ab_schluessel),
            { archiv: "nur" });
        schweissen.forEach(k => {
            ergebnis[String(k._id)] = this.archivZeilenAusSchweissen(
                sz.filter(s => this.text(s.ab_schluessel) === this.text(k.ab_schluessel) && !this.istJa(s.zurueckgeholt)), k);
        });
    }

    koepfe.forEach(k => { if (!ergebnis[String(k._id)]) ergebnis[String(k._id)] = []; });
    return ergebnis;
},

/* Text einer Zelle im Archiv: Gelöscht am mit Uhrzeit, andere Daten ohne. */
archivWert: function (zeile, feld) {

    const w = zeile[feld];
    if (feld === "geloescht_am") return this.zeitOrtText(w);
    if (this.archivDatumFelder.indexOf(feld) > -1) return this.datumText(w);
    return this.text(w);
},


/* ===========================================================================
   TERMINE: Datum als Tageszahl, Kalenderwochen, Monate
   Forecast, Planung und Statistik rechnen mit Tagen. Ein Datum aus Symolo
   ("2026-10-16T00:00:00.0000000Z") wird zur ganzen Zahl "Tage seit
   01.01.1970" (nur das Datum, keine Uhrzeit, keine Zeitzone). Damit sind
   Unterschiede in Tagen einfache Subtraktion.
   =========================================================================== */

monatsNamen: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
tagesNamen: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],

/* Datum -> Tageszahl; null, wenn es kein Datum ist (auch "(verschieden)" und leer). */
tagNr: function (wert) {

    const m = this.text(wert).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;

    return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000);
},

/* Heute (Ortszeit) als Tageszahl. */
tagHeute: function () {

    return this.tagNr(this.heuteText());
},

/* Zeitpunkt (UTC, mit Uhrzeit) -> Tageszahl des Tages in der Ortszeit des Browsers
   (Python: timezone.localtime(...).date()). Ohne Uhrzeit zählt das Datum. */
tagOrt: function (wert) {

    const t = this.text(wert);
    if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:/.test(t)) return this.tagNr(t);

    const ms = this.zeitMs(t);
    if (ms === null) return null;

    const d = new Date(ms);
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
},

/* [Jahr, Monat 1-12, Tag] */
tagTeile: function (nr) {

    const d = new Date(nr * 86400000);
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
},

/* "16.10.2026" */
tagText: function (nr) {

    if (nr === null || nr === undefined) return "";

    const [j, m, t] = this.tagTeile(nr);
    return String(t).padStart(2, "0") + "." + String(m).padStart(2, "0") + "." + j;
},

/* "16.10." */
tagKurz: function (nr) {

    const [, m, t] = this.tagTeile(nr);
    return t + "." + m + ".";
},

/* 0 = Montag bis 6 = Sonntag (der 01.01.1970 war ein Donnerstag). */
tagWochentag: function (nr) {

    return ((nr + 3) % 7 + 7) % 7;
},

tagMontag: function (nr) {

    return nr - this.tagWochentag(nr);
},

/* Kalenderwoche nach ISO 8601: [Jahr, Woche] (Python: date.isocalendar). */
tagKw: function (nr) {

    const donnerstag = nr - this.tagWochentag(nr) + 3;
    const jahr = this.tagTeile(donnerstag)[0];
    const jan1 = Math.floor(Date.UTC(jahr, 0, 1) / 86400000);

    return [jahr, Math.floor((donnerstag - jan1) / 7) + 1];
},

/* Die letzten n Kalenderwochen bis einschließlich der aktuellen, älteste zuerst. */
letzteKws: function (heute, n) {

    const montag = this.tagMontag(heute);
    const liste = [];

    for (let i = n - 1; i >= 0; i--) liste.push(this.tagKw(montag - 7 * i));
    return liste;
},

/* Die letzten n Monate bis einschließlich des aktuellen, ältester zuerst: [[Jahr, Monat]] */
letzteMonate: function (heute, n) {

    let [j, m] = this.tagTeile(heute);
    const liste = [];

    for (let i = 0; i < n; i++) {
        liste.push([j, m]);
        m--;
        if (m === 0) { j--; m = 12; }
    }

    return liste.reverse();
},

/* Zahl mit einer Nachkommastelle und Komma wie Python f"{x:.1f}": bei genau
   .25 und .75 rundet Python zur geraden Stelle, toFixed nach oben. */
zahlEins: function (x) {

    let s = x.toFixed(1);

    if (Number.isInteger(x * 4) && !Number.isInteger(x * 2)) {
        const n = Math.floor(Math.abs(x) * 10);
        const gerade = n % 2 === 0 ? n : n + 1;
        s = (x < 0 ? "-" : "") + (gerade / 10).toFixed(1);
    }

    return s.replace(".", ",");
},


/* ===========================================================================
   SCHWEISSEN LESEN (R-W5, R-W6, R-W9, W11)
   Nachbau des Lesens aus bestand/schweissen: abgleich.py (lesen,
   _ab_ableiten), bloecke.py (bloecke) und forecast_marke.py (forecast_abs).
   Forecast, Planung und Statistik brauchen die Zeilen im Schweißen. Das
   Ändern (Entnehmen, Zuweisen, Archivieren, Zurückholen) kommt mit der
   Ansicht Schweißen in Phase 6 dazu.

   Die Zeilen liegen in der Tabelle schweisszeile (archiviert = nein).
   Mitarbeiter, Arbeitsplatz und die zwei Termine einer AB-Zeile sind der
   gemeinsame Wert aller Baugruppen, sonst "(verschieden)". Das wird beim
   Lesen berechnet und nie gespeichert.
   =========================================================================== */

swVerschieden: "(verschieden)",
swOhneBg: "(ohne BG)",

/* R-W6: die vier vererbten Eingaben, Reihenfolge wie in AbgleichKern */
swFelder: ["mitarbeiter", "arbeitsplatz", "liefertermin_stahlbau", "termin_versand"],
swDatumsfelder: ["liefertermin_stahlbau", "termin_versand"],

/* Excel Txt(): leer -> "", Datum -> nur das Datum (zum Vergleichen), sonst Text. */
swT: function (wert) {

    const t = this.text(wert);
    return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : t;
},

swGleich: function (a, b) {

    return this.swT(a).toLowerCase() === this.swT(b).toLowerCase();
},

/* "100 HALTER ..." -> "100" (BgNummer) */
swBgNummer: function (name) {

    const t = this.text(name);
    return t.indexOf(" ") > -1 ? t.split(" ")[0] : t;
},

/* Werte jeder Zeile als [Mitarbeiter, Arbeitsplatz, Liefertermin, Versand];
   leer ist "" (Termine: null). */
swWerte: function (zeilen) {

    return zeilen.map(z => this.swFelder.map(f => {
        const wert = z[f];
        if (wert === null || wert === undefined || wert === "") return this.swDatumsfelder.indexOf(f) > -1 ? null : "";
        return wert;
    }));
},

/* Schritt 3 von AbgleichKern: AB-Zeile = gemeinsamer Wert aller ihrer BGs,
   sonst "(verschieden)". Ändert w an Ort und Stelle. */
swAbAbleiten: function (ebene, ab, w) {

    const n = ebene.length;

    for (let i = 0; i < n; i++) {
        if (ebene[i] !== "AB") continue;

        for (let k = 0; k < 4; k++) {
            let anz = 0, versch = false, gem = "", gv = null;

            for (let j = 0; j < n; j++) {
                if (ebene[j] === "BG" && this.swGleich(ab[j], ab[i])) {
                    anz++;
                    if (anz === 1) {
                        gem = this.swT(w[j][k]);
                        gv = w[j][k];
                    } else if (this.swT(w[j][k]) !== gem) {
                        versch = true;
                    }
                }
            }

            if (anz > 0) w[i][k] = versch ? this.swVerschieden : gv;
        }
    }
},

/* Zeilen aus datenLesen("schweisszeile") in der Reihenfolge nr berechnen.
   Setzt an jeder Zeile: m (Mitarbeiter), p (Arbeitsplatz), lt (Liefertermin
   Stahlbau), tv (Termin Versand), kopfObj (Kopfdaten des AB, gelesen aus dem
   JSON-Text), css (Statusklasse). */
swBerechnen: function (zeilen) {

    const liste = zeilen.slice().sort((a, b) =>
        (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id));

    const w = this.swWerte(liste);
    this.swAbAbleiten(liste.map(z => z.ebene), liste.map(z => z.ab_nr), w);

    liste.forEach((z, i) => {
        [z.m, z.p, z.lt, z.tv] = w[i];

        let kopf = {};
        try { kopf = JSON.parse(this.text(z.kopf) || "{}") || {}; } catch (fehler) { kopf = {}; }
        z.kopfObj = kopf;

        z.css = { Komplett: "kom-komplett", Teilweise: "kom-teilweise" }[this.text(z.status)] || "kom-offen";
    });

    return liste;
},

/* Alle Zeilen im Schweißen (nicht archiviert), berechnet. */
swLesen: async function () {

    const zeilen = await this.datenLesen("schweisszeile", { aufloesen: false, sortierung: ["nr"] });
    return this.swBerechnen(zeilen);
},

/* Zeilen zu Blöcken: eine AB-Zeile beginnt einen Block; eine BG mit anderer
   Anzeige (AB…_BGnnn) oder ohne AB-Zeile davor ist ein Einzelblock.
   Block: { ab, ohne: [Teile], bgs: [{ bg, teile }] } */
swBloecke: function (zeilen) {

    const ergebnis = [];
    let akt = null;

    zeilen.forEach(z => {
        if (z.ebene === "AB") {
            akt = { ab: z, ohne: [], bgs: [] };
            ergebnis.push(akt);
        } else if (z.ebene === "BG") {
            if (akt !== null && akt.ab !== null && this.text(akt.ab.ab_schluessel) === this.text(z.ab_schluessel) &&
                this.text(z.anzeige) === this.text(akt.ab.anzeige)) {
                akt.bgs.push({ bg: z, teile: [] });
            } else {
                akt = { ab: null, ohne: [], bgs: [{ bg: z, teile: [] }] };
                ergebnis.push(akt);
            }
        } else if (akt !== null) {
            if (this.text(z.baugruppe) === this.swOhneBg && akt.ab !== null && akt.bgs.length === 0) akt.ohne.push(z);
            else if (akt.bgs.length) akt.bgs[akt.bgs.length - 1].teile.push(z);
            else akt.ohne.push(z);
        }
    });

    return ergebnis;
},

/* Kopfzeile eines Blocks: die AB-Zeile, bei einem Einzelblock die erste BG. */
swKopf: function (block) {

    return block.ab || block.bgs[0].bg;
},

/* Alle Zeilen eines Blocks in der Reihenfolge der Anzeige. */
swBlockZeilen: function (block) {

    const z = [];
    if (block.ab) z.push(block.ab);
    z.push(...block.ohne);
    block.bgs.forEach(g => { z.push(g.bg); z.push(...g.teile); });
    return z;
},

/* Je AB-Schlüssel die Arbeitsplätze der Baugruppen, die einzeln im Schweißen
   liegen (Einzelblöcke, der Rest des AB steht noch in der Bestandsliste). */
swEinzelnePlaetze: function (bloecke) {

    const je = {};

    bloecke.forEach(b => {
        if (b.ab !== null) return;
        const schluessel = this.text(b.bgs[0].bg.ab_schluessel);
        je[schluessel] = (je[schluessel] || []).concat(b.bgs.map(g => this.text(g.bg.p)));
    });

    return je;
},

/* W11: Ganze ABs im Schweißen als Knoten wie in der Bestandsliste (nur zum
   Anzeigen im Forecast und in der Planung, nichts wird gespeichert). Einzel-
   blöcke zählen nicht: ihr AB steht ja noch in der Bestandsliste.
   Knoten wie bestandBaum, dazu schweissen = true. */
swForecastAbs: function (bloecke) {

    const ergebnis = [];

    bloecke.forEach(b => {
        if (b.ab === null) return;

        const k = b.ab.kopfObj || {};
        const ab = {
            _id: -Number(b.ab._id),
            ab_anzeige: this.text(b.ab.ab_nr),
            ab_schluessel: this.text(b.ab.ab_schluessel),
            forecast_schluessel: this.text(k.forecast_schluessel) || this.abForecastSchluessel(b.ab.ab_nr),
            kunde: this.text(k.kunde),
            verkaufsartikel: this.text(k.verkaufsartikel),
            haupt_ab: this.text(k.haupt_ab),
            lagerort: this.text(b.ab.lagerort),
            arbeitsplatz: this.text(b.ab.p),
            bereich: "schweissen"
        };

        const teil = z => ({
            art: "teil",
            o: {
                _id: -Number(z._id),
                zeile: z.nr,
                zeichnungsnummer: this.text(z.zeichnungsnummer),
                benennung: this.text(z.benennung),
                lk_nummer: this.text(z.lk_nummer),
                lagerort: this.text(z.lagerort),
                menge_gesamt: z.menge_gesamt,
                vorhanden: z.vorhanden,
                datum_eingelagert: z.eingelagert,
                datum_komplett: z.komplett,
                arbeitsplatz: this.text(z.p)
            },
            w: this.teilWerte(z.vorhanden, z.menge_gesamt, z.eingelagert, z.komplett),
            zeigen: true
        });

        const ohne = b.ohne.map(teil);
        const bgs = b.bgs.map(g => {
            const teile = g.teile.map(teil);
            return {
                art: "bg",
                o: {
                    _id: -Number(g.bg._id),
                    zeile: g.bg.nr,
                    name: this.text(g.bg.baugruppe),
                    kurz: this.swBgNummer(g.bg.baugruppe),
                    lk_nummer: this.text(g.bg.lk_nummer),
                    lagerort: this.text(g.bg.lagerort),
                    arbeitsplatz: this.text(g.bg.p)
                },
                w: this.sammelWerte(teile.map(t => t.w)),
                teile: teile,
                zeigen: true,
                offen: true
            };
        });

        const alle = ohne.concat(...bgs.map(g => g.teile));
        ergebnis.push({
            art: "ab", o: ab, w: this.sammelWerte(alle.map(t => t.w)), ohne: ohne, bgs: bgs,
            zeigen: true, offen: true, schweissen: true
        });
    });

    return ergebnis;
},


/* ===========================================================================
   FORECAST ANSEHEN (R-F6 bis R-F10, W11)
   Nachbau der Ansicht aus bestand/forecast.py: früheste Termine je AB,
   Ampel, Liste, Kopf und die Kachel im Dashboard. Das Einlesen der Excel-
   Datei (R-F1 bis R-F5) kommt mit dem Import in Phase 7.

   Tage werden als Tageszahl gerechnet (4E_termine.js).
   =========================================================================== */

/* R-F7 Ampel (Kalendertage ab heute) */
fcRotTage: 14,
fcGelbTage: 30,

/* R-F8 Filter Liefertermin: [Wert, Beschriftung, Tage oder null = alle] */
fcZeitraeume: [["14", "Nächste 14 Tage", 14], ["30", "Nächste 30 Tage", 30], ["alle", "Alle", null]],
fcStandardZeitraum: "30",

/* R-F10: "Forecast vom" wird orange, wenn älter als 8 Tage */
fcAltTage: 8,

/* Der aktuelle Forecast: die neueste Datei und ihre Termine.
   Gibt { f, termine } zurück; f = null, wenn noch keiner importiert ist.
   Von den Zeilen werden nur AB-Schlüssel und Termin geholt (die Datei hat
   bis zu 80 Spalten je Zeile). OFFEN (Symolo): Beim Import (Phase 7) kommt
   der alte Forecast ins Archiv statt gelöscht zu werden; bis dahin gilt
   der mit der neuesten Zeit. */
fcLaden: async function () {

    const liste = await this.datenLesen("forecast", { aufloesen: false });
    liste.sort((a, b) => ((this.zeitMs(b.zeit) || 0) - (this.zeitMs(a.zeit) || 0)) || this.idVergleich(b._id, a._id));

    const f = liste.length ? liste[0] : null;
    if (f === null) return { f: null, termine: {} };

    const zeilen = await this.datenLesenIn("forecast_zeile", "forecast", [f._id], { felder: ["schluessel", "termin"] });
    return { f: f, termine: this.fcTermine(zeilen) };
},

/* R-F6: je AB-Schlüssel (ohne Los) der früheste Termin; Zeilen ohne Termin
   zählen nicht. Ergebnis: { schluessel: Tageszahl } */
fcTermine: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        const tag = this.tagNr(z.termin);
        if (tag === null) return;

        const s = this.text(z.schluessel);
        if (!(s in je) || tag < je[s]) je[s] = tag;
    });

    return je;
},

/* Termin eines AB (auch eines Loses: dann der des Haupt-AB, R-AB5); null = kein Termin. */
fcTerminVon: function (a, termine) {

    const s = this.text(a.o.forecast_schluessel) || this.abForecastSchluessel(a.o.ab_anzeige);
    return s in termine ? termine[s] : null;
},

/* R-F7: bis heute + 14 (auch überfällig) rot, bis heute + 30 gelb, sonst oder ohne Termin weiß. */
fcAmpel: function (termin, heute) {

    if (termin === null || termin === undefined) return "weiss";

    const tage = termin - heute;
    return tage <= this.fcRotTage ? "rot" : (tage <= this.fcGelbTage ? "gelb" : "weiss");
},

/* W11: die ABs der Bestandsliste plus die ganzen ABs im Schweißen. Ist ein AB
   gerade wieder in der Bestandsliste (neu importiert oder zurückgeholt),
   zählt nur dieser. */
fcMitSchweissen: function (abs, swAbs) {

    const vorhanden = {};
    abs.forEach(a => { vorhanden[this.text(a.o.ab_schluessel)] = true; });

    return abs.concat(swAbs.filter(a => !vorhanden[this.text(a.o.ab_schluessel)]));
},

/* R-F8/R-F9: nur ABs mit Status ungleich Komplett (im Schweißen bleibt er
   sichtbar), mit allen BGs und Teilen; Filter AB-Suche, Kunde, Liefertermin.
   Termin aufsteigend (ohne Termin unten), dann Fortschritt aufsteigend, dann
   AB-Nummer; innerhalb des AB wie im Dashboard (R-DB3).
   Je Eintrag: termin (Tageszahl oder null) und ampel. */
fcListe: function (abs, termine, heute, zeitraum, suche, kunde) {

    const eintrag = this.fcZeitraeume.find(z => z[0] === zeitraum);
    const tage = eintrag ? eintrag[2] : this.fcGelbTage;

    const auswahl = this.dashFiltern(abs, suche, kunde).filter(a => {
        if (a.w.status === "Komplett" && !a.schweissen) return false;

        const t = this.fcTerminVon(a, termine);
        /* 14/30: mit Überfälligen, ohne "kein Termin" */
        return !(tage !== null && (t === null || t - heute > tage));
    });

    const ergebnis = this.dashSortieren(auswahl, "");
    ergebnis.forEach(d => {
        d.termin = this.fcTerminVon(d.a, termine);
        d.ampel = this.fcAmpel(d.termin, heute);
    });

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    ergebnis.sort((p, q) =>
        vergleich(p.termin === null ? 1 : 0, q.termin === null ? 1 : 0) ||
        vergleich(p.termin === null ? 0 : p.termin, q.termin === null ? 0 : q.termin) ||
        vergleich(p.a.w.prozent, q.a.w.prozent) ||
        vergleich(this.dashText(p.a.o.ab_anzeige), this.dashText(q.a.o.ab_anzeige)));

    return ergebnis;
},

/* R-F10: Zähler über die angezeigten ABs, "Forecast vom" (orange, wenn älter
   als 8 Tage) und heute. */
fcKopf: function (liste, f, heute) {

    const vom = f ? this.tagOrt(f.zeit) : null;

    return {
        rot: liste.filter(d => d.ampel === "rot").length,
        gelb: liste.filter(d => d.ampel === "gelb").length,
        ohne: liste.filter(d => d.termin === null).length,
        ab: liste.length,
        vom: vom,
        alt: vom !== null && heute - vom > this.fcAltTage,
        heute: heute
    };
},

/* Kachel im Dashboard: rote und gelbe ABs (alle offenen, ohne Filter);
   null = noch kein Forecast. abs enthält schon die ABs im Schweißen. */
fcKachel: function (abs, f, termine, heute) {

    if (!f) return null;

    const farben = abs.filter(a => a.w.status !== "Komplett" || a.schweissen)
        .map(a => this.fcAmpel(this.fcTerminVon(a, termine), heute));

    return {
        rot: farben.filter(x => x === "rot").length,
        gelb: farben.filter(x => x === "gelb").length,
        vom: this.tagOrt(f.zeit)
    };
},


/* ===========================================================================
   PLANUNG (Häkchen, Station, Lagerort)
   Nachbau von bestand/planung.py und views_planung.py: Häkchen an ABs im
   Dashboard und im Forecast (ein gemeinsamer Stand), die Ansicht Planung
   mit den vorgemerkten ABs und die Spalten Station und Lagerort.

   Das Häkchen hängt am AB-Schlüssel (R-AB3, Beispiel "AB2616200|L1") und
   gilt für alle. Entfernen archiviert den Eintrag statt ihn zu löschen;
   setzt jemand das Häkchen wieder, wird er wieder eingeblendet.
   Rechte fallen vorerst weg (Ben, 16.10.2026): jeder darf haken.
   =========================================================================== */

plStationBestand: "Kom.",
plStationSchweissen: "Schw.",
plStationBeide: "Kom. + Schw.",

plSortierungen: [["termin", "Liefertermin"], ["ab", "Fortschritt absteigend"], ["auf", "Fortschritt aufsteigend"]],
plStandardSortierung: "termin",

/* Alle Häkchen-Einträge, auch ausgeblendete (zum Wiedereinblenden). */
plMarkenLaden: async function () {

    return this.datenLesen("planungsmarke", { aufloesen: false, archiv: "alle" });
},

/* Die gesetzten Häkchen als { AB-Schlüssel: true }. */
plAktive: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        if (!this.istJa(z.archiviert)) je[this.text(z.ab_schluessel)] = true;
    });

    return je;
},

/* Gibt es diesen AB in der Bestandsliste oder (ganz) im Schweißen? */
plExistiert: function (alleAbs, schluessel) {

    return alleAbs.some(a => this.text(a.o.ab_schluessel) === schluessel);
},

/* Häkchen setzen oder entfernen. Gibt false zurück, wenn es den AB nicht
   gibt (beim Entfernen immer erlaubt). Doppelte Einträge (zwei Personen
   haken gleichzeitig) werden beim Entfernen alle ausgeblendet. */
plSetzen: async function (zeilen, schluessel, an, alleAbs) {

    const gleiche = zeilen.filter(z => this.text(z.ab_schluessel) === schluessel);
    const aktive = gleiche.filter(z => !this.istJa(z.archiviert));

    if (!an) {
        for (const z of aktive) await this.datenArchivieren("planungsmarke", z);
        return true;
    }

    if (!this.plExistiert(alleAbs, schluessel)) return false;
    if (aktive.length) return true;

    if (gleiche.length) await this.datenAendern("planungsmarke", gleiche[0], { archiviert: false });
    else await this.datenAnlegen("planungsmarke", { ab_schluessel: schluessel, archiviert: false });

    return true;
},

/* Setzt d.geplant an jedem Eintrag der Liste. */
plMarkieren: function (liste, aktive) {

    liste.forEach(d => { d.geplant = Boolean(aktive[this.text(d.a.o.ab_schluessel)]); });
},

/* Nur die ABs mit Häkchen. */
plGeplante: function (abs, aktive) {

    return abs.filter(a => aktive[this.text(a.o.ab_schluessel)]);
},

/* Planung: vorgemerkte ABs sortiert nach Liefertermin (früheste oben, ohne
   Termin unten, dann AB-Nummer) oder nach Fortschritt. */
plListe: function (abs, termine, suche, kunde, sortierung) {

    const nachProzent = sortierung === "termin" ? "" : sortierung;
    const liste = this.dashSortieren(this.dashFiltern(abs, suche, kunde), nachProzent);
    liste.forEach(d => { d.termin = this.fcTerminVon(d.a, termine); });

    if (sortierung === "termin") {
        const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
        liste.sort((p, q) =>
            vergleich(p.termin === null ? 1 : 0, q.termin === null ? 1 : 0) ||
            vergleich(p.termin === null ? 0 : p.termin, q.termin === null ? 0 : q.termin) ||
            vergleich(this.dashText(p.a.o.ab_anzeige), this.dashText(q.a.o.ab_anzeige)));
    }

    return liste;
},

/* Plätze ohne Doppelte, ohne leere und ohne "(verschieden)", mit Komma. */
plPlaetze: function (namen) {

    const aus = [];

    namen.forEach(n => {
        const t = this.text(n);
        if (t && t !== this.swVerschieden && aus.indexOf(t) < 0) aus.push(t);
    });

    return aus.join(", ");
},

/* Setzt an jedem Eintrag und jeder Gruppe station und ort, an jedem Teil ort.
   Bestandsliste: Lagerort im Regal. Schweißen: Arbeitsplatz. Liegen einzelne
   BGs eines AB im Schweißen (Einzelblöcke), steht beim AB "Kom. + Schw." und
   beides unter Lagerort. einzeln: swEinzelnePlaetze(bloecke). */
plOrteSetzen: function (liste, einzeln) {

    liste.forEach(d => {
        const a = d.a;

        if (a.schweissen) {
            d.station = this.plStationSchweissen;
            d.ort = this.text(a.o.arbeitsplatz);

            d.gruppen.forEach(g => {
                g.station = this.plStationSchweissen;
                g.ort = (g.bg ? this.text(g.bg.o.arbeitsplatz) : "") || d.ort;
                g.teile.forEach(t => { t.ort = this.text(t.o.arbeitsplatz) || g.ort; });
            });
            return;
        }

        const plaetze = einzeln[this.text(a.o.ab_schluessel)];
        d.station = plaetze ? this.plStationBeide : this.plStationBestand;
        d.ort = [this.text(a.o.lagerort), this.plPlaetze(plaetze || [])].filter(Boolean).join(" · ");

        d.gruppen.forEach(g => {
            g.station = this.plStationBestand;
            g.ort = g.bg ? this.text(g.bg.o.lagerort) : "";
            g.teile.forEach(t => { t.ort = this.text(t.o.lagerort); });
        });
    });
},


/* ===========================================================================
   STATISTIK: Liefertreue, Durchlaufzeit, überfällige ABs, Verspätung
   Nachbau von bestand/statistik.py.

   Grundlage sind die Termine aus dem Schweißen und dem Archiv (archivierte
   ABs aus dem Schweißen zählen mit, sonst gingen frühere Monate verloren):
     Liefertermin     = "Liefertermin Stahlbau" (liefertermin_stahlbau)
     Versand          = "Termin Versand" (termin_versand)
     pünktlich        = Versand am Liefertermin oder davor
     gezählt          = hat einen Versand, oder der Liefertermin liegt vor heute
                        (ohne Versand = nicht pünktlich); liegt der Liefertermin
                        heute oder später und es gibt noch keinen Versand, zählt
                        der Eintrag noch nicht
     Liefertreue in % = pünktliche geteilt durch gezählte (ganze Zahl)
     Durchlaufzeit    = Versand minus Eingelagert in Tagen (Spalte DLZ im
                        Schweißen), nach dem Versanddatum eingeordnet
   "AB" ist eine AB-Zeile (oder ein Einzelblock aus einer BG), "Bauteil" jede
   Teil-Zeile. Sind die Termine der BGs eines AB verschieden, gilt der früheste
   Liefertermin, und der Versand zählt erst, wenn alle BGs einen haben (dann
   der späteste).

   Ein Eintrag: { art: "ab" | "teil", anzeige, lt, tv, eingelagert, platz,
   mitarbeiter, kunde, archiviert } mit Terminen als Tageszahl (4E_termine.js).

   Archivierte ABs aus der Bestandsliste haben keine Termine und zählen nicht.
   OFFEN (Symolo): Wurde ein AB aus dem Schweißen archiviert, zurückgeholt und
   wieder archiviert, hat er zwei Gruppen mit demselben AB-Schlüssel. Hier
   werden sie zusammen gezählt (die Zeilen tragen keine Archiv-Nummer).
   =========================================================================== */

/* Soll der Liefertreue in % (Linie im Diagramm); ab 70 "leicht darunter" (gelb), darunter rot */
statSoll: 80,
statGelbAb: 70,
statWas: [["abs", "ABs"], ["teile", "Alle Bauteile"]],
statWasStandard: "abs",
statZeiten: [["woche", "Woche"], ["monat", "Monat"], ["jahr", "Jahr"]],
statZeitStandard: "monat",

statDlz: function (e) {

    return e.tv !== null && e.eingelagert !== null ? e.tv - e.eingelagert : null;
},

/* Liefertermin und Versand eines AB: eigener Wert, sonst aus den BGs (siehe Kopf). */
statAbTermine: function (lt, tv, bgLt, bgTv) {

    if (lt === null && bgLt.length) lt = Math.min(...bgLt);
    if (tv === null && bgTv.length && bgTv.every(x => x !== null)) tv = Math.max(...bgTv);
    return [lt, tv];
},

/* Einträge aus den berechneten Zeilen im Schweißen (swLesen). */
statAusSchweissen: function (zeilen) {

    const ergebnis = [];

    this.swBloecke(zeilen).forEach(b => {
        const kopf = this.swKopf(b);
        const bgs = b.bgs.map(g => g.bg);
        let lt, tv;

        if (b.ab !== null) {
            [lt, tv] = this.statAbTermine(
                this.tagNr(b.ab.lt), this.tagNr(b.ab.tv),
                bgs.map(x => this.tagNr(x.lt)).filter(x => x !== null),
                bgs.map(x => this.tagNr(x.tv)));
        } else {
            lt = this.tagNr(kopf.lt);
            tv = this.tagNr(kopf.tv);
        }

        ergebnis.push({
            art: "ab",
            anzeige: this.text(kopf.anzeige),
            lt: lt,
            tv: tv,
            eingelagert: this.tagNr(kopf.eingelagert),
            platz: kopf.p === this.swVerschieden ? "" : this.text(kopf.p),
            mitarbeiter: kopf.m === this.swVerschieden ? "" : this.text(kopf.m),
            kunde: this.text(kopf.kopfObj.kunde),
            archiviert: false
        });

        this.swBlockZeilen(b).forEach(z => {
            if (z.ebene !== "Teil") return;
            ergebnis.push({
                art: "teil", anzeige: this.text(z.anzeige), lt: this.tagNr(z.lt), tv: this.tagNr(z.tv),
                eingelagert: this.tagNr(z.eingelagert), platz: "", mitarbeiter: "", kunde: "", archiviert: false
            });
        });
    });

    return ergebnis;
},

/* Einträge aus den archivierten Zeilen (Schweißen, archiviert = ja). Nur
   Zeilen mit AB-Ebene oder mit einem Termin zählen. */
statAusArchiv: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        const lt = this.tagNr(z.liefertermin_stahlbau), tv = this.tagNr(z.termin_versand);
        if (this.text(z.ebene) !== "AB" && lt === null && tv === null) return;

        const s = this.text(z.ab_schluessel);
        (je[s] = je[s] || []).push({
            ebene: this.text(z.ebene), ab: this.text(z.ab_nr), lt: lt, tv: tv, eingelagert: this.tagNr(z.eingelagert),
            nr: this.mengeMilli(z.nr)
        });
    });

    const ergebnis = [];

    Object.keys(je).forEach(s => {
        const rows = je[s].sort((a, b) => a.nr - b.nr);
        const abZeile = rows.find(r => r.ebene === "AB") || null;
        const bgs = rows.filter(r => r.ebene === "BG");

        const [lt, tv] = this.statAbTermine(
            abZeile ? abZeile.lt : null, abZeile ? abZeile.tv : null,
            bgs.map(r => r.lt).filter(x => x !== null), bgs.map(r => r.tv));

        if (lt !== null || tv !== null) {
            ergebnis.push({
                art: "ab", anzeige: (abZeile || rows[0]).ab, lt: lt, tv: tv,
                eingelagert: abZeile ? abZeile.eingelagert : null, platz: "", mitarbeiter: "", kunde: "", archiviert: true
            });
        }

        rows.forEach(r => {
            if (r.ebene === "Teil" && (r.lt !== null || r.tv !== null)) {
                ergebnis.push({
                    art: "teil", anzeige: r.ab, lt: r.lt, tv: r.tv, eingelagert: r.eingelagert, platz: "",
                    mitarbeiter: "", kunde: "", archiviert: true
                });
            }
        });
    });

    return ergebnis;
},

/* Alle Einträge laden: die Zeilen im Schweißen und die archivierten (nur
   die Spalten, die gebraucht werden). */
statLaden: async function () {

    const live = await this.swLesen();
    const archiv = await this.datenLesen("schweisszeile", {
        aufloesen: false, archiv: "nur",
        felder: ["nr", "ab_nr", "ab_schluessel", "ebene", "eingelagert", "liefertermin_stahlbau", "termin_versand", "zurueckgeholt"]
    });

    /* Zeilen, die zurück in die Bestandsliste geholt wurden, zählen nicht als archiviert. */
    return this.statAusSchweissen(live).concat(this.statAusArchiv(archiv.filter(z => !this.istJa(z.zurueckgeholt))));
},

/* ---------- Rechnen ---------- */

statBalken: function (label, wert, text, hoehe, farbe, n, titel) {

    return { label: label, wert: wert, text: text, hoehe: hoehe, farbe: farbe, n: n, titel: titel };
},

/* Je Zeitraum: Anteil pünktlich versandter Einträge, deren Liefertermin in
   diesem Zeitraum liegt. schluessel() macht aus einem Zeitraum oder aus einer
   Tageszahl denselben Text, damit man beides vergleichen kann. */
statLiefertreue: function (eintraege, art, zeitraeume, schluessel, label, heute) {

    const zaehler = {};
    zeitraeume.forEach(z => { zaehler[schluessel(z)] = [0, 0]; });

    eintraege.forEach(e => {
        if (e.art !== art || e.lt === null) return;

        const z = schluessel(e.lt);
        if (!(z in zaehler) || (e.tv === null && e.lt >= heute)) return;

        zaehler[z][0]++;
        if (e.tv !== null && e.tv <= e.lt) zaehler[z][1]++;
    });

    return zeitraeume.map(z => {
        const [n, p] = zaehler[schluessel(z)];
        const l = label(z);

        if (n === 0) return this.statBalken(l, null, "–", 0, "neutral", 0, l + ": keine Liefertermine");

        const pct = this.rundenGerade(p / n * 100);
        const farbe = pct >= this.statSoll ? "gruen" : (pct >= this.statGelbAb ? "gelb" : "rot");
        return this.statBalken(l, pct, pct + " %", pct, farbe, n, l + ": " + p + " von " + n + " pünktlich");
    });
},

/* Fünf Balken: die letzten vier Kalenderwochen und die aktuelle. */
statLiefertreueMonat: function (eintraege, art, heute) {

    /* Zeitraum = [Jahr, Woche]; Tage werden über ihre Woche zugeordnet. */
    const kws = this.letzteKws(heute, 5);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagKw(x).join("-"));
    return this.statLiefertreue(eintraege, art, kws, schl, z => "KW " + z[1], heute);
},

/* Zwölf Balken: die letzten zwölf Monate bis einschließlich des aktuellen. */
statLiefertreueIa: function (eintraege, art, heute) {

    const monate = this.letzteMonate(heute, 12);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
    return this.statLiefertreue(eintraege, art, monate, schl,
        z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), heute);
},

/* Mittelwert je Zeitraum; Balkenhöhe relativ zum größten Wert.
   werte: { Schlüssel: [Zahlen] } */
statDurchschnitt: function (werte, zeitraeume, schluessel, label, einheit, farbe) {

    const mittel = zeitraeume.map(z => {
        const w = werte[schluessel(z)] || [];
        return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
    });
    const groesst = Math.max(0, ...mittel.filter(m => m !== null && m > 0));

    return zeitraeume.map((z, i) => {
        const m = mittel[i], n = (werte[schluessel(z)] || []).length, l = label(z);

        if (m === null) return this.statBalken(l, null, "–", 0, "neutral", 0, l + ": keine Daten");

        const h = groesst ? this.rundenGerade(Math.max(m, 0) / groesst * 100) : 0;
        return this.statBalken(l, m, this.zahlEins(m), Math.max(h, 2), farbe || "neutral", n,
            l + ": Ø " + this.zahlEins(m) + " " + einheit + " bei " + n + " AB" + (n !== 1 ? "s" : ""));
    });
},

/* Ø Durchlaufzeit der ABs (Versand minus Eingelagert), nach Versanddatum:
   Woche = letzte 7 Tage (je Tag), Monat = letzte 4 Kalenderwochen, Jahr = letzte 12 Monate. */
statDurchlaufzeit: function (eintraege, zeit, heute) {

    const abs = eintraege.filter(e => e.art === "ab" && this.statDlz(e) !== null);
    const sammeln = schluessel => {
        const je = {};
        abs.forEach(e => { (je[schluessel(e.tv)] = je[schluessel(e.tv)] || []).push(this.statDlz(e)); });
        return je;
    };

    if (zeit === "woche") {
        const tage = [];
        for (let i = 6; i >= 0; i--) tage.push(heute - i);
        const schl = x => String(x);
        return this.statDurchschnitt(sammeln(schl), tage, schl,
            t => this.tagesNamen[this.tagWochentag(t)] + " " + this.tagKurz(t), "Tage");
    }

    if (zeit === "jahr") {
        const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
        return this.statDurchschnitt(sammeln(schl), this.letzteMonate(heute, 12), schl,
            z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), "Tage");
    }

    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagKw(x).join("-"));
    return this.statDurchschnitt(sammeln(schl), this.letzteKws(heute, 4), schl, z => "KW " + z[1], "Tage");
},

/* ABs im Schweißen, deren Liefertermin vorbei ist und die noch keinen
   Versand haben, älteste zuerst. */
statUeberfaellig: function (eintraege, heute) {

    return eintraege.filter(e => e.art === "ab" && !e.archiviert && e.lt !== null && e.tv === null && e.lt < heute)
        .sort((a, b) => (a.lt - b.lt) || (this.text(a.anzeige) < this.text(b.anzeige) ? -1 : (this.text(a.anzeige) > this.text(b.anzeige) ? 1 : 0)));
},

/* Ø Verspätung der zu spät versandten ABs je Monat (Versand nach Liefertermin),
   letzte 12 Monate, dazu die Summe: { balken, summe: { versandt, spaet, mittel } } */
statVerspaetung: function (eintraege, heute) {

    const monate = this.letzteMonate(heute, 12);
    const schl = x => (Array.isArray(x) ? x.join("-") : this.tagTeile(x).slice(0, 2).join("-"));
    const je = {};
    monate.forEach(m => { je[schl(m)] = []; });
    let versandt = 0, spaet = 0;

    eintraege.forEach(e => {
        if (e.art !== "ab" || e.lt === null || e.tv === null || !(schl(e.tv) in je)) return;

        versandt++;
        if (e.tv > e.lt) {
            spaet++;
            je[schl(e.tv)].push(e.tv - e.lt);
        }
    });

    const alle = [].concat(...Object.values(je));
    const summe = { versandt: versandt, spaet: spaet, mittel: alle.length ? this.zahlEins(alle.reduce((a, b) => a + b, 0) / alle.length) : "–" };

    return {
        balken: this.statDurchschnitt(je, monate, schl, z => this.monatsNamen[z[1] - 1] + " " + String(z[0]).slice(2), "Tage", "neutral"),
        summe: summe
    };
},


/* ===========================================================================
   LISTE: die Karten-Liste von Dashboard, Forecast und Planung (R-DB1, R-F8)
   Eine Karte je AB mit Baugruppen und Teilen, gleiche Spalten in Kopfzeile
   und jeder Karte. Welche Spalten es gibt, legt die Ansicht in
   listeSpalten fest: [[Art, Titel]]. Arten:
     klapp, ab, bg, teil, kunde, station, lager, status, termin, proz,
     balken, stand, planung
   Die Ansicht rechnet (Sortieren, Filtern in 4A/4G/4H), diese Datei zeichnet.

   Zustand, den die Ansicht führt: abs, suche, kunde, ansichtWahl, sortierung,
   gemerkt (R-DB4), markenZeilen/marken (Planung), listeHeute (Tageszahl).
   OFFEN (Symolo): Der Klappzustand wird bisher nur solange gemerkt, wie das
   Fenster offen ist. Je Benutzer dauerhaft geht erst mit einer Tabelle
   (Benutzer, Ansicht, Schlüssel) und der Benutzer-Anbindung.
   =========================================================================== */

suche: "",
kunde: "Alle",
ansichtWahl: "bg",
sortierung: "ab",
zeitraum: "30",
gemerkt: {},

abs: [],
alleAbs: [],
markenZeilen: [],
marken: {},
listeHeute: 0,
listeSpalten: [],
listeStation: false,
imSwJeAb: {},

kopfEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
kundeEl: null,
sortEl: null,
terminEl: null,
ansichtKnoepfe: {},

/* ---------------------------------------------------------------------------
   Leiste: Suche, Knöpfe, Auswahlfelder
   felder: Reihenfolge, z. B. ["suche", "termin", "knoepfe", "kunde"]
   --------------------------------------------------------------------------- */

listeLeisteBauen: function (felder) {

    const leiste = this.el(this.koerper, "div", "kom-leiste");

    felder.forEach(f => {
        if (f === "suche") this.listeSucheBauen(leiste);

        if (f === "knoepfe") {
            const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
            this.dashAnsichten.forEach(([wert, titel]) => {
                this.ansichtKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
                    /* R-DB4: Ansicht umstellen = Startzustand der neuen Ansicht */
                    this.ansichtWahl = wert;
                    this.gemerkt = {};
                    this.zeichnen();
                });
            });
        }

        if (f === "sort") {
            this.sortEl = this.auswahlBauen(leiste, "Sortieren", this.listeSortierungen, this.sortierung, w => {
                this.sortierung = w;
                this.zeichnen();
            });
        }

        if (f === "termin") {
            this.terminEl = this.auswahlBauen(leiste, "Liefertermin",
                this.fcZeitraeume.map(z => [z[0], z[1]]), this.zeitraum, w => {
                    this.zeitraum = w;
                    this.zeichnen();
                });
        }

        if (f === "kunde") {
            this.kundeEl = this.auswahlBauen(leiste, "Kunde", [[this.dashAlleKunden, this.dashAlleKunden]], this.kunde, w => {
                this.kunde = w;
                this.zeichnen();
            });
        }
    });
},

listeSucheBauen: function (leiste) {

    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "AB-Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "Teil der AB-Nummer";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");
},

auswahlBauen: function (parent, titel, werte, wert, wechsel) {

    const feld = this.el(parent, "label", "kom-feld");
    this.el(feld, "span", "kom-feldname", titel);
    const sel = this.el(feld, "select", "kom-eingabe");
    this.auswahlFuellen(sel, werte, wert);
    sel.onchange = () => wechsel(sel.value);
    return sel;
},

auswahlFuellen: function (sel, werte, wert) {

    sel.replaceChildren();
    werte.forEach(([w, t]) => {
        const o = this.el(sel, "option", "", t);
        o.value = w;
    });
    sel.value = wert;
},

suchen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.zeichnen();
},

/* Filter zurücksetzen (Knopf "Alle zeigen"). */
alleZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.kunde = this.dashAlleKunden;
    if (this.terminEl) this.zeitraum = "alle";
    this.zeichnen();
},

/* Kunden aus den geladenen ABs; ein unbekannter Kunde zählt als "Alle".
   Stellt auch die Auswahl der Knöpfe ein. */
listeFelderEinstellen: function (abs) {

    const kunden = this.dashKunden(abs);
    const gleich = kunden.find(k => k.toLowerCase() === this.dashText(this.kunde));
    this.kunde = gleich || this.dashAlleKunden;
    this.auswahlFuellen(this.kundeEl, kunden.map(k => [k, k]), this.kunde);

    Object.keys(this.ansichtKnoepfe).forEach(w => {
        this.ansichtKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.ansichtWahl);
    });

    if (this.terminEl) this.auswahlFuellen(this.terminEl, this.fcZeitraeume.map(z => [z[0], z[1]]), this.zeitraum);
    if (this.sortEl) this.auswahlFuellen(this.sortEl, this.listeSortierungen, this.sortierung);
},

/* ---------------------------------------------------------------------------
   Liste zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

/* leerText: Satz, wenn es gar nichts gibt. gefiltert: Filter sind gesetzt. */
listeZeichnen: function (liste, leerText, gefiltert) {

    this.meldungEl.replaceChildren();
    this.listeEl.replaceChildren();

    if (liste.length === 0) {
        if (gefiltert) {
            this.meldungEl.textContent = "Keine Einträge" + (this.suche ? " für „" + this.suche + "“" : "") + ". ";
            this.knopf(this.meldungEl, "Alle zeigen", () => this.alleZeigen());
        } else {
            this.el(this.listeEl, "div", "kom-leer", leerText);
        }
        return;
    }

    /* Erst ohne Eltern bauen, dann auf einmal einhängen (schnell bei vielen Zeilen). */
    const inhalt = this.el(null, "div", "kom-liste-inhalt");
    this.kopfzeileBauen(inhalt);
    liste.forEach(d => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.karteZeichnen(karte, d);
    });
    this.listeEl.replaceChildren(inhalt);
},

/* ---------------------------------------------------------------------------
   Tabelle: gleiche Spalten in Kopfzeile und jeder Karte (R-DB1)
   --------------------------------------------------------------------------- */

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-dash " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.listeSpalten.forEach(([art]) => this.el(gruppe, "col", "kom-c-" + art));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.listeSpalten.forEach(([art, titel]) => {
        this.el(tr, "th", art === "proz" ? "kom-zahl" : (art === "lager" || art === "planung" ? "kom-mitte" : ""), titel);
    });
},

zelle: function (tr, wert, klasse, titel, spannt) {

    const td = this.el(tr, "td", klasse || "", wert);
    if (titel) td.title = this.text(titel);
    if (spannt) td.colSpan = spannt;
    return td;
},

statusZelle: function (tr, w) {

    const td = this.el(tr, "td");
    this.el(td, "span", "kom-statusmarke " + this.statusKlasse(w), w.status);
},

balkenZelle: function (tr, w) {

    const td = this.el(tr, "td");
    const balken = this.el(td, "div", "kom-balken");
    this.el(balken, "span").style.width = Math.round(w.prozent * 100) + "%";
    balken.title = this.prozentText(w.prozent);
},

/* R-F6: Liefertermin eines AB: Datum (überfällig als Hinweis) oder "kein Termin". */
terminZelle: function (tr, d) {

    const td = this.el(tr, "td");

    if (d.termin === null || d.termin === undefined) {
        this.el(td, "span", "kom-leise", "kein Termin");
        return;
    }

    this.el(td, "b", "", this.tagText(d.termin));
    if (d.termin < this.listeHeute) this.el(td, "span", "kom-klein", " überfällig");
},

/* Häkchen "Planung" (gemeinsam für Dashboard, Forecast, Planung). */
planungZelle: function (tr, d) {

    const td = this.el(tr, "td", "kom-mitte");
    const label = this.el(td, "label", "kom-haken");
    const box = this.el(label, "input");
    box.type = "checkbox";
    box.checked = Boolean(d.geplant);
    box.disabled = !this.schreibenErlaubt();
    box.title = box.disabled ? "Speichern noch gesperrt" : "Zur Planung vormerken";
    box.setAttribute("aria-label", this.text(d.a.o.ab_anzeige) + " zur Planung vormerken");
    box.onchange = () => { this.planungHaken(d, box); };
},

/* Häkchen setzen oder entfernen und neu zeichnen. */
planungHaken: async function (d, box) {

    const an = box.checked;
    box.disabled = true;

    const ok = await this.sicher(() => this.plSetzen(this.markenZeilen, this.text(d.a.o.ab_schluessel), an, this.alleAbs));
    if (ok === false) this.statusZeigen("Diesen Arbeitsauftrag gibt es nicht (mehr).", "fehler");

    if (ok !== null) {
        const zeilen = await this.sicher(() => this.plMarkenLaden());
        if (zeilen !== null) {
            this.markenZeilen = zeilen;
            this.marken = this.plAktive(zeilen);
        }
    }

    this.zeichnen();
},

/* Klappen merken (R-DB4) und diese Karte neu zeichnen. */
klappKnopf: function (td, offen, name, umschalten) {

    const b = this.el(td, "button", "kom-klapp", offen ? "▾" : "▸");
    b.type = "button";
    b.title = "Auf- oder zuklappen";
    b.setAttribute("aria-label", this.text(name) + " auf- oder zuklappen");
    b.onclick = umschalten;
},

nameKnopf: function (td, name, umschalten) {

    const b = this.el(td, "button", "kom-name", name);
    b.type = "button";
    b.onclick = umschalten;
},

/* Eine Zeile der Karte. art: "ab", "bg", "ohne" (Teile ohne Baugruppe), "teil".
   k: { knoten (mit o und w), d, g, klapp: { zeigen, offen, name, umschalten },
   name: Text oder null, namensZelle: Funktion(td) }. Die Zellen folgen
   listeSpalten; Namen und Klappknopf stehen über mehrere Spalten. */
zeileBauen: function (tr, art, k) {

    const s = this.listeSpalten.map(x => x[0]);
    const leer = (klasse, spannt) => this.zelle(tr, "", klasse, undefined, spannt);
    let i = 0;

    while (i < s.length) {
        const spalte = s[i];

        if (spalte === "klapp") {
            if (art === "teil") { leer("", 3); i += 3; continue; }
            const td = this.el(tr, "td");
            if (k.klapp) this.klappKnopf(td, k.klapp.offen, k.klapp.name, k.klapp.umschalten);
        } else if (spalte === "ab") {
            if (art === "ab") {
                const td = this.zelle(tr, "", "", this.text(k.knoten.o.ab_anzeige) + "   " + this.text(k.knoten.o.verkaufsartikel), 3);
                if (k.klapp) this.nameKnopf(td, k.knoten.o.ab_anzeige, k.klapp.umschalten);
                else this.el(td, "span", "kom-ab-nr", k.knoten.o.ab_anzeige);
                this.el(td, "span", "kom-ab-text", k.knoten.o.verkaufsartikel);
                i += 3;
                continue;
            }
            leer();
        } else if (spalte === "bg") {
            if (art === "bg" || art === "ohne" || art === "sw") {
                const td = this.zelle(tr, "", "", art === "bg" ? k.knoten.o.name : undefined, 2);
                if (art === "sw") td.textContent = this.text(k.sw.baugruppe);
                else if (art === "bg" && k.klapp) this.nameKnopf(td, k.knoten.o.name, k.klapp.umschalten);
                else if (art === "bg") td.textContent = this.text(k.knoten.o.name);
                else this.nameKnopf(td, "Teile ohne Baugruppe", k.klapp.umschalten);
                i += 2;
                continue;
            }
            leer();
        } else if (spalte === "teil") {
            const t = k.knoten;
            const td = this.zelle(tr, "", "", this.text(t.o.zeichnungsnummer) + "   " + this.text(t.o.benennung));
            this.el(td, "span", "kom-ab-nr", t.o.zeichnungsnummer);
            this.el(td, "span", "kom-ab-text", t.o.benennung);
        } else if (spalte === "kunde") {
            if (art === "ab") this.zelle(tr, k.knoten.o.kunde, "", k.knoten.o.kunde);
            else leer();
        } else if (spalte === "station") {
            const wert = art === "ab" ? k.d.station : (art === "bg" ? k.g.station : "");
            this.zelle(tr, wert || "");
        } else if (spalte === "lager") {
            let wert = "";
            if (this.listeStation) {
                if (art === "ab") wert = k.d.ort;
                if (art === "bg") wert = k.g.ort;
                if (art === "teil") wert = k.knoten.ort;
            } else if (art === "teil") {
                wert = this.text(k.knoten.o.lagerort);
            }
            this.zelle(tr, wert, "kom-mitte", wert);
        } else if (spalte === "status") {
            if (art === "sw") {
                const m = this.el(this.el(tr, "td"), "button", "kom-statusmarke kom-schweissen kom-statusknopf", "Schweißen");
                m.type = "button";
                m.title = "Im Schweißen ansehen";
                m.onclick = () => this.bereichOeffnen("schweissen", { suche: this.text(k.sw.ab_nr) });
            }
            else if (art === "ohne") leer();
            else this.statusZelle(tr, k.knoten.w);
        } else if (spalte === "termin") {
            if (art === "ab") this.terminZelle(tr, k.d);
            else leer();
        } else if (spalte === "proz") {
            if (art === "ohne" || art === "sw") leer();
            else this.zelle(tr, this.prozentText(k.knoten.w.prozent), "kom-zahl");
        } else if (spalte === "balken") {
            if (art === "ohne" || art === "sw") leer();
            else this.balkenZelle(tr, k.knoten.w);
        } else if (spalte === "stand") {
            if (art === "sw") leer();
            else if (art === "ohne") this.zelle(tr, k.g.teile.length + (k.g.teile.length === 1 ? " Teil" : " Teile"), "kom-leise");
            else this.zelle(tr, k.knoten.w.fortschritt);
        } else if (spalte === "planung") {
            if (art === "ab") this.planungZelle(tr, k.d);
            else leer("kom-mitte");
        }

        i++;
    }
},

karteZeichnen: function (karte, d) {

    karte.replaceChildren();

    const a = d.a;
    const tab = this.tabelleNeu(karte, d.ampel ? "kom-ampel kom-ampel-" + d.ampel : "");
    const koerper = this.el(tab, "tbody");
    const neu = () => this.karteZeichnen(karte, d);
    /* Baugruppen dieses AB, die einzeln im Schweißen liegen */
    const imSw = this.imSwJeAb[this.text(a.o.ab_schluessel)] || [];
    const abUmschalten = () => { d.offen = !d.offen; this.gemerkt[d.schluessel] = d.offen; neu(); };

    /* AB-Zeile: Nummer, Verkaufsartikel, Kunde */
    const tr = this.el(koerper, "tr", "kom-dab " + this.statusKlasse(a.w));
    this.zeileBauen(tr, "ab", {
        knoten: a, d: d,
        klapp: d.gruppen.length > 0 || imSw.length > 0 ? { offen: d.offen, name: a.o.ab_anzeige, umschalten: abUmschalten } : null
    });

    if (!d.offen) return;

    d.gruppen.forEach(g => {
        const gUmschalten = () => { g.offen = !g.offen; this.gemerkt[g.schluessel] = g.offen; neu(); };

        if (g.bg) {
            const btr = this.el(koerper, "tr", "kom-dbg");
            this.zeileBauen(btr, "bg", {
                knoten: g.bg, d: d, g: g,
                klapp: g.teile.length ? { offen: g.offen, name: g.bg.o.name, umschalten: gUmschalten } : null
            });
        } else {
            /* Teile ohne Baugruppe: eigene graue Zeile, damit man sie klappen kann */
            const otr = this.el(koerper, "tr", "kom-dbg kom-dohne");
            this.zeileBauen(otr, "ohne", {
                knoten: {}, d: d, g: g,
                klapp: { offen: g.offen, name: "Teile ohne Baugruppe", umschalten: gUmschalten }
            });
        }

        if (!g.offen) return;

        g.teile.forEach(t => {
            const ttr = this.el(koerper, "tr", "kom-dteil " + this.statusKlasse(t.w));
            this.zeileBauen(ttr, "teil", { knoten: t, d: d, g: g, klapp: null });
        });
    });

    imSw.forEach(z => {
        const str = this.el(koerper, "tr", "kom-dbg kom-dsw");
        this.zeileBauen(str, "sw", { knoten: {}, d: d, g: null, sw: z, klapp: null });
    });
},


/* ===========================================================================
   SCHWEISSEN EINTRAGEN (R-W6, R-W7)
   Nachbau von bestand/schweissen: hilfen.py (datum_aus_text), abgleich.py
   (abgleich_kern, abgleich_alle), mitarbeiter.py (setzen, Mitarbeiter-Liste,
   Plätze). Mitarbeiter, Arbeitsplatz und die zwei Termine werden an einer
   AB- oder BG-Zeile eingetragen und an alles darunter vererbt; ein Teil
   nimmt nie einen eigenen Eintrag an.

   Alles läuft über datenAendernViele (Folgeänderungen ohne Prüfung auf
   fremde Änderungen, wie bisher). Gelesen wird vor jeder Änderung frisch.
   Rechte fallen vorerst weg (Ben, 16.10.2026): jeder darf eintragen.
   =========================================================================== */

swTrenner: ", ",
swMaxName: 80,
swSonstiges: "Sonstiges",

/* Alle fünf Spalten, die der Abgleich anfasst: Feld, Anzeigename fürs Protokoll */
swEingaben: [
    ["mitarbeiter", "Zuweisung Mitarbeiter"],
    ["arbeitsplatz", "Zuweisung Arbeitsplatz"],
    ["liefertermin_stahlbau", "Liefertermin Stahlbau"],
    ["termin_versand", "Termin Versand"]
],

/* VBA Val(): führende Zahl, sonst 0. */
swVal: function (text) {

    const m = this.text(text).match(/^([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : 0;
},

/* BgVor: erst die Nummer, dann der Name (ohne Groß-/Kleinschreibung). */
swBgVergleich: function (a, b) {

    return (this.swVal(this.swBgNummer(a)) - this.swVal(this.swBgNummer(b))) ||
        (this.text(a).toLowerCase() < this.text(b).toLowerCase() ? -1 : (this.text(a).toLowerCase() > this.text(b).toLowerCase() ? 1 : 0));
},

/* ---------------------------------------------------------------------------
   R-W7 Datumseingabe
   --------------------------------------------------------------------------- */

swNurZiffern: function (s) {

    return s.length > 0 && s.length <= 8 && /^[0-9]+$/.test(s);
},

/* "15.10.2026", "15.10.26", "15.10", "151026", "15102026", "1510" (auch mit "/" oder "-").
   Gibt die Tageszahl zurück, null = ungültig. Jahr nur 2020 bis 2099, ungültige Tage
   (31.02.) werden abgelehnt. heute: Tageszahl (nur fürs Jahr, wenn es fehlt). */
swDatumAusText: function (text, heute) {

    const t = this.text(text).replace(/[/-]/g, ".");
    if (!t) return null;

    let d = 0, m = 0, y = 0;

    if (t.indexOf(".") > -1) {
        const p = t.split(".");
        if (p.length < 2 || p.length > 3) return null;

        const a = p[0].trim(), b = p[1].trim();
        if (!this.swNurZiffern(a) || !this.swNurZiffern(b)) return null;
        d = Number(a);
        m = Number(b);

        if (p.length === 3 && p[2].trim()) {
            if (!this.swNurZiffern(p[2].trim())) return null;
            y = Number(p[2].trim());
        }
    } else {
        if (!this.swNurZiffern(t)) return null;
        if (t.length === 4) {
            d = Number(t.slice(0, 2));
            m = Number(t.slice(2, 4));
        } else if (t.length === 6 || t.length === 8) {
            d = Number(t.slice(0, 2));
            m = Number(t.slice(2, 4));
            y = Number(t.slice(4));
        } else {
            return null;
        }
    }

    if (y === 0) y = this.tagTeile(heute === undefined ? this.tagHeute() : heute)[0];
    if (y < 100) y += 2000;
    if (y < 2020 || y > 2099 || m < 1 || m > 12 || d < 1 || d > 31) return null;

    const ms = Date.UTC(y, m - 1, d);
    const probe = new Date(ms);
    if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;

    return Math.floor(ms / 86400000);
},

/* Tageszahl -> Datum im Format von Symolo ("2026-10-16T00:00:00.0000000Z"). */
swTagIso: function (nr) {

    const [j, m, t] = this.tagTeile(nr);
    return j + "-" + String(m).padStart(2, "0") + "-" + String(t).padStart(2, "0") + "T00:00:00.0000000Z";
},

/* ---------------------------------------------------------------------------
   Mitarbeiter-Liste und Plätze
   --------------------------------------------------------------------------- */

/* "Anna, Bernd" -> ["Anna", "Bernd"] (ohne Doppelte, ohne "(verschieden)"). */
swMitarbeiterListe: function (text) {

    const aus = [], gesehen = {};

    this.text(text).split(",").forEach(n => {
        const name = n.split(/\s+/).filter(Boolean).join(" ");
        if (name && name !== this.swVerschieden && !gesehen[name.toLowerCase()]) {
            gesehen[name.toLowerCase()] = true;
            aus.push(name);
        }
    });

    return aus;
},

/* Alle Namen der Liste (aktive), alphabetisch. Zeilen für Eintragen und Austragen: swMitarbeiterZeilen. */
swMitarbeiterZeilen: async function () {

    return this.datenLesen("mitarbeiter", { aufloesen: false });
},

swIstAktiv: function (z) {

    return z.aktiv === null || z.aktiv === undefined || z.aktiv === "" || this.istJa(z.aktiv);
},

swMitarbeiterNamen: async function () {

    const zeilen = await this.swMitarbeiterZeilen();
    return zeilen.filter(z => this.swIstAktiv(z)).map(z => this.text(z.name))
        .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0)));
},

/* Neuer Name. Ein ausgetragener Name kommt wieder in die Liste (gelöscht wird nie). Gibt den Namen zurück. */
swMitarbeiterNeu: async function (name) {

    const n = this.text(name.replace(/,/g, " ")).split(/\s+/).filter(Boolean).join(" ");
    if (!n) throw new Error("Bitte einen Namen eintragen.");
    if (n.length > this.swMaxName) throw new Error("Der Name ist zu lang (höchstens " + this.swMaxName + " Zeichen).");
    if (n === this.swVerschieden) throw new Error("„(verschieden)“ ist kein Name.");

    const zeilen = await this.swMitarbeiterZeilen();
    const da = zeilen.find(z => this.text(z.name).toLowerCase() === n.toLowerCase());

    if (da && this.swIstAktiv(da)) throw new Error(n + " steht schon in der Liste.");
    if (da) await this.datenAendern("mitarbeiter", da, { aktiv: true }, { ohnePruefung: true });
    else await this.datenAnlegen("mitarbeiter", { name: n, aktiv: true });

    await this.protokollSchreiben("schweissen", "", "Mitarbeiterliste", "", n);
    return n;
},

/* Name austragen: er bleibt in der Datenbank (aktiv = nein), eingetragene Zuweisungen bleiben stehen. */
swMitarbeiterWeg: async function (name) {

    const zeilen = await this.swMitarbeiterZeilen();
    const m = zeilen.find(z => this.swIstAktiv(z) && this.text(z.name).toLowerCase() === this.text(name).toLowerCase());
    if (!m) throw new Error("Dieser Name steht nicht (mehr) in der Liste.");

    await this.datenAendern("mitarbeiter", m, { aktiv: false }, { ohnePruefung: true });
    await this.protokollSchreiben("schweissen", "", "Mitarbeiterliste", this.text(m.name), "ausgetragen");
    return this.text(m.name);
},

/* R-AP1: Platzliste in der Reihenfolge der Nummer (zugleich Auswahl "Zuweisung Arbeitsplatz"). */
swPlaetzeLaden: async function () {

    const liste = await this.datenLesen("arbeitsplatz", { aufloesen: false });
    return liste.sort((a, b) => (this.mengeMilli(a.reihenfolge) - this.mengeMilli(b.reihenfolge)) || this.idVergleich(a._id, b._id));
},

/* ApGleich: ohne Leerzeichen, Bindestriche, Schrägstriche und Punkte, ohne Groß-/Kleinschreibung. */
swPlatzKern: function (text) {

    return this.text(text).replace(/[ \-/.]/g, "").toLowerCase();
},

/* "AP 05" = "AP05": der Name aus der Platzliste (R-AP1) oder null. */
swPlatzFinden: function (text, plaetze) {

    const k = this.swPlatzKern(text);
    if (!k) return null;
    if (k === this.swSonstiges.toLowerCase()) return this.swSonstiges;

    const p = plaetze.find(x => this.swPlatzKern(x.name) === k);
    return p ? this.text(p.name) : null;
},

/* Text -> Wert zum Speichern. Mitarbeiter: freier Text, mehrere mit Komma. Arbeitsplatz: aus der Liste,
   "" = entfernen. Termine: Tageszahl (R-W7), "" = entfernen (null). */
swEingabePruefen: function (feld, text, plaetze) {

    const t = this.text(text);

    if (feld === "mitarbeiter") {
        if (t === this.swVerschieden) throw new Error("„(verschieden)“ kann man nicht eintragen.");
        const aus = this.swMitarbeiterListe(t).join(this.swTrenner);
        if (aus.length > 200) throw new Error("Es sind zu viele Namen gewählt (höchstens 200 Zeichen zusammen).");
        return aus;
    }

    if (feld === "arbeitsplatz") {
        if (t === "" || t === "0") return "";
        const name = this.swPlatzFinden(t, plaetze);
        if (name === null) throw new Error("„" + t + "“ ist kein Arbeitsplatz. Bitte einen aus der Liste wählen.");
        return name;
    }

    if (this.swDatumsfelder.indexOf(feld) > -1) {
        if (t === "") return null;
        const tag = this.swDatumAusText(t);
        if (tag === null) {
            throw new Error("„" + t + "“ ist kein gültiges Datum (z. B. 15.10.2026, 15.10. oder 151026; Jahr 2020 bis 2099).");
        }
        return this.swTagIso(tag);
    }

    throw new Error("Unbekanntes Feld.");
},

/* Wert fürs Protokoll: leer = "leer", Datum = TT.MM.JJJJ. */
swWertText: function (wert) {

    const t = this.text(wert);
    if (t === "") return "leer";

    const tag = this.tagNr(t);
    return tag === null ? t : this.tagText(tag);
},

swAnzeigename: function (z) {

    if (z.ebene === "AB") return this.text(z.anzeige);
    if (z.ebene === "BG") return this.text(z.anzeige) + " / " + this.text(z.baugruppe);
    return this.text(z.zeichnungsnummer);
},

/* ---------------------------------------------------------------------------
   R-W6 Vererbung (Nachbau von AbgleichKern)
   --------------------------------------------------------------------------- */

/* ebene[i] = AB/BG/Teil, ab[i] = echter AB (ABNr), w[i] = [Mitarbeiter, Arbeitsplatz, Liefertermin, Termin Versand].
   geaendert: Menge von "i|k" (an der AB-Zeile i wurde Eingabe k eben geändert).
     AB geändert   -> Wert an alle BGs und Teile des AB
     Baugruppe     -> Wert an ihre Teile; AB = gemeinsamer Wert aller BGs, sonst "(verschieden)"
     Teil geändert -> zurück auf den Wert der BG
   Einzelblöcke (BG ohne AB-Zeile) vererben nur innerhalb ihres Blocks. Ändert w an Ort und Stelle. */
swAbgleichKern: function (ebene, ab, w, geaendert) {

    const n = ebene.length;
    const hat = (i, k) => Boolean(geaendert) && geaendert.has(i + "|" + k);

    for (let i = 0; i < n; i++) {
        if (ebene[i] !== "AB") continue;
        for (let k = 0; k < 4; k++) {
            if (hat(i, k) && this.swT(w[i][k]) !== this.swVerschieden) {
                for (let j = 0; j < n; j++) {
                    if (j !== i && this.swGleich(ab[j], ab[i])) w[j][k] = w[i][k];
                }
            }
        }
    }

    for (let i = 0; i < n; i++) {
        const e = ebene[i];
        if (e !== "AB" && e !== "BG") continue;

        let j = i + 1;
        while (j < n) {
            if (ebene[j] !== "Teil" || !this.swGleich(ab[j], ab[i])) break;
            for (let k = 0; k < 4; k++) {
                if (e === "BG") w[j][k] = w[i][k];
                else if (this.swT(w[i][k]) !== this.swVerschieden) w[j][k] = w[i][k];
            }
            j++;
        }
    }

    this.swAbAbleiten(ebene, ab, w);
},

/* Zeilen in der Reihenfolge nr (nach ID bei gleicher Nummer). */
swNachNr: function (zeilen) {

    return zeilen.slice().sort((a, b) => (this.mengeMilli(a.nr) - this.mengeMilli(b.nr)) || this.idVergleich(a._id, b._id));
},

/* Was sich beim Speichern ändert: "(verschieden)" wird nie gespeichert. Gibt
   [{ zeile, werte }] zurück, nur für Zeilen mit anderen Werten. */
swAenderungen: function (zeilen, w) {

    const aus = [];

    zeilen.forEach((z, i) => {
        const werte = {};

        this.swFelder.forEach((f, k) => {
            const datum = this.swDatumsfelder.indexOf(f) > -1;
            let v = w[i][k];

            if (v === this.swVerschieden) v = datum ? null : "";
            if ((v === null || v === undefined || v === "") && !datum) v = "";
            if ((v === "" || v === undefined) && datum) v = null;

            const alt = z[f];
            const gleich = datum
                ? (v === null ? this.swT(alt) === "" : this.swT(alt) === this.swT(v))
                : this.text(alt) === this.text(v);

            if (!gleich) werte[f] = v;
        });

        if (Object.keys(werte).length) aus.push({ zeile: z, werte: werte });
    });

    return aus;
},

/* Alle Zeilen im Schweißen angleichen (SwAbgleich). zeilen = swLesen(); geaendert wie oben, aber mit
   Zeilen-IDs: [[_id, k]]. Gibt die nötigen Änderungen zurück (noch nicht geschrieben). */
swAbgleichBerechnen: function (zeilen, geaendert) {

    const liste = this.swNachNr(zeilen);
    const w = this.swWerte(liste);

    /* gespeicherter Stand wie in Excel ("verschieden") */
    this.swAbAbleiten(liste.map(z => z.ebene), liste.map(z => z.ab_nr), w);

    const index = {};
    liste.forEach((z, i) => { index[String(z._id)] = i; });
    const menge = new Set();
    (geaendert || []).forEach(([id, k]) => { if (String(id) in index) menge.add(index[String(id)] + "|" + k); });

    this.swAbgleichKern(liste.map(z => z.ebene), liste.map(z => z.ab_nr), w, menge);

    return this.swAenderungen(liste, w);
},

/* Änderungen schreiben (je acht gleichzeitig). */
swAenderungenSchreiben: async function (aenderungen) {

    await this.datenAendernViele(aenderungen.map(a => ({ name: "schweisszeile", zeile: a.zeile, werte: a.werte })));
},

/* Alle Zeilen angleichen und die Änderungen speichern. */
swAbgleichen: async function (geaendert) {

    const zeilen = await this.swLesen();
    await this.swAenderungenSchreiben(this.swAbgleichBerechnen(zeilen, geaendert));
},

/* ---------------------------------------------------------------------------
   R-W6 Eintragen
   --------------------------------------------------------------------------- */

/* Eintrag an einer AB- oder BG-Zeile; wird an alles darunter vererbt. Ein Teil nimmt keinen Eintrag an.
   zeilen = frisch gelesen (swLesen). Gibt { zeile, alt, neu, aenderungen } zurück (noch nicht geschrieben). */
swSetzenBerechnen: function (zeilen, zeileId, feld, text, plaetze) {

    const k = this.swFelder.indexOf(feld);
    if (k < 0) throw new Error("Unbekanntes Feld.");

    const z = zeilen.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");
    if (z.ebene === "Teil") {
        throw new Error("Einzelteile übernehmen den Eintrag ihrer Baugruppe. Bitte bei der Baugruppe oder beim AB eintragen.");
    }

    const wert = this.swEingabePruefen(feld, text, plaetze);

    const liste = this.swNachNr(zeilen);
    const ebene = liste.map(x => x.ebene), ab = liste.map(x => x.ab_nr);
    const w = this.swWerte(liste);
    this.swAbAbleiten(ebene, ab, w);

    const i = liste.findIndex(x => String(x._id) === String(z._id));
    const alt = w[i][k];
    w[i][k] = wert;

    this.swAbgleichKern(ebene, ab, w, z.ebene === "AB" ? new Set([i + "|" + k]) : new Set());

    return { zeile: z, alt: this.swWertText(alt), neu: this.swWertText(wert), aenderungen: this.swAenderungen(liste, w) };
},

/* Speichern ohne Rechtekontrolle (vorerst keine Rechte). Gibt { zeile, alt, neu, name } zurück und schreibt
   ins Protokoll, wenn sich etwas geändert hat. */
swSetzen: async function (zeileId, feld, text) {

    const [zeilen, plaetze] = await Promise.all([this.swLesen(), this.swPlaetzeLaden()]);
    const r = this.swSetzenBerechnen(zeilen, zeileId, feld, text, plaetze);

    await this.swAenderungenSchreiben(r.aenderungen);

    const name = this.swEingaben.find(e => e[0] === feld)[1];
    if (r.alt !== r.neu) {
        await this.protokollSchreiben("schweissen", r.zeile.ab_nr, name + ": " + this.swAnzeigename(r.zeile), r.alt, r.neu);
    }

    return { zeile: r.zeile, alt: r.alt, neu: r.neu, name: name };
},


/* ===========================================================================
   SCHWEISSEN: ENTNEHMEN, ZUSAMMENFASSEN, ARCHIVIEREN, ZURÜCK (R-W2, R-W3,
   R-W8, R-W9)
   Nachbau von bestand/schweissen/vorgaenge.py. Alles läuft über die
   Datenschicht (datenAnlegen, datenAendern). Gelöscht wird nie (Ben,
   16.10.2026); statt Löschen gilt:

   Entnehmen:  Die Zeilen werden als Kopien in schweisszeile angelegt. Das
               Original bleibt stehen und wird nur ausgeblendet:
               - ganzer AB:   auftrag.bereich = "schweissen"
               - eine BG:     baugruppe und ihre Teile bekommen archiviert = ja
   Zurück:     Die Zeilen aus schweisszeile bauen den AB (oder die BG) in der
               Bestandsliste neu auf (wie bisher, nicht aus den ausgeblendeten
               Originalen). Die Kopien in schweisszeile bekommen archiviert = ja
               und zurueckgeholt = ja; so zählen sie weder im Archiv noch in
               der Statistik.
               OFFEN (Symolo): Die ausgeblendeten Originale und die
               zurückgeholten Zeilen bleiben in der Datenbank. Aufräumen kann
               nur die IT.
   Archivieren: Alle Zeilen des AB bekommen archiviert = ja; dazu gibt es einen
               Kopf (auftrag, bereich "archiv") für das Archiv.
   Nichts davon ist eine Transaktion. OFFEN (Symolo): Gibt es Transaktionen
   oder ein Sammelanlegen? Bis dahin werden die Schritte nacheinander
   geschrieben, die Originale zuletzt ausgeblendet.
   =========================================================================== */

/* R-W4: Spalten, die aus der Bestandsliste kopiert werden (wie archivUebernehmen) */
swKopierFelder: ["zeichnungsnummer", "benennung", "menge_bg", "index", "lk_nummer", "arbeitsgang", "material", "profil",
    "abmasse", "bemerkung", "lagerort"],

/* Nächste freie Nummer (Reihenfolge nr). */
swNaechsteNr: function (zeilen) {

    return zeilen.reduce((m, z) => Math.max(m, this.mengeMilli(z.nr) / 1000), 0) + 1;
},

/* Kopfdaten des AB, wie sie zum Zurückholen mitgespeichert werden. */
swKopfVon: function (o) {

    const j = {};
    ["kunde", "haupt_ab", "verkaufsartikel", "ersteller", "datum_liste", "dispoliste", "quelldatei"]
        .forEach(f => { j[f] = this.text(o[f]); });
    j.reihenfolge = o.reihenfolge === null || o.reihenfolge === undefined || o.reihenfolge === "" ? null : Number(o.reihenfolge);
    j.forecast_schluessel = this.text(o.forecast_schluessel);
    return JSON.stringify(j);
},

/* Eine leere Zeile mit allen Feldern der Tabelle schweisszeile. */
swLeereZeile: function () {

    return {
        nr: 0, ab_nr: "", ab_schluessel: "", anzeige: "", ebene: "", baugruppe: "", zeichnungsnummer: "", benennung: "",
        menge_bg: "", menge_gesamt: "", index: "", lk_nummer: "", arbeitsgang: "", material: "", profil: "", abmasse: "",
        bemerkung: "", vorhanden: "", lagerort: "", status: "", fortschritt: "", eingelagert: null, komplett: null,
        entnommen: null, mitarbeiter: "", arbeitsplatz: "", liefertermin_stahlbau: null, termin_versand: null,
        kopf: "{}", ap_geteilt: false, archiviert: false, zurueckgeholt: false
    };
},

/* ---------------------------------------------------------------------------
   R-W2 Entnehmen
   --------------------------------------------------------------------------- */

swPlanName: function (p) {

    const ab = this.text(p.a.o.ab_anzeige);
    return p.bg === null ? "AB " + ab : "Baugruppe " + this.text(p.bg.o.name) + " (" + ab + ")";
},

/* Sicherheitsfrage wie in Excel. */
swPlanFrage: function (p) {

    if (p.bg === null) {
        return "AB " + this.text(p.a.o.ab_anzeige) + " mit " + p.nBg + " Baugruppe(n) und " + p.nTeil +
            " Teil(en) ins Blatt Schweißen verschieben?";
    }
    return this.swPlanName(p) + " mit " + p.nTeil + " Teil(en) ins Blatt Schweißen verschieben?";
},

/* Wie die Zeilen im Schweißen heißen: "AB…" oder "AB…_BGnnn". */
swPlanAnzeige: function (p) {

    const ab = this.text(p.a.o.ab_anzeige);
    return p.bg === null || p.mitAb ? ab : ab + "_BG" + this.swBgNummer(p.bg.o.name);
},

/* R-W2: nur ganze ABs oder BGs mit Status Komplett. Liest den AB frisch aus der Datenbank.
   Wirft eine Meldung wie in Excel. */
swEntnehmenPruefen: async function (abId, bgId) {

    const baum = await this.bestandLaden([abId]);
    const a = baum.length ? baum[0] : null;
    if (a === null) throw new Error("Dieser Arbeitsauftrag ist nicht (mehr) in der Bestandsliste.");

    let bg = null;
    if (bgId !== null && bgId !== undefined) {
        bg = a.bgs.find(b => String(b.o._id) === String(bgId)) || null;
        if (bg === null) throw new Error("Diese Baugruppe ist nicht (mehr) in der Bestandsliste.");
    }

    const ziel = bg || a;
    if (ziel.w.status !== "Komplett") {
        const name = bg === null ? "AB " + this.text(a.o.ab_anzeige)
            : "Baugruppe " + this.text(bg.o.name) + " (" + this.text(a.o.ab_anzeige) + ")";
        throw new Error("Nur ABs und Baugruppen mit Status „Komplett“ können entnommen werden. " + name + ": " + ziel.w.status);
    }

    if (bg === null) return { a: a, bg: null, mitAb: true, nBg: a.bgs.length, nTeil: this.bestandTeile(a).length };

    /* letzte BG: der AB kommt mit (R-W3) */
    return { a: a, bg: bg, mitAb: a.bgs.length === 1 && a.ohne.length === 0, nBg: 0, nTeil: bg.teile.length };
},

/* Eine Zeile (BG oder Teil) für das Schweißen. */
swZeileNeu: function (nr, a, anzeige, ebene, bgName, o, w, heute, kopf, vorhanden) {

    const z = this.swLeereZeile();

    this.swKopierFelder.forEach(f => { z[f] = this.text(o[f]); });
    Object.assign(z, {
        nr: nr, ab_nr: this.text(a.o.ab_anzeige), ab_schluessel: this.text(a.o.ab_schluessel), anzeige: anzeige,
        ebene: ebene, baugruppe: bgName, menge_gesamt: this.sollText(o), vorhanden: vorhanden,
        status: w.status, fortschritt: w.fortschritt, eingelagert: this.text(w.eingelagert) || null,
        komplett: this.text(w.komplett) || null, entnommen: heute, kopf: kopf
    });
    return z;
},

/* Die Zeilen für das Schweißen in der Reihenfolge der Bestandsliste (Teile ohne BG vorn). */
swZeilenKopieren: function (p, nr, heute) {

    const a = p.a, ab = a.o;
    const anzeige = this.swPlanAnzeige(p);
    const kopf = this.swKopfVon(ab);
    const zeilen = [];

    const teil = (t, bgName) => this.swZeileNeu(nr + zeilen.length, a, anzeige, "Teil", bgName, t.o, t.w, heute, kopf,
        this.mengeGleich(t.o.vorhanden, null) ? "" : this.zahlText(this.mengeMilli(t.o.vorhanden)));

    const bgZeilen = b => {
        zeilen.push(this.swZeileNeu(nr + zeilen.length, a, anzeige, "BG", this.text(b.o.name), b.o, b.w, heute, kopf, ""));
        b.teile.forEach(t => zeilen.push(teil(t, this.text(b.o.name))));
    };

    if (p.bg === null || p.mitAb) {
        /* AB-Zeile (R-D2: wie in Excel "Kunde: …" usw.) */
        const z = this.swLeereZeile();
        Object.assign(z, {
            nr: nr, ab_nr: this.text(ab.ab_anzeige), ab_schluessel: this.text(ab.ab_schluessel), anzeige: anzeige,
            ebene: "AB", zeichnungsnummer: this.text(ab.ab_anzeige), benennung: this.text(ab.verkaufsartikel),
            lagerort: this.text(ab.lagerort), status: a.w.status, fortschritt: a.w.fortschritt,
            eingelagert: this.text(a.w.eingelagert) || null, komplett: this.text(a.w.komplett) || null,
            entnommen: heute, kopf: kopf
        });
        for (const feld in this.archivKopfEtiketten) {
            const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
            const wert = this.text(ab[quelle]);
            z[feld] = wert ? vorsatz + wert : "";
        }
        zeilen.push(z);
    }

    if (p.bg === null) {
        a.ohne.forEach(t => zeilen.push(teil(t, this.archivOhneBg)));
        a.bgs.forEach(bgZeilen);
    } else {
        bgZeilen(p.bg);
    }

    return zeilen;
},

/* R-W2/R-W3: AB oder BG ins Schweißen kopieren, in der Bestandsliste ausblenden. Die letzte BG nimmt die
   AB-Zeile mit; dann werden alle Zeilen des AB zusammengefasst. Entnommen = heute; Mitarbeiter,
   Arbeitsplatz, Termine leer. Gibt den Plan zurück. */
swEntnehmen: async function (abId, bgId) {

    const p = await this.swEntnehmenPruefen(abId, bgId);
    const heute = this.heuteText();

    const vorhanden = await this.swLesen();
    const neu = this.swZeilenKopieren(p, this.swNaechsteNr(vorhanden), heute);

    /* erst kopieren, dann ausblenden */
    await this.jeAcht(neu, z => this.datenAnlegen("schweisszeile", z));

    const ganz = p.bg === null || p.mitAb;
    if (ganz) {
        await this.datenAendern("auftrag", p.a.o, { bereich: "schweissen" }, { ohnePruefung: true });
    } else {
        const aufgaben = [{ name: "baugruppe", zeile: p.bg.o, werte: { archiviert: true } }];
        p.bg.teile.forEach(t => aufgaben.push({ name: "teil", zeile: t.o, werte: { archiviert: true } }));
        await this.datenAendernViele(aufgaben);
    }

    if (ganz) await this.swZusammenfassen(this.text(p.a.o.ab_schluessel));
    await this.swAbgleichen();

    await this.protokollSchreiben("entnommen", p.a.o.ab_anzeige, p.bg === null ? "" : "BG " + this.text(p.bg.o.name),
        "Bestandsliste", "Schweißen");
    return p;
},

/* Zeilen eines AB (in Reihenfolge) -> { abz: AB-Zeilen, ohne: Teile ohne BG, bgs: [{ bg, teile }] } */
swGruppen: function (zeilen) {

    const g = { abz: [], ohne: [], bgs: [] };

    zeilen.forEach(z => {
        if (z.ebene === "AB") g.abz.push(z);
        else if (z.ebene === "BG") g.bgs.push({ bg: z, teile: [] });
        else if (g.bgs.length) g.bgs[g.bgs.length - 1].teile.push(z);
        else g.ohne.push(z);
    });

    return g;
},

/* R-W3 (SwZusammenfassen): alle Zeilen eines AB unter der AB-Zeile zusammenfassen: AB-Zeile, Teile ohne BG,
   dann die BGs nach Nummer (Teile bleiben hinter ihrer BG); Anzeige wieder "AB…". Mitarbeiter, Plätze, Termine
   und das Entnommen-Datum jeder Zeile bleiben. Die Zeilen stehen danach am Ende der Liste. */
swZusammenfassen: async function (schluessel) {

    const alle = await this.swLesen();
    const zeilen = this.swNachNr(alle.filter(z => this.text(z.ab_schluessel) === schluessel));
    if (!zeilen.length) return;

    const g = this.swGruppen(zeilen);
    g.bgs.sort((p, q) => this.swBgVergleich(p.bg.baugruppe, q.bg.baugruppe));

    let ordnung = g.abz.concat(g.ohne);
    g.bgs.forEach(x => { ordnung = ordnung.concat([x.bg], x.teile); });

    const nr = this.swNaechsteNr(alle);
    await this.datenAendernViele(ordnung.map((z, i) => ({
        name: "schweisszeile", zeile: z, werte: { nr: nr + i, anzeige: this.text(z.ab_nr) }
    })));
},

/* ---------------------------------------------------------------------------
   R-W8 Archivieren
   --------------------------------------------------------------------------- */

/* R-I10: Liegt der AB (Vergleich nach R-AB3) schon ganz oder teilweise im Bereich Schweißen? */
swHatAb: async function (ab) {

    return this.text(ab) !== "" && this.swHatSchluessel(this.abSchluessel(ab));
},

swHatSchluessel: async function (schluessel) {

    const da = await this.datenLesen("schweisszeile", { wo: { ab_schluessel: schluessel }, aufloesen: false, felder: ["ab_schluessel"] });
    return da.length > 0;
},

/* Nur ganze ABs (AB-Zeile). Gibt { z, n } zurück (n = Zahl der Zeilen) oder wirft eine Meldung wie in Excel. */
swArchivierenPruefen: async function (zeileId) {

    const alle = await this.swLesen();
    const z = alle.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");

    if (z.ebene === "BG" && this.text(z.anzeige).toUpperCase().indexOf("_BG") > -1) {
        throw new Error("Diese Baugruppe kann erst archiviert werden, wenn der ganze AB im Blatt Schweißen liegt.");
    }
    if (z.ebene !== "AB") throw new Error("Archiviert werden nur ganze ABs: bitte in der AB-Zeile archivieren.");

    return { z: z, n: alle.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)).length, alle: alle };
},

/* R-W8: alle Zeilen des AB ins Archiv (Herkunft "Archiviert aus Schweißen"), im Schweißen ausblenden.
   Mitarbeiter, Plätze und Termine werden so festgehalten, wie sie angezeigt wurden ("(verschieden)" bleibt Text;
   bei Terminen steht dann nichts). Gibt { ab, n } zurück. */
swArchivieren: async function (zeileId) {

    const { z, alle: live } = await this.swArchivierenPruefen(zeileId);
    const zeilen = this.swNachNr(live.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)));

    const w = this.swWerte(zeilen);
    this.swAbAbleiten(zeilen.map(x => x.ebene), zeilen.map(x => x.ab_nr), w);

    const abZeile = zeilen.find(x => x.ebene === "AB");
    const k = abZeile.kopfObj || {};
    const jetzt = this.zeitJetzt();

    /* Kopf fürs Archiv: einen früheren Kopf des AB wiederverwenden, sonst neu anlegen. */
    const kopfWerte = {
        ab_anzeige: this.text(abZeile.ab_nr), ab_schluessel: this.text(abZeile.ab_schluessel),
        kunde: this.text(k.kunde), verkaufsartikel: this.text(k.verkaufsartikel),
        quelldatei: this.text(k.quelldatei), reihenfolge: k.reihenfolge === undefined ? null : k.reihenfolge,
        regal_geteilt: false, bereich: "archiv", archiviert: true, archiviert_am: jetzt,
        archiv_herkunft: this.archivHerkunftSchweissen, archiv_status: this.text(abZeile.status)
    };
    const koepfe = await this.datenLesen("auftrag", {
        wo: { ab_schluessel: kopfWerte.ab_schluessel, bereich: "archiv" }, archiv: "alle", aufloesen: false
    });
    const frei = koepfe.find(x => !this.istJa(x.archiviert));
    if (frei) await this.datenAendern("auftrag", frei, kopfWerte, { ohnePruefung: true });
    else await this.datenAnlegen("auftrag", kopfWerte);

    await this.datenAendernViele(zeilen.map((x, i) => {
        const datum = v => (v === this.swVerschieden ? null : (v === undefined ? null : v));
        return {
            name: "schweisszeile", zeile: x, werte: {
                mitarbeiter: this.text(w[i][0]), arbeitsplatz: this.text(w[i][1]),
                liefertermin_stahlbau: datum(w[i][2]), termin_versand: datum(w[i][3]), archiviert: true
            }
        };
    }));

    await this.protokollSchreiben("archiviert", this.text(abZeile.ab_nr), "", zeilen.length + " Zeilen", "Archiv");
    return { ab: this.text(abZeile.ab_nr), n: zeilen.length };
},

/* Kopfdaten für die Zeilen eines wiederhergestellten AB: was in den Zeilen steht, ergänzt aus dem Kopf. */
swKopfAusZeilen: function (zeilen, kopf) {

    const abZeile = zeilen.find(x => x.ebene === "AB");
    let j = {};
    for (const x of zeilen) {
        try { j = JSON.parse(this.text(x.kopf) || "{}") || {}; } catch (fehler) { j = {}; }
        if (Object.keys(j).length) break;
    }

    const setzen = (f, wert) => { if (j[f] === undefined || j[f] === null || j[f] === "") j[f] = wert; };
    setzen("kunde", this.text(kopf.kunde));
    setzen("verkaufsartikel", this.text(kopf.verkaufsartikel));
    setzen("quelldatei", this.text(kopf.quelldatei));
    setzen("reihenfolge", kopf.reihenfolge === undefined ? null : kopf.reihenfolge);
    setzen("forecast_schluessel", this.abForecastSchluessel(this.text(kopf.ab_anzeige)));

    if (abZeile) {
        for (const feld in this.archivKopfEtiketten) {
            const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
            const t = this.text(abZeile[feld]);
            setzen(quelle, t.indexOf(vorsatz) === 0 ? this.text(t.slice(vorsatz.length)) : t);
        }
    }

    return JSON.stringify(j);
},

/* Wiederherstellen eines aus dem Schweißen archivierten AB: die Zeilen kommen mit allen Angaben zurück ins
   Schweißen. kopf = Zeile aus archivLaden. Gibt die Zahl der Zeilen zurück. */
swAusArchiv: async function (kopf) {

    const name = this.text(kopf.ab_anzeige);
    const schluessel = this.text(kopf.ab_schluessel) || this.abSchluessel(name);

    if (await this.swHatSchluessel(schluessel)) {
        throw new Error(name + " liegt schon wieder im Schweißen. Erst dort archivieren, dann wiederherstellen.");
    }

    const archiviert = await this.datenLesen("schweisszeile", { wo: { ab_schluessel: schluessel }, archiv: "nur", aufloesen: false });
    const zeilen = this.swNachNr(archiviert.filter(x => !this.istJa(x.zurueckgeholt)));
    if (!zeilen.length) throw new Error("Für " + name + " gibt es keine Zeilen im Archiv.");

    const alle = await this.swLesen();
    const nr = this.swNaechsteNr(alle);
    const kopfText = this.swKopfAusZeilen(zeilen, kopf);
    const ohneVerschieden = v => (this.text(v) === this.swVerschieden ? "" : this.text(v));

    await this.datenAendernViele(zeilen.map((x, i) => ({
        name: "schweisszeile", zeile: x, werte: {
            nr: nr + i, anzeige: this.text(x.ab_nr) || name, archiviert: false,
            mitarbeiter: ohneVerschieden(x.mitarbeiter), arbeitsplatz: ohneVerschieden(x.arbeitsplatz),
            liefertermin_stahlbau: this.tagNr(x.liefertermin_stahlbau) === null ? null : x.liefertermin_stahlbau,
            termin_versand: this.tagNr(x.termin_versand) === null ? null : x.termin_versand, kopf: kopfText
        }
    })));

    /* Der Kopf im Archiv wird nicht mehr gebraucht; er bleibt stehen, ist aber nicht mehr archiviert
       (bereich "archiv": die Bestandsliste liest ihn nie). */
    await this.datenAendern("auftrag", kopf, { archiviert: false, archiviert_am: null }, { ohnePruefung: true });

    await this.swAbgleichen();
    await this.protokollSchreiben("wiederhergestellt", name, "", "Archiv", "Schweißen");
    return zeilen.length;
},

/* ---------------------------------------------------------------------------
   R-W9 Zurück in die Bestandsliste
   --------------------------------------------------------------------------- */

swRueckName: function (r) {

    const z = r.zeile;
    return z.ebene === "AB" ? "AB " + this.text(z.ab_nr) : "Baugruppe " + this.text(z.baugruppe) + " (" + this.text(z.ab_nr) + ")";
},

swRueckFrage: function (r) {

    const z = r.zeile;
    if (z.ebene === "AB") return "AB " + this.text(z.ab_nr) + " mit allen Baugruppen zurück in die Bestandsliste schieben?";

    let text = "Baugruppe " + this.text(z.baugruppe) + " (" + this.text(z.ab_nr) + ") zurück in die Bestandsliste schieben?";
    if (r.mitAb) text += " Die AB-Zeile geht mit zurück, die übrigen Baugruppen bleiben einzeln im Schweißen.";
    return text;
},

swRueckVerlust: "Mengen, Lagerort und Daten kommen mit. Mitarbeiter, Arbeitsplatz, Termine und das Entnahmedatum gehen verloren.",

/* Gibt { zeile, auswahl, mitAb } zurück oder wirft eine Meldung. */
swZurueckPruefen: async function (zeileId) {

    const live = await this.swLesen();
    const z = live.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");
    if (z.ebene !== "AB" && z.ebene !== "BG") throw new Error("Bitte die Zeile des AB oder der Baugruppe wählen (nicht ein Einzelteil).");

    const alle = this.swNachNr(live.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)));
    if (z.ebene === "AB") return { zeile: z, auswahl: alle, mitAb: true, alle: alle };

    const g = this.swGruppen(alle);
    const mein = g.bgs.find(x => String(x.bg._id) === String(z._id));
    let auswahl = [mein.bg].concat(mein.teile);
    const mitAb = g.abz.length > 0;
    if (mitAb) auswahl = g.abz.concat(g.ohne, auswahl);   /* AB-Zeile und Teile ohne BG gehen mit zurück */

    return { zeile: z, auswahl: auswahl, mitAb: mitAb, alle: alle };
},

/* Text aus dem Schweißen -> { zahl, text }: eine Zahl (Komma oder Punkt) oder der Text selbst. */
swZahl: function (wert) {

    const t = this.text(wert);
    if (!t) return { zahl: null, text: "" };

    const s = t.indexOf(",") > -1 ? t.replace(/\./g, "").replace(",", ".") : t;
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && Number.isFinite(Number(s))) return { zahl: Number(s), text: "" };

    return { zahl: null, text: t };
},

/* R-W9: AB bzw. BG zurück in die Bestandsliste. Eine BG eines zusammengefassten AB nimmt die AB-Zeile mit; die
   übrigen BGs stehen danach wieder einzeln als AB…_BGnnn. Mitarbeiter, Arbeitsplatz, Termine und Entnommen gehen
   verloren. Gibt den AB (Zeile aus kom_auftrag) zurück. */
swZurueck: async function (zeileId) {

    const r = await this.swZurueckPruefen(zeileId);
    const sel = r.auswahl;
    const erste = sel[0];
    const schluessel = this.text(erste.ab_schluessel);
    const g = this.swGruppen(sel);

    const k = (g.abz.length ? g.abz[0].kopfObj : null) || erste.kopfObj || {};

    const vorhanden = await this.datenLesen("auftrag", { wo: { ab_schluessel: schluessel, bereich: "bestand" }, aufloesen: false });
    let a = vorhanden.length ? vorhanden[0] : null;

    if (a === null) {   /* AB-Zeile wird neu aufgebaut */
        const live = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false, felder: ["reihenfolge"] });
        const milli = live.map(x => this.mengeMilli(x.reihenfolge));
        const belegt = k.reihenfolge === null || k.reihenfolge === undefined || k.reihenfolge === "" ? null : Number(k.reihenfolge);
        const frei = belegt && milli.indexOf(belegt * 1000) < 0;

        a = await this.datenAnlegen("auftrag", {
            ab_anzeige: this.text(erste.ab_nr), ab_schluessel: schluessel,
            forecast_schluessel: this.text(k.forecast_schluessel) || this.abForecastSchluessel(erste.ab_nr),
            haupt_ab: this.text(k.haupt_ab), kunde: this.text(k.kunde), verkaufsartikel: this.text(k.verkaufsartikel),
            ersteller: this.text(k.ersteller), datum_liste: this.text(k.datum_liste), dispoliste: this.text(k.dispoliste),
            lagerort: g.abz.length ? this.text(g.abz[0].lagerort) : "", regal_geteilt: false, bereich: "bestand",
            reihenfolge: frei ? belegt : (milli.length ? Math.max(...milli) / 1000 : 0) + 1,
            quelldatei: this.text(k.quelldatei), archiviert: false, archiviert_am: null, archiv_herkunft: "", archiv_status: ""
        });
    }

    /* höchste Zeilennummer im AB, auch unter den ausgeblendeten, damit keine doppelt vergeben wird */
    const [bgAlt, teilAlt] = await Promise.all([
        this.datenLesenIn("baugruppe", "auftrag", [a._id], { archiv: "alle", felder: ["zeile"] }),
        this.datenLesenIn("teil", "auftrag", [a._id], { archiv: "alle", felder: ["zeile"] })
    ]);
    let zeile = bgAlt.concat(teilAlt).reduce((m, x) => Math.max(m, this.mengeMilli(x.zeile) / 1000), 0);

    const felder = x => {
        const o = {};
        this.swKopierFelder.forEach(f => { o[f] = this.text(x[f]); });
        return o;
    };
    const soll = x => {
        const s = this.swZahl(x.menge_gesamt);
        return { menge_gesamt: s.zahl, menge_gesamt_text: s.text };
    };
    const datum = v => (this.tagNr(v) === null ? null : v);

    /* Reihenfolge wie bisher: Teile ohne BG, dann je BG sie selbst und ihre Teile */
    const teilWerte = (x, bgId) => {
        zeile += 1;
        return Object.assign({
            auftrag: a._id, baugruppe: bgId, zeile: zeile, vorhanden: this.swZahl(x.vorhanden).zahl,
            datum_eingelagert: datum(x.eingelagert), datum_komplett: datum(x.komplett), archiviert: false
        }, soll(x), felder(x));
    };

    const teile = g.ohne.map(x => teilWerte(x, null));
    const bgPlan = g.bgs.map(x => {
        zeile += 1;
        const werte = Object.assign({
            auftrag: a._id, zeile: zeile, name: this.text(x.bg.baugruppe), kurz: this.swBgNummer(x.bg.baugruppe), archiviert: false
        }, soll(x.bg), felder(x.bg));
        return { x: x, werte: werte, teile: x.teile.map(t => teilWerte(t, null)) };   /* Teile folgen ihrer BG */
    });

    /* BGs zuerst (die Teile brauchen ihre Verweise) */
    await this.jeAcht(bgPlan, async p => { p.neu = await this.datenAnlegen("baugruppe", p.werte); });
    bgPlan.forEach(p => p.teile.forEach(t => { t.baugruppe = p.neu._id; }));

    const alleTeile = teile.concat(...bgPlan.map(p => p.teile));
    await this.jeAcht(alleTeile, t => this.datenAnlegen("teil", t));

    /* die Zeilen im Schweißen ausblenden: archiviert und zurückgeholt */
    await this.datenAendernViele(sel.map(x => ({ name: "schweisszeile", zeile: x, werte: { archiviert: true, zurueckgeholt: true } })));

    if (r.zeile.ebene === "BG" && r.mitAb) {   /* SwEinzelnBeschriften: übrige BGs wieder einzeln */
        const ids = {};
        sel.forEach(x => { ids[String(x._id)] = true; });
        const rest = r.alle.filter(x => !ids[String(x._id)]);
        await this.datenAendernViele(rest.map(x => ({
            name: "schweisszeile", zeile: x, werte: { anzeige: this.text(x.ab_nr) + "_BG" + this.swBgNummer(x.baugruppe) }
        })));
    }

    await this.protokollSchreiben("zurueck", a.ab_anzeige, r.zeile.ebene === "AB" ? "" : "BG " + this.text(r.zeile.baugruppe),
        "Schweißen", "Bestandsliste");
    return a;
},


/* ===========================================================================
   ARBEITSPLÄTZE: HALLENPLAN (R-AP1 bis R-AP5)
   Nachbau von bestand/schweissen/hallenplan.py: die Einträge der Magnettafel
   (Formel AP), die Plätze mit ihren Einträgen und die drei Listen darunter,
   dazu Platz setzen, Mitarbeiter setzen, AB aufsplitten und zusammenführen.
   Platz und Mitarbeiter gehen über swSetzen (4K_sw_eingaben.js), also mit
   Vererbung an BGs und Teile.
   =========================================================================== */

/* "(verschieden)" zählt als leer. */
hpRein: function (x) {

    const t = this.text(x);
    return t === this.swVerschieden ? "" : t;
},

hpKlein: function (s) {

    return this.text(s).toLowerCase();
},

/* R-AP3 (Formel AP): je AB bzw. BG im Schweißen ein Eintrag mit Platz und Mitarbeiter.
   - zusammengefasster AB, alle BGs am selben Platz (auch keinem) -> ein Eintrag "AB…";
   - BGs an verschiedenen Plätzen -> jede BG einzeln als "AB…_BGnnn"; AB ohne BG -> der AB selbst;
   - Einzelblöcke "AB…_BGnnn" -> immer einzeln.
   Platz einer BG = eigener, sonst der des AB; Mitarbeiter ebenso; "(verschieden)" zählt als leer.
   zeilen = swLesen() (mit m und p). Ergebnis: [{ name, platz, mitarbeiter, ganz, komplett, bgs }] nach Name. */
hpEintraege: function (zeilen) {

    const abPlatz = {}, abMit = {}, nbg = {}, geteilt = {};

    zeilen.forEach(z => {
        const k = this.hpKlein(z.ab_nr);
        if (z.ebene === "AB") {
            if (!(k in abPlatz)) abPlatz[k] = this.hpRein(z.p);
            if (!(k in abMit)) abMit[k] = this.hpRein(z.m);
            if (this.istJa(z.ap_geteilt)) geteilt[k] = true;
        } else if (z.ebene === "BG") {
            nbg[k] = (nbg[k] || 0) + 1;
        }
    });

    const roh = [];
    zeilen.forEach(z => {
        const k = this.hpKlein(z.ab_nr);
        if (z.ebene === "BG" || (z.ebene === "AB" && !nbg[k])) {
            const xp = k in abPlatz ? abPlatz[k] : "", xm = k in abMit ? abMit[k] : "";
            roh.push({
                en: this.text(z.ab_nr), ed: this.text(z.anzeige), enr: this.swBgNummer(z.baugruppe), eeb: z.ebene,
                ep: this.hpRein(z.p) || xp, em: this.hpRein(z.m) || xm, xm: xm
            });
        }
    });

    const kombis = {};
    roh.forEach(r => {
        const k = this.hpKlein(r.en);
        (kombis[k] = kombis[k] || {})[this.hpKlein(r.ep)] = true;
    });

    const aus = [], gesehen = {};
    roh.forEach(r => {
        const k = this.hpKlein(r.en);
        const einz = r.ed.toLowerCase().indexOf("_bg") > -1;
        const ganz = (Object.keys(kombis[k]).length === 1 && !einz && !geteilt[k]) || r.eeb === "AB";
        const name = ganz ? r.en : (einz ? r.ed : r.en + "_BG" + r.enr);
        const mit = ganz && r.eeb !== "AB" ? r.xm : r.em;
        const schluessel = this.hpKlein(name) + "|" + this.hpKlein(r.ep);

        if (gesehen[schluessel]) return;
        gesehen[schluessel] = true;

        aus.push({ name: name, platz: r.ep, mitarbeiter: mit, ganz: ganz, komplett: k in abPlatz, bgs: nbg[k] || 0 });
    });

    return aus.sort((a, b) => (this.hpKlein(a.name) < this.hpKlein(b.name) ? -1 : (this.hpKlein(a.name) > this.hpKlein(b.name) ? 1 : 0)));
},

hpAnzeige: function (e) {

    return e.mitarbeiter ? e.name + " · " + e.mitarbeiter : e.name;
},

/* Der AB hinter dem Eintrag ("AB2515204_BG100" -> "AB2515204"). */
hpAb: function (e) {

    const i = e.name.toUpperCase().indexOf("_BG");
    return i < 0 ? e.name : e.name.slice(0, i);
},

/* R-AP2 bis R-AP4: die Plätze mit ihren Einträgen und die drei Listen unter dem Plan.
   plaetze = swPlaetzeLaden(). */
hpHallenplan: function (zeilen, plaetze) {

    const alle = this.hpEintraege(zeilen);
    const jePlatz = plaetze.map(p => ({ p: p, eintraege: [] }));
    const nicht = [], ungueltig = [], einsortiert = [];

    alle.forEach(e => {
        if (!e.platz) { nicht.push(e); return; }

        const x = jePlatz.find(j => this.hpKlein(j.p.name) === this.hpKlein(e.platz));   /* COUNTIF: exakt */
        if (!x) { ungueltig.push(e); return; }

        x.eintraege.push(e);
        einsortiert.push([e, x.p]);
    });

    return { plaetze: jePlatz, nicht: nicht, ungueltig: ungueltig, einsortiert: einsortiert, anzahl: alle.length };
},

/* ---------------------------------------------------------------------------
   Ändern
   --------------------------------------------------------------------------- */

/* Die AB-Zeile ("AB…") bzw. BG-Zeile ("AB…_BGnnn") hinter einem Eintrag des Hallenplans. */
hpZiel: function (zeilen, eintrag) {

    const p = eintrag.toUpperCase().indexOf("_BG");
    const abNr = p >= 0 ? eintrag.slice(0, p) : eintrag;
    const bgNr = p >= 0 ? eintrag.slice(p + 3) : "";

    for (const z of this.swNachNr(zeilen)) {
        if (!this.swGleich(z.ab_nr, abNr)) continue;
        if (!bgNr && z.ebene === "AB") return z;
        if (bgNr && z.ebene === "BG" && this.swGleich(this.swBgNummer(z.baugruppe), bgNr)) return z;
    }

    throw new Error(eintrag + " wurde im Bereich Schweißen nicht gefunden.");
},

/* R-AP5 (ApSetzen): Arbeitsplatz eines AB bzw. einer BG im Schweißen eintragen; die Vererbung gibt ihn an
   BGs und Teile weiter. Gibt die Meldung zurück. */
hpPlatzSetzen: async function (eintrag, platz) {

    const zeilen = await this.swLesen();
    const ziel = this.hpZiel(zeilen, eintrag);
    const r = await this.swSetzen(ziel._id, "arbeitsplatz", platz);

    return eintrag + ": " + (r.neu !== "leer" ? "Arbeitsplatz " + r.neu : "kein Arbeitsplatz mehr") + ".";
},

/* Rechtsklick im Hallenplan: Mitarbeiter eines Eintrags ändern (Auswahl aus der Liste). */
hpMitarbeiterSetzen: async function (eintrag, wert) {

    const zeilen = await this.swLesen();
    const ziel = this.hpZiel(zeilen, eintrag);
    const r = await this.swSetzen(ziel._id, "mitarbeiter", wert);

    return eintrag + ": " + (r.neu !== "leer" ? "Mitarbeiter " + r.neu : "kein Mitarbeiter mehr") + ".";
},

/* Die AB-Zeile zu einem Eintrag; nur vorhanden, wenn der ganze AB im Schweißen liegt. */
hpAbZeile: function (zeilen, eintrag) {

    const ziel = this.hpZiel(zeilen, eintrag);
    const ab = this.swNachNr(zeilen).find(z => z.ebene === "AB" && this.text(z.ab_schluessel) === this.text(ziel.ab_schluessel));

    if (!ab || this.text(ziel.anzeige) !== this.text(ab.anzeige)) {
        throw new Error("Aufsplitten und Zusammenführen geht nur, wenn alle Baugruppen des AB im Schweißen liegen. " +
            "Dieser AB ist noch zwischen Bestandsliste und Schweißen aufgeteilt.");
    }

    return ab;
},

/* Hallenplan: der AB wird in seine Baugruppen aufgesplittet (je BG ein Eintrag, alle am bisherigen Platz). */
hpTeilen: async function (eintrag) {

    const zeilen = await this.swLesen();
    const ab = this.hpAbZeile(zeilen, eintrag);

    const nBg = zeilen.filter(z => this.text(z.ab_schluessel) === this.text(ab.ab_schluessel) && z.ebene === "BG").length;
    if (nBg < 2) throw new Error("Dieser AB hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");   /* Ben, 15.10. */

    await this.datenAendern("schweisszeile", ab, { ap_geteilt: true }, { ohnePruefung: true });
    await this.protokollSchreiben("schweissen", ab.ab_nr, "Arbeitsplätze", "AB", "Baugruppen einzeln");

    return eintrag + " ist in Baugruppen aufgesplittet.";
},

/* Hallenplan, Rechtsklick auf eine Baugruppe: der ganze AB kommt dorthin, wo diese Baugruppe liegt. */
hpZusammenfuehren: async function (eintrag) {

    const zeilen = await this.swLesen();
    const ab = this.hpAbZeile(zeilen, eintrag);
    const bg = this.hpZiel(zeilen, eintrag);
    const e = this.hpEintraege(zeilen).find(x => this.hpKlein(x.name) === this.hpKlein(eintrag));
    const platz = e ? e.platz : "";

    if (bg.ebene !== "BG") throw new Error("Dieser Eintrag ist schon der ganze AB.");

    await this.datenAendern("schweisszeile", ab, { ap_geteilt: false }, { ohnePruefung: true });
    await this.swSetzen(ab._id, "arbeitsplatz", platz);
    await this.protokollSchreiben("schweissen", ab.ab_nr, "Arbeitsplätze", "Baugruppen einzeln",
        "AB zusammen (" + (platz || "kein Platz") + ")");

    return this.text(ab.ab_nr) + " ist zusammengeführt" + (platz ? " (" + platz + ")" : " (nicht einsortiert)") + ".";
},


/* ===========================================================================
   SCHWEISSEN ANSEHEN: Suchen, Filtern, Sortieren, Sammlungen (R-W10)
   Nachbau von bestand/schweissen/bloecke.py. Die Blöcke bauen swBloecke und
   swBerechnen (4F_schweissen.js). Jede Zeile trägt zeigen (Treffer von
   Suche und Filter).
   =========================================================================== */

swAnzeigen: [["ab", "ABs"], ["bg", "BGs"], ["alles", "Alles"]],

swSortierungen: [
    ["", "Standard"],
    ["lt_auf", "Liefertermin aufsteigend"],
    ["lt_ab", "Liefertermin absteigend"],
    ["ab_auf", "AB aufsteigend"],
    ["ab_ab", "AB absteigend"]
],

swTreffer: function (q, texte) {

    return texte.some(t => this.text(t).toLowerCase().indexOf(q) > -1);
},

/* R-W10: Teilwort in AB/Anzeige (-> ganzer Block), Zeichnungsnummer, Benennung, LK Nummer, Mitarbeiter,
   Arbeitsplatz (BG -> mit allen Teilen, Teil -> mit BG- und AB-Kopf). Setzt zeigen an Zeilen und
   Blöcken; gibt die Zahl der Treffer zurück. */
swSuchen: function (bloecke, begriff) {

    const q = this.text(begriff).toLowerCase();
    const passt = z => this.swTreffer(q, [z.zeichnungsnummer, z.benennung, z.lk_nummer, z.m, z.p]);
    let treffer = 0;

    bloecke.forEach(b => {
        const alle = this.swBlockZeilen(b);
        alle.forEach(z => { z.zeigen = false; });
        b.zeigen = false;

        const kopf = this.swKopf(b);
        if (this.swTreffer(q, [kopf.anzeige, kopf.ab_nr]) || (b.ab && passt(b.ab))) {
            alle.forEach(z => { z.zeigen = true; });
            b.zeigen = true;
            treffer++;
            return;
        }

        const ab = () => { if (b.ab) b.ab.zeigen = true; };

        b.ohne.forEach(t => {
            if (passt(t)) { t.zeigen = b.zeigen = true; ab(); treffer++; }
        });

        b.bgs.forEach(g => {
            if (passt(g.bg)) {
                g.bg.zeigen = b.zeigen = true;
                g.teile.forEach(t => { t.zeigen = true; });
                ab();
                treffer++;
            }
            g.teile.forEach(t => {
                if (passt(t)) { t.zeigen = g.bg.zeigen = b.zeigen = true; ab(); treffer++; }
            });
        });
    });

    return treffer;
},

/* R-W10 Anzeige (Ben, 14.10.): "ABs" und "BGs" zeigen alle Zeilen, nur zugeklappt (das Klappen
   macht die Ansicht), damit man darunter aufklappen kann. "Alles" zeigt alles. */
swAllesZeigen: function (bloecke) {

    bloecke.forEach(b => {
        b.zeigen = true;
        this.swBlockZeilen(b).forEach(z => { z.zeigen = true; });
    });
},

/* Ben, 14.10.: nur Blöcke, in denen dieser Mitarbeiter / dieser Arbeitsplatz vorkommt. */
swBlockFiltern: function (bloecke, mitarbeiter, platz) {

    return bloecke.filter(b => {
        const zs = this.swBlockZeilen(b);

        if (mitarbeiter && !zs.some(z => this.swMitarbeiterListe(z.m).some(n => n.toLowerCase() === mitarbeiter.toLowerCase()))) return false;
        if (platz && !zs.some(z => this.hpKlein(z.p) === this.hpKlein(platz))) return false;
        return true;
    });
},

/* Liefertermin (Stahlbau) oder AB-Nummer; Blöcke ohne Termin stehen immer hinten. */
swBlockSortieren: function (bloecke, wie) {

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    const nummer = b => this.text(this.swKopf(b).ab_nr).toLowerCase();
    const absteigend = wie.slice(-2) === "ab";

    if (wie.indexOf("ab_") === 0) {
        return bloecke.slice().sort((p, q) => (absteigend ? -1 : 1) * vergleich(nummer(p), nummer(q)));
    }

    const tag = b => this.tagNr(this.swKopf(b).lt);
    const mit = bloecke.filter(b => tag(b) !== null).sort((p, q) =>
        (absteigend ? -1 : 1) * (vergleich(tag(p), tag(q)) || vergleich(nummer(p), nummer(q))));

    return mit.concat(bloecke.filter(b => tag(b) === null));
},

/* Ben, 15.10.: Die Einzelblöcke eines AB (Baugruppen im Schweißen, der Rest noch in der Bestandsliste)
   stehen gemeinsam unter der AB-Überschrift. Ergebnis: Blöcke und Sammlungen in der Reihenfolge der Liste.
   Sammlung: { sammlung: true, schluessel, bloecke, komBgs: [Namen], offen } */
swSammeln: function (bloecke) {

    const ergebnis = [], sammlungen = {};

    bloecke.forEach(b => {
        if (b.ab !== null) { ergebnis.push(b); return; }

        const s = this.text(b.bgs[0].bg.ab_schluessel);
        if (!sammlungen[s]) {
            sammlungen[s] = { sammlung: true, schluessel: s, bloecke: [], komBgs: [], offen: true };
            ergebnis.push(sammlungen[s]);
        }
        sammlungen[s].bloecke.push(b);
    });

    return ergebnis;
},

/* Name, Kunde, Benennung einer Sammlung (aus ihrem ersten Block). */
swSammlungKopf: function (s) {

    const kopf = this.swKopf(s.bloecke[0]);
    const k = kopf.kopfObj || {};
    return { anzeige: this.text(kopf.anzeige).replace(/_BG[^_]*$/i, ""), benennung: this.text(k.verkaufsartikel), kunde: this.text(k.kunde) };
},

/* Die Baugruppen, die einer Sammlung noch in der Bestandsliste stehen (rote Kacheln), als Namen. */
swSammlungenErgaenzen: async function (liste) {

    const sammlungen = liste.filter(x => x.sammlung);
    if (!sammlungen.length) return;

    const abs = await this.datenLesenIn("auftrag", "ab_schluessel", sammlungen.map(s => s.schluessel), { wo: { bereich: "bestand" } });
    if (!abs.length) return;

    const bgs = await this.datenLesenIn("baugruppe", "auftrag", abs.map(a => a._id), { sortierung: ["zeile"] });

    sammlungen.forEach(s => {
        const a = abs.find(x => this.text(x.ab_schluessel) === s.schluessel);
        if (!a) return;
        s.komBgs = bgs.filter(b => String(b._auftrag_id) === String(a._id)).map(b => this.text(b.name));
    });
},

/* Je AB-Schlüssel die Baugruppen, die einzeln im Schweißen liegen (rote Kacheln "Befinden sich im
   Schweißen" in der Bestandsliste und im Dashboard). zeilen = swLesen(). */
swImSchweissen: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        if (z.ebene === "BG" && this.text(z.anzeige).toLowerCase().indexOf("_bg") > -1) {
            (je[this.text(z.ab_schluessel)] = je[this.text(z.ab_schluessel)] || []).push(z);
        }
    });

    return je;
},

/* Zähler oben: ABs im Schweißen (ein Einzelblock zählt als eigener Eintrag je AB) und Zahl der Einzelblöcke. */
swZaehler: function (bloecke) {

    const abs = {};
    bloecke.forEach(b => { abs[b.ab === null ? "e|" + this.text(this.swKopf(b).ab_schluessel) : "a|" + String(b.ab._id)] = true; });

    return { ab: Object.keys(abs).length, einzeln: bloecke.filter(b => b.ab === null).length };
},


/* ===========================================================================
   BENUTZER UND ROLLEN
   Vorerst OHNE Anmeldung und Rechte (Ben, 16.10.2026): Alle sehen und
   dürfen alles. Diese Stelle ist nur vorbereitet, damit Rollen später
   ohne Umbau dazukommen.

   OFFEN (Symolo), für später: Woher bekommt die Ansicht Name und Gruppen
   der angemeldeten Person (Sitzungsdaten, Formulardaten, ein Befehl)?
   Geplante Rollen: Gast (nur ansehen), Kommissionierung, Stahlbau, Admin.
   Wichtig: Die Ansicht blendet nur Knöpfe aus. Geschützt ist erst, wenn
   Symolo die Schreibrechte je Tabelle prüft.
   =========================================================================== */

benutzer: function () {

    return { name: "", rollen: ["Kommissionierung", "Stahlbau", "Admin"] };
},

/* Darf die Person das? Vorerst immer ja. */
darf: function (rolle) {

    return this.benutzer().rollen.indexOf(rolle) >= 0 || this.benutzer().rollen.indexOf("Admin") >= 0;
},


/* ===========================================================================
   ANZEIGE: Gerüst, Knöpfe, Tabellen, Statusmeldung
   Elemente nur mit window.symolo.tools.layout.create (Skill, Abschnitt 5).
   Kein document.createElement, kein querySelector, kein innerHTML-Bau.
   Referenzen auf eigene Elemente liegen am Objekt (this.koerper usw.).
   =========================================================================== */

wurzel: null,
koerper: null,
fuss: null,
dialogEl: null,
dialogFokus: null,
infoZeile: null,
statusEl: null,
statusTimer: null,

/* Ein Element bauen. text wird immer über text() geführt: nie "undefined". */
el: function (parent, type, klasse, text) {

    const o = { parent: parent, type: type || "div" };
    if (klasse) o.class = klasse;
    if (text !== undefined) o.text = this.text(text);

    return window.symolo.tools.layout.create(o);
},

/* Ein Knopf. layout.create kann keine Events: Handler danach setzen. */
knopf: function (parent, text, klick, art) {

    const b = this.el(parent, "button", "kom-knopf" + (art ? " kom-knopf-" + art : ""), text);
    b.type = "button";
    b.onclick = () => { klick(); };
    return b;
},

/* Gerüst jeder Ansicht: Kopf (Titel, Infozeile), Körper, Fuß, Status.
   Erst das Gerüst, dann die Daten (Skill, Vertrag). */
geruestBauen: function (parent) {

    /* Die Klasse der Ansicht: jede CSS-Regel hängt daran. */
    const view = this.el(parent, "div", this.ansicht.klasse);
    this.wurzel = view;

    const kopf = this.el(view, "div", "kom-kopf");
    this.el(kopf, "h2", "kom-titel", this.ansicht.titel);
    this.infoZeile = this.el(kopf, "div", "kom-info");
    this.bereichsleisteBauen(view);

    this.koerper = this.el(view, "div", "kom-koerper");

    this.fuss = this.el(view, "div", "kom-fuss");
    this.el(this.fuss, "span", "kom-vermerk", "Erstellt: Ben Schumacher, 09.10.2026");

    this.statusEl = window.symolo.tools.layout.create({
        parent: view, class: "kom-status", id: this.ansicht.praefix + "Status"
    });

    return view;
},

/* Bereichsleiste wie das Hauptmenü der bisherigen App: ein Knopf je Bereich, der aktuelle ist hervorgehoben.
   Der Verbindungstest hat keine. */
bereichsleisteBauen: function (view) {

    if (!this.einstellungen.bereichsleiste || this.ansicht.name === "verbindungstest") return;

    const menue = this.el(view, "nav", "kom-menue");
    menue.setAttribute("aria-label", "Bereiche");

    this.einstellungen.bereiche.forEach(([name, titel]) => {
        const b = this.el(menue, "button", "kom-menuepunkt" + (name === this.ansicht.name ? " kom-aktiv" : ""), titel);
        b.type = "button";
        if (name === this.ansicht.name) b.setAttribute("aria-current", "page");
        b.onclick = () => this.bereichOeffnen(name);
    });
},

/* In einen anderen Bereich wechseln. optionen.suche: dort gleich nach diesem Text suchen (z. B. die AB-Nummer).
   Den Wechsel selbst macht window.KOM_BEREICH_WECHSELN (setzt die Testseite). OFFEN (Symolo): Wie öffnet Symolo
   ein anderes Formular aus einem Hook heraus? Bis das geklärt ist, steht in Symolo nur ein Hinweis. */
bereichOeffnen: function (name, optionen) {

    if (name === this.ansicht.name && !(optionen && optionen.suche)) return;

    const wechsler = window.KOM_BEREICH_WECHSELN;
    if (typeof wechsler === "function") {
        wechsler(name, optionen || {});
        return;
    }

    const b = this.einstellungen.bereiche.find(x => x[0] === name);
    this.statusZeigen("Der Wechsel nach „" + (b ? b[1] : name) + "“ ist in Symolo noch nicht angebunden.", "fehler");
},

/* Beim Wechsel mitgegebene Angaben (einmal lesen): { suche }. */
startOptionen: function () {

    const o = window.KOM_START_OPTIONEN || {};
    window.KOM_START_OPTIONEN = null;
    return o;
},

/* Zeigt, woher die Daten kommen und ob gespeichert werden darf. */
infoZeigen: function () {

    if (!this.infoZeile) return;

    const teile = ["Daten: " + this.quelleText()];
    if (!this.schreibenErlaubt()) teile.push("Speichern noch gesperrt");
    this.datenHinweise.forEach(h => teile.push(h));

    this.infoZeile.textContent = teile.join(" · ");
},

/* Meldung unten. Fehler bleiben stehen, sonst blendet sie aus. */
statusZeigen: function (meldung, art) {

    const el = this.statusEl;
    if (!el) return;

    el.textContent = this.text(meldung);
    el.classList.add("kom-zeigen");
    el.classList.toggle("kom-fehler", art === "fehler");

    clearTimeout(this.statusTimer);
    if (art !== "fehler") {
        this.statusTimer = setTimeout(() => { el.classList.remove("kom-zeigen"); }, 3000);
    }
},

/* Aufgabe ausführen; ein Fehler wird gemeldet statt die Ansicht zu töten.
   Gibt null zurück, wenn es nicht geklappt hat. */
sicher: async function (aufgabe) {

    try {
        return await aufgabe();
    } catch (fehler) {
        console.warn(this.ansicht.name + ":", fehler);
        this.statusZeigen(fehler && fehler.message ? fehler.message : "Unbekannter Fehler.", "fehler");
        return null;
    }
},

/* Tabelle aus Zeilen von datenLesen.
   spalten: [{ feld, titel, art }]  art: "text" | "zahl" | "datum" | "datumzeit"
   leerText nennt den Grund, wenn nichts da ist (Skill: leere Wege).
   aktionen(zelle, zeile) baut Knöpfe je Zeile (optional). */
tabelleBauen: function (parent, spalten, zeilen, leerText, aktionen) {

    /* IDs werden nie angezeigt: interne Felder (_…) sind verboten. */
    spalten.forEach(s => {
        if (s.feld === "id" || s.feld.charAt(0) === "_") throw new Error("IDs werden nie angezeigt: " + s.feld);
    });

    if (zeilen.length === 0) {
        this.el(parent, "div", "kom-leer", leerText);
        return null;
    }

    const tab = this.el(parent, "table", "kom-tabelle");
    const kopf = this.el(this.el(tab, "thead"), "tr");
    spalten.forEach(s => this.el(kopf, "th", s.art === "zahl" ? "kom-zahl" : "", s.titel));
    if (aktionen) this.el(kopf, "th", "", "");

    const koerper = this.el(tab, "tbody");

    zeilen.forEach(z => {
        const tr = this.el(koerper, "tr");

        spalten.forEach(s => {
            const w = z[s.feld];
            let t = this.text(w);
            if (s.art === "datum") t = this.datumText(w);
            if (s.art === "datumzeit") t = this.datumZeitText(w);
            this.el(tr, "td", s.art === "zahl" ? "kom-zahl" : "", t === "" ? "–" : t);
        });

        if (aktionen) aktionen(this.el(tr, "td", "kom-aktionen"), z);
    });

    return tab;
},

/* Klapp-Knopf (▾/▸) und Name als Knopf: Einfachklick klappt. */
klappZellen: function (tr, name, offen, klappen, doppel) {

    const td1 = this.el(tr, "td");
    const td2 = this.el(tr, "td");
    td2.title = this.text(name);

    if (!klappen) {
        td2.textContent = this.text(name);
        return;
    }

    const pfeil = this.el(td1, "button", "kom-klapp", offen ? "▾" : "▸");
    pfeil.type = "button";
    pfeil.title = "Auf- oder zuklappen";
    pfeil.setAttribute("aria-label", this.text(name) + " auf- oder zuklappen");
    pfeil.onclick = klappen;

    const nameKnopf = this.el(td2, "button", "kom-name", name);
    nameKnopf.type = "button";
    nameKnopf.onclick = klappen;
    if (doppel) nameKnopf.ondblclick = doppel;
},

/* Fenster in der Mitte (Dialog), liegt in der Ansicht, damit das CSS greift.
   bauen(inhalt, knoepfe) füllt es. Escape oder Klick daneben schließt.
   Den Fokus bekommt das erste Eingabefeld, sonst der erste Knopf. Bei einer
   Sicherheitsfrage setzt bauen() this.dialogFokus auf "Abbrechen": ein
   versehentliches Enter bestätigt dann nichts. */
dialogZeigen: function (titel, bauen) {

    this.dialogSchliessen();

    const hinter = this.el(this.wurzel, "div", "kom-dialog-hinter");
    const box = this.el(hinter, "div", "kom-dialog");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    this.el(box, "h3", "kom-dialog-titel", titel);
    const inhalt = this.el(box, "div", "kom-dialog-inhalt");
    const knoepfe = this.el(box, "div", "kom-dialog-knoepfe");

    hinter.onclick = e => { if (e.target === hinter) this.dialogSchliessen(); };
    hinter.onkeydown = e => { if (e.key === "Escape") this.dialogSchliessen(); };

    this.dialogEl = hinter;
    this.dialogFokus = null;
    bauen(inhalt, knoepfe);

    const erstes = this.dialogFokus || box.getElementsByTagName("input")[0] || box.getElementsByTagName("button")[0];
    this.dialogFokus = null;
    if (erstes) erstes.focus();
    return box;
},

dialogSchliessen: function () {

    if (this.dialogEl) this.dialogEl.remove();
    this.dialogEl = null;
},

/* Menü (Rechtsklick): Titel, Knöpfe untereinander, "Abbrechen" rot unten
   (Ben, 15.10.2026). eintraege: [[text, aktion]] */
menueZeigen: function (titel, eintraege) {

    this.dialogZeigen(titel, (inhalt, knoepfe) => {
        knoepfe.classList.add("kom-dialog-spalte");
        eintraege.forEach(([text, aktion]) => this.knopf(knoepfe, text, () => { this.dialogSchliessen(); aktion(); }));
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},


/* ===========================================================================
   ANSICHT: Schweißen (R-W5 bis R-W10)
   Alles, was ins Schweißen entnommen wurde: ganze ABs (mit Baugruppen und
   Teilen) und einzelne Baugruppen. Eintragen (gilt für alles darunter):
   Mitarbeiter, Arbeitsplatz, Liefertermin Stahlbau, Termin Versand.
   "Zurück" schiebt einen AB oder eine Baugruppe in die Bestandsliste,
   "Archivieren" legt einen ganzen AB ins Archiv. "Mitarbeiter verwalten"
   pflegt die Namensliste. Rechnen und Speichern: 4F, 4K, 4L, 4N.

   Nach jeder Änderung wird neu gelesen und gezeichnet; Klappen, Suche und
   Fokus bleiben. Fehler stehen am Feld (rot umrandet), das Feld bleibt.

   Die roten Kacheln springen in die Bestandsliste (bereichOeffnen, 60_anzeige.js).
   OFFEN (Symolo): Der Wechsel zwischen Formularen ist in Symolo noch nicht angebunden.
   =========================================================================== */

zeilen: [],
bloecke: [],
plaetze: [],
namen: [],
komBgs: {},

suche: "",
anzeige: "ab",
fMit: "",
fPlatz: "",
sortierung: "",
klapp: {},

zaehlerEl: null,
meldungEl: null,
listeEl: null,
sucheEl: null,
mitEl: null,
platzEl: null,
sortEl: null,
anzeigeKnoepfe: {},

/* Die Spalten, wie im Excel-Blatt Schweißen. Der vierte Wert "mehr": nur mit dem Schalter. */
swSpalten: [
    ["klapp", ""], ["nr", "AB / Zeichnungsnummer"], ["ben", "Benennung"], ["lk", "LK"], ["soll", "Soll"],
    ["swm", "Mitarbeiter"], ["swp", "Arbeitsplatz"], ["datum", "Eingelagert"], ["datum", "Entnommen"],
    ["swt", "Liefertermin Stahlbau"], ["swt", "Termin Versand"], ["dlz", "DLZ"], ["aktion", ""],
    ["mbg", "Menge / BG", true], ["idx", "Index", true], ["text", "Arbeitsgang", true], ["text", "Material", true],
    ["text", "Profil", true], ["text", "Abmaße", true], ["text", "Bemerkung", true]
],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.leisteBauen();
    const start = this.startOptionen();
    if (start.suche) this.suche = this.sucheEl.value = this.text(start.suche);   /* Sprung aus einem anderen Bereich */
    this.knopf(this.fuss, "Neu laden", () => this.laden());
    this.knopf(this.fuss, "Mitarbeiter verwalten", () => this.verwaltenDialog());

    await this.laden();
},

/* Alles frisch lesen: Zeilen, Plätze, Namen, dazu die Baugruppen, die einzeln im Schweißen liegen und deren AB
   noch Baugruppen in der Bestandsliste hat. */
datenHolen: async function () {

    const [zeilen, plaetze, namen] = await Promise.all([this.swLesen(), this.swPlaetzeLaden(), this.swMitarbeiterNamen()]);
    const bloecke = this.swBloecke(zeilen);

    const sammlungen = this.swSammeln(bloecke).filter(x => x.sammlung);
    await this.swSammlungenErgaenzen(sammlungen);
    const komBgs = {};
    sammlungen.forEach(s => { komBgs[s.schluessel] = s.komBgs; });

    return { zeilen: zeilen, plaetze: plaetze, namen: namen, bloecke: bloecke, komBgs: komBgs };
},

uebernehmen: function (d) {

    this.zeilen = d.zeilen;
    this.plaetze = d.plaetze;
    this.namen = d.namen;
    this.bloecke = d.bloecke;
    this.komBgs = d.komBgs;
    this.auswahlEinstellen();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) {
        this.uebernehmen(d);
        this.statusZeigen(this.swZaehler(this.bloecke).ab + " Arbeitsaufträge im Schweißen geladen.");
    }

    this.zeichnen();
},

/* Nach einer Änderung: neu lesen und zeichnen; der Fokus bleibt auf dem Feld. */
nachladen: async function () {

    const fokus = document.activeElement;
    const label = fokus && this.listeEl.contains(fokus) ? fokus.getAttribute("aria-label") : null;

    const d = await this.sicher(() => this.datenHolen());
    if (d !== null) this.uebernehmen(d);
    this.zeichnen();

    if (label) {
        ["input", "select", "button"].forEach(art => {
            const felder = this.listeEl.getElementsByTagName(art);
            for (let i = 0; i < felder.length; i++) {
                if (felder[i].getAttribute("aria-label") === label) { felder[i].focus(); return; }
            }
        });
    }
},

/* ---------------------------------------------------------------------------
   Leiste: Zähler, Suche, Filter, Sortierung, Knöpfe
   --------------------------------------------------------------------------- */

leisteBauen: function () {

    const oben = this.el(this.koerper, "div", "kom-oben");
    this.zaehlerEl = this.el(oben, "div", "kom-zaehler");
    this.el(oben, "p", "kom-leise",
        "Mitarbeiter, Arbeitsplatz und Termine hier eintragen; sie gelten für alles darunter. Termine z. B. 15.10.2026, " +
        "15.10. oder 151026. „Zurück“ schiebt einen AB oder eine Baugruppe wieder in die Bestandsliste. " +
        "Den Hallenplan gibt es im Bereich „Arbeitsplätze“.");

    const leiste = this.el(oben, "div", "kom-leiste");

    const suchFeld = this.el(leiste, "label", "kom-feld kom-suchfeld");
    this.el(suchFeld, "span", "kom-feldname", "Suche");
    const zeile = this.el(suchFeld, "span", "kom-suchzeile");
    this.sucheEl = this.el(zeile, "input", "kom-eingabe");
    this.sucheEl.type = "search";
    this.sucheEl.placeholder = "AB, Zeichnungsnr., Benennung, LK, Mitarbeiter oder Platz";
    this.sucheEl.onkeydown = e => { if (e.key === "Enter") this.suchen(); };
    this.sucheEl.onsearch = () => { if (this.sucheEl.value === "") this.suchen(); };
    this.knopf(zeile, "Suchen", () => this.suchen(), "haupt");

    const knoepfe = this.el(leiste, "div", "kom-knopfgruppe");
    this.swAnzeigen.forEach(([wert, titel]) => {
        this.anzeigeKnoepfe[wert] = this.knopf(knoepfe, titel, () => {
            this.anzeige = wert;
            this.klapp = {};
            this.zeichnen();
        });
    });

    this.mitEl = this.auswahlBauen(leiste, "Mitarbeiter", [["", "Alle"]], this.fMit, w => {
        this.fMit = w;
        this.klapp = {};
        this.zeichnen();
    });
    this.platzEl = this.auswahlBauen(leiste, "Arbeitsplatz", [["", "Alle"]], this.fPlatz, w => {
        this.fPlatz = w;
        this.klapp = {};
        this.zeichnen();
    });
    this.sortEl = this.auswahlBauen(leiste, "Sortieren", this.swSortierungen, this.sortierung, w => {
        this.sortierung = w;
        this.zeichnen();
    });

    const schalter = this.el(leiste, "label", "kom-schalter");
    const box = this.el(schalter, "input");
    box.type = "checkbox";
    box.onchange = () => { this.koerper.classList.toggle("kom-mehr-an", box.checked); };
    this.el(schalter, "span", "", "Weitere Spalten");

    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
},

/* Filterlisten aus den Namen und Plätzen (dazu alles, was in den Zeilen vorkommt). */
auswahlEinstellen: function () {

    const namen = this.namen.slice();
    this.zeilen.forEach(z => this.swMitarbeiterListe(z.m).forEach(n => {
        if (!namen.some(x => x.toLowerCase() === n.toLowerCase())) namen.push(n);
    }));
    namen.sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : (a.toLowerCase() > b.toLowerCase() ? 1 : 0)));
    if (this.fMit && !namen.some(x => x.toLowerCase() === this.fMit.toLowerCase())) this.fMit = "";

    const plaetze = this.plaetze.map(p => this.text(p.name));
    if (plaetze.indexOf(this.swSonstiges) < 0) plaetze.push(this.swSonstiges);
    if (this.fPlatz && !plaetze.some(x => this.hpKlein(x) === this.hpKlein(this.fPlatz))) this.fPlatz = "";

    this.auswahlFuellen(this.mitEl, [["", "Alle"]].concat(namen.map(n => [n, n])), this.fMit);
    this.auswahlFuellen(this.platzEl, [["", "Alle"]].concat(plaetze.map(p => [p, p])), this.fPlatz);
},

suchen: function () {

    this.suche = this.text(this.sucheEl.value);
    this.klapp = {};
    this.zeichnen();
},

allesZeigen: function () {

    this.suche = this.sucheEl.value = "";
    this.fMit = this.mitEl.value = "";
    this.fPlatz = this.platzEl.value = "";
    this.klapp = {};
    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zaehlerZeichnen: function () {

    const z = this.swZaehler(this.bloecke);
    this.zaehlerEl.replaceChildren();

    this.el(this.zaehlerEl, "span", "kom-pille", "Arbeitsaufträge im Schweißen: " + z.ab);
    if (z.einzeln) {
        this.el(this.zaehlerEl, "span", "kom-pille", "davon " + z.einzeln + (z.einzeln === 1 ? " einzelne Baugruppe" : " einzelne Baugruppen"));
    }
},

gefiltert: function () {

    return Boolean(this.suche) || Boolean(this.fMit) || Boolean(this.fPlatz);
},

/* Aufgeklappt? Was man geklickt hat, gilt; sonst der Startzustand (R-W10):
   Suche oder Filter öffnen alles, "ABs" lässt alles zu, "BGs" öffnet die ABs, "Alles" öffnet alles. */
istOffen: function (schluessel, stufe) {

    if (schluessel in this.klapp) return this.klapp[schluessel];
    if (this.gefiltert()) return true;
    return stufe === "bg" ? this.anzeige === "alles" : this.anzeige !== "ab";
},

/* Suche, Filter, Sortierung anwenden und die Blöcke zu Blöcken und Sammlungen ordnen. */
sichtbareListe: function () {

    this.swAllesZeigen(this.bloecke);
    let meldung = "";

    if (this.suche && !this.swSuchen(this.bloecke, this.suche)) meldung = "Kein Treffer für „" + this.suche + "“.";

    let bloecke = this.swBlockFiltern(this.bloecke.filter(b => b.zeigen), this.fMit, this.fPlatz);
    if (!meldung && this.gefiltert() && bloecke.length === 0) meldung = "Keine Einträge für diese Auswahl.";
    if (this.sortierung) bloecke = this.swBlockSortieren(bloecke, this.sortierung);

    const liste = this.swSammeln(bloecke);
    liste.forEach(x => { if (x.sammlung) x.komBgs = this.komBgs[x.schluessel] || []; });

    this.meldungEl.replaceChildren();
    if (meldung) {
        this.meldungEl.textContent = meldung + " ";
        this.knopf(this.meldungEl, "Alles anzeigen", () => this.allesZeigen());
    }

    return liste;
},

zeichnen: function () {

    this.infoZeigen();
    this.zaehlerZeichnen();

    Object.keys(this.anzeigeKnoepfe).forEach(w => {
        this.anzeigeKnoepfe[w].classList.toggle("kom-gewaehlt", w === this.anzeige && !this.gefiltert());
    });

    const liste = this.sichtbareListe();
    this.listeEl.replaceChildren();

    if (liste.length === 0) {
        if (!this.gefiltert()) {
            this.el(this.listeEl, "div", "kom-leer",
                "Im Schweißen liegt noch nichts. In der Bestandsliste bei einem AB oder einer Baugruppe mit Status " +
                "„Komplett“ auf „Entnehmen“ tippen.");
        }
        return;
    }

    /* Erst ohne Eltern bauen, dann auf einmal einhängen (schnell bei vielen Zeilen). */
    const inhalt = this.el(null, "div", "kom-liste-inhalt");
    this.kopfzeileBauen(inhalt);
    liste.forEach(x => {
        const karte = this.el(inhalt, "section", "kom-karte");
        this.karteZeichnen(karte, x);
    });
    this.listeEl.replaceChildren(inhalt);
},

/* ---------------------------------------------------------------------------
   Tabelle
   --------------------------------------------------------------------------- */

tabelleNeu: function (parent, klasse) {

    const tab = this.el(parent, "table", "kom-bestand " + (klasse || ""));
    const gruppe = this.el(tab, "colgroup");
    this.swSpalten.forEach(([art, , mehr]) => this.el(gruppe, "col", "kom-c-" + art + (mehr ? " kom-mehr" : "")));
    return tab;
},

kopfzeileBauen: function (parent) {

    const tab = this.tabelleNeu(parent, "kom-kopfzeile");
    const tr = this.el(this.el(tab, "thead"), "tr");
    this.swSpalten.forEach(([art, titel, mehr]) => {
        const zahl = art === "lk" || art === "soll" || art === "mbg" || art === "dlz";
        this.el(tr, "th", (zahl ? "kom-zahl" : "") + (mehr ? " kom-mehr" : ""), titel);
    });
},

/* Eine Karte: ein Block (AB oder Einzelblock) oder eine Sammlung. Beim Klappen wird nur sie neu gezeichnet. */
karteZeichnen: function (karte, x) {

    karte.replaceChildren();
    const neu = () => this.karteZeichnen(karte, x);
    const tab = this.tabelleNeu(karte);

    if (x.sammlung) this.sammlungZeichnen(tab, x, neu);
    else this.blockZeichnen(tab, x, neu);
},

/* Ein ganzer AB: AB-Zeile, Teile ohne BG, Baugruppen mit Teilen. */
blockZeichnen: function (tab, b, neu) {

    const kopf = this.el(tab, "tbody");
    const a = b.ab;
    const schluessel = "a" + String(a._id);
    const hatUnter = b.ohne.concat(...b.bgs.map(g => [g.bg].concat(g.teile))).some(z => z.zeigen);
    const offen = this.istOffen(schluessel, "ab");
    const k = a.kopfObj || {};
    const kunde = this.text(k.kunde);

    this.zeileBauen(kopf, a, "ab", {
        name: a.anzeige, zweite: this.text(a.benennung) || this.text(k.verkaufsartikel) + (kunde ? " · " + kunde : ""),
        offen: offen, archivieren: true,
        klappen: hatUnter ? () => { this.klapp[schluessel] = !offen; neu(); } : null
    });

    if (!offen) return;

    b.ohne.forEach(t => { if (t.zeigen) this.zeileBauen(kopf, t, "teil", {}); });

    b.bgs.forEach(g => {
        if (!g.bg.zeigen) return;
        const block = this.el(tab, "tbody", "kom-bg-block");
        const gs = "g" + String(g.bg._id);
        const gOffen = this.istOffen(gs, "bg");

        this.zeileBauen(block, g.bg, "bg", {
            name: g.bg.baugruppe, zweite: g.bg.zeichnungsnummer, offen: gOffen,
            klappen: g.teile.length ? () => { this.klapp[gs] = !gOffen; neu(); } : null
        });
        if (gOffen) g.teile.forEach(t => { if (t.zeigen) this.zeileBauen(block, t, "teil", {}); });
    });
},

/* Sammlung (Ben, 15.10.): Baugruppen eines AB, die einzeln im Schweißen liegen, unter einer AB-Überschrift;
   darunter die Baugruppen, die noch in der Bestandsliste stehen, als rote Kacheln. */
sammlungZeichnen: function (tab, s, neu) {

    const kopf = this.swSammlungKopf(s);
    const schluessel = "s" + s.schluessel;
    const offen = this.istOffen(schluessel, "ab");
    const klappen = () => { this.klapp[schluessel] = !offen; neu(); };

    const koerper = this.el(tab, "tbody");
    const tr = this.el(koerper, "tr", "kom-ab kom-sammlung");
    this.klappZellen(tr, kopf.anzeige, offen, klappen);
    this.zelle(tr, kopf.benennung + (kopf.kunde ? " · " + kopf.kunde : ""), "", kopf.benennung, 2);
    this.zelle(tr, "Einzelne Baugruppen im Schweißen", "kom-leise", undefined, this.swSpalten.length - 4);

    if (s.komBgs.length) {
        const ktr = this.el(koerper, "tr", "kom-komzeile");
        const td = this.el(ktr, "td", "kom-kacheln");
        td.colSpan = this.swSpalten.length;
        s.komBgs.forEach(name => {
            const k = this.el(td, "button", "kom-kachel-rot", "◀ " + name + " befindet sich im Kommissionierlager");
            k.type = "button";
            k.title = "In der Bestandsliste ansehen";
            k.onclick = () => this.bereichOeffnen("bestandsliste", { suche: kopf.anzeige });
        });
    }

    if (!offen) return;

    s.bloecke.forEach(b => {
        const g = b.bgs[0];
        const bs = "e" + String(g.bg._id);
        const bOffen = this.istOffen(bs, "bg");
        const block = this.el(tab, "tbody", "kom-bg-block");

        this.zeileBauen(block, g.bg, "bg", {
            name: g.bg.anzeige, zweite: g.bg.baugruppe, offen: bOffen, einzeln: true,
            klappen: g.teile.length ? () => { this.klapp[bs] = !bOffen; neu(); } : null
        });
        if (bOffen) g.teile.forEach(t => { if (t.zeigen) this.zeileBauen(block, t, "teil", {}); });
    });
},

/* DLZ (R-W5): Termin Versand minus Eingelagert in Tagen, leer solange eins fehlt. */
swDlz: function (z) {

    return this.archivDlz(z.eingelagert, z.tv);
},

/* Eine Zeile. art: "ab", "bg", "teil". o: name, zweite (Spalte Benennung), offen, klappen, archivieren, einzeln. */
zeileBauen: function (parent, z, art, o) {

    const tr = this.el(parent, "tr", "kom-" + art + " " + z.css);
    tr.setAttribute("data-art", art);

    if (art === "teil") {
        this.zelle(tr, "");
        this.zelle(tr, z.zeichnungsnummer, "", z.zeichnungsnummer);
        this.zelle(tr, z.benennung, "", z.benennung);
    } else {
        this.klappZellen(tr, o.name, o.offen, o.klappen);
        this.zelle(tr, o.zweite, "", o.zweite);
    }

    this.zelle(tr, z.lk_nummer, "kom-zahl");
    this.zelle(tr, art === "ab" ? "" : this.text(z.menge_gesamt), "kom-zahl");

    if (art === "teil") {
        /* Ein Teil nimmt den Eintrag seiner Baugruppe an (R-W6): nur anzeigen. */
        this.zelle(tr, z.m, "kom-leise", z.m);
        this.zelle(tr, z.p, "kom-leise", z.p);
    } else {
        this.mitarbeiterZelle(tr, z);
        this.platzZelle(tr, z);
    }

    this.zelle(tr, this.datumText(z.eingelagert));
    this.zelle(tr, this.datumText(z.entnommen));

    if (art === "teil") {
        this.zelle(tr, this.swDatumAnzeige(z.lt), "kom-leise");
        this.zelle(tr, this.swDatumAnzeige(z.tv), "kom-leise");
    } else {
        this.datumZelle(tr, z, "liefertermin_stahlbau", "lt", "Liefertermin Stahlbau");
        this.datumZelle(tr, z, "termin_versand", "tv", "Termin Versand");
    }

    this.zelle(tr, this.swDlz(z), "kom-zahl");
    this.aktionZelle(tr, z, art, o);

    this.zelle(tr, art === "ab" ? "" : z.menge_bg, "kom-zahl kom-mehr");
    this.zelle(tr, z.index, "kom-mehr");
    ["arbeitsgang", "material", "profil", "abmasse", "bemerkung"].forEach(f => this.zelle(tr, z[f], "kom-mehr", z[f]));

    return tr;
},

/* ---------------------------------------------------------------------------
   Eintragen
   --------------------------------------------------------------------------- */

/* Datum zum Anzeigen: TT.MM.JJJJ, sonst der Text ("(verschieden)"). */
swDatumAnzeige: function (wert) {

    const t = this.text(wert);
    return this.tagNr(t) === null ? t : this.tagText(this.tagNr(t));
},

mitarbeiterZelle: function (tr, z) {

    const td = this.el(tr, "td");
    const b = this.el(td, "button", "kom-feldknopf", this.text(z.m) || "–");
    b.type = "button";
    b.title = (this.text(z.m) || "kein Mitarbeiter") + " (antippen zum Ändern)";
    b.setAttribute("aria-label", "Mitarbeiter " + this.swAnzeigename(z));
    b.onclick = () => this.mitarbeiterDialog(z);
},

platzZelle: function (tr, z) {

    const td = this.el(tr, "td");
    const sel = this.el(td, "select", "kom-platzwahl");
    sel.setAttribute("aria-label", "Arbeitsplatz " + this.swAnzeigename(z));

    const wert = this.text(z.p);
    const option = (w, text, aus) => { const x = this.el(sel, "option", "", text); x.value = w; x.disabled = Boolean(aus); };

    option("", "–");
    if (wert === this.swVerschieden) option("__v", this.swVerschieden, true);
    else if (wert && this.swPlatzFinden(wert, this.plaetze) === null) option("__alt", wert + " (kein Arbeitsplatz)", true);
    this.plaetze.forEach(p => option(this.text(p.name), this.text(p.name)));
    option(this.swSonstiges, this.swSonstiges);

    const aktuell = this.swPlatzFinden(wert, this.plaetze);
    sel.value = wert === this.swVerschieden ? "__v" : (aktuell !== null ? aktuell : (wert ? "__alt" : ""));
    sel.onchange = () => this.eintragen(z, "arbeitsplatz", sel.value, sel);
},

/* Datum als Text (TT.MM.JJJJ, 15.10., 151026 …) und ein Kalender-Knopf. */
datumZelle: function (tr, z, feld, kurz, titel) {

    const td = this.el(tr, "td");
    const reihe = this.el(td, "span", "kom-sw-datumzelle");
    const wert = this.swDatumAnzeige(z[kurz]);

    const f = this.el(reihe, "input", "kom-eingabe");
    f.type = "text";
    f.inputMode = "numeric";
    f.autocomplete = "off";
    f.placeholder = "TT.MM.JJJJ";
    f.value = wert;
    f.setAttribute("aria-label", titel + " " + this.swAnzeigename(z));

    const speichern = text => {
        if (this.text(text) === wert) return;
        f.classList.remove("kom-ungueltig");
        this.eintragen(z, feld, text, f);
    };
    f.onchange = () => speichern(f.value);
    f.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); f.blur(); } };

    /* Kalender: ein unsichtbares Datumsfeld, das der Knopf öffnet */
    const kal = this.el(reihe, "input", "kom-sw-kalender");
    kal.type = "date";
    kal.tabIndex = -1;
    const tag = this.tagNr(z[kurz]);
    if (tag !== null) kal.value = this.swTagIso(tag).slice(0, 10);
    kal.onchange = () => {
        const m = this.text(kal.value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) speichern(m[3] + "." + m[2] + "." + m[1]);
    };
    const b = this.el(reihe, "button", "kom-feldknopf kom-sw-kalenderknopf", "📅");
    b.type = "button";
    b.title = "Datum wählen";
    b.setAttribute("aria-label", titel + " " + this.swAnzeigename(z) + ": Kalender");
    b.onclick = () => {
        try { kal.showPicker(); } catch (fehler) { kal.focus(); kal.click(); }
    };
},

aktionZelle: function (tr, z, art, o) {

    const td = this.el(tr, "td", "kom-aktion");
    if (art === "teil") return;

    const name = this.swAnzeigename(z);
    if (o.archivieren) {
        const b = this.knopf(td, "Archivieren", () => this.archivierenFragen(z), "klein");
        b.title = "Ganzen AB ins Archiv legen";
        b.setAttribute("aria-label", "Archivieren " + name);
    }
    const r = this.knopf(td, "Zurück", () => this.zurueckFragen(z), "klein");
    r.title = "Zurück in die Bestandsliste (Mitarbeiter, Arbeitsplatz und Termine gehen verloren)";
    r.setAttribute("aria-label", "Zurück " + name);
},

/* Ein Eintrag speichern (R-W6, R-W7). Bei einem Fehler bleibt das Feld stehen, rot umrandet. */
eintragen: async function (z, feld, text, feldEl) {

    const r = await this.sicher(() => this.swSetzen(z._id, feld, text));

    if (r === null) {
        if (feldEl && feldEl.classList) feldEl.classList.add("kom-ungueltig");
        return;
    }

    await this.nachladen();
    this.statusZeigen(r.alt === r.neu ? r.name + ": keine Änderung." : r.name + " " + this.swAnzeigename(r.zeile) + ": " + r.alt + " → " + r.neu);
},

/* Mehrere Mitarbeiter wählen (Häkchen); der Eintrag gilt für alles darunter. */
mitarbeiterDialog: function (z) {

    const aktuell = this.swMitarbeiterListe(z.m);
    const alle = this.namen.slice();
    aktuell.forEach(n => { if (!alle.some(x => x.toLowerCase() === n.toLowerCase())) alle.push(n); });

    this.dialogZeigen("Mitarbeiter: " + this.swAnzeigename(z), (inhalt, knoepfe) => {
        if (this.text(z.m) === this.swVerschieden) {
            this.el(inhalt, "p", "kom-leise", "Bisher verschieden. Die Auswahl gilt für alle Baugruppen.");
        }

        const liste = this.el(inhalt, "div", "kom-auswahl");
        const boxen = alle.map(n => {
            const label = this.el(liste, "label", "kom-schalter");
            const box = this.el(label, "input");
            box.type = "checkbox";
            box.value = n;
            box.checked = aktuell.some(x => x.toLowerCase() === n.toLowerCase());
            this.el(label, "span", "", n + (this.namen.some(x => x.toLowerCase() === n.toLowerCase()) ? "" : " (nicht in der Liste)"));
            return box;
        });
        if (!alle.length) {
            this.el(inhalt, "p", "kom-leise", "Noch keine Mitarbeiter in der Liste. Unten „Mitarbeiter verwalten“ wählen.");
        }

        this.knopf(knoepfe, "Übernehmen", () => {
            this.dialogSchliessen();
            this.eintragen(z, "mitarbeiter", boxen.filter(b => b.checked).map(b => b.value).join(this.swTrenner), null);
        }, "haupt");
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

/* ---------------------------------------------------------------------------
   Mitarbeiter verwalten: eintragen und austragen (ausgetragene bleiben in der Datenbank)
   --------------------------------------------------------------------------- */

verwaltenDialog: async function () {

    const namen = await this.sicher(() => this.swMitarbeiterNamen());
    if (namen === null) return;
    this.namen = namen;

    this.dialogZeigen("Mitarbeiter verwalten", (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise",
            "Die Namen erscheinen in der Auswahl „Mitarbeiter“. Ausgetragene Namen verschwinden aus der Liste; bereits " +
            "eingetragene Zuweisungen bleiben stehen.");

        const tab = this.el(inhalt, "table", "kom-tabelle");
        const koerper = this.el(tab, "tbody");
        if (!namen.length) this.el(inhalt, "p", "kom-leise", "Noch keine Mitarbeiter eingetragen.");

        namen.forEach(n => {
            const tr = this.el(koerper, "tr");
            this.el(tr, "td", "", n);
            const td = this.el(tr, "td", "kom-aktionen");
            const b = this.knopf(td, "Austragen", () => this.mitarbeiterAktion(() => this.swMitarbeiterWeg(n), n + " ausgetragen."), "klein");
            b.setAttribute("aria-label", n + " austragen");
        });

        const neu = this.el(inhalt, "label", "kom-feld");
        this.el(neu, "span", "kom-feldname", "Neuer Name");
        const reihe = this.el(neu, "span", "kom-suchzeile");
        const f = this.el(reihe, "input", "kom-eingabe");
        f.type = "text";
        f.maxLength = this.swMaxName;
        f.placeholder = "Vor- und Nachname";
        const fehler = this.el(inhalt, "div", "kom-feldfehler");
        const eintragen = () => this.mitarbeiterAktion(() => this.swMitarbeiterNeu(f.value), null, fehler);
        f.onkeydown = e => { if (e.key === "Enter") eintragen(); };
        this.knopf(reihe, "Eintragen", eintragen, "haupt");

        this.knopf(knoepfe, "Fertig", () => { this.dialogSchliessen(); this.nachladen(); }, "haupt");
        this.dialogFokus = f;
    });
},

/* Aktion ausführen und den Dialog mit der neuen Liste zeigen; Fehler stehen im Dialog. */
mitarbeiterAktion: async function (aufgabe, meldung, fehlerEl) {

    let name = null;
    try {
        name = await aufgabe();
    } catch (fehler) {
        if (fehlerEl) { fehlerEl.textContent = fehler.message; return; }
        this.statusZeigen(fehler.message, "fehler");
        return;
    }

    await this.verwaltenDialog();
    this.statusZeigen(meldung || (name + " eingetragen."));
},

/* ---------------------------------------------------------------------------
   Archivieren und Zurück (mit Sicherheitsfrage)
   --------------------------------------------------------------------------- */

archivierenFragen: async function (z) {

    const r = await this.sicher(() => this.swArchivierenPruefen(z._id));
    if (r === null) return;

    const name = this.text(z.ab_nr);

    this.dialogZeigen("AB archivieren", (inhalt, knoepfe) => {
        const p = this.el(inhalt, "p");
        this.el(p, "b", "", name);
        this.el(p, "span", "", " mit " + r.n + " Zeilen ins Archiv legen?");
        this.el(inhalt, "p", "kom-leise", "Er verschwindet aus dem Schweißen. Im Archiv lässt er sich ansehen und wiederherstellen.");

        this.knopf(knoepfe, "Ja, archivieren", async () => {
            this.dialogSchliessen();
            const e = await this.sicher(() => this.swArchivieren(z._id));
            if (e === null) return;
            await this.nachladen();
            this.statusZeigen(e.ab + " wurde archiviert (" + e.n + " Zeilen).");
        }, "haupt");
        const nein = this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
        this.dialogFokus = nein;   /* Sicherheitsfrage: ein versehentliches Enter archiviert nichts */
    });
},

zurueckFragen: async function (z) {

    const r = await this.sicher(() => this.swZurueckPruefen(z._id));
    if (r === null) return;

    this.dialogZeigen("Zurück in die Bestandsliste", (inhalt, knoepfe) => {
        this.el(inhalt, "p", "", this.swRueckFrage(r));
        this.el(inhalt, "p", "kom-leise", this.swRueckVerlust);

        this.knopf(knoepfe, "Ja, zurück", async () => {
            this.dialogSchliessen();
            const a = await this.sicher(() => this.swZurueck(z._id));
            if (a === null) return;
            await this.nachladen();
            this.statusZeigen(this.swRueckName(r) + " ist wieder in der Bestandsliste.");
        }, "haupt");
        const nein = this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
        this.dialogFokus = nein;
    });
},


/* ===========================================================================
   HOOK 1: CSS. Nur CSS, jede Regel hängt an der Wrapper-Klasse.
   =========================================================================== */
form_on_load: function (FORM) {

    window.symolo.tools.injector.css(`
.kom-sw {
  --focus: var(--glow-red);
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-20: 80px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-pill: 999px;
  --blur-glass: 14px;
  --blur-glow: 60px;
  --font-sans: "Open Sans", "Segoe UI", Arial, sans-serif;
  --fs-display: 56px;
  --lh-display: 60px;
  --fw-display: 700;
  --ls-display: -0.01em;
  --fs-h1: 40px;
  --lh-h1: 46px;
  --fw-h1: 700;
  --fs-h2: 28px;
  --lh-h2: 34px;
  --fw-h2: 700;
  --fs-h3: 20px;
  --lh-h3: 28px;
  --fw-h3: 600;
  --fs-body: 16px;
  --lh-body: 26px;
  --fw-body: 400;
  --fs-small: 14px;
  --lh-small: 20px;
  --fw-small: 400;
  --fs-label: 13px;
  --lh-label: 18px;
  --fw-label: 600;
  --fs-button: 15px;
  --lh-button: 20px;
  --fw-button: 600;
  --brand-red: #c10000;
  --glow-red: #d01c12;
  --red-grad-start: #d91f15;
  --red-grad-end: #a00000;
  --brand-gray: #424242;
  --surface-0: #f7f6f5;
  --surface-100: #ffffff;
  --surface-glass: rgba(255,255,255,0.6);
  --line-glass: rgba(255,255,255,0.85);
  --glow-red-soft: rgba(214,30,30,0.4);
  --glow-gray-soft: rgba(66,66,66,0.25);
  --ink: #2e2f31;
  --ink-muted: #5f6266;
  --on-brand: #ffffff;
  --logo-ink: #424242;
  --line: #dcdcdf;
  --line-strong: #8a8d92;
  --status-komplett-bg: #c6efce;
  --status-komplett: #00b050;
  --status-teilweise-bg: #ffeb9c;
  --status-teilweise: #ffc000;
  --status-offen-bg: #ffffff;
  --status-offen: #bfbfbf;
  --on-status: #000000;
  --ampel-rot: #ff9b9b;
  --ampel-rot-bg: #ffe4e4;
  --ampel-gelb: #ffe678;
  --ampel-gelb-bg: #fff7d6;
  --shadow-glow: 0 8px 20px rgba(193,0,0,0.3);
  --shadow-glass: 0 8px 32px rgba(0,0,0,0.08);
}

/* Gemeinsame Stile aller Ansichten. .kom-sw wird beim Bauen durch die
   Klasse der Ansicht ersetzt: jede Regel beginnt damit (Skill, CSS-Scoping).
   Farben nur über FWM-Variablen. Kein Backtick in diesem Text.
   OFFEN (Symolo): Gibt das Fenster Schrift und Farben vor? Bis dahin
   FWM-Werte, Thema light; die Schrift erbt sonst die des Fensters. */

.kom-sw { display: flex; flex-direction: column; min-height: 100%;
  font-family: var(--font-sans); font-size: var(--fs-body); line-height: var(--lh-body);
  color: var(--ink); background: var(--surface-0); }

.kom-sw .kom-kopf { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); background: var(--surface-100); border-bottom: 1px solid var(--line); }
.kom-sw .kom-titel { margin: 0; font-size: var(--fs-h3); line-height: var(--lh-h3); font-weight: var(--fw-h3); }
.kom-sw .kom-info { font-size: var(--fs-small); line-height: var(--lh-small); color: var(--ink-muted); }

.kom-sw .kom-menue { flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: var(--space-1);
  padding: var(--space-2) var(--space-4); background: var(--surface-100); border-bottom: 1px solid var(--line); }
.kom-sw .kom-menuepunkt { min-height: 32px; padding: 0 var(--space-3); border: 1px solid transparent;
  border-radius: var(--radius-pill); background: none; color: var(--ink); cursor: pointer;
  font-family: inherit; font-size: var(--fs-small); font-weight: var(--fw-label); }
.kom-sw .kom-menuepunkt:hover { border-color: var(--glow-red); color: var(--glow-red); }
.kom-sw .kom-menuepunkt.kom-aktiv { background: var(--brand-gray); border-color: var(--brand-gray); color: var(--on-brand); }
.kom-sw .kom-menuepunkt:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }

.kom-sw .kom-koerper { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--space-4); }

.kom-sw .kom-fuss { flex: 0 0 auto; display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: var(--surface-100); border-top: 1px solid var(--line);
  white-space: nowrap; overflow-x: auto; }
.kom-sw .kom-vermerk { margin-left: auto; font-size: var(--fs-label); color: var(--ink-muted); }

.kom-sw .kom-knopf { min-height: 36px; padding: 0 var(--space-3); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); cursor: pointer;
  font-family: inherit; font-size: var(--fs-button); font-weight: var(--fw-button); }
.kom-sw .kom-knopf:hover { border-color: var(--glow-red); color: var(--glow-red); }
.kom-sw .kom-knopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.kom-sw .kom-knopf-haupt { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-sw .kom-knopf-haupt:hover { background: var(--red-grad-end); color: var(--on-brand); }

.kom-sw .kom-tabelle { width: 100%; border-collapse: collapse; background: var(--surface-100);
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-sw .kom-tabelle th { text-align: left; padding: var(--space-2) var(--space-3); color: var(--ink-muted);
  font-weight: var(--fw-label); border-bottom: 1px solid var(--line-strong); }
.kom-sw .kom-tabelle td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); }
.kom-sw .kom-tabelle .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-sw .kom-aktionen { text-align: right; white-space: nowrap; }

.kom-sw .kom-leer { padding: var(--space-3); color: var(--ink-muted); }

/* Die Meldung blendet ein und aus, Fehler bleiben stehen. */
.kom-sw .kom-status { position: fixed; bottom: var(--space-4); left: 50%; transform: translateX(-50%);
  max-width: 90%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  background: var(--brand-gray); color: var(--on-brand); font-size: var(--fs-small);
  opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 20; }
.kom-sw .kom-status.kom-zeigen { opacity: .95; }
.kom-sw .kom-status.kom-fehler { background: var(--brand-red); pointer-events: auto; }

.kom-sw .kom-knopf-rot { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-sw .kom-knopf-rot:hover { background: var(--red-grad-end); color: var(--on-brand); }
.kom-sw .kom-knopf:disabled { opacity: .5; cursor: default; }

/* Fenster in der Mitte (Dialog, Menü) */
.kom-sw .kom-dialog-hinter { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center;
  justify-content: center; padding: var(--space-4); background: color-mix(in srgb, var(--ink) 35%, transparent); }
.kom-sw .kom-dialog { width: min(560px, 100%); max-height: 90vh; overflow: auto; padding: var(--space-4);
  border-radius: var(--radius-lg); background: var(--surface-100); color: var(--ink);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--ink) 30%, transparent); }
.kom-sw .kom-dialog-titel { margin: 0 0 var(--space-3); text-align: center; font-size: var(--fs-h3); }
.kom-sw .kom-dialog-inhalt { font-size: var(--fs-small); }
.kom-sw .kom-dialog-knoepfe { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2);
  margin-top: var(--space-3); }
.kom-sw .kom-dialog-knoepfe.kom-dialog-spalte { flex-direction: column; align-items: stretch; }
.kom-sw .kom-dialog-knoepfe .kom-knopf { min-height: 44px; }

/* box-sizing an einer Stelle (Skill, Falle 5). Jede neue Box kommt hierher. */
.kom-sw .kom-menue, .kom-sw .kom-menuepunkt, .kom-sw .kom-kopf, .kom-sw .kom-koerper, .kom-sw .kom-fuss, .kom-sw .kom-knopf,
.kom-sw .kom-tabelle, .kom-sw .kom-status, .kom-sw .kom-dialog { box-sizing: border-box; }


/* Bestandsliste (Entwurf D): eine Karte je AB, Tabelle wie Excel.
   Statusfarben sind Bedeutungsfarben (grün/gelb/weiß) und bleiben. */

.kom-sw .kom-oben { display: flex; flex-direction: column; gap: var(--space-3); margin-bottom: var(--space-3); }

.kom-sw .kom-zaehler { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.kom-sw .kom-pille { padding: var(--space-1) var(--space-3); border: 1px solid var(--line-strong);
  border-radius: 999px; background: var(--surface-100); font-size: var(--fs-small); white-space: nowrap; }
.kom-sw .kom-pille.kom-komplett { border-color: var(--status-komplett); background: var(--status-komplett-bg); }
.kom-sw .kom-pille.kom-teilweise { border-color: var(--status-teilweise); background: var(--status-teilweise-bg); }

.kom-sw .kom-leiste { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3); }
.kom-sw .kom-feld { display: flex; flex-direction: column; gap: var(--space-1); }
.kom-sw .kom-feldname { font-size: var(--fs-label); color: var(--ink-muted); }
.kom-sw .kom-suchfeld { flex: 1 1 320px; }
.kom-sw .kom-suchzeile { display: flex; gap: var(--space-2); }
.kom-sw .kom-eingabe { min-height: 36px; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink);
  font-family: inherit; font-size: var(--fs-small); }
.kom-sw .kom-suchzeile .kom-eingabe { flex: 1 1 auto; min-width: 0; }
.kom-sw .kom-eingabe:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.kom-sw .kom-knopfgruppe { display: flex; gap: var(--space-1); }
.kom-sw .kom-knopf.kom-gewaehlt { background: var(--brand-gray); border-color: var(--brand-gray); color: var(--on-brand); }
.kom-sw .kom-schalter { display: flex; align-items: center; gap: var(--space-2); min-height: 36px;
  font-size: var(--fs-small); cursor: pointer; }

.kom-sw .kom-hinweis { margin-bottom: var(--space-3); font-size: var(--fs-small); }
.kom-sw .kom-hinweis:empty { display: none; }
.kom-sw .kom-hinweis .kom-knopf { min-height: 28px; margin-left: var(--space-2); }

/* Breite Liste scrollt waagerecht; die Kopfzeile scrollt mit. */
.kom-sw .kom-liste { overflow-x: auto; }
.kom-sw .kom-karte { min-width: 1510px; margin-bottom: var(--space-4); background: var(--surface-100);
  border: 1px solid var(--line); border-radius: var(--radius-lg); overflow: hidden; }
.kom-sw .kom-mehr-an .kom-karte { min-width: 2520px; }
/* Karten außerhalb des sichtbaren Bereichs rechnet der Browser erst beim Hinscrollen (schnell bei vielen ABs). */
.kom-sw .kom-karte { content-visibility: auto; contain-intrinsic-size: auto 120px; }

.kom-sw .kom-bestand { width: 100%; min-width: 1510px; table-layout: fixed; border-collapse: collapse;
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-sw .kom-mehr-an .kom-bestand { min-width: 2520px; }
.kom-sw .kom-bestand th { padding: var(--space-1) var(--space-2); text-align: left; font-weight: var(--fw-label);
  color: var(--ink-muted); white-space: normal; }
.kom-sw .kom-bestand td { padding: var(--space-1) var(--space-2); border-bottom: 1px solid var(--line);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kom-sw .kom-bestand tbody:last-child tr:last-child td { border-bottom: none; }
.kom-sw .kom-bestand .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-sw .kom-bestand .kom-mitte { text-align: center; }
.kom-sw .kom-bestand .kom-leise { color: var(--ink-muted); }

/* Spaltenbreiten wie bisher; weitere Spalten nur mit dem Schalter. */
.kom-sw .kom-c-klapp { width: 40px; }
.kom-sw .kom-c-nr { width: 190px; }
.kom-sw .kom-c-ben { width: 170px; }
.kom-sw .kom-c-lk { width: 52px; }
.kom-sw .kom-c-soll { width: 60px; }
.kom-sw .kom-c-vh { width: 96px; }
.kom-sw .kom-c-lager { width: 80px; }
.kom-sw .kom-c-status { width: 108px; }
.kom-sw .kom-c-fort { width: 130px; }
.kom-sw .kom-c-balken { width: 80px; }
.kom-sw .kom-c-datum { width: 110px; }
.kom-sw .kom-c-mbg { width: 72px; }
.kom-sw .kom-c-idx { width: 88px; }
.kom-sw .kom-c-text { width: 150px; }
.kom-sw .kom-c-aktion { width: 110px; }
.kom-sw .kom-mehr { display: none; }
.kom-sw .kom-mehr-an td.kom-mehr, .kom-sw .kom-mehr-an th.kom-mehr { display: table-cell; }
.kom-sw .kom-mehr-an col.kom-mehr { display: table-column; }

/* Zeilen: AB kräftig, Baugruppe hell mit Balken links, Teil zart. */
.kom-sw .kom-ab td { font-weight: var(--fw-label); }
.kom-sw .kom-ab.kom-komplett td { background: var(--status-komplett); color: var(--on-status); }
.kom-sw .kom-ab.kom-teilweise td { background: var(--status-teilweise); color: var(--on-status); }
.kom-sw .kom-bg.kom-komplett td { background: color-mix(in srgb, var(--status-komplett) 55%, var(--surface-100)); }
.kom-sw .kom-bg.kom-teilweise td { background: color-mix(in srgb, var(--status-teilweise) 55%, var(--surface-100)); }
.kom-sw .kom-bg.kom-offen td, .kom-sw .kom-bg.kom-leer-status td { background: color-mix(in srgb, var(--brand-gray) 22%, var(--surface-100)); }
.kom-sw .kom-bg.kom-komplett td:first-child { box-shadow: inset 6px 0 0 var(--status-komplett); }
.kom-sw .kom-bg.kom-teilweise td:first-child { box-shadow: inset 6px 0 0 var(--status-teilweise); }
.kom-sw .kom-teil.kom-komplett td { background: var(--status-komplett-bg); }
.kom-sw .kom-teil.kom-teilweise td { background: var(--status-teilweise-bg); }
.kom-sw .kom-bg-block tr:first-child td { border-top: var(--space-2) solid var(--surface-100); }

.kom-sw .kom-klapp, .kom-sw .kom-name { padding: 0; border: none; background: none; color: inherit;
  font: inherit; cursor: pointer; text-align: left; }
.kom-sw .kom-klapp { width: 28px; min-height: 28px; font-size: var(--fs-body); }
.kom-sw .kom-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-decoration: underline dotted; }
.kom-sw .kom-klapp:focus-visible, .kom-sw .kom-name:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

.kom-sw .kom-statusmarke { display: inline-block; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); font-weight: var(--fw-label); }
.kom-sw .kom-statusmarke.kom-komplett { border-color: var(--status-komplett); }
.kom-sw .kom-statusmarke.kom-teilweise { border-color: var(--status-teilweise); }

.kom-sw .kom-balken { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.kom-sw .kom-balken span { display: block; height: 100%; background: var(--brand-gray); }
.kom-sw .kom-ab .kom-balken { background: var(--surface-100); }
.kom-sw .kom-ab .kom-balken span { background: var(--ink); }

/* Eintragen (Phase 2) */
.kom-sw .kom-statusknopf { cursor: pointer; font: inherit; font-weight: var(--fw-label); }
.kom-sw .kom-statusknopf:hover { border-color: var(--glow-red); }
.kom-sw .kom-statusknopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.kom-sw .kom-bestand .kom-eingabe { width: 100%; min-height: 28px; text-align: right; }
.kom-sw .kom-platzwahl { width: 100%; min-height: 28px; border: 1px solid var(--line-strong); border-radius: var(--radius-sm);
  background: var(--surface-100); color: var(--ink); font: inherit; }
.kom-sw .kom-eingabe.kom-ungueltig { border: 2px solid var(--glow-red); }
.kom-sw .kom-feldfehler { color: var(--glow-red); font-size: var(--fs-label); white-space: normal; }
.kom-sw .kom-feldfehler:empty { display: none; }
.kom-sw .kom-soll-tabelle .kom-eingabe { width: 110px; text-align: right; }

.kom-sw .kom-pille, .kom-sw .kom-eingabe, .kom-sw .kom-karte, .kom-sw .kom-bestand,
.kom-sw .kom-balken, .kom-sw .kom-statusmarke, .kom-sw .kom-platzwahl { box-sizing: border-box; }

/* Fenster "AB archivieren" */
.kom-sw .kom-dialog .kom-leise { margin: 0 0 var(--space-3); color: var(--ink-muted); font-size: var(--fs-small); }
.kom-sw .kom-dialog .kom-breit { width: 100%; text-align: left; box-sizing: border-box; }

/* Entnehmen (Phase 6) und "Befinden sich im Schweißen": rote Zeile am AB */
.kom-sw .kom-bestand td.kom-aktion { text-align: right; overflow: visible; }
.kom-sw .kom-knopf-klein, .kom-sw .kom-knopf-rot-klein { min-height: 28px; padding: 0 var(--space-2); font-size: var(--fs-label); }
.kom-sw .kom-knopf-rot-klein { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-sw .kom-knopf-rot-klein:hover { background: var(--red-grad-end); color: var(--on-brand); }
.kom-sw .kom-imsw td { background: color-mix(in srgb, var(--brand-red) 16%, var(--surface-100)); }
.kom-sw .kom-imsw td.kom-imsw-hinweis { color: var(--brand-red); font-weight: var(--fw-label); }
.kom-sw .kom-link { padding: 0; border: none; background: none; color: inherit; font: inherit; font-weight: inherit; cursor: pointer; text-decoration: underline; }
.kom-sw .kom-link:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }


/* Schweißen: Tabelle wie die Bestandsliste (bestand.css), dazu Eingabefelder und Spaltenbreiten. */

.kom-sw .kom-leise { color: var(--ink-muted); font-size: var(--fs-small); }
.kom-sw .kom-oben > .kom-leise { margin: 0; }

.kom-sw .kom-karte, .kom-sw .kom-bestand { min-width: 1700px; }
.kom-sw .kom-mehr-an .kom-karte, .kom-sw .kom-mehr-an .kom-bestand { min-width: 2620px; }

.kom-sw .kom-c-swm { width: 150px; }
.kom-sw .kom-c-swp { width: 120px; }
.kom-sw .kom-c-swt { width: 190px; }
.kom-sw .kom-c-dlz { width: 56px; }
.kom-sw .kom-c-aktion { width: 190px; }

.kom-sw .kom-bestand td.kom-aktion .kom-knopf-klein + .kom-knopf-klein { margin-left: var(--space-1); }

/* Eintragsfelder */
.kom-sw .kom-feldknopf { width: 100%; min-height: 28px; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); font: inherit; text-align: left;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.kom-sw .kom-feldknopf:hover { border-color: var(--glow-red); }
.kom-sw .kom-feldknopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

.kom-sw .kom-sw-datumzelle { position: relative; display: flex; gap: var(--space-1); align-items: center; }
.kom-sw .kom-bestand .kom-sw-datumzelle .kom-eingabe { flex: 1 1 auto; width: auto; min-width: 0; text-align: left; }
.kom-sw .kom-sw-datumzelle .kom-sw-kalenderknopf { flex: 0 0 32px; width: 32px; padding: 0; text-align: center; }
.kom-sw .kom-sw-kalender { position: absolute; right: 0; bottom: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; }

/* Auswahl im Fenster */
.kom-sw .kom-auswahl { display: flex; flex-direction: column; gap: var(--space-1); max-height: 50vh; overflow: auto;
  margin-bottom: var(--space-3); }
.kom-sw .kom-dialog .kom-tabelle { margin-bottom: var(--space-3); }

/* Sammlung: Überschrift eines AB, dessen Baugruppen einzeln im Schweißen liegen */
.kom-sw .kom-sammlung td { background: color-mix(in srgb, var(--brand-gray) 22%, var(--surface-100)); }
.kom-sw .kom-kacheln { display: flex; flex-wrap: wrap; gap: var(--space-2); white-space: normal; }
.kom-sw .kom-kachel-rot { padding: var(--space-1) var(--space-3); border-radius: var(--radius-sm);
  border: none; background: var(--brand-red); color: var(--on-brand); font: inherit; font-size: var(--fs-small); white-space: nowrap; cursor: pointer; }
.kom-sw .kom-komzeile td { white-space: normal; overflow: visible; }

.kom-sw .kom-schalter, .kom-sw .kom-feldknopf, .kom-sw .kom-auswahl { box-sizing: border-box; }

`, "KOMSWCSS");
},

/* ===========================================================================
   HOOK 3: Aufräumen. Genau die CSS-ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function (FORM, {}) {

    window.symolo.tools.injector.rmcss("KOMSWCSS");
}

}

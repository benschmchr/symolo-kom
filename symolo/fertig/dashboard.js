/* ===========================================================================
   Bestandsliste Kommissionierung Stahlbau – Ansicht „Dashboard“ für Symolo
   Automatisch erzeugt mit tools/symolo_bauen.py aus symolo/quelle und
   symolo/ansichten/dashboard. NICHT VON HAND ÄNDERN.

   Einbau: Alles ab der nächsten Zeile mit { bis zum Ende als Hook-Objekt
   ins Formular einfügen. Das Formular braucht ein Feld mit der Bindung
   "_output". Anpassungen nur in 10_einstellungen.js und 20_tabellen.js
   (dann neu bauen). Anleitung: docs/Symolo_Anbindung.md
   Erstellt: Ben Schumacher, 09.10.2026
   =========================================================================== */
{

/* Kenndaten dieser Ansicht (aus tools/symolo_bauen.py). */
ansicht: { name: "dashboard", titel: "Dashboard", klasse: "kom-db", praefix: "komDb", cssId: "KOMDBCSS" },


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
    schreibenErlaubtInSymolo: false
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

/* R-X3 neu: AB aus dem Archiv in die Bestandsliste zurückholen. kopf = Zeile
   aus archivLaden. Einen AB aus dem Schweißen holt die Ansicht Schweißen
   zurück (Phase 6). Hat der AB inzwischen seinen Platz in der Reihenfolge
   verloren, kommt er ans Ende (wie bisher). */
archivWiederherstellen: async function (kopf) {

    const name = this.text(kopf.ab_anzeige);

    if (this.archivAusSchweissen(kopf)) {
        throw new Error(name + " wurde im Schweißen archiviert. Dorthin holt ihn die Ansicht Schweißen zurück (kommt noch).");
    }

    /* nicht archivierte ABs mit demselben Schlüssel */
    const da = await this.datenLesen("auftrag", { wo: { ab_schluessel: kopf.ab_schluessel }, aufloesen: false });
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
        return this.archivZeilenAusSchweissen(sz, kopf);
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
                sz.filter(s => this.text(s.ab_schluessel) === this.text(k.ab_schluessel)), k);
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
        felder: ["nr", "ab_nr", "ab_schluessel", "ebene", "eingelagert", "liefertermin_stahlbau", "termin_versand"]
    });

    return this.statAusSchweissen(live).concat(this.statAusArchiv(archiv));
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
            if (art === "bg" || art === "ohne") {
                const td = this.zelle(tr, "", "", art === "bg" ? k.knoten.o.name : undefined, 2);
                if (art === "bg" && k.klapp) this.nameKnopf(td, k.knoten.o.name, k.klapp.umschalten);
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
            if (art === "ohne") leer();
            else this.statusZelle(tr, k.knoten.w);
        } else if (spalte === "termin") {
            if (art === "ab") this.terminZelle(tr, k.d);
            else leer();
        } else if (spalte === "proz") {
            if (art === "ohne") leer();
            else this.zelle(tr, this.prozentText(k.knoten.w.prozent), "kom-zahl");
        } else if (spalte === "balken") {
            if (art === "ohne") leer();
            else this.balkenZelle(tr, k.knoten.w);
        } else if (spalte === "stand") {
            if (art === "ohne") this.zelle(tr, k.g.teile.length + (k.g.teile.length === 1 ? " Teil" : " Teile"), "kom-leise");
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
    const abUmschalten = () => { d.offen = !d.offen; this.gemerkt[d.schluessel] = d.offen; neu(); };

    /* AB-Zeile: Nummer, Verkaufsartikel, Kunde */
    const tr = this.el(koerper, "tr", "kom-dab " + this.statusKlasse(a.w));
    this.zeileBauen(tr, "ab", {
        knoten: a, d: d,
        klapp: d.gruppen.length > 0 ? { offen: d.offen, name: a.o.ab_anzeige, umschalten: abUmschalten } : null
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

    this.koerper = this.el(view, "div", "kom-koerper");

    this.fuss = this.el(view, "div", "kom-fuss");
    this.el(this.fuss, "span", "kom-vermerk", "Erstellt: Ben Schumacher, 09.10.2026");

    this.statusEl = window.symolo.tools.layout.create({
        parent: view, class: "kom-status", id: this.ansicht.praefix + "Status"
    });

    return view;
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
   ANSICHT: Dashboard (R-DB1 bis R-DB6)
   Kopf mit Kacheln (Komplett, Teilweise, Offen, Aufträge, Forecast), Suche,
   Knöpfe ABs/BGs/Alles, Sortieren, Kunde und eine Karte je AB mit
   Baugruppen und Teilen. Neu in Phase 5: Spalte "Planung" (Häkchen) und die
   Kachel Forecast. Sortierung, Filter und Klappen rechnet 4A_dashboard.js,
   gezeichnet wird die Liste in 4J_liste.js.

   Noch nicht dabei: die Zeilen "Befinden sich im Schweißen" (Phase 6).

   Die Kachel Forecast zählt die roten und gelben offenen ABs (auch die ganz
   im Schweißen, W11). Fehlt der Forecast oder lässt er sich nicht laden,
   steht dort ein Strich.
   =========================================================================== */

listeSpalten: [
    ["klapp", ""], ["ab", "Arbeitsauftrag"], ["bg", "Baugruppe"], ["teil", "Einzelteil"], ["kunde", "Kunde"],
    ["lager", "Lagerort"], ["status", "Status"], ["proz", "Fortschritt"], ["balken", ""], ["stand", "Stand"],
    ["planung", "Planung"]
],
listeSortierungen: [["ab", "Absteigend"], ["auf", "Aufsteigend"]],

fcDaten: null,
swAbsListe: [],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-label", "Dashboard");
    this.kopfEl = this.el(this.koerper, "div", "kom-dash-reihe");
    this.listeLeisteBauen(["suche", "knoepfe", "sort", "kunde"]);
    this.meldungEl = this.el(this.koerper, "div", "kom-hinweis");
    this.listeEl = this.el(this.koerper, "div", "kom-liste");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const abs = await this.sicher(() => this.bestandLaden());
    if (abs !== null) this.abs = abs;

    /* Häkchen, Forecast und Schweißen: gehört dazu, aber das Dashboard geht auch ohne. */
    const marken = await this.sicher(() => this.plMarkenLaden());
    if (marken !== null) {
        this.markenZeilen = marken;
        this.marken = this.plAktive(marken);
    }

    this.fcDaten = await this.sicher(() => this.fcLaden());

    const sw = await this.sicher(() => this.swLesen());
    this.swAbsListe = sw === null ? [] : this.swForecastAbs(this.swBloecke(sw));

    this.alleAbs = this.fcMitSchweissen(this.abs, this.swAbsListe);

    if (abs !== null && marken !== null && this.fcDaten !== null && sw !== null) {
        this.statusZeigen(abs.length + " Arbeitsaufträge geladen.");
    }

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen: aus dem Zustand, nie aus den Rohdaten (Skill, Ablauf 6)
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    this.listeHeute = this.tagHeute();
    this.listeFelderEinstellen(this.abs);
    this.kopfZeichnen();

    const gefiltert = Boolean(this.suche) || this.kunde !== this.dashAlleKunden;
    const liste = this.dashSortieren(this.dashFiltern(this.abs, this.suche, this.kunde), this.sortierung);
    this.dashKlappen(liste, this.ansichtWahl, this.gemerkt);
    this.plMarkieren(liste, this.marken);

    this.listeZeichnen(liste, "Noch keine Arbeitsaufträge in der Bestandsliste. Entweder ist die Liste leer oder sie konnte nicht gelesen werden (siehe Meldung unten).", gefiltert);
},

/* R-DB5: Kacheln in einer Reihe, zählen immer alle ABs. */
kopfZeichnen: function () {

    const k = this.dashKopf(this.abs);
    this.kopfEl.replaceChildren();

    const kachel = (titel, zahl, anteil, art) => {
        const x = this.el(this.kopfEl, "div", "kom-kachel");
        this.el(x, "span", "kom-label", titel);
        this.el(x, "span", "kom-zahl-gross", String(zahl));
        const balken = this.el(x, "span", "kom-kachel-balken " + art);
        balken.title = anteil + " % der Aufträge";
        this.el(balken, "span").style.width = anteil + "%";
    };

    kachel("Komplett", k.komplett, k.komplett_anteil, "kom-komplett");
    kachel("Teilweise", k.teilweise, k.teilweise_anteil, "kom-teilweise");
    kachel("Offen", k.offen, k.offen_anteil, "kom-offen");

    this.fcKachelZeichnen();

    const akzent = this.el(this.kopfEl, "div", "kom-kachel kom-kachel-akzent");
    this.el(akzent, "span", "kom-label", "Aufträge");
    this.el(akzent, "span", "kom-zahl-gross", String(k.ab));
    this.el(akzent, "span", "kom-label", "Gesamtfortschritt");
    this.el(akzent, "span", "kom-zahl-mittel", k.gesamt_txt);
    const balken = this.el(akzent, "span", "kom-kachel-balken kom-hell");
    balken.title = k.gesamt_txt;
    this.el(balken, "span").style.width = Math.round(k.gesamt * 100) + "%";
},

/* Kachel Forecast: rote und gelbe ABs, "vom" = Tag des Imports. */
fcKachelZeichnen: function () {

    const x = this.el(this.kopfEl, "div", "kom-kachel");
    this.el(x, "span", "kom-label", "Forecast");

    const fc = this.fcDaten;
    const kachel = fc && fc.f ? this.fcKachel(this.alleAbs, fc.f, fc.termine, this.listeHeute) : null;

    if (!kachel) {
        this.el(x, "span", "kom-zahl-gross", "–");
        this.el(x, "span", "kom-leise", fc === null ? "Forecast konnte nicht geladen werden" : "Noch kein Forecast importiert");
        return;
    }

    const zahl = this.el(x, "span", "kom-zahl-gross");
    this.el(zahl, "span", "", String(kachel.rot));
    this.el(zahl, "span", "kom-klein kom-leise", " rot · ");
    this.el(zahl, "span", "", String(kachel.gelb));
    this.el(zahl, "span", "kom-klein kom-leise", " gelb");

    const punkte = this.el(x, "span", "kom-klein kom-leise");
    this.el(punkte, "i", "kom-punkt kom-punkt-rot");
    this.el(punkte, "span", "", "bis 14 Tage · ");
    this.el(punkte, "i", "kom-punkt kom-punkt-gelb");
    this.el(punkte, "span", "", "15–30 Tage · vom " + this.tagText(kachel.vom).slice(0, 6));
},


/* ===========================================================================
   HOOK 1: CSS. Nur CSS, jede Regel hängt an der Wrapper-Klasse.
   =========================================================================== */
form_on_load: function (FORM) {

    window.symolo.tools.injector.css(`
.kom-db {
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

/* Gemeinsame Stile aller Ansichten. .kom-db wird beim Bauen durch die
   Klasse der Ansicht ersetzt: jede Regel beginnt damit (Skill, CSS-Scoping).
   Farben nur über FWM-Variablen. Kein Backtick in diesem Text.
   OFFEN (Symolo): Gibt das Fenster Schrift und Farben vor? Bis dahin
   FWM-Werte, Thema light; die Schrift erbt sonst die des Fensters. */

.kom-db { display: flex; flex-direction: column; min-height: 100%;
  font-family: var(--font-sans); font-size: var(--fs-body); line-height: var(--lh-body);
  color: var(--ink); background: var(--surface-0); }

.kom-db .kom-kopf { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); background: var(--surface-100); border-bottom: 1px solid var(--line); }
.kom-db .kom-titel { margin: 0; font-size: var(--fs-h3); line-height: var(--lh-h3); font-weight: var(--fw-h3); }
.kom-db .kom-info { font-size: var(--fs-small); line-height: var(--lh-small); color: var(--ink-muted); }

.kom-db .kom-koerper { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--space-4); }

.kom-db .kom-fuss { flex: 0 0 auto; display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: var(--surface-100); border-top: 1px solid var(--line);
  white-space: nowrap; overflow-x: auto; }
.kom-db .kom-vermerk { margin-left: auto; font-size: var(--fs-label); color: var(--ink-muted); }

.kom-db .kom-knopf { min-height: 36px; padding: 0 var(--space-3); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); cursor: pointer;
  font-family: inherit; font-size: var(--fs-button); font-weight: var(--fw-button); }
.kom-db .kom-knopf:hover { border-color: var(--glow-red); color: var(--glow-red); }
.kom-db .kom-knopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.kom-db .kom-knopf-haupt { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-db .kom-knopf-haupt:hover { background: var(--red-grad-end); color: var(--on-brand); }

.kom-db .kom-tabelle { width: 100%; border-collapse: collapse; background: var(--surface-100);
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-db .kom-tabelle th { text-align: left; padding: var(--space-2) var(--space-3); color: var(--ink-muted);
  font-weight: var(--fw-label); border-bottom: 1px solid var(--line-strong); }
.kom-db .kom-tabelle td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); }
.kom-db .kom-tabelle .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-db .kom-aktionen { text-align: right; white-space: nowrap; }

.kom-db .kom-leer { padding: var(--space-3); color: var(--ink-muted); }

/* Die Meldung blendet ein und aus, Fehler bleiben stehen. */
.kom-db .kom-status { position: fixed; bottom: var(--space-4); left: 50%; transform: translateX(-50%);
  max-width: 90%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  background: var(--brand-gray); color: var(--on-brand); font-size: var(--fs-small);
  opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 20; }
.kom-db .kom-status.kom-zeigen { opacity: .95; }
.kom-db .kom-status.kom-fehler { background: var(--brand-red); pointer-events: auto; }

.kom-db .kom-knopf-rot { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-db .kom-knopf-rot:hover { background: var(--red-grad-end); color: var(--on-brand); }
.kom-db .kom-knopf:disabled { opacity: .5; cursor: default; }

/* Fenster in der Mitte (Dialog, Menü) */
.kom-db .kom-dialog-hinter { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center;
  justify-content: center; padding: var(--space-4); background: color-mix(in srgb, var(--ink) 35%, transparent); }
.kom-db .kom-dialog { width: min(560px, 100%); max-height: 90vh; overflow: auto; padding: var(--space-4);
  border-radius: var(--radius-lg); background: var(--surface-100); color: var(--ink);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--ink) 30%, transparent); }
.kom-db .kom-dialog-titel { margin: 0 0 var(--space-3); text-align: center; font-size: var(--fs-h3); }
.kom-db .kom-dialog-inhalt { font-size: var(--fs-small); }
.kom-db .kom-dialog-knoepfe { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2);
  margin-top: var(--space-3); }
.kom-db .kom-dialog-knoepfe.kom-dialog-spalte { flex-direction: column; align-items: stretch; }
.kom-db .kom-dialog-knoepfe .kom-knopf { min-height: 44px; }

/* box-sizing an einer Stelle (Skill, Falle 5). Jede neue Box kommt hierher. */
.kom-db .kom-kopf, .kom-db .kom-koerper, .kom-db .kom-fuss, .kom-db .kom-knopf,
.kom-db .kom-tabelle, .kom-db .kom-status, .kom-db .kom-dialog { box-sizing: border-box; }


/* Karten-Liste von Dashboard, Forecast und Planung: Kopf mit Kacheln, darunter eine Karte je AB.
   Statusfarben (grün/gelb/weiß) und Ampel (rot/gelb) sind Bedeutungsfarben und bleiben.
   Eingebunden über "css": ["liste"] in tools/symolo_bauen.py. */

.kom-db .kom-label { margin: 0; font-size: var(--fs-label); color: var(--ink-muted); }
.kom-db .kom-leise { color: var(--ink-muted); }
.kom-db .kom-klein { font-size: var(--fs-label); }

.kom-db .kom-dash-reihe { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);
  margin: var(--space-2) 0 var(--space-4); }
.kom-db .kom-kachel { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3);
  border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface-100); }
.kom-db .kom-kachel-akzent { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-db .kom-kachel-akzent .kom-label { color: var(--on-brand); }
.kom-db .kom-zahl-gross { font-size: var(--fs-h2); line-height: var(--lh-h2); font-weight: var(--fw-h2); }
.kom-db .kom-zahl-mittel { font-size: var(--fs-h3); line-height: var(--lh-h3); font-weight: var(--fw-h3); }
.kom-db .kom-kachel-balken { display: block; height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.kom-db .kom-kachel-balken span { display: block; height: 100%; background: var(--brand-gray); }
.kom-db .kom-kachel-balken.kom-komplett span { background: var(--status-komplett); }
.kom-db .kom-kachel-balken.kom-teilweise span { background: var(--status-teilweise); }
.kom-db .kom-kachel-balken.kom-hell { background: color-mix(in srgb, var(--on-brand) 30%, transparent); }
.kom-db .kom-kachel-balken.kom-hell span { background: var(--on-brand); }

.kom-db .kom-leiste { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-3); margin-bottom: var(--space-3); }
.kom-db .kom-feld { display: flex; flex-direction: column; gap: var(--space-1); }
.kom-db .kom-feldname { font-size: var(--fs-label); color: var(--ink-muted); }
.kom-db .kom-suchfeld { flex: 1 1 280px; }
.kom-db .kom-suchzeile { display: flex; gap: var(--space-2); }
.kom-db .kom-eingabe { min-height: 36px; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); font-family: inherit; font-size: var(--fs-small); }
.kom-db .kom-suchzeile .kom-eingabe { flex: 1 1 auto; min-width: 0; }
.kom-db .kom-eingabe:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.kom-db .kom-knopfgruppe { display: flex; gap: var(--space-1); }
.kom-db .kom-knopf.kom-gewaehlt { background: var(--brand-gray); border-color: var(--brand-gray); color: var(--on-brand); }

.kom-db .kom-hinweis { margin-bottom: var(--space-3); font-size: var(--fs-small); }
.kom-db .kom-hinweis:empty { display: none; }
.kom-db .kom-hinweis .kom-knopf { min-height: 28px; margin-left: var(--space-2); }

/* Breite Liste scrollt waagerecht. */
.kom-db .kom-liste { overflow-x: auto; }
.kom-db .kom-karte { min-width: 1100px; margin-bottom: var(--space-4); background: var(--surface-100);
  border: 1px solid var(--line); border-top: 4px solid var(--brand-gray); border-radius: var(--radius-lg); overflow: hidden;
  content-visibility: auto; contain-intrinsic-size: auto 60px; }

.kom-db .kom-dash { width: 100%; min-width: 1100px; table-layout: fixed; border-collapse: collapse;
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-db .kom-dash th { padding: var(--space-1) var(--space-2); text-align: left; font-weight: var(--fw-label); color: var(--ink-muted); white-space: normal; }
.kom-db .kom-dash td { padding: var(--space-1) var(--space-2); border-bottom: 1px solid var(--line);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kom-db .kom-dash tbody tr:last-child td { border-bottom: none; }
.kom-db .kom-dash .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-db .kom-dash .kom-mitte { text-align: center; }
.kom-db .kom-kopfzeile { margin: 0; }

.kom-db .kom-c-klapp { width: 40px; }
.kom-db .kom-c-ab { width: 150px; }
.kom-db .kom-c-bg { width: 220px; }
.kom-db .kom-c-teil { width: 300px; }
.kom-db .kom-c-kunde { width: 110px; }
.kom-db .kom-c-lager { width: 80px; }
.kom-db .kom-c-status { width: 108px; }
.kom-db .kom-c-proz { width: 90px; }
.kom-db .kom-c-balken { width: 90px; }
.kom-db .kom-c-stand { width: 120px; }
.kom-db .kom-c-station { width: 100px; }
.kom-db .kom-c-termin { width: 130px; }
.kom-db .kom-c-planung { width: 80px; }

/* AB-Zeile in Statusfarbe, Baugruppen und Teile weiß mit farbigem Status (wie Excel) */
.kom-db .kom-dab td { font-weight: var(--fw-label); }
.kom-db .kom-dab.kom-komplett td { background: var(--status-komplett-bg); }
.kom-db .kom-dab.kom-teilweise td { background: var(--status-teilweise-bg); }
.kom-db .kom-dab.kom-offen td { background: var(--status-offen-bg); }
.kom-db .kom-dbg td { background: var(--surface-100); }
.kom-db .kom-dohne td { background: color-mix(in srgb, var(--brand-gray) 12%, var(--surface-100)); }
.kom-db .kom-ab-nr { margin-right: var(--space-3); font-weight: var(--fw-label); }
.kom-db .kom-ab-text { color: var(--ink-muted); font-weight: normal; }

.kom-db .kom-klapp, .kom-db .kom-name { padding: 0; border: none; background: none; color: inherit;
  font: inherit; cursor: pointer; text-align: left; }
.kom-db .kom-klapp { width: 28px; min-height: 28px; font-size: var(--fs-body); }
.kom-db .kom-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: var(--fw-label); }
.kom-db .kom-klapp:focus-visible, .kom-db .kom-name:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }

.kom-db .kom-statusmarke { display: inline-block; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); font-weight: var(--fw-label); }
.kom-db .kom-statusmarke.kom-komplett { border-color: var(--status-komplett); }
.kom-db .kom-statusmarke.kom-teilweise { border-color: var(--status-teilweise); }

.kom-db .kom-balken { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
.kom-db .kom-balken span { display: block; height: 100%; background: var(--brand-gray); }

.kom-db .kom-kachel, .kom-db .kom-eingabe, .kom-db .kom-karte, .kom-db .kom-dash,
.kom-db .kom-balken, .kom-db .kom-statusmarke { box-sizing: border-box; }

/* Planung: Häkchen */
.kom-db .kom-haken { display: inline-flex; align-items: center; min-height: 28px; cursor: pointer; }
.kom-db .kom-haken input { width: 20px; height: 20px; accent-color: var(--brand-red); cursor: pointer; }
.kom-db .kom-haken input:disabled { cursor: default; opacity: .6; }

/* Forecast: Ampel. AB-Zeile kräftig, Baugruppen und Teile hell in der Ampelfarbe. */
.kom-db .kom-punkt { display: inline-block; width: 12px; height: 12px; margin-right: var(--space-1);
  border: 1px solid var(--line); border-radius: 3px; vertical-align: -1px; }
.kom-db .kom-punkt-rot { background: var(--ampel-rot); }
.kom-db .kom-punkt-gelb { background: var(--ampel-gelb); }
.kom-db .kom-ampel-rot tr.kom-dab td { background: var(--ampel-rot); color: var(--on-status); }
.kom-db .kom-ampel-gelb tr.kom-dab td { background: var(--ampel-gelb); color: var(--on-status); }
.kom-db .kom-ampel-rot tr.kom-dbg td, .kom-db .kom-ampel-rot tr.kom-dteil td { background: var(--ampel-rot-bg); }
.kom-db .kom-ampel-gelb tr.kom-dbg td, .kom-db .kom-ampel-gelb tr.kom-dteil td { background: var(--ampel-gelb-bg); }
.kom-db .kom-ampel-rot tr.kom-dab .kom-ab-text, .kom-db .kom-ampel-gelb tr.kom-dab .kom-ab-text { color: inherit; }

/* Forecast: Kopf-Kacheln in Ampelfarbe, Erklärung */
.kom-db .kom-kachel-rot { background: var(--ampel-rot); border-color: var(--ampel-rot); color: var(--on-status); }
.kom-db .kom-kachel-gelb { background: var(--ampel-gelb); border-color: var(--ampel-gelb); color: var(--on-status); }
.kom-db .kom-kachel-alt { background: var(--status-teilweise); border-color: var(--status-teilweise); color: var(--on-status); }
.kom-db .kom-kachel-rot .kom-label, .kom-db .kom-kachel-gelb .kom-label, .kom-db .kom-kachel-alt .kom-label { color: var(--on-status); }
.kom-db .kom-leise-kachel .kom-klein { color: var(--ink-muted); }
.kom-db .kom-erklaerung { margin: 0 0 var(--space-3); }

`, "KOMDBCSS");
},

/* ===========================================================================
   HOOK 3: Aufräumen. Genau die CSS-ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function (FORM, {}) {

    window.symolo.tools.injector.rmcss("KOMDBCSS");
}

}

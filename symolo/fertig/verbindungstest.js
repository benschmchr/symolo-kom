/* ===========================================================================
   Bestandsliste Kommissionierung Stahlbau – Ansicht „Verbindungstest“ für Symolo
   Automatisch erzeugt mit tools/symolo_bauen.py aus symolo/quelle und
   symolo/ansichten/verbindungstest. NICHT VON HAND ÄNDERN.

   Einbau: Alles ab der nächsten Zeile mit { bis zum Ende als Hook-Objekt
   ins Formular einfügen. Das Formular braucht ein Feld mit der Bindung
   "_output". Anpassungen nur in 10_einstellungen.js und 20_tabellen.js
   (dann neu bauen). Anleitung: docs/Symolo_Anbindung.md
   Erstellt: Ben Schumacher, 09.10.2026
   =========================================================================== */
{

/* Kenndaten dieser Ansicht (aus tools/symolo_bauen.py). */
ansicht: { name: "verbindungstest", titel: "Verbindungstest", klasse: "kom-vt", praefix: "komVt", cssId: "KOMVTCSS" },


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

    planungsmarke: {
        tabelle: "fwm.kom_planungsmarke",
        felder: {
            ab_schluessel: "ab_schluessel"
        }
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
   OFFEN (Symolo): Welche SQL-Sprache (das Datumsformat …0000000Z spricht
   für SQL Server)? Wir benutzen nur: select * from … where … = / in /
   is null … order by …  — kein limit/top, keine Verknüpfungen (join). */
sqlBauen: function (name, optionen) {

    const t = this.tabelleInfo(name);
    const o = optionen || {};
    const wo = [];
    const bedingungen = o.wo || {};

    let sql = "select * from " + this.sqlName(t.tabelle);

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
   gelesen hat (zum Erkennen, ob inzwischen jemand anderes geändert hat). */
schreiben: async function (art, name, id, werte, stand) {

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

        if (stand !== undefined) {
            const jetzt = this.text(this.field(roh, this.tabellen._standard.geaendert_am));
            if (jetzt !== this.text(stand)) {
                throw new Error("Jemand anderes hat den Eintrag inzwischen geändert. Bitte neu laden.");
            }
        }

        this.rohSetzen(name, roh, werte);

        const neu = this.antwortObjekt(
            await this.anfrage("dsf.dbo.UpdateObjectJson", [tabelle, JSON.stringify(roh)])
        );

        return this.zeileLesen(name, neu || roh);
    }

    throw new Error("Unbekannte Schreibart: " + art);
},

datenAnlegen: async function (name, werte) {

    return this.schreiben("anlegen", name, null, werte);
},

/* zeile = Objekt aus datenLesen (enthält _id und geaendert_am). */
datenAendern: async function (name, zeile, werte) {

    return this.schreiben("aendern", name, zeile._id, werte, zeile.geaendert_am);
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
   Drei Abfragen; BGs und Teile in Stücken über die AB-IDs. */
bestandLaden: async function () {

    const auftraege = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false });

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

koerper: null,
fuss: null,
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


/* ===========================================================================
   ANSICHT: Verbindungstest
   Die einzige bekannte Tabelle (fwm.stamm_prozesse aus test.html) mit
   aufgelöstem Gruppennamen, ohne IDs. Prüft den ganzen Weg der
   Datenschicht: lesen, Verweis auflösen, anlegen (ohne ID), ändern
   (komplettes Objekt). Für den Entwickler die erste Ansicht zum Einbinden.
   =========================================================================== */

prozesse: [],

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.knopf(this.fuss, "Neu laden", () => this.laden());
    this.knopf(this.fuss, "Beispiel anlegen", () => this.beispielAnlegen(), "haupt");

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const liste = await this.sicher(() => this.datenLesen("prozess", { sortierung: ["name"] }));

    if (liste !== null) {
        this.prozesse = liste;
        this.statusZeigen(liste.length + " Einträge geladen.");
    }

    this.zeichnen();
},

/* Aus dem Zustand zeichnen, nie aus den Rohdaten (Skill, Ablauf 6). */
zeichnen: function () {

    this.koerper.replaceChildren();
    this.infoZeigen();

    this.tabelleBauen(
        this.koerper,
        [
            { feld: "name", titel: "Name" },
            { feld: "gruppe", titel: "Gruppe" },
            { feld: "angelegt_am", titel: "Angelegt", art: "datum" },
            { feld: "geaendert_am", titel: "Geändert", art: "datum" }
        ],
        this.prozesse,
        "Keine Einträge. Entweder ist die Tabelle leer oder sie konnte nicht gelesen werden (siehe Meldung unten).",
        (zelle, zeile) => {
            this.knopf(zelle, "Ändern", () => this.aendern(zeile));
        }
    );
},

beispielAnlegen: async function () {

    const jetzt = new Date();
    const name = "Testeintrag " + String(jetzt.getHours()).padStart(2, "0") + ":" +
        String(jetzt.getMinutes()).padStart(2, "0") + ":" + String(jetzt.getSeconds()).padStart(2, "0");

    /* Keine ID, keine Gruppe: nur der Name. */
    const neu = await this.sicher(() => this.datenAnlegen("prozess", { name: name }));

    if (neu) {
        await this.laden();
        this.statusZeigen("„" + name + "“ angelegt.");
    }
},

aendern: async function (zeile) {

    const neuerName = zeile.name.endsWith(" (geändert)") ? zeile.name.slice(0, -11) : zeile.name + " (geändert)";

    /* Vor dem Überschreiben fragen (Skill, Abschnitt 8). */
    if (!window.confirm("„" + zeile.name + "“ umbenennen in „" + neuerName + "“?")) return;

    const neu = await this.sicher(() => this.datenAendern("prozess", zeile, { name: neuerName }));

    if (neu) {
        await this.laden();
        this.statusZeigen("Gespeichert.");
    }
},


/* ===========================================================================
   HOOK 1: CSS. Nur CSS, jede Regel hängt an der Wrapper-Klasse.
   =========================================================================== */
form_on_load: function (FORM) {

    window.symolo.tools.injector.css(`
.kom-vt {
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

/* Gemeinsame Stile aller Ansichten. .kom-vt wird beim Bauen durch die
   Klasse der Ansicht ersetzt: jede Regel beginnt damit (Skill, CSS-Scoping).
   Farben nur über FWM-Variablen. Kein Backtick in diesem Text.
   OFFEN (Symolo): Gibt das Fenster Schrift und Farben vor? Bis dahin
   FWM-Werte, Thema light; die Schrift erbt sonst die des Fensters. */

.kom-vt { display: flex; flex-direction: column; min-height: 100%;
  font-family: var(--font-sans); font-size: var(--fs-body); line-height: var(--lh-body);
  color: var(--ink); background: var(--surface-0); }

.kom-vt .kom-kopf { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); background: var(--surface-100); border-bottom: 1px solid var(--line); }
.kom-vt .kom-titel { margin: 0; font-size: var(--fs-h3); line-height: var(--lh-h3); font-weight: var(--fw-h3); }
.kom-vt .kom-info { font-size: var(--fs-small); line-height: var(--lh-small); color: var(--ink-muted); }

.kom-vt .kom-koerper { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--space-4); }

.kom-vt .kom-fuss { flex: 0 0 auto; display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: var(--surface-100); border-top: 1px solid var(--line);
  white-space: nowrap; overflow-x: auto; }
.kom-vt .kom-vermerk { margin-left: auto; font-size: var(--fs-label); color: var(--ink-muted); }

.kom-vt .kom-knopf { min-height: 36px; padding: 0 var(--space-3); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); cursor: pointer;
  font-family: inherit; font-size: var(--fs-button); font-weight: var(--fw-button); }
.kom-vt .kom-knopf:hover { border-color: var(--glow-red); color: var(--glow-red); }
.kom-vt .kom-knopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.kom-vt .kom-knopf-haupt { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-vt .kom-knopf-haupt:hover { background: var(--red-grad-end); color: var(--on-brand); }

.kom-vt .kom-tabelle { width: 100%; border-collapse: collapse; background: var(--surface-100);
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-vt .kom-tabelle th { text-align: left; padding: var(--space-2) var(--space-3); color: var(--ink-muted);
  font-weight: var(--fw-label); border-bottom: 1px solid var(--line-strong); }
.kom-vt .kom-tabelle td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); }
.kom-vt .kom-tabelle .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-vt .kom-aktionen { text-align: right; white-space: nowrap; }

.kom-vt .kom-leer { padding: var(--space-3); color: var(--ink-muted); }

/* Die Meldung blendet ein und aus, Fehler bleiben stehen. */
.kom-vt .kom-status { position: fixed; bottom: var(--space-4); left: 50%; transform: translateX(-50%);
  max-width: 90%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  background: var(--brand-gray); color: var(--on-brand); font-size: var(--fs-small);
  opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 20; }
.kom-vt .kom-status.kom-zeigen { opacity: .95; }
.kom-vt .kom-status.kom-fehler { background: var(--brand-red); pointer-events: auto; }

/* box-sizing an einer Stelle (Skill, Falle 5). Jede neue Box kommt hierher. */
.kom-vt .kom-kopf, .kom-vt .kom-koerper, .kom-vt .kom-fuss, .kom-vt .kom-knopf,
.kom-vt .kom-tabelle, .kom-vt .kom-status { box-sizing: border-box; }

`, "KOMVTCSS");
},

/* ===========================================================================
   HOOK 3: Aufräumen. Genau die CSS-ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function (FORM, {}) {

    window.symolo.tools.injector.rmcss("KOMVTCSS");
}

}

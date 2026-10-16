/* ===========================================================================
   Bestandsliste Kommissionierung Stahlbau – Ansicht „Regal“ für Symolo
   Automatisch erzeugt mit tools/symolo_bauen.py aus symolo/quelle und
   symolo/ansichten/regal. NICHT VON HAND ÄNDERN.

   Einbau: Alles ab der nächsten Zeile mit { bis zum Ende als Hook-Objekt
   ins Formular einfügen. Das Formular braucht ein Feld mit der Bindung
   "_output". Anpassungen nur in 10_einstellungen.js und 20_tabellen.js
   (dann neu bauen). Anleitung: docs/Symolo_Anbindung.md
   Erstellt: Ben Schumacher, 09.10.2026
   =========================================================================== */
{

/* Kenndaten dieser Ansicht (aus tools/symolo_bauen.py). */
ansicht: { name: "regal", titel: "Regal", klasse: "kom-rg", praefix: "komRg", cssId: "KOMRGCSS" },


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
   abIds: nur diese ABs neu laden (nach einer Änderung). */
bestandLaden: async function (abIds) {

    const wo = { bereich: "bestand" };
    if (abIds) wo.id = abIds;
    const auftraege = await this.datenLesen("auftrag", { wo: wo, aufloesen: false });

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
   EINTRAGEN: Vorhanden, Vorhanden = Soll, alles ✓, Soll ändern
   (R-M1 bis R-M4, R-T1). Nachbau von bestand/views.py.
   Alles läuft über datenAendern (der einzige Schreibpfad). Danach lädt die
   Ansicht den AB neu; gerechnet wird beim Anzeigen (45_rechnen.js).

   Das Änderungsprotokoll kommt in Phase 4 dazu.
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
    if (neu._inzwischen && !this.mengeGleich(alt, milli)) {
        const altText = this.mengeGleich(alt, null) ? "leer" : this.zahlText(this.mengeMilli(alt));
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

    await this.jeAcht(geaendert, ([t, milli]) => this.datenAendern("teil", t.o, frisch => {
        const [ein, fertig] = this.datenStempeln(frisch.vorhanden, this.mengeWert(milli),
            frisch.datum_eingelagert, frisch.datum_komplett, this.heuteText());
        return { menge_gesamt: this.mengeWert(milli), menge_gesamt_text: "", datum_eingelagert: ein, datum_komplett: fertig };
    }, { ohnePruefung: true }));

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
lagerortAb: async function (ab, text) {

    const p = this.platzEingabe(text);
    let aufgaben = this.platzAufgaben("auftrag", ab, ab.ohne, p);
    ab.bgs.forEach(b => { aufgaben = aufgaben.concat(this.platzAufgaben("baugruppe", b, b.teile, p)); });

    await this.knotenSetzen(aufgaben);
    return p;
},

/* R-L2: Platz an der BG -> alle Teile der BG; danach R-L3 (außer der AB ist
   aufgesplittet). imRegal: eine BG einzeln verschieben splittet den AB auf. */
lagerortBg: async function (ab, bg, text, imRegal) {

    const p = this.platzEingabe(text);

    if (imRegal && ab.bgs.length > 1 && !this.istJa(ab.o.regal_geteilt)) await this.regalTeilen(ab);

    await this.knotenSetzen(this.platzAufgaben("baugruppe", bg, bg.teile, p));

    if (!this.istJa(ab.o.regal_geteilt)) await this.abgleichen(ab);
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

    await this.lagerortAb(ab, p);
    await this.knotenSetzen([{ name: "auftrag", knoten: ab, werte: { regal_geteilt: false } }]);
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
   bauen(inhalt, knoepfe) füllt es. Escape oder Klick daneben schließt. */
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
    bauen(inhalt, knoepfe);

    const erstes = box.getElementsByTagName("input")[0] || box.getElementsByTagName("button")[0];
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
   ANSICHT: Regal (R-R1 bis R-R5)
   Fächer L1–L6 und R1–R6 (R3 = Sperrlager), darunter "Nicht einsortiert",
   "Sonstiges" (kein Regalfach) und die Liste "Einsortiert".
   Eintrag antippen: Platz wählen. Am PC auch ziehen und auf ein Fach oder
   "Nicht einsortiert" ablegen. Rechtsklick auf einen AB: aufsplitten;
   auf eine Baugruppe: AB zusammenführen (Ben, 14./15.10.2026).
   Die Einträge berechnet regalEintraege (49_lagerort.js).

   OFFEN (Symolo): "In der Bestandsliste anzeigen" (Sprung in die andere
   Ansicht) gibt es erst, wenn klar ist, wie Symolo zwischen Formularen
   wechselt.
   =========================================================================== */

abs: [],
ziehen: null,
regalEl: null,

before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* Erst das Gerüst, dann die Daten (Skill, Vertrag). */
    this.geruestBauen(parent);
    this.el(this.koerper, "p", "kom-leise",
        "Grün = komplett, gelb = teilweise, weiß = offen. Eintrag antippen, um den Platz zu ändern; am PC auch auf ein anderes " +
        "Fach oder nach „Nicht einsortiert“ ziehen. Rechtsklick auf einen AB: aufsplitten; Rechtsklick auf eine Baugruppe: " +
        "AB zusammenführen. Der Platz gilt dann für den ganzen AB bzw. die Baugruppe in der Bestandsliste.");
    this.regalEl = this.el(this.koerper, "div", "kom-regal-inhalt");
    this.knopf(this.fuss, "Neu laden", () => this.laden());

    await this.laden();
},

laden: async function () {

    this.datenHinweise = [];
    this.statusZeigen("Lade …");

    const abs = await this.sicher(() => this.bestandLaden());
    if (abs !== null) {
        this.abs = abs;
        this.statusZeigen(abs.length + " Arbeitsaufträge geladen.");
    }

    this.zeichnen();
},

/* ---------------------------------------------------------------------------
   Zeichnen
   --------------------------------------------------------------------------- */

zeichnen: function () {

    this.infoZeigen();
    const r = this.regalEintraege(this.abs);
    const inhalt = this.el(null, "div");

    const regal = this.el(inhalt, "div", "kom-regal");
    this.el(regal, "div");
    this.el(regal, "div", "kom-seite", "Links (L)");
    this.el(regal, "div", "kom-seite", "Rechts (R)");

    this.regalEtagen.forEach(n => {
        this.el(regal, "div", "kom-etage", String(n));
        ["L", "R"].forEach(seite => {
            const platz = seite + n;
            const fach = this.el(regal, "div", "kom-fach" + (platz === "R3" ? " kom-sperr" : ""));
            this.el(fach, "span", "kom-platz", platz + (platz === "R3" ? " · " + this.regalR3Name : ""));
            this.ablage(fach, platz);
            r.faecher[platz].forEach(e => this.eintragBauen(fach, e, false));
        });
    });

    const listen = this.el(inhalt, "div", "kom-listen");

    const nicht = this.liste(listen, "Nicht einsortiert", r.nicht.length);
    this.ablage(nicht.karte, "");
    if (r.nicht.length) r.nicht.forEach(e => this.eintragBauen(nicht.eintraege, e, false));
    else this.el(nicht.eintraege, "p", "kom-leise", "Alles einsortiert");

    const sonst = this.liste(listen, "Sonstiges", r.ungueltig.length);
    if (r.ungueltig.length) r.ungueltig.forEach(e => this.eintragBauen(sonst.eintraege, e, true));
    else this.el(sonst.eintraege, "p", "kom-leise", "keine");

    const eins = this.liste(listen, "Einsortiert", r.einsortiert.length);
    if (r.einsortiert.length) {
        const auf = this.el(eins.eintraege, "details");
        this.el(auf, "summary", "", "Liste „Name · Platz“ anzeigen");
        const ul = this.el(auf, "ul", "kom-einsortiert");
        r.einsortiert.forEach(e => {
            const li = this.el(ul, "li");
            this.el(li, "span", "kom-punkt " + this.statusKlasse(e.w));
            this.el(li, "span", "", e.name + " · " + e.platz);
        });
    } else {
        this.el(eins.eintraege, "p", "kom-leise", "keine");
    }

    this.regalEl.replaceChildren(inhalt);
},

liste: function (parent, titel, anzahl) {

    const karte = this.el(parent, "section", "kom-liste-karte");
    const h = this.el(karte, "h3", "kom-liste-titel", titel + " ");
    this.el(h, "span", "kom-anzahl", String(anzahl));
    return { karte: karte, eintraege: this.el(karte, "div", "kom-eintraege") };
},

/* Ein Eintrag: antippen = Platz wählen, ziehen = ablegen, Rechtsklick = Menü.
   Kein Knopf, damit Firefox ihn ziehen kann (Ben, 14.10.2026). */
eintragBauen: function (parent, e, mitPlatz) {

    const x = this.el(parent, "span", "kom-eintrag " + this.statusKlasse(e.w), e.name);
    if (mitPlatz) this.el(x, "span", "kom-eintrag-platz", " · " + e.platz);

    x.tabIndex = 0;
    x.setAttribute("role", "button");
    x.title = e.name + ": " + e.w.status;
    x.draggable = true;

    x.onclick = () => this.platzDialog(e);
    x.onkeydown = k => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); this.platzDialog(e); } };
    x.oncontextmenu = k => { k.preventDefault(); this.eintragMenue(e); };
    x.ondragstart = k => { this.ziehen = e; k.dataTransfer.setData("text/plain", e.name); };
    x.ondragend = () => { this.ziehen = null; };
},

/* Fach oder Liste als Ziel zum Ablegen. */
ablage: function (el, platz) {

    el.ondragover = k => { if (this.ziehen) { k.preventDefault(); el.classList.add("kom-ziel"); } };
    el.ondragleave = () => el.classList.remove("kom-ziel");
    el.ondrop = k => {
        k.preventDefault();
        el.classList.remove("kom-ziel");
        const e = this.ziehen;
        this.ziehen = null;
        if (e && e.platz !== platz) this.platzSetzen(e, platz);
    };
},

/* ---------------------------------------------------------------------------
   Ändern
   --------------------------------------------------------------------------- */

/* Platz wählen wie im Regal; freier Text nur mit Bestätigung (R-L4).
   Knöpfe: "Kein Platz" und "Abbrechen" (rot) (Ben, 15.10.2026). */
platzDialog: function (e) {

    this.dialogZeigen("Platz ändern: " + e.name, (inhalt, knoepfe) => {
        this.el(inhalt, "p", "kom-leise", e.platz ? "Bisher: " + e.platz : "Bisher: nicht einsortiert");

        const raster = this.el(inhalt, "div", "kom-platzraster");
        this.el(raster, "span", "kom-seite", "Links");
        this.el(raster, "span", "kom-seite", "Rechts");
        this.regalEtagen.forEach(n => ["L", "R"].forEach(seite => {
            const p = seite + n;
            const b = this.knopf(raster, p + (p === "R3" ? " · Sperrlager" : ""), () => { this.dialogSchliessen(); this.platzSetzen(e, p); },
                p === e.platz ? "gewaehlt" : "");
            b.disabled = p === e.platz;
        }));

        const frei = this.el(inhalt, "label", "kom-feld");
        this.el(frei, "span", "kom-feldname", "Anderer Platz (kein Regalfach)");
        const zeile = this.el(frei, "span", "kom-suchzeile");
        const f = this.el(zeile, "input", "kom-eingabe");
        f.maxLength = 40;
        f.placeholder = "z. B. Kiste 4";
        const eintragen = () => {
            const text = this.text(f.value);
            if (!text) return;
            let p;
            try { p = this.platzEingabe(text); } catch (fehler) { this.statusZeigen(fehler.message, "fehler"); return; }
            if (p && !this.platzGueltig(p) && !window.confirm("„" + p + "“ ist kein Regalplatz (L1–L6, R1–R6). Trotzdem eintragen? " +
                "Er steht dann im Regal unter „Sonstiges“.")) return;
            this.dialogSchliessen();
            this.platzSetzen(e, p);
        };
        f.onkeydown = k => { if (k.key === "Enter") eintragen(); };
        this.knopf(zeile, "Eintragen", eintragen);

        this.knopf(knoepfe, "Kein Platz", () => { this.dialogSchliessen(); this.platzSetzen(e, ""); });
        this.knopf(knoepfe, "Abbrechen", () => this.dialogSchliessen(), "rot");
    });
},

/* Rechtsklick: AB aufsplitten (ab zwei Baugruppen) oder zusammenführen. */
eintragMenue: function (e) {

    if (e.bg) {
        this.menueZeigen(e.name, [["AB zusammenführen", () => this.zusammen(e.ab, e.bg)]]);
        return;
    }
    if (e.ab.bgs.length < 2) {
        this.statusZeigen(e.name + " hat keine Baugruppen zum Aufsplitten (mindestens zwei nötig).");
        return;
    }
    this.menueZeigen(e.name, [["AB in Baugruppen aufsplitten", () => this.aendern(e.ab, async () => {
        await this.regalTeilen(e.ab);
        return e.name + " ist in Baugruppen aufgesplittet.";
    })]]);
},

/* Eine Baugruppe einzeln verschieben splittet den AB. Liegen danach alle
   Baugruppen am selben Platz, wird gefragt (nie automatisch zusammenführen). */
platzSetzen: function (e, platz) {

    this.aendern(e.ab, async () => {
        const p = e.bg ? await this.lagerortBg(e.ab, e.bg, platz, true) : await this.lagerortAb(e.ab, platz);
        if (e.bg && this.istJa(e.ab.o.regal_geteilt) && this.alleBgsGleich(e.ab) && window.confirm("AB ist zusammengeführt.")) {
            await this.regalZusammenfuehren(e.ab, e.bg);
        }
        return e.name + ": " + (p ? "Platz " + p : "kein Platz mehr") + ".";
    });
},

zusammen: function (ab, bg) {

    this.aendern(ab, async () => {
        const p = await this.regalZusammenfuehren(ab, bg);
        return this.text(ab.o.ab_anzeige) + " ist zusammengeführt" + (p ? " (Platz " + p + ")." : " (nicht einsortiert).");
    });
},

/* Aufgabe ausführen, den AB neu laden, das Regal neu zeichnen. */
aendern: async function (ab, aufgabe) {

    const meldung = await this.sicher(aufgabe);
    const neu = await this.sicher(() => this.bestandLaden([ab.o._id]));
    const i = this.abs.indexOf(ab);
    if (neu && i > -1) {
        if (neu.length) this.abs[i] = neu[0];
        else this.abs.splice(i, 1);
    }
    this.zeichnen();
    if (meldung) this.statusZeigen(meldung);
},


/* ===========================================================================
   HOOK 1: CSS. Nur CSS, jede Regel hängt an der Wrapper-Klasse.
   =========================================================================== */
form_on_load: function (FORM) {

    window.symolo.tools.injector.css(`
.kom-rg {
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

/* Gemeinsame Stile aller Ansichten. .kom-rg wird beim Bauen durch die
   Klasse der Ansicht ersetzt: jede Regel beginnt damit (Skill, CSS-Scoping).
   Farben nur über FWM-Variablen. Kein Backtick in diesem Text.
   OFFEN (Symolo): Gibt das Fenster Schrift und Farben vor? Bis dahin
   FWM-Werte, Thema light; die Schrift erbt sonst die des Fensters. */

.kom-rg { display: flex; flex-direction: column; min-height: 100%;
  font-family: var(--font-sans); font-size: var(--fs-body); line-height: var(--lh-body);
  color: var(--ink); background: var(--surface-0); }

.kom-rg .kom-kopf { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-3);
  padding: var(--space-3) var(--space-4); background: var(--surface-100); border-bottom: 1px solid var(--line); }
.kom-rg .kom-titel { margin: 0; font-size: var(--fs-h3); line-height: var(--lh-h3); font-weight: var(--fw-h3); }
.kom-rg .kom-info { font-size: var(--fs-small); line-height: var(--lh-small); color: var(--ink-muted); }

.kom-rg .kom-koerper { flex: 1 1 auto; min-height: 0; overflow: auto; padding: var(--space-4); }

.kom-rg .kom-fuss { flex: 0 0 auto; display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-4); background: var(--surface-100); border-top: 1px solid var(--line);
  white-space: nowrap; overflow-x: auto; }
.kom-rg .kom-vermerk { margin-left: auto; font-size: var(--fs-label); color: var(--ink-muted); }

.kom-rg .kom-knopf { min-height: 36px; padding: 0 var(--space-3); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); cursor: pointer;
  font-family: inherit; font-size: var(--fs-button); font-weight: var(--fw-button); }
.kom-rg .kom-knopf:hover { border-color: var(--glow-red); color: var(--glow-red); }
.kom-rg .kom-knopf:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
.kom-rg .kom-knopf-haupt { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-rg .kom-knopf-haupt:hover { background: var(--red-grad-end); color: var(--on-brand); }

.kom-rg .kom-tabelle { width: 100%; border-collapse: collapse; background: var(--surface-100);
  font-size: var(--fs-small); line-height: var(--lh-small); }
.kom-rg .kom-tabelle th { text-align: left; padding: var(--space-2) var(--space-3); color: var(--ink-muted);
  font-weight: var(--fw-label); border-bottom: 1px solid var(--line-strong); }
.kom-rg .kom-tabelle td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line); }
.kom-rg .kom-tabelle .kom-zahl { text-align: right; font-variant-numeric: tabular-nums; }
.kom-rg .kom-aktionen { text-align: right; white-space: nowrap; }

.kom-rg .kom-leer { padding: var(--space-3); color: var(--ink-muted); }

/* Die Meldung blendet ein und aus, Fehler bleiben stehen. */
.kom-rg .kom-status { position: fixed; bottom: var(--space-4); left: 50%; transform: translateX(-50%);
  max-width: 90%; padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm);
  background: var(--brand-gray); color: var(--on-brand); font-size: var(--fs-small);
  opacity: 0; pointer-events: none; transition: opacity .2s; z-index: 20; }
.kom-rg .kom-status.kom-zeigen { opacity: .95; }
.kom-rg .kom-status.kom-fehler { background: var(--brand-red); pointer-events: auto; }

.kom-rg .kom-knopf-rot { background: var(--brand-red); border-color: var(--brand-red); color: var(--on-brand); }
.kom-rg .kom-knopf-rot:hover { background: var(--red-grad-end); color: var(--on-brand); }
.kom-rg .kom-knopf:disabled { opacity: .5; cursor: default; }

/* Fenster in der Mitte (Dialog, Menü) */
.kom-rg .kom-dialog-hinter { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center;
  justify-content: center; padding: var(--space-4); background: color-mix(in srgb, var(--ink) 35%, transparent); }
.kom-rg .kom-dialog { width: min(560px, 100%); max-height: 90vh; overflow: auto; padding: var(--space-4);
  border-radius: var(--radius-lg); background: var(--surface-100); color: var(--ink);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--ink) 30%, transparent); }
.kom-rg .kom-dialog-titel { margin: 0 0 var(--space-3); text-align: center; font-size: var(--fs-h3); }
.kom-rg .kom-dialog-inhalt { font-size: var(--fs-small); }
.kom-rg .kom-dialog-knoepfe { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-2);
  margin-top: var(--space-3); }
.kom-rg .kom-dialog-knoepfe.kom-dialog-spalte { flex-direction: column; align-items: stretch; }
.kom-rg .kom-dialog-knoepfe .kom-knopf { min-height: 44px; }

/* box-sizing an einer Stelle (Skill, Falle 5). Jede neue Box kommt hierher. */
.kom-rg .kom-kopf, .kom-rg .kom-koerper, .kom-rg .kom-fuss, .kom-rg .kom-knopf,
.kom-rg .kom-tabelle, .kom-rg .kom-status, .kom-rg .kom-dialog { box-sizing: border-box; }


/* Regal: 6 Etagen, links und rechts. Statusfarben sind Bedeutungsfarben. */

.kom-rg .kom-leise { color: var(--ink-muted); font-size: var(--fs-small); }

.kom-rg .kom-regal { display: grid; grid-template-columns: 40px 1fr 1fr; gap: var(--space-2); margin-bottom: var(--space-4); }
.kom-rg .kom-seite { font-size: var(--fs-label); color: var(--ink-muted); text-align: center; }
.kom-rg .kom-etage { display: flex; align-items: center; justify-content: center; font-weight: var(--fw-label); color: var(--ink-muted); }
.kom-rg .kom-fach { min-height: 72px; padding: var(--space-2); display: flex; flex-wrap: wrap; align-content: flex-start;
  gap: var(--space-1); border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--surface-100); }
.kom-rg .kom-fach.kom-sperr { border-style: dashed; }
.kom-rg .kom-fach.kom-ziel, .kom-rg .kom-liste-karte.kom-ziel { outline: 2px solid var(--focus); outline-offset: 1px; }
.kom-rg .kom-platz { flex: 0 0 100%; font-size: var(--fs-label); color: var(--ink-muted); }

.kom-rg .kom-eintrag { display: inline-block; padding: 2px var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); font-size: var(--fs-small); cursor: pointer; white-space: nowrap; }
.kom-rg .kom-eintrag.kom-komplett { background: var(--status-komplett); border-color: var(--status-komplett); color: var(--on-status); }
.kom-rg .kom-eintrag.kom-teilweise { background: var(--status-teilweise); border-color: var(--status-teilweise); color: var(--on-status); }
.kom-rg .kom-eintrag:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
.kom-rg .kom-eintrag-platz { opacity: .8; }

.kom-rg .kom-listen { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-3); }
.kom-rg .kom-liste-karte { padding: var(--space-3); border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface-100); }
.kom-rg .kom-liste-titel { margin: 0 0 var(--space-2); font-size: var(--fs-body); }
.kom-rg .kom-anzahl { padding: 0 var(--space-2); border-radius: 999px; background: var(--line); font-size: var(--fs-label); }
.kom-rg .kom-eintraege { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.kom-rg .kom-einsortiert { margin: var(--space-2) 0 0; padding-left: 0; list-style: none; font-size: var(--fs-small); }
.kom-rg .kom-einsortiert li { display: flex; align-items: center; gap: var(--space-2); }
.kom-rg .kom-punkt { width: 10px; height: 10px; border-radius: 50%; border: 1px solid var(--line-strong); background: var(--surface-100); }
.kom-rg .kom-punkt.kom-komplett { background: var(--status-komplett); border-color: var(--status-komplett); }
.kom-rg .kom-punkt.kom-teilweise { background: var(--status-teilweise); border-color: var(--status-teilweise); }

/* Fenster "Platz ändern": Raster wie das Regal */
.kom-rg .kom-platzraster { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin: var(--space-3) 0; }
.kom-rg .kom-platzraster .kom-knopf { min-height: 44px; }
.kom-rg .kom-knopf.kom-knopf-gewaehlt { background: var(--brand-gray); border-color: var(--brand-gray); color: var(--on-brand); }
.kom-rg .kom-feld { display: flex; flex-direction: column; gap: var(--space-1); }
.kom-rg .kom-feldname { font-size: var(--fs-label); color: var(--ink-muted); }
.kom-rg .kom-suchzeile { display: flex; gap: var(--space-2); }
.kom-rg .kom-eingabe { flex: 1 1 auto; min-width: 0; min-height: 36px; padding: 0 var(--space-2); border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm); background: var(--surface-100); color: var(--ink); font: inherit; }

.kom-rg .kom-fach, .kom-rg .kom-eintrag, .kom-rg .kom-liste-karte, .kom-rg .kom-eingabe { box-sizing: border-box; }

`, "KOMRGCSS");
},

/* ===========================================================================
   HOOK 3: Aufräumen. Genau die CSS-ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function (FORM, {}) {

    window.symolo.tools.injector.rmcss("KOMRGCSS");
}

}

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

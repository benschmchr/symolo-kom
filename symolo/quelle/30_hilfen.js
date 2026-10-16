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

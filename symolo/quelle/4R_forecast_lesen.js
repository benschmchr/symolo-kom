/* ===========================================================================
   FORECAST-LISTE LESEN (R-F2 bis R-F4)
   Nachbau von bestand/forecast.py (lesen): Blatt „Auftragsübersicht“ zuerst,
   Kopfzeile mit „Auftrag.-Nr“ und „Liefertermin“, je Zeile AB-Schlüssel ohne
   Los und Termin. Kein Zugriff auf die Datenbank.

   Ergebnis (Gelesen): { datei, blatt, stand, kopf: [Spaltennamen],
   zeilen: [{ schluessel, termin: { j, m, t } oder null, werte: [Text je Spalte] }] }
   Fehler werfen einen Error mit Text für den Benutzer.
   =========================================================================== */

fcMaxGroesse: 20 * 1024 * 1024,
fcEndungen: [".xlsx", ".xlsm"],
fcBlattZuerst: "Auftragsübersicht",
fcGeliefert: "bereits geliefert",

fcFehlerwerte: ["#N/A", "#NV", "#DIV/0!", "#VALUE!", "#WERT!", "#REF!", "#BEZUG!", "#NAME?", "#NUM!", "#ZAHL!",
    "#NULL!", "#GETTING_DATA", "#SPILL!", "#CALC!"],

/* Fehlerwerte (#NV usw.) gelten als leer. */
fcWert: function (v) {

    if (typeof v === "string" && this.fcFehlerwerte.indexOf(v.trim().toUpperCase()) >= 0) return null;
    return v;
},

/* VBA Txt(): leer -> "", sonst Text ohne Leerzeichen vorn und hinten; Datum mit Uhrzeit nur, wenn sie nicht 0:00 ist. */
fcTxt: function (v) {

    v = this.fcWert(v);
    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "WAHR" : "FALSCH";
    if (typeof v === "number") return this.impZahlText(v);

    if (typeof v === "object" && v.datum) {
        const d = v.datum;
        const tag = this.impDatumText(d);
        return d.h === 0 && d.mi === 0 && d.s === 0 ? tag : tag + " " + this.impTag2(d.h) + ":" + this.impTag2(d.mi);
    }

    return String(v).trim();
},

/* R-F2 Normierung: klein, ohne Leerzeichen, ".", "-", "_" und Zeilenumbruch. */
fcKopfNorm: function (x) {

    return this.fcTxt(x).toLowerCase().replace(/[ .\-_\n\r]/g, "");
},

fcDatumGueltig: function (j, m, t) {

    const d = new Date(Date.UTC(j, m - 1, t));
    return d.getUTCFullYear() === j && d.getUTCMonth() === m - 1 && d.getUTCDate() === t ? { j: j, m: m, t: t } : null;
},

/* R-F3 Datum erkennen: echtes Datum, Zahl zwischen 20000 und 80000 (Excel-Seriennummer) oder Datumstext
   ("13.10.2026", "13.10.26", "2026-10-13", auch mit Uhrzeit); die Uhrzeit wird abgeschnitten.
   Ergebnis { j, m, t } oder null. */
fcDatum: function (x) {

    x = this.fcWert(x);
    if (x === null || x === undefined || typeof x === "boolean") return null;
    if (typeof x === "object" && x.datum) return { j: x.datum.j, m: x.datum.m, t: x.datum.t };

    if (typeof x === "number") {
        if (x > 20000 && x < 80000) {
            const d = new Date(Date.UTC(1899, 11, 30) + Math.trunc(x) * 86400000);
            return { j: d.getUTCFullYear(), m: d.getUTCMonth() + 1, t: d.getUTCDate() };
        }
        return null;
    }

    const t = String(x).trim();
    const zeit = "(?:[ T]+\\d{1,2}:\\d{2}(?::\\d{2})?)?";
    let m;

    if ((m = new RegExp("^(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})" + zeit + "$").exec(t))) {
        let jahr = Number(m[3]);
        if (m[3].length === 2) jahr += jahr < 30 ? 2000 : 1900;   /* wie Excel: 00-29 -> 20xx, 30-99 -> 19xx */
        return this.fcDatumGueltig(jahr, Number(m[2]), Number(m[1]));
    }
    if ((m = new RegExp("^(\\d{4})-(\\d{1,2})-(\\d{1,2})" + zeit + "$").exec(t))) {
        return this.fcDatumGueltig(Number(m[1]), Number(m[2]), Number(m[3]));
    }
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t))) {
        return this.fcDatumGueltig(Number(m[3]), Number(m[2]), Number(m[1]));
    }

    return null;
},

/* R-F2: in den Zeilen 1 bis 40, Spalten 1 bis 80 die erste Zeile mit "Auftrag.-Nr" (auftragnr/auftragsnr) und
   "Liefertermin"; "Ampel" ist freiwillig. Ergebnis { zeile, ab, termin, ampel } (Spalten ab 1) oder null. */
fcKopfzeile: function (blatt) {

    for (let r = 1; r <= 40; r++) {
        let ab = 0, termin = 0, ampel = 0;

        for (let c = 1; c <= 80; c++) {
            const t = this.fcKopfNorm(blatt.wert(r, c));
            if (t === "auftragnr" || t === "auftragsnr") ab = ab || c;
            else if (t === "liefertermin") termin = termin || c;
            else if (t === "ampel") ampel = ampel || c;
        }
        if (ab && termin) return { zeile: r, ab: ab, termin: termin, ampel: ampel };
    }
    return null;
},

fcAuswerten: function (blatt, treffer, dateiname) {

    const kz = treffer.zeile;
    let letzte = 0;

    /* wie End(xlToLeft): die letzte belegte Spalte der Kopfzeile, auch hinter Spalte 80 */
    for (let c = 1; c <= blatt.spaltenMax; c++) if (this.fcTxt(blatt.wert(kz, c))) letzte = c;

    /* R-F4 Stand: Zelle oberhalb der Kopfzeile, die mit "Stand:" beginnt */
    let stand = "";
    for (let r = 1; r < kz && !stand; r++) {
        for (let c = 1; c <= letzte; c++) {
            const t = this.fcTxt(blatt.wert(r, c));
            if (t.slice(0, 6).toLowerCase() === "stand:") { stand = t; break; }
        }
    }

    const kopf = [];
    for (let c = 1; c <= letzte; c++) kopf.push(this.fcTxt(blatt.wert(kz, c)) || "Spalte " + c);

    const g = { datei: dateiname, blatt: blatt.name, stand: stand, kopf: kopf, zeilen: [] };

    for (let r = kz + 1; r <= blatt.zeilenMax; r++) {
        const k = this.abForecastSchluessel(this.fcTxt(blatt.wert(r, treffer.ab)));   /* R-F3: nur Zeilen mit Schlüssel (R-AB5) */
        if (!k) continue;

        const termin = treffer.ampel && this.fcTxt(blatt.wert(r, treffer.ampel)).toLowerCase() === this.fcGeliefert
            ? null   /* bereits geliefert: kein Termin */
            : this.fcDatum(blatt.wert(r, treffer.termin));

        const werte = [];
        for (let c = 1; c <= letzte; c++) werte.push(this.fcTxt(blatt.wert(r, c)));
        g.zeilen.push({ schluessel: k, termin: termin, werte: werte });
    }

    if (!g.zeilen.length) throw new Error("Die Forecast-Liste enthält keine Auftragsnummern.");
    return g;
},

/* Eine Forecast-Liste prüfen und lesen. bytes: Uint8Array oder ArrayBuffer. */
fcLesen: async function (bytes, dateiname) {

    this.excelDateiPruefen(dateiname, bytes.byteLength, this.fcMaxGroesse / (1024 * 1024), this.fcEndungen, ".xlsx oder .xlsm");

    const mappe = await this.excelLesen(bytes);
    const alle = mappe.blaetter;
    const reihenfolge = alle.filter(b => b.name === this.fcBlattZuerst).concat(alle.filter(b => b.name !== this.fcBlattZuerst));

    try {
        for (const b of reihenfolge) {
            const blatt = await b.laden();
            const treffer = this.fcKopfzeile(blatt);
            if (treffer) return this.fcAuswerten(blatt, treffer, dateiname);
        }
    } catch (fehler) {
        if (fehler && fehler.message === "Die Forecast-Liste enthält keine Auftragsnummern.") throw fehler;
        throw new Error(this.excelFehlerNichtLesbar);
    }

    throw new Error("In „" + dateiname + "“ wurde keine Kopfzeile mit „Auftrag.-Nr“ und „Liefertermin“ gefunden. " +
        "Gesucht wird zuerst im Blatt „" + this.fcBlattZuerst + "“.");
},

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

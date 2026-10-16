/* ===========================================================================
   KOMMISSIONIERLISTE LESEN (R-I1 bis R-I7, R-D1 bis R-D5)
   Nachbau von bestand/importer.py (lesen): Kopfzeile suchen, Spalten per
   Name, Kopfwerte, Baugruppen an der Farbe (oder an der LK-Nummer),
   Haupt-Baugruppe über der Kopfzeile. Kein Zugriff auf die Datenbank.

   Ergebnis (Gelesen): { datei, kopf: { fertigungs_ab, … }, zeilen: [{ ebene: "BG"|"Teil",
   bg: Name, werte: { feld: Text, menge_gesamt/vorhanden: Zahl oder null } }], hinweise: [Text] }
   Fehler werfen einen Error mit Text für den Benutzer.
   Zeilen und Spalten zählen ab 1 wie in Excel.
   =========================================================================== */

impMaxGroesse: 10 * 1024 * 1024,
impEndungen: [".xlsx", ".xlsm"],
impMaxMenge: 999999999,
impBgFarbe: "1F497D",
impOhneBg: "(ohne BG)",

/* R-D1: die 12 Spalten der Vorlage -> unser Feld */
impSpalten: [
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
    ["Bemerkung", "bemerkung"]
],

/* R-D2 / R-I4: Beschriftungen im Kopf der Liste */
impKopf: [
    ["Fertigungs AB", "fertigungs_ab"],
    ["Haupt AB", "haupt_ab"],
    ["Dispoliste", "dispoliste"],
    ["Ersteller", "ersteller"],
    ["Datum", "datum"],
    ["Verkaufsartikel", "verkaufsartikel"],
    ["Kunde", "kunde"]
],

/* ---------------------------------------------------------------------------
   Zellwerte
   --------------------------------------------------------------------------- */

impTag2: function (n) {

    return String(n).padStart(2, "0");
},

/* Datum wie "03.07.2026". d = { j, m, t, … } aus dem Excel-Leser. */
impDatumText: function (d) {

    return this.impTag2(d.t) + "." + this.impTag2(d.m) + "." + String(d.j).padStart(4, "0");
},

/* Zahl als Text ohne Exponent: 21 -> "21", 0.5 -> "0,5" (wie Excel, deutsch). */
impZahlText: function (z) {

    if (Number.isInteger(z)) return Math.abs(z) < 1e21 ? String(z) : BigInt(z).toString();

    let t = String(z);
    if (/e/i.test(t)) t = z.toFixed(20).replace(/0+$/, "").replace(/\.$/, "");
    return t.replace(".", ",");
},

/* VBA Txt(): leer -> "", sonst Text ohne Leerzeichen am Rand; Zahlen ohne ",0" (Text bleibt Text, R-I7). */
impTxt: function (v) {

    if (v === null || v === undefined) return "";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (typeof v === "number") return this.impZahlText(v);
    if (typeof v === "object" && v.datum) return this.impDatumText(v.datum);
    return String(v).trim();
},

/* Zahl oder als Text geschriebene Zahl ("21", "0,5") -> Zahl; sonst null. */
impZahl: function (v) {

    if (v === null || v === undefined || typeof v === "boolean") return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v !== "string") return null;

    const t = v.trim().replace(",", ".");
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return null;

    const z = Number(t);
    return Number.isFinite(z) ? z : null;
},

/* R-I6, Regel 1: Füllung 1F497D, oder irgendeine Füllung mit fetter weißer Schrift. */
impIstBgZelle: function (blatt, r, c) {

    const s = blatt.stil(r, c);
    const f = s.fuellung;
    if (!f) return false;

    if (f.typ === "rgb" && String(f.rgb).toUpperCase().endsWith(this.impBgFarbe)) return true;

    const k = s.schrift;
    if (s.fett && k) {
        return (k.typ === "rgb" && String(k.rgb).toUpperCase().endsWith("FFFFFF")) || (k.typ === "theme" && k.theme === 0);
    }
    return false;
},

/* ---------------------------------------------------------------------------
   Kopfzeile, Spalten, Kopfwerte
   --------------------------------------------------------------------------- */

/* R-I2: erste Zeile 1 bis 60, in deren Spalten A bis E eine Zelle genau "Zeichnungsnummer" enthält. */
impKopfzeile: function (blatt) {

    for (let r = 1; r <= 60; r++) {
        for (let c = 1; c <= 5; c++) {
            if (this.impTxt(blatt.wert(r, c)).toLowerCase() === "zeichnungsnummer") return r;
        }
    }
    return 0;
},

impNorm: function (t) {

    return t.toLowerCase().replace(/[ \n\r]/g, "");
},

/* R-I3: Spalten per Name in der Kopfzeile (Spalten 1 bis 40). */
impSpaltenFinden: function (blatt, kz) {

    const gefunden = {};
    const namen = {};
    this.impSpalten.forEach(([name, feld]) => { namen[this.impNorm(name)] = feld; });

    for (let c = 1; c <= 40; c++) {
        const t = this.impNorm(this.impTxt(blatt.wert(kz, c)));
        if (Object.prototype.hasOwnProperty.call(namen, t) && !(namen[t] in gefunden)) gefunden[namen[t]] = c;
    }
    return gefunden;
},

/* R-I4: Beschriftung oberhalb der Kopfzeile (Spalten 1 bis 15), Wert in einer der 3 Zellen rechts daneben. */
impKopfwert: function (blatt, kz, etikett) {

    for (let r = 1; r < kz; r++) {
        for (let c = 1; c <= 15; c++) {
            const t = this.impTxt(blatt.wert(r, c));
            if (t && t.replace(/:/g, "").trim().toLowerCase() === etikett.toLowerCase()) {
                for (let k = c + 1; k <= c + 3; k++) {
                    const v = blatt.wert(r, k);
                    if (v && typeof v === "object" && v.datum) return this.impDatumText(v.datum);
                    if (this.impTxt(v)) return this.impTxt(v);
                }
            }
        }
    }
    return "";
},

/* R-I8: Schlüssel je Teil = BG-Name | Zeichnungsnummer | LK-Nummer (ohne Groß-/Kleinschreibung). */
impTeilSchluessel: function (bg, w) {

    return (bg + "|" + w.zeichnungsnummer + "|" + w.lk_nummer).toLowerCase();
},

/* ---------------------------------------------------------------------------
   Datei lesen
   --------------------------------------------------------------------------- */

/* Prüft Name und Größe (R-I1), gemeinsam für beide Excel-Importe.
   speichernAls: wie die Datei neu zu speichern ist (Hinweis bei .xls). */
excelDateiPruefen: function (name, groesse, groessteMb, endungen, speichernAls) {

    const n = this.text(name).toLowerCase();

    if (n.endsWith(".xls")) throw new Error("Alte .xls-Dateien werden nicht gelesen. Bitte in Excel als " + speichernAls + " speichern.");
    if (!endungen.some(e => n.endsWith(e))) throw new Error("Nur Excel-Dateien (.xlsx oder .xlsm).");
    if (groesse > groessteMb * 1024 * 1024) throw new Error("Die Datei ist größer als " + groessteMb + " MB.");
},

/* Eine Kommissionierliste prüfen und lesen. bytes: Uint8Array oder ArrayBuffer. */
impLesen: async function (bytes, dateiname) {

    this.excelDateiPruefen(dateiname, bytes.byteLength, this.impMaxGroesse / (1024 * 1024), this.impEndungen, ".xlsx");

    const mappe = await this.excelLesen(bytes);
    let blatt = null, kz = 0;

    try {
        for (const b of mappe.blaetter) {
            const kandidat = await b.laden();
            kz = this.impKopfzeile(kandidat);
            if (kz) { blatt = kandidat; break; }
        }
    } catch (fehler) {
        throw new Error(this.excelFehlerNichtLesbar);
    }
    if (blatt === null) throw new Error("Keine Kopfzeile mit „Zeichnungsnummer“ gefunden.");

    const sp = this.impSpaltenFinden(blatt, kz);
    if (!("zeichnungsnummer" in sp) || !("menge_gesamt" in sp)) {
        throw new Error("Spalte „Zeichnungsnummer“ oder „Menge Gesamt“ fehlt (Blatt „" + blatt.name + "“).");
    }

    const kopf = {};
    this.impKopf.forEach(([etikett, feld]) => { kopf[feld] = this.impKopfwert(blatt, kz, etikett); });
    kopf.haupt_ab = kopf.haupt_ab ? this.abForm(kopf.haupt_ab) : "";

    const g = { datei: dateiname, kopf: kopf, zeilen: [], hinweise: [] };

    /* R-I5: Datenzeilen = Zeichnungsnummer oder Benennung gefüllt */
    let roh = [];
    for (let r = kz + 1; r <= blatt.zeilenMax; r++) {
        const zn = blatt.wert(r, sp.zeichnungsnummer);
        const bn = "benennung" in sp ? this.impTxt(blatt.wert(r, sp.benennung)) : "";
        if (this.impTxt(zn) || bn) roh.push([r, this.impIstBgZelle(blatt, r, sp.zeichnungsnummer)]);
    }
    if (!roh.length) throw new Error("Keine Daten unter der Kopfzeile gefunden.");

    /* R-I6, Regel 2 (nur wenn keine BG über die Farbe): LK-Nummer ganzzahlig > 0 und durch 100 teilbar */
    if (!roh.some(x => x[1]) && "lk_nummer" in sp) {
        roh = roh.map(([r]) => {
            const lk = this.impZahl(blatt.wert(r, sp.lk_nummer));
            return [r, lk !== null && lk > 0 && Number.isInteger(lk) && lk % 100 === 0];
        });
    }

    /* Festlegung Ben 14.10.2026 (weicht von Excel ab): ohne BG unter der Kopfzeile wird die Haupt-Baugruppe
       direkt über der Kopfzeile gelesen, wenn dort Zeichnungsnummer und eine Zahl bei "Menge Gesamt" stehen */
    const haupt = kz - 1;
    if (!roh.some(x => x[1]) && haupt >= 1 && this.impTxt(blatt.wert(haupt, sp.zeichnungsnummer)) &&
        this.impZahl(blatt.wert(haupt, sp.menge_gesamt)) !== null) {
        roh.unshift([haupt, true]);
        g.hinweise.push("Haupt-Baugruppe aus Zeile " + haupt + " (über der Kopfzeile) übernommen.");
    }

    let bgName = this.impOhneBg;
    const zuGross = [];

    roh.forEach(([r, istBg]) => {
        const w = {};

        this.impSpalten.forEach(([, feld]) => {
            const v = feld in sp ? blatt.wert(r, sp[feld]) : null;

            if (feld === "menge_gesamt" || feld === "vorhanden") {
                let z = this.impZahl(v);
                if (z !== null && Math.abs(z) > this.impMaxMenge) {   /* R-M4: nicht übernehmen, in der Vorschau melden */
                    z = null;
                    zuGross.push(r);
                }
                w[feld] = z;
                if (feld === "menge_gesamt" && z === null && this.impTxt(v)) {
                    w.menge_gesamt_text = this.impTxt(v);   /* Text-Menge: zählt als 0, wird aber angezeigt */
                }
            } else {
                w[feld] = this.impTxt(v);
            }
        });

        if (istBg) {
            bgName = (w.lk_nummer + " " + w.benennung).trim() || "BG Zeile " + r;   /* R-D4 */
            w.vorhanden = null;   /* R-D3, R-I7 */
            g.zeilen.push({ ebene: "BG", bg: bgName, werte: w });
        } else {
            g.zeilen.push({ ebene: "Teil", bg: bgName, werte: w });
        }
    });

    if (zuGross.length) {
        const nummern = Array.from(new Set(zuGross)).sort((a, b) => a - b).slice(0, 10).join(", ");
        g.hinweise.push("Zu große Zahl (über 999.999.999) in Zeile " + nummern + ": nicht übernommen. " +
            "Bei „Menge Gesamt“ steht sie als Text und zählt als 0, bei „Vorhanden“ bleibt das Feld leer. " +
            "Bitte die Spalten in der Datei prüfen.");
    }

    const anzBg = g.zeilen.filter(z => z.ebene === "BG").length;
    const anzTeile = g.zeilen.length - anzBg;
    if (!anzBg) g.hinweise.push("Keine Baugruppe erkannt: alle " + anzTeile + " Teile stehen direkt unter dem AB.");

    const schluessel = g.zeilen.filter(z => z.ebene === "Teil").map(z => this.impTeilSchluessel(z.bg, z.werte));
    const doppelt = Array.from(new Set(schluessel.filter(s => schluessel.indexOf(s) !== schluessel.lastIndexOf(s)))).sort();
    if (doppelt.length) {
        g.hinweise.push("Doppelte Teile (gleiche BG, Zeichnungsnummer und LK): " + doppelt.map(s => s.replace(/\|/g, " · ")).join("; ") +
            ". Beim Ersetzen bekommen beide die Menge der ersten Zeile (wie Excel).");
    }

    return g;
},

/* Der AB der gelesenen Liste in Anzeigeform ("" = fehlt). */
impAb: function (g) {

    return this.abForm(g.kopf.fertigungs_ab || "");
},

impAnzBg: function (g) {

    return g.zeilen.filter(z => z.ebene === "BG").length;
},

impAnzTeile: function (g) {

    return g.zeilen.filter(z => z.ebene === "Teil").length;
},

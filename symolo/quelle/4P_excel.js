/* ===========================================================================
   EXCEL EINLESEN (nur lesen, Makros werden nie ausgeführt)
   Ein kleiner eigener Leser für .xlsx und .xlsm: entpackt die Datei, liest
   Blätter, Zellwerte (zuletzt in Excel gespeicherter Wert, Formeln werden
   nicht berechnet) und von jeder Zelle Füllfarbe und Schrift (die
   Kommissionierliste erkennt Baugruppen an der Farbe).

   DIE EINZIGE STELLE FÜR EXCEL (Entwickler, 16.10.2026): Symolo bringt selbst
   etwas zum Einlesen mit; das wurde noch nicht durchgesprochen. Bis dahin
   liest dieser Leser. Zieht der Entwickler später um, ersetzt er nur
   excelLesen und liefert dasselbe zurück:

     excelLesen(bytes) -> { blaetter: [{ name, laden: async () => Blatt }] }
     Blatt: { name, zeilenMax, spaltenMax, wert(zeile, spalte), stil(zeile, spalte) }

   wert(): null (leer oder Fehlerwert wie #NV), Text, Zahl, true/false oder,
   bei einem Datum, { datum: { j, m, t, h, mi, s } } (Jahr, Monat, Tag, Uhrzeit).
   stil(): { fuellung: { typ, rgb, theme } | null, fett, schrift: { typ, rgb, theme } | null }
   Zeilen und Spalten zählen ab 1 wie in Excel.

   Gebraucht: DecompressionStream (jeder aktuelle Browser, auch Node ab 18),
   TextDecoder, Blob, Response. Kein fetch, keine Verbindung nach außen.
   =========================================================================== */

/* Größtes Stück, das beim Entpacken entstehen darf (Schutz vor Zip-Bomben). */
excelGroesstes: 200 * 1024 * 1024,

excelFehlerKeinExcel: "Die Datei ist keine gültige Excel-Datei.",
excelFehlerNichtLesbar: "Die Datei kann nicht gelesen werden (beschädigt oder kein Excel-Format).",

/* ---------------------------------------------------------------------------
   Zip
   --------------------------------------------------------------------------- */

/* Inhaltsverzeichnis der Zip-Datei: { name: { methode, kompr, gross, offset } } */
excelZipVerzeichnis: function (b) {

    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let ende = -1;

    for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { ende = i; break; }
    }
    if (ende < 0) throw new Error(this.excelFehlerKeinExcel);

    const anzahl = dv.getUint16(ende + 10, true);
    let p = dv.getUint32(ende + 16, true);
    const eintraege = {};

    for (let k = 0; k < anzahl; k++) {
        if (p + 46 > b.length || dv.getUint32(p, true) !== 0x02014b50) throw new Error(this.excelFehlerKeinExcel);

        const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
        const name = new TextDecoder("utf-8").decode(b.subarray(p + 46, p + 46 + nl));

        eintraege[name] = {
            methode: dv.getUint16(p + 10, true),
            kompr: dv.getUint32(p + 20, true),
            gross: dv.getUint32(p + 24, true),
            offset: dv.getUint32(p + 42, true)
        };
        p += 46 + nl + el + cl;
    }

    return eintraege;
},

/* Entpackt einen Eintrag (gespeichert oder deflate). */
excelZipLesen: async function (b, e) {

    if (e.gross > this.excelGroesstes) throw new Error("Die Datei ist zu groß zum Einlesen.");

    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    if (e.offset + 30 > b.length || dv.getUint32(e.offset, true) !== 0x04034b50) throw new Error(this.excelFehlerKeinExcel);

    const start = e.offset + 30 + dv.getUint16(e.offset + 26, true) + dv.getUint16(e.offset + 28, true);
    const roh = b.subarray(start, start + e.kompr);

    if (e.methode === 0) return new Uint8Array(roh);
    if (e.methode !== 8) throw new Error(this.excelFehlerKeinExcel);

    const strom = new Blob([roh]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const aus = new Uint8Array(await new Response(strom).arrayBuffer());

    if (aus.length > this.excelGroesstes) throw new Error("Die Datei ist zu groß zum Einlesen.");
    return aus;
},

excelTextLesen: async function (b, verzeichnis, name) {

    const e = verzeichnis[name];
    if (!e) return null;
    return new TextDecoder("utf-8").decode(await this.excelZipLesen(b, e));
},

/* ---------------------------------------------------------------------------
   XML (nur das, was in Excel-Dateien vorkommt)
   --------------------------------------------------------------------------- */

excelEntitaeten: function (t) {

    if (t.indexOf("&") < 0) return t;

    return t.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (alle, k) => {
        if (k === "amp") return "&";
        if (k === "lt") return "<";
        if (k === "gt") return ">";
        if (k === "quot") return "\"";
        if (k === "apos") return "'";
        return String.fromCodePoint(k.charAt(1) === "x" ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    });
},

excelAttribute: function (s) {

    const a = {};
    const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m;

    while ((m = re.exec(s)) !== null) a[m[1]] = this.excelEntitaeten(m[2] !== undefined ? m[2] : m[3]);
    return a;
},

/* Texte in <t>…</t> hintereinander (ohne Lautschrift <rPh>). */
excelTextTeile: function (xml) {

    const ohne = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
    const re = /<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g;
    let text = "", m;

    while ((m = re.exec(ohne)) !== null) text += m[1] === undefined ? "" : this.excelEntitaeten(m[1]);
    return text;
},

excelGemeinsameTexte: function (xml) {

    const liste = [];
    if (!xml) return liste;

    const re = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
    let m;

    while ((m = re.exec(xml)) !== null) liste.push(m[1] === undefined ? "" : this.excelTextTeile(m[1]));
    return liste;
},

/* ---------------------------------------------------------------------------
   Formate: Füllung, Schrift, Datumsformate
   --------------------------------------------------------------------------- */

excelFarbe: function (xml) {

    const m = /<(?:fgColor|color)\b([^>]*?)\/?>/.exec(xml || "");
    if (!m) return null;

    const a = this.excelAttribute(m[1]);
    if (a.rgb !== undefined) return { typ: "rgb", rgb: a.rgb, theme: null };
    if (a.theme !== undefined) return { typ: "theme", rgb: null, theme: Number(a.theme) };
    if (a.indexed !== undefined) return { typ: "indexed", rgb: null, theme: null };
    return { typ: "rgb", rgb: "00000000", theme: null };
},

/* Erkennt ein Datumsformat wie Excel (und wie die bisherige App, openpyxl). */
excelIstDatumFormat: function (id, code) {

    if ((id >= 14 && id <= 22) || (id >= 45 && id <= 47)) return true;
    if (code === null || code === undefined) return false;

    const fmt = code.split(";")[0].replace(/"[^"]*"|\[[^\]]*\]|\\.|_.|\*./g, "");
    return /[^\\][dmhysDMHYS]/.test(fmt);
},

/* styles.xml: je Zellformat { datum, fuellung, fett, schrift } */
excelFormate: function (xml) {

    const formate = [];
    if (!xml) return formate;

    const abschnitt = (name) => {
        const m = new RegExp("<" + name + "\\b[^>]*>([\\s\\S]*?)</" + name + ">").exec(xml);
        return m ? m[1] : "";
    };

    const codes = {};
    const reCode = /<numFmt\b([^>]*?)\/?>/g;
    let m;
    while ((m = reCode.exec(abschnitt("numFmts"))) !== null) {
        const a = this.excelAttribute(m[1]);
        codes[Number(a.numFmtId)] = a.formatCode;
    }

    const fuellungen = [];
    const reFill = /<fill\b[^>]*>([\s\S]*?)<\/fill>/g;
    const fills = abschnitt("fills");
    while ((m = reFill.exec(fills)) !== null) {
        const typ = /<patternFill\b([^>]*?)\/?>/.exec(m[1]);
        const art = typ ? (this.excelAttribute(typ[1]).patternType || "") : "";
        fuellungen.push(art === "" || art === "none" ? null : this.excelFarbe(m[1]) || { typ: "rgb", rgb: "00000000", theme: null });
    }

    const schriften = [];
    const reFont = /<font\b[^>]*?(?:\/>|>([\s\S]*?)<\/font>)/g;
    const fonts = abschnitt("fonts");
    while ((m = reFont.exec(fonts)) !== null) {
        const inhalt = m[1] || "";
        const b = /<b\b([^>]*?)\/?>/.exec(inhalt);
        const val = b ? this.excelAttribute(b[1]).val : undefined;
        schriften.push({ fett: Boolean(b) && val !== "0" && val !== "false", schrift: this.excelFarbe(inhalt.replace(/<fgColor\b[^>]*>/g, "")) });
    }

    const reXf = /<xf\b([^>]*)>/g;
    while ((m = reXf.exec(abschnitt("cellXfs"))) !== null) {
        const a = this.excelAttribute(m[1]);
        const fmt = Number(a.numFmtId || 0);
        const f = schriften[Number(a.fontId || 0)] || { fett: false, schrift: null };

        formate.push({
            datum: this.excelIstDatumFormat(fmt, codes[fmt]),
            fuellung: fuellungen[Number(a.fillId || 0)] || null,
            fett: f.fett,
            schrift: f.schrift
        });
    }

    return formate;
},

/* ---------------------------------------------------------------------------
   Datum
   --------------------------------------------------------------------------- */

/* Excel-Seriennummer -> { j, m, t, h, mi, s } (1900er Zählung; unter 60 zählt der erfundene 29.2.1900 mit). */
excelDatum: function (seriennummer, ab1904) {

    const tage = Math.floor(seriennummer);
    let epoche = ab1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
    if (!ab1904 && tage < 60) epoche = Date.UTC(1899, 11, 31);

    const d = new Date(epoche + Math.round(seriennummer * 86400000));
    return { j: d.getUTCFullYear(), m: d.getUTCMonth() + 1, t: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() };
},

/* ---------------------------------------------------------------------------
   Arbeitsmappe und Blätter
   --------------------------------------------------------------------------- */

excelSpalteNr: function (buchstaben) {

    let n = 0;
    for (let i = 0; i < buchstaben.length; i++) n = n * 26 + buchstaben.charCodeAt(i) - 64;
    return n;
},

/* Ein Blatt aus seinem XML. */
excelBlattBauen: function (name, xml, texte, formate, ab1904) {

    const zeilen = [];
    let zeilenMax = 0, spaltenMax = 0;
    const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let m;

    while ((m = re.exec(xml)) !== null) {
        const a = this.excelAttribute(m[1]);
        const ort = /^([A-Za-z]+)(\d+)$/.exec(a.r || "");
        if (!ort) continue;

        const spalte = this.excelSpalteNr(ort[1].toUpperCase()), zeile = Number(ort[2]);
        const stilNr = a.s === undefined ? 0 : Number(a.s);
        const innen = m[2] || "";

        let wert = null;
        const v = /<v\b[^>]*?(?:\/>|>([\s\S]*?)<\/v>)/.exec(innen);
        const roh = v && v[1] !== undefined ? v[1] : null;

        if (a.t === "inlineStr") {
            const is = /<is\b[^>]*>([\s\S]*?)<\/is>/.exec(innen);
            wert = is ? this.excelTextTeile(is[1]) : "";
        } else if (roh !== null) {
            if (a.t === "s") wert = texte[Number(roh)] === undefined ? null : texte[Number(roh)];
            else if (a.t === "str") wert = this.excelEntitaeten(roh);
            else if (a.t === "b") wert = roh === "1";
            else if (a.t === "e") wert = null;
            else if (a.t === "d") wert = this.excelEntitaeten(roh);
            else {
                const zahl = Number(roh);
                wert = roh.trim() === "" || !Number.isFinite(zahl) ? null : zahl;
                if (wert !== null && formate[stilNr] && formate[stilNr].datum) wert = { datum: this.excelDatum(zahl, ab1904) };
            }
        }

        (zeilen[zeile] = zeilen[zeile] || [])[spalte] = { w: wert, s: stilNr };
        if (zeile > zeilenMax) zeilenMax = zeile;
        if (spalte > spaltenMax) spaltenMax = spalte;
    }

    const zelle = (z, s) => (zeilen[z] && zeilen[z][s]) || null;

    return {
        name: name,
        zeilenMax: zeilenMax,
        spaltenMax: spaltenMax,
        wert: (z, s) => { const x = zelle(z, s); return x ? x.w : null; },
        stil: (z, s) => {
            const x = zelle(z, s);
            const f = x ? formate[x.s] : null;
            return f ? { fuellung: f.fuellung, fett: f.fett, schrift: f.schrift } : { fuellung: null, fett: false, schrift: null };
        }
    };
},

/* Datei öffnen. bytes: Uint8Array oder ArrayBuffer. Die Blätter werden erst beim Aufruf von laden() gelesen. */
excelLesen: async function (bytes) {

    const b = new Uint8Array(bytes);
    const verzeichnis = this.excelZipVerzeichnis(b);

    try {
        const mappe = await this.excelTextLesen(b, verzeichnis, "xl/workbook.xml");
        if (mappe === null) throw new Error(this.excelFehlerNichtLesbar);

        const rels = await this.excelTextLesen(b, verzeichnis, "xl/_rels/workbook.xml.rels") || "";
        const ziele = {};
        const reRel = /<Relationship\b([^>]*?)\/?>/g;
        let m;

        while ((m = reRel.exec(rels)) !== null) {
            const a = this.excelAttribute(m[1]);
            if (a.Id && a.Target) ziele[a.Id] = a.Target.charAt(0) === "/" ? a.Target.slice(1) : "xl/" + a.Target;
        }

        const ab1904 = /<workbookPr\b[^>]*date1904\s*=\s*"(?:1|true)"/.test(mappe);
        let texte = null, formate = null;

        const vorbereiten = async () => {
            if (texte === null) {
                texte = this.excelGemeinsameTexte(await this.excelTextLesen(b, verzeichnis, "xl/sharedStrings.xml"));
                formate = this.excelFormate(await this.excelTextLesen(b, verzeichnis, "xl/styles.xml"));
            }
        };

        const blaetter = [];
        const reBlatt = /<sheet\b([^>]*?)\/?>/g;

        while ((m = reBlatt.exec(mappe)) !== null) {
            const a = this.excelAttribute(m[1]);
            const ziel = ziele[a["r:id"]];
            if (!ziel || ziel.indexOf("worksheets/") < 0 || !verzeichnis[ziel]) continue;

            blaetter.push({
                name: a.name,
                laden: async () => {
                    await vorbereiten();
                    return this.excelBlattBauen(a.name, await this.excelTextLesen(b, verzeichnis, ziel), texte, formate, ab1904);
                }
            });
        }

        return { blaetter: blaetter };
    } catch (fehler) {
        throw new Error(this.excelFehlerNichtLesbar);
    }
},

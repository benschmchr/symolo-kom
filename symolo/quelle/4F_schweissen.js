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

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

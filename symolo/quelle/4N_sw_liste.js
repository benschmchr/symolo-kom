/* ===========================================================================
   SCHWEISSEN ANSEHEN: Suchen, Filtern, Sortieren, Sammlungen (R-W10)
   Nachbau von bestand/schweissen/bloecke.py. Die Blöcke bauen swBloecke und
   swBerechnen (4F_schweissen.js). Jede Zeile trägt zeigen (Treffer von
   Suche und Filter).
   =========================================================================== */

swAnzeigen: [["ab", "ABs"], ["bg", "BGs"], ["alles", "Alles"]],

swSortierungen: [
    ["", "Standard"],
    ["lt_auf", "Liefertermin aufsteigend"],
    ["lt_ab", "Liefertermin absteigend"],
    ["ab_auf", "AB aufsteigend"],
    ["ab_ab", "AB absteigend"]
],

swTreffer: function (q, texte) {

    return texte.some(t => this.text(t).toLowerCase().indexOf(q) > -1);
},

/* R-W10: Teilwort in AB/Anzeige (-> ganzer Block), Zeichnungsnummer, Benennung, LK Nummer, Mitarbeiter,
   Arbeitsplatz (BG -> mit allen Teilen, Teil -> mit BG- und AB-Kopf). Setzt zeigen an Zeilen und
   Blöcken; gibt die Zahl der Treffer zurück. */
swSuchen: function (bloecke, begriff) {

    const q = this.text(begriff).toLowerCase();
    const passt = z => this.swTreffer(q, [z.zeichnungsnummer, z.benennung, z.lk_nummer, z.m, z.p]);
    let treffer = 0;

    bloecke.forEach(b => {
        const alle = this.swBlockZeilen(b);
        alle.forEach(z => { z.zeigen = false; });
        b.zeigen = false;

        const kopf = this.swKopf(b);
        if (this.swTreffer(q, [kopf.anzeige, kopf.ab_nr]) || (b.ab && passt(b.ab))) {
            alle.forEach(z => { z.zeigen = true; });
            b.zeigen = true;
            treffer++;
            return;
        }

        const ab = () => { if (b.ab) b.ab.zeigen = true; };

        b.ohne.forEach(t => {
            if (passt(t)) { t.zeigen = b.zeigen = true; ab(); treffer++; }
        });

        b.bgs.forEach(g => {
            if (passt(g.bg)) {
                g.bg.zeigen = b.zeigen = true;
                g.teile.forEach(t => { t.zeigen = true; });
                ab();
                treffer++;
            }
            g.teile.forEach(t => {
                if (passt(t)) { t.zeigen = g.bg.zeigen = b.zeigen = true; ab(); treffer++; }
            });
        });
    });

    return treffer;
},

/* R-W10 Anzeige (Ben, 14.10.): "ABs" und "BGs" zeigen alle Zeilen, nur zugeklappt (das Klappen
   macht die Ansicht), damit man darunter aufklappen kann. "Alles" zeigt alles. */
swAllesZeigen: function (bloecke) {

    bloecke.forEach(b => {
        b.zeigen = true;
        this.swBlockZeilen(b).forEach(z => { z.zeigen = true; });
    });
},

/* Ben, 14.10.: nur Blöcke, in denen dieser Mitarbeiter / dieser Arbeitsplatz vorkommt. */
swBlockFiltern: function (bloecke, mitarbeiter, platz) {

    return bloecke.filter(b => {
        const zs = this.swBlockZeilen(b);

        if (mitarbeiter && !zs.some(z => this.swMitarbeiterListe(z.m).some(n => n.toLowerCase() === mitarbeiter.toLowerCase()))) return false;
        if (platz && !zs.some(z => this.hpKlein(z.p) === this.hpKlein(platz))) return false;
        return true;
    });
},

/* Liefertermin (Stahlbau) oder AB-Nummer; Blöcke ohne Termin stehen immer hinten. */
swBlockSortieren: function (bloecke, wie) {

    const vergleich = (x, y) => (x < y ? -1 : (x > y ? 1 : 0));
    const nummer = b => this.text(this.swKopf(b).ab_nr).toLowerCase();
    const absteigend = wie.slice(-2) === "ab";

    if (wie.indexOf("ab_") === 0) {
        return bloecke.slice().sort((p, q) => (absteigend ? -1 : 1) * vergleich(nummer(p), nummer(q)));
    }

    const tag = b => this.tagNr(this.swKopf(b).lt);
    const mit = bloecke.filter(b => tag(b) !== null).sort((p, q) =>
        (absteigend ? -1 : 1) * (vergleich(tag(p), tag(q)) || vergleich(nummer(p), nummer(q))));

    return mit.concat(bloecke.filter(b => tag(b) === null));
},

/* Ben, 15.10.: Die Einzelblöcke eines AB (Baugruppen im Schweißen, der Rest noch in der Bestandsliste)
   stehen gemeinsam unter der AB-Überschrift. Ergebnis: Blöcke und Sammlungen in der Reihenfolge der Liste.
   Sammlung: { sammlung: true, schluessel, bloecke, komBgs: [Namen], offen } */
swSammeln: function (bloecke) {

    const ergebnis = [], sammlungen = {};

    bloecke.forEach(b => {
        if (b.ab !== null) { ergebnis.push(b); return; }

        const s = this.text(b.bgs[0].bg.ab_schluessel);
        if (!sammlungen[s]) {
            sammlungen[s] = { sammlung: true, schluessel: s, bloecke: [], komBgs: [], offen: true };
            ergebnis.push(sammlungen[s]);
        }
        sammlungen[s].bloecke.push(b);
    });

    return ergebnis;
},

/* Name, Kunde, Benennung einer Sammlung (aus ihrem ersten Block). */
swSammlungKopf: function (s) {

    const kopf = this.swKopf(s.bloecke[0]);
    const k = kopf.kopfObj || {};
    return { anzeige: this.text(kopf.anzeige).replace(/_BG[^_]*$/i, ""), benennung: this.text(k.verkaufsartikel), kunde: this.text(k.kunde) };
},

/* Die Baugruppen, die einer Sammlung noch in der Bestandsliste stehen (rote Kacheln), als Namen. */
swSammlungenErgaenzen: async function (liste) {

    const sammlungen = liste.filter(x => x.sammlung);
    if (!sammlungen.length) return;

    const abs = await this.datenLesenIn("auftrag", "ab_schluessel", sammlungen.map(s => s.schluessel), { wo: { bereich: "bestand" } });
    if (!abs.length) return;

    const bgs = await this.datenLesenIn("baugruppe", "auftrag", abs.map(a => a._id), { sortierung: ["zeile"] });

    sammlungen.forEach(s => {
        const a = abs.find(x => this.text(x.ab_schluessel) === s.schluessel);
        if (!a) return;
        s.komBgs = bgs.filter(b => String(b._auftrag_id) === String(a._id)).map(b => this.text(b.name));
    });
},

/* Je AB-Schlüssel die Baugruppen, die einzeln im Schweißen liegen (rote Kacheln "Befinden sich im
   Schweißen" in der Bestandsliste und im Dashboard). zeilen = swLesen(). */
swImSchweissen: function (zeilen) {

    const je = {};

    zeilen.forEach(z => {
        if (z.ebene === "BG" && this.text(z.anzeige).toLowerCase().indexOf("_bg") > -1) {
            (je[this.text(z.ab_schluessel)] = je[this.text(z.ab_schluessel)] || []).push(z);
        }
    });

    return je;
},

/* Zähler oben: ABs im Schweißen (ein Einzelblock zählt als eigener Eintrag je AB) und Zahl der Einzelblöcke. */
swZaehler: function (bloecke) {

    const abs = {};
    bloecke.forEach(b => { abs[b.ab === null ? "e|" + this.text(this.swKopf(b).ab_schluessel) : "a|" + String(b.ab._id)] = true; });

    return { ab: Object.keys(abs).length, einzeln: bloecke.filter(b => b.ab === null).length };
},

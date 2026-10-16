/* ===========================================================================
   SCHWEISSEN: ENTNEHMEN, ZUSAMMENFASSEN, ARCHIVIEREN, ZURÜCK (R-W2, R-W3,
   R-W8, R-W9)
   Nachbau von bestand/schweissen/vorgaenge.py. Alles läuft über die
   Datenschicht (datenAnlegen, datenAendern). Gelöscht wird nie (Ben,
   16.10.2026); statt Löschen gilt:

   Entnehmen:  Die Zeilen werden als Kopien in schweisszeile angelegt. Das
               Original bleibt stehen und wird nur ausgeblendet:
               - ganzer AB:   auftrag.bereich = "schweissen"
               - eine BG:     baugruppe und ihre Teile bekommen archiviert = ja
   Zurück:     Die Zeilen aus schweisszeile bauen den AB (oder die BG) in der
               Bestandsliste neu auf (wie bisher, nicht aus den ausgeblendeten
               Originalen). Die Kopien in schweisszeile bekommen archiviert = ja
               und zurueckgeholt = ja; so zählen sie weder im Archiv noch in
               der Statistik.
               OFFEN (Symolo): Die ausgeblendeten Originale und die
               zurückgeholten Zeilen bleiben in der Datenbank. Aufräumen kann
               nur die IT.
   Archivieren: Alle Zeilen des AB bekommen archiviert = ja; dazu gibt es einen
               Kopf (auftrag, bereich "archiv") für das Archiv.
   Nichts davon ist eine Transaktion. OFFEN (Symolo): Gibt es Transaktionen
   oder ein Sammelanlegen? Bis dahin werden die Schritte nacheinander
   geschrieben, die Originale zuletzt ausgeblendet.
   =========================================================================== */

/* R-W4: Spalten, die aus der Bestandsliste kopiert werden (wie archivUebernehmen) */
swKopierFelder: ["zeichnungsnummer", "benennung", "menge_bg", "index", "lk_nummer", "arbeitsgang", "material", "profil",
    "abmasse", "bemerkung", "lagerort"],

/* Nächste freie Nummer (Reihenfolge nr). */
swNaechsteNr: function (zeilen) {

    return zeilen.reduce((m, z) => Math.max(m, this.mengeMilli(z.nr) / 1000), 0) + 1;
},

/* Kopfdaten des AB, wie sie zum Zurückholen mitgespeichert werden. */
swKopfVon: function (o) {

    const j = {};
    ["kunde", "haupt_ab", "verkaufsartikel", "ersteller", "datum_liste", "dispoliste", "quelldatei"]
        .forEach(f => { j[f] = this.text(o[f]); });
    j.reihenfolge = o.reihenfolge === null || o.reihenfolge === undefined || o.reihenfolge === "" ? null : Number(o.reihenfolge);
    j.forecast_schluessel = this.text(o.forecast_schluessel);
    return JSON.stringify(j);
},

/* Eine leere Zeile mit allen Feldern der Tabelle schweisszeile. */
swLeereZeile: function () {

    return {
        nr: 0, ab_nr: "", ab_schluessel: "", anzeige: "", ebene: "", baugruppe: "", zeichnungsnummer: "", benennung: "",
        menge_bg: "", menge_gesamt: "", index: "", lk_nummer: "", arbeitsgang: "", material: "", profil: "", abmasse: "",
        bemerkung: "", vorhanden: "", lagerort: "", status: "", fortschritt: "", eingelagert: null, komplett: null,
        entnommen: null, mitarbeiter: "", arbeitsplatz: "", liefertermin_stahlbau: null, termin_versand: null,
        kopf: "{}", ap_geteilt: false, archiviert: false, zurueckgeholt: false
    };
},

/* ---------------------------------------------------------------------------
   R-W2 Entnehmen
   --------------------------------------------------------------------------- */

swPlanName: function (p) {

    const ab = this.text(p.a.o.ab_anzeige);
    return p.bg === null ? "AB " + ab : "Baugruppe " + this.text(p.bg.o.name) + " (" + ab + ")";
},

/* Sicherheitsfrage wie in Excel. */
swPlanFrage: function (p) {

    if (p.bg === null) {
        return "AB " + this.text(p.a.o.ab_anzeige) + " mit " + p.nBg + " Baugruppe(n) und " + p.nTeil +
            " Teil(en) ins Blatt Schweißen verschieben?";
    }
    return this.swPlanName(p) + " mit " + p.nTeil + " Teil(en) ins Blatt Schweißen verschieben?";
},

/* Wie die Zeilen im Schweißen heißen: "AB…" oder "AB…_BGnnn". */
swPlanAnzeige: function (p) {

    const ab = this.text(p.a.o.ab_anzeige);
    return p.bg === null || p.mitAb ? ab : ab + "_BG" + this.swBgNummer(p.bg.o.name);
},

/* R-W2: nur ganze ABs oder BGs mit Status Komplett. Liest den AB frisch aus der Datenbank.
   Wirft eine Meldung wie in Excel. */
swEntnehmenPruefen: async function (abId, bgId) {

    const baum = await this.bestandLaden([abId]);
    const a = baum.length ? baum[0] : null;
    if (a === null) throw new Error("Dieser Arbeitsauftrag ist nicht (mehr) in der Bestandsliste.");

    let bg = null;
    if (bgId !== null && bgId !== undefined) {
        bg = a.bgs.find(b => String(b.o._id) === String(bgId)) || null;
        if (bg === null) throw new Error("Diese Baugruppe ist nicht (mehr) in der Bestandsliste.");
    }

    const ziel = bg || a;
    if (ziel.w.status !== "Komplett") {
        const name = bg === null ? "AB " + this.text(a.o.ab_anzeige)
            : "Baugruppe " + this.text(bg.o.name) + " (" + this.text(a.o.ab_anzeige) + ")";
        throw new Error("Nur ABs und Baugruppen mit Status „Komplett“ können entnommen werden. " + name + ": " + ziel.w.status);
    }

    if (bg === null) return { a: a, bg: null, mitAb: true, nBg: a.bgs.length, nTeil: this.bestandTeile(a).length };

    /* letzte BG: der AB kommt mit (R-W3) */
    return { a: a, bg: bg, mitAb: a.bgs.length === 1 && a.ohne.length === 0, nBg: 0, nTeil: bg.teile.length };
},

/* Eine Zeile (BG oder Teil) für das Schweißen. */
swZeileNeu: function (nr, a, anzeige, ebene, bgName, o, w, heute, kopf, vorhanden) {

    const z = this.swLeereZeile();

    this.swKopierFelder.forEach(f => { z[f] = this.text(o[f]); });
    Object.assign(z, {
        nr: nr, ab_nr: this.text(a.o.ab_anzeige), ab_schluessel: this.text(a.o.ab_schluessel), anzeige: anzeige,
        ebene: ebene, baugruppe: bgName, menge_gesamt: this.sollText(o), vorhanden: vorhanden,
        status: w.status, fortschritt: w.fortschritt, eingelagert: this.text(w.eingelagert) || null,
        komplett: this.text(w.komplett) || null, entnommen: heute, kopf: kopf
    });
    return z;
},

/* Die Zeilen für das Schweißen in der Reihenfolge der Bestandsliste (Teile ohne BG vorn). */
swZeilenKopieren: function (p, nr, heute) {

    const a = p.a, ab = a.o;
    const anzeige = this.swPlanAnzeige(p);
    const kopf = this.swKopfVon(ab);
    const zeilen = [];

    const teil = (t, bgName) => this.swZeileNeu(nr + zeilen.length, a, anzeige, "Teil", bgName, t.o, t.w, heute, kopf,
        this.mengeGleich(t.o.vorhanden, null) ? "" : this.zahlText(this.mengeMilli(t.o.vorhanden)));

    const bgZeilen = b => {
        zeilen.push(this.swZeileNeu(nr + zeilen.length, a, anzeige, "BG", this.text(b.o.name), b.o, b.w, heute, kopf, ""));
        b.teile.forEach(t => zeilen.push(teil(t, this.text(b.o.name))));
    };

    if (p.bg === null || p.mitAb) {
        /* AB-Zeile (R-D2: wie in Excel "Kunde: …" usw.) */
        const z = this.swLeereZeile();
        Object.assign(z, {
            nr: nr, ab_nr: this.text(ab.ab_anzeige), ab_schluessel: this.text(ab.ab_schluessel), anzeige: anzeige,
            ebene: "AB", zeichnungsnummer: this.text(ab.ab_anzeige), benennung: this.text(ab.verkaufsartikel),
            lagerort: this.text(ab.lagerort), status: a.w.status, fortschritt: a.w.fortschritt,
            eingelagert: this.text(a.w.eingelagert) || null, komplett: this.text(a.w.komplett) || null,
            entnommen: heute, kopf: kopf
        });
        for (const feld in this.archivKopfEtiketten) {
            const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
            const wert = this.text(ab[quelle]);
            z[feld] = wert ? vorsatz + wert : "";
        }
        zeilen.push(z);
    }

    if (p.bg === null) {
        a.ohne.forEach(t => zeilen.push(teil(t, this.archivOhneBg)));
        a.bgs.forEach(bgZeilen);
    } else {
        bgZeilen(p.bg);
    }

    return zeilen;
},

/* R-W2/R-W3: AB oder BG ins Schweißen kopieren, in der Bestandsliste ausblenden. Die letzte BG nimmt die
   AB-Zeile mit; dann werden alle Zeilen des AB zusammengefasst. Entnommen = heute; Mitarbeiter,
   Arbeitsplatz, Termine leer. Gibt den Plan zurück. */
swEntnehmen: async function (abId, bgId) {

    const p = await this.swEntnehmenPruefen(abId, bgId);
    const heute = this.heuteText();

    const vorhanden = await this.swLesen();
    const neu = this.swZeilenKopieren(p, this.swNaechsteNr(vorhanden), heute);

    /* erst kopieren, dann ausblenden */
    await this.jeAcht(neu, z => this.datenAnlegen("schweisszeile", z));

    const ganz = p.bg === null || p.mitAb;
    if (ganz) {
        await this.datenAendern("auftrag", p.a.o, { bereich: "schweissen" }, { ohnePruefung: true });
    } else {
        const aufgaben = [{ name: "baugruppe", zeile: p.bg.o, werte: { archiviert: true } }];
        p.bg.teile.forEach(t => aufgaben.push({ name: "teil", zeile: t.o, werte: { archiviert: true } }));
        await this.datenAendernViele(aufgaben);
    }

    if (ganz) await this.swZusammenfassen(this.text(p.a.o.ab_schluessel));
    await this.swAbgleichen();

    await this.protokollSchreiben("entnommen", p.a.o.ab_anzeige, p.bg === null ? "" : "BG " + this.text(p.bg.o.name),
        "Bestandsliste", "Schweißen");
    return p;
},

/* Zeilen eines AB (in Reihenfolge) -> { abz: AB-Zeilen, ohne: Teile ohne BG, bgs: [{ bg, teile }] } */
swGruppen: function (zeilen) {

    const g = { abz: [], ohne: [], bgs: [] };

    zeilen.forEach(z => {
        if (z.ebene === "AB") g.abz.push(z);
        else if (z.ebene === "BG") g.bgs.push({ bg: z, teile: [] });
        else if (g.bgs.length) g.bgs[g.bgs.length - 1].teile.push(z);
        else g.ohne.push(z);
    });

    return g;
},

/* R-W3 (SwZusammenfassen): alle Zeilen eines AB unter der AB-Zeile zusammenfassen: AB-Zeile, Teile ohne BG,
   dann die BGs nach Nummer (Teile bleiben hinter ihrer BG); Anzeige wieder "AB…". Mitarbeiter, Plätze, Termine
   und das Entnommen-Datum jeder Zeile bleiben. Die Zeilen stehen danach am Ende der Liste. */
swZusammenfassen: async function (schluessel) {

    const alle = await this.swLesen();
    const zeilen = this.swNachNr(alle.filter(z => this.text(z.ab_schluessel) === schluessel));
    if (!zeilen.length) return;

    const g = this.swGruppen(zeilen);
    g.bgs.sort((p, q) => this.swBgVergleich(p.bg.baugruppe, q.bg.baugruppe));

    let ordnung = g.abz.concat(g.ohne);
    g.bgs.forEach(x => { ordnung = ordnung.concat([x.bg], x.teile); });

    const nr = this.swNaechsteNr(alle);
    await this.datenAendernViele(ordnung.map((z, i) => ({
        name: "schweisszeile", zeile: z, werte: { nr: nr + i, anzeige: this.text(z.ab_nr) }
    })));
},

/* ---------------------------------------------------------------------------
   R-W8 Archivieren
   --------------------------------------------------------------------------- */

/* R-I10: Liegt der AB (Vergleich nach R-AB3) schon ganz oder teilweise im Bereich Schweißen? */
swHatAb: async function (ab) {

    return this.text(ab) !== "" && this.swHatSchluessel(this.abSchluessel(ab));
},

swHatSchluessel: async function (schluessel) {

    const da = await this.datenLesen("schweisszeile", { wo: { ab_schluessel: schluessel }, aufloesen: false, felder: ["ab_schluessel"] });
    return da.length > 0;
},

/* Nur ganze ABs (AB-Zeile). Gibt { z, n } zurück (n = Zahl der Zeilen) oder wirft eine Meldung wie in Excel. */
swArchivierenPruefen: async function (zeileId) {

    const alle = await this.swLesen();
    const z = alle.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");

    if (z.ebene === "BG" && this.text(z.anzeige).toUpperCase().indexOf("_BG") > -1) {
        throw new Error("Diese Baugruppe kann erst archiviert werden, wenn der ganze AB im Blatt Schweißen liegt.");
    }
    if (z.ebene !== "AB") throw new Error("Archiviert werden nur ganze ABs: bitte in der AB-Zeile archivieren.");

    return { z: z, n: alle.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)).length, alle: alle };
},

/* R-W8: alle Zeilen des AB ins Archiv (Herkunft "Archiviert aus Schweißen"), im Schweißen ausblenden.
   Mitarbeiter, Plätze und Termine werden so festgehalten, wie sie angezeigt wurden ("(verschieden)" bleibt Text;
   bei Terminen steht dann nichts). Gibt { ab, n } zurück. */
swArchivieren: async function (zeileId) {

    const { z, alle: live } = await this.swArchivierenPruefen(zeileId);
    const zeilen = this.swNachNr(live.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)));

    const w = this.swWerte(zeilen);
    this.swAbAbleiten(zeilen.map(x => x.ebene), zeilen.map(x => x.ab_nr), w);

    const abZeile = zeilen.find(x => x.ebene === "AB");
    const k = abZeile.kopfObj || {};
    const jetzt = this.zeitJetzt();

    /* Kopf fürs Archiv: einen früheren Kopf des AB wiederverwenden, sonst neu anlegen. */
    const kopfWerte = {
        ab_anzeige: this.text(abZeile.ab_nr), ab_schluessel: this.text(abZeile.ab_schluessel),
        kunde: this.text(k.kunde), verkaufsartikel: this.text(k.verkaufsartikel),
        quelldatei: this.text(k.quelldatei), reihenfolge: k.reihenfolge === undefined ? null : k.reihenfolge,
        regal_geteilt: false, bereich: "archiv", archiviert: true, archiviert_am: jetzt,
        archiv_herkunft: this.archivHerkunftSchweissen, archiv_status: this.text(abZeile.status)
    };
    const koepfe = await this.datenLesen("auftrag", {
        wo: { ab_schluessel: kopfWerte.ab_schluessel, bereich: "archiv" }, archiv: "alle", aufloesen: false
    });
    const frei = koepfe.find(x => !this.istJa(x.archiviert));
    if (frei) await this.datenAendern("auftrag", frei, kopfWerte, { ohnePruefung: true });
    else await this.datenAnlegen("auftrag", kopfWerte);

    await this.datenAendernViele(zeilen.map((x, i) => {
        const datum = v => (v === this.swVerschieden ? null : (v === undefined ? null : v));
        return {
            name: "schweisszeile", zeile: x, werte: {
                mitarbeiter: this.text(w[i][0]), arbeitsplatz: this.text(w[i][1]),
                liefertermin_stahlbau: datum(w[i][2]), termin_versand: datum(w[i][3]), archiviert: true
            }
        };
    }));

    await this.protokollSchreiben("archiviert", this.text(abZeile.ab_nr), "", zeilen.length + " Zeilen", "Archiv");
    return { ab: this.text(abZeile.ab_nr), n: zeilen.length };
},

/* Kopfdaten für die Zeilen eines wiederhergestellten AB: was in den Zeilen steht, ergänzt aus dem Kopf. */
swKopfAusZeilen: function (zeilen, kopf) {

    const abZeile = zeilen.find(x => x.ebene === "AB");
    let j = {};
    for (const x of zeilen) {
        try { j = JSON.parse(this.text(x.kopf) || "{}") || {}; } catch (fehler) { j = {}; }
        if (Object.keys(j).length) break;
    }

    const setzen = (f, wert) => { if (j[f] === undefined || j[f] === null || j[f] === "") j[f] = wert; };
    setzen("kunde", this.text(kopf.kunde));
    setzen("verkaufsartikel", this.text(kopf.verkaufsartikel));
    setzen("quelldatei", this.text(kopf.quelldatei));
    setzen("reihenfolge", kopf.reihenfolge === undefined ? null : kopf.reihenfolge);
    setzen("forecast_schluessel", this.abForecastSchluessel(this.text(kopf.ab_anzeige)));

    if (abZeile) {
        for (const feld in this.archivKopfEtiketten) {
            const [vorsatz, quelle] = this.archivKopfEtiketten[feld];
            const t = this.text(abZeile[feld]);
            setzen(quelle, t.indexOf(vorsatz) === 0 ? this.text(t.slice(vorsatz.length)) : t);
        }
    }

    return JSON.stringify(j);
},

/* Wiederherstellen eines aus dem Schweißen archivierten AB: die Zeilen kommen mit allen Angaben zurück ins
   Schweißen. kopf = Zeile aus archivLaden. Gibt die Zahl der Zeilen zurück. */
swAusArchiv: async function (kopf) {

    const name = this.text(kopf.ab_anzeige);
    const schluessel = this.text(kopf.ab_schluessel) || this.abSchluessel(name);

    if (await this.swHatSchluessel(schluessel)) {
        throw new Error(name + " liegt schon wieder im Schweißen. Erst dort archivieren, dann wiederherstellen.");
    }

    const archiviert = await this.datenLesen("schweisszeile", { wo: { ab_schluessel: schluessel }, archiv: "nur", aufloesen: false });
    const zeilen = this.swNachNr(archiviert.filter(x => !this.istJa(x.zurueckgeholt)));
    if (!zeilen.length) throw new Error("Für " + name + " gibt es keine Zeilen im Archiv.");

    const alle = await this.swLesen();
    const nr = this.swNaechsteNr(alle);
    const kopfText = this.swKopfAusZeilen(zeilen, kopf);
    const ohneVerschieden = v => (this.text(v) === this.swVerschieden ? "" : this.text(v));

    await this.datenAendernViele(zeilen.map((x, i) => ({
        name: "schweisszeile", zeile: x, werte: {
            nr: nr + i, anzeige: this.text(x.ab_nr) || name, archiviert: false,
            mitarbeiter: ohneVerschieden(x.mitarbeiter), arbeitsplatz: ohneVerschieden(x.arbeitsplatz),
            liefertermin_stahlbau: this.tagNr(x.liefertermin_stahlbau) === null ? null : x.liefertermin_stahlbau,
            termin_versand: this.tagNr(x.termin_versand) === null ? null : x.termin_versand, kopf: kopfText
        }
    })));

    /* Der Kopf im Archiv wird nicht mehr gebraucht; er bleibt stehen, ist aber nicht mehr archiviert
       (bereich "archiv": die Bestandsliste liest ihn nie). */
    await this.datenAendern("auftrag", kopf, { archiviert: false, archiviert_am: null }, { ohnePruefung: true });

    await this.swAbgleichen();
    await this.protokollSchreiben("wiederhergestellt", name, "", "Archiv", "Schweißen");
    return zeilen.length;
},

/* ---------------------------------------------------------------------------
   R-W9 Zurück in die Bestandsliste
   --------------------------------------------------------------------------- */

swRueckName: function (r) {

    const z = r.zeile;
    return z.ebene === "AB" ? "AB " + this.text(z.ab_nr) : "Baugruppe " + this.text(z.baugruppe) + " (" + this.text(z.ab_nr) + ")";
},

swRueckFrage: function (r) {

    const z = r.zeile;
    if (z.ebene === "AB") return "AB " + this.text(z.ab_nr) + " mit allen Baugruppen zurück in die Bestandsliste schieben?";

    let text = "Baugruppe " + this.text(z.baugruppe) + " (" + this.text(z.ab_nr) + ") zurück in die Bestandsliste schieben?";
    if (r.mitAb) text += " Die AB-Zeile geht mit zurück, die übrigen Baugruppen bleiben einzeln im Schweißen.";
    return text;
},

swRueckVerlust: "Mengen, Lagerort und Daten kommen mit. Mitarbeiter, Arbeitsplatz, Termine und das Entnahmedatum gehen verloren.",

/* Gibt { zeile, auswahl, mitAb } zurück oder wirft eine Meldung. */
swZurueckPruefen: async function (zeileId) {

    const live = await this.swLesen();
    const z = live.find(x => String(x._id) === String(zeileId));
    if (!z) throw new Error("Diese Zeile gibt es nicht (mehr) im Bereich Schweißen.");
    if (z.ebene !== "AB" && z.ebene !== "BG") throw new Error("Bitte die Zeile des AB oder der Baugruppe wählen (nicht ein Einzelteil).");

    const alle = this.swNachNr(live.filter(x => this.text(x.ab_schluessel) === this.text(z.ab_schluessel)));
    if (z.ebene === "AB") return { zeile: z, auswahl: alle, mitAb: true, alle: alle };

    const g = this.swGruppen(alle);
    const mein = g.bgs.find(x => String(x.bg._id) === String(z._id));
    let auswahl = [mein.bg].concat(mein.teile);
    const mitAb = g.abz.length > 0;
    if (mitAb) auswahl = g.abz.concat(g.ohne, auswahl);   /* AB-Zeile und Teile ohne BG gehen mit zurück */

    return { zeile: z, auswahl: auswahl, mitAb: mitAb, alle: alle };
},

/* Text aus dem Schweißen -> { zahl, text }: eine Zahl (Komma oder Punkt) oder der Text selbst. */
swZahl: function (wert) {

    const t = this.text(wert);
    if (!t) return { zahl: null, text: "" };

    const s = t.indexOf(",") > -1 ? t.replace(/\./g, "").replace(",", ".") : t;
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) && Number.isFinite(Number(s))) return { zahl: Number(s), text: "" };

    return { zahl: null, text: t };
},

/* R-W9: AB bzw. BG zurück in die Bestandsliste. Eine BG eines zusammengefassten AB nimmt die AB-Zeile mit; die
   übrigen BGs stehen danach wieder einzeln als AB…_BGnnn. Mitarbeiter, Arbeitsplatz, Termine und Entnommen gehen
   verloren. Gibt den AB (Zeile aus kom_auftrag) zurück. */
swZurueck: async function (zeileId) {

    const r = await this.swZurueckPruefen(zeileId);
    const sel = r.auswahl;
    const erste = sel[0];
    const schluessel = this.text(erste.ab_schluessel);
    const g = this.swGruppen(sel);

    const k = (g.abz.length ? g.abz[0].kopfObj : null) || erste.kopfObj || {};

    const vorhanden = await this.datenLesen("auftrag", { wo: { ab_schluessel: schluessel, bereich: "bestand" }, aufloesen: false });
    let a = vorhanden.length ? vorhanden[0] : null;

    if (a === null) {   /* AB-Zeile wird neu aufgebaut */
        const live = await this.datenLesen("auftrag", { wo: { bereich: "bestand" }, aufloesen: false, felder: ["reihenfolge"] });
        const milli = live.map(x => this.mengeMilli(x.reihenfolge));
        const belegt = k.reihenfolge === null || k.reihenfolge === undefined || k.reihenfolge === "" ? null : Number(k.reihenfolge);
        const frei = belegt && milli.indexOf(belegt * 1000) < 0;

        a = await this.datenAnlegen("auftrag", {
            ab_anzeige: this.text(erste.ab_nr), ab_schluessel: schluessel,
            forecast_schluessel: this.text(k.forecast_schluessel) || this.abForecastSchluessel(erste.ab_nr),
            haupt_ab: this.text(k.haupt_ab), kunde: this.text(k.kunde), verkaufsartikel: this.text(k.verkaufsartikel),
            ersteller: this.text(k.ersteller), datum_liste: this.text(k.datum_liste), dispoliste: this.text(k.dispoliste),
            lagerort: g.abz.length ? this.text(g.abz[0].lagerort) : "", regal_geteilt: false, bereich: "bestand",
            reihenfolge: frei ? belegt : (milli.length ? Math.max(...milli) / 1000 : 0) + 1,
            quelldatei: this.text(k.quelldatei), archiviert: false, archiviert_am: null, archiv_herkunft: "", archiv_status: ""
        });
    }

    /* höchste Zeilennummer im AB, auch unter den ausgeblendeten, damit keine doppelt vergeben wird */
    const [bgAlt, teilAlt] = await Promise.all([
        this.datenLesenIn("baugruppe", "auftrag", [a._id], { archiv: "alle", felder: ["zeile"] }),
        this.datenLesenIn("teil", "auftrag", [a._id], { archiv: "alle", felder: ["zeile"] })
    ]);
    let zeile = bgAlt.concat(teilAlt).reduce((m, x) => Math.max(m, this.mengeMilli(x.zeile) / 1000), 0);

    const felder = x => {
        const o = {};
        this.swKopierFelder.forEach(f => { o[f] = this.text(x[f]); });
        return o;
    };
    const soll = x => {
        const s = this.swZahl(x.menge_gesamt);
        return { menge_gesamt: s.zahl, menge_gesamt_text: s.text };
    };
    const datum = v => (this.tagNr(v) === null ? null : v);

    /* Reihenfolge wie bisher: Teile ohne BG, dann je BG sie selbst und ihre Teile */
    const teilWerte = (x, bgId) => {
        zeile += 1;
        return Object.assign({
            auftrag: a._id, baugruppe: bgId, zeile: zeile, vorhanden: this.swZahl(x.vorhanden).zahl,
            datum_eingelagert: datum(x.eingelagert), datum_komplett: datum(x.komplett), archiviert: false
        }, soll(x), felder(x));
    };

    const teile = g.ohne.map(x => teilWerte(x, null));
    const bgPlan = g.bgs.map(x => {
        zeile += 1;
        const werte = Object.assign({
            auftrag: a._id, zeile: zeile, name: this.text(x.bg.baugruppe), kurz: this.swBgNummer(x.bg.baugruppe), archiviert: false
        }, soll(x.bg), felder(x.bg));
        return { x: x, werte: werte, teile: x.teile.map(t => teilWerte(t, null)) };   /* Teile folgen ihrer BG */
    });

    /* BGs zuerst (die Teile brauchen ihre Verweise) */
    await this.jeAcht(bgPlan, async p => { p.neu = await this.datenAnlegen("baugruppe", p.werte); });
    bgPlan.forEach(p => p.teile.forEach(t => { t.baugruppe = p.neu._id; }));

    const alleTeile = teile.concat(...bgPlan.map(p => p.teile));
    await this.jeAcht(alleTeile, t => this.datenAnlegen("teil", t));

    /* die Zeilen im Schweißen ausblenden: archiviert und zurückgeholt */
    await this.datenAendernViele(sel.map(x => ({ name: "schweisszeile", zeile: x, werte: { archiviert: true, zurueckgeholt: true } })));

    if (r.zeile.ebene === "BG" && r.mitAb) {   /* SwEinzelnBeschriften: übrige BGs wieder einzeln */
        const ids = {};
        sel.forEach(x => { ids[String(x._id)] = true; });
        const rest = r.alle.filter(x => !ids[String(x._id)]);
        await this.datenAendernViele(rest.map(x => ({
            name: "schweisszeile", zeile: x, werte: { anzeige: this.text(x.ab_nr) + "_BG" + this.swBgNummer(x.baugruppe) }
        })));
    }

    await this.protokollSchreiben("zurueck", a.ab_anzeige, r.zeile.ebene === "AB" ? "" : "BG " + this.text(r.zeile.baugruppe),
        "Schweißen", "Bestandsliste");
    return a;
},

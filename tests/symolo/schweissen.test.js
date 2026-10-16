/* Schweißen (R-W1 bis R-W10), Arbeitsplätze (R-AP1 bis R-AP5), Import-Hilfe (R-I10) und Forecast (R-F12) in Symolo
   (4F, 4K bis 4N) gegen den Nachbau. Die Fälle folgen tests/test_schweissen.py und tests/test_schweissen_kern.py. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

const H = "2026-10-16T00:00:00.0000000Z", T12 = "2026-10-12T00:00:00.0000000Z", T13 = "2026-10-13T00:00:00.0000000Z";

/* Werte aus dem vm-Kontext haben andere Prototypen: als JSON vergleichen. */
const gleich = (a, b, text) => assert.deepEqual(JSON.parse(JSON.stringify(a)), b, text);

async function frisch() {
    const u = umgebung(null, "schweissen");
    u.v.heuteText = () => H;
    u.tabelle = name => u.ctx.symolo._nachbau.daten()[name].zeilen;
    u.ab = async nr => (await u.v.bestandLaden()).find(a => a.o.ab_anzeige === nr);
    u.sw = async nr => (await u.v.swLesen()).filter(z => !nr || u.v.text(z.ab_nr) === nr);
    u.zeile = async (nr, ebene, bgKurz) => (await u.sw(nr)).find(z => z.ebene === ebene &&
        (!bgKurz || u.v.text(z.baugruppe).startsWith(bgKurz)));
    u.bgId = async (nr, kurz) => (await u.ab(nr)).bgs.find(b => b.o.name.startsWith(kurz)).o._id;
    /* nur die Einträge dieses Tests, nicht die der Beispieldaten */
    const start = u.tabelle("fwm.kom_aenderung").length;
    u.protokoll = art => u.tabelle("fwm.kom_aenderung").slice(start).filter(z => z.art === art);

    /* Alle Teile (oder die einer BG, z. B. "100") vollständig vorhanden: Komplett (wie voll() in Python). */
    u.voll = async (nr, kurz) => {
        const a = await u.ab(nr);
        const teile = kurz ? a.bgs.find(b => b.o.name.startsWith(kurz)).teile : u.v.bestandTeile(a);
        const soll = t => (t.o.menge_gesamt === null || t.o.menge_gesamt === undefined || t.o.menge_gesamt === "" ? 1 : t.o.menge_gesamt);
        await u.v.datenAendernViele(teile.map(t => ({
            name: "teil", zeile: t.o, werte: { vorhanden: soll(t), datum_eingelagert: T12, datum_komplett: T13 }
        })));
    };
    u.entnehmenAb = async nr => u.v.swEntnehmen((await u.ab(nr)).o._id);
    u.entnehmenBg = async (nr, kurz) => u.v.swEntnehmen((await u.ab(nr)).o._id, await u.bgId(nr, kurz));

    /* Eine Zeile direkt anlegen (für die Hallenplan-Fälle); leer() räumt vorher die Beispielzeilen weg. */
    u.leer = () => { u.tabelle("fwm.kom_schweisszeile").length = 0; };
    u.sz = (nr, ebene, ab, o) => u.v.datenAnlegen("schweisszeile", Object.assign(u.v.swLeereZeile(), {
        nr: nr, ebene: ebene, ab_nr: ab, ab_schluessel: ab.toUpperCase(), anzeige: ab
    }, o || {}));
    u.eintraege = async () => u.v.hpEintraege(await u.v.swLesen());
    u.namen = async () => (await u.eintraege()).map(e => [e.name, e.platz, e.mitarbeiter]);
    return u;
}

/* ---------- R-W1 / R-W2: Entnehmen ---------- */

test("R_W1 Entnehmen nur bei AB und Baugruppen mit Status Komplett, nie bei Teilen", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    const a = await u.ab("AB2615901");
    assert.equal(a.w.status, "Teilweise");
    assert.equal(u.v.entnehmenMoeglich(a.w), false, "AB nur teilweise");
    assert.equal(u.v.entnehmenMoeglich(a.bgs[0].w), true, "BG 100 komplett");
    assert.equal(u.v.entnehmenMoeglich(a.bgs[2].w), false, "BG 300 offen");
    assert.equal(u.v.entnehmenMoeglich(a.bgs[0].teile[0].w), false, "Teile nie");
    await u.voll("AB2615901");
    assert.equal(u.v.entnehmenMoeglich((await u.ab("AB2615901")).w), true);
});

test("R_W2 AB nicht komplett: Meldung mit Status, nichts wird verschoben", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    const vorher = (await u.sw()).length;
    const a = await u.ab("AB2615901");
    await assert.rejects(u.v.swEntnehmen(a.o._id),
        e => /Nur ABs und Baugruppen mit Status „Komplett“ können entnommen werden\./.test(e.message) && /Teilweise/.test(e.message));
    await assert.rejects(u.v.swEntnehmen(a.o._id, await u.bgId("AB2615901", "300")), /Offen/);
    assert.equal((await u.sw()).length, vorher);
});

test("R_W2 Sicherheitsfrage nennt Baugruppen und Teile; die Frage allein ändert nichts", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    const a = await u.ab("AB2515902");
    const vorher = (await u.sw()).length;
    const p = await u.v.swEntnehmenPruefen(a.o._id);
    assert.equal(u.v.swPlanFrage(p),
        "AB AB2515902 mit " + a.bgs.length + " Baugruppe(n) und " + u.v.bestandTeile(a).length + " Teil(en) ins Blatt Schweißen verschieben?");
    const q = await u.v.swEntnehmenPruefen(a.o._id, a.bgs[0].o._id);
    assert.match(u.v.swPlanFrage(q), /Teil\(en\) ins Blatt Schweißen verschieben\?/);
    assert.equal((await u.sw()).length, vorher);
});

test("R_W2 ganzer AB: alle Zeilen im Schweißen, in der Bestandsliste ausgeblendet (nicht gelöscht)", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    const a = await u.ab("AB2515902");
    const n = 1 + a.bgs.length + u.v.bestandTeile(a).length;
    await u.entnehmenAb("AB2515902");

    const zeilen = await u.sw("AB2515902");
    assert.equal(zeilen.length, n);
    assert.equal(await u.ab("AB2515902"), undefined, "nicht mehr in der Bestandsliste");
    const kopf = u.tabelle("fwm.kom_auftrag").find(z => z.ab_anzeige === "AB2515902");
    assert.equal(kopf.bereich, "schweissen", "der Eintrag bleibt in der Datenbank, nur ausgeblendet");

    const z = zeilen.find(x => x.ebene === "AB");
    assert.equal(z.entnommen, H);
    assert.equal(z.status, "Komplett");
    gleich([z.mitarbeiter, z.arbeitsplatz, z.liefertermin_stahlbau, z.termin_versand], ["", "", null, null]);
    const p = u.protokoll("entnommen");
    assert.equal(p.length, 1);
    assert.equal(p[0].ab, "AB2515902");
});

test("R_W2 die Werte der Teile werden mitgenommen", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    const a = await u.ab("AB2515902");
    const t = a.bgs[0].teile[0];
    await u.v.datenAendern("teil", t.o, { bemerkung: "Bitte entgraten" });
    await u.entnehmenAb("AB2515902");
    const z = (await u.sw("AB2515902")).find(x => x.ebene === "Teil" && x.zeichnungsnummer === t.o.zeichnungsnummer);
    assert.equal(z.bemerkung, "Bitte entgraten");
    assert.ok(z.vorhanden !== "" && z.vorhanden !== null);
    assert.equal(z.eingelagert, T12);
    assert.equal(z.komplett, T13);
});

test("R_W2 Teil-Zeile oder fremde Nummer wird abgelehnt", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    const a = await u.ab("AB2515902");
    await assert.rejects(u.v.swEntnehmenPruefen(a.o._id, -5), /nicht \(mehr\) in der Bestandsliste/);
    await assert.rejects(u.v.swEntnehmenPruefen(-5), /nicht \(mehr\) in der Bestandsliste/);
});

/* ---------- R-W3: einzelne Baugruppe, letzte Baugruppe ---------- */

test("R_W3 eine einzelne BG kommt als Einzelblock; der AB bleibt mit den übrigen BGs", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    await u.entnehmenBg("AB2615901", "100");

    const zeilen = (await u.sw("AB2615901")).filter(z => u.v.text(z.anzeige) === "AB2615901_BG100");
    assert.ok(zeilen.length > 1);
    assert.equal(zeilen[0].ebene, "BG");
    assert.ok(zeilen.every(z => z.ebene !== "AB"));
    assert.equal((await u.sw("AB2615901")).length, zeilen.length, "alle Zeilen heißen AB…_BG100");

    const rest = await u.ab("AB2615901");
    assert.equal(rest.o.bereich, "bestand");
    assert.equal(rest.bgs.length, 2);
    assert.ok(u.protokoll("entnommen").some(p => /^BG 100/.test(p.objekt)));
});

test("R_W3 die letzte BG nimmt die AB-Zeile mit; alles wird unter der AB-Zeile zusammengefasst", async () => {
    const u = await frisch();
    await u.voll("AB2515903");
    for (const kurz of ["400", "200", "100", "300"]) await u.entnehmenBg("AB2515903", kurz);

    const zeilen = await u.sw("AB2515903");
    assert.equal(zeilen[0].ebene, "AB");
    assert.equal(zeilen[0].anzeige, "AB2515903");
    gleich(zeilen.filter(z => z.ebene === "BG").map(z => z.baugruppe.slice(0, 3)), ["100", "200", "300", "400"], "nach Nummer");
    assert.ok(zeilen.every(z => u.v.text(z.anzeige) === "AB2515903"));

    let aktuell = null;
    zeilen.forEach(z => {
        if (z.ebene === "BG") aktuell = z.baugruppe;
        else if (z.ebene === "Teil" && z.baugruppe !== "(ohne BG)") assert.equal(z.baugruppe, aktuell, "Teile stehen hinter ihrer BG");
    });
    assert.equal(await u.ab("AB2515903"), undefined);
});

test("R_W3 Eintrag und Entnommen-Datum bleiben beim Zusammenfassen", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenBg("AB2515902", "100");
    const bg = await u.zeile("AB2515902", "BG");
    await u.v.swSetzen(bg._id, "mitarbeiter", "Tim");
    u.v.heuteText = () => "2026-10-20T00:00:00.0000000Z";
    await u.entnehmenBg("AB2515902", "200");

    const bg100 = await u.zeile("AB2515902", "BG", "100");
    assert.equal(bg100.m, "Tim");
    assert.equal(bg100.entnommen, H, "das alte Datum bleibt");
    assert.equal((await u.zeile("AB2515902", "AB")).m, u.v.swVerschieden);
});

test("R_W4 entnommene Zeilen fehlen in der Bestandsliste und im Regal", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    const vorher = await u.v.bestandLaden();
    await u.entnehmenAb("AB2515902");
    const nachher = await u.v.bestandLaden();
    assert.equal(nachher.length, vorher.length - 1);
    const r = u.v.regalEintraege(nachher);
    const namen = r.nicht.concat(r.einsortiert).map(e => e.name);
    assert.ok(!namen.some(n => n.indexOf("AB2515902") === 0));
});

test("R_I10 der Import erkennt einen AB im Schweißen (swHatAb, auch in anderer Schreibweise)", async () => {
    const u = await frisch();
    assert.equal(await u.v.swHatAb("AB2515204"), true, "BG 100 liegt einzeln im Schweißen");
    assert.equal(await u.v.swHatAb("2515204"), true);
    assert.equal(await u.v.swHatAb("AB2515902"), false);
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    assert.equal(await u.v.swHatAb("AB2515902"), true);
    assert.equal(await u.v.swHatAb(""), false);
});

/* ---------- R-W5 bis R-W7: Spalten, Eintragen ---------- */

test("R_W5 Spalten in der Reihenfolge des Blatts Schweißen", () => {
    const { v } = umgebung(null, "schweissen");
    const titel = v.swSpalten.map(s => s[1]).filter(Boolean);
    gleich(titel.slice(4, 11), ["Mitarbeiter", "Arbeitsplatz", "Eingelagert", "Entnommen", "Liefertermin Stahlbau", "Termin Versand", "DLZ"]);
});

test("R_W5 DLZ ist Termin Versand minus Eingelagert in Tagen (leer, solange eins fehlt)", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const ab = await u.zeile("AB2515902", "AB");
    assert.equal(u.v.swDlz(ab), "");
    await u.v.swSetzen(ab._id, "termin_versand", "26.10.2026");

    const t = (await u.sw("AB2515902")).find(z => z.ebene === "Teil");
    assert.equal(t.tv, "2026-10-26T00:00:00.0000000Z");
    assert.equal(u.v.swDlz(t), 14, "eingelagert 12.10.");
});

test("R_W6 ein Eintrag am AB geht an alle darunter", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    await u.v.swSetzen((await u.zeile("AB2515902", "AB"))._id, "mitarbeiter", "Paskal");
    gleich([...new Set((await u.sw("AB2515902")).map(z => z.mitarbeiter))], ["Paskal"]);
    assert.equal(u.protokoll("schweissen").length, 1);
});

test("R_W6 ein Eintrag an der BG geht an ihre Teile; der AB zeigt (verschieden)", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    await u.v.swSetzen((await u.zeile("AB2515902", "BG", "100"))._id, "mitarbeiter", "Tim");
    await u.v.swSetzen((await u.zeile("AB2515902", "AB"))._id, "mitarbeiter", "Paskal");
    await u.v.swSetzen((await u.zeile("AB2515902", "BG", "100"))._id, "mitarbeiter", "Tim");

    const zeilen = await u.sw("AB2515902");
    assert.equal(zeilen.find(z => z.ebene === "AB").m, u.v.swVerschieden);
    const bg100 = zeilen.find(z => z.ebene === "BG" && z.baugruppe.startsWith("100"));
    gleich([...new Set(zeilen.filter(z => z.ebene === "Teil" && z.baugruppe === bg100.baugruppe).map(z => z.m))], ["Tim"]);
    gleich([...new Set(zeilen.filter(z => z.ebene === "Teil" && z.baugruppe !== bg100.baugruppe).map(z => z.m))], ["Paskal"]);
});

test("R_W6 ein Eintrag am Teil wird abgelehnt", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const t = await u.zeile("AB2515902", "Teil");
    await assert.rejects(u.v.swSetzen(t._id, "mitarbeiter", "Hans"), /Einzelteile übernehmen den Eintrag ihrer Baugruppe/);
    assert.equal((await u.zeile("AB2515902", "Teil")).m, "");
});

test("R_W6 ein Einzelblock vererbt nur innerhalb seines Blocks", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    await u.entnehmenBg("AB2615901", "100");
    await u.v.swSetzen((await u.zeile("AB2615901", "BG"))._id, "arbeitsplatz", "Trumpf");
    gleich([...new Set((await u.sw("AB2615901")).map(z => z.arbeitsplatz))], ["Trumpf"]);
    assert.equal((await u.ab("AB2615901")).o.bereich, "bestand");
});

test("R_W6 der Arbeitsplatz kommt nur aus der Platzliste (auch AP 02 = AP02)", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const id = (await u.zeile("AB2515902", "AB"))._id;
    await assert.rejects(u.v.swSetzen(id, "arbeitsplatz", "Mond"), /kein Arbeitsplatz/);
    await u.v.swSetzen(id, "arbeitsplatz", "ap 02");
    assert.equal((await u.zeile("AB2515902", "AB")).arbeitsplatz, "AP02");
    await u.v.swSetzen(id, "arbeitsplatz", "");
    assert.equal((await u.zeile("AB2515902", "AB")).arbeitsplatz, "");
});

test("R_W6 Mitarbeiter: mehrere Namen ohne Doppelte, leer entfernt, zu lang abgelehnt", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const id = (await u.zeile("AB2515902", "AB"))._id;
    await u.v.swSetzen(id, "mitarbeiter", "Bernd,  Anna , bernd");
    gleich([...new Set((await u.sw("AB2515902")).map(z => z.mitarbeiter))], ["Bernd, Anna"]);
    await u.v.swSetzen(id, "mitarbeiter", "");
    gleich([...new Set((await u.sw("AB2515902")).map(z => z.mitarbeiter))], [""]);
    await assert.rejects(u.v.swSetzen(id, "mitarbeiter", "(verschieden)"), /kann man nicht eintragen/);
    const lang = Array.from({ length: 30 }, (_, i) => "Mitarbeiter-Nummer-" + String(i).padStart(2, "0")).join(", ");
    await assert.rejects(u.v.swSetzen(id, "mitarbeiter", lang), /zu viele Namen/);
});

test("R_W6 Pruefdaten Schritt für Schritt (AbgleichKern)", () => {
    const { v } = umgebung(null, "schweissen");
    const EBENE = ["AB", "BG", "Teil", "Teil", "BG", "Teil", "BG", "Teil"];
    const AB = ["AB1", "AB1", "AB1", "AB1", "AB1", "AB1", "AB9", "AB9"];
    const [M, P, L] = [0, 1, 2];
    const V = v.swVerschieden;
    const w = EBENE.map(() => ["", "", null, null]);
    const spalte = k => w.map(x => (x[k] === "" || x[k] === null ? "-" : x[k]));
    const rechne = geaendert => v.swAbgleichKern(EBENE, AB, w, geaendert);

    w[0][M] = "Paskal";
    rechne(new Set(["0|" + M]));
    gleich(spalte(M), ["Paskal", "Paskal", "Paskal", "Paskal", "Paskal", "Paskal", "-", "-"], "1 Mitarbeiter am AB1");

    w[1][P] = "AP02"; w[4][P] = "AP01";
    rechne();
    gleich(spalte(P), [V, "AP02", "AP02", "AP02", "AP01", "AP01", "-", "-"], "2 BG100 = AP02, BG200 = AP01");

    w[4][P] = "AP02";
    rechne();
    gleich(spalte(P), ["AP02", "AP02", "AP02", "AP02", "AP02", "AP02", "-", "-"], "3 AB bekommt den gemeinsamen Wert");

    w[0][P] = "Trumpf";
    rechne(new Set(["0|" + P]));
    gleich(spalte(P), ["Trumpf", "Trumpf", "Trumpf", "Trumpf", "Trumpf", "Trumpf", "-", "-"], "4 AB = Trumpf");

    w[2][P] = "AP05";
    rechne();
    gleich(spalte(P), ["Trumpf", "Trumpf", "Trumpf", "Trumpf", "Trumpf", "Trumpf", "-", "-"], "5 Teil direkt wird verworfen");

    w[1][M] = "Tim";
    rechne();
    gleich(spalte(M), [V, "Tim", "Tim", "Tim", "Paskal", "Paskal", "-", "-"], "6 Mitarbeiter BG100 = Tim");

    w[6][L] = "2026-11-02";
    rechne();
    gleich(spalte(L), ["-", "-", "-", "-", "-", "-", "2026-11-02", "2026-11-02"], "7 Liefertermin am Einzelblock");
});

test("R_W6 ein AB-Eintrag überschreibt alle BGs und Teile; (verschieden) wird nicht vererbt", () => {
    const { v } = umgebung(null, "schweissen");
    const EBENE = ["AB", "BG", "Teil", "Teil", "BG", "Teil", "BG", "Teil"];
    const AB = ["AB1", "AB1", "AB1", "AB1", "AB1", "AB1", "AB9", "AB9"];
    const neu = () => EBENE.map(() => ["", "", null, null]);

    let w = neu();
    w[1][0] = "Tim"; w[4][0] = "Paskal";
    v.swAbgleichKern(EBENE, AB, w);
    assert.equal(w[0][0], v.swVerschieden);
    w[0][0] = "Anna";
    v.swAbgleichKern(EBENE, AB, w, new Set(["0|0"]));
    gleich(w.map(x => x[0]), ["Anna", "Anna", "Anna", "Anna", "Anna", "Anna", "", ""], "Einzelblock AB9 bleibt unberührt");

    w = neu();
    w[1][0] = "Tim"; w[4][0] = "Paskal";
    v.swAbgleichKern(EBENE, AB, w);
    v.swAbgleichKern(EBENE, AB, w, new Set(["0|0"]));   /* AB zeigt (verschieden), nichts eingegeben */
    gleich(w.slice(1, 6).map(x => x[0]), ["Tim", "Tim", "Tim", "Paskal", "Paskal"]);
});

test("R_W7 Datum: Kurzformen", () => {
    const { v } = umgebung(null, "schweissen");
    const heute = v.tagNr("2026-03-01T00:00:00.0000000Z");
    const soll = v.tagNr("2026-10-15T00:00:00.0000000Z");
    for (const t of ["15.10.2026", "15.10.26", "15.10", "151026", "15102026", "1510", "15/10/26", "15-10-2026", " 15.10.2026 "]) {
        assert.equal(v.swDatumAusText(t, heute), soll, t);
    }
});

test("R_W7 Datum: ungültig", () => {
    const { v } = umgebung(null, "schweissen");
    const heute = v.tagNr("2026-03-01T00:00:00.0000000Z");
    for (const t of ["31.02.2026", "32.10", "15.13", "abc", "1.1.2019", "", "15", "15.10.2100", "1.2.3.4", "15.10.20269"]) {
        assert.equal(v.swDatumAusText(t, heute), null, t);
    }
});

test("R_W7 fehlt das Jahr, gilt das aktuelle", () => {
    const { v } = umgebung(null, "schweissen");
    assert.equal(v.swDatumAusText("15.10", v.tagNr("2027-01-01T00:00:00.0000000Z")), v.tagNr("2027-10-15T00:00:00.0000000Z"));
});

test("R_W7 Datum eintragen: Kurzform wird gespeichert, ungültig lässt den Wert stehen", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const id = (await u.zeile("AB2515902", "AB"))._id;
    await u.v.swSetzen(id, "liefertermin_stahlbau", "151026");
    assert.equal((await u.zeile("AB2515902", "AB")).lt, "2026-10-15T00:00:00.0000000Z");
    await assert.rejects(u.v.swSetzen(id, "liefertermin_stahlbau", "31.02.2026"), /kein gültiges Datum/);
    await assert.rejects(u.v.swSetzen(id, "liefertermin_stahlbau", "1.1.2019"), /kein gültiges Datum/);
    assert.equal((await u.zeile("AB2515902", "AB")).lt, "2026-10-15T00:00:00.0000000Z");
    await u.v.swSetzen(id, "liefertermin_stahlbau", "");
    assert.equal((await u.zeile("AB2515902", "AB")).lt, null);
});

/* ---------- Mitarbeiter verwalten ---------- */

test("Mitarbeiter verwalten: eintragen und austragen, nichts wird gelöscht", async () => {
    const u = await frisch();
    const vorher = await u.v.swMitarbeiterNamen();
    gleich(vorher, ["Demo Anna", "Demo Bernd", "Demo Chris", "Demo Dana"]);

    assert.equal(await u.v.swMitarbeiterNeu("  Paskal  "), "Paskal");
    assert.equal(await u.v.swMitarbeiterNeu("Anna, B."), "Anna B.", "Komma wird zu Leerzeichen");
    gleich(await u.v.swMitarbeiterNamen(), ["Anna B.", "Demo Anna", "Demo Bernd", "Demo Chris", "Demo Dana", "Paskal"]);

    await assert.rejects(u.v.swMitarbeiterNeu("paskal"), /steht schon in der Liste/);
    await assert.rejects(u.v.swMitarbeiterNeu(" "), /Bitte einen Namen/);
    await assert.rejects(u.v.swMitarbeiterNeu("x".repeat(81)), /zu lang/);

    const anzahl = u.tabelle("fwm.kom_mitarbeiter").length;
    assert.equal(await u.v.swMitarbeiterWeg("Paskal"), "Paskal");
    assert.ok(!(await u.v.swMitarbeiterNamen()).includes("Paskal"));
    assert.equal(u.tabelle("fwm.kom_mitarbeiter").length, anzahl, "bleibt in der Datenbank (aktiv = nein)");
    await assert.rejects(u.v.swMitarbeiterWeg("Paskal"), /nicht \(mehr\) in der Liste/);

    assert.equal(await u.v.swMitarbeiterNeu("Paskal"), "Paskal", "ein ausgetragener Name kommt wieder");
    assert.equal(u.tabelle("fwm.kom_mitarbeiter").length, anzahl, "kein zweiter Eintrag");
    assert.equal(u.protokoll("schweissen").filter(p => p.objekt === "Mitarbeiterliste").length, 4);
});

/* ---------- R-W8: Archivieren ---------- */

test("R_W8 ein ganzer AB wird archiviert: Sicherheitsfrage mit Zeilenzahl, alle Zeilen ins Archiv, im Schweißen weg", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const n = (await u.sw("AB2515902")).length;
    const kopfId = (await u.zeile("AB2515902", "AB"))._id;

    const r = await u.v.swArchivierenPruefen(kopfId);
    assert.equal(r.n, n);
    assert.equal((await u.sw("AB2515902")).length, n, "die Frage allein ändert nichts");

    const e = await u.v.swArchivieren(kopfId);
    assert.equal(e.n, n);
    assert.equal((await u.sw("AB2515902")).length, 0);

    const kopf = (await u.v.archivLaden()).find(k => k.ab_anzeige === "AB2515902");
    assert.equal(kopf.archiv_herkunft, "Archiviert aus Schweißen");
    assert.equal((await u.v.archivZeilenLaden(kopf)).length, n);
    assert.equal(u.protokoll("archiviert").length, 1);
});

test("R_W8 Einzelblock und Zeilen, die kein AB sind, werden abgelehnt", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    await u.entnehmenBg("AB2615901", "100");
    const vorher = (await u.v.archivLaden()).length;
    await assert.rejects(u.v.swArchivieren((await u.zeile("AB2615901", "BG"))._id),
        /erst archiviert werden, wenn der ganze AB im Blatt Schweißen liegt/);
    await assert.rejects(u.v.swArchivieren((await u.zeile("AB2615901", "Teil"))._id), /Archiviert werden nur ganze ABs/);
    assert.equal((await u.v.archivLaden()).length, vorher);
});

test("R_W8 aus dem Archiv zurück ins Schweißen: alle Angaben kommen mit, auch nach zweimal Archivieren", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const n = (await u.sw("AB2515902")).length;
    await u.v.swSetzen((await u.zeile("AB2515902", "AB"))._id, "mitarbeiter", "Paskal");
    await u.v.swSetzen((await u.zeile("AB2515902", "AB"))._id, "termin_versand", "26.10.2026");

    for (let runde = 0; runde < 2; runde++) {
        await u.v.swArchivieren((await u.zeile("AB2515902", "AB"))._id);
        const kopf = (await u.v.archivLaden()).find(k => k.ab_anzeige === "AB2515902");
        assert.equal(await u.v.archivWiederherstellen(kopf), "schweissen");
        assert.ok(!(await u.v.archivLaden()).some(k => k.ab_anzeige === "AB2515902"), "nicht mehr im Archiv");
    }

    const zeilen = await u.sw("AB2515902");
    assert.equal(zeilen.length, n);
    gleich([...new Set(zeilen.map(z => z.mitarbeiter))], ["Paskal"]);
    assert.equal(zeilen.find(z => z.ebene === "AB").tv, "2026-10-26T00:00:00.0000000Z");
    assert.equal(u.protokoll("wiederhergestellt").length, 2);
});

test("R_W8 liegt der AB schon wieder im Schweißen, geht Wiederherstellen nicht", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    await u.v.swArchivieren((await u.zeile("AB2515902", "AB"))._id);
    const kopf = (await u.v.archivLaden()).find(k => k.ab_anzeige === "AB2515902");
    await u.v.swAusArchiv(kopf);
    await assert.rejects(u.v.swAusArchiv(kopf), /liegt schon wieder im Schweißen/);
});

/* ---------- R-W9: Zurück in die Bestandsliste ---------- */

test("R_W9 ein ganzer AB geht zurück: Mengen kommen mit, Mitarbeiter und Termine gehen verloren", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    const id = (await u.zeile("AB2515902", "AB"))._id;
    await u.v.swSetzen(id, "mitarbeiter", "Paskal");

    const r = await u.v.swZurueckPruefen(id);
    assert.match(u.v.swRueckFrage(r), /AB AB2515902 mit allen Baugruppen zurück in die Bestandsliste schieben\?/);
    assert.match(u.v.swRueckVerlust, /Mitarbeiter, Arbeitsplatz, Termine und das Entnahmedatum gehen verloren/);

    await u.v.swZurueck(id);
    assert.equal((await u.sw("AB2515902")).length, 0);
    const a = await u.ab("AB2515902");
    assert.equal(a.w.status, "Komplett", "die Mengen kamen mit");
    assert.equal(a.bgs.length, 2);
    assert.equal(u.protokoll("zurueck").length, 1);

    /* zurückgeholte Zeilen zählen nirgends als archiviert */
    assert.ok(!(await u.v.archivLaden()).some(k => k.ab_anzeige === "AB2515902"));
    const stat = await u.v.statLaden();
    assert.ok(!stat.some(e => e.ab_nr === "AB2515902"));
});

test("R_W9 ein Einzelblock geht in den vorhandenen AB zurück", async () => {
    const u = await frisch();
    await u.voll("AB2615901", "100");
    await u.entnehmenBg("AB2615901", "100");
    assert.equal((await u.ab("AB2615901")).bgs.length, 2);

    await u.v.swZurueck((await u.zeile("AB2615901", "BG"))._id);
    assert.equal((await u.sw("AB2615901")).length, 0);
    const a = await u.ab("AB2615901");
    assert.equal(a.bgs.length, 3);
    const bg = a.bgs.find(b => b.o.name.startsWith("100"));
    const t = bg.teile[0].o;
    assert.equal(t.vorhanden, u.v.swZahl(t.menge_gesamt === null ? 1 : t.menge_gesamt).zahl === null ? t.vorhanden : t.menge_gesamt);
    assert.equal(t.datum_eingelagert, T12);
});

test("R_W9 eine BG eines zusammengefassten AB nimmt die AB-Zeile mit; die übrigen stehen wieder einzeln", async () => {
    const u = await frisch();
    await u.voll("AB2515903");
    await u.entnehmenAb("AB2515903");
    const bg = await u.zeile("AB2515903", "BG", "200");
    const r = await u.v.swZurueckPruefen(bg._id);
    assert.match(u.v.swRueckFrage(r), /Die AB-Zeile geht mit zurück/);

    await u.v.swZurueck(bg._id);
    const uebrig = await u.sw("AB2515903");
    gleich([...new Set(uebrig.map(z => z.anzeige))].sort(), ["AB2515903_BG100", "AB2515903_BG300", "AB2515903_BG400"]);
    assert.ok(uebrig.every(z => z.ebene !== "AB"));
    assert.equal((await u.ab("AB2515903")).bgs.length, 1);
});

test("R_W9 ein Einzelteil geht nicht zurück", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");
    await assert.rejects(u.v.swZurueck((await u.zeile("AB2515902", "Teil"))._id), /nicht ein Einzelteil/);
    assert.equal((await u.sw("AB2515902")).length > 0, true);
});

/* ---------- R-W10: Ansicht ---------- */

test("R_W10 Suche über Mitarbeiter, Arbeitsplatz, AB und Zeichnungsnummer", async () => {
    const u = await frisch();
    const bloecke = u.v.swBloecke(await u.v.swLesen());
    assert.ok(u.v.swSuchen(bloecke, "demo anna") > 0, "Mitarbeiter, Teilwort, ohne Groß-/Kleinschreibung");
    assert.ok(u.v.swSuchen(bloecke, "AP03") > 0, "Arbeitsplatz");
    assert.ok(u.v.swSuchen(bloecke, "2616624") > 0, "AB ohne Präfix");
    assert.equal(u.v.swSuchen(bloecke, "gibtesnicht"), 0);
    assert.ok(bloecke.every(b => !b.zeigen), "Kein Treffer: nichts gezeigt");

    /* Treffer in einem Teil zeigt Teil, BG und AB-Kopf */
    const teil = (await u.v.swLesen()).find(z => z.ebene === "Teil" && z.ab_nr === "AB2615903");
    u.v.swSuchen(bloecke, teil.zeichnungsnummer);
    const b = bloecke.find(x => x.ab && x.ab.ab_nr === "AB2615903");
    assert.ok(b.zeigen && b.ab.zeigen);
    assert.ok(b.bgs.some(g => g.teile.some(t => t.zeigen) && g.bg.zeigen));
});

test("R_W10 Anzeige ABs/BGs/Alles zeigt alle Zeilen; der Zähler zählt Einzelblöcke mit", async () => {
    const u = await frisch();
    const bloecke = u.v.swBloecke(await u.v.swLesen());
    u.v.swSuchen(bloecke, "gibtesnicht");
    u.v.swAllesZeigen(bloecke);
    assert.ok(bloecke.every(b => b.zeigen && u.v.swBlockZeilen(b).every(z => z.zeigen)));
    assert.equal(u.v.swAnzeigen.map(a => a[0]).join(), "ab,bg,alles");

    const z = u.v.swZaehler(bloecke);
    assert.equal(z.einzeln, bloecke.filter(b => b.ab === null).length);
    /* AB2616904 hat zwei Einzelblöcke: zählt als ein Eintrag */
    const einzelAbs = new Set(bloecke.filter(b => b.ab === null).map(b => u.v.swKopf(b).ab_schluessel));
    assert.equal(z.ab, bloecke.filter(b => b.ab !== null).length + einzelAbs.size);
});

test("R_W10 Einzelblöcke desselben AB stehen unter einer Überschrift, die übrigen BGs als rote Kacheln", async () => {
    const u = await frisch();
    const bloecke = u.v.swBloecke(await u.v.swLesen());
    const liste = u.v.swSammeln(bloecke);
    const s = liste.find(x => x.sammlung && x.schluessel === "AB2616904");
    assert.equal(s.bloecke.length, 2);
    assert.equal(u.v.swSammlungKopf(s).anzeige, "AB2616904");

    await u.v.swSammlungenErgaenzen([s]);
    assert.equal(s.komBgs.length, 1);
    assert.match(s.komBgs[0], /^300 /, "BG 300 steht noch in der Bestandsliste");

    const im = u.v.swImSchweissen(await u.v.swLesen());
    assert.equal(im["AB2616904"].length, 2, "in der Bestandsliste: rote Zeilen für die BGs im Schweißen");
    assert.ok(!im["AB2615903"], "ganze ABs gehören nicht dazu");
});

test("R_W10 Filter nach Mitarbeiter und Arbeitsplatz, Sortierung nach Liefertermin und AB", async () => {
    const u = await frisch();
    const bloecke = u.v.swBloecke(await u.v.swLesen());
    const nummern = l => l.map(b => u.v.swKopf(b).ab_nr);

    assert.ok(nummern(u.v.swBlockFiltern(bloecke, "Demo Bernd", "")).includes("AB2615904"));
    assert.ok(!nummern(u.v.swBlockFiltern(bloecke, "Demo Bernd", "")).includes("AB2616624"));
    gleich(nummern(u.v.swBlockFiltern(bloecke, "", "ap03")), ["AB2616904"]);
    assert.equal(u.v.swBlockFiltern(bloecke, "Demo Bernd", "AP03").length, 0);

    const ab = nummern(u.v.swBlockSortieren(bloecke, "ab_auf"));
    assert.deepEqual(ab.slice().sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1), ab);
    const ab2 = nummern(u.v.swBlockSortieren(bloecke, "ab_ab"));
    assert.deepEqual(ab2, ab.slice().reverse());

    /* Liefertermin: Blöcke ohne Termin stehen immer hinten */
    await u.v.swSetzen((await u.zeile("AB2616624", "AB"))._id, "liefertermin_stahlbau", "05.01.2021");
    await u.v.swSetzen((await u.zeile("AB2615904", "AB"))._id, "liefertermin_stahlbau", "01.01.2021");
    const neu = u.v.swBloecke(await u.v.swLesen());
    const auf = nummern(u.v.swBlockSortieren(neu, "lt_auf")), ab3 = nummern(u.v.swBlockSortieren(neu, "lt_ab"));
    assert.equal(auf[0], "AB2615904");
    assert.equal(auf[1], "AB2616624");
    assert.ok(ab3.indexOf("AB2616624") < ab3.indexOf("AB2615904"));
    const mitTermin = neu.filter(b => u.v.tagNr(u.v.swKopf(b).lt) !== null).length;
    const hinten = u.v.swBlockSortieren(neu, "lt_ab").slice(mitTermin);
    assert.ok(hinten.every(b => u.v.tagNr(u.v.swKopf(b).lt) === null));
});

/* ---------- R-F12 / W11: Forecast ---------- */

test("R_F12 ein entnommener AB bleibt im Forecast mit Status Schweißen; nach dem Archivieren ist er weg", async () => {
    const u = await frisch();
    await u.voll("AB2515902");
    await u.entnehmenAb("AB2515902");

    const mit = async () => {
        const sw = u.v.swForecastAbs(u.v.swBloecke(await u.v.swLesen()));
        return u.v.fcMitSchweissen(await u.v.bestandLaden(), sw);
    };
    const x = (await mit()).find(a => a.o.ab_anzeige === "AB2515902");
    assert.ok(x && x.schweissen === true);

    await u.v.swArchivieren((await u.zeile("AB2515902", "AB"))._id);
    assert.ok(!(await mit()).some(a => a.o.ab_anzeige === "AB2515902"));
});

/* ---------- R-AP1 bis R-AP5: Arbeitsplätze ---------- */

test("R_AP1 Platzliste in der Reihenfolge der Tafel", async () => {
    const u = await frisch();
    gleich((await u.v.swPlaetzeLaden()).map(p => p.name), [
        "Trumpf", "AP05", "AP04", "AP03", "AP02", "AP01", "Schweißplatz", "Laser/WIG-Kabine", "Laser-Kabine", "AP06",
        "IPG Laser-Kabine", "Q.S.", "Schleifen / Finish", "Dojo Training Raum", "SFM"
    ]);
});

test("R_AP2 Farben und Lage der Plätze", async () => {
    const u = await frisch();
    const f = {};
    (await u.v.swPlaetzeLaden()).forEach(p => { f[p.name] = p; });
    const farben = { "Trumpf": "grau", "AP05": "blau", "AP04": "gruen", "AP02": "gelb", "AP01": "gelb", "Schweißplatz": "rosa",
        "Laser-Kabine": "lila", "AP06": "lila", "IPG Laser-Kabine": "orange", "Schleifen / Finish": "gruen" };
    Object.keys(farben).forEach(n => assert.equal(f[n].farbe, farben[n], n));
    assert.ok(f["Q.S."].breite < f["AP06"].breite + 1);
});

test("R_AP3 ein AB mit allen BGs am selben Platz ist ein Eintrag", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A", arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    await u.sz(3, "BG", "AB1", { baugruppe: "200 B", arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    gleich(await u.namen(), [["AB1", "AP02", "Paskal"]]);
});

test("R_AP3 BGs an verschiedenen Plätzen sind einzelne Einträge mit dem Mitarbeiter der BG", async () => {
    const u = await frisch();
    u.leer();
    const ab = await u.sz(1, "AB", "AB1");
    const bg1 = await u.sz(2, "BG", "AB1", { baugruppe: "100 A" });
    const bg2 = await u.sz(3, "BG", "AB1", { baugruppe: "200 B" });
    await u.v.swSetzen(ab._id, "mitarbeiter", "Paskal");
    await u.v.swSetzen(bg1._id, "arbeitsplatz", "AP02");
    await u.v.swSetzen(bg2._id, "arbeitsplatz", "AP01");
    gleich(await u.namen(), [["AB1_BG100", "AP02", "Paskal"], ["AB1_BG200", "AP01", "Paskal"]]);
    await u.v.swSetzen(bg1._id, "mitarbeiter", "Tim");
    gleich(await u.namen(), [["AB1_BG100", "AP02", "Tim"], ["AB1_BG200", "AP01", "Paskal"]]);
});

test("R_AP3 eine BG ohne Platz zählt als Platz des AB", async () => {
    const u = await frisch();
    u.leer();
    const ab = await u.sz(1, "AB", "AB1");
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A" });
    await u.v.swSetzen(ab._id, "arbeitsplatz", "Trumpf");
    gleich(await u.namen(), [["AB1", "Trumpf", ""]]);
});

test("R_AP3 ein AB ohne Baugruppen und ein Einzelblock", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP03" });
    await u.sz(2, "BG", "AB9", { anzeige: "AB9_BG300", baugruppe: "300 C", arbeitsplatz: "SFM" });
    gleich(await u.namen(), [["AB1", "AP03", ""], ["AB9_BG300", "SFM", ""]]);
});

test("R_AP3 (verschieden) wird nicht angezeigt", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02" });
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A", arbeitsplatz: "AP02", mitarbeiter: "Tim" });
    await u.sz(3, "BG", "AB1", { baugruppe: "200 B", arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    gleich(await u.namen(), [["AB1", "AP02", ""]]);
});

test("R_AP4 die Listen unter dem Plan: nicht einsortiert, Sonstiges, einsortiert", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02" });
    await u.sz(2, "AB", "AB2");
    await u.sz(3, "AB", "AB3", { arbeitsplatz: "Altlast" });
    const h = u.v.hpHallenplan(await u.v.swLesen(), await u.v.swPlaetzeLaden());
    gleich(h.nicht.map(e => e.name), ["AB2"]);
    gleich(h.ungueltig.map(e => [e.name, e.platz]), [["AB3", "Altlast"]]);
    gleich(h.einsortiert.map(([e, p]) => [e.name, p.name]), [["AB1", "AP02"]]);
    gleich(h.plaetze.find(x => x.p.name === "AP02").eintraege.map(e => e.name), ["AB1"]);
    assert.equal(h.anzahl, 3);
});

test("R_AP5 Platz setzen: der AB und alles darunter bekommt ihn, mit Protokoll; falsche Eingaben abgelehnt", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1");
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A" });
    await u.sz(3, "Teil", "AB1", { baugruppe: "100 A" });
    assert.equal(await u.v.hpPlatzSetzen("AB1", "AP04"), "AB1: Arbeitsplatz AP04.");
    gleich([...new Set((await u.sw()).map(z => z.arbeitsplatz))], ["AP04"]);
    assert.equal(u.protokoll("schweissen").length, 1);
    await assert.rejects(u.v.hpPlatzSetzen("AB1_BG100", "Mond"), /kein Arbeitsplatz/);
    await assert.rejects(u.v.hpPlatzSetzen("AB77", "AP04"), /nicht gefunden/);
    assert.equal(await u.v.hpPlatzSetzen("AB1", ""), "AB1: kein Arbeitsplatz mehr.");
});

test("R_AP5 eine einzelne BG setzen", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02" });
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A", arbeitsplatz: "AP02" });
    await u.sz(3, "BG", "AB1", { baugruppe: "200 B", arbeitsplatz: "AP02" });
    await u.v.hpPlatzSetzen("AB1_BG200", "SFM");
    gleich(await u.namen(), [["AB1_BG100", "AP02", ""], ["AB1_BG200", "SFM", ""]]);
});

test("R_AP5 Mitarbeiter am Eintrag ändern (Rechtsklick)", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02" });
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A", arbeitsplatz: "AP02" });
    assert.equal(await u.v.hpMitarbeiterSetzen("AB1", "Anna, Bernd"), "AB1: Mitarbeiter Anna, Bernd.");
    gleich(await u.namen(), [["AB1", "AP02", "Anna, Bernd"]]);
});

test("R_AP5 aufsplitten: je BG ein Eintrag, alle am bisherigen Platz", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "AB", "AB1", { arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A", arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    await u.sz(3, "BG", "AB1", { baugruppe: "200 B", arbeitsplatz: "AP02", mitarbeiter: "Paskal" });
    gleich(await u.namen(), [["AB1", "AP02", "Paskal"]]);
    await u.v.hpTeilen("AB1");
    gleich(await u.namen(), [["AB1_BG100", "AP02", "Paskal"], ["AB1_BG200", "AP02", "Paskal"]]);
    const e = (await u.eintraege())[0];
    gleich([e.ganz, e.komplett, e.bgs], [false, true, 2]);
});

test("R_AP5 zusammenführen an der Stelle der BG", async () => {
    const u = await frisch();
    u.leer();
    const ab = await u.sz(1, "AB", "AB1");
    await u.sz(2, "BG", "AB1", { baugruppe: "100 A" });
    await u.sz(3, "BG", "AB1", { baugruppe: "200 B" });
    await u.v.hpTeilen("AB1");
    await u.v.hpPlatzSetzen("AB1_BG100", "AP02");
    await u.v.hpPlatzSetzen("AB1_BG200", "SFM");
    assert.match(await u.v.hpZusammenfuehren("AB1_BG200"), /AB1 ist zusammengeführt \(SFM\)/);
    gleich(await u.namen(), [["AB1", "SFM", ""]]);
    assert.equal((await u.sw()).find(z => String(z._id) === String(ab._id)).ap_geteilt, false);
});

test("R_AP5 aufsplitten und zusammenführen gehen nicht beim Einzelblock oder ohne zwei Baugruppen", async () => {
    const u = await frisch();
    u.leer();
    await u.sz(1, "BG", "AB1", { anzeige: "AB1_BG100", baugruppe: "100 A", arbeitsplatz: "AP02" });
    await assert.rejects(u.v.hpZusammenfuehren("AB1_BG100"), /alle Baugruppen/);
    await assert.rejects(u.v.hpTeilen("AB1_BG100"), /alle Baugruppen/);
    const e = (await u.eintraege())[0];
    gleich([e.ganz, e.komplett], [false, false]);

    u.leer();
    await u.sz(1, "AB", "AB2");
    await assert.rejects(u.v.hpTeilen("AB2"), /keine Baugruppen/);
    u.leer();
    await u.sz(1, "AB", "AB3", { arbeitsplatz: "AP02" });
    await u.sz(2, "BG", "AB3", { baugruppe: "100 A", arbeitsplatz: "AP02" });
    assert.equal((await u.eintraege())[0].bgs, 1, "die Ansicht zeigt \"AB aufsplitten\" erst ab zwei Baugruppen");
    await assert.rejects(u.v.hpTeilen("AB3"), /keine Baugruppen/);
    gleich(await u.namen(), [["AB3", "AP02", ""]]);
});

test("Schweißen und Arbeitsplätze: Ansichten ändern nur über die Datenschicht, kein Löschen, keine festen Farben", () => {
    const fs = require("node:fs"), path = require("node:path");
    const dir = path.join(__dirname, "..", "..", "symolo");
    for (const f of ["quelle/4K_sw_eingaben.js", "quelle/4L_sw_vorgaenge.js", "quelle/4M_hallenplan.js", "quelle/4N_sw_liste.js",
        "ansichten/schweissen/ansicht.js", "ansichten/arbeitsplaetze/ansicht.js"]) {
        const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
        assert.ok(!/Delete|Execute|fetch\(|innerHTML|document\.(createElement|querySelector)/.test(t), f);
        assert.ok(!/\bdatenLoeschen\b/.test(t), f);
    }
    const css = fs.readFileSync(path.join(dir, "ansichten/schweissen/ansicht.css"), "utf8");
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), "Schweißen: Farben nur über Variablen");
});

/* Archiv in Symolo (4C_ab_nummer.js, 4D_archiv.js): AB-Nummern (R-AB1 bis R-AB5), AB archivieren (R-X1),
   die 28 Spalten (R-X2), Suchen und Wiederherstellen (R-X3). Gegen den Nachbau, ohne Symolo. */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { umgebung } = require("./umgebung");

const json = x => JSON.parse(JSON.stringify(x));
const gleich = (a, b, text) => assert.deepEqual(json(a), json(b), text);

async function geladen() {
    const u = umgebung(null, "archiv");
    u.abs = async () => u.v.bestandLaden();
    u.ab = async nr => (await u.v.bestandLaden()).find(a => a.o.ab_anzeige === nr);
    u.koepfe = async () => u.v.archivLaden();
    u.kopf = async nr => (await u.v.archivLaden()).find(a => a.ab_anzeige === nr);
    u.protokoll = async () => u.v.protokollLesen();
    return u;
}

/* ---------- AB-Nummern (R-AB1 bis R-AB5): dieselben Fälle wie tests/test_ab_nummer.py ---------- */

const FORM = [
    ["123456", "AB123456"], ["ab123456", "AB123456"], ["123456 L1", "AB123456 L1"], ["Ab123456 / Los 2", "AB123456 / Los 2"],
    ["AB 123456", "AB123456"], ["123456-L01", "AB123456-L01"], ["  AB2515204  ", "AB2515204"],
    ["AB2616200   /  Los 1", "AB2616200 / Los 1"], ["123456X", "123456X"], ["-", "-"], ["", ""], ["Lager", "Lager"],
    ["2616624", "AB2616624"]
];
const SCHLUESSEL = [
    ["AB123456 L1", "AB123456|L1"], ["123456 / Los 1", "AB123456|L1"], ["AB123456 Los1", "AB123456|L1"],
    ["ab123456", "AB123456"], ["123456", "AB123456"], ["AB123456 X 2", "AB123456|X2"], ["-", "-"], ["", ""],
    ["lager a", "LAGERA"], ["AB2616200 / Los 1", "AB2616200|L1"]
];
const LOS = [[" L1", "1"], ["/ Los 1", "1"], ["Los01", "1"], ["-L01", "1"], [" L 10", "10"], [" L0", "0"], ["X", ""],
    [" Lager", ""], ["", ""], [" L", ""]];
const FORECAST = [["AB2515204 L1", "AB2515204"], ["AB2515204L1", "AB2515204"], ["2515204 / Los 2", "AB2515204"],
    ["AB2515204", "AB2515204"], ["-", ""], ["", ""]];

test("R_AB1 Anzeigeform", async () => {
    const { v } = await geladen();
    FORM.forEach(([ein, aus]) => assert.equal(v.abForm(ein), aus, ein));
});

test("R_AB2 Losnummer", async () => {
    const { v } = await geladen();
    LOS.forEach(([ein, aus]) => assert.equal(v.abLosNr(ein), aus, ein));
});

test("R_AB3 Vergleichsschlüssel", async () => {
    const { v } = await geladen();
    SCHLUESSEL.forEach(([ein, aus]) => assert.equal(v.abSchluessel(ein), aus, ein));
});

test("R_AB5 Forecast-Schlüssel", async () => {
    const { v } = await geladen();
    FORECAST.forEach(([ein, aus]) => assert.equal(v.abForecastSchluessel(ein), aus, ein));
});

test("R_X1 R_AB4 die Eingabe findet die vorhandene Schreibweise", async () => {
    const u = await geladen();
    const abs = await u.abs();
    for (const [ein, erwartet] of [["2515204", "AB2515204"], ["ab2515204", "AB2515204"], [" AB 2515204 ", "AB2515204"],
        ["AB2616200 Los1", "AB2616200 / Los 1"], ["2616200 L1", "AB2616200 / Los 1"], ["AB2616200/Los 01", "AB2616200 / Los 1"]]) {
        const a = u.v.abFinden(abs, ein);
        assert.ok(a, ein);
        assert.equal(a.o.ab_anzeige, erwartet, ein);
    }
    assert.equal(u.v.abFinden(abs, "9999999"), null);
    assert.equal(u.v.abFinden(abs, ""), null);
});

/* Für tests/test_symolo.py: dieselben Eingaben, damit Python sie mit bestand/ab_nummer.py vergleicht. */
if (process.env.KOM_AB_AUSGABE) {
    test("Ausgabe für den Vergleich mit Python", async () => {
        const { v } = await geladen();
        const eingaben = [].concat(FORM, SCHLUESSEL, LOS, FORECAST).map(x => x[0]).concat(
            ["AB-123", "ab 12 34", "123 Los 3", "AB123/L2", "ABC", "ab", "AB 12  L 3", "  ", "12L", "12 / 3", "12.5 L1"]);
        require("node:fs").writeFileSync(process.env.KOM_AB_AUSGABE, JSON.stringify(eingaben.map(e => ({
            ein: e, form: v.abForm(e), schluessel: v.abSchluessel(e), forecast: v.abForecastSchluessel(e)
        }))));
    });
}

/* ---------- R-X1: archivieren statt löschen ---------- */

test("R_X1 AB archivieren: bleibt in der Datenbank, nur markiert; BGs und Teile bleiben", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const bgs = u.db["fwm.kom_baugruppe"].zeilen.length, teile = u.db["fwm.kom_teil"].zeilen.length, auftraege = u.db["fwm.kom_auftrag"].zeilen.length;
    const status = ab.w.status;

    const n = await u.v.abArchivieren(ab);
    assert.equal(n, 1 + ab.bgs.length + u.v.bestandTeile(ab).length);

    assert.equal(await u.ab("AB2515204"), undefined, "nicht mehr in der Bestandsliste");
    assert.equal(u.db["fwm.kom_baugruppe"].zeilen.length, bgs);
    assert.equal(u.db["fwm.kom_teil"].zeilen.length, teile);
    assert.equal(u.db["fwm.kom_auftrag"].zeilen.length, auftraege);

    const roh = u.db["fwm.kom_auftrag"].zeilen.find(x => x.id === ab.o._id);
    assert.equal(roh.archiviert, true);
    assert.equal(roh.archiv_herkunft, "Archiviert aus Bestandsliste");
    assert.equal(roh.archiv_status, status);
    assert.match(roh.archiviert_am, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{7}Z$/);
    assert.ok(await u.kopf("AB2515204"), "steht im Archiv");
});

test("R_X1 Sicherheitsfrage: Zeilen wie in Excel (AB, jede BG, jedes Teil)", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    assert.equal(u.v.archivZeilenZahl(ab), 1 + ab.bgs.length + u.v.bestandTeile(ab).length);
    assert.ok(u.v.archivZeilenZahl(ab) > 5);
});

test("R_X1 W7 Archivieren steht im Protokoll", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const n = await u.v.abArchivieren(ab);
    const e = (await u.protokoll()).find(x => x.art === "archiviert" && x.ab === "AB2515204");
    assert.ok(e);
    gleich([e.objekt, e.alt, e.neu], ["", n + " Zeilen", "Archiv"]);
});

test("R_X1 ein AB, der schon archiviert ist, wird nicht noch einmal archiviert", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    await u.v.abArchivieren(ab);
    await assert.rejects(u.v.abArchivieren(ab), /Jemand anderes|schon im Archiv/);
});

test("R_X1 ein AB kann nach dem Archivieren neu importiert werden (gleicher Schlüssel, anderer Eintrag)", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    await u.v.abArchivieren(ab);
    const neu = await u.v.datenAnlegen("auftrag", { ab_anzeige: "AB2515204", ab_schluessel: "AB2515204", bereich: "bestand",
        archiviert: false });
    assert.ok(neu._id);
    assert.ok(await u.ab("AB2515204"));
    assert.ok(await u.kopf("AB2515204"));
});

/* ---------- R-X2: 28 Spalten ---------- */

test("R_X2 Archivkopf: 28 Spalten in der Reihenfolge von Excel", async () => {
    const { v } = await geladen();
    gleich(v.archivKopf.map(x => x[0]), ["AB", "Zeichnungsnummer", "Benennung", "Menge / BG", "Menge Gesamt", "Index",
        "LK Nummer", "Arbeitsgang", "Material", "Profil", "Abmaße", "Vorhanden", "Bemerkung", "Status", "Fortschritt",
        "Ebene", "Baugruppe", "Gelöscht am", "Eingelagert", "Komplett", "DLZ", "Lagerort", "Zuweisung Mitarbeiter",
        "Zuweisung Arbeitsplatz", "Entnommen", "Liefertermin Stahlbau", "Termin Versand", "Herkunft"]);
    assert.equal(new Set(v.archivKopf.map(x => x[1])).size, 28);
});

test("R_X2 Inhalt je Zeile für einen AB aus der Bestandsliste", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    await u.v.abArchivieren(ab);
    const kopf = await u.kopf("AB2515204");
    const zeilen = await u.v.archivZeilenLaden(kopf);
    const baum = (await u.v.bestandLaden([kopf._id], { archiv: "nur" }))[0];

    assert.equal(zeilen.length, 1 + baum.bgs.length + u.v.bestandTeile(baum).length);

    const ebenen = ["AB"].concat(baum.ohne.map(() => "Teil"), ...baum.bgs.map(b => ["BG"].concat(b.teile.map(() => "Teil"))));
    gleich(zeilen.map(z => z.ebene), ebenen, "Reihenfolge wie die Liste");
    assert.ok(zeilen.every(z => z.ab === "AB2515204" && z.herkunft === "Archiviert aus Bestandsliste"));
    assert.ok(zeilen.every(z => z.geloescht_am === kopf.archiviert_am));
    assert.ok(zeilen.every(z => z.dlz === "" && !z.mitarbeiter && !z.arbeitsplatz && !z.entnommen && !z.termin_versand));

    const a = zeilen[0];
    const o = baum.o;
    assert.equal(a.zeichnungsnummer, "AB2515204");
    assert.equal(a.benennung, o.verkaufsartikel);
    assert.equal(a.baugruppe, "");
    assert.equal(a.arbeitsgang, o.kunde ? "Kunde: " + o.kunde : "");
    assert.equal(a.material, o.haupt_ab ? "Haupt-AB: " + o.haupt_ab : "");
    assert.equal(a.profil, o.ersteller ? "Ersteller: " + o.ersteller : "");
    assert.equal(a.abmasse, o.datum_liste ? "Datum: " + o.datum_liste : "");
    assert.equal(a.bemerkung, o.dispoliste ? "Dispoliste: " + o.dispoliste : "");
    assert.equal(a.status, baum.w.status);
    assert.equal(a.fortschritt, baum.w.fortschritt);
    assert.equal(a.vorhanden, "");

    const bg = zeilen.find(z => z.ebene === "BG");
    const b0 = baum.bgs[0];
    assert.equal(bg.baugruppe, b0.o.name);
    assert.equal(bg.zeichnungsnummer, b0.o.zeichnungsnummer);
    assert.equal(bg.menge_gesamt, u.v.sollText(b0.o));
    assert.equal(bg.status, b0.w.status);
    assert.equal(bg.vorhanden, "");

    const teile = zeilen.filter(z => z.ebene === "Teil");
    const quellen = baum.ohne.concat(...baum.bgs.map(b => b.teile));
    teile.forEach((z, i) => {
        const t = quellen[i];
        assert.equal(z.zeichnungsnummer, t.o.zeichnungsnummer);
        assert.equal(z.lk_nummer, u.v.text(t.o.lk_nummer));
        assert.equal(z.menge_gesamt, u.v.sollText(t.o));
        assert.equal(z.status, t.w.status);
        assert.equal(z.fortschritt, t.w.fortschritt);
        assert.equal(z.vorhanden, t.o.vorhanden === null ? "" : u.v.zahlText(u.v.mengeMilli(t.o.vorhanden)));
        assert.equal(z.eingelagert, t.w.eingelagert);
        assert.equal(z.baugruppe, baum.bgs.find(b => b.teile.indexOf(t) > -1)?.o.name || "(ohne BG)");
    });
});

test("R_X2 Soll mit Komma steht als Text da, wie angezeigt", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    const t = u.v.bestandTeile(ab)[0];
    await u.v.sollSetzen([[t, 60]]);
    const neu = await u.ab("AB2515204");
    await u.v.abArchivieren(neu);
    const zeilen = await u.v.archivZeilenLaden(await u.kopf("AB2515204"));
    assert.ok(zeilen.some(z => z.ebene === "Teil" && z.zeichnungsnummer === t.o.zeichnungsnummer && z.menge_gesamt === "0,06"));
});

test("R_X2 Zellen: Gelöscht am mit Uhrzeit, andere Daten ohne, Zahlen rechts", async () => {
    const { v } = await geladen();
    const z = v.archivLeereZeile();
    z.geloescht_am = "2026-10-16T13:20:00.0000000Z";
    z.eingelagert = "2026-10-08T00:00:00.0000000Z";
    z.menge_gesamt = "14";
    assert.match(v.archivWert(z, "geloescht_am"), /^\d{2}\.\d{2}\.2026 \d{2}:\d{2}$/);
    assert.equal(v.archivWert(z, "eingelagert"), "08.10.2026");
    assert.equal(v.archivWert(z, "menge_gesamt"), "14");
    assert.equal(v.archivWert(z, "profil"), "");
    assert.ok(v.archivZahlFelder.indexOf("dlz") > -1);
});

test("R_X2 R_W5 DLZ: Termin Versand minus Eingelagert in Tagen", async () => {
    const { v } = await geladen();
    assert.equal(v.archivDlz("2026-10-08T00:00:00.0000000Z", "2026-10-16T00:00:00.0000000Z"), 8);
    assert.equal(v.archivDlz("2026-10-08T00:00:00.0000000Z", ""), "");
    assert.equal(v.archivDlz(null, "2026-10-16T00:00:00.0000000Z"), "");
});

test("R_X2 AB aus dem Schweißen: Zeilen aus der Schweißtabelle, DLZ wird gerechnet", async () => {
    const u = await geladen();
    const koepfe = await u.koepfe();
    const kopf = koepfe.find(k => u.v.archivAusSchweissen(k));
    assert.ok(kopf);
    const zeilen = await u.v.archivZeilenLaden(kopf);
    assert.ok(zeilen.length > 1);
    assert.equal(zeilen[0].ebene, "AB");
    assert.ok(zeilen.every(z => z.herkunft === "Archiviert aus Schweißen" && z.ab === kopf.ab_anzeige));
    const mit = zeilen.find(z => z.termin_versand && z.eingelagert);
    assert.equal(mit.dlz, u.v.archivDlz(mit.eingelagert, mit.termin_versand));
    assert.equal(typeof mit.dlz, "number");
    gleich(Object.keys(zeilen[0]).sort(), u.v.archivKopf.map(x => x[1]).sort());
});

/* ---------- R-X3: nur lesen und durchsuchen ---------- */

test("R_X3 Archiv: die zuletzt archivierten zuerst, keine Zeilen der Bestandsliste", async () => {
    const u = await geladen();
    const koepfe = await u.koepfe();
    assert.ok(koepfe.length > 5);
    const zeiten = koepfe.map(k => u.v.zeitMs(k.archiviert_am));
    gleich(zeiten, zeiten.slice().sort((a, b) => b - a));
    const live = new Set((await u.abs()).map(a => a.o.ab_anzeige));
    assert.ok(koepfe.every(k => !live.has(k.ab_anzeige)));
});

test("R_X3 Suche: AB, Kunde, Verkaufsartikel (Teilwort, ohne Groß-/Kleinschreibung)", async () => {
    const u = await geladen();
    const koepfe = await u.koepfe();
    const k = koepfe[0];
    assert.ok(u.v.archivKopfTreffer(k, k.ab_anzeige.slice(2, 7)));
    assert.ok(u.v.archivKopfTreffer(k, k.kunde.toUpperCase()));
    assert.ok(u.v.archivKopfTreffer(k, k.verkaufsartikel.slice(0, 4).toLowerCase()));
    assert.ok(u.v.archivKopfTreffer(k, ""));
    assert.ok(!u.v.archivKopfTreffer(k, "gibt-es-nicht-xyz"));
});

test("R_X3 Suche in den Zeilen: Zeichnungsnummer, Benennung, LK, Lagerort, Baugruppe", async () => {
    const u = await geladen();
    const koepfe = await u.koepfe();
    const alle = await u.v.archivZeilenAlle(koepfe);
    assert.equal(Object.keys(alle).length, koepfe.length);
    const k = koepfe.find(x => (alle[String(x._id)] || []).some(z => z.ebene === "Teil"));
    const teil = alle[String(k._id)].find(z => z.ebene === "Teil");
    assert.ok(u.v.archivZeileTreffer(teil, teil.zeichnungsnummer.slice(0, 6).toLowerCase()));
    assert.ok(u.v.archivZeileTreffer(teil, teil.benennung));
    assert.ok(u.v.archivZeileTreffer(teil, teil.lk_nummer));
    assert.ok(u.v.archivZeileTreffer(teil, teil.baugruppe));
    assert.ok(!u.v.archivZeileTreffer(teil, ""));
    assert.ok(!u.v.archivZeileTreffer(teil, "gibt-es-nicht-xyz"));
});

test("R_X3 Archiv hat keine Eingabefelder, Wiederherstellen nur als Knopf mit Rückfrage", async () => {
    const t = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "..", "symolo", "ansichten", "archiv", "ansicht.js"), "utf8");
    assert.ok(!/\.type = "(number|checkbox|text)"/.test(t), "nur das Suchfeld ist ein Eingabefeld");
    assert.match(t, /wiederherstellenFragen/);
});

test("R_X3 neu: Wiederherstellen bringt alles zurück, Platz in der Liste bleibt", async () => {
    const u = await geladen();
    const vorher = await u.ab("AB2515204");
    const teile = u.v.bestandTeile(vorher).map(t => [t.o.zeichnungsnummer, t.o.vorhanden, t.o.lagerort, t.o.datum_eingelagert]);
    const reihenfolge = vorher.o.reihenfolge;
    await u.v.abArchivieren(vorher);

    await u.v.archivWiederherstellen(await u.kopf("AB2515204"));

    const nachher = await u.ab("AB2515204");
    assert.ok(nachher);
    gleich(u.v.bestandTeile(nachher).map(t => [t.o.zeichnungsnummer, t.o.vorhanden, t.o.lagerort, t.o.datum_eingelagert]), teile);
    assert.equal(nachher.o.reihenfolge, reihenfolge);
    assert.equal(nachher.o.archiviert, false);
    assert.equal(nachher.o.archiviert_am, null);
    assert.equal(nachher.o.archiv_herkunft, "");
    assert.equal(nachher.o.archiv_status, "");
    assert.equal(nachher.w.status, vorher.w.status);
    assert.equal(await u.kopf("AB2515204"), undefined, "nicht mehr im Archiv");
});

test("R_X3 Wiederherstellen steht im Protokoll", async () => {
    const u = await geladen();
    await u.v.abArchivieren(await u.ab("AB2515204"));
    await u.v.archivWiederherstellen(await u.kopf("AB2515204"));
    const e = (await u.protokoll()).find(x => x.art === "wiederhergestellt");
    assert.ok(e);
    gleich([e.ab, e.objekt, e.alt, e.neu], ["AB2515204", "", "Archiv", "Bestandsliste"]);
});

test("R_X3 nicht, wenn der AB inzwischen wieder in der Bestandsliste steht", async () => {
    const u = await geladen();
    await u.v.abArchivieren(await u.ab("AB2515204"));
    await u.v.datenAnlegen("auftrag", { ab_anzeige: "AB2515204", ab_schluessel: "AB2515204", bereich: "bestand", archiviert: false });
    await assert.rejects(u.v.archivWiederherstellen(await u.kopf("AB2515204")), /steht schon wieder in der Bestandsliste/);
    assert.ok(await u.kopf("AB2515204"), "bleibt im Archiv");
});

test("R_X3 Platz in der Reihenfolge belegt: dann ans Ende", async () => {
    const u = await geladen();
    const vorher = await u.ab("AB2515204");
    await u.v.abArchivieren(vorher);
    const frei = (await u.abs()).map(a => u.v.mengeMilli(a.o.reihenfolge));
    await u.v.datenAnlegen("auftrag", { ab_anzeige: "AB9999999", ab_schluessel: "AB9999999", bereich: "bestand",
        reihenfolge: vorher.o.reihenfolge, archiviert: false });
    await u.v.archivWiederherstellen(await u.kopf("AB2515204"));
    const nachher = await u.ab("AB2515204");
    assert.equal(u.v.mengeMilli(nachher.o.reihenfolge), Math.max(...frei, u.v.mengeMilli(vorher.o.reihenfolge)) + 1000);
});

test("R_X3 ein AB aus dem Schweißen wird hier nicht zurückgeholt (Phase 6)", async () => {
    const u = await geladen();
    const kopf = (await u.koepfe()).find(k => u.v.archivAusSchweissen(k));
    await assert.rejects(u.v.archivWiederherstellen(kopf), /Schweißen/);
    assert.ok(await u.kopf(kopf.ab_anzeige), "bleibt im Archiv");
});

test("Schreibsperre: in Symolo wird nichts archiviert, solange sie an ist", async () => {
    const u = await geladen();
    const ab = await u.ab("AB2515204");
    u.v.schreibenErlaubt = () => false;
    await assert.rejects(u.v.abArchivieren(ab), /noch nicht freigegeben/);
    assert.ok(await u.ab("AB2515204"));
});

test("Gelöscht wird nie: die Ansichten benutzen kein Löschen", async () => {
    const fs = require("node:fs"), path = require("node:path");
    const dir = path.join(__dirname, "..", "..", "symolo");
    for (const f of ["quelle/4B_protokoll.js", "quelle/4D_archiv.js", "ansichten/archiv/ansicht.js", "ansichten/protokoll/ansicht.js"]) {
        const t = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
        assert.ok(!/Delete|Execute|\.remove\(\)\s*;?\s*\/\*DB/.test(t), f);
    }
});

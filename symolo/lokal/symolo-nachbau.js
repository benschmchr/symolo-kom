/* ===========================================================================
   NACHBAU von window.symolo – NUR für den lokalen Test.
   Kommt NICHT ins Symolo-Formular. Erreicht nichts außerhalb des Browsers:
   keine Verbindung zu Symolo, keine Datenbank, nur Beispieldaten.

   Bildet nach, was die Ansichten benutzen:
     tools.layout.create, tools.injector.css/rmcss, tools.parser.toObject,
     network.websocket.request mit den Befehlen der Datenschicht.

   Absichtlich wie die echte Bibliothek, auch in den lästigen Punkten:
     - layout.create ignoriert unbekannte Schlüssel still
     - Anlegen ignoriert eine mitgeschickte ID und vergibt selbst eine
     - Ändern ersetzt das GANZE Objekt: fehlende Felder werden leer
     - Löschen und SQL-Schreiben sind gesperrt (die App tut beides nie)
     - Schalter "Spaltennamen anders schreiben" (prüft tolerantes Lesen)
     - Schalter "Verbindung tot": Anfragen hängen endlos (prüft Zeitlimit)

   OFFEN (Symolo): Das echte Format von data/schema ist unbekannt. Unsere
   Ansichten fassen es nie an, sie geben es nur an toObject weiter.
   Änderungen bleiben im Browser (localStorage), bis "Beispieldaten
   zurücksetzen" gedrückt wird.
   =========================================================================== */
(function () {
    "use strict";

    /* Im echten Symolo-Fenster nie etwas überschreiben. */
    if (window.symolo && window.symolo.internal) return;

    const SPEICHER = "kom-symolo-nachbau-v1";
    const STANDARD = ["id", "iuser", "idate", "uuser", "udate"];
    const BEISPIEL_BENUTZER = 1;

    const schalter = { schreibweise: false, tot: false };
    let db = null;

    function kopie(x) {
        return JSON.parse(JSON.stringify(x));
    }

    function laden() {
        try {
            const t = window.localStorage && window.localStorage.getItem(SPEICHER);
            if (t) { db = JSON.parse(t); neueSpaltenErgaenzen(); return; }
        } catch (e) { /* ohne Speicher geht es auch */ }
        db = kopie(window.KOM_BEISPIELDATEN || {});
    }

    /* Ein im Browser gespeicherter Stand kann älter sein als die Beispieldaten
       (neue Tabellen, neue Spalten). Fehlendes wird ergänzt, vorhandene
       Eingaben bleiben. Neue Spalten sind leer, Ja/Nein-Spalten "nein".
       Ohne das würden Felder wie "archiviert" beim Speichern verschluckt. */
    function neueSpaltenErgaenzen() {
        const bsp = window.KOM_BEISPIELDATEN || {};
        let geaendert = false;

        Object.keys(bsp).forEach(name => {
            const neu = bsp[name];
            const alt = db[name];

            if (!alt) {
                db[name] = kopie(neu);
                geaendert = true;
                return;
            }

            neu.felder.forEach(f => {
                if (alt.felder.indexOf(f) >= 0) return;
                const probe = neu.zeilen.find(z => z[f] !== null && z[f] !== undefined);
                const vorgabe = probe && typeof probe[f] === "boolean" ? false : null;
                alt.felder.push(f);
                alt.zeilen.forEach(z => { z[f] = vorgabe; });
                geaendert = true;
            });
        });

        if (geaendert) sichern();
    }

    function sichern() {
        try {
            if (window.localStorage) window.localStorage.setItem(SPEICHER, JSON.stringify(db));
        } catch (e) { /* ohne Speicher geht es auch */ }
    }

    function zuruecksetzen() {
        try {
            if (window.localStorage) window.localStorage.removeItem(SPEICHER);
        } catch (e) { /* ohne Speicher geht es auch */ }
        db = kopie(window.KOM_BEISPIELDATEN || {});
    }

    /* Zeitformat wie in Symolo: "2026-01-05T13:19:33.0000000Z" */
    function jetzt() {
        return new Date().toISOString().slice(0, 19) + ".0000000Z";
    }

    function tabelle(name) {
        const gesucht = String(name).toLowerCase();
        for (const key in db) {
            if (key.toLowerCase() === gesucht) return db[key];
        }
        throw new Error("Tabelle gibt es nicht: " + name);
    }

    /* Wert eines Feldes, egal wie der Schlüssel geschrieben ist. */
    function wertVon(obj, feld) {
        const gesucht = feld.toLowerCase();
        for (const key in obj) {
            if (key.toLowerCase() === gesucht) return { da: true, wert: obj[key] };
        }
        return { da: false, wert: null };
    }

    function gleich(a, b) {
        if (a === null || a === undefined || b === null || b === undefined) return false;
        if (typeof a === "boolean") a = a ? 1 : 0;
        if (typeof b === "boolean") b = b ? 1 : 0;
        const na = Number(a);
        const nb = Number(b);
        if (String(a).trim() !== "" && String(b).trim() !== "" && !isNaN(na) && !isNaN(nb)) return na === nb;
        return String(a) === String(b);
    }

    /* ---------------- kleines SQL: nur was die Datenschicht baut ---------------- */

    function zerlegen(text) {
        const teile = [];
        let i = 0;
        while (i < text.length) {
            const c = text[i];
            if (/\s/.test(c)) { i++; continue; }
            if (c === "'") {
                let s = "";
                i++;
                while (i < text.length) {
                    if (text[i] === "'" && text[i + 1] === "'") { s += "'"; i += 2; continue; }
                    if (text[i] === "'") break;
                    s += text[i++];
                }
                if (i >= text.length) throw new Error("Text ohne schließendes ' in der Abfrage.");
                i++;
                teile.push({ art: "text", wert: s });
                continue;
            }
            if ("(),=".indexOf(c) >= 0) { teile.push({ art: "zeichen", wert: c }); i++; continue; }
            const m = text.slice(i).match(/^[A-Za-z0-9_.\-]+/);
            if (!m) throw new Error("Der Nachbau versteht dieses Zeichen nicht: " + c);
            const w = m[0];
            teile.push(/^-?\d+(\.\d+)?$/.test(w) ? { art: "zahl", wert: Number(w) } : { art: "wort", wert: w });
            i += w.length;
        }
        return teile;
    }

    function wertLesen(t) {
        if (!t) throw new Error("Wert fehlt in der Abfrage.");
        if (t.art === "text" || t.art === "zahl") return t.wert;
        if (t.art === "wort" && t.wert.toLowerCase() === "null") return null;
        throw new Error("Unbekannter Wert in der Abfrage: " + t.wert);
    }

    function bedingungenLesen(text) {
        const t = zerlegen(text);
        const bed = [];
        let i = 0;
        while (i < t.length) {
            const feld = t[i++];
            if (!feld || feld.art !== "wort") throw new Error("Feldname erwartet in der Abfrage.");
            const op = t[i++];
            if (op && op.wert === "=") {
                bed.push({ feld: feld.wert, art: "=", wert: wertLesen(t[i++]) });
            } else if (op && op.art === "wort" && op.wert.toLowerCase() === "in") {
                if (!t[i] || t[i].wert !== "(") throw new Error("( erwartet nach in.");
                i++;
                const werte = [];
                while (t[i] && t[i].wert !== ")") {
                    if (t[i].wert === ",") { i++; continue; }
                    werte.push(wertLesen(t[i++]));
                }
                i++;
                bed.push({ feld: feld.wert, art: "in", wert: werte });
            } else if (op && op.art === "wort" && op.wert.toLowerCase() === "is") {
                const nicht = t[i] && t[i].art === "wort" && t[i].wert.toLowerCase() === "not";
                if (nicht) i++;
                if (!t[i] || t[i].wert.toLowerCase() !== "null") throw new Error("null erwartet nach is.");
                i++;
                bed.push({ feld: feld.wert, art: nicht ? "nichtleer" : "leer" });
            } else {
                throw new Error("Der Nachbau versteht nur =, in und is null.");
            }
            if (i < t.length) {
                if (t[i].art !== "wort" || t[i].wert.toLowerCase() !== "and") throw new Error("Nur „and“ zwischen Bedingungen.");
                i++;
            }
        }
        return bed;
    }

    function passt(zeile, b) {
        const w = wertVon(zeile, b.feld);
        if (!w.da) throw new Error("Spalte gibt es nicht: " + b.feld);
        if (b.art === "leer") return w.wert === null || w.wert === undefined;
        if (b.art === "nichtleer") return !(w.wert === null || w.wert === undefined);
        if (b.art === "in") return b.wert.some(x => gleich(w.wert, x));
        return gleich(w.wert, b.wert);
    }

    function vergleichen(a, b) {
        if (a === b) return 0;
        if (a === null || a === undefined) return -1;
        if (b === null || b === undefined) return 1;
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b), "de-DE", { numeric: true });
    }

    function select(sql) {
        const m = String(sql).trim().replace(/;$/, "").match(
            /^select\s+(.+?)\s+from\s+([A-Za-z0-9_.]+)(?:\s+where\s+(.+?))?(?:\s+order\s+by\s+(.+?))?$/i
        );
        if (!m) throw new Error("Der Nachbau versteht diese Abfrage nicht: " + sql);

        const t = tabelle(m[2]);
        const bed = m[3] ? bedingungenLesen(m[3]) : [];
        let zeilen = t.zeilen.filter(z => bed.every(b => passt(z, b)));

        if (m[4]) {
            const regeln = m[4].split(",").map(s => {
                const p = s.trim().split(/\s+/);
                return { feld: p[0], ab: (p[1] || "").toLowerCase() === "desc" };
            });
            zeilen = zeilen.slice().sort((x, y) => {
                for (const r of regeln) {
                    const d = vergleichen(wertVon(x, r.feld).wert, wertVon(y, r.feld).wert);
                    if (d !== 0) return r.ab ? -d : d;
                }
                return 0;
            });
        }

        const spalten = m[1].trim() === "*" ? t.felder : m[1].split(",").map(s => s.trim());
        const namen = spalten.map(s => schalter.schreibweise ? s.charAt(0).toUpperCase() + s.slice(1) : s);

        return {
            data: {
                schema: namen.map(n => ({ name: n })),
                data: zeilen.map(z => spalten.map(s => wertVon(z, s).wert))
            }
        };
    }

    /* ---------------- Objekt-Befehle (dsf.dbo.*) ---------------- */

    function ergebnis(wert) {
        return { data: { result: JSON.stringify(wert) } };
    }

    function nachId(t, id) {
        return t.zeilen.find(z => gleich(z.id, id)) || null;
    }

    function felderUebernehmen(t, quelle, ziel) {
        for (const key in quelle) {
            const bekannt = t.felder.some(f => f.toLowerCase() === key.toLowerCase());
            if (!bekannt) console.warn("Nachbau: Feld gibt es nicht, wird ignoriert:", key);
        }
        t.felder.forEach(f => {
            if (STANDARD.indexOf(f) >= 0) return;
            /* Fehlende Felder werden leer: so verhält sich UpdateObjectJson. */
            ziel[f] = wertVon(quelle, f).wert;
        });
        return ziel;
    }

    const befehle = {

        "dsf.Database.Select": par => select(par[0]),

        "dsf.dbo.GetAllDboTypesAvail": () => ergebnis(Object.keys(db)),

        "dsf.dbo.GetEmptyObjectJson": par => {
            const t = tabelle(par[0]);
            const leer = {};
            t.felder.forEach(f => { leer[f] = null; });
            return ergebnis(leer);
        },

        "dsf.dbo.GetObjectByIdJson": par => ergebnis(nachId(tabelle(par[0]), par[1])),

        "dsf.dbo.GetDBObjectListByIDJson": par => {
            const t = tabelle(par[0]);
            const ids = Array.isArray(par[1]) ? par[1] : String(par[1]).split(",");
            return ergebnis(ids.map(id => nachId(t, String(id).trim())).filter(Boolean));
        },

        "dsf.dbo.CreateObjectJson": par => {
            const t = tabelle(par[0]);
            const obj = JSON.parse(par[1]);
            const neu = felderUebernehmen(t, obj, {});
            /* Eine mitgeschickte ID wird ignoriert. */
            neu.id = t.zeilen.reduce((max, z) => Math.max(max, Number(z.id) || 0), 0) + 1;
            neu.iuser = BEISPIEL_BENUTZER;
            neu.idate = jetzt();
            neu.uuser = null;
            neu.udate = null;
            t.zeilen.push(neu);
            sichern();
            return ergebnis(neu);
        },

        "dsf.dbo.UpdateObjectJson": par => {
            const t = tabelle(par[0]);
            const obj = JSON.parse(par[1]);
            const alt = nachId(t, wertVon(obj, "id").wert);
            if (!alt) throw new Error("Objekt mit dieser ID gibt es nicht.");
            felderUebernehmen(t, obj, alt);
            alt.uuser = BEISPIEL_BENUTZER;
            alt.udate = jetzt();
            sichern();
            return ergebnis(alt);
        },

        "dsf.dbo.DeleteObjectJson": () => {
            throw new Error("Im Nachbau gesperrt: Die App löscht nie, sie archiviert.");
        },

        "dsf.Database.Execute": () => {
            throw new Error("Im Nachbau gesperrt: Die App schreibt nie per SQL.");
        }
    };

    function request(endpoint, nachricht) {
        /* Wie die echte Bibliothek bei totem Endpunkt: keine Antwort, kein Fehler. */
        if (schalter.tot) return new Promise(() => {});

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const befehl = befehle[nachricht && nachricht.cmd];
                    if (!befehl) throw new Error("Befehl im Nachbau unbekannt: " + (nachricht && nachricht.cmd));
                    if (!Array.isArray(nachricht.par)) throw new Error("par muss eine Liste sein.");
                    resolve(befehl(nachricht.par));
                } catch (fehler) {
                    reject(fehler);
                }
            }, 20);
        });
    }

    /* ---------------- tools ---------------- */

    function create(o) {
        const el = document.createElement((o && o.type) || "div");
        if (!o) return el;
        if (o.class) el.className = o.class;
        if (o.id) el.id = o.id;
        if (o.text !== undefined) el.innerText = o.text;
        if (o.html !== undefined) el.innerHTML = o.html;
        if (o.style) {
            if (typeof o.style === "string") el.style.cssText = o.style;
            else Object.assign(el.style, o.style);
        }
        /* Unbekannte Schlüssel werden still ignoriert, wie im Original. */
        if (o.parent) o.parent.appendChild(el);
        return el;
    }

    function css(text, id) {
        if (document.getElementById(id)) return;
        const s = document.createElement("style");
        s.id = id;
        s.textContent = text;
        document.head.appendChild(s);
    }

    function rmcss(id) {
        const el = document.getElementById(id);
        if (el && (el.tagName === "STYLE" || el.tagName === "LINK")) el.remove();
    }

    function toObject(data, schema) {
        return (data || []).map(werte => {
            const o = {};
            (schema || []).forEach((s, i) => { o[s.name] = werte[i]; });
            return o;
        });
    }

    laden();

    window.symolo = {
        tools: {
            layout: { create: create },
            injector: { css: css, rmcss: rmcss },
            parser: { toObject: toObject }
        },
        network: {
            websocket: { request: request },
            websocket_globals: {}
        },
        /* Nur im Nachbau: für die Testleiste und die Tests. */
        _nachbau: {
            schalter: schalter,
            zuruecksetzen: zuruecksetzen,
            daten: () => db
        }
    };
})();

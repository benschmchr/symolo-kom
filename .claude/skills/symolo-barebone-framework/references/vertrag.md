# Der Vertrag im Volltext

Vollständiges Hook-Objekt. Alles lauffähig, nichts als Platzhalter.

---

## 1. Reihenfolge der drei Hooks

```
Formular wird geöffnet
        │
        ├─ form_on_load(FORM) ─────────► CSS einspielen. Kein DOM, keine Daten.
        │
        ├─ before_set_values(form, {data}) ──► View bauen, Daten holen, rendern
        │
   View wird benutzt
        │
        └─ onUnload(FORM, {}) ─────────► dieselbe CSS-ID wieder entfernen
```

`form_on_load` darf **kein DOM anfassen**. Zu dem Zeitpunkt existiert
das Formular, aber der View-Container ist noch nicht übergeben. Wer dort
`document.getElementById` aufruft, bekommt `null`.

`before_set_values` ist `async` und wird **nicht** auf sein Ergebnis
gewartet — es läuft neben der weiteren Wert-Übernahme. Deshalb: erst
das Gerüst aufbauen, dann die Daten holen. Wer zuerst die Daten holt und
dann baut, hat zwischenzeitlich eine leere View.

---

## 2. Gerüst

```js
const functionWrapper = {

/* ===========================================================================
   1. KONFIGURATION
   Alles, was beim Anpassen angefasst wird, steht hier oben.
   =========================================================================== */
config: {

    query: {

        sachen: {
            endpoint: "ws://…/cmd2",
            cmd:      "dsf.Database.Select",
            sql:      `select id, name from stamm.sachen`
        },

        /* Aufträge: absichtlich KEIN SQL.
           Geratene Spaltennamen erzeugen leere Zeilen statt eines
           Fehlers, und eine leere Liste sieht aus wie "es gibt keine". */
        /* auftraege: { endpoint: …, cmd: …, sql: … }, */
    },

    timeoutMs: 15000,

    layout: {
        machineColumnWidth: 180,
        rowHeight:           44
    }
},


/* ===========================================================================
   2. ZUSTAND
   Gehört ans Objekt, nicht in eine Schließung. Nur dann überlebt er
   einen Neuaufbau des Rasters.
   =========================================================================== */
sachen: [],
sachenSuche: "",
statusTimer: null,


/* ===========================================================================
   3. BAUEN
   =========================================================================== */
before_set_values: async function (form, { data }) {

    const parent = this.ctrlbyBind("_output").SelfElement;

    /* 3a. Erst das Gerüst. Ohne Daten, damit die View sofort steht. */
    this.buildView(parent);

    /* 3b. Dann die Daten. */
    await this.loadData();
},


/* ===========================================================================
   4. VIEW AUFBAUEN
   Nur Struktur. Jede ID wird hier vergeben und hier notiert — nicht
   später per querySelector gesucht.
   =========================================================================== */
buildView: function (parent) {

    /* Die View-Klasse. Jede CSS-Regel muss daran hängen. */
    const view = window.symolo.tools.layout.create({ parent: parent, class: "sv" });

    const head = window.symolo.tools.layout.create({ parent: view, class: "sv-head" });

    window.symolo.tools.layout.create({
        parent: head, type: "h2", class: "sv-title", text: "Sachen"
    });

    window.symolo.tools.layout.create({ parent: head, class: "sv-count", id: "svCount" });

    window.symolo.tools.layout.create({ parent: view, class: "sv-body", id: "svBody" });

    const foot = window.symolo.tools.layout.create({ parent: view, class: "sv-foot" });

    const btnReload = window.symolo.tools.layout.create({
        parent: foot, type: "button", class: "sv-btn", text: "Neu laden"
    });

    /* layout.create kann keine Events — danach am Element.
       Pfeil statt bind(), weil bind() hier nur umständlich ist. */
    btnReload.onclick = () => { this.loadData(); };

    window.symolo.tools.layout.create({
        parent: view, class: "sv-status", id: "status"
    });

    return view;
},


/* ===========================================================================
   5. LADEN UND RENDERN
   =========================================================================== */
loadData: async function () {

    const q = this.config.query;

    this.showStatus("Lade …");

    /* Toleranz: bricht eine Abfrage aus, steht das Gerüst trotzdem. */
    const rows = await this.selectData(q.sachen.endpoint, q.sachen.cmd, q.sachen.sql);

    this.sachen = this.normalizeSachen(rows);

    this.renderBody();
    this.updateCount();

    this.showStatus(this.sachen.length + " geladen.");
},

normalizeSachen: function (rows) {

    /* NULL ist nicht "": ohne diesen Schritt stünde in einer
       Überschrift der Text "undefined". */
    const text = value => {
        const t = value == null ? "" : String(value).trim();
        return t === "undefined" || t === "null" ? "" : t;
    };

    const liste = rows.map(row => {
        return {
            id:   Number(this.fieldAny(row, ["id", "ID"])),
            name: text(this.fieldAny(row, ["name", "Name", "bezeichnung"]))
        };
    });

    /* Die Reihenfolge der Datenbank ist keine Ordnung, auf der sich
       jemand verlassen würde. */
    liste.sort((a, b) => a.name.localeCompare(b.name, "de-DE", { numeric: true }));

    return liste;
},

renderBody: function () {

    const koerper = document.getElementById("svBody");
    if (!koerper) return;

    koerper.replaceChildren();

    if (this.sachen.length === 0) {
        window.symolo.tools.layout.create({
            parent: koerper, class: "sv-empty", text: "Keine Daten geladen."
        });
        return;
    }

    this.sachen.forEach(sache => {
        window.symolo.tools.layout.create({
            parent: koerper, class: "sv-card", text: sache.name
        });
    });
},

updateCount: function () {
    this.setText("svCount", this.sachen.length + " Einträge");
},


/* ===========================================================================
   6. HILFSMETHODEN
   =========================================================================== */
field: function (row, name) {

    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];

    const wanted = name.toLowerCase();

    for (const key in row) {
        if (key.toLowerCase() === wanted) return row[key];
    }

    return undefined;
},

fieldAny: function (row, names) {

    for (let i = 0; i < names.length; i++) {
        const value = this.field(row, names[i]);
        if (value !== undefined && value !== null && value !== "") return value;
    }

    return undefined;
},

setText: function (id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
},

showStatus: function (message) {

    const el = document.getElementById("status");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(this.statusTimer);

    /* Pfeil, damit this das Hook-Objekt bleibt. */
    this.statusTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2200);
},

requestWithTimeout: function (endpoint, cmd, sql, timeoutMs) {

    const ms = timeoutMs || this.config.timeoutMs;

    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(
                    "Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint
                ));
            }, ms);
        })
    ]);
},

selectData: async function (endpoint, cmd, sql) {

    try {
        const result = await this.requestWithTimeout(endpoint, cmd, sql);

        return window.symolo.tools.parser.toObject(
            result.data.data,
            result.data.schema
        );
    } catch (error) {
        console.warn("selectData:", error);
        this.showStatus("Daten konnten nicht geladen werden.");
        return [];
    }
},


/* ===========================================================================
   HOOK 1 — CSS
   Nur CSS. Und nur scoped.
   =========================================================================== */
form_on_load: function () {

    window.symolo.tools.injector.css(`

/* ---------------------------------------------------------------------------
   SCOPE: die View-Klasse .sv ist VORAUSSETZUNG jeder Regel.

   Kein * {}, kein html {}, kein body {}, kein nacktes button {} / table {}.
   Eine Klassen-Regel ohne Wrapper waere global und wuerde ausserhalb
   der View greifen.
   --------------------------------------------------------------------------- */

.sv { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.sv .sv-head { flex:0 0 auto; display:flex; align-items:center; gap:12px;
                padding:10px 12px; background:#fff;
                border-bottom:1px solid #d1d5db; }

.sv .sv-title { margin:0; font-size:18px; font-weight:700; white-space:nowrap; }
.sv .sv-count { margin-left:auto; font-size:11px; color:#6b7280;
                font-variant-numeric:tabular-nums; }

.sv .sv-body { flex:1 1 auto; min-height:0; display:flex; overflow:auto;
                background:#fff; }

.sv .sv-card  { border:1px solid #d1d5db; border-radius:5px;
                padding:6px 10px; margin:4px; font-size:13px; }

.sv .sv-empty { font-size:11px; color:#9ca3af; padding:8px 10px; }

/* Die Fusszeile bleibt EINE Zeile. Umbruch macht aus 29px sofort 83px.
   Deshalb nichts Vergleichbares hinein und white-space:nowrap. */
.sv .sv-foot { flex:0 0 auto; display:flex; align-items:center; gap:8px;
                padding:8px 12px; background:#fff;
                border-top:1px solid #d1d5db; white-space:nowrap; }

.sv .sv-btn   { border:0; border-radius:5px; padding:7px 12px; cursor:pointer;
                background:#374151; color:#fff; font-size:13px; font-family:inherit; }
.sv .sv-btn:hover { background:#4b5563; }
.sv .sv-btn:focus-visible { outline:2px solid #2563eb; outline-offset:2px; }

/* Der Status blendet ein und aus — die EINZIGE erlaubte Transition. */
.sv .sv-status { position:fixed; bottom:12px; left:50%; transform:translateX(-50%);
                 padding:7px 12px; border-radius:6px; background:#111827;
                 color:#fff; font-size:11px; opacity:0; pointer-events:none;
                 transition:opacity .2s; z-index:20; }
.sv .sv-status.show { opacity:.95; }

/* box-sizing dort, wo gerechnet wird. Fehlt es, driftet jede Zeile
   um die Breite des Rahmens. */
.sv .sv-head, .sv .sv-foot, .sv .sv-card, .sv .sv-body,
.sv .sv-count, .sv .sv-btn { box-sizing:border-box; }

    `, "SVCSS");
},


/* ===========================================================================
   HOOK 3 — AUFRÄUMEN
   Genau die ID, die form_on_load gesetzt hat.
   =========================================================================== */
onUnload: function () {
    window.symolo.tools.injector.rmcss("SVCSS");
}

};
```

---

## 3. Wie es im Formular aussieht

Im Framework steht genau dieser Inhalt ohne den `const functionWrapper = {`
und ohne die vier Polyfills:

```js
/* Formular → View */
{
    form_on_load:      function (FORM)                { … },
    before_set_values: async function (form, { data }) { … },
    onUnload:          function (FORM, {})             { … }
}
```

Die Zugriffspfade ändern sich an **genau zwei** Stellen:

| Im Barebone | Im Framework |
|---|---|
| `document.getElementById("_output")` | `this.ctrlbyBind("_output").SelfElement` |
| `window.symolo.network.websocket.request` | `window.symolo.internal.connection.websocket.request` |

Sonst nichts. `getElementById` für die eigenen Elemente bleibt
`getElementById` — die IDs sind eindeutig, solange die View die einzige
mit diesem Präfix ist.

---

## 4. Eine View ins Framework einhängen

1. Aus dem Barebone den **Inhalt** des Hook-Objekts herausnehmen.
2. `document.getElementById("_output")` → `this.ctrlbyBind("_output").SelfElement`
3. `window.symolo.network.websocket` → `window.symolo.internal.connection.websocket`
4. Objekt-Schlüssel setzen: `form_on_load`, `before_set_values`, `onUnload`.
5. Die vier Polyfills streichen. Sie gehören **nicht** ins Framework.
6. `layout.create`-Aufrufe bleiben unverändert.

**Der `<style>`-Block „NUR STANDALONE“ wird nicht mitkopiert.** Er
gehört nicht frameworkfähig und steht in der Barebone-Datei im `<head>`,
nicht im CSS von `form_on_load`.

---

## 5. Wie eine View am Framework hängt

```html
<form id="planung">
  <!-- Feld mit Bindung "_output" — der Container der View -->
</form>
```

Das Framework übergibt in `before_set_values` das Form-Objekt und
`{ data }`. Braucht die View Werte aus dem Formular, kommen sie aus
`data` — nicht aus dem DOM lesen. Das DOM kann zu diesem Zeitpunkt noch
unvollständig gefüllt sein.

---

## 6. Wenn eine zweite View ins selbe Formular kommt

Jede View bekommt:

- **eine eigene Wrapper-Klasse** (`.az`, `.sv`, …) — nie eine gemeinsame
- **eine eigene CSS-ID** (`AZCSS`, `SVCSS`) und ein passendes `rmcss`
- **ein eigenes Präfix für Klassen und IDs**, damit `getElementById`
  und `querySelector` eindeutig bleiben
- **eigenen Zustand** am Objekt

Wichtig: die IDs sind **nicht** über den Wrapper geschützt. Zwei Views
mit `id="status"` im selben Formular brechen `getElementById` — der
erste Treffer gewinnt. Präfixieren ist Pflicht, nicht Geschmack.
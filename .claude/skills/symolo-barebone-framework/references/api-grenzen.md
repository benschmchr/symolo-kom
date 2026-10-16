# API-Grenzen

Alles gegen `symolo.tools.js` / `symolo.network.js` geprüft. Wo etwas
nur beobachtet und nicht belegt ist, steht das dabei.

---

## `window.symolo.tools.layout.create`

Der einzige erlaubte Elementbau in einer View.

### Signatur

```js
window.symolo.tools.layout.create({
    parent: elternElement,   // Pflicht
    type:   "div",           // optionales Tag, sonst div
    class:  "sv-card",       // Klassenname ohne Punkt
    id:     "svKarten",      // ohne #
    text:   "Beschriftung",  // Inhalt
    html:   "<b>x</b>",      // Markup
    style:  { background: "#fff" }   // Objekt oder "a:b;c:d"
});
```

### Was es kann

| Schlüssel | Verhalten |
|---|---|
| `parent` | Element, an das gehängt wird. Fehlt es, hängt nichts. |
| `type` | Tag-Name. `undefined` → `div`. |
| `class` | Wird gesetzt, **kein** automatisches Präfix. |
| `id` | Wird gesetzt. |
| `text` | Setzt `innerText`. **Escapet `<` und `&`.** |
| `html` | Setzt `innerHTML`. |
| `style` | Objekt oder `"a:b;c:d"`-String. |

### Was es nicht kann

**Unbekannte Schlüssel werden still ignoriert.**

```js
window.symolo.tools.layout.create({ parent: el, clas: "sv-card" });
// → kein Fehler, kein Element mit Klasse. Tippfehler ist unsichtbar.
```

Deshalb: nach dem Bau immer prüfen, ob die Klasse wirklich sitzt. Ein
Element ohne Klasse sieht aus wie ein CSS-Fehler.

**Keine Events.**

```js
const el = window.symolo.tools.layout.create({ parent: box, type: "button" });
el.onclick = () => { … };                              // danach
el.setAttribute("draggable", "true");                  // danach
el.setAttribute("aria-expanded", "false");             // danach
el.dataset.orderId = nr;                                // danach
```

`draggable`, `title`, `data-*`, `aria-*`, `role`, `tabindex` — alles
danach.

**Kein `style` als CSS-Text mit Selektor.** Nur die genannten
Eigenschaften.

### Warum `layout.create` und nicht `document.createElement`

Nicht Bequemlichkeit, sondern Bindung: die View hängt im Framework
unter `ctrlbyBind("_output").SelfElement`. Ein selbstgebautes Element
gehört zum Dokument, nicht zum Formular, und überlebt den Neuaufbau des
Formulars nicht.

---

## `window.symolo.tools.injector`

### `css(text, id)`

```js
window.symolo.tools.injector.css(`
.az .az-card { border:1px solid #d1d5db; }
`, "AZCSS");
```

- **Idempotent.** Ein zweiter Aufruf mit gleicher ID ändert nichts.
  Deshalb ist der Aufruf in `form_on_load` gefahrlos mehrfach.
- Legt ein `<style>` an.
- **Ein Backtickpaar im Text beendet den Template-String**, auch in
  einem Kommentar. Das ist der teuerste Fehler der ganzen View: Der
  Rest des CSS wird nie eingefügt, die View bleibt leer, und es steht
  **kein** Fehler in der Konsole. Siehe `fallen.md`, Falle 1.

### `rmcss(id)`

```js
window.symolo.tools.injector.rmcss("AZCSS");
```

- Sucht zuerst `<style>`, dann `<link>`.
- Muss in `onUnload` stehen, sonst bleibt das CSS beim nächsten Öffnen
  des Formulars liegen und sammelt sich über mehrere Views an.

---

## `window.symolo.tools.parser.toObject`

```js
const rows = window.symolo.tools.parser.toObject(
    result.data.data,
    result.data.schema
);
```

- Liefert eine **Liste von Objekten**.
- Schlüssel sind die **Spaltennamen aus der Abfrage**, unverändert.

```sql
select '4711020' as 'order'      →   [{ order: "4711020" }]
select id, ressource from …       →   [{ id: 3, ressource: "K31" }]
```

### Konsequenz: nie `row.spalte`

```js
row.ressource     // undefined, wenn die DB "Ressource" liefert
```

Der Fehler ist **lautlos**: keine Exception, die Liste ist leer, die
View sieht funktionsfähig aus. Deshalb `field` / `fieldAny`:

```js
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
```

Und: **`null` ist nicht `""`.**

```js
name: this.fieldAny(row, ["ressource"]) ?? ""      // sicher
name: this.fieldAny(row, ["ressource"])            // kann null sein
```

Ohne den Schritt steht in einer Gruppenüberschrift der Text
`undefined`.

---

## Netzweg

### Zwei Pfade

| Umgebung | Aufruf |
|---|---|
| Barebone | `window.symolo.network.websocket.request` |
| Framework | `window.symolo.internal.connection.websocket.request` |

**Genau eine Stelle im ganzen Code wird umgestellt:** die eine Zeile in
`requestWithTimeout`. `internal.*` existiert im Barebone nicht, also
kann diese Zeile im Standalone nicht verifiziert werden.

### Aufrufform

```js
window.symolo.network.websocket.request(endpoint, {
    cmd: "dsf.Database.Select",
    par: [sql]        // Array, auch bei einem einzelnen SQL
});
```

### `request` hängt bei totem Endpunkt

Es **rejectet nicht**, **wirft nicht** und hat keinen eigenen Timeout.
Ein nicht erreichbarer Endpunkt lässt den Aufruf für immer stehen — die
View bleibt im Ladezustand, ohne Fehlermeldung.

Deshalb **immer** über einen Race:

```js
requestWithTimeout: function (endpoint, cmd, sql, timeoutMs) {

    const ms = timeoutMs || this.config.timeoutMs;

    return Promise.race([
        window.symolo.network.websocket.request(endpoint, { cmd: cmd, par: [sql] }),
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error("Timeout nach " + Math.round(ms / 1000) + "s: " + endpoint));
            }, ms);
        })
    ]);
},
```

### Befehle

| `cmd` | Wirkung |
|---|---|
| `dsf.Database.Select` | SELECT |
| `dsf.Database.Execute` | UPDATE / INSERT |

Nur ankommen lassen, was es im Barebone auch gab. Eine
Schreibabfrage zu erfinden ist schlimmer als keine — siehe
`SKILL.md` Abschnitt 8.

---

## Noch vorhanden, aber nicht geprüft im Einsatz

| Aufruf | Anmerkung |
|---|---|
| `window.symolo.tools.layout.setStyle` | im Barebone verfügbar, im Gerüst nicht benutzt |
| `window.symolo.network.httpGetAsync` | im Barebone verfügbar |
| `window.symolo.network.websocket.send` | im Barebone verfügbar |

Wenn eine View sie braucht: im Barebone einmal gegen die Lib prüfen,
nicht annehmen.

---

## Browser, nicht Framework

Frei benutzbar und erlaubt:

| API | Einsatz |
|---|---|
| `localStorage` | Zustände, die wiederkommen sollen (Pane-Zustand) |
| `fetch` | nur wo erlaubt, sonst der Websocket |
| `setTimeout` / `clearTimeout` | Statusanzeige, Entprellen |
| `DataTransfer` | Drag & Drop |
| `getComputedStyle` | nur zum Messen im Test |
| `requestAnimationFrame` | frei |

**Verboten:** Framework-eigene Pfade raten. `window.symolo.internal.*`
gibt es im Barebone nicht; wenn eine View es braucht, ist das ein
Hinweis, dass sie ein Feature des Frameworks benutzt und nicht in der
View liegen sollte.
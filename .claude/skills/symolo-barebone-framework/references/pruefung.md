# Prüfung

Jede Abnahmezeile aus `SKILL.md` Abschnitt 11 hat hier einen Befehl.

Grundsatz: **nicht am Bild prüfen, sondern messen.** Das Bild zeigt
Absicht, die Messung zeigt Wirklichkeit. Fast jede Falle in
`fallen.md` ist auf einem Screenshot nicht zu sehen.

Die Befehle laufen im Browser auf dem geöffneten Barebone-Tab. Der
Objektname ist der, den das Barebone-Gerüst verwendet — im Framework
existiert er nicht, dann tritt an seine Stelle der Name, den das
Framework verwendet.

---

## 0. Grundgerüst

```js
(async () => {
    for (let i = 0; i < 60; i++) {
        if (typeof functionWrapper !== "undefined" && document.querySelector(".az")) break;
        await new Promise(r => setTimeout(r, 500));
    }
    if (typeof functionWrapper === "undefined") return { nichtGeladen: true };
    return { ok: true };
})()
```

Danach jeder weitere Befehl. **Nach jeder Änderung neu laden**, sonst
misst man den alten Stand.

---

## 1. Null Konsolenfehler

```js
/* Separat lesen, nicht im Evaluate. */
```

Nach dem Laden die Konsole öffnen und `level: "error"` filtern. Eine
leere Konsole ist der Normalfall — **außer** bei Falle 1 (Backtick im
CSS), wo die Konsole leer ist und die View trotzdem tot ist. Deshalb
zusätzlich Ziffer 2 messen.

---

## 2. View überhaupt gebaut

```js
(() => {
    const sheet = document.getElementById("AZCSS").sheet;
    return {
        regeln:      sheet.cssRules.length,
        wrapper:     document.querySelectorAll(".az").length,
        viewKinder:  document.querySelector(".az").children.length
    };
})()
```

**`regeln: 0`** bei leerer View → Falle 1 (Backtick im CSS).

---

## 3. Jede CSS-Regel hat die Wrapper-Klasse als Voraussetzung

Der wichtigste Test des ganzen Dokuments. Ein globaler Selektor
versteckt sich sonst im Framework.

```js
(() => {
    const sheet = document.getElementById("AZCSS").sheet;
    const schlecht = [];

    [...sheet.cssRules].forEach(r => {
        if (!r.selectorText) return;

        r.selectorText.split(",").forEach(selektor => {
            const t = selektor.trim();
            if (!t) return;

            /* Der ERSTE Teil muss exakt die Wrapper-Klasse sein.
               Nicht "enthält .az" — sonst zählt auch ein Selektor,
               der sie nur irgendwo als Nachfahr hat. */
            const erster = t.split(/\s+|>/)[0];

            if (erster !== ".az") schlecht.push(t);
        });
    });

    return { regeln: sheet.cssRules.length, ohneWrapper: schlecht };
})()
```

**Erwartet: `ohneWrapper: []`.**

Findet die Datei eine ID-Schriftart, steht sie hier:
`<style id="AZCSS">` — bei einer anderen View anders. Nicht raten,
sondern `document.styleSheets` nehmen und den Knoten über
`ownerNode.id` prüfen.

---

## 4. Objektname nur an den Aufrufstellen

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    return s.split(String.fromCharCode(10))
        .map((z, i) => z.indexOf("functionWrapper") > -1
            ? { z: i + 1, t: z.trim() }
            : null)
        .filter(Boolean);
})()
```

**Erwartet: genau vier Stellen** — die Objektdefinition und die drei
Aufrufe im Barebone-Gerüst. Im Framework sind es nur noch die
Definition; die Aufrufe entfallen.

Zusätzlich zählen:

```js
(s.match(/this\./g) || []).length
```

---

## 5. Kein `document.querySelector` im Hook-Code

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    return s.split(String.fromCharCode(10)).map((z, i) =>
        z.indexOf("document.querySelector") > -1
            ? { z: i + 1, istKommentar: z.trim().indexOf("*") === 0, t: z.trim() }
            : null
    ).filter(Boolean);
})()
```

**Erwartet: nur Zeilen mit `istKommentar: true`.**

Ein Treffer mit `istKommentar: false` ist Falle 4.

---

## 6. Backtick-Bilanz im CSS-Block

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    const start = s.indexOf("injector.css(`");
    const ende  = s.indexOf("`,", start);

    const block = s.substring(start, ende);
    const anzahl = block.split(String.fromCharCode(96)).length - 1;

    /* Jedes Vorkommen von injector.css(` eröffnet einen Block */
    const bloecke = (s.match(/injector\.css\(`/g) || []).length;

    return { bloecke, backticks: anzahl, korrekt: anzahl === bloecke * 2 };
})()
```

**Erwartet: `korrekt: true`.**

---

## 7. Spalten passen auf 0px zusammen

Bei zwei Spalten, die zeilenweise zusammenpassen müssen (Maschine links,
Inhalt rechts). **Ohne die Klassen zu kennen** — sonst prüft der Test
eine Klassenliste, die mit der View mitwandert, und der Test stimmt,
wenn die View falsch ist.

```js
(() => {
    /* In jeder Spalte die Zeilen finden, ohne sie zu benennen.
       Das erste Kind ist die Kopfzeile, der Rest ist der Container —
       darunter liegen die Zeilen. */
    function zeilenDer(spalte) {
        const kinder = [...spalte.children].slice(1);
        if (kinder.length === 1) return [...kinder[0].children];
        return kinder;
    }

    const namen  = zeilenDer(document.querySelector(".az-names"));
    const rechts = zeilenDer(document.querySelector(".az-lanes"));

    let versatz = 0, schlimmste = "";
    const n = Math.min(namen.length, rechts.length);

    for (let i = 0; i < n; i++) {
        const a = namen[i].getBoundingClientRect().top;
        const b = rechts[i].getBoundingClientRect().top;
        const d = Math.abs(a - b);
        if (d > versatz) { versatz = d; schlimmste = namen[i].className; }
    }

    return {
        namen:  namen.length,
        rechts: rechts.length,
        gleichViel: namen.length === rechts.length,
        maxVersatz: Math.round(versatz * 100) / 100,
        ok: versatz < 0.5,
        schlimmste
    };
})()
```

**Erwartet: `gleichViel: true`, `maxVersatz: 0`, `ok: true`.**

- `gleichViel: false` → eine Zwischenüberschrift fehlt in einer der
  beiden Spalten, und **jede** Zeile darunter gehört zur falschen
  Zeile darüber. Ohne Fehlermeldung.
- `maxVersatz: 1` → Falle 5 (`box-sizing`).
- Referenz: 62 Zeilen je Spalte bei 44 Maschinen, 0px.

---

## 8. Klebende Kopfzeile

```js
(() => {
    const kopf = document.querySelector(".az-column-head");
    const box  = document.querySelector(".az-board-scroll");

    const vorher = kopf.getBoundingClientRect().top;
    box.scrollTop = 600;
    const nachher = kopf.getBoundingClientRect().top;

    return {
        vorher: Math.round(vorher),
        nachher: Math.round(nachher),
        klebt: Math.abs(nachher - vorher) < 1
    };
})()
```

**Erwartet: `klebt: true`.**
Falsch → Falle 6 (`align-items:flex-start`).

---

## 9. Fußzeile bleibt eine Zeile

```js
(() => {
    const f = document.querySelector(".az-view-foot");

    /* Die View darf ohne Fußzeile gebaut sein. */
    if (!f) return { fusszeile: "keine", ok: true };

    const r = f.getBoundingClientRect();
    const tops = [...f.children].map(k => Math.round(k.getBoundingClientRect().top));

    return {
        fusszeile: "vorhanden",
        hoehe: Math.round(r.height),
        einzeilig: Math.round(r.height) <= 35,
        kinderUebereinander: new Set(tops).size > 1
    };
})()
```

**Erwartet bei vorhandener Fußzeile: `einzellig: true`,
`kinderUebereinander: false`.**

Gemessene Referenz: 29px bei einer Zeile, 83px bei zweien. Der Sprung
kommt von `flex-wrap: wrap` plus einem Kind, das zu breit wird.

**Gegenprobe auf tote Regeln:** eine Klasse, die im `box-sizing`-Register
steht, aber nie gebaut wird, ist irreführend — sie behauptet ein
Element, das es nicht gibt.

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;
    const view = document.querySelector(".az");

    /* Alle Klassen aus dem view, die im CSS geregelt sind */
    return [...view.querySelectorAll("[class]")]
        .map(e => e.className)
        .filter(c => !document.querySelector("." + c.split(" ")[0])) ;
})()
```

Der umgekehrte Fall ist der teurere: eine CSS-Klasse, die es im DOM
nie gibt. Für den box-sizing-Register heißt das: Eintrag ohne Element.

---

## 10. Filter mit leerem Ergebnis

```js
(() => {
    /* In ein Filterfeld tippen, das nichts findet. */
    const s = document.querySelector(".az-search");
    s.value = "gibtesnicht";
    s.oninput({ target: s });

    const leer = document.querySelector(".az-empty");

    return {
      text: leer ? leer.textContent : null,
      nenntGrund: !!leer && leer.textContent.length > 8
    };
})()
```

**Erwartet: `nenntGrund: true`.** Bei zwei Filtern muss der Text **alle**
wirksamen Einschränkungen nennen, nicht nur die letzte.

Danach zurücksetzen und prüfen, dass die Liste wieder da ist.

---

## 11. Drag-Pfade

Alle drei Wege prüfen. Die zwei ersten sind die, die man übersieht.

### 11a. Gültiges Ziel

```js
(() => {
    const fw = functionWrapper;
    const lane = document.querySelector(".az-lane");

    const dt = new DataTransfer();
    document.querySelector(".az-order").ondragstart({ dataTransfer: dt });

    /* Zeiger über die Lane, knapp rechts von der Mitte */
    const box = lane.getBoundingClientRect();
    lane.ondragover({ preventDefault(){}, dataTransfer: dt, clientX: box.left + 20 });

    const vorschau = fw.dragPreviewIndex;

    lane.ondrop({ preventDefault(){}, dataTransfer: dt });

    return {
        vorschauIndex: vorschau,
        karten: document.querySelectorAll(".az-lane-chip").length,
        reste: document.querySelectorAll(".az-lane-marker").length,
        isOver: document.querySelectorAll(".az-lane.is-over").length
    };
})()
```

**Erwartet: `reste: 0`, `isOver: 0`** nach dem Drop. Bleibt eine Marke
stehen, wird der nächste Drop auf einer Position landen, die es nicht
mehr gibt.

### 11b. Ungültiges Ziel

```js
(() => {
    const box = document.querySelector(".az-orders");
    const dt = new DataTransfer();

    /* Karte AUS der Liste auf die Liste — darf nichts tun */
    const vorher = document.querySelectorAll(".az-lane-chip").length;
    document.querySelector(".az-order").ondragstart({ dataTransfer: dt });
    box.ondrop({ preventDefault(){}, dataTransfer: dt });

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-chip").length,
        unveraendert: vorher === document.querySelectorAll(".az-lane-chip").length
    };
})()
```

### 11c. Abbruch

```js
(() => {
    const fw = functionWrapper;
    const chip = document.querySelector(".az-lane-chip");

    const vorher = document.querySelectorAll(".az-lane-chip").length;

    /* Ziehen, aber loslassen ohne Drop */
    const dt = new DataTransfer();
    chip.ondragstart({ dataTransfer: dt });
    chip.ondragend();

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-chip").length,
        gerettet: vorher === document.querySelectorAll(".az-lane-chip").length,
        dragSource: fw.dragSource || fw.dragLaneChip
    };
})()
```

**Erwartet: `gerettet: true`, `dragSource: null`.**
`gerettet: false` → Falle 11. Der Auftrag ist beim Loslassen außerhalb
weg — nicht in der Lane, nicht in der Liste markiert, nirgends.

### 11d. Fremde Datei

```js
(() => {
    const lane = document.querySelector(".az-lane");
    const vorher = document.querySelectorAll(".az-lane-marker").length;

    /* ondragover feuert auch, wenn eine Datei über die Lane zieht */
    lane.ondragover({ preventDefault(){}, dataTransfer: new DataTransfer(), clientX: 10 });

    return {
        vorher,
        nachher: document.querySelectorAll(".az-lane-marker").length,
        keineVorschau: vorher === document.querySelectorAll(".az-lane-marker").length
    };
})()
```

---

## 12. CSS-ID wird abgebaut — und zwar dieselbe

Der Fehler ist nicht „kein `rmcss`“, sondern **`rmcss` mit einer anderen
ID**. Dann bleibt das CSS liegen und der Fehler ist unsichtbar.

```js
(() => {
    const s = [...document.scripts].find(x => !x.src).textContent;

    /* Zeichenklasse bewusst [^"')]+ statt [A-Z0-9_]+:
       ein Name darf Bindestriche haben, sonst meldet der Test bei
       falscher ID nur "null" statt des falschen Namens. */
    const gesetzt  = s.match(/injector\.css\(`[\s\S]*?`,\s*"?([^"')]+)"?\)/);
    const entfernt = s.match(/injector\.rmcss\("?([^"')]+)"?\)/);

    return {
        gesetzt:   gesetzt   ? gesetzt[1].trim()   : null,
        entfernt:  entfernt  ? entfernt[1].trim()  : null,
        vorhanden: !!gesetzt && !!entfernt,
        gleich:    !!gesetzt && !!entfernt && gesetzt[1].trim() === entfernt[1].trim()
    };
})()
```

**Erwartet: `vorhanden: true`, `gleich: true`.**

Gegengeprüft an einer echten View: `AZCSS` / `AZCSS` → `gleich: true`.
Mit absichtlich falscher ID → `gleich: false`, und `entfernt` nennt den
falschen Namen statt `null`.

Gibt es mehrere Views im selben Formular, muss die ID pro View
verschieden sein. Gegenprobe:

```js
/* alle injector.css-Aufrufe der Seite */
const s = [...document.scripts].find(x => !x.src).textContent;
(s.match(/injector\.css\(`[\s\S]*?`,\s*"?([A-Z0-9_]+)"?\)/g) || [])
    .map(m => m.match(/`,\s*"?([A-Z0-9_]+)"?\)/)[1])
```

Jede ID darf **einmal** vorkommen. `injector.css` ist idempotent —
zwei Views mit derselben ID liefern stillschweigend nur das CSS der
zweiten.

---

## 13. Kein `undefined` irgendwo im Text

```js
(() => {
    const sus = [];

    document.querySelectorAll(".az *").forEach(el => {
        if (el.children.length === 0 && /undefined|NaN|\[object/.test(el.textContent)) {
            sus.push({ klasse: el.className, text: el.textContent.trim() });
        }
    });

    return { treffer: sus };
})()
```

**Erwartet: `treffer: []`.**
Ein Treffer ist fast immer `null` statt `""` aus der Datenbank.

---

## 14. Zustand am Objekt, nicht im DOM

```js
(() => {
    const fw = functionWrapper;

    /* Absicht: das DOM wird aus dem Zustand gebaut, nicht aus den
       Rohdaten. Ein Filter, der den Zustand nicht kennt, kann das
       DOM nicht filtern. */
    return {
        zustandsfelder: Object.keys(fw).filter(k =>
            Array.isArray(fw[k]) || fw[k] instanceof Map || fw[k] instanceof Set
        )
    };
})()
```

Kein Array und kein Set sollte leer bleiben, wenn die View etwas anzeigt.

---

## 15. Ein Auftrag, eine Maschine

Bei jeder 1:1-Zuordnung, die über mehrere Behälter läuft:

```js
(() => {
    const fw = functionWrapper;
    const doppelt = [];

    fw.lanes.forEach((belegung, id) => {
        belegung.forEach(nr => {
            if (belegung.indexOf(nr) !== belegung.lastIndexOf(nr)) {
                doppelt.push(nr + " doppelt in " + id);
            }
        });
    });

    /* Und: steht er wirklich in genau einer Lane? */
    const anzahlJe = {};
    fw.lanes.forEach(belegung => {
        belegung.forEach(nr => { anzahlJe[nr] = (anzahlJe[nr] || 0) + 1; });
    });

    return {
        doppeltImArray: doppelt,
        falsch Verteilt: Object.keys(anzahlJe).filter(nr => anzahlJe[nr] !== 1)
    };
})()
```

**Erwartet: beide Listen leer.**

Ein Testfehler, der hier gern auftritt: `lanes.set(id, …)` im Test setzt
eine Nummer, die schon woanders steht. Das verletzt die Regel direkt im
Testaufbau, nicht im Code.

---

## Abschluss: der eine Blick

Und trotzdem am Ende **einmal das Bild ansehen.** Nummern finden keine
Fehler wie „die Kopfzeile ist 2px zu tief“ oder „zwei gestrichelte
Rechtecke konkurrieren“. Die findet man nur mit Augen — aber erst,
wenn die Zahlen stimmen.
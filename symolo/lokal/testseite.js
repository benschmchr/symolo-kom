/* ===========================================================================
   TESTLEISTE für symolo/test.html – NUR lokal, kommt NICHT nach Symolo.
   Spielt das Framework: öffnet eine Ansicht, ruft form_on_load,
   before_set_values und beim Wechsel onUnload. Dazu Schalter des Nachbaus.
   =========================================================================== */
(function () {
    "use strict";

    const leiste = document.getElementById("testleiste");
    const ausgabe = document.getElementById("_output");
    const nachbau = window.symolo._nachbau;
    const MERKEN = "kom-test-ansicht";
    let aktiv = null;
    let aktivName = "";

    function element(type, text) {
        const el = document.createElement(type);
        if (text) el.textContent = text;
        return el;
    }

    function oeffnen(name, optionen) {
        if (aktiv) aktiv.onUnload({}, {});
        window.KOM_START_OPTIONEN = optionen || null;
        ausgabe.replaceChildren();

        const obj = window.KOM_ANSICHTEN[name]();
        /* POLYFILL: im Framework liefert Symolo ctrlbyBind selbst. */
        obj.ctrlbyBind = bind => ({ SelfElement: document.getElementById(bind) });

        aktiv = obj;
        aktivName = name;
        obj.form_on_load({});
        obj.before_set_values({}, { data: {} });

        try { localStorage.setItem(MERKEN, name); } catch (e) { /* egal */ }
    }

    /* Leiste bauen */
    leiste.appendChild(element("strong", "Lokaler Test"));

    const auswahl = element("select");
    Object.keys(window.KOM_ANSICHTEN).forEach(name => {
        const o = element("option", window.KOM_ANSICHTEN_TITEL[name] || name);
        o.value = name;
        auswahl.appendChild(o);
    });
    auswahl.onchange = () => oeffnen(auswahl.value);

    /* Die Bereichsleiste in den Ansichten wechselt über diese Funktion (in Symolo OFFEN). */
    window.KOM_BEREICH_WECHSELN = (name, optionen) => {
        if (!window.KOM_ANSICHTEN[name]) return;
        auswahl.value = name;
        oeffnen(name, optionen);
    };
    const auswahlLabel = element("label", "Bereich: ");
    auswahlLabel.appendChild(auswahl);
    leiste.appendChild(auswahlLabel);

    const zurueck = element("button", "Beispieldaten zurücksetzen");
    zurueck.type = "button";
    zurueck.onclick = () => {
        if (!window.confirm("Alle Änderungen verwerfen und die Beispieldaten neu laden?")) return;
        nachbau.zuruecksetzen();
        oeffnen(aktivName);
    };
    leiste.appendChild(zurueck);

    function schalter(text, key) {
        const l = element("label");
        const box = element("input");
        box.type = "checkbox";
        box.onchange = () => { nachbau.schalter[key] = box.checked; oeffnen(aktivName); };
        l.appendChild(box);
        l.appendChild(document.createTextNode(text));
        leiste.appendChild(l);
    }
    schalter("Spaltennamen anders schreiben", "schreibweise");
    schalter("Verbindung tot (Meldung nach 15 Sekunden)", "tot");

    /* Rechte wie in Symolo (currentRights): ohne Häkchen alle an, mit Häkchen keins. */
    const ohneRechte = element("label");
    const ohneBox = element("input");
    ohneBox.type = "checkbox";
    ohneBox.onchange = () => {
        if (ohneBox.checked) window.currentRights = {};
        else delete window.currentRights;
        oeffnen(aktivName);
    };
    ohneRechte.appendChild(ohneBox);
    ohneRechte.appendChild(document.createTextNode("Ohne Rechte (nur ansehen)"));
    leiste.appendChild(ohneRechte);

    leiste.appendChild(element("span",
        "Beispieldaten, keine Verbindung zu Symolo. Änderungen bleiben nur in diesem Browser. " +
        "Erstellt: Ben Schumacher, 09.10.2026"));
    leiste.lastChild.className = "hinweis";

    /* Start: zuletzt geöffnete Ansicht oder die erste */
    let start = Object.keys(window.KOM_ANSICHTEN)[0];
    try {
        const gemerkt = localStorage.getItem(MERKEN);
        if (gemerkt && window.KOM_ANSICHTEN[gemerkt]) start = gemerkt;
    } catch (e) { /* egal */ }
    auswahl.value = start;
    oeffnen(start);
})();

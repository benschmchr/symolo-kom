// Meldungen und Rückfragen in der Mitte der Seite, Hintergrund ausgegraut (ein Dialog für alle Fragen).
//  - FWM.frage(text, {ok, abbrechen}) → Promise (statt window.confirm)
//  - FWM.eingabe(text, vorgabe) → Promise mit Text oder null (statt window.prompt)
//  - FWM.zeigen(knoten) zeigt beliebigen Inhalt im Dialog
//  - <a data-dialog href="…">: lädt die Sicherheitsfrage der Zielseite (.loeschen-frage) und zeigt sie hier;
//    ohne Skript oder bei einem Fehler öffnet der Link ganz normal die Seite.
(function () {
  var dlg = null;

  function holen() {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "mitte-dialog";
      dlg.addEventListener("click", function (e) {            // Klick auf den ausgegrauten Hintergrund schließt
        if (e.target === dlg) dlg.close();
      });
      document.body.appendChild(dlg);
    }
    return dlg;
  }

  function zeigen(knoten) {
    var d = holen();
    d.replaceChildren(knoten);
    if (!d.open) d.showModal();
    var erstes = d.querySelector("[autofocus], .knopf-gefahr, .knopf-haupt, input, button, a");
    if (erstes) erstes.focus();
    return d;
  }

  function schliessen() { if (dlg && dlg.open) dlg.close(); }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  }

  function frage(text, opt) {
    opt = opt || {};
    return new Promise(function (fertig) {
      var box = el("div", "frage-box");
      var p = el("p", "gross");
      p.textContent = text;
      p.style.whiteSpace = "pre-line";
      var zeile = el("div", "knopfzeile");
      var ja = el("button", "knopf-haupt", opt.ok || "Ja");
      var nein = el("button", "knopf", opt.abbrechen || "Abbrechen");
      ja.type = nein.type = "button";
      zeile.append(ja, nein);
      box.append(p, zeile);
      var d = zeigen(box);
      var antwort = false;
      ja.addEventListener("click", function () { antwort = true; d.close(); });
      nein.addEventListener("click", function () { d.close(); });
      d.addEventListener("close", function () { fertig(antwort); }, { once: true });
    });
  }

  function eingabe(text, vorgabe) {
    return new Promise(function (fertig) {
      var form = el("form", "frage-box");
      var p = el("p", "gross", text);
      var feld = el("input");
      feld.type = "text";
      feld.value = vorgabe || "";
      feld.maxLength = 40;
      feld.autocomplete = "off";
      var zeile = el("div", "knopfzeile");
      var ja = el("button", "knopf-haupt", "OK");
      var nein = el("button", "knopf", "Abbrechen");
      ja.type = "submit";
      nein.type = "button";
      zeile.append(ja, nein);
      form.append(p, feld, zeile);
      var d = zeigen(form);
      feld.focus();
      var antwort = null;
      form.addEventListener("submit", function (e) { e.preventDefault(); antwort = feld.value; d.close(); });
      nein.addEventListener("click", function () { d.close(); });
      d.addEventListener("close", function () { fertig(antwort); }, { once: true });
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-dialog]");
    if (a && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && e.button === 0) {
      e.preventDefault();
      fetch(a.href, { credentials: "same-origin" }).then(function (r) {
        return r.text().then(function (html) { return { url: r.url, html: html, ok: r.ok }; });
      }).then(function (r) {
        var f = r.ok && new DOMParser().parseFromString(r.html, "text/html").querySelector(".loeschen-frage");
        if (!f) { location.href = a.href; return; }
        f = document.importNode(f, true);
        if (!f.getAttribute("action")) f.setAttribute("action", r.url);
        f.classList.remove("karte", "formular-breit");
        f.querySelectorAll("a.knopf").forEach(function (n) { n.setAttribute("data-schliessen", ""); });
        zeigen(f);
      }).catch(function () { location.href = a.href; });
      return;
    }
    var z = e.target.closest && e.target.closest("[data-schliessen]");
    if (z && dlg && dlg.contains(z)) { e.preventDefault(); schliessen(); }
  });

  // Sicherheitsschlüssel (CSRF) für Anfragen an den Server, aus dem Kopf der Seite
  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : "";
  }

  window.FWM = { csrf: csrf, frage: frage, eingabe: eingabe, zeigen: zeigen, schliessen: schliessen };
})();

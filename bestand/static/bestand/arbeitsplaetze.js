// Hallenplan: Arbeitsplatz ändern (R-AP5). Eintrag antippen → Auswahl der Plätze; am PC auch Ziehen und auf einen
// Platz oder auf „Nicht einsortiert“ ablegen. Rechtsklick auf einen Eintrag: AB aufsplitten, zusammenführen und
// Mitarbeiter ändern (Auswahl mit mehreren Namen). Danach wird der Plan neu geholt. Der Server prüft die Rolle Stahlbau.
(function () {
  var TOKEN = window.FWM.csrf();
  var dlg = document.getElementById("ap-dialog");
  var aktiv = null;

  function meldung(text, fehler) {
    var m = document.getElementById("meldung");
    if (!m) return;
    m.textContent = text;
    m.classList.toggle("fehler", !!fehler);
    m.hidden = false;
    clearTimeout(m._t);
    m._t = setTimeout(function () { m.hidden = true; }, fehler ? 8000 : 5000);
  }

  function neuLaden() {
    var c = document.querySelector("[data-neu-laden]");
    return fetch(location.href, { credentials: "same-origin" }).then(function (r) { return r.text(); }).then(function (html) {
      var neu = new DOMParser().parseFromString(html, "text/html").querySelector("[data-neu-laden]");
      if (neu && c) c.innerHTML = neu.innerHTML;
    });
  }

  function setzen(q, platz) {
    fetch(dlg.getAttribute("data-url"), {
      method: "POST", credentials: "same-origin",
      body: new URLSearchParams({ eintrag: q.name, platz: platz }),
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Stahlbau), um den Arbeitsplatz zu ändern.");
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
        return neuLaden().then(function () { meldung(j.meldung); });
      });
    }).catch(function (err) { meldung(err.message, true); });
  }

  function quelle(el) {
    return { name: el.getAttribute("data-name"), platz: el.getAttribute("data-platz") || "",
             mit: el.getAttribute("data-mit") || "", ganz: el.getAttribute("data-ganz") === "1",
             komplett: el.getAttribute("data-komplett") === "1", bgs: parseInt(el.getAttribute("data-bgs") || "0", 10) };
  }

  function senden(url, daten) {
    return fetch(url, {
      method: "POST", credentials: "same-origin", body: new URLSearchParams(daten),
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Stahlbau), um das zu ändern.");
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
        return neuLaden().then(function () { meldung(j.meldung); });
      });
    }).catch(function (err) { meldung(err.message, true); });
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text) e.textContent = text;
    return e;
  }

  // Mitarbeiter ändern: Auswahl mit Häkchen, mehrere möglich
  function mitarbeiterWahl(q) {
    var namen = JSON.parse(document.getElementById("mitarbeiter-daten").textContent);
    var gewaehlt = q.mit.split(",").map(function (n) { return n.trim(); }).filter(Boolean);
    var alle = namen.slice();
    gewaehlt.forEach(function (n) {
      if (!alle.some(function (a) { return a.toLowerCase() === n.toLowerCase(); })) alle.push(n);
    });
    var box = el("div", "frage-box");
    box.append(el("h2", "", "Mitarbeiter für " + q.name));
    var liste = el("div", "mehrfach-liste statisch");
    alle.forEach(function (n) {
      var l = el("label");
      var c = document.createElement("input");
      c.type = "checkbox";
      c.value = n;
      c.checked = gewaehlt.some(function (g) { return g.toLowerCase() === n.toLowerCase(); });
      l.append(c, document.createTextNode(" " + n));
      liste.append(l);
    });
    if (!alle.length) liste.append(el("span", "klein leise", "Noch keine Mitarbeiter eingetragen (Reiter Schweißen: „Mitarbeiter verwalten“)."));
    var zeile = el("div", "knopfzeile");
    var ok = el("button", "knopf-haupt", "Speichern");
    var zu = el("button", "knopf", "Abbrechen");
    ok.type = zu.type = "button";
    zu.setAttribute("data-schliessen", "");
    ok.addEventListener("click", function () {
      var wert = Array.prototype.filter.call(liste.querySelectorAll("input"), function (c) { return c.checked; })
        .map(function (c) { return c.value; }).join(", ");
      FWM.schliessen();
      senden(dlg.getAttribute("data-mitarbeiter-url"), { eintrag: q.name, wert: wert });
    });
    zeile.append(ok, zu);
    box.append(liste, zeile);
    FWM.zeigen(box);
  }

  // Menü zu einem Eintrag (Rechtsklick, am Handy über die Auswahl): aufsplitten, zusammenführen, Mitarbeiter
  function menue(q) {
    var box = el("div", "frage-box ab-menue");
    box.append(el("h2", "", q.name));
    var zeile = el("div", "knopfzeile");
    var knopf = function (text, klasse, tun) {
      var b = el("button", klasse, text);
      b.type = "button";
      b.addEventListener("click", function () { FWM.schliessen(); tun(); });
      zeile.append(b);
    };
    if (q.ganz && q.komplett && q.bgs > 1) {
      knopf("AB aufsplitten", "knopf-haupt", function () { senden(dlg.getAttribute("data-teilen"), { eintrag: q.name }); });
    } else if (!q.ganz && q.komplett) {
      knopf("AB zusammenführen", "knopf-haupt", function () { senden(dlg.getAttribute("data-zusammen"), { eintrag: q.name }); });
    }
    knopf("Mitarbeiter", "knopf", function () { mitarbeiterWahl(q); });
    var zu = el("button", "knopf-rot", "Abbrechen");
    zu.type = "button";
    zu.setAttribute("data-schliessen", "");
    zeile.append(zu);
    box.append(zeile);
    if (!q.komplett && q.name.toUpperCase().indexOf("_BG") >= 0) {
      box.append(el("p", "klein leise", "Zusammenführen geht nur, wenn alle Baugruppen des AB im Schweißen liegen."));
    }
    FWM.zeigen(box);
  }

  document.addEventListener("click", function (e) {
    var auf = e.target.closest("[data-ap-auf]");
    if (auf) {
      aktiv = quelle(auf);
      document.getElementById("ap-titel").textContent = "Arbeitsplatz für " + aktiv.name;
      document.getElementById("ap-bisher").textContent = aktiv.platz ? "Bisher: " + aktiv.platz : "Bisher: kein Arbeitsplatz";
      dlg.querySelectorAll("[data-wahl]").forEach(function (b) {
        b.setAttribute("aria-pressed", aktiv.platz !== "" && b.getAttribute("data-wahl") === aktiv.platz ? "true" : "false");
      });
      dlg.showModal();
      return;
    }
    if (aktiv && e.target.closest("#ap-dialog [data-menue-knopf]")) {   // Handy: kein Rechtsklick
      dlg.close();
      menue(aktiv);
      return;
    }
    var wahl = e.target.closest("#ap-dialog [data-wahl]");
    if (wahl) {
      dlg.close();
      if (wahl.getAttribute("data-wahl") !== aktiv.platz) setzen(aktiv, wahl.getAttribute("data-wahl"));
    }
  });

  document.addEventListener("contextmenu", function (e) {
    var el = e.target.closest && e.target.closest("[data-ap-auf]");
    if (!el) return;
    e.preventDefault();
    menue(quelle(el));
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target.closest && e.target.closest("[data-ap-auf]");
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.click(); }
  });

  var gezogen = null;
  document.addEventListener("dragstart", function (e) {
    var el = e.target.closest && e.target.closest("[data-ap-auf][draggable]");
    if (!el) return;
    gezogen = quelle(el);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", gezogen.name);
  });
  document.addEventListener("dragend", function () {
    gezogen = null;
    document.querySelectorAll(".drueber").forEach(function (f) { f.classList.remove("drueber"); });
  });
  document.addEventListener("dragover", function (e) {
    var ap = gezogen && e.target.closest && e.target.closest("[data-ablage]");
    if (!ap) return;
    e.preventDefault();
    ap.classList.add("drueber");
  });
  document.addEventListener("dragleave", function (e) {
    var ap = e.target.closest && e.target.closest("[data-ablage]");
    if (ap && !ap.contains(e.relatedTarget)) ap.classList.remove("drueber");
  });
  document.addEventListener("drop", function (e) {
    var ap = gezogen && e.target.closest && e.target.closest("[data-ablage]");
    if (!ap) return;
    e.preventDefault();
    ap.classList.remove("drueber");
    var ziel = ap.getAttribute("data-ablage");
    if (ziel !== gezogen.platz) setzen(gezogen, ziel);
    gezogen = null;
  });
})();

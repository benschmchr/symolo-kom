// Regal: Platz ändern (R-R5). Eintrag antippen → Auswahl; am PC auch Ziehen und auf ein Fach oder auf
// „Nicht einsortiert“ ablegen. Rechtsklick (oder Antippen → Auswahl): „AB aufsplitten“ bzw.
// „AB zusammenführen“. Freier Text (kein Regalfach) nur mit Bestätigung (R-L4). Danach wird der Bereich
// [data-neu-laden] neu geholt, damit Regal, Listen und Status stimmen. Der Server prüft die Rolle Kommissionierung.
(function () {
  var TOKEN = window.FWM.csrf();
  var dlg = document.getElementById("platz-dialog");
  var aktiv = null;   // Eintrag, dessen Platz gerade geändert wird

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
    if (!c) { location.reload(); return Promise.resolve(); }
    return fetch(location.href, { credentials: "same-origin" })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var neu = new DOMParser().parseFromString(html, "text/html").querySelector("[data-neu-laden]");
        if (neu) c.innerHTML = neu.innerHTML;
      });
  }

  function setzen(q, wert, frei) {
    if (!q || !dlg) return;
    var daten = { platz: wert };
    daten[q.art] = q.id;
    daten.regal = "1";                       // aus dem Regal: eine Baugruppe einzeln verschieben = AB bleibt aufgesplittet
    if (frei) daten.frei = "1";
    fetch(dlg.getAttribute("data-url"), {
      method: "POST", body: new URLSearchParams(daten), credentials: "same-origin",
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Kommissionierung), um den Platz zu ändern.");
      return r.json().then(function (j) {
        if (r.status === 409 && j.frage) {
          return FWM.frage(j.frage).then(function (ja) { if (ja) setzen(q, wert, true); });
        }
        if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
        return neuLaden().then(function () {
          meldung(j.meldung);
          if (j.zusammen) {            // alle Baugruppen liegen jetzt zusammen: nachfragen, nie von selbst zusammenführen
            FWM.frage("AB ist zusammengeführt.", { ok: "Ja", abbrechen: "Nein" }).then(function (ja) {
              if (ja) zusammen({ id: j.zusammen });
            });
          }
        });
      });
    }).catch(function (err) { meldung(err.message, true); });
  }

  function senden(url, daten) {
    return fetch(url, {
      method: "POST", body: new URLSearchParams(daten), credentials: "same-origin",
      headers: { "X-CSRFToken": TOKEN, "X-Requested-With": "fetch" }
    }).then(function (r) {
      if (r.redirected || r.status === 403) throw new Error("Bitte anmelden (Rolle Kommissionierung), um das Regal zu ändern.");
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.fehler || "Speichern ging nicht.");
        return neuLaden().then(function () { meldung(j.meldung); });
      });
    }).catch(function (err) { meldung(err.message, true); });
  }
  function teilen(q) { return senden(dlg.getAttribute("data-teilen"), { ab: q.abId }); }
  function zusammen(q) { return senden(dlg.getAttribute("data-zusammen"), { bg: q.id }); }

  function quelle(el) {
    return { art: el.getAttribute("data-art"), id: el.getAttribute("data-id"), name: el.getAttribute("data-name"),
             platz: el.getAttribute("data-platz") || "", ab: el.getAttribute("data-ab"), abId: el.getAttribute("data-ab-id"),
             bgs: parseInt(el.getAttribute("data-bgs") || "0", 10) };
  }

  function oeffnen(q) {
    aktiv = q;
    document.getElementById("pd-titel").textContent = "Platz für " + q.name;
    document.getElementById("pd-bisher").textContent = q.platz ? "Bisher: " + q.platz : "Bisher: noch kein Platz";
    dlg.querySelectorAll("[data-wahl]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-wahl") === q.platz && q.platz !== "" ? "true" : "false");
    });
    var frei = document.getElementById("pd-text");
    frei.value = q.platz && !dlg.querySelector('.platz-raster [data-wahl="' + CSS.escape(q.platz) + '"]') ? q.platz : "";
    dlg.showModal();
  }

  document.addEventListener("click", function (e) {
    var auf = e.target.closest("[data-platz-auf]");
    if (auf && dlg) { oeffnen(quelle(auf)); return; }
    var wahl = e.target.closest("#platz-dialog [data-wahl]");
    if (wahl) {
      dlg.close();
      if (wahl.getAttribute("data-wahl") !== aktiv.platz) setzen(aktiv, wahl.getAttribute("data-wahl"), false);
      return;
    }
    if (e.target.closest("#platz-dialog [data-frei]")) {
      var t = document.getElementById("pd-text").value.trim();
      if (!t) { document.getElementById("pd-text").focus(); return; }
      dlg.close();
      setzen(aktiv, t, false);
      return;
    }
  });
  // Rechtsklick auf einen Eintrag: Menü in der Mitte (aufsplitten bzw. zusammenführen)
  function menue(q) {
    var box = document.createElement("div");
    box.className = "frage-box ab-menue";
    var h = document.createElement("h2");
    h.textContent = q.art === "ab" ? "AB " + q.ab : q.name;
    var zeile = document.createElement("div");
    zeile.className = "knopfzeile";
    var tun = null;                                                  // AB mit nur einer Baugruppe: nichts aufzusplitten, nur ansehen
    if (q.art !== "ab" || q.bgs > 1) {
      tun = document.createElement("button");
      tun.type = "button";
      tun.className = "knopf-haupt";
      tun.textContent = q.art === "ab" ? "AB aufsplitten" : "AB zusammenführen";
      tun.addEventListener("click", function () { FWM.schliessen(); (q.art === "ab" ? teilen : zusammen)(q); });
    }
    var zu = document.createElement("button");
    zu.type = "button";
    zu.className = "knopf-rot";
    zu.textContent = "Abbrechen";
    zu.setAttribute("data-schliessen", "");
    var liste = document.createElement("a");
    liste.className = "knopf";
    liste.href = dlg.getAttribute("data-liste") + "?ab=" + q.abId;       // Bestandsliste nur mit diesem AB
    liste.textContent = "In der Bestandsliste anzeigen";
    if (tun) zeile.append(tun);
    zeile.append(liste, zu);
    box.append(h, zeile);
    FWM.zeigen(box);
  }
  document.addEventListener("contextmenu", function (e) {
    var el = dlg && e.target.closest && e.target.closest("[data-platz-auf]");
    if (!el) return;
    e.preventDefault();
    menue(quelle(el));
  });
  // Handy: kein Rechtsklick, darum öffnet der Knopf „AB-Menü“ im Platzfenster dasselbe Menü
  document.addEventListener("click", function (e) {
    if (!dlg || !aktiv || !e.target.closest("#platz-dialog [data-menue-knopf]")) return;
    dlg.close();
    menue(aktiv);
  });
  document.addEventListener("keydown", function (e) {
    var tippen = e.target.closest && e.target.closest("[data-platz-auf]");
    if (tippen && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); tippen.click(); return; }
    if (e.key === "Enter" && e.target.id === "pd-text") {
      e.preventDefault();
      dlg.querySelector("[data-frei]").click();
    }
  });

  // Ziehen und Ablegen (PC): Eintrag auf ein Fach
  var gezogen = null;
  document.addEventListener("dragstart", function (e) {
    var el = e.target.closest && e.target.closest("[data-platz-auf][draggable]");
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
    var fach = gezogen && e.target.closest && e.target.closest("[data-ablage]");
    if (!fach) return;
    e.preventDefault();
    fach.classList.add("drueber");
  });
  document.addEventListener("dragleave", function (e) {
    var fach = e.target.closest && e.target.closest("[data-ablage]");
    if (fach && !fach.contains(e.relatedTarget)) fach.classList.remove("drueber");
  });
  document.addEventListener("drop", function (e) {
    var fach = gezogen && e.target.closest && e.target.closest("[data-ablage]");
    if (!fach) return;
    e.preventDefault();
    fach.classList.remove("drueber");
    var ziel = fach.getAttribute("data-ablage");
    if (ziel !== gezogen.platz) setzen(gezogen, ziel, false);
    gezogen = null;
  });
})();

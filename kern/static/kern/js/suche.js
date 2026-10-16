// Suche von überall: Lupe in der Kopfleiste öffnet das Feld, Treffer erscheinen beim Tippen
(function () {
  var knopf = document.querySelector(".suche-knopf");
  var feld = document.getElementById("suche-feld");
  if (!knopf || !feld) return;
  var eingabe = document.getElementById("kopfsuche");
  var liste = document.getElementById("suche-treffer");
  var warte = null, anfrage = 0;

  function auf(offen) {
    feld.hidden = !offen;
    knopf.setAttribute("aria-expanded", offen ? "true" : "false");
    if (offen) eingabe.focus();
  }

  function laden() {
    var q = eingabe.value.trim();
    var nr = ++anfrage;
    if (q.length < 2) { liste.innerHTML = ""; return; }
    fetch(feld.dataset.url + "?q=" + encodeURIComponent(q), { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (html) { if (nr === anfrage) liste.innerHTML = html; })
      .catch(function () {});
  }

  knopf.addEventListener("click", function () { auf(feld.hidden); });
  eingabe.addEventListener("input", function () { clearTimeout(warte); warte = setTimeout(laden, 250); });
  document.addEventListener("keydown", function (e) {
    var t = e.target, tippt = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (e.key === "Escape" && !feld.hidden) { auf(false); knopf.focus(); }
    else if (e.key === "/" && !tippt && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); auf(true); }
  });
  document.addEventListener("click", function (e) {
    if (!feld.hidden && !feld.contains(e.target) && !knopf.contains(e.target)) auf(false);
  });
})();

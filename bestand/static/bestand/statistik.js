// Statistik: beim Umschalten (Woche/Monat/Jahr, ABs/Bauteile) die Scrollposition halten, statt nach oben zu springen.
(function () {
  var KEY = "statistik-scroll";
  try {
    var y = sessionStorage.getItem(KEY);
    if (y !== null) {
      sessionStorage.removeItem(KEY);
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
      window.scrollTo(0, parseInt(y, 10) || 0);
    }
  } catch (x) { /* ohne Speicher */ }
  document.addEventListener("click", function (e) {
    var a = e.target.closest(".leiste-knoepfe a[href^='?']");
    if (!a) return;
    try { sessionStorage.setItem(KEY, String(window.scrollY)); } catch (x) { /* ohne Speicher */ }
  });
})();

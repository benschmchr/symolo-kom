// Menü am Handy auf- und zuklappen
document.addEventListener("click", function (e) {
  var k = e.target.closest(".menue-knopf");
  if (!k) return;
  var m = document.getElementById(k.getAttribute("aria-controls"));
  var offen = m.classList.toggle("offen");
  k.setAttribute("aria-expanded", offen ? "true" : "false");
});

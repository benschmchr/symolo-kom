"""Forecast (R-F1 bis R-F12): ansehen darf jeder (W2); importieren und die Forecast-Daten sehen nur Planung (R-F11)."""

from django.contrib import messages
from django.core.paginator import Paginator
from django.shortcuts import redirect, render

from kern.rollen import STAHLBAU, hat_rolle, rolle_noetig
from kern.zeit import heute

from . import ansicht, dashboard, forecast, planung, protokoll
from .models import Forecasteinstellung

DATEN_JE_SEITE = 250


def einstellung() -> Forecasteinstellung:
    e, _ = Forecasteinstellung.objects.get_or_create(pk=1)
    return e


def forecast_seite(request):
    tag = heute()
    abs_ = ansicht.baum()
    zustand = dashboard.zustand_lesen(request, "forecast")
    werte = dict(dashboard.ANSICHTEN)
    wahl = request.GET.get("ansicht", "")
    if wahl not in werte:
        wahl = zustand.get("ansicht") if zustand.get("ansicht") in werte else dashboard.STANDARD
    if zustand.get("ansicht") != wahl or request.GET.get("neu") == "1":  # wie R-DB4: Ansicht umgestellt → Startzustand
        zustand = {"ansicht": wahl, "klappen": {}}
        if "ansicht" in request.GET:
            dashboard.zustand_schreiben(request, zustand, "forecast")
    zeitraeume = [(w, t) for w, t, _ in forecast.ZEITRAEUME]
    zeitraum = request.GET.get("termin", "")
    if zeitraum not in dict(zeitraeume):
        zeitraum = forecast.STANDARD_ZEITRAUM
    suche = request.GET.get("q", "").strip()
    kunden = dashboard.kunden(abs_)
    kunde = {k.casefold(): k for k in kunden}.get(
        request.GET.get("kunde", "").strip().casefold(), dashboard.ALLE_KUNDEN
    )
    f = forecast.aktuell()
    liste = forecast.liste(forecast.mit_schweissen(abs_), forecast.termine() if f else {}, tag, zeitraum, suche, kunde)
    dashboard.klappen(liste, wahl, zustand.get("klappen") or {})
    planung.markieren(liste)
    planung.orte_setzen(liste)
    return render(
        request,
        "bestand/forecast.html",
        {
            "darf_planen": planung.darf_planen(request.user),
            "station": True,
            "liste": liste,
            "kopf": forecast.kopf(liste, f, tag),
            "f": f,
            "ansichten": dashboard.ANSICHTEN,
            "ansicht": wahl,
            "zeitraeume": zeitraeume,
            "zeitraum": zeitraum,
            "q": suche,
            "kunden": kunden,
            "kunde": kunde,
            "gefiltert": bool(suche) or kunde != dashboard.ALLE_KUNDEN,
            "planung": hat_rolle(request.user, STAHLBAU),
        },
    )


@rolle_noetig(STAHLBAU)
def forecast_import(request):
    """Forecast-Liste hochladen (W8: erst Hochladen, automatischer Abruf später). Ersetzt den ganzen Forecast (R-F4)."""
    e = einstellung()
    if request.method == "POST":
        if "quelle" in request.POST:  # R-F1: Link zur Datei hinterlegen
            e.quelle = forecast.quelle_bereinigen(request.POST.get("quelle", ""))[:1000]
            e.save()
            messages.success(request, "Link gespeichert." if e.quelle else "Link entfernt.")
            return redirect("forecast_import")
        datei = request.FILES.get("datei")
        if not datei:
            messages.error(request, "Bitte die Forecast-Liste auswählen.")
            return redirect("forecast_import")
        if datei.size > forecast.MAX_GROESSE:
            messages.error(request, f"Die Datei ist größer als {forecast.MAX_GROESSE // (1024 * 1024)} MB.")
            return redirect("forecast_import")
        try:
            g = forecast.lesen(datei.read(), datei.name)
        except forecast.ForecastFehler as fehler:
            messages.error(request, str(fehler))
            return redirect("forecast_import")
        erg = forecast.speichern(g, request.user)
        protokoll.schreiben(request.user, "forecast", "", g.datei, "", f"{erg.zeilen} Zeilen")
        messages.success(request, erg.meldung)  # R-F5
        return redirect("forecast")
    return render(
        request,
        "bestand/forecast_import.html",
        {
            "f": forecast.aktuell(),
            "quelle": e.quelle,
            "max_mb": forecast.MAX_GROESSE // (1024 * 1024),
            "link": e.quelle if e.quelle.lower().startswith(("http://", "https://")) else "",
        },
    )


@rolle_noetig(STAHLBAU)
def forecast_daten(request):
    """R-F11: die importierte Forecast-Liste mit allen Spalten (in Excel nur mit Passwort, hier Rolle Stahlbau)."""
    f = forecast.aktuell()
    q = request.GET.get("q", "").strip()
    zeilen = f.zeilen.all() if f else []
    gesamt = len(zeilen) if f else 0
    if f and q:
        qq = q.casefold()
        zeilen = [z for z in zeilen if qq in z.schluessel.casefold() or any(qq in str(w).casefold() for w in z.werte)]
    seite = Paginator(zeilen, DATEN_JE_SEITE).get_page(request.GET.get("seite"))
    return render(
        request,
        "bestand/forecast_daten.html",
        {"f": f, "q": q, "seite": seite, "gesamt": gesamt, "treffer": len(zeilen)},
    )

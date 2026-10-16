"""Planung: alle ABs mit Planungs-Häkchen (ansehen darf jeder, haken Planung/Schweißen/Admin)."""

import json
from datetime import date

from django.http import JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_POST

from kern.rollen import KOMMISSIONIERUNG, STAHLBAU, rolle_noetig

from . import dashboard, forecast, planung, views_forecast

SEITE = "planung"
SORTIERUNGEN = [("termin", "Liefertermin"), ("ab", "Fortschritt absteigend"), ("auf", "Fortschritt aufsteigend")]
SORT_STANDARD = "termin"


def planung_seite(request):
    tag = views_forecast.heute()
    abs_ = planung.geplante(planung.alle_abs())
    zustand = dashboard.zustand_lesen(request, SEITE)
    werte = dict(dashboard.ANSICHTEN)
    wahl = request.GET.get("ansicht", "")
    if wahl not in werte:
        wahl = zustand.get("ansicht") if zustand.get("ansicht") in werte else dashboard.STANDARD
    if zustand.get("ansicht") != wahl or request.GET.get("neu") == "1":
        zustand = {"ansicht": wahl, "klappen": {}}
        if "ansicht" in request.GET:
            dashboard.zustand_schreiben(request, zustand, SEITE)
    suche = request.GET.get("q", "").strip()
    kunden = dashboard.kunden(abs_)
    kunde = {k.casefold(): k for k in kunden}.get(
        request.GET.get("kunde", "").strip().casefold(), dashboard.ALLE_KUNDEN
    )
    sort = request.GET.get("sort", SORT_STANDARD)
    if sort not in dict(SORTIERUNGEN):
        sort = SORT_STANDARD
    termine = forecast.termine() if forecast.aktuell() else {}
    liste = dashboard.sortieren(dashboard.filtern(abs_, suche, kunde), "" if sort == "termin" else sort)
    for d in liste:
        d.termin = forecast.termin_von(d.a, termine)
    if sort == "termin":  # früheste Liefertermine oben, ohne Termin unten
        liste.sort(key=lambda d: (d.termin is None, d.termin or date.max, dashboard._text(d.a.o.ab_anzeige)))
    dashboard.klappen(liste, wahl, zustand.get("klappen") or {})
    planung.markieren(liste)
    planung.orte_setzen(liste)
    return render(
        request,
        "bestand/planung.html",
        {
            "liste": liste,
            "kopf": {"heute": tag, "ab": len(abs_)},
            "ansichten": dashboard.ANSICHTEN,
            "ansicht": wahl,
            "q": suche,
            "kunden": kunden,
            "kunde": kunde,
            "gefiltert": bool(suche) or kunde != dashboard.ALLE_KUNDEN,
            "sort": sort,
            "sortierungen": SORTIERUNGEN,
            "darf_planen": planung.darf_planen(request.user),
            "station": True,
            "termin_sp": True,
            "klapp_url": reverse("planung_klappen"),
            "reset_url": reverse("planung"),
            "leer_text": "Noch kein Arbeitsauftrag zur Planung vorgemerkt. Im Dashboard oder im Forecast in der Spalte „Planung“ abhaken.",
        },
    )


@require_POST
@rolle_noetig(KOMMISSIONIERUNG, STAHLBAU)
def haken(request):
    """Häkchen setzen oder entfernen: {schluessel, an}. Serverseitig geprüft (Rolle Kommissionierung, Stahlbau oder Admin)."""
    try:
        d = json.loads(request.body or b"{}")
        schluessel, an = str(d["schluessel"]), bool(d["an"])
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"fehler": "Ungültige Angabe."}, status=400)
    if not schluessel or len(schluessel) > 80 or not planung.umschalten(schluessel, an, request.user):
        return JsonResponse({"fehler": "Diesen Arbeitsauftrag gibt es nicht (mehr)."}, status=404)
    return JsonResponse({"ok": True, "an": an})

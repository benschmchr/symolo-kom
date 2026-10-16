"""Dashboard (R-DB1 bis R-DB6): ansehen darf jeder (W2); der Klappzustand wird je Benutzer gemerkt (R-DB4)."""

import json

from django.http import JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.http import require_POST

from . import ansicht, dashboard, planung, schweissen

MAX_SCHLUESSEL = 3000  # Schutz: so viele gemerkte Zustände reichen für jede Liste


def dashboard_seite(request):
    abs_ = ansicht.baum()
    zustand = dashboard.zustand_lesen(request)
    werte = dict(dashboard.ANSICHTEN)
    wahl = request.GET.get("ansicht", "")
    if wahl not in werte:
        wahl = zustand.get("ansicht") if zustand.get("ansicht") in werte else dashboard.STANDARD
    if zustand.get("ansicht") != wahl or request.GET.get("neu") == "1":  # R-DB4: Ansicht umgestellt → Startzustand
        zustand = {"ansicht": wahl, "klappen": {}}
        if "ansicht" in request.GET:  # Gäste ohne eigene Wahl: keine Sitzung anlegen
            dashboard.zustand_schreiben(request, zustand)
    suche = request.GET.get("q", "").strip()
    kunden = dashboard.kunden(abs_)
    kunde = {k.casefold(): k for k in kunden}.get(
        request.GET.get("kunde", "").strip().casefold(), dashboard.ALLE_KUNDEN
    )
    sort = request.GET.get("sort", dashboard.SORT_STANDARD)
    if sort not in dict(dashboard.SORTIERUNGEN):
        sort = dashboard.SORT_STANDARD
    liste = dashboard.sortieren(dashboard.filtern(abs_, suche, kunde), sort)
    dashboard.klappen(liste, wahl, zustand.get("klappen") or {})
    planung.markieren(liste)
    im_sw = schweissen.im_schweissen(d.a.o.ab_schluessel for d in liste)
    for d in liste:  # Ben, 15.10.: Baugruppen im Schweißen stehen unten, grau und durchgestrichen
        d.im_sw = im_sw.get(d.a.o.ab_schluessel, [])
    return render(
        request,
        "bestand/dashboard.html",
        {
            "darf_planen": planung.darf_planen(request.user),
            "klapp_url": reverse("dashboard_klappen"),
            "reset_url": reverse("dashboard"),
            "liste": liste,
            "kopf": dashboard.kopf(abs_),
            "ansichten": dashboard.ANSICHTEN,
            "ansicht": wahl,
            "q": suche,
            "kunden": kunden,
            "kunde": kunde,
            "gefiltert": bool(suche) or kunde != dashboard.ALLE_KUNDEN,
            "sort": sort,
            "sortierungen": dashboard.SORTIERUNGEN,
        },
    )


@require_POST
def klappen_merken(request, seite=dashboard.SEITE):
    """Ein AB oder eine Gruppe wurde auf- oder zugeklappt: {ansicht, schluessel, offen}. Auch für Gäste (Sitzung).
    Dashboard und Forecast merken getrennt (seite)."""
    try:
        d = json.loads(request.body or b"{}")
        wahl, schluessel, offen = d["ansicht"], str(d["schluessel"]), bool(d["offen"])
    except (ValueError, KeyError, TypeError):
        return JsonResponse({"fehler": "Ungültige Angabe."}, status=400)
    if wahl not in dict(dashboard.ANSICHTEN) or not schluessel or len(schluessel) > 500:
        return JsonResponse({"fehler": "Ungültige Angabe."}, status=400)
    zustand = dashboard.zustand_lesen(request, seite)
    if zustand.get("ansicht") != wahl:
        zustand = {"ansicht": wahl, "klappen": {}}
    klappen = dict(zustand.get("klappen") or {})
    klappen[schluessel] = offen
    if len(klappen) > MAX_SCHLUESSEL:
        return JsonResponse({"fehler": "Zu viele gemerkte Einträge."}, status=400)
    zustand["klappen"] = klappen
    dashboard.zustand_schreiben(request, zustand, seite)
    return JsonResponse({"ok": True})

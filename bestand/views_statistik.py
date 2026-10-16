"""Statistik: ansehen darf jeder (W2). Die Diagramme sind reines HTML/CSS, die Schalter sind Links (kein JavaScript nötig)."""

from django.shortcuts import render

from . import statistik, views_forecast


def statistik_seite(request):
    tag = views_forecast.heute()
    was = request.GET.get("was", statistik.WAS_STANDARD)
    if was not in dict(statistik.WAS):
        was = statistik.WAS_STANDARD
    art = "ab" if was == "abs" else "teil"
    zeit = request.GET.get("zeit", statistik.ZEIT_STANDARD)
    if zeit not in dict(statistik.ZEITEN):
        zeit = statistik.ZEIT_STANDARD
    e = statistik.alle_eintraege()
    spaet_balken, spaet = statistik.verspaetung(e, tag)
    return render(
        request,
        "bestand/statistik.html",
        {
            "was": was,
            "was_liste": statistik.WAS,
            "zeit": zeit,
            "zeiten": statistik.ZEITEN,
            "soll": statistik.SOLL,
            "monat": statistik.liefertreue_monat(e, art, tag),
            "ia": statistik.liefertreue_ia(e, art, tag),
            "dlz": statistik.durchlaufzeit(e, zeit, tag),
            "ueberfaellig": statistik.ueberfaellig(e, tag),
            "heute": tag,
            "spaet_balken": spaet_balken,
            "spaet": spaet,
        },
    )

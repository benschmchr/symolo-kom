from django.shortcuts import render

from . import suche


def _daten(request):
    q = suche.bereinigen(request.GET.get("q"))
    return {"q": q, "zu_kurz": 0 < len(q) < suche.MIN_ZEICHEN, "gruppen": suche.suchen(q, request.user)}


def seite(request):
    """Alle Treffer als eigene Seite (auch ohne JavaScript: Eingabetaste im Suchfeld der Kopfleiste)."""
    return render(request, "bestand/suche.html", _daten(request))


def treffer(request):
    """Nur die Trefferliste, für die Anzeige unter dem Suchfeld in der Kopfleiste."""
    return render(request, "bestand/_suche_treffer.html", _daten(request))

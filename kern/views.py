from django.contrib.auth.decorators import login_required
from django.http import Http404
from django.shortcuts import render

from .context_processors import MENUE
from .rollen import ALLE, BESCHREIBUNG, rollen_von

BEREICHE = {name: (titel, phase) for name, titel, phase in MENUE}


def start(request):
    """Übersicht mit Kennzahlen aus der Bestandsliste (D3). Regal, Arbeitsplätze, Forecast folgen in ihren Phasen."""
    from django.utils import timezone

    from bestand.uebersicht import kennzahlen

    return render(request, "kern/start.html", {"u": kennzahlen(timezone.localdate())})


def bereich(request, name):
    """Platzhalter für Bereiche, die in späteren Phasen gebaut werden."""
    if name not in BEREICHE:
        raise Http404
    titel, phase = BEREICHE[name]
    return render(request, "kern/bereich.html", {"bereich": name, "titel": titel, "phase": phase})


def hilfe(request):
    """Hilfe: Ansprechpartner, Anleitung und mögliche Probleme (Ben, 15.10.2026)."""
    return render(request, "kern/hilfe.html", {"hilfe_mail": "b.schumacher@fwmlebach.de"})


@login_required
def konto(request):
    eigene = rollen_von(request.user)
    rollen = [(r, BESCHREIBUNG[r], r in eigene) for r in ALLE]
    return render(request, "kern/konto.html", {"rollen": rollen})


def verboten(request, exception=None):
    return render(
        request,
        "kern/fehler.html",
        {
            "titel": "Keine Berechtigung",
            "text": "Für diese Aktion fehlt Ihnen die passende Rolle. Bitte beim Admin melden.",
        },
        status=403,
    )


def nicht_gefunden(request, exception=None):
    return render(
        request, "kern/fehler.html", {"titel": "Seite nicht gefunden", "text": "Diese Seite gibt es nicht."}, status=404
    )

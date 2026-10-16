"""Regal (R-R1 bis R-R5), Lagerort setzen (R-L1 bis R-L4)."""

from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from kern.rollen import KOMMISSIONIERUNG, STAHLBAU, hat_rolle, rolle_noetig

from . import ansicht, lagerort, protokoll
from .models import Auftrag, Baugruppe


def _rechte(request):
    return {
        "darf_mengen": hat_rolle(request.user, KOMMISSIONIERUNG),
        "darf_entnehmen": hat_rolle(request.user, STAHLBAU),
    }


# ---------- Regal ----------
def regal(request):
    r = lagerort.regal(ansicht.baum())
    return render(
        request,
        "bestand/regal.html",
        {**r, **_rechte(request), "r3_name": lagerort.R3_NAME, "etagen_nr": lagerort.ETAGEN},
    )


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def platz_setzen(request):
    """R-R5 / R-L2: Platz an einem AB („ab“) oder einer BG („bg“) setzen. Freier Text (kein Regalplatz) nur mit
    Bestätigung („frei=1“, R-L4). Antwort: alle Zeilen des AB (Lagerort, Status …) wie beim Mengen-Eintragen."""
    text = request.POST.get("platz", "")
    try:
        neu = lagerort.eingabe(text)
    except lagerort.PlatzFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    if neu and not lagerort.ist_gueltig(neu) and request.POST.get("frei") != "1":
        return JsonResponse(
            {
                "frage": f"„{neu}“ ist kein Regalplatz (L1–L6, R1–R6). Trotzdem eintragen? "
                "Er steht dann im Regal unter „Sonstiges“."
            },
            status=409,
        )
    if not any(request.POST.get(k, "").isdigit() for k in ("ab", "bg")):
        raise Http404
    if request.POST.get("bg", "").isdigit():
        ziel = get_object_or_404(
            Baugruppe.objects.select_related("auftrag"), id=request.POST["bg"], auftrag__bereich="bestand"
        )
        alt = ziel.lagerort
        if request.POST.get("regal") == "1" and ziel.auftrag.baugruppen.count() > 1 and not ziel.auftrag.regal_geteilt:
            lagerort.teilen(ziel.auftrag)  # eine Baugruppe einzeln verschieben = der AB ist aufgesplittet
        lagerort.setze_bg(ziel, neu)
        auftrag_id, name, ab, objekt = ziel.auftrag_id, ziel.kurzname, ziel.auftrag.ab_anzeige, f"BG {ziel.name}"
    else:
        ziel = get_object_or_404(Auftrag, id=request.POST["ab"], bereich="bestand")
        alt = ziel.lagerort
        lagerort.setze_ab(ziel, neu)
        auftrag_id, name, ab, objekt = ziel.id, ziel.ab_anzeige, ziel.ab_anzeige, ""
    if alt != neu:
        protokoll.schreiben(request.user, "lagerort", ab, objekt, alt or "leer", neu or "leer")
    a = next(iter(ansicht.baum(Auftrag.objects.filter(id=auftrag_id))))
    antwort = {
        "zeilen": {z.schluessel: ansicht.zeile_json(z) for z in a.zeilen},
        "meldung": f"{name}: {'Platz ' + neu if neu else 'kein Platz mehr'}.",
        "platz": neu,
    }
    if (
        request.POST.get("regal") == "1"
        and request.POST.get("bg", "").isdigit()
        and lagerort.alle_bgs_gleich(auftrag_id)
    ):
        antwort["zusammen"] = request.POST["bg"]  # Rückfrage „AB ist zusammengeführt.“ (Ja/Nein) im Browser
    return JsonResponse(antwort)


def _regal_antwort(meldung):
    return JsonResponse({"meldung": meldung})


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def ab_teilen(request):
    """Regal, Rechtsklick: „AB in Baugruppen aufsplitten“ → im Regal je Baugruppe ein Eintrag."""
    if not request.POST.get("ab", "").isdigit():
        raise Http404
    a = get_object_or_404(Auftrag, id=request.POST["ab"], bereich="bestand")
    try:
        lagerort.teilen(a)
    except lagerort.PlatzFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    protokoll.schreiben(request.user, "lagerort", a.ab_anzeige, "Regal", "AB", "Baugruppen einzeln")
    return _regal_antwort(f"{a.ab_anzeige} ist in Baugruppen aufgesplittet.")


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def ab_zusammenfuehren(request):
    """Regal, Rechtsklick auf eine Baugruppe: der ganze AB wird dort zusammengeführt, wo diese Baugruppe liegt."""
    if not request.POST.get("bg", "").isdigit():
        raise Http404
    bg = get_object_or_404(
        Baugruppe.objects.select_related("auftrag"), id=request.POST["bg"], auftrag__bereich="bestand"
    )
    ab = bg.auftrag
    platz = lagerort.zusammenfuehren(bg)
    protokoll.schreiben(
        request.user, "lagerort", ab.ab_anzeige, "Regal", "Baugruppen einzeln", f"AB zusammen ({platz or 'kein Platz'})"
    )
    return _regal_antwort(
        f"{ab.ab_anzeige} ist zusammengeführt{' (Platz ' + platz + ')' if platz else ' (nicht einsortiert)'}."
    )

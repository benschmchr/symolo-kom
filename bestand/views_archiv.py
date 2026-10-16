"""Archiv (R-X3: nur lesen und durchsuchen; Wiederherstellen Kommissionierung und Admin) und Änderungsprotokoll (W7, nur Admin)."""

from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Count
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from kern.rollen import ADMIN, KOMMISSIONIERUNG, hat_rolle, rolle_noetig

from . import archiv, protokoll
from .models import ARTEN, Aenderung, Archivvorgang

JE_SEITE = 50


# ---------- Archiv ----------
def liste(request):
    q = " ".join(request.GET.get("q", "").split())
    qs = archiv.suchen(q).annotate(anzahl=Count("zeilen")).order_by("-geloescht_am", "-id")
    seite = Paginator(qs, JE_SEITE).get_page(request.GET.get("seite"))
    return render(
        request,
        "bestand/archiv.html",
        {
            "q": q,
            "seite": seite,
            "gesamt": Archivvorgang.objects.count(),
            "darf_wiederherstellen": hat_rolle(request.user, KOMMISSIONIERUNG),
        },
    )


def ab(request, vorgang_id):
    v = get_object_or_404(Archivvorgang, id=vorgang_id)
    q = " ".join(request.GET.get("q", "").split())
    zeilen = list(v.zeilen.all())
    for z in zeilen:
        z.treffer = archiv.treffer(z, q)
    return render(
        request,
        "bestand/archiv_ab.html",
        {
            "v": v,
            "zeilen": zeilen,
            "q": q,
            "kopf": [name for name, _ in archiv.ARCHIV_KOPF],
            "felder": [f for _, f in archiv.ARCHIV_KOPF],
            "darf_wiederherstellen": hat_rolle(request.user, KOMMISSIONIERUNG) and archiv.darf_wiederherstellen(v),
        },
    )


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def wiederherstellen(request, vorgang_id):
    v = get_object_or_404(Archivvorgang, id=vorgang_id)
    name = v.ab_anzeige
    try:
        a = archiv.wiederherstellen(v.id)
    except archiv.ArchivFehler as e:
        messages.error(request, str(e))
        return redirect("archiv_ab", vorgang_id)
    if a is None:  # aus Schweißen archiviert: zurück ins Schweißen
        protokoll.schreiben(request.user, "wiederhergestellt", name, "", "Archiv", "Schweißen")
        messages.success(request, f"{name} ist wieder im Schweißen.")
        return redirect("schweissen")
    protokoll.schreiben(request.user, "wiederhergestellt", name, "", "Archiv", "Bestandsliste")
    messages.success(request, f"{name} ist wieder in der Bestandsliste.")
    return redirect(reverse("bestandsliste") + f"?zu={a.id}#ab-{a.id}")


# ---------- Änderungsprotokoll (nur Admin) ----------
@rolle_noetig(ADMIN)
def protokoll_liste(request):
    e = protokoll.einstellung()
    protokoll.aufraeumen(e)
    q = " ".join(request.GET.get("q", "").split())
    art = request.GET.get("art", "")
    wer = request.GET.get("wer", "")
    qs = Aenderung.objects.all()
    if q:
        qs = qs.filter(ab__icontains=q) | qs.filter(objekt__icontains=q)
    if art in dict(ARTEN):
        qs = qs.filter(art=art)
    if wer:
        qs = qs.filter(benutzer_name=wer)
    namen = (
        Aenderung.objects.exclude(benutzer_name="")
        .order_by("benutzer_name")
        .values_list("benutzer_name", flat=True)
        .distinct()
    )
    seite = Paginator(qs, 100).get_page(request.GET.get("seite"))
    return render(
        request,
        "bestand/protokoll.html",
        {
            "e": e,
            "seite": seite,
            "q": q,
            "art": art,
            "wer": wer,
            "arten": ARTEN,
            "namen": namen,
            "gesamt": Aenderung.objects.count(),
        },
    )


@require_POST
@rolle_noetig(ADMIN)
def protokoll_einstellen(request):
    e = protokoll.einstellung()
    namen_vorher = e.namen
    e.aktiv = request.POST.get("aktiv") == "1"
    e.namen = request.POST.get("namen") == "1"
    tage = request.POST.get("tage", "").strip()
    if not tage.isdigit() or int(tage) > 3650:
        messages.error(request, "Aufbewahren: bitte eine Zahl von 0 bis 3650 Tagen (0 = unbegrenzt).")
        return redirect("protokoll")
    e.tage = int(tage)
    e.save()
    text = "Einstellungen gespeichert."
    if namen_vorher and not e.namen:
        n = protokoll.namen_entfernen()
        text += f" Namen aus {n} Einträgen entfernt."
    weg = protokoll.aufraeumen(e)
    if weg:
        text += f" {weg} alte Einträge gelöscht."
    messages.success(request, text)
    return redirect("protokoll")


@require_POST
@rolle_noetig(ADMIN)
def protokoll_leeren(request):
    if request.POST.get("sicher") != "ja":
        messages.error(request, "Zum Leeren bitte das Kästchen „Ja, alle Einträge löschen“ ankreuzen.")
        return redirect("protokoll")
    n = Aenderung.objects.all().delete()[0]
    messages.success(request, f"Protokoll geleert ({n} Einträge gelöscht).")
    return redirect("protokoll")

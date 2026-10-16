"""Schweißen (R-W1 bis R-W10) und Arbeitsplätze (R-AP1 bis R-AP7).

Ansehen darf jeder (W2). Mitarbeiter, Arbeitsplatz und Termine tragen Schweißen (und Admin) ein; Entnehmen,
Archivieren und Zurückholen machen Kommissionierung (Archivieren) und Stahlbau (Zurückholen) (R-P2). Statt des Excel-Passworts 1234 gilt die Rolle (R-P1, R-P2)."""

from django.contrib import messages
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from kern.rollen import KOMMISSIONIERUNG, STAHLBAU, hat_rolle, rolle_noetig

from . import protokoll, schweissen


def _zeile_json(z) -> dict:
    fmt = lambda d: d.strftime("%d.%m.%Y") if hasattr(d, "strftime") else (d or "")  # noqa: E731
    return {
        "mitarbeiter": z.m or "",
        "arbeitsplatz": z.p or "",
        "liefertermin_stahlbau": fmt(z.lt),
        "termin_versand": fmt(z.tv),
        "dlz": z.dlz if z.dlz is not None else "",
    }


def _antwort(meldung="", **extra):
    return JsonResponse(
        {"zeilen": {str(z.id): _zeile_json(z) for z in schweissen.lesen()}, "meldung": meldung, **extra}
    )


# ---------- Schweißen ansehen (R-W10) ----------
def liste(request):
    zeilen = schweissen.lesen()
    bl = schweissen.bloecke(zeilen)
    q = request.GET.get("q", "").strip()
    anzeige = request.GET.get("anzeige", "alles")
    if anzeige not in dict(schweissen.ANZEIGEN):
        anzeige = "alles"
    meldung = ""
    if q:  # wie R-A3: Suche setzt die Anzeige zurück
        anzeige = "alles"
        if not schweissen.suchen(bl, q):
            meldung = f"Kein Treffer für „{q}“."
    elif anzeige != "alles":
        schweissen.filtern(bl, anzeige)
    mit = request.GET.get("mitarbeiter", "")
    platz = request.GET.get("platz", "")
    sort = request.GET.get("sort", "")
    if sort not in dict(schweissen.SORTIERUNGEN):
        sort = ""
    gefiltert = bool(q) or anzeige != "alles"
    sichtbar = [b for b in bl if b.zeigen] if gefiltert else bl
    sichtbar = schweissen.block_filtern(sichtbar, mit, platz)
    if sort:
        sichtbar = schweissen.block_sortieren(sichtbar, sort)
    zu = request.GET.get("zu", "")
    for b in sichtbar:  # Startzustand: Suche = alles auf; „ABs“ = alles zu; „BGs“ = ABs auf, Baugruppen zu
        if q or anzeige == "alles" and (mit or platz):
            b.offen = b.bgs_offen = True
        elif anzeige in ("ab", "bg"):
            b.offen, b.bgs_offen = anzeige == "bg", False
        else:
            b.offen = b.bgs_offen = str(b.kopf.id) == zu
    return render(
        request,
        "bestand/schweissen.html",
        {
            "bloecke": _sammeln(sichtbar, q, anzeige),
            "anzahl": len({b.kopf.ab_schluessel if b.einzeln else b.kopf.id for b in bl}),
            "anz_einzeln": sum(b.einzeln for b in bl),
            "q": q,
            "anzeige": anzeige,
            "anzeigen": schweissen.ANZEIGEN,
            "meldung": meldung,
            "plaetze": schweissen.platz_namen(),
            "mit": mit,
            "platz": platz,
            "sort": sort,
            "sortierungen": schweissen.SORTIERUNGEN,
            "mitarbeiter": schweissen.mitarbeiter_namen(),
            "darf_eintragen": hat_rolle(request.user, STAHLBAU),
            "darf_entnehmen": hat_rolle(request.user, STAHLBAU),
            "darf_archivieren": hat_rolle(request.user, KOMMISSIONIERUNG),
        },
    )


def _sammeln(sichtbar, q, anzeige):
    """Einzelblöcke eines AB zu Sammlungen; bei „ABs“ (ohne Suche) starten sie zugeklappt."""
    bloecke = schweissen.sammeln(sichtbar)
    for b in bloecke:
        if b.sammlung:
            b.offen = bool(q) or anzeige != "ab"
    return bloecke


@require_POST
@rolle_noetig(STAHLBAU)
def eintragen(request, zeile_id):
    """R-W6: Mitarbeiter, Arbeitsplatz oder Termin an einer AB- oder BG-Zeile; wird an alles darunter vererbt."""
    feld = request.POST.get("feld", "")
    try:
        z, alt, neu = schweissen.setzen(zeile_id, feld, request.POST.get("wert", ""))
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    name = dict(schweissen.EINGABEN)[feld]
    if alt != neu:
        protokoll.schreiben(request.user, "schweissen", z.ab_nr, f"{name}: {schweissen.anzeigename(z)}", alt, neu)
    return _antwort(f"{z.anzeige}: {name} {'gesetzt' if neu != 'leer' else 'entfernt'}.")


@require_POST
@rolle_noetig(STAHLBAU)
def mitarbeiter_verwalten(request):
    """„Mitarbeiter verwalten“: Namen eintragen („neu“) oder austragen („weg“). Bereits gewählte Zuweisungen bleiben stehen."""
    aktion, name = request.POST.get("aktion", ""), request.POST.get("name", "")
    try:
        if aktion == "neu":
            n = schweissen.mitarbeiter_neu(name)
            protokoll.schreiben(request.user, "schweissen", "", "Mitarbeiterliste", "", n)
        elif aktion == "weg":
            n = schweissen.mitarbeiter_weg(name)
            protokoll.schreiben(request.user, "schweissen", "", "Mitarbeiterliste", n, "ausgetragen")
        else:
            return JsonResponse({"fehler": "Unbekannte Aktion."}, status=400)
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    return JsonResponse(
        {
            "namen": schweissen.mitarbeiter_namen(),
            "meldung": f"{n} {'eingetragen' if aktion == 'neu' else 'ausgetragen'}.",
        }
    )


# ---------- Sicherheitsfrage (Entnehmen, Archivieren, Zurück) ----------
def _frage(request, titel, frage, hinweis, knopf, zurueck_url, aktion):
    return render(
        request,
        "bestand/sw_frage.html",
        {"titel": titel, "frage": frage, "hinweis": hinweis, "knopf": knopf, "zurueck": zurueck_url, "aktion": aktion},
    )


# ---------- R-W2 Entnehmen (aus der Bestandsliste, Rolle Stahlbau) ----------
@rolle_noetig(STAHLBAU)
def entnehmen(request, auftrag_id, bg_id=None):
    liste_url = reverse("bestandsliste")
    try:
        p = schweissen.pruefen_entnehmen(auftrag_id, bg_id)
    except schweissen.SchweissenFehler as e:
        messages.error(request, str(e))
        return redirect(liste_url)
    if request.method == "POST":
        try:
            p = schweissen.entnehmen(auftrag_id, bg_id)
        except schweissen.SchweissenFehler as e:
            messages.error(request, str(e))
            return redirect(liste_url)
        objekt = "" if p.bg is None else f"BG {p.bg.o.name}"
        protokoll.schreiben(request.user, "entnommen", p.a.o.ab_anzeige, objekt, "Bestandsliste", "Schweißen")
        if p.bg is None:
            text = f"AB {p.a.o.ab_anzeige} liegt jetzt im Schweißen."
        elif p.mit_ab:
            text = (
                f"Baugruppe {p.bg.o.name} liegt jetzt im Schweißen. Damit ist der ganze AB {p.a.o.ab_anzeige} dort "
                "und wird unter seiner AB-Zeile zusammengefasst."
            )
        else:
            text = f"Baugruppe {p.bg.o.name} liegt jetzt im Schweißen (als {p.anzeige})."
        messages.success(request, text)
        if p.bg is not None and not p.mit_ab:  # weiter im selben AB
            return redirect(liste_url + f"?zu={p.a.o.id}#ab-{p.a.o.id}")
        return redirect("schweissen")
    hinweis = ""
    if p.bg is not None and p.mit_ab:
        hinweis = "Das ist die letzte Baugruppe des AB, die AB-Zeile wandert mit."
    return _frage(
        request,
        "Entnehmen",
        p.frage,
        hinweis,
        "Ins Schweißen verschieben",
        liste_url,
        reverse("sw_entnehmen_bg", args=[auftrag_id, bg_id])
        if bg_id
        else reverse("sw_entnehmen_ab", args=[auftrag_id]),
    )


# ---------- R-W8 Archivieren (Rolle Kommissionierung) ----------
@rolle_noetig(KOMMISSIONIERUNG)
def archivieren(request, zeile_id):
    try:
        z, n = schweissen.pruefen_archivieren(zeile_id)
    except schweissen.SchweissenFehler as e:
        messages.error(request, str(e))
        return redirect("schweissen")
    if request.method == "POST":
        try:
            v, n = schweissen.archivieren(zeile_id)
        except schweissen.SchweissenFehler as e:
            messages.error(request, str(e))
            return redirect("schweissen")
        protokoll.schreiben(request.user, "archiviert", v.ab_anzeige, "", f"{n} Zeilen", "Archiv")
        messages.success(request, f"AB {v.ab_anzeige} ist archiviert ({n} Zeilen, siehe Archiv).")
        return redirect("schweissen")
    return _frage(
        request,
        "Archivieren",
        f"AB {z.ab_nr} mit {n} Zeilen ins Archiv verschieben?",
        "Er verschwindet aus dem Schweißen, alle Angaben bleiben im Archiv erhalten.",
        "Archivieren",
        reverse("schweissen"),
        reverse("sw_archivieren", args=[zeile_id]),
    )


# ---------- R-W9 Zurück in die Bestandsliste (Rolle Stahlbau) ----------
@rolle_noetig(STAHLBAU)
def zurueck(request, zeile_id):
    try:
        r = schweissen.pruefen_zurueck(zeile_id)
    except schweissen.SchweissenFehler as e:
        messages.error(request, str(e))
        return redirect("schweissen")
    if request.method == "POST":
        try:
            a = schweissen.zurueck(zeile_id)
        except schweissen.SchweissenFehler as e:
            messages.error(request, str(e))
            return redirect("schweissen")
        protokoll.schreiben(
            request.user,
            "zurueck",
            a.ab_anzeige,
            "" if r.zeile.ebene == "AB" else f"BG {r.zeile.baugruppe}",
            "Schweißen",
            "Bestandsliste",
        )
        messages.success(request, f"{r.name} ist wieder in der Bestandsliste.")
        return redirect(reverse("bestandsliste") + f"?zu={a.id}#ab-{a.id}")
    return _frage(
        request,
        "Zurück in die Bestandsliste",
        r.frage,
        r.verlust,
        "Zurück in die Bestandsliste",
        reverse("schweissen"),
        reverse("sw_zurueck", args=[zeile_id]),
    )


# ---------- Arbeitsplätze (Hallenplan) ----------
def arbeitsplaetze(request):
    h = schweissen.hallenplan()
    return render(
        request,
        "bestand/arbeitsplaetze.html",
        {
            **h,
            "namen": schweissen.platz_namen(),
            "mitarbeiter": schweissen.mitarbeiter_namen(),
            "darf_aendern": hat_rolle(request.user, STAHLBAU),
        },
    )


@require_POST
@rolle_noetig(STAHLBAU)
def ap_mitarbeiter(request):
    """Rechtsklick im Hallenplan: Mitarbeiter eines Eintrags per Auswahl ändern."""
    eintrag = request.POST.get("eintrag", "")
    try:
        z, alt, neu = schweissen.mitarbeiter_setzen(eintrag, request.POST.get("wert", ""))
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    if alt != neu:
        protokoll.schreiben(
            request.user, "schweissen", z.ab_nr, f"Zuweisung Mitarbeiter: {schweissen.anzeigename(z)}", alt, neu
        )
    return JsonResponse(
        {"meldung": f"{eintrag}: {'Mitarbeiter ' + neu if neu != 'leer' else 'kein Mitarbeiter mehr'}."}
    )


@require_POST
@rolle_noetig(STAHLBAU)
def ap_teilen(request):
    """Rechtsklick auf einen AB im Hallenplan: in Baugruppen aufsplitten."""
    eintrag = request.POST.get("eintrag", "")
    try:
        ab = schweissen.ap_teilen(eintrag)
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    protokoll.schreiben(request.user, "schweissen", ab.ab_nr, "Arbeitsplätze", "AB", "Baugruppen einzeln")
    return JsonResponse({"meldung": f"{eintrag} ist in Baugruppen aufgesplittet."})


@require_POST
@rolle_noetig(STAHLBAU)
def ap_zusammen(request):
    """Rechtsklick auf eine Baugruppe im Hallenplan: der ganze AB wird dort zusammengeführt, wo die Baugruppe liegt."""
    eintrag = request.POST.get("eintrag", "")
    try:
        z, platz, _, _ = schweissen.ap_zusammenfuehren(eintrag)
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    protokoll.schreiben(
        request.user,
        "schweissen",
        z.ab_nr,
        "Arbeitsplätze",
        "Baugruppen einzeln",
        f"AB zusammen ({platz or 'kein Platz'})",
    )
    return JsonResponse(
        {"meldung": f"{z.ab_nr} ist zusammengeführt{' (' + platz + ')' if platz else ' (nicht einsortiert)'}."}
    )


@require_POST
@rolle_noetig(STAHLBAU)
def platz_setzen(request):
    """R-AP5: Arbeitsplatz eines AB oder einer BG ändern (Antippen oder Ziehen und Ablegen)."""
    try:
        z, alt, neu = schweissen.platz_setzen(request.POST.get("eintrag", ""), request.POST.get("platz", ""))
    except schweissen.SchweissenFehler as e:
        return JsonResponse({"fehler": str(e)}, status=400)
    if alt != neu:
        protokoll.schreiben(
            request.user, "schweissen", z.ab_nr, f"Zuweisung Arbeitsplatz: {schweissen.anzeigename(z)}", alt, neu
        )
    name = request.POST.get("eintrag", "")
    return JsonResponse({"meldung": f"{name}: {'Arbeitsplatz ' + neu if neu != 'leer' else 'kein Arbeitsplatz mehr'}."})

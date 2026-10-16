"""Bestandsliste: Anzeige, Mengen eintragen, Import, „AB bearbeiten“ (Soll ändern)."""

from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.db import transaction
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from kern.rollen import KOMMISSIONIERUNG, STAHLBAU, hat_rolle, rolle_noetig
from kern.zeit import heute

from . import ansicht, archiv, importer, protokoll, rechnen, schweissen
from .ab_nummer import ab_form, ab_schluessel
from .models import Auftrag, Teil

SESSION_IMPORT = "bestand_import"
MAX_DATEIEN = 30


# ---------- Anzeige ----------
def liste(request):
    abs_ = ansicht.baum()
    zaehler = ansicht.zaehler(abs_)
    q = request.GET.get("q", "").strip()
    anzeige = request.GET.get("anzeige", "alles")
    status = request.GET.get("status", "alle")
    if anzeige not in dict(ansicht.ANZEIGEN):
        anzeige = "alles"
    if status not in dict(ansicht.STATUS):
        status = "alle"
    zu = request.GET.get("zu", "")
    nur = request.GET.get("ab", "")  # Doppelklick / Regal-Menü: nur dieser AB
    sort = request.GET.get("sort", ansicht.SORT_STANDARD)
    if sort not in dict(ansicht.SORTIERUNGEN):
        sort = ansicht.SORT_STANDARD
    meldung = ""
    if q:  # R-A3: Suche setzt Anzeige und Status zurück
        anzeige, status = "alles", "alle"
        if not ansicht.suchen(abs_, q):
            meldung = f"Kein Treffer für „{q}“."
    elif anzeige != "alles" or status != "alle":
        if not ansicht.filtern(abs_, anzeige, status):
            meldung = "Keine Einträge für diese Auswahl."
    gefiltert = bool(q) or anzeige != "alles" or status != "alle"
    sichtbar = [a for a in abs_ if a.zeigen] if gefiltert else abs_
    if nur.isdigit():
        sichtbar = [a for a in sichtbar if a.o.id == int(nur)]
        if not sichtbar:
            meldung = "Dieser AB ist hier nicht (mehr) zu sehen."
    sichtbar = ansicht.sortieren(sichtbar, sort)
    im_sw = schweissen.im_schweissen(a.o.ab_schluessel for a in sichtbar)
    for i, a in enumerate(sichtbar):  # R-A4 Klappen: Startzustand
        a.im_schweissen = im_sw.get(a.o.ab_schluessel, [])  # Ben, 15.10.: rote Kacheln „Befinden sich im Schweißen“
        if nur.isdigit():
            a.offen = True
        elif anzeige in ("ab", "bg") and not q:  # Knopf „ABs“: alles zu; „BGs“: ABs auf, Baugruppen zu
            a.offen = anzeige == "bg"
        else:
            a.offen = bool(q) or status != "alle" or (str(a.o.id) == zu if zu else i == 0)
        for b in a.bgs:
            b.offen = (
                False
                if anzeige in ("ab", "bg") and not q
                else (bool(q) or status != "alle" or b.w.status != rechnen.KOMPLETT)
            )
    return render(
        request,
        "bestand/liste.html",
        {
            "abs": sichtbar,
            "zaehler": zaehler,
            "q": q,
            "anzeige": anzeige,
            "status": status,
            "anzeigen": ansicht.ANZEIGEN,
            "stati": ansicht.STATUS,
            "sort": sort,
            "sortierungen": ansicht.SORTIERUNGEN,
            "nur": nur,
            "meldung": meldung,
            "darf_mengen": hat_rolle(request.user, KOMMISSIONIERUNG),
            "darf_import": hat_rolle(request.user, KOMMISSIONIERUNG),
            "darf_ab_aendern": hat_rolle(request.user, KOMMISSIONIERUNG),
            "darf_entnehmen": hat_rolle(request.user, STAHLBAU),
        },
    )


def _antwort(auftrag_id, hinweis=""):
    """JSON mit allen Zeilen des AB und den Zählern: der Browser aktualisiert damit PC- und Handy-Ansicht."""
    alle = ansicht.baum()
    a = next((x for x in alle if x.o.id == auftrag_id), None)
    if a is None:
        raise Http404
    return JsonResponse(
        {
            "zeilen": {z.schluessel: ansicht.zeile_json(z) for z in a.zeilen},
            "zaehler": ansicht.zaehler(alle),
            "hinweis": hinweis,
        }
    )


def _menge_eingabe(text: str):
    """R-M1: nur ganze Zahlen ≥ 0, leer erlaubt; „5“, „ 5 “, „5,0“ → 5. Liefert (Wert, Fehler)."""
    t = (text or "").strip().replace(",", ".")
    if t == "":
        return None, ""
    if rechnen.punkt_mehrdeutig(text):
        return None, rechnen.MELDUNG_PUNKT
    try:
        d = Decimal(t)
    except InvalidOperation:
        return None, "Bitte eine ganze Zahl eintragen (0 oder mehr)."
    if not d.is_finite() or d < 0 or d != d.to_integral_value():
        return None, "Bitte eine ganze Zahl eintragen (0 oder mehr)."
    if d > rechnen.MAX_MENGE:
        return None, rechnen.MELDUNG_ZU_GROSS
    return Decimal(int(d)), ""


def _teile_sperren(qs=None):
    """Teile zum Ändern sperren, mit AB und BG für das Protokoll."""
    qs = Teil.objects.all() if qs is None else qs
    return qs.select_for_update(of=("self",)).select_related("auftrag", "baugruppe")


def _mtext(x) -> str:
    return rechnen.zahl_text(x) if x is not None else "leer"


def _setze(teil: Teil, wert, benutzer=None):
    """Vorhanden setzen und R-T1 anwenden; geänderte Menge ins Änderungsprotokoll (W7)."""
    if teil.vorhanden != wert:
        protokoll.schreiben(
            benutzer,
            "menge",
            teil.auftrag.ab_anzeige,
            protokoll.teil_objekt(teil),
            _mtext(teil.vorhanden),
            _mtext(wert),
        )
    teil.vorhanden = wert
    teil.datum_eingelagert, teil.datum_komplett = rechnen.daten_stempeln(
        wert, teil.menge_gesamt, teil.datum_eingelagert, teil.datum_komplett, heute()
    )
    teil.version += 1
    teil.save(update_fields=["vorhanden", "datum_eingelagert", "datum_komplett", "version"])


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def vorhanden(request, teil_id):
    """Menge eines Teils eintragen. Jede Eingabe wird sofort gespeichert."""
    wert, fehler = _menge_eingabe(request.POST.get("wert", ""))
    if fehler:
        return JsonResponse({"fehler": fehler}, status=400)
    with transaction.atomic():
        teil = get_object_or_404(_teile_sperren(), id=teil_id)
        hinweis = ""
        version = request.POST.get("version", "")
        if version.isdigit() and int(version) != teil.version and teil.vorhanden != wert:
            alt = rechnen.zahl_text(teil.vorhanden) if teil.vorhanden is not None else "leer"
            hinweis = (
                f"Achtung: {teil.zeichnungsnummer} wurde inzwischen von jemand anderem geändert "
                f"(zuletzt {alt}). Dein Wert gilt jetzt."
            )
        _setze(teil, wert, request.user)
    return _antwort(teil.auftrag_id, hinweis)


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def umschalten(request, teil_id):
    """R-M2: Teil Komplett → Vorhanden 0, sonst Vorhanden = Soll (ohne Rückfrage)."""
    with transaction.atomic():
        teil = get_object_or_404(_teile_sperren(), id=teil_id)
        if teil.menge_gesamt is not None:
            komplett = rechnen.teil_code(teil.vorhanden, teil.menge_gesamt) == 2
            _setze(teil, Decimal(0) if komplett else teil.menge_gesamt, request.user)
    return _antwort(teil.auftrag_id)


@require_POST
@rolle_noetig(KOMMISSIONIERUNG)
def alles_vorhanden(request, auftrag_id):
    """R-M3: AB/BG nicht komplett → alle Teile auf Soll (größere Mengen bleiben); komplett → alle auf 0."""
    bg_id = request.POST.get("bg", "")
    with transaction.atomic():
        a = get_object_or_404(Auftrag.objects.select_for_update(), id=auftrag_id)
        teile = list(_teile_sperren(a.teile.all()))
        if bg_id:
            teile = [t for t in teile if str(t.baugruppe_id) == bg_id]
            if not teile and not a.baugruppen.filter(id=bg_id).exists():
                raise Http404
        komplett = bool(teile) and rechnen.sammel([ansicht.teil_werte(t) for t in teile]).status == rechnen.KOMPLETT
        for t in teile:
            if komplett:
                _setze(t, Decimal(0), request.user)
            elif t.menge_gesamt is not None and (t.vorhanden is None or t.vorhanden < t.menge_gesamt):
                _setze(t, t.menge_gesamt, request.user)
    return _antwort(a.id)


# ---------- Import (Rolle Kommissionierung) ----------
@rolle_noetig(KOMMISSIONIERUNG)
def import_start(request):
    """Schritt 1: Dateien hochladen und prüfen. Schritt 2 (Vorschau mit Rückfrage „ersetzen?“) zeigt dieselbe Seite."""
    if request.method == "POST":
        dateien = request.FILES.getlist("dateien")[:MAX_DATEIEN]
        if not dateien:
            messages.error(request, "Bitte mindestens eine Kommissionierliste auswählen.")
            return redirect("bestand_import")
        gelesen, fehler = [], []
        for f in dateien:
            if f.size > importer.MAX_GROESSE:
                fehler.append((f.name, "Die Datei ist größer als 10 MB."))
                continue
            try:
                gelesen.append(importer.lesen(f.read(), f.name).als_dict())
            except importer.ImportFehler as e:
                fehler.append((f.name, str(e)))
        request.session[SESSION_IMPORT] = {"gelesen": gelesen, "fehler": fehler}
        return redirect("bestand_import_pruefen")
    return render(request, "bestand/import.html", {"schritt": 1, "max_dateien": MAX_DATEIEN})


def _vorschau(daten):
    """Je Datei: AB, Zahlen, neu/schon vorhanden, Hinweise. Doppelte ABs im selben Upload: die letzte Datei gilt."""
    zeilen = []
    letzte = {}
    for i, d in enumerate(daten["gelesen"]):
        g = importer.Gelesen.aus_dict(d)
        if g.ab:
            letzte[ab_schluessel(g.ab)] = i
    for i, d in enumerate(daten["gelesen"]):
        g = importer.Gelesen.aus_dict(d)
        alt = importer.vorhandener_ab(g.ab) if g.ab else None
        doppelt = bool(g.ab) and letzte.get(ab_schluessel(g.ab)) != i
        im_sw = bool(g.ab) and not doppelt and schweissen.hat_ab(g.ab)  # R-I10
        zeilen.append({"nr": i, "g": g, "alt": alt, "doppelt": doppelt, "im_schweissen": im_sw})
    return zeilen


@rolle_noetig(KOMMISSIONIERUNG)
def import_pruefen(request):
    daten = request.session.get(SESSION_IMPORT)
    if not daten:
        return redirect("bestand_import")
    zeilen = _vorschau(daten)
    if request.method == "POST":
        zuletzt, neu, ersetzt = None, 0, 0
        for z in zeilen:
            g = z["g"]
            if z["doppelt"]:
                continue
            ab = ab_form(request.POST.get(f"ab_{z['nr']}", "")) if not g.ab else g.ab  # R-I4: fehlt → fragen
            if not ab:
                continue
            if (z["im_schweissen"] or (not g.ab and schweissen.hat_ab(ab))) and request.POST.get(
                f"schweissen_{z['nr']}"
            ) != "ja":
                continue  # R-I10: Nein = überspringen
            if importer.vorhandener_ab(ab) and request.POST.get(f"ersetzen_{z['nr']}") != "ja":
                continue  # R-I8: Nein = überspringen
            a, war_da = importer.speichern(g, request.user, heute(), ab)
            protokoll.schreiben(request.user, "ersetzt" if war_da else "import", a.ab_anzeige, "", "", g.datei)
            ersetzt += war_da
            neu += not war_da
            zuletzt = a
        del request.session[SESSION_IMPORT]
        n = neu + ersetzt
        if n:  # R-I9
            text = f"{n} Arbeitsauftrag importiert." if n == 1 else f"{n} Arbeitsaufträge importiert."
            if ersetzt:
                text += f" Davon ersetzt: {ersetzt}."
            messages.success(request, text)
            return redirect(reverse("bestandsliste") + f"?zu={zuletzt.id}#ab-{zuletzt.id}")
        messages.info(request, "Es wurde nichts importiert.")
        return redirect("bestandsliste")
    return render(request, "bestand/import.html", {"schritt": 2, "zeilen": zeilen, "fehler": daten["fehler"]})


# ---------- AB bearbeiten: Soll ändern (Rolle Kommissionierung) ----------
@rolle_noetig(KOMMISSIONIERUNG)
def ab_bearbeiten(request, auftrag_id):
    """Soll („Menge Gesamt“) der Teile ändern. Absichtlich nur über den kleinen Knopf „AB bearbeiten“."""
    a = next((x for x in ansicht.baum(Auftrag.objects.filter(id=auftrag_id))), None)
    if a is None:
        raise Http404
    fehler = {}
    if request.method == "POST":
        neu = {}
        for t in a.alle_teile:
            text = request.POST.get(f"soll_{t.o.id}", "").strip().replace(",", ".")
            if text == "":
                neu[t.o.id] = None
                continue
            if rechnen.punkt_mehrdeutig(text):
                fehler[t.o.id] = rechnen.MELDUNG_PUNKT
                continue
            try:
                d = Decimal(text)
                if not d.is_finite() or d < 0:
                    raise InvalidOperation
                if d > rechnen.MAX_MENGE:
                    fehler[t.o.id] = rechnen.MELDUNG_ZU_GROSS
                    continue
                neu[t.o.id] = (
                    d.quantize(Decimal("0.001")).normalize() if d != d.to_integral_value() else Decimal(int(d))
                )
            except InvalidOperation:
                fehler[t.o.id] = "Bitte eine Zahl ab 0 eintragen."
        if not fehler:
            geaendert = 0
            with transaction.atomic():
                for t in _teile_sperren(Teil.objects.filter(auftrag=a.o)):
                    if t.id in neu and neu[t.id] != t.menge_gesamt:
                        protokoll.schreiben(
                            request.user,
                            "soll",
                            a.o.ab_anzeige,
                            protokoll.teil_objekt(t),
                            t.soll_anzeige or "leer",
                            _mtext(neu[t.id]),
                        )
                        t.menge_gesamt = neu[t.id]
                        t.menge_gesamt_text = ""
                        t.datum_eingelagert, t.datum_komplett = rechnen.daten_stempeln(  # R-T1
                            t.vorhanden, t.menge_gesamt, t.datum_eingelagert, t.datum_komplett, heute()
                        )
                        t.version += 1
                        t.save()
                        geaendert += 1
            if geaendert:
                messages.success(
                    request, f"{a.o.ab_anzeige}: Soll bei {geaendert} Teil{'en' if geaendert != 1 else ''} geändert."
                )
            else:
                messages.info(request, f"{a.o.ab_anzeige}: nichts geändert.")
            return redirect(reverse("bestandsliste") + f"?zu={a.o.id}#ab-{a.o.id}")
    for t in a.alle_teile:
        t.eingabe = (
            request.POST.get(f"soll_{t.o.id}", "")
            if request.method == "POST"
            else (rechnen.zahl_text(t.o.menge_gesamt) if t.o.menge_gesamt is not None else "")
        )
        t.fehler = fehler.get(t.o.id, "")
    return render(request, "bestand/ab_bearbeiten.html", {"a": a}, status=400 if fehler else 200)


# ---------- AB löschen (R-X1, Rolle Kommissionierung) ----------
@rolle_noetig(KOMMISSIONIERUNG)
def ab_loeschen_suchen(request):
    """AB über die Eingabe wählen (R-AB4). Vorschlag: der AB, von dem man kommt (?ab=…)."""
    eingabe = request.GET.get("ab", "").strip()
    if eingabe and request.GET.get("los"):
        a = archiv.finde_ab(eingabe)
        if a:
            return redirect("bestand_ab_loeschen", a.id)
        messages.error(request, f"AB „{ab_form(eingabe) or eingabe}“ ist nicht in der Liste.")
    return render(request, "bestand/ab_loeschen.html", {"eingabe": eingabe, "a": None})


@rolle_noetig(KOMMISSIONIERUNG)
def ab_loeschen(request, auftrag_id):
    """Sicherheitsfrage mit Zeilenzahl (GET), dann Kopie ins Archiv und aus der Bestandsliste entfernen (POST)."""
    a = next(iter(ansicht.baum(Auftrag.objects.filter(id=auftrag_id, bereich="bestand"))), None)
    if a is None:
        messages.info(request, "Dieser Arbeitsauftrag ist nicht (mehr) in der Bestandsliste.")
        return redirect("bestandsliste")
    if request.method == "POST":
        try:
            v, n = archiv.loeschen(a.o.id)
        except archiv.ArchivFehler as e:
            messages.error(request, str(e))
            return redirect("bestandsliste")
        protokoll.schreiben(request.user, "geloescht", v.ab_anzeige, "", f"{n} Zeilen", "Archiv")
        messages.success(request, f"{v.ab_anzeige} wurde gelöscht ({n} Zeilen). Eine Kopie liegt im Archiv.")
        return redirect("bestandsliste")
    return render(request, "bestand/ab_loeschen.html", {"a": a, "zeilen": archiv.zeilenzahl(a)})

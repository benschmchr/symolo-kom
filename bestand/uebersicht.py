"""Kennzahlen für die Startseite (Entscheidung D3) aus der Bestandsliste."""

from datetime import timedelta

from . import ansicht, forecast, lagerort, rechnen, schweissen
from .models import Schweisszeile

ARBEITSTAGE = 10


def _arbeitsplaetze() -> dict:
    """Start-Kachel Arbeitsplätze: ABs im Schweißen und Einträge, die auf einem Platz stehen."""
    plan = schweissen.hallenplan()
    return {
        "abs": Schweisszeile.objects.filter(ebene="AB").count(),
        "einsortiert": len(plan["einsortiert"]),
        "nicht": len(plan["nicht"]),
        "ungueltig": len(plan["ungueltig"]),
    }


def kennzahlen(heute):
    abs_ = ansicht.baum()
    z = {s: sum(a.w.status == s for a in abs_) for s in (rechnen.KOMPLETT, rechnen.TEILWEISE, rechnen.OFFEN)}
    teile = [t for a in abs_ for t in a.alle_teile]
    gesamt = rechnen.gesamt([t.w for t in teile])  # R-S6
    n = len(abs_)
    # Teile komplett je Arbeitstag (Mo–Fr), letzte 10 Arbeitstage bis heute
    tage, tag = [], heute
    while len(tage) < ARBEITSTAGE:
        if tag.weekday() < 5:
            tage.insert(0, tag)
        tag -= timedelta(days=1)
    je_tag = {d: sum(t.o.datum_komplett == d for t in teile) for d in tage}
    hoch = max(je_tag.values()) or 1
    komplett = sorted(
        (a for a in abs_ if a.w.status == rechnen.KOMPLETT), key=lambda a: a.w.komplett or heute, reverse=True
    )
    offen = sorted((a for a in abs_ if a.w.status == rechnen.OFFEN), key=lambda a: a.o.importiert_am)
    return {
        "anz_ab": n,
        "z": z,
        "anteil": {s: round(v / n * 100) if n else 0 for s, v in z.items()},
        "teile": len(teile),
        "teile_komplett": sum(t.w.status == rechnen.KOMPLETT for t in teile),
        "gesamt": gesamt,
        "gesamt_txt": f"{gesamt * 100:.1f} %".replace(".", ","),
        "tage": [{"tag": d.strftime("%d.%m."), "n": je_tag[d], "hoehe": round(je_tag[d] / hoch * 100)} for d in tage],
        "tage_summe": sum(je_tag.values()),
        "zuletzt": komplett[:4],
        "aelteste": offen[:4],
        "regal": {k: len(v) for k, v in lagerort.regal(abs_).items() if k in ("einsortiert", "nicht", "ungueltig")},
        "forecast": forecast.kachel(abs_, heute),
        "arbeitsplaetze": _arbeitsplaetze(),
    }

from .. import ansicht, archiv, rechnen
from ..ab_nummer import forecast_schluessel
from ..models import (
    Auftrag,
    Baugruppe,
    Teil,
)
from .abgleich import lesen
from .bloecke import bloecke
from .hilfen import bg_nummer


# ---------- W11: entnommene ABs bleiben im Forecast (Status „Schweißen“), bis sie archiviert sind ----------
def forecast_abs() -> list[ansicht.ABZ]:
    """Ganze ABs im Schweißen als ABZ (Werte aus der Kopie, nur zum Anzeigen im Forecast, nichts wird gespeichert).
    Einzelblöcke zählen nicht: ihr AB steht ja noch in der Bestandsliste."""
    ergebnis = []
    for b in bloecke(lesen()):
        if b.ab is None:
            continue
        k = b.ab.kopf or {}
        a = Auftrag(
            id=-b.ab.id,
            ab_anzeige=b.ab.ab_nr,
            ab_schluessel=b.ab.ab_schluessel,
            forecast_schluessel=k.get("forecast_schluessel") or forecast_schluessel(b.ab.ab_nr),
            kunde=k.get("kunde", ""),
            verkaufsartikel=k.get("verkaufsartikel", ""),
            haupt_ab=k.get("haupt_ab", ""),
            lagerort=b.ab.lagerort,
            bereich="schweissen",
        )
        a.arbeitsplatz = b.ab.p  # nur zum Anzeigen (Spalte Lagerort im Forecast, Planung)

        def teil(z, bg):
            s, _ = archiv._zahl(z.menge_gesamt)
            v, _ = archiv._zahl(z.vorhanden)
            t = Teil(
                id=-z.id,
                auftrag_id=a.id,
                zeile=z.nr,
                zeichnungsnummer=z.zeichnungsnummer,
                benennung=z.benennung,
                lk_nummer=z.lk_nummer,
                lagerort=z.lagerort,
                menge_gesamt=s,
                vorhanden=v,
                datum_eingelagert=z.eingelagert,
                datum_komplett=z.komplett,
            )
            t.baugruppe = bg
            t.arbeitsplatz = z.p
            return ansicht.TeilZ(t, ansicht.teil_werte(t))

        ohne = [teil(z, None) for z in b.ohne]
        bgs = []
        for g in b.bgs:
            bo = Baugruppe(
                id=-g.bg.id,
                auftrag=a,
                zeile=g.bg.nr,
                name=g.bg.baugruppe,
                kurz=bg_nummer(g.bg.baugruppe),
                lk_nummer=g.bg.lk_nummer,
                lagerort=g.bg.lagerort,
            )
            bo.arbeitsplatz = g.bg.p
            tz = [teil(z, bo) for z in g.teile]
            bgs.append(ansicht.BGZ(bo, rechnen.sammel([t.w for t in tz]), tz))
        alle = ohne + [t for g in bgs for t in g.teile]
        ergebnis.append(ansicht.ABZ(a, rechnen.sammel([t.w for t in alle]), ohne, bgs, schweissen=True))
    return ergebnis

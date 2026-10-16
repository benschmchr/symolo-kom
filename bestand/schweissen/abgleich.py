from ..models import (
    Schweisszeile,
)
from .hilfen import DATUMSFELDER, FELDER, VERSCHIEDEN, _gleich, _t


# ---------- R-W6 Vererbung (Kern, nur Listen; Nachbau von AbgleichKern) ----------
def _ab_ableiten(ebene, ab, w):
    """Schritt 3 von AbgleichKern: AB-Zeile = gemeinsamer Wert aller ihrer BGs, sonst „(verschieden)“."""
    n = len(ebene)
    for i in range(n):
        if ebene[i] != "AB":
            continue
        for k in range(4):
            anz, versch, gem, gv = 0, False, "", None
            for j in range(n):
                if ebene[j] == "BG" and _gleich(ab[j], ab[i]):
                    anz += 1
                    if anz == 1:
                        gem, gv = _t(w[j][k]), w[j][k]
                    elif _t(w[j][k]) != gem:
                        versch = True
            if anz > 0:
                w[i][k] = VERSCHIEDEN if versch else gv


def abgleich_kern(ebene, ab, w, geaendert=()):
    """ebene[i] = AB/BG/Teil, ab[i] = echter AB (ABNr), w[i] = [Mitarbeiter, Arbeitsplatz, Liefertermin, Termin Versand].
    geaendert = {(i, k)}: an der AB-Zeile i wurde Eingabe k eben geändert (Excel merkt das in der Spalte „Abgleich“).
      AB geändert   → Wert an alle BGs und Teile des AB
      Baugruppe     → Wert an ihre Teile; AB = gemeinsamer Wert aller BGs, sonst „(verschieden)“
      Teil geändert → zurück auf den Wert der BG (Teile werden nie einzeln geändert)
    Einzelblöcke (BG ohne AB-Zeile) vererben nur innerhalb ihres Blocks. Ändert w an Ort und Stelle."""
    n = len(ebene)
    for i in range(n):  # 1. geänderte AB-Zeilen an ihren ganzen AB
        if ebene[i] == "AB":
            for k in range(4):
                if (i, k) in geaendert and _t(w[i][k]) != VERSCHIEDEN:
                    for j in range(n):
                        if j != i and _gleich(ab[j], ab[i]):
                            w[j][k] = w[i][k]
    for i in range(n):  # 2. Teile unter BG bzw. direkt unter dem AB
        e = ebene[i]
        if e in ("AB", "BG"):
            j = i + 1
            while j < n:
                if ebene[j] != "Teil" or not _gleich(ab[j], ab[i]):
                    break
                for k in range(4):
                    if e == "BG":
                        w[j][k] = w[i][k]
                    elif _t(w[i][k]) != VERSCHIEDEN:
                        w[j][k] = w[i][k]
                j += 1
    _ab_ableiten(ebene, ab, w)  # 3. AB = gemeinsamer Wert seiner BGs


def _werte(zeilen):
    return [
        [getattr(z, f) if getattr(z, f) not in ("", None) else ("" if f not in DATUMSFELDER else None) for f in FELDER]
        for z in zeilen
    ]


def _speichern(zeilen, w):
    """Abgeleitete Werte zurückschreiben; „(verschieden)“ wird nicht gespeichert."""
    aendern = []
    for z, wz in zip(zeilen, w):
        geaendert = False
        for f, v in zip(FELDER, wz):
            if v == VERSCHIEDEN:
                v = None if f in DATUMSFELDER else ""
            if v is None and f not in DATUMSFELDER:
                v = ""
            if getattr(z, f) != v:
                setattr(z, f, v)
                geaendert = True
        if geaendert:
            aendern.append(z)
    if aendern:
        Schweisszeile.objects.bulk_update(aendern, FELDER)
    return len(aendern)


def abgleich_alle(geaendert_zeilen=()):
    """Alle Zeilen im Bereich Schweißen angleichen (SwAbgleich). geaendert_zeilen = {(Zeile-Id, Feldnummer)} der
    Eingaben, die an einer AB-Zeile gerade geändert wurden."""
    zeilen = list(Schweisszeile.objects.select_for_update().order_by("nr", "id"))
    ebene, ab = [z.ebene for z in zeilen], [z.ab_nr for z in zeilen]
    w = _werte(zeilen)
    _ab_ableiten(ebene, ab, w)  # gespeicherter Stand wie in Excel („verschieden“)
    index = {z.id: i for i, z in enumerate(zeilen)}
    abgleich_kern(ebene, ab, w, {(index[i], k) for i, k in geaendert_zeilen if i in index})
    _speichern(zeilen, w)
    return zeilen, w


def lesen():
    """Alle Zeilen mit ihren Werten für die Anzeige (z.m, z.p, z.lt, z.tv; AB-Zeilen ggf. „(verschieden)“)."""
    zeilen = list(Schweisszeile.objects.order_by("nr", "id"))
    w = _werte(zeilen)
    _ab_ableiten([z.ebene for z in zeilen], [z.ab_nr for z in zeilen], w)
    for z, wz in zip(zeilen, w):
        z.m, z.p, z.lt, z.tv = wz
        z.zeigen = True
        z.css = {"Komplett": "komplett", "Teilweise": "teilweise"}.get(z.status, "offen")
    return zeilen

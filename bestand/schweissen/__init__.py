"""Schweißen und Arbeitsplätze (R-W1 bis R-W10, R-AP1 bis R-AP7).

Nachbau der Excel-Prozeduren Entnehmen, SwZusammenfassen, AbgleichKern, DatumAusText, SwArchivieren, Sw_Zurueck und
ZurueckInBestand sowie der Formel AP (dashformel.py, Arbeitsplätze) aus excel_quellen/modBestand.tpl.

Aufbau: Entnommene Zeilen sind Kopien (Schweisszeile, wie im Excel-Blatt „Schweißen“), die Zeilen in der
Bestandsliste werden gelöscht. Reihenfolge `nr` je AB: AB-Zeile, Teile ohne BG, dann die BGs nach Nummer, Teile hinter
ihrer BG. Einzelblöcke (nur eine BG mit ihren Teilen, „AB…_BGnnn“) stehen für sich, bis der ganze AB da ist.

Abweichungen von Excel (Rollen statt Passwort 1234, R-P2; „(verschieden)“ wird berechnet statt gespeichert, Abschnitt 8):
- Entnehmen, Archivieren und Zurückholen: Rolle Stahlbau. Mitarbeiter, Arbeitsplatz, Termine: Rolle Stahlbau.
- Die Änderung an Mitarbeiter/Arbeitsplatz/Terminen kommt direkt aus der Eingabe, nicht aus einer versteckten Spalte.

Aufteilung: hilfen (Konstanten, Datum), abgleich (Vererbung), bloecke (Anzeige, Suchen, Filtern), mitarbeiter
(Mitarbeiter-Liste, Plätze, Eingaben), vorgaenge (Entnehmen, Archivieren, Zurück), hallenplan, forecast_marke.
Alle Namen sind hier wieder erreichbar (`schweissen.setzen` usw.).
"""

from kern.zeit import heute  # noqa: F401  (Tests tauschen `schweissen.heute` aus, siehe hilfen.heute)

from .abgleich import (  # noqa: F401
    abgleich_alle,
    abgleich_kern,
    lesen,
)
from .bloecke import (  # noqa: F401
    ANZEIGEN,
    SORTIERUNGEN,
    Block,
    Gruppe,
    block_filtern,
    block_sortieren,
    bloecke,
    filtern,
    im_schweissen,
    sammeln,
    suchen,
)
from .forecast_marke import (  # noqa: F401
    forecast_abs,
)
from .hallenplan import (  # noqa: F401
    Eintrag,
    ap_teilen,
    ap_zusammenfuehren,
    eintraege,
    hallenplan,
    mitarbeiter_setzen,
    platz_setzen,
)
from .hilfen import (  # noqa: F401
    DATUMSFELDER,
    EINGABEN,
    FELDER,
    HERKUNFT,
    OHNE_BG,
    SONSTIGES,
    SPALTEN,
    VERSCHIEDEN,
    SchweissenFehler,
    bg_nummer,
    datum_aus_text,
)
from .mitarbeiter import (  # noqa: F401
    MAX_NAME,
    TRENNER,
    anzeigename,
    eingabe_pruefen,
    mitarbeiter_liste,
    mitarbeiter_namen,
    mitarbeiter_neu,
    mitarbeiter_weg,
    platz_finden,
    platz_namen,
    setzen,
)
from .vorgaenge import (  # noqa: F401
    Plan,
    Rueck,
    archivieren,
    aus_archiv,
    entnehmen,
    hat_ab,
    pruefen_archivieren,
    pruefen_entnehmen,
    pruefen_zurueck,
    zurueck,
    zusammenfassen,
)

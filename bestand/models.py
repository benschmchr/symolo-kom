"""Datenmodell (Übergabe Abschnitt 8): Auftrag (AB) › Baugruppe (BG) › Teil.

Status, Prozent, Fortschritt und Sortierung werden berechnet (bestand/rechnen.py), nicht gespeichert.
Felder für Lagerort (Phase 2), Schweißen (Phase 6) und Archiv (Phase 4) sind vorbereitet.
"""

from django.conf import settings
from django.db import models

BEREICHE = [("bestand", "Bestandsliste"), ("schweissen", "Schweißen"), ("archiv", "Archiv")]
MENGE = {"max_digits": 12, "decimal_places": 3, "null": True, "blank": True}


class Auftrag(models.Model):
    """Ein AB (auch je Los ein eigener AB, R-AB6). Kopfdaten als eigene Felder (R-D2)."""

    ab_anzeige = models.CharField("AB", max_length=80)  # R-AB1, z. B. „AB2616200 / Los 1“
    ab_schluessel = models.CharField(max_length=80, unique=True)  # R-AB3, z. B. „AB2616200|L1“
    forecast_schluessel = models.CharField(max_length=40, blank=True)  # R-AB5
    haupt_ab = models.CharField("Haupt AB", max_length=80, blank=True)
    kunde = models.CharField(max_length=200, blank=True)
    verkaufsartikel = models.CharField(max_length=300, blank=True)
    ersteller = models.CharField(max_length=120, blank=True)
    datum_liste = models.CharField("Datum", max_length=40, blank=True)  # Text TT.MM.JJJJ
    dispoliste = models.CharField(max_length=300, blank=True)
    lagerort = models.CharField(max_length=40, blank=True)
    regal_geteilt = models.BooleanField(default=False)  # Regal: AB in Baugruppen aufgesplittet (Ben, 14.10.)
    bereich = models.CharField(max_length=12, choices=BEREICHE, default="bestand")
    reihenfolge = models.PositiveIntegerField(default=0)  # R-A4: wie importiert
    quelldatei = models.CharField(max_length=255, blank=True)
    importiert_am = models.DateTimeField(auto_now_add=True)
    importiert_von = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        ordering = ["reihenfolge", "id"]
        verbose_name = "Arbeitsauftrag"
        verbose_name_plural = "Arbeitsaufträge"

    def __str__(self):
        return self.ab_anzeige


class _Zeile(models.Model):
    """Gemeinsame Spalten einer Kommissionierliste (R-D1). Zahlen der Liste ohne Rechnung bleiben Text."""

    auftrag = models.ForeignKey(Auftrag, on_delete=models.CASCADE)
    zeile = models.PositiveIntegerField()  # Reihenfolge im AB (BG und Teile gemeinsam)
    zeichnungsnummer = models.CharField(max_length=200, blank=True)
    benennung = models.CharField(max_length=300, blank=True)
    menge_bg = models.CharField("Menge / BG", max_length=40, blank=True)
    menge_gesamt = models.DecimalField("Menge Gesamt", **MENGE)  # Soll
    menge_gesamt_text = models.CharField(max_length=40, blank=True)  # nur wenn keine Zahl (zählt als 0)
    index = models.CharField(max_length=80, blank=True)
    lk_nummer = models.CharField("LK Nummer", max_length=40, blank=True)
    arbeitsgang = models.CharField(max_length=200, blank=True)
    material = models.CharField(max_length=200, blank=True)
    profil = models.CharField(max_length=200, blank=True)
    abmasse = models.CharField("Abmaße", max_length=200, blank=True)
    bemerkung = models.CharField(max_length=300, blank=True)
    lagerort = models.CharField(max_length=40, blank=True)

    class Meta:
        abstract = True
        ordering = ["zeile"]

    @property
    def soll_anzeige(self):
        from .rechnen import zahl_text

        if self.menge_gesamt is None:
            return self.menge_gesamt_text
        return zahl_text(self.menge_gesamt)


class Baugruppe(_Zeile):
    """BG-Zeile: eigene Spalten, aber keine Vorhanden-Menge (R-D3)."""

    auftrag = models.ForeignKey(Auftrag, on_delete=models.CASCADE, related_name="baugruppen")
    name = models.CharField(max_length=400)  # R-D4 „100 HALTER ANZEIGEGERAET GE“
    kurz = models.CharField(max_length=60, blank=True)  # R-D5 „100“

    class Meta(_Zeile.Meta):
        verbose_name = "Baugruppe"
        verbose_name_plural = "Baugruppen"

    def __str__(self):
        return f"{self.auftrag} / {self.name}"

    @property
    def kurzname(self):
        """R-D5: „AB2515204_BG100“ (für Regal und Schweißen)."""
        return f"{self.auftrag.ab_anzeige}_BG{self.kurz}"


class Teil(_Zeile):
    """Einzelteil unter einer BG, oder direkt unter dem AB (baugruppe leer = „(ohne BG)“)."""

    auftrag = models.ForeignKey(Auftrag, on_delete=models.CASCADE, related_name="teile")
    baugruppe = models.ForeignKey(Baugruppe, null=True, blank=True, on_delete=models.CASCADE, related_name="teile")
    vorhanden = models.DecimalField(**MENGE)
    datum_eingelagert = models.DateField(null=True, blank=True)
    datum_komplett = models.DateField(null=True, blank=True)
    version = models.PositiveIntegerField(default=0)  # gleichzeitiges Arbeiten: Hinweis bei Überschreiben

    class Meta(_Zeile.Meta):
        verbose_name = "Teil"
        verbose_name_plural = "Teile"

    def __str__(self):
        return f"{self.auftrag} / {self.zeichnungsnummer}"

    @property
    def bg_name(self):
        return self.baugruppe.name if self.baugruppe_id else "(ohne BG)"


class Ansichtszustand(models.Model):
    """Je Benutzer gemerkt: Ansicht und Auf-/Zuklappen des Dashboards (R-DB4). Gäste: in ihrer Sitzung."""

    benutzer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    seite = models.CharField(max_length=20)
    ansicht = models.CharField(max_length=20)
    klappen = models.JSONField(default=dict)  # Schlüssel (AB bzw. „AB|BG“) → offen

    class Meta:
        constraints = [models.UniqueConstraint(fields=["benutzer", "seite"], name="ein_zustand_je_seite")]


# ---------- Archiv (R-X1 bis R-X3) ----------
HERKUENFTE = [
    ("Gelöscht aus Bestandsliste", "Gelöscht aus Bestandsliste"),
    ("Archiviert aus Schweißen", "Archiviert aus Schweißen"),
    ("", "alte Zeile aus Excel"),
]


class Archivvorgang(models.Model):
    """Ein Löschen bzw. Archivieren eines AB: fasst seine Archivzeilen zusammen (für Anzeige und Wiederherstellen).
    Wer gelöscht hat, steht nur im Änderungsprotokoll (W7), nicht hier."""

    ab_anzeige = models.CharField("AB", max_length=80)
    ab_schluessel = models.CharField(max_length=80, db_index=True)
    kunde = models.CharField(max_length=200, blank=True)
    verkaufsartikel = models.CharField(max_length=300, blank=True)
    geloescht_am = models.DateTimeField("Gelöscht am")
    herkunft = models.CharField(max_length=40, blank=True, choices=HERKUENFTE)
    status = models.CharField(max_length=20, blank=True)  # Status des AB beim Löschen
    reihenfolge = models.PositiveIntegerField(null=True, blank=True)  # Platz in der Bestandsliste
    quelldatei = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-geloescht_am", "-id"]
        verbose_name = "Archiv-Eintrag"
        verbose_name_plural = "Archiv"

    def __str__(self):
        return f"{self.ab_anzeige} ({self.geloescht_am:%d.%m.%Y %H:%M})"


class Archivzeile(models.Model):
    """R-X2: flache Kopie einer Zeile (AB, BG oder Teil), 28 Spalten wie das Excel-Blatt „Archiv“ (ArchivKopf).
    Zahlen stehen als Text da, wie sie in der Bestandsliste angezeigt wurden; Spalten ohne Quelle bleiben leer."""

    vorgang = models.ForeignKey(Archivvorgang, on_delete=models.CASCADE, related_name="zeilen")
    nr = models.PositiveIntegerField()  # Reihenfolge wie in der Liste
    ab = models.CharField("AB", max_length=80)
    zeichnungsnummer = models.CharField(max_length=200, blank=True)
    benennung = models.CharField(max_length=300, blank=True)
    menge_bg = models.CharField("Menge / BG", max_length=40, blank=True)
    menge_gesamt = models.CharField("Menge Gesamt", max_length=40, blank=True)
    index = models.CharField(max_length=80, blank=True)
    lk_nummer = models.CharField("LK Nummer", max_length=40, blank=True)
    arbeitsgang = models.CharField(max_length=200, blank=True)
    material = models.CharField(max_length=200, blank=True)
    profil = models.CharField(max_length=200, blank=True)
    abmasse = models.CharField("Abmaße", max_length=200, blank=True)
    vorhanden = models.CharField(max_length=40, blank=True)
    bemerkung = models.CharField(max_length=400, blank=True)
    status = models.CharField(max_length=20, blank=True)
    fortschritt = models.CharField(max_length=80, blank=True)
    ebene = models.CharField(max_length=10)  # AB, BG, Teil
    baugruppe = models.CharField(max_length=400, blank=True)
    geloescht_am = models.DateTimeField("Gelöscht am")
    eingelagert = models.DateField(null=True, blank=True)
    komplett = models.DateField(null=True, blank=True)
    dlz = models.IntegerField("DLZ", null=True, blank=True)
    lagerort = models.CharField(max_length=40, blank=True)
    mitarbeiter = models.CharField("Zuweisung Mitarbeiter", max_length=200, blank=True)
    arbeitsplatz = models.CharField("Zuweisung Arbeitsplatz", max_length=200, blank=True)
    entnommen = models.DateField(null=True, blank=True)
    liefertermin_stahlbau = models.DateField(null=True, blank=True)
    termin_versand = models.DateField(null=True, blank=True)
    herkunft = models.CharField(max_length=40, blank=True)

    class Meta:
        ordering = ["vorgang", "nr"]
        verbose_name = "Archivzeile"
        verbose_name_plural = "Archivzeilen"


# ---------- Änderungsprotokoll (W7) ----------
ARTEN = [
    ("menge", "Vorhanden"),
    ("lagerort", "Lagerort"),
    ("soll", "Soll"),
    ("import", "Import"),
    ("ersetzt", "Ersetzt (Import)"),
    ("geloescht", "Gelöscht"),
    ("wiederhergestellt", "Wiederhergestellt"),
    ("forecast", "Forecast importiert"),
    ("entnommen", "Entnommen (Schweißen)"),
    ("zurueck", "Zurück in Bestandsliste"),
    ("archiviert", "Archiviert (Schweißen)"),
    ("schweissen", "Zuweisung Schweißen"),
]


class Protokolleinstellung(models.Model):
    """Eine einzige Zeile (pk=1). Betriebsrat/Datenschutz sind noch offen: deshalb abschaltbar, ohne Namen möglich
    und mit begrenzter Aufbewahrung. Nur Admins sehen und ändern das Protokoll."""

    aktiv = models.BooleanField("Protokoll führen", default=True)
    namen = models.BooleanField("Namen speichern", default=True)
    tage = models.PositiveIntegerField("Aufbewahren (Tage, 0 = unbegrenzt)", default=90)

    class Meta:
        verbose_name = "Einstellung Änderungsprotokoll"


class Aenderung(models.Model):
    """Wer hat wann welche Menge, welchen Platz, welches Soll geändert; Import, Löschen, Wiederherstellen."""

    zeit = models.DateTimeField(db_index=True)
    benutzer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    benutzer_name = models.CharField(max_length=150, blank=True)  # bleibt, wenn das Konto gelöscht wird
    art = models.CharField(max_length=20, choices=ARTEN)
    ab = models.CharField("AB", max_length=80)
    objekt = models.CharField(max_length=400, blank=True)  # Teil (Zeichnungsnummer), BG oder leer = AB
    alt = models.CharField(max_length=200, blank=True)
    neu = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["-zeit", "-id"]
        verbose_name = "Änderung"
        verbose_name_plural = "Änderungsprotokoll"


# ---------- Forecast (R-F1 bis R-F12) ----------
class ForecastImport(models.Model):
    """R-F4: der eine aktuelle Forecast. Jeder Import ersetzt den alten ganz (mit allen Zeilen)."""

    zeit = models.DateTimeField("Importiert am")
    datei = models.CharField(max_length=255)
    blatt = models.CharField(max_length=120)
    stand = models.CharField(max_length=200, blank=True)  # „Stand: 13.10.2026“ aus dem Kopf der Datei
    kopf = models.JSONField(default=list)  # Spaltennamen der Vorlage, in Reihenfolge
    benutzer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        verbose_name = "Forecast-Import"
        verbose_name_plural = "Forecast-Importe"

    def __str__(self):
        return f"{self.datei} ({self.zeit:%d.%m.%Y %H:%M})"


class ForecastZeile(models.Model):
    """R-F3: eine Zeile der Forecast-Liste mit AB-Schlüssel (R-AB5) und Termin_Abgleich; alle Spalten als Text."""

    forecast = models.ForeignKey(ForecastImport, on_delete=models.CASCADE, related_name="zeilen")
    nr = models.PositiveIntegerField()  # Reihenfolge wie in der Datei
    schluessel = models.CharField(max_length=40, db_index=True)  # AB_Abgleich, z. B. „AB2515204“
    termin = models.DateField(null=True, blank=True)  # Termin_Abgleich (leer: kein / geliefert)
    werte = models.JSONField(default=list)  # alle Spalten, wie angezeigt

    class Meta:
        ordering = ["nr"]
        verbose_name = "Forecast-Zeile"
        verbose_name_plural = "Forecast-Zeilen"


class Forecasteinstellung(models.Model):
    """Eine einzige Zeile (pk=1): hinterlegter Link zur Forecast-Datei (R-F1), bis der Server sie selbst lesen darf."""

    quelle = models.CharField("Link zur Forecast-Datei", max_length=1000, blank=True)

    class Meta:
        verbose_name = "Einstellung Forecast"


# ---------- Schweißen und Arbeitsplätze (R-W1 bis R-W10, R-AP1 bis R-AP7) ----------
class Schweisszeile(models.Model):
    """Eine Zeile im Bereich Schweißen (AB, BG oder Teil), als Kopie wie im Excel-Blatt „Schweißen“: Werte aus der
    Bestandsliste zum Zeitpunkt des Entnehmens plus Mitarbeiter, Arbeitsplatz und Termine. Zahlen stehen als Text da
    (wie im Archiv). Reihenfolge `nr`: AB, Teile ohne BG, BGs mit ihren Teilen; Einzelblöcke (nur BG + Teile, der AB
    liegt noch teils in der Bestandsliste) stehen für sich. „(verschieden)“ wird berechnet, nicht gespeichert (R-W6)."""

    nr = models.PositiveIntegerField(db_index=True)
    ab_nr = models.CharField("AB (echt)", max_length=80)  # „AB2515204 L1“ (ABNr)
    ab_schluessel = models.CharField(max_length=80, db_index=True)  # R-AB3
    anzeige = models.CharField("AB", max_length=100)  # „AB2515204“ oder „AB2515204_BG100“
    ebene = models.CharField(max_length=10)  # AB, BG, Teil
    baugruppe = models.CharField(max_length=400, blank=True)  # „100 HALTER …“ oder „(ohne BG)“
    zeichnungsnummer = models.CharField(max_length=200, blank=True)
    benennung = models.CharField(max_length=300, blank=True)
    menge_bg = models.CharField("Menge / BG", max_length=40, blank=True)
    menge_gesamt = models.CharField("Menge Gesamt", max_length=40, blank=True)
    index = models.CharField(max_length=80, blank=True)
    lk_nummer = models.CharField("LK Nummer", max_length=40, blank=True)
    arbeitsgang = models.CharField(max_length=200, blank=True)
    material = models.CharField(max_length=200, blank=True)
    profil = models.CharField(max_length=200, blank=True)
    abmasse = models.CharField("Abmaße", max_length=200, blank=True)
    bemerkung = models.CharField(max_length=400, blank=True)
    vorhanden = models.CharField(max_length=40, blank=True)
    lagerort = models.CharField(max_length=40, blank=True)  # ausgeblendet mitgeführt (R-W4)
    status = models.CharField(max_length=20, blank=True)
    fortschritt = models.CharField(max_length=80, blank=True)
    eingelagert = models.DateField(null=True, blank=True)
    komplett = models.DateField(null=True, blank=True)
    entnommen = models.DateField(null=True, blank=True)
    mitarbeiter = models.CharField("Zuweisung Mitarbeiter", max_length=200, blank=True)
    arbeitsplatz = models.CharField("Zuweisung Arbeitsplatz", max_length=200, blank=True)
    liefertermin_stahlbau = models.DateField(null=True, blank=True)
    termin_versand = models.DateField(null=True, blank=True)
    kopf = models.JSONField(default=dict)  # Kopfdaten des AB (zum Zurückholen)
    ap_geteilt = models.BooleanField(default=False)  # nur AB-Zeile: Arbeitsplätze zeigen je BG einen Eintrag

    class Meta:
        ordering = ["nr"]
        verbose_name = "Schweißen-Zeile"
        verbose_name_plural = "Schweißen"

    def __str__(self):
        return f"{self.anzeige} / {self.zeichnungsnummer or self.baugruppe}"

    @property
    def dlz(self):
        """R-W5: Termin Versand − Eingelagert in Tagen (leer, solange eins davon fehlt)."""
        if self.termin_versand and self.eingelagert:
            return (self.termin_versand - self.eingelagert).days
        return None


class Mitarbeiter(models.Model):
    """Namen für die Auswahl „Zuweisung Mitarbeiter“ (Schweißen, Arbeitsplätze); „Mitarbeiter verwalten“ trägt ein und aus."""

    name = models.CharField(max_length=80, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Mitarbeiter"
        verbose_name_plural = "Mitarbeiter"

    def __str__(self):
        return self.name


class Arbeitsplatz(models.Model):
    """R-AP1/R-AP2: Platzliste (Reihenfolge = Nummer, zugleich Auswahl „Zuweisung Arbeitsplatz“) mit Lage im Hallenplan
    und Farbe der Tafel. Im Admin pflegbar; Startwerte aus `ArbeitsplaetzeAnlegen` (Excel) in der Migration."""

    name = models.CharField(max_length=60, unique=True)
    reihenfolge = models.PositiveIntegerField(unique=True)
    farbe = models.CharField(
        max_length=10,
        default="grau",
        choices=[(f, f) for f in ("grau", "blau", "gruen", "gelb", "lila", "orange", "rosa")],
    )
    spalte = models.PositiveSmallIntegerField("Plan: Spalte", default=1)
    zeile = models.PositiveSmallIntegerField("Plan: Zeile", default=1)
    breite = models.PositiveSmallIntegerField("Plan: Breite", default=2)
    hoehe = models.PositiveSmallIntegerField("Plan: Höhe", default=1)

    class Meta:
        ordering = ["reihenfolge"]
        verbose_name = "Arbeitsplatz"
        verbose_name_plural = "Arbeitsplätze"

    def __str__(self):
        return self.name


# ---------- Planung (Häkchen im Dashboard und im Forecast, Reiter „Planung“) ----------
class Planungsmarke(models.Model):
    """Ein AB, der zur Planung vorgemerkt ist. Das Häkchen gilt für alle gemeinsam und hängt am AB-Schlüssel (R-AB3),
    nicht am Datensatz: es bleibt, wenn der AB entnommen wird, und fällt weg, wenn er archiviert oder gelöscht wird."""

    ab_schluessel = models.CharField(max_length=80, unique=True)
    gesetzt_am = models.DateTimeField(auto_now_add=True)
    gesetzt_von = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta:
        verbose_name = "Planungs-Häkchen"
        verbose_name_plural = "Planungs-Häkchen"

    def __str__(self):
        return self.ab_schluessel

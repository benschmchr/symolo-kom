"""Verwaltung (nur Rolle Admin, siehe kern/apps.py): Arbeitsplätze für Auswahl und Hallenplan pflegen (R-AP1)."""

from django.contrib import admin

from .models import Arbeitsplatz


@admin.register(Arbeitsplatz)
class ArbeitsplatzAdmin(admin.ModelAdmin):
    list_display = ("reihenfolge", "name", "farbe", "spalte", "zeile", "breite", "hoehe")
    list_display_links = ("name",)
    ordering = ("reihenfolge",)

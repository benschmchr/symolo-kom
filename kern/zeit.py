"""Heutiges Datum aus einer Quelle (Tests setzen in den Modulen ein festes „heute“)."""

from django.utils import timezone


def heute():
    return timezone.localdate()

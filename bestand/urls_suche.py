from django.urls import path

from . import views_suche as v

urlpatterns = [
    path("suche/", v.seite, name="suche"),
    path("suche/treffer/", v.treffer, name="suche_treffer"),
]

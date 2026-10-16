from django.urls import path

from . import views_dashboard, views_planung

urlpatterns = [
    path("", views_planung.planung_seite, name="planung"),
    path("haken/", views_planung.haken, name="planung_haken"),
    path("klappen/", views_dashboard.klappen_merken, {"seite": views_planung.SEITE}, name="planung_klappen"),
]

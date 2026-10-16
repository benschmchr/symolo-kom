from django.urls import path

from . import views_dashboard

urlpatterns = [
    path("", views_dashboard.dashboard_seite, name="dashboard"),
    path("klappen/", views_dashboard.klappen_merken, name="dashboard_klappen"),
]

from django.urls import path

from . import views_dashboard, views_forecast

urlpatterns = [
    path("", views_forecast.forecast_seite, name="forecast"),
    path("import/", views_forecast.forecast_import, name="forecast_import"),
    path("daten/", views_forecast.forecast_daten, name="forecast_daten"),
    path("klappen/", views_dashboard.klappen_merken, {"seite": "forecast"}, name="forecast_klappen"),
]

from django.contrib.auth import views as auth_views
from django.urls import path

from . import views
from .context_processors import MENUE

# Bereiche, die schon eine eigene App haben (config/urls.py)
GEBAUT = {"bestandsliste", "dashboard", "regal", "archiv", "forecast", "schweissen", "arbeitsplaetze", "hilfe"}

urlpatterns = [
    path("", views.start, name="start"),
    path("anmelden/", auth_views.LoginView.as_view(redirect_authenticated_user=True), name="login"),
    path("abmelden/", auth_views.LogoutView.as_view(), name="logout"),
    path("hilfe/", views.hilfe, name="hilfe"),
    path("konto/", views.konto, name="konto"),
    path("konto/passwort/", auth_views.PasswordChangeView.as_view(success_url="/konto/"), name="password_change"),
]
# Bereiche des Hauptmenüs (bis zu ihrer Phase Platzhalter)
urlpatterns += [
    path(f"{name}/", views.bereich, {"name": name}, name=name) for name, _, _ in MENUE if name not in GEBAUT
]

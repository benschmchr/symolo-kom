"""Einstellungen der Web-App „Bestandsliste Kommissionierung“.

Werte für den Server kommen aus Umgebungsvariablen (siehe README, Abschnitt Betrieb):
  KOM_SECRET_KEY   geheimer Schlüssel (Pflicht, wenn KOM_DEBUG nicht 1 ist)
  KOM_DEBUG        1 = Entwicklung
  KOM_HOSTS        erlaubte Adressen, kommagetrennt (z. B. kommissionierung.firma.local)
  KOM_HTTPS        1 = nur über HTTPS (Cookies sicher)
  KOM_DATENBANK    Pfad der SQLite-Datei (Pflicht; ohne Angabe bricht der Start ab, es entsteht nie still eine leere Datenbank)
"""

import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

DEBUG = os.environ.get("KOM_DEBUG", "0") == "1"
SECRET_KEY = os.environ.get("KOM_SECRET_KEY", "")
if not SECRET_KEY:
    if DEBUG or "pytest" in sys.modules:  # Entwicklung und automatische Tests
        SECRET_KEY = "nur-fuer-entwicklung-nicht-auf-dem-server-verwenden"
    else:
        raise ImproperlyConfigured("KOM_SECRET_KEY fehlt (siehe README, Betrieb).")

ALLOWED_HOSTS = [h.strip() for h in os.environ.get("KOM_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "kern",
    "bestand",
]

MIDDLEWARE = [
    "django.middleware.gzip.GZipMiddleware",  # Seiten komprimiert ausliefern (R-V1), ganz außen
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "kern.context_processors.app",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Befehle, die keine Datenbank brauchen: dort genügt ein Platzhalter-Pfad
_OHNE_DATENBANK = {"check", "collectstatic", "help", "version", "--help", "--version"}


def _datenbank_pfad():
    """Der Pfad kommt nur aus KOM_DATENBANK. Fehlt er, bricht der Start ab, damit nie still eine leere Datenbank entsteht."""
    pfad = os.environ.get("KOM_DATENBANK", "").strip()
    befehl = sys.argv[1] if len(sys.argv) > 1 and "manage.py" in sys.argv[0] else ""
    if not pfad:
        if "pytest" in sys.modules or (befehl in _OHNE_DATENBANK):
            return str(BASE_DIR / "db.sqlite3")
        raise ImproperlyConfigured(
            "KOM_DATENBANK fehlt: Der Pfad der Datenbank-Datei muss ausdrücklich angegeben werden, "
            "sonst entsteht still eine leere Datenbank. Beispiel: KOM_DATENBANK=/pfad/zur/bestand.sqlite3 "
            "(siehe docs/Entscheidungen.md, Abschnitt Datenbank-Start)."
        )
    if befehl == "runserver" and not Path(pfad).exists():
        raise ImproperlyConfigured(
            f"Die Datenbank-Datei {pfad} gibt es nicht. Server nicht gestartet, damit keine leere Datenbank entsteht. "
            "Pfad prüfen oder einmal 'python manage.py migrate' mit diesem Pfad ausführen."
        )
    return pfad


# SQLite im WAL-Modus: mehrere Leser gleichzeitig, Sicherung = Datei kopieren
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": _datenbank_pfad(),
        "OPTIONS": {
            "init_command": "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
            "transaction_mode": "IMMEDIATE",
            "timeout": 20,
        },
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LOGIN_URL = "login"
LOGIN_REDIRECT_URL = "start"
LOGOUT_REDIRECT_URL = "start"
SESSION_COOKIE_AGE = 60 * 60 * 12  # angemeldet bleiben: eine Schicht (12 h)

LANGUAGE_CODE = "de-de"
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    # auf dem Server: Dateien mit Prüfsumme im Namen (nach collectstatic); Entwicklung/Tests: direkt
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        if DEBUG or "pytest" in sys.modules
        else "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

# Upload: Kommissionierlisten (je Datei höchstens 10 MB, siehe bestand/importer.py)
DATA_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
DATA_UPLOAD_MAX_NUMBER_FIELDS = 5000

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Sicherheit
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_HTTPONLY = True
if os.environ.get("KOM_HTTPS") == "1":
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Vermerk (R-P3): steht in jeder Fußzeile, Mail und jedem Ausdruck
VERMERK = "Erstellt: Ben Schumacher, 09.10.2026"
APP_NAME = "Bestandsliste Kommissionierung"

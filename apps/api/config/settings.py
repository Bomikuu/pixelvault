import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / ".env")
ENVIRONMENT = os.getenv("PIXELVAULT_ENVIRONMENT", "test")
if ENVIRONMENT not in {"test", "live"}:
    raise RuntimeError("Unsupported environment")
DEBUG = os.getenv("PIXELVAULT_DEBUG", "1") == "1" and ENVIRONMENT == "test"
SECRET_KEY = os.getenv("PIXELVAULT_SECRET_KEY") or "development-only-pixelvault-not-a-live-secret"
if ENVIRONMENT == "live" and (SECRET_KEY.startswith("development-") or len(SECRET_KEY) < 40):
    raise RuntimeError("Configure a strong production secret")
ALLOWED_HOSTS = os.getenv("PIXELVAULT_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver").split(",")
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5178",
    "http://127.0.0.1:5178",
    "http://localhost:8008",
    "http://127.0.0.1:8008",
]
INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "accounts",
    "eligibility",
    "verification",
    "documents",
    "audit",
    "marketplace",
    "agreements",
    "servicing",
    "payments",
    "community",
    "cases",
    "reporting",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
AUTH_USER_MODEL = "accounts.Member"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
WSGI_APPLICATION = "config.wsgi.application"
database = urlparse(
    os.getenv("DATABASE_URL", "postgresql://pixelvault:pixelvault@127.0.0.1:55438/pixelvault")
)
if database.scheme not in {"postgres", "postgresql"}:
    raise RuntimeError("PostgreSQL is required")
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": database.path.lstrip("/"),
        "USER": database.username,
        "PASSWORD": database.password,
        "HOST": database.hostname,
        "PORT": database.port or 5432,
        "CONN_MAX_AGE": 0,
    }
}
if os.getenv("PIXELVAULT_TEST_DATABASE"):
    DATABASES["default"]["TEST"] = {"NAME": os.environ["PIXELVAULT_TEST_DATABASE"]}
LANGUAGE_CODE = "en-ph"
TIME_ZONE = "Asia/Manila"
USE_TZ = True
STATIC_URL = "/static/"
MEDIA_ROOT = BASE_DIR / "private-media"
REST_FRAMEWORK = {
    "DEFAULT_PARSER_CLASSES": [
        "config.parsers.ObjectJSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_SCHEMA_CLASS": "config.schema.PixelVaultSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/hour",
        "user": "6000/hour",
        "auth": "30/hour",
        "community_activity": "600/hour",
        "community_stream": "120/hour",
    },
}
SPECTACULAR_SETTINGS = {
    "TITLE": "PixelVault API",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = ENVIRONMENT == "live"
CSRF_COOKIE_SECURE = ENVIRONMENT == "live"
SESSION_COOKIE_SAMESITE = "Lax"
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 10},
    }
]
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:56438/0")
CELERY_TASK_ALWAYS_EAGER = os.getenv("PIXELVAULT_TASKS_EAGER", "1") == "1"
CELERY_TASK_DEFAULT_QUEUE = "pixelvault"
CELERY_BEAT_SCHEDULE = {
    "local-outbox": {"task": "audit.tasks.recover_local_events", "schedule": 30.0},
    "payment-inbox": {"task": "payments.tasks.retry_inbox", "schedule": 60.0},
    "configured-route-recovery": {"task": "payments.tasks.recover_routes", "schedule": 300.0},
    "offer-reservation-expiry": {
        "task": "marketplace.tasks.release_expired_reservations",
        "schedule": 60.0,
    },
    "loan-accrual": {"task": "servicing.tasks.accrue_active_loans", "schedule": 3600.0},
    "review-publication": {"task": "community.tasks.publish_reviews", "schedule": 3600.0},
    "captured-private-notices": {"task": "cases.tasks.capture_due_notices", "schedule": 3600.0},
}
DATA_UPLOAD_MAX_MEMORY_SIZE = 11 * 1024 * 1024
FRONTEND_URL = os.getenv("PIXELVAULT_FRONTEND_URL", "http://127.0.0.1:5178")

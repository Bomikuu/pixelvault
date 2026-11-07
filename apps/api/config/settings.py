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
    "http://localhost:5179",
    "http://127.0.0.1:5179",
    "http://localhost:5185",
    "http://127.0.0.1:5185",
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
    "engagement",
    "connections",
    "negotiations",
    "memberhub",
    "investments",
    "plaza.apps.PlazaConfig",
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
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [BASE_DIR / "apps" / "api" / "config" / "templates"],
    "APP_DIRS": True,
    "OPTIONS": {},
}]
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
        "engagement_write": "30/min",
        "engagement_comment": "6/min",
        "engagement_preview": "60/min",
        "co_borrower_invite": "10/hour",
        "plaza_command": "360/min",
    },
}
SPECTACULAR_SETTINGS = {
    "TITLE": "PixelVault API",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "POSTPROCESSING_HOOKS": ["config.schema_types.enrich_schema"],
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
PLAZA_REDIS_URL = os.getenv("PLAZA_REDIS_URL") or CELERY_BROKER_URL
PLAZA_REDIS_PREFIX = "pixelvault:plaza:v1:"
CELERY_TASK_ALWAYS_EAGER = os.getenv("PIXELVAULT_TASKS_EAGER", "1") == "1"
CELERY_TASK_DEFAULT_QUEUE = "pixelvault"
CELERY_BEAT_SCHEDULE = {
    "plaza-expired-content": {"task": "plaza.tasks.purge_expired_bubbles", "schedule": 86400.0},
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

# Recovery never claims delivery or ownership from a self-reported address.
EMAIL_BACKEND = (
    "django.core.mail.backends.filebased.EmailBackend"
    if ENVIRONMENT == "test"
    else "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_FILE_PATH = BASE_DIR / ".runtime" / "mail"
EMAIL_HOST = os.getenv("PIXELVAULT_EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("PIXELVAULT_EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("PIXELVAULT_EMAIL_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("PIXELVAULT_EMAIL_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("PIXELVAULT_EMAIL_TLS", "1") == "1"
EMAIL_TIMEOUT = 5
DEFAULT_FROM_EMAIL = os.getenv("PIXELVAULT_FROM_EMAIL", "PixelVault <no-reply@pixelvault.test>")
RECOVERY_DELIVERY_AVAILABLE = ENVIRONMENT == "test" or bool(
    EMAIL_HOST
    and EMAIL_HOST_USER
    and EMAIL_HOST_PASSWORD
    and FRONTEND_URL.startswith("https://")
    and not DEFAULT_FROM_EMAIL.endswith("pixelvault.test>")
)
PASSWORD_RESET_TIMEOUT = 1800
AUTH_PASSWORD_VALIDATORS += [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

WEBRTC_ENABLED = ENVIRONMENT == "test" or os.getenv("PIXELVAULT_WEBRTC_ENABLED", "0") == "1"
WEBRTC_TURN_URLS = [
    url
    for url in os.getenv("PIXELVAULT_TURN_URLS", "").split(",")
    if url.startswith(("turn:", "turns:"))
]
WEBRTC_TURN_SECRET = os.getenv("PIXELVAULT_TURN_SECRET", "")
CELERY_BEAT_SCHEDULE["ephemeral-call-cleanup"] = {
    "task": "negotiations.tasks.clean_call_signaling",
    "schedule": 30.0,
}

# Demonstration pricing is disclosed in every proposal and frozen agreement; live origination stays disabled.
INVESTMENT_DEMO_FEE_BPS = 200

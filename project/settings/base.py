# project/settings/base.py

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-_09r+q3ewsrv5expk^88_vgw()=#w+ejtc#kmzlvwo4ygtuk%=')

dotenv_path = BASE_DIR / '.env'
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

NAME = os.environ.get('NAME', 'NO-NAME')

DEBUG =  os.environ.get('DJANGO_DEBUG', 'True') == 'True'

RUNNING_IN_DOCKER = os.environ.get('RUNNING_IN_DOCKER', 'false').lower() == 'true'

# INFO: Application definition

ROOT_URLCONF = 'project.urls'

WSGI_APPLICATION = 'project.wsgi.application'

SITE_ID = 1 # For django-allauth

# INFO: Internationalization

LANGUAGE_CODE = 'nl'

TIME_ZONE = 'Europe/Brussels'
TIME_FORMAT = 'H:i'

USE_I18N = True

USE_TZ = True

# INFO: 

LOGIN_URL="account_login"
LOGOUT_URL="account_logout"

LOGIN_REDIRECT_URL="/"
LOGOUT_REDIRECT_URL="/"

NTFY_BASE_URL = os.environ.get("NTFY_BASE_URL")
NTFY_TOPIC = os.environ.get("NTFY_TOPIC")

SESSION_COOKIE_AGE=2592000 # 30 days in seconds
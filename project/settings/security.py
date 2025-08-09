# project/settings/security.py

import os
from .base import DEBUG, RUNNING_IN_DOCKER

ALLOWED_HOSTS_STRING = os.environ.get('DJANGO_ALLOWED_HOSTS', '127.0.0.1,10.1.1.224,localhost')
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_STRING.split(',') if host.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '10.1.1.224']

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# INFO: FOR SSL/TLS (HTTPS) Configuration
# If Nginx is handling SSL termination and forwarding as HTTP
# This tells Django to trust the X-Forwarded-Proto header from your proxy for determining if a request is secure.
# Only set this if you are sure your proxy is setting this header correctly and cannot be spoofed by clients.

if RUNNING_IN_DOCKER:

    USE_X_FORWARDED_HOST = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    if os.environ.get('SSL_TLS', 'False') == 'True':
        SECURE_SSL_REDIRECT = True # If all traffic should be HTTPS
        SESSION_COOKIE_SECURE = True
        CSRF_COOKIE_SECURE = True

        CSRF_TRUSTED_ORIGINS_STRING = os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '')
        if CSRF_TRUSTED_ORIGINS_STRING:
            CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS_STRING.split(',') if origin.strip()]
        else:
            CSRF_TRUSTED_ORIGINS = [f"http://{host}:{os.environ.get('APP_PORT', '8000')}" for host in ALLOWED_HOSTS if host not in ['*', '.example.com']]
            CSRF_TRUSTED_ORIGINS.extend([f"http://localhost:{os.environ.get('APP_PORT', '8000')}", f"http://127.0.0.1:{os.environ.get('APP_PORT', '8000')}"])

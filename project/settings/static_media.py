# project/settings/static_media.py

import os
from .base import DEBUG, BASE_DIR

# INFO: File Upload Settings
# FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5 MB = max memory size, after this, disk streaming
# DATA_UPLOAD_MAX_BODY_SIZE = 11811160064 # 11 GB

STATIC_URL = 'static/'
STATICFILES_DIRS = [
    BASE_DIR / "static",
    BASE_DIR / 'theme/static',
]
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]
# project/ntfy.py

import os
import requests # pyright: ignore[reportMissingModuleSource]
from django.apps import apps
from .settings import NTFY_TOPIC, NTFY_BASE_URL

def send_notification(message, title="Django Notification", priority="default", tags=None):
    
    GlobalSettings = apps.get_model('startpages', 'GlobalSettings')
    
    try:
        settings = GlobalSettings.load()
        if not settings.NTFY_active:
            return
    except Exception:
        # Failsafe if DB is not ready or migration not applied
        return

    if not NTFY_BASE_URL or not NTFY_TOPIC:
        print("NTFY: Configuration missing (NTFY_BASE_URL or NTFY_TOPIC).")
        return

    url = f"{NTFY_BASE_URL.rstrip('/')}/{NTFY_TOPIC}"
    
    headers = {
        "Title": title,
        "Priority": priority,
    }
    
    if tags:
        headers["Tags"] = ",".join(tags)

    try:
        response = requests.post(
            url, 
            data=message.encode(encoding='utf-8'), 
            headers=headers,
            timeout=5
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"NTFY Error: {e}")
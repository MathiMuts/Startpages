#!/bin/sh

set -e

echo "Entrypoint script started..."

if [ "$1" = "/app/cron.sh" ]; then
    echo "Running in Cron mode (staying as root to configure daemon)..."
else
    echo "Entrypoint script started as user: $(whoami)"
    echo "Taking ownership of volume directories..."
    chown -R appuser:appuser /app/media
    chown -R appuser:appuser /app/staticfiles
fi

echo "Setting mask..."
umask 0002

if [ "$1" != "/app/cron.sh" ]; then
    echo "Applying database migrations..."
    gosu appuser python manage.py migrate --noinput

    echo "Wiping old static files from volume..."
    gosu appuser find /app/staticfiles/ -mindepth 1 -delete

    echo "Compiling tailwind..."
    python manage.py tailwind build

    echo "Collecting static files for production..."
    gosu appuser python manage.py collectstatic --noinput --clear
    
    echo "Starting application server as user: appuser..."
    exec gosu appuser "$@"
else
    echo "Starting Cron..."
    exec "$@"
fi
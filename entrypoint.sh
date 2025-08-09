#!/bin/sh

set -e

echo "Entrypoint script started as user: $(whoami)"

echo "Creating environment file for cron jobs..."

echo "Applying database migrations..."
python manage.py migrate --noinput

if [ "$DJANGO_ENV" != "development" ]; then
    echo "Collecting static files for production..."
    python manage.py collectstatic --noinput --clear
fi
 
echo "Starting application server..."
exec "$@"
```
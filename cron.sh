#!/bin/bash

# Default to 00:01 if not set
TIME=${DAILY_MAIL_TIME:-00:00}

echo "Setting up daily mail cronjob at: $TIME"

# Dump environment variables to /etc/environment
printenv | grep -v "no_proxy" >> /etc/environment

# Resolve absolute paths. 
# 'command -v' is more portable/reliable than 'which' in some slim images.
GOSU_BIN=$(command -v gosu)
PYTHON_BIN=$(command -v python)

if [ -z "$GOSU_BIN" ]; then
    echo "Error: gosu not found in PATH"
    exit 1
fi

if [ -z "$PYTHON_BIN" ]; then
    echo "Error: python not found in PATH"
    exit 1
fi

echo "Using gosu at: $GOSU_BIN"
echo "Using python at: $PYTHON_BIN"

# Use Python to parse the HH:MM string into Minute Hour format safely
read MIN HOUR <<< $(python3 -c "h, m = '$TIME'.split(':'); print(m, h)")

# Create the cron file
# We use absolute paths for everything to ensure cron finds them.
COMMAND="$GOSU_BIN appuser $PYTHON_BIN /app/manage.py send_daily_mail >> /proc/1/fd/1 2>&1"

echo "$MIN $HOUR * * * $COMMAND" > /etc/cron.d/django-daily-mail

# Give execution rights on the cron job
chmod 0644 /etc/cron.d/django-daily-mail

# Apply cron job
crontab /etc/cron.d/django-daily-mail

# Create the log file
touch /var/log/cron.log

echo "Cron setup complete. Daemon starting..."

# Run cron in foreground (-f)
exec cron -f
# startpages/management/commands/send_daily_mail.py

from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.contrib.auth.models import User
from django.conf import settings as django_settings
from startpages.models import GlobalSettings
from datetime import timedelta

class Command(BaseCommand):
    help = 'Sends a daily summary email to admins and staff based on GlobalSettings.'

    def handle(self, *args, **options):
        # 1. Load Settings
        try:
            settings = GlobalSettings.load()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Could not load GlobalSettings: {e}'))
            return

        if not settings.DAILY_MAIL_ACTIVE:
            self.stdout.write(self.style.WARNING('Daily Mail is disabled in GlobalSettings. Skipping.'))
            return

        # 2. Define Time Range (The Full Previous Calendar Day)
        # We use localtime to respect the project's TIME_ZONE (e.g., Europe/Brussels)
        now = timezone.now()
        local_now = timezone.localtime(now)
        
        # Get start of today (00:00:00)
        today_midnight = local_now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Get start of yesterday (00:00:00)
        yesterday_midnight = today_midnight - timedelta(days=1)
        
        context = {
            # Date format: "12 January"
            'date': yesterday_midnight.strftime('%d %B'),
            'include_registrations': settings.DAILY_MAIL_INCLUDE_REGISTRATIONS,
            'registrations': [],
            'registrations_count': 0,
        }

        # Track if there is any content to send
        has_updates = False

        # 3. Gather Registrations
        if settings.DAILY_MAIL_INCLUDE_REGISTRATIONS:
            # Filter for: Yesterday 00:00 <= date_joined < Today 00:00
            new_users = User.objects.filter(
                date_joined__gte=yesterday_midnight,
                date_joined__lt=today_midnight
            ).order_by('-date_joined')
            
            count = new_users.count()
            context['registrations'] = new_users
            context['registrations_count'] = count
            
            if count > 0:
                has_updates = True
            
            self.stdout.write(f"Reporting on date: {context['date']}")
            self.stdout.write(f"Found {count} new registrations between {yesterday_midnight} and {today_midnight}.")

        # 4. Check for Updates
        if not has_updates:
            self.stdout.write(self.style.SUCCESS("No updates found for the specified period. No email sent."))
            return

        # 5. Prepare Email Content
        subject_file = 'startpages/email/daily_summary_subject.txt'
        txt_file = 'startpages/email/daily_summary.txt'
        html_file = 'startpages/email/daily_summary.html'

        try:
            # Render subject (strip newlines)
            subject = render_to_string(subject_file, context).strip()
            # Render bodies
            text_content = render_to_string(txt_file, context)
            html_content = render_to_string(html_file, context)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error rendering templates: {e}"))
            return

        # 6. Get Recipients (Staff/Admins with emails)
        recipients = User.objects.filter(is_staff=True).exclude(email='').values_list('email', flat=True)
        
        if not recipients:
            self.stdout.write(self.style.WARNING("No staff users with email addresses found."))
            return

        # 7. Send Emails
        # We send individually to avoid exposing list of admins in 'To' field
        success_count = 0
        from_email = getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')

        for email_addr in recipients:
            try:
                msg = EmailMultiAlternatives(subject, text_content, from_email, [email_addr])
                msg.attach_alternative(html_content, "text/html")
                msg.send()
                success_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to send to {email_addr}: {e}"))

        self.stdout.write(self.style.SUCCESS(f'Daily mail sent successfully to {success_count} recipients.'))
# startpages/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache

NTFY_PRIORITIES = [
    ('max', 'Max'),
    ('high', 'High'),
    ('default', 'Default'),
    ('low', 'Low'),
    ('min', 'Min'),
]


class GlobalSettings(models.Model):
    NTFY_active = models.BooleanField(default=True, help_text="If active, NTFY notifications are enabled.")
    NTFY_send_registration = models.BooleanField(default=True, help_text="If active, Notifications are sent for all new registrations.")
    NTFY_registration_priority = models.CharField(
        max_length=10, 
        choices=NTFY_PRIORITIES, 
        default='default',
        help_text="High priorities will make noise while low priorities are silent notifications."
    )
    
    DAILY_MAIL_ACTIVE = models.BooleanField(default=True, help_text="If active, daily mails are enabled.")
    DAILY_MAIL_INCLUDE_REGISTRATIONS = models.BooleanField(default=True, help_text="If active, daily mails include registrations.")
    
    def save(self, *args, **kwargs):
        self.pk = 1 # Force singleton
        super().save(*args, **kwargs)
        cache.set('global_settings', self)

    def delete(self, *args, **kwargs):
        pass # Prevent deletion
    
    @classmethod
    def load(cls):
        if cache.get('global_settings') is None:
            obj, created = cls.objects.get_or_create(pk=1)
            if not created:
                cache.set('global_settings', obj)
            return obj
        return cache.get('global_settings')

    def __str__(self):
        return "Global Settings"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s profile"
    
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        
@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()
    
# INFO: Notification Signal
@receiver(post_save, sender=User)
def notify_new_registration(sender, instance, created, **kwargs):
    if created:
        # Import inside function to avoid circular dependency
        from project.ntfy import send_notification
        
        settings = GlobalSettings.load()
        if settings.NTFY_send_registration:
            send_notification(
                message=f"New user registered: {instance.username} ({instance.email})",
                title="New Registration",
                priority=settings.NTFY_registration_priority,
                tags=["bust_in_silhouette"]
            )


class StartPage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="startpages")
    title = models.CharField(max_length=100, default="My Startpage")
    slug = models.SlugField(unique=True, editable=False, max_length=255)
    is_default = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'title')
        verbose_name = "Start Page"
        verbose_name_plural = "Start Pages"
        
    def save(self, *args, **kwargs):
        if self.title:
            self.slug = slugify(self.title)
            
        if self.is_default:
            StartPage.objects.filter(user=self.user, is_default=True).exclude(id=self.id).update(is_default=False)
            
        super().save(*args, **kwargs)
          
    def __str__(self):
        return self.title

class Section(models.Model):
    page = models.ForeignKey(StartPage, related_name='sections', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0, help_text="Lower numbers appear first")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.name} ({self.page.title})"

class Link(models.Model):
    section = models.ForeignKey(Section, related_name='links', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    url = models.URLField(max_length=500)
    color = models.CharField(max_length=7, null=True, blank=True, help_text="Hex color code")
    order = models.PositiveIntegerField(default=0, help_text="Lower numbers appear first")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name
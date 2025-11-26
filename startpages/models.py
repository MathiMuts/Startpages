from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

class StartPage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="startpages")
    title = models.CharField(max_length=100, default="My Startpage")
    slug = models.SlugField(unique=True, editable=False, max_length=255)

    class Meta:
        unique_together = ('user', 'title')
        verbose_name = "Start Page"
        verbose_name_plural = "Start Pages"
        
    def save(self, *args, **kwargs):
        if self.title:
            self.slug = slugify(self.title)
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
    order = models.PositiveIntegerField(default=0, help_text="Lower numbers appear first")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name
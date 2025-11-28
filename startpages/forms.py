# startpages/forms.py

from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class UsernameChangeForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username']

    def clean_username(self):
        username = self.cleaned_data['username']
        # Check if taken (exclude current user)
        if User.objects.filter(username__iexact=username).exclude(pk=self.instance.pk).exists():
            raise ValidationError("This username is already taken.")
        return username
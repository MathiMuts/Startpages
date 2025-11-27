# startpages/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from .models import StartPage, Profile

def index(request, username=None, slug=None):
    page = None

    if username and slug and request.user.is_authenticated:
        if request.user.username.lower() == username.lower():
            page = get_object_or_404(StartPage, user__username__iexact=username, slug=slug)

    elif request.user.is_authenticated:
        # UPDATED: Try to get the default page first, otherwise the first created one
        page = StartPage.objects.filter(user=request.user, is_default=True).first()
        if not page:
            page = StartPage.objects.filter(user=request.user).first()
    
    if not page:
        # If user is logged in but has NO pages, redirect to profile to create one
        if request.user.is_authenticated:
             return redirect('startpages:profile')
        return render(request, 'startpages/pages/404.html')

    sections = page.sections.prefetch_related('links').all()

    context = {
        'page': page,
        'sections': sections,
    }

    return render(request, 'startpages/pages/startpage.html', context)

@login_required
def profile(request):
    startpages = StartPage.objects.filter(user=request.user).order_by('-is_default', 'title')
    return render(request, 'startpages/pages/profile.html', {
        'startpages': startpages,
        'tab': request.GET.get('tab', 'personal') # Support deep linking to tabs
    })

@login_required
def update_personal_info(request):
    if request.method == 'POST':
        user = request.user
        
        # Update basics
        if request.POST.get('email'):
            user.email = request.POST.get('email')
        
        # Update Avatar
        if request.FILES.get('avatar'):
            # Ensure profile exists (handled by signal, but safe check)
            if not hasattr(user, 'profile'):
                Profile.objects.create(user=user)
            user.profile.avatar = request.FILES['avatar']
            user.profile.save()

        user.save()
        messages.success(request, 'Profile updated successfully.')
        
    return redirect('startpages:profile')

@login_required
def create_startpage(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        if title:
            # Check if it's the first page, make it default automatically
            is_first = not StartPage.objects.filter(user=request.user).exists()
            StartPage.objects.create(
                user=request.user, 
                title=title,
                is_default=is_first
            )
            messages.success(request, f'Startpage "{title}" created!')
        else:
            messages.error(request, 'Title is required.')
    return redirect('startpages:profile')

@login_required
def set_default_page(request, page_id):
    page = get_object_or_404(StartPage, id=page_id, user=request.user)
    page.is_default = True
    page.save() # The model save() method handles unsetting other defaults
    messages.success(request, f'{page.title} is now your default startpage.')
    return redirect('startpages:profile')
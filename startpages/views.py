# startpages/views.py

import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db import transaction
from .models import StartPage, Section, Link, Profile

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
    
    if not request.user.is_authenticated:
        return render(request, 'startpages/pages/index.html')

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

@login_required
def edit_startpage(request, page_id):
    if request.method == 'POST':
        page = get_object_or_404(StartPage, id=page_id, user=request.user)
        
        new_title = request.POST.get('title')
        is_default = request.POST.get('is_default') == 'on'
        
        if new_title:
            page.title = new_title
        
        # Only handle is_default if it's being set to True, 
        # or if it was True and being unchecked (need to ensure at least one default logic if desired)
        # For simplicity, we stick to model logic: setting True unsets others. 
        if is_default:
            page.is_default = True
            
        page.save()
        messages.success(request, 'Startpage updated.')
        
    return redirect('startpages:profile')

@login_required
def delete_startpage(request, page_id):
    if request.method == 'POST':
        page = get_object_or_404(StartPage, id=page_id, user=request.user)
        was_default = page.is_default
        title = page.title
        page.delete()
        
        # If we deleted the default page, make another one default
        if was_default:
            next_page = StartPage.objects.filter(user=request.user).first()
            if next_page:
                next_page.is_default = True
                next_page.save()
                
        messages.success(request, f'Startpage "{title}" deleted.')
    return redirect('startpages:profile')

@login_required
def export_startpage(request, page_id):
    page = get_object_or_404(StartPage, id=page_id, user=request.user)
    
    data = {
        'title': page.title,
        'sections': []
    }
    
    for section in page.sections.all().order_by('order'):
        sec_data = {
            'name': section.name,
            'order': section.order,
            'links': []
        }
        for link in section.links.all().order_by('order'):
            sec_data['links'].append({
                'name': link.name,
                'url': link.url,
                'order': link.order
            })
        data['sections'].append(sec_data)
        
    response = JsonResponse(data, json_dumps_params={'indent': 2})
    response['Content-Disposition'] = f'attachment; filename="{page.slug}_export.json"'
    return response

@login_required
def import_startpage(request):
    if request.method == 'POST':
        json_file = request.POST.get('json_data')
        
        try:
            data = json.loads(json_file)
            
            with transaction.atomic():
                # Check if it's the first page
                is_first = not StartPage.objects.filter(user=request.user).exists()
                
                # Create Page
                page = StartPage.objects.create(
                    user=request.user,
                    title=data.get('title', 'Imported Page'),
                    is_default=is_first
                )
                
                # Create Sections & Links
                sections = data.get('sections', [])
                for sec in sections:
                    new_section = Section.objects.create(
                        page=page,
                        name=sec.get('name', 'Untitled Section'),
                        order=sec.get('order', 0)
                    )
                    
                    links = sec.get('links', [])
                    for link in links:
                        Link.objects.create(
                            section=new_section,
                            name=link.get('name', 'Link'),
                            url=link.get('url', '#'),
                            order=link.get('order', 0)
                        )
            
            messages.success(request, f'Startpage "{data.get("title")}" imported successfully!')
            
        except json.JSONDecodeError:
            messages.error(request, 'Invalid JSON format.')
        except Exception as e:
            messages.error(request, f'Error importing page: {str(e)}')
            
    return redirect('startpages:profile')
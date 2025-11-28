# startpages/views.py

import json
from django.shortcuts import render, redirect, get_object_or_404, reverse
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db import transaction
from .models import StartPage, Section, Link, Profile
from .forms import UsernameChangeForm

def home(request):
    return render(request, 'startpages/pages/index.html')
    
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
    
    google_account = request.user.socialaccount_set.filter(provider='google').first()
    
    return render(request, 'startpages/pages/profile.html', {
        'startpages': startpages,
        'google_account': google_account,
        'tab': request.GET.get('tab', 'personal')
    })

@login_required
def update_personal_info(request):
    if request.method == 'POST':
        user = request.user
        
        # 1. Handle Avatar Update
        if request.FILES.get('avatar'):
            if not hasattr(user, 'profile'):
                Profile.objects.create(user=user)
            user.profile.avatar = request.FILES['avatar']
            user.profile.save()
            messages.success(request, 'Avatar updated.')

        # 2. Handle Username Update
        if 'username' in request.POST:
            form = UsernameChangeForm(request.POST, instance=user)
            if form.is_valid():
                form.save()
                messages.success(request, 'Username updated successfully.')
            else:
                for error in form.errors.values():
                    messages.error(request, error)
        
    return redirect('startpages:profile')

@login_required
def create_startpage(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        if title:
            is_first = not StartPage.objects.filter(user=request.user).exists()
            new_page = StartPage.objects.create(
                user=request.user, 
                title=title,
                is_default=is_first
            )
            messages.success(request, f'Startpage "{title}" created!')
            return redirect('startpages:detail', username=request.user.username, slug=new_page.slug)
        else:
            messages.error(request, 'Title is required.')
    
    return redirect(reverse('startpages:profile') + '?tab=startpages')

@login_required
def set_default_page(request, page_id):
    page = get_object_or_404(StartPage, id=page_id, user=request.user)
    page.is_default = True
    page.save()
    messages.success(request, f'{page.title} is now your default startpage.')
    
    return redirect(reverse('startpages:profile') + '?tab=startpages')

@login_required
def edit_startpage(request, page_id):
    if request.method == 'POST':
        page = get_object_or_404(StartPage, id=page_id, user=request.user)
        
        new_title = request.POST.get('title')
        is_default = request.POST.get('is_default') == 'on'
        
        if new_title:
            page.title = new_title
        
        if is_default:
            page.is_default = True
            
        page.save()
        messages.success(request, 'Startpage updated.')
        
    return redirect(reverse('startpages:profile') + '?tab=startpages')

@login_required
def delete_startpage(request, page_id):
    if request.method == 'POST':
        page = get_object_or_404(StartPage, id=page_id, user=request.user)
        was_default = page.is_default
        title = page.title
        page.delete()
        
        if was_default:
            next_page = StartPage.objects.filter(user=request.user).first()
            if next_page:
                next_page.is_default = True
                next_page.save()
                
        messages.success(request, f'Startpage "{title}" deleted.')
        
    return redirect(reverse('startpages:profile') + '?tab=startpages')

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
                is_first = not StartPage.objects.filter(user=request.user).exists()
                
                page = StartPage.objects.create(
                    user=request.user,
                    title=data.get('title', 'Imported Page'),
                    is_default=is_first
                )
                
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
            
    # Redirect to Startpages Tab
    return redirect(reverse('startpages:profile') + '?tab=startpages')
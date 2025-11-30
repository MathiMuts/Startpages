import json
from django.shortcuts import render, redirect, get_object_or_404, reverse
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import StartPage, Profile, ColorScheme
from .forms import UsernameChangeForm
from .services import StartPageService
from django.core.exceptions import PermissionDenied
from django.http import Http404
from allauth.socialaccount.models import SocialAccount # pyright: ignore[reportMissingImports]

def index(request):
    return render(request, 'startpages/pages/index.html')

@login_required
def startpage(request, username=None, slug=None): 
    page = None
    if username and request.user.username.lower() != username.lower():
        raise PermissionDenied
    
    if username and slug:
        if request.user.username.lower() == username.lower():
            page = get_object_or_404(StartPage, user=request.user, slug=slug)
            
    else:
        page = StartPage.objects.filter(user=request.user, is_default=True).first()
        
        if not page:
            page = StartPage.objects.filter(user=request.user).first()
            
    if not page:
        raise Http404("No StartPage found for this user.")
    
    sections = page.sections.prefetch_related('links').all()
    context = {'page': page, 'sections': sections}
    return render(request, 'startpages/pages/startpage.html', context)

@login_required
def profile(request):
    startpages = StartPage.objects.filter(user=request.user).order_by('-is_default', 'title')
    google_accounts = request.user.socialaccount_set.filter(provider='google')
    themes_qs = ColorScheme.objects.all()
    
    themes = []
    for theme in themes_qs:
        themes.append({
            'id': theme.id,
            'name': theme.name,
            'is_dark': theme.is_dark,
            'preview_colors': theme.preview_colors,
            'colors_json': json.dumps(theme.css_variables)
        })
    
    return render(request, 'startpages/pages/profile.html', {
        'startpages': startpages,
        'google_accounts': google_accounts,
        'tab': request.GET.get('tab', 'personal'),
        'themes': themes
    })

@login_required
def update_personal_info(request):
    if request.method == 'POST':
        user = request.user
        if request.FILES.get('avatar'):
            if not hasattr(user, 'profile'):
                Profile.objects.create(user=user)
            user.profile.avatar = request.FILES['avatar']
            user.profile.save()
            messages.success(request, 'Avatar updated.')

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
            new_page = StartPage.objects.create(user=request.user, title=title, is_default=is_first)
            messages.success(request, f'Startpage "{title}" created!')
            return redirect('startpages:detail', username=request.user.username, slug=new_page.slug)
        else:
            messages.error(request, 'Title is required.')
    return redirect(reverse('startpages:profile') + '?tab=startpages')

@login_required
def set_default_page(request, page_id):
    page = get_object_or_404(StartPage, id=page_id, user=request.user)
    StartPage.objects.filter(user=request.user, is_default=True).update(is_default=False)
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
            StartPage.objects.filter(user=request.user, is_default=True).update(is_default=False)
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
    data = StartPageService.export_to_json(page)
    response = JsonResponse(data, json_dumps_params={'indent': 2})
    response['Content-Disposition'] = f'attachment; filename="{page.slug}_export.json"'
    return response

@login_required
def import_startpage(request):
    if request.method == 'POST':
        json_data = request.POST.get('json_data')
        success, message = StartPageService.import_from_json(request.user, json_data)
        if success:
            messages.success(request, f'Startpage "{message}" imported successfully!')
        else:
            messages.error(request, f'Error importing page: {message}')
    return redirect(reverse('startpages:profile') + '?tab=startpages')

@login_required
def manage_social_connections(request):
    accounts = request.user.socialaccount_set.all().order_by('provider', 'uid')
    return render(request, 'startpages/pages/social_connections.html', {
        'accounts': accounts
    })
    
@login_required
def disconnect_social_account(request, account_id):
    if request.method == 'POST':
        account = get_object_or_404(SocialAccount, id=account_id, user=request.user)
        provider = account.provider
        account.delete()
        messages.success(request, f'{provider.title()} account disconnected successfully.')
    return redirect('startpages:manage_social')
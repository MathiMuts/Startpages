# startpages/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from .models import StartPage


def index(request, username=None, slug=None):
    page = None

    if username and slug and request.user.is_authenticated:
        if request.user.username.lower() == username.lower():
            page = get_object_or_404(StartPage, user__username__iexact=username, slug=slug)

    elif request.user.is_authenticated:
        page = StartPage.objects.filter(user=request.user).first()
    
    if not page:
        return render(request, 'startpages/pages/404.html')

    sections = page.sections.prefetch_related('links').all()

    context = {
        'page': page,
        'sections': sections,
    }

    return render(request, 'startpages/pages/startpage.html', context)


def testpage(request):
    if request.method == 'POST':
        
        message_type = request.POST.get('message_type')

        if message_type == 'info':
            messages.info(request, 'This is an informational message.')
        elif message_type == 'success':
            messages.success(request, 'The operation was successful!')
        elif message_type == 'warning':
            messages.warning(request, 'This is a warning message.') 
        elif message_type == 'error':
            messages.error(request, 'An error occurred during the process.')
        
        return redirect('startpages:testpage')

    return render(request, 'startpages/pages/testpage.html')


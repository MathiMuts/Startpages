# startpages/views.py

import json
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from .models import StartPage, Section, Link


def index(request, username=None, slug=None):
    page = None

    if username and slug and request.user.is_authenticated:
        if request.user.username.lower() == username.lower():
            page = get_object_or_404(StartPage, user__username__iexact=username, slug=slug)

    elif request.user.is_authenticated:
        page = StartPage.objects.filter(user=request.user).first()
    
    if not page:
        return render(request, 'startpages/pages/404_no_startpage.html')

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

# INFO: --- API Views ---

@login_required
@require_POST
def update_section_order(request):
    """Expects JSON: { 'ids': [1, 5, 2] }"""
    data = json.loads(request.body)
    section_ids = data.get('ids', [])
    
    for index, sec_id in enumerate(section_ids):
        Section.objects.filter(id=sec_id, page__user=request.user).update(order=index)
        
    return JsonResponse({'status': 'success'})

@login_required
@require_POST
def update_link_order(request):
    """Expects JSON: { 'section_id': 1, 'link_ids': [10, 12, 11] }"""
    data = json.loads(request.body)
    section_id = data.get('section_id')
    link_ids = data.get('link_ids', [])
    
    target_section = get_object_or_404(Section, id=section_id, page__user=request.user)
    
    for index, link_id in enumerate(link_ids):
        Link.objects.filter(id=link_id, section__page__user=request.user).update(
            order=index, 
            section=target_section
        )
        
    return JsonResponse({'status': 'success'})

@login_required
def get_item_details(request):
    """GET request to fetch data for the modal"""
    item_type = request.GET.get('type') # 'section' or 'link'
    item_id = request.GET.get('id')
    
    data = {}
    
    if item_type == 'section':
        item = get_object_or_404(Section, id=item_id, page__user=request.user)
        data = {'id': item.id, 'name': item.name, 'type': 'section'}
    elif item_type == 'link':
        item = get_object_or_404(Link, id=item_id, section__page__user=request.user)
        data = {'id': item.id, 'name': item.name, 'url': item.url, 'type': 'link'}
        
    return JsonResponse(data)

@login_required
@require_POST
def save_item_details(request):
    """Expects JSON to update name/url"""
    data = json.loads(request.body)
    item_type = data.get('type')
    item_id = data.get('id')
    
    if item_type == 'section':
        item = get_object_or_404(Section, id=item_id, page__user=request.user)
        item.name = data.get('name')
        item.save()
    elif item_type == 'link':
        item = get_object_or_404(Link, id=item_id, section__page__user=request.user)
        item.name = data.get('name')
        item.url = data.get('url')
        item.save()
        
    return JsonResponse({'status': 'success'})

@login_required
@require_POST
def add_link(request):
    """Expects JSON: { 'section_id': 1, 'name': 'Foo', 'url': '...' }"""
    data = json.loads(request.body)
    section_id = data.get('section_id')
    name = data.get('name')
    url = data.get('url')

    section = get_object_or_404(Section, id=section_id, page__user=request.user)
    
    # Check limit
    if section.links.count() >= 10:
        return JsonResponse({'status': 'error', 'message': 'Max 10 links per section allowed.'}, status=400)

    # Calculate order (put at end)
    max_order = section.links.order_by('-order').first()
    new_order = (max_order.order + 1) if max_order else 0

    new_link = Link.objects.create(
        section=section,
        name=name,
        url=url,
        order=new_order
    )

    return JsonResponse({
        'status': 'success',
        'link': {
            'id': new_link.id,
            'name': new_link.name,
            'url': new_link.url
        }
    })
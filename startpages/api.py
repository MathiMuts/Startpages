# startpages/api.py

import json
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.db import models
from .models import Section, Link, StartPage

@login_required
@require_POST
def update_section_order(request):
    data = json.loads(request.body)
    section_ids = data.get('ids', [])
    
    for index, sec_id in enumerate(section_ids):
        Section.objects.filter(id=sec_id, page__user=request.user).update(order=index)
        
    return JsonResponse({'status': 'success'})

@login_required
@require_POST
def update_link_order(request):
    data = json.loads(request.body)
    section_id = data.get('section_id')
    link_ids = data.get('link_ids', [])
    
    if len(link_ids) > 10:
        return JsonResponse({
            'status': 'error', 
            'message': 'Section cannot contain more than 10 links.'
        }, status=400)
    
    target_section = get_object_or_404(Section, id=section_id, page__user=request.user)
    
    for index, link_id in enumerate(link_ids):
        Link.objects.filter(id=link_id, section__page__user=request.user).update(
            order=index, 
            section=target_section
        )
        
    return JsonResponse({'status': 'success'})

@login_required
def get_item_details(request):
    item_type = request.GET.get('type')
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
    data = json.loads(request.body)
    section_id = data.get('section_id')
    name = data.get('name')
    url = data.get('url')

    section = get_object_or_404(Section, id=section_id, page__user=request.user)
    
    if section.links.count() >= 10:
        return JsonResponse({'status': 'error', 'message': 'Max 10 links per section allowed.'}, status=400)

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

@login_required
@require_POST
def add_section(request):
    data = json.loads(request.body)
    name = data.get('name')
    
    if not name:
        return JsonResponse({'status': 'error', 'message': 'Name is required'}, status=400)

    # Find current page: Default, or first available
    page = StartPage.objects.filter(user=request.user, is_default=True).first()
    if not page:
        page = StartPage.objects.filter(user=request.user).first()
        
    if not page:
        return JsonResponse({'status': 'error', 'message': 'No startpage found'}, status=404)

    max_order = page.sections.aggregate(models.Max('order'))['order__max']
    new_order = (max_order + 1) if max_order is not None else 0

    new_section = Section.objects.create(
        page=page,
        name=name,
        order=new_order
    )

    return JsonResponse({
        'status': 'success',
        'section': {
            'id': new_section.id,
            'name': new_section.name
        }
    })

@login_required
@require_POST
def delete_item(request):
    data = json.loads(request.body)
    item_type = data.get('type')
    item_id = data.get('id')
    
    if item_type == 'section':
        item = get_object_or_404(Section, id=item_id, page__user=request.user)
        item.delete()
    elif item_type == 'link':
        item = get_object_or_404(Link, id=item_id, section__page__user=request.user)
        item.delete()
    else:
        return JsonResponse({'status': 'error', 'message': 'Invalid type'}, status=400)
        
    return JsonResponse({'status': 'success'})
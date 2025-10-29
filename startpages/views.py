# startpages/views.py

from django.shortcuts import render
from django.views.decorators.cache import cache_page

def index(request):
    return render(request, 'startpages/index.html')
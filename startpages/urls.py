# startpages/urls.py

from django.urls import path
from . import views

app_name = 'startpages'

urlpatterns = [
    path('', views.index, name='index'),
    path('testpage', views.testpage, name='testpage'),
]
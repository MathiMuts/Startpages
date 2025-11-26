# startpages/urls.py

from django.urls import path
from . import views

app_name = 'startpages'

urlpatterns = [
    path('', views.index, name='index'),
    path('<str:username>/<slug:slug>/', views.index, name='detail'),
    
    
    path('testpage', views.testpage, name='testpage'),
]
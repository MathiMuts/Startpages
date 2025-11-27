# startpages/urls.py

from django.urls import path
from . import views

app_name = 'startpages'

urlpatterns = [
    # Main page
    path('', views.index, name='index'),
    path('testpage', views.testpage, name='testpage'),
    
    # API Endpoints
    path('api/update-section-order/', views.update_section_order, name='update_section_order'),
    path('api/update-link-order/', views.update_link_order, name='update_link_order'),
    path('api/get-item-details/', views.get_item_details, name='get_item_details'),
    path('api/save-item-details/', views.save_item_details, name='save_item_details'),
    path('api/add-link/', views.add_link, name='add_link'),
    
    # User specific page
    path('<str:username>/<slug:slug>/', views.index, name='detail'),
]
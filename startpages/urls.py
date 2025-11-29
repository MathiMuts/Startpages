# startpages/urls.py

from django.urls import path
from . import views
from . import api

app_name = 'startpages'

urlpatterns = [
    # Main page
    path('', views.index, name='index'),
    path('home', views.home, name='home'),
    
    # Profile & Settings
    path('profile/', views.profile, name='profile'),
    path('profile/create-page/', views.create_startpage, name='create_startpage'),
    path('profile/import-page/', views.import_startpage, name='import_startpage'),
    path('profile/page/<int:page_id>/edit/', views.edit_startpage, name='edit_startpage'),
    path('profile/page/<int:page_id>/delete/', views.delete_startpage, name='delete_startpage'),
    path('profile/page/<int:page_id>/export/', views.export_startpage, name='export_startpage'),
    path('profile/set-default/<int:page_id>/', views.set_default_page, name='set_default_page'),
    path('profile/update-info/', views.update_personal_info, name='update_personal_info'),
    path('profile/connections/', views.manage_social_connections, name='manage_social'),
    path('profile/connections/<int:account_id>/disconnect/', views.disconnect_social_account, name='disconnect_social'),
    
    # API Endpoints
    path('api/update-section-order/', api.update_section_order, name='update_section_order'),
    path('api/update-link-order/', api.update_link_order, name='update_link_order'),
    path('api/get-item-details/', api.get_item_details, name='get_item_details'),
    path('api/save-item-details/', api.save_item_details, name='save_item_details'),
    path('api/add-link/', api.add_link, name='add_link'),
    path('api/add-section/', api.add_section, name='add_section'),
    path('api/delete-item/', api.delete_item, name='delete_item'),
    path('api/update-theme/', api.update_theme, name='update_theme'),
    path('api/get-theme/', api.get_current_theme, name='get_current_theme'),
    
    # User specific page
    path('<str:username>/<slug:slug>/', views.index, name='detail')
]
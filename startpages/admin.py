from django.contrib import admin
from .models import StartPage, Section, Link

class LinkInline(admin.TabularInline):
    model = Link
    extra = 1
    fields = ('name', 'url', 'order')
    sortable_field_name = "order"

class SectionAdmin(admin.ModelAdmin):
    inlines = [LinkInline]
    list_display = ('name', 'page', 'order')
    list_editable = ('order',)

class SectionInline(admin.TabularInline):
    model = Section
    extra = 0
    show_change_link = True
    fields = ('name', 'order')

class StartPageAdmin(admin.ModelAdmin):
    inlines = [SectionInline]
    list_display = ('user', 'title', 'slug')
    list_filter = ('user',)
    search_fields = ('user__username', 'title')

admin.site.register(StartPage, StartPageAdmin)
admin.site.register(Section, SectionAdmin)
admin.site.register(Link)
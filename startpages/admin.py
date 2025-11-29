from django.contrib import admin
from .models import GlobalSettings, StartPage, Section, Link, ColorScheme

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

class ColorSchemeInline(admin.StackedInline):
    model = ColorScheme
    extra = 0
    fields = ('name', 'is_dark', 'preview_colors', 'css_variables')
    help_text = "Define Global Themes here."

class GlobalSettingsAdmin(admin.ModelAdmin):
    inlines = [ColorSchemeInline]
    
    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)

admin.site.register(GlobalSettings, GlobalSettingsAdmin)
admin.site.register(StartPage, StartPageAdmin)
admin.site.register(Section, SectionAdmin)
admin.site.register(Link)
admin.site.register(ColorScheme)
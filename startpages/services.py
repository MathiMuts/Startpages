import json
from django.db import transaction
from .models import StartPage, Section, Link

class StartPageService:
    @staticmethod
    def export_to_json(page):
        data = {
            'title': page.title,
            'sections': []
        }
        for section in page.sections.all().order_by('order'):
            sec_data = {
                'name': section.name,
                'order': section.order,
                'links': []
            }
            for link in section.links.all().order_by('order'):
                sec_data['links'].append({
                    'name': link.name,
                    'url': link.url,
                    'order': link.order
                })
            data['sections'].append(sec_data)
        return data

    @staticmethod
    def import_from_json(user, json_string):
        try:
            data = json.loads(json_string)
            with transaction.atomic():
                is_first = not StartPage.objects.filter(user=user).exists()
                
                page = StartPage.objects.create(
                    user=user,
                    title=data.get('title', 'Imported Page'),
                    is_default=is_first
                )
                
                sections = data.get('sections', [])
                for sec in sections:
                    new_section = Section.objects.create(
                        page=page,
                        name=sec.get('name', 'Untitled Section'),
                        order=sec.get('order', 0)
                    )
                    
                    links = sec.get('links', [])
                    for link in links:
                        Link.objects.create(
                            section=new_section,
                            name=link.get('name', 'Link'),
                            url=link.get('url', '#'),
                            order=link.get('order', 0)
                        )
            return True, page.title
        except json.JSONDecodeError:
            return False, "Invalid JSON format."
        except Exception as e:
            return False, str(e)
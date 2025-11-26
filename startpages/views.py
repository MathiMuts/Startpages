# startpages/views.py

from django.shortcuts import render, redirect
from django.contrib import messages 

def index(request):
    sections = []
    sections.append({'name': 'section1', 'links': [
        {'name': 'link1', 'color': '#ff0000', 'link': '#'},
        {'name': 'link2', 'color': '#000fff', 'link': '#'},
        {'name': 'link3', 'color': '#000000', 'link': '#'},
        {'name': 'link4', 'color': '#ff0000', 'link': '#'},
        {'name': 'link5', 'color': '#000fff', 'link': '#'},
        {'name': 'link6', 'color': '#00ff00', 'link': '#'},
        {'name': 'link7', 'color': '#000000', 'link': '#'},
        {'name': 'link8', 'color': '#000fff', 'link': '#'},
        ]})
    sections.append({'name': 'section2', 'links': [
        {'name': 'link1', 'color': '#000fff', 'link': '#'},
        {'name': 'link2', 'color': '#ff0000', 'link': '#'},
        {'name': 'link3', 'color': '#000000', 'link': '#'},
        {'name': 'link4', 'color': '#000fff', 'link': '#'},
        {'name': 'link5', 'color': "#00ff00", 'link': '#'},
        {'name': 'link6', 'color': '#000000', 'link': '#'},
        {'name': 'link7', 'color': '#ff0000', 'link': '#'},
        {'name': 'link8', 'color': '#000000', 'link': '#'},
        ]})
    sections.append({'name': 'section3', 'links': [
        {'name': 'link1', 'color': '#000fff', 'link': '#'},
        {'name': 'link2', 'color': "#00ff00", 'link': '#'},
        {'name': 'link3', 'color': '#000000', 'link': '#'},
        {'name': 'link4', 'color': '#ff0000', 'link': '#'},
        {'name': 'link5', 'color': '#000000', 'link': '#'},
        ]})
    sections.append({'name': 'section4', 'links': [
        {'name': 'link1', 'color': '#000fff', 'link': '#'},
        {'name': 'link2', 'color': "#00ff00", 'link': '#'},
        {'name': 'link3', 'color': '#000000', 'link': '#'},
        {'name': 'link4', 'color': '#ff0000', 'link': '#'},
        {'name': 'link5', 'color': '#000000', 'link': '#'},
        ]})
    sections.append({'name': 'section5', 'links': [
        {'name': 'link1', 'color': '#000fff', 'link': '#'},
        {'name': 'link2', 'color': '#ff0000', 'link': '#'},
        {'name': 'link3', 'color': '#000000', 'link': '#'},
        {'name': 'link4', 'color': '#000fff', 'link': '#'},
        {'name': 'link5', 'color': "#00ff00", 'link': '#'},
        {'name': 'link6', 'color': '#000000', 'link': '#'},
        {'name': 'link7', 'color': '#ff0000', 'link': '#'},
        {'name': 'link8', 'color': '#000000', 'link': '#'},
        ]})
    
    for _ in range(0): sections.append(sections[0])
    

    return render(request, 'startpages/pages/startpage.html', {'grid_cols': 3, 'sections': sections})

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
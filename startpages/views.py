# startpages/views.py

from django.shortcuts import render, redirect
from django.contrib import messages 

def index(request):
    return render(request, 'startpages/pages/startpage.html')

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
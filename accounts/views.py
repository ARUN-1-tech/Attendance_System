from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages

def login_view(request):
    if request.user.is_authenticated:
        return redirect_based_on_role(request.user)

    if request.method == 'POST':
        u = request.POST.get('username')
        p = request.POST.get('password')
        user = authenticate(request, username=u, password=p)
        if user is not None:
            login(request, user)
            return redirect_based_on_role(user)
        else:
            messages.error(request, 'Invalid credentials')
    
    return render(request, 'accounts/login.html')

def redirect_based_on_role(user):
    if user.is_superuser or user.role == 'admin':
        return redirect('admin_dashboard')
    elif user.role == 'student':
        return redirect('student_dashboard')
    elif user.role == 'staff':
        return redirect('staff_dashboard')
    elif user.role == 'hod':
        return redirect('hod_dashboard')
    return redirect('login')

def logout_view(request):
    logout(request)
    return redirect('login')

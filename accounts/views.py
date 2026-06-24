from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages

def login_view(request):
    if request.user.is_authenticated:
        print(f"[DEBUG LOG] User already authenticated: {request.user.username} (role={getattr(request.user, 'role', None)})")
        return redirect_based_on_role(request, request.user)

    if request.method == 'POST':
        u = request.POST.get('username', '').strip()
        p = request.POST.get('password', '').strip()
        print(f"[DEBUG LOG] Login POST request received. Username: '{u}'")
        
        from accounts.models import Student, User
        is_reg_no_login = False
        try:
            student = Student.objects.get(reg_no=u)
            u = student.user.username
            is_reg_no_login = True
            print(f"[DEBUG LOG] Registration number matched. Resolved username: '{u}'")
        except Student.DoesNotExist:
            pass
            
        if not is_reg_no_login and User.objects.filter(username=u, role='student').exists():
            print(f"[DEBUG LOG] Rejected login for student using username: '{u}'")
            messages.error(request, 'Students must log in only with registration number.')
        else:
            print(f"[DEBUG LOG] Authenticating user '{u}'...")
            user = authenticate(request, username=u, password=p)
            if user is not None:
                login(request, user)
                print(f"[DEBUG LOG] Authentication succeeded for user: '{user.username}' (role={user.role})")
                return redirect_based_on_role(request, user)
            else:
                print(f"[DEBUG LOG] Authentication failed (returned None) for username: '{u}'")
                messages.error(request, 'Invalid credentials')
    
    return render(request, 'accounts/login.html')

def redirect_based_on_role(request, user):
    print(f"[DEBUG LOG] Redirecting user '{user.username}' based on role '{user.role}' (is_superuser={user.is_superuser})")
    if user.is_superuser or user.role == 'admin':
        print("[DEBUG LOG] Redirecting to 'admin_dashboard'")
        return redirect('admin_dashboard')
    elif user.role == 'student':
        print("[DEBUG LOG] Redirecting to 'student_dashboard'")
        return redirect('student_dashboard')
    elif user.role in ['staff', 'hod']:
        from attendance.models import OTP
        from django.utils import timezone
        from datetime import timedelta
        three_minutes_ago = timezone.now() - timedelta(minutes=3)
        
        # Check if this user created an active OTP session in the last 3 minutes
        active_otp = OTP.objects.filter(
            creator=user,
            is_active=True,
            created_at__gte=three_minutes_ago
        ).order_by('-created_at').first()
        
        if active_otp:
            print(f"[DEBUG LOG] User has active OTP session. Redirecting to OTP session {active_otp.id}")
            request.session['active_otp_id'] = active_otp.id
            return redirect('active_otp_session', otp_id=active_otp.id)
            
        if user.role == 'staff':
            print("[DEBUG LOG] Redirecting to 'staff_dashboard'")
            return redirect('staff_dashboard')
        else:
            print("[DEBUG LOG] Redirecting to 'hod_dashboard'")
            return redirect('hod_dashboard')
    print("[DEBUG LOG] Role did not match any dashboard. Redirecting to 'login'")
    return redirect('login')

def logout_view(request):
    from accounts.utils import has_active_otp
    if request.user.is_authenticated and has_active_otp(request.user):
        messages.error(request, "You cannot log out while an active OTP session is running for your class.")
        return redirect('student_dashboard')
    logout(request)
    return redirect('login')

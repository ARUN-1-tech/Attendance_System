from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

@login_required
def dashboard(request):
    return render(request, 'student/dashboard.html')

@login_required
def leave_od_status(request):
    if request.user.role != 'student':
        return redirect('login')
        
    from leave.models import Leave
    student = request.user.student
    
    # Leaves
    pending_leaves = Leave.objects.filter(student=student, leave_type='Leave', final_status='Pending')
    accepted_leaves = Leave.objects.filter(student=student, leave_type='Leave', final_status='Approved')
    rejected_leaves = Leave.objects.filter(student=student, leave_type='Leave', final_status='Rejected')
    
    # ODs
    pending_ods = Leave.objects.filter(student=student, leave_type='OD', final_status='Pending')
    accepted_ods = Leave.objects.filter(student=student, leave_type='OD', final_status='Approved')
    rejected_ods = Leave.objects.filter(student=student, leave_type='OD', final_status='Rejected')
    
    from django.utils import timezone
    context = {
        'pending_leaves': pending_leaves,
        'accepted_leaves': accepted_leaves,
        'rejected_leaves': rejected_leaves,
        'pending_ods': pending_ods,
        'accepted_ods': accepted_ods,
        'rejected_ods': rejected_ods,
        'now': timezone.now(),
    }
    return render(request, 'student/leave_od.html', context)

@login_required
def student_profile(request):
    if request.user.role != 'student':
        return redirect('login')
    return render(request, 'student/profile.html', {'profile_user': request.user})

@login_required
def student_timetable(request):
    from django.contrib import messages
    messages.error(request, 'Timetable has been removed.')
    return redirect('student_dashboard')

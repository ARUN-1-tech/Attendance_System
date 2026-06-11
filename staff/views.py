from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from leave.models import Leave
from django.db.models import Q

@login_required
def dashboard(request):
    from accounts.models import Class, Subject
    
    # Check for active session hijack
    active_otp_id = request.session.get('active_otp_id')
    if active_otp_id:
        from attendance.models import OTP
        from django.utils import timezone
        from datetime import timedelta
        otp_qs = OTP.objects.filter(id=active_otp_id, is_active=True)
        if otp_qs.exists():
            otp = otp_qs.first()
            if timezone.now() <= otp.created_at + timedelta(minutes=1):
                from django.shortcuts import redirect
                return redirect('active_otp_session', otp_id=otp.id)
        # Clear if expired
        del request.session['active_otp_id']

    classes = Class.objects.filter(department=request.user.department)
    subjects = Subject.objects.filter(department=request.user.department)
    
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from leave.models import Leave
from django.db.models import Q

@login_required
def dashboard(request):
    from accounts.models import Department, Class, Subject
    
    # Check for active session hijack
    active_otp_id = request.session.get('active_otp_id')
    if active_otp_id:
        from attendance.models import OTP
        from django.utils import timezone
        from datetime import timedelta
        otp_qs = OTP.objects.filter(id=active_otp_id, is_active=True)
        if otp_qs.exists():
            otp = otp_qs.first()
            if timezone.now() <= otp.created_at + timedelta(minutes=1):
                from django.shortcuts import redirect
                return redirect('active_otp_session', otp_id=otp.id)
        # Clear if expired
        del request.session['active_otp_id']

    departments = Department.objects.all()
    classes = Class.objects.all()
    subjects = Subject.objects.filter(department=request.user.department)
    
    context = {
        'departments': departments,
        'classes': classes,
        'subjects': subjects
    }
    return render(request, 'staff/dashboard.html', context)

@login_required
def approvals_list(request):
    if not hasattr(request.user, 'staff') or request.user.staff.staff_type == 'Normal':
        messages.error(request, 'You do not have permission to view leave approvals.')
        return redirect('staff_dashboard')

    from django.utils import timezone
    today = timezone.now().date()
    staff_type = request.user.staff.staff_type
    
    if staff_type == 'Tutor':
        pending_leaves = Leave.objects.none()
        pending_ods = Leave.objects.none()
        processed_leaves_today = Leave.objects.none()
        processed_ods_today = Leave.objects.filter(
            student__tutor=request.user,
            leave_type='OD',
            hod_approved='Approved',
            is_archived=False
        ).select_related('student__user').distinct().order_by('-updated_at')
        
    elif staff_type == 'Advisor':
        pending_leaves = Leave.objects.filter(
            student__advisor=request.user,
            tutor_approved='Approved',
            advisor_approved='Pending',
            leave_type='Leave'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_ods = Leave.objects.filter(
            student__advisor=request.user,
            tutor_approved='Approved',
            advisor_approved='Pending',
            leave_type='OD'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        processed_leaves_today = Leave.objects.filter(
            student__advisor=request.user,
            leave_type='Leave',
            is_archived=False
        ).exclude(advisor_approved='Pending').select_related('student__user').distinct().order_by('-updated_at')

        processed_ods_today = Leave.objects.filter(
            Q(student__advisor=request.user) | Q(student__tutor=request.user),
            leave_type='OD',
            is_archived=False
        ).filter(
            Q(hod_approved='Approved') | ~Q(advisor_approved='Pending')
        ).select_related('student__user').distinct().order_by('-updated_at')
        
    else:
        pending_leaves = Leave.objects.none()
        pending_ods = Leave.objects.none()
        processed_leaves_today = Leave.objects.none()
        processed_ods_today = Leave.objects.none()
        
    context = {
        'pending_leaves': pending_leaves,
        'pending_ods': pending_ods,
        'processed_leaves_today': processed_leaves_today,
        'processed_ods_today': processed_ods_today,
    }
    return render(request, 'staff/approvals.html', context)

@login_required
def students_list(request):
    if not hasattr(request.user, 'staff') or request.user.staff.staff_type == 'Normal':
        messages.error(request, 'You do not have permission to view assigned students.')
        return redirect('staff_dashboard')
    from accounts.models import Student
    students = Student.objects.filter(Q(tutor=request.user) | Q(advisor=request.user)).distinct()
    return render(request, 'staff/students_list.html', {'students': students})

@login_required
def subject_reports(request):
    import csv
    from django.http import HttpResponse
    from attendance.models import Attendance
    from django.db.models import Count, Q
    
    action = request.GET.get('action')
    if action == 'download':
        class_id = request.GET.get('class_id')
        subject_name = request.GET.get('subject')
        period = request.GET.get('period')
        date = request.GET.get('date')
        
        records = Attendance.objects.filter(
            schedule__student_class_id=class_id,
            schedule__subject__name=subject_name,
            schedule__period=period,
            date=date
        ).select_related('student__user', 'schedule__subject')
        
        response = HttpResponse(content_type='text/csv')
        c_name = records.first().student.student_class.name if records.exists() else "Class"
        s_code = records.first().schedule.subject.code if records.exists() else "Subject"
        response['Content-Disposition'] = f'attachment; filename="Subject_Attendance_{c_name}_{s_code}_Period_{period}_{date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Register Number', 'Name', 'Status'])
        for r in records:
            writer.writerow([r.student.user.username, f"{r.student.user.first_name} {r.student.user.last_name}".strip(), r.status])
        return response

    grouped_data = Attendance.objects.filter(
        student__student_class__department=request.user.department
    ).values(
        'date',
        'schedule__student_class__id',
        'schedule__student_class__name',
        'schedule__student_class__section',
        'schedule__student_class__year',
        'schedule__subject__name',
        'schedule__subject__code',
        'schedule__period'
    ).annotate(
        total_students=Count('id'),
        present_count=Count('id', filter=Q(status='Present')),
        absent_count=Count('id', filter=Q(status='Absent')),
        od_count=Count('id', filter=Q(status='OD')),
    ).order_by('-date', 'schedule__student_class__name', 'schedule__period')

    return render(request, 'staff/subject_reports.html', {'grouped_data': grouped_data})

@login_required
def advisor_reports(request):
    from accounts.models import Class, Student
    advised_classes = Class.objects.filter(id__in=Student.objects.filter(advisor=request.user).values('student_class_id')).distinct()
    
    if request.method == 'POST':
        class_id = request.POST.get('class_id')
        date = request.POST.get('date')
        
        from attendance.models import Attendance
        records = Attendance.objects.filter(
            student__student_class_id=class_id,
            date=date
        ).select_related('student__user', 'schedule')
        
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        c = Class.objects.get(id=class_id)
        response['Content-Disposition'] = f'attachment; filename="Advisor_Daily_Report_{c.name}_{date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Register Number', 'Name', 'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7'])
        
        student_data = {}
        for r in records:
            username = r.student.user.username
            if username not in student_data:
                student_data[username] = {
                    'name': f"{r.student.user.first_name} {r.student.user.last_name}".strip(),
                    'periods': {str(p): '-' for p in range(1, 8)}
                }
            student_data[username]['periods'][str(r.schedule.period)] = r.status
            
        for username, data in student_data.items():
            writer.writerow([
                username, 
                data['name'], 
                data['periods']['1'], data['periods']['2'], data['periods']['3'], 
                data['periods']['4'], data['periods']['5'], data['periods']['6'], data['periods']['7']
            ])
            
        return response

    return render(request, 'staff/advisor_reports.html', {'advised_classes': advised_classes})

@login_required
def staff_profile(request):
    user = request.user
    from django.contrib import messages
    from django.shortcuts import redirect
    if request.method == 'POST':
        user.first_name = request.POST.get('first_name', user.first_name)
        user.last_name = request.POST.get('last_name', user.last_name)
        user.email = request.POST.get('email', user.email)
        user.phone_number = request.POST.get('phone_number', user.phone_number)
        
        age = request.POST.get('age')
        if age:
            user.age = int(age)
            
        user.save()
        messages.success(request, 'Profile updated successfully.')
        return redirect('staff_profile')
        
    return render(request, 'staff/profile.html', {'profile_user': user})

@login_required
def edit_timetable(request):
    messages.error(request, 'Timetable management has been removed.')
    return redirect('staff_dashboard')

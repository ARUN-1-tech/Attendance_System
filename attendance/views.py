from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib import messages
from datetime import timedelta
from datetime import date
import random
import string

from .models import OTP, Attendance
from accounts.models import Student
from timetable.models import Schedule

@login_required
def generate_otp(request):
    if request.user.role not in ['staff', 'hod']:
        messages.error(request, "Unauthorized access.")
        return redirect('login')

    if request.method == 'POST':
        department_name = request.POST.get('department_name')
        class_name = request.POST.get('class_name')
        subject_name = request.POST.get('subject_name')
        period = request.POST.get('period')
        
        if not (class_name and subject_name and period):
            messages.error(request, "Missing required fields to generate OTP.")
            return redirect('staff_dashboard')
            
        from accounts.models import Department, Class, Subject
        import random, string

        # 1. Resolve Department
        if department_name:
            dept_str = str(department_name).strip()
            if dept_str.isdigit():
                dept = get_object_or_404(Department, id=int(dept_str))
            else:
                dept, _ = Department.objects.get_or_create(name=dept_str)
        else:
            dept = request.user.department

        # 2. Resolve Class
        class_str = str(class_name).strip()
        if class_str.isdigit():
            student_class = get_object_or_404(Class, id=int(class_str))
        else:
            student_class, _ = Class.objects.get_or_create(
                name=class_str, 
                department=dept,
                defaults={'year': 1, 'section': 'A'}
            )

        # 3. Resolve Subject
        subject_name = subject_name.strip()
        subject = Subject.objects.filter(name=subject_name, department=dept).first()
        if not subject:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            while Subject.objects.filter(code=code).exists():
                code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            subject = Subject.objects.create(name=subject_name, code=code, department=dept)
            
        today = timezone.now().date()
        day_str = today.strftime('%A')
        
        import datetime
        schedule, created = Schedule.objects.get_or_create(
            student_class=student_class,
            subject=subject,
            period=period,
            day=day_str,
            defaults={
                'start_time': datetime.time(9, 0),
                'end_time': datetime.time(10, 0)
            }
        )
        
        # Deactivate old OTPs for this schedule today
        OTP.objects.filter(schedule=schedule, is_active=True).update(is_active=False)

        lat = request.POST.get('latitude')
        lng = request.POST.get('longitude')
        lat = float(lat) if lat else None
        lng = float(lng) if lng else None

        code = ''.join(random.choices(string.digits, k=6))
        otp = OTP.objects.create(code=code, schedule=schedule, staff_latitude=lat, staff_longitude=lng)
        
        request.session['active_otp_id'] = otp.id
        
        # Pre-mark all students
        from leave.models import Leave
        students = Student.objects.filter(student_class=schedule.student_class)
        for student in students:
            # Check for approved leave/od
            approved_leave = Leave.objects.filter(student=student, date=today, final_status='Approved').first()
            default_status = approved_leave.leave_type if approved_leave else 'Absent'
            
            Attendance.objects.get_or_create(
                student=student, 
                schedule=schedule, 
                date=today,
                defaults={'status': default_status}
            )
        
        return redirect('active_otp_session', otp_id=otp.id)

@login_required
def verify_otp(request):
    if request.user.role != 'student':
        messages.error(request, "Only students can mark attendance.")
        return redirect('login')

    if request.method == 'POST':
        code = request.POST.get('otp_code')
        student_lat = request.POST.get('latitude')
        student_lng = request.POST.get('longitude')
        
        if not student_lat or not student_lng:
            messages.error(request, "Failed to retrieve your location.")
            return redirect('student_dashboard')
            
        student_lat = float(student_lat)
        student_lng = float(student_lng)
        
        from math import radians, cos, sin, asin, sqrt
        def haversine(lon1, lat1, lon2, lat2):
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1 
            dlat = lat2 - lat1 
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a)) 
            r = 6371000 # Radius of earth in meters
            return c * r
        
        # Find active OTP
        otp_qs = OTP.objects.filter(code=code, is_active=True).order_by('-created_at')
        if otp_qs.exists():
            otp = otp_qs.first()
            now = timezone.now()
            
            # Check 1 minute validity
            if now <= otp.created_at + timedelta(minutes=1):
                
                # Geofence check if staff provided location
                if otp.staff_latitude and otp.staff_longitude:
                    distance = haversine(student_lng, student_lat, otp.staff_longitude, otp.staff_latitude)
                    if distance > 20.0:
                        messages.error(request, f"You are too far from the classroom to mark attendance (Distance: {distance:.1f}m > limit 20m).")
                        return redirect('student_dashboard')
                
                try:
                    student = request.user.student
                    today = date.today()
                    
                    # Update attendance to Present
                    attendance, created = Attendance.objects.get_or_create(
                        student=student, 
                        schedule=otp.schedule, 
                        date=today,
                        defaults={'status': 'Present'}
                    )
                    if not created:
                        attendance.status = 'Present'
                        attendance.save()
                        
                    messages.success(request, "Attendance marked as Present.")
                except Student.DoesNotExist:
                    messages.error(request, "Student profile not found.")
            else:
                otp.is_active = False
                otp.save()
                messages.error(request, "OTP has expired.")
        else:
            messages.error(request, "Invalid OTP.")

        return redirect('student_dashboard')

from django.http import JsonResponse

@login_required
def active_otp_session(request, otp_id):
    if request.user.role not in ['staff', 'hod']:
        return redirect('login')
        
    otp = get_object_or_404(OTP, id=otp_id)
    return render(request, 'attendance/active_session.html', {'otp': otp})

@login_required
def session_stats_api(request, otp_id):
    if request.user.role not in ['staff', 'hod']:
        return JsonResponse({'error': 'Unauthorized'}, status=403)
        
    otp = get_object_or_404(OTP, id=otp_id)
    today = timezone.now().date()
    
    # Students bound to this schedule's class
    students_in_class = Student.objects.filter(student_class=otp.schedule.student_class)
    
    attendances = Attendance.objects.filter(student__in=students_in_class, schedule=otp.schedule, date=today)
    
    present_count = attendances.filter(status='Present').count()
    leave_od_count = attendances.filter(status__in=['Leave', 'OD']).count()
    
    total = students_in_class.count()
    remaining_count = total - present_count - leave_od_count
    
    remaining_students = attendances.filter(status='Absent').select_related('student__user')
    remaining_list = [
        f"{a.student.user.first_name} {a.student.user.last_name} ({a.student.user.username})" 
        for a in remaining_students
    ]
    
    # Calculate time left
    time_elapsed = (timezone.now() - otp.created_at).total_seconds()
    time_left = max(0, 60 - time_elapsed) # 1 minute validity
    
    return JsonResponse({
        'present_count': present_count,
        'remaining_count': remaining_count,
        'remaining_students': remaining_list,
        'time_left': int(time_left),
        'is_active': otp.is_active and time_left > 0
    })

import csv
from django.http import HttpResponse

@login_required
def download_report(request):
    if request.method == 'POST':
        report_type = request.POST.get('report_type', 'department')
        from_date = request.POST.get('from_date')
        to_date = request.POST.get('to_date')

        if request.user.role == 'student':
            if hasattr(request.user, 'student'):
                records = Attendance.objects.filter(student=request.user.student)
            else:
                records = Attendance.objects.none()
        elif request.user.role == 'hod':
            records = Attendance.objects.filter(student__student_class__department=request.user.department)
        elif request.user.role == 'staff':
            records = Attendance.objects.filter(student__student_class__department=request.user.department)
        elif request.user.role == 'admin':
            records = Attendance.objects.all()
        else:
            records = Attendance.objects.none()

        # Enforce staff-specific restrictions before other filters
        if request.user.role == 'staff':
            from accounts.models import Class, Student
            subject_id = request.POST.get('subject_id')
            is_related = False
            
            if report_type == 'class':
                class_id = request.POST.get('class_id')
                if class_id:
                    try:
                        student_class = Class.objects.get(id=class_id)
                        is_related = (student_class.advisor == request.user)
                    except Class.DoesNotExist:
                        pass
            elif report_type == 'student':
                student_id = request.POST.get('student_id')
                if student_id:
                    try:
                        student = Student.objects.get(user_id=student_id)
                        is_related = (student.tutor == request.user or student.advisor == request.user)
                    except Student.DoesNotExist:
                        pass
            elif report_type == 'tutored':
                is_related = True

            if not is_related:
                if not subject_id:
                    messages.error(request, "Subject selection is required for this report as you are not the tutor or advisor.")
                    return redirect('download_report')
                records = records.filter(schedule__subject_id=subject_id)
            else:
                if subject_id:
                    records = records.filter(schedule__subject_id=subject_id)
        else:
            subject_id = request.POST.get('subject_id')
            if subject_id:
                records = records.filter(schedule__subject_id=subject_id)

        if from_date:
            records = records.filter(date__gte=from_date)
        if to_date:
            records = records.filter(date__lte=to_date)

        if report_type == 'department':
            pass
        elif report_type == 'class':
            class_id = request.POST.get('class_id')
            if class_id:
                records = records.filter(student__student_class_id=class_id)
        elif report_type == 'tutored':
            records = records.filter(student__tutor=request.user)
        elif report_type == 'student':
            student_id = request.POST.get('student_id')
            if student_id:
                records = records.filter(student__user_id=student_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_{report_type}_report.csv"'
        
        writer = csv.writer(response)
        
        if from_date and from_date == to_date:
            writer.writerow(['Student', 'Class', 'Date', 'Day Status'])
            student_records = {}
            for r in records:
                student_id_val = r.student.user.username
                if student_id_val not in student_records:
                    student_records[student_id_val] = {'student': r.student, 'status': 'Absent', 'date': r.date}
                
                curr_status = student_records[student_id_val]['status']
                new_status = r.status
                precedence = {'Absent': 0, 'Present': 1, 'Leave': 2, 'OD': 3}
                
                if precedence.get(new_status, 0) > precedence.get(curr_status, 0):
                    student_records[student_id_val]['status'] = new_status
                    
            for rec in student_records.values():
                writer.writerow([rec['student'].user.username, str(rec['student'].student_class), rec['date'], rec['status']])
        else:
            writer.writerow(['Student', 'Class', 'Date', 'Status', 'Schedule'])
            for r in records:
                writer.writerow([r.student.user.username, str(r.student.student_class), r.date, r.status, str(r.schedule)])
        return response

    context = {}
    if request.user.role == 'hod':
        from accounts.models import Department, Class, Student, Subject
        context['classes'] = Class.objects.filter(department=request.user.department)
        context['students'] = Student.objects.filter(student_class__department=request.user.department).select_related('user')
        context['subjects'] = Subject.objects.filter(department=request.user.department)
    elif request.user.role == 'staff':
        from accounts.models import Department, Class, Student, Subject
        from django.db.models import Q
        
        context['classes'] = Class.objects.filter(department=request.user.department)
        context['students'] = Student.objects.filter(user__department=request.user.department).select_related('user')
        context['subjects'] = Subject.objects.filter(department=request.user.department)
        
        tutored_students = Student.objects.filter(Q(tutor=request.user) | Q(advisor=request.user))
        context['my_students_ids'] = list(tutored_students.values_list('user_id', flat=True))
        
        my_classes = Class.objects.filter(advisor=request.user)
        context['my_classes_ids'] = list(my_classes.values_list('id', flat=True))
    elif request.user.role == 'admin':
        from accounts.models import Department, Class, Student
        context['departments'] = Department.objects.all()
        context['classes'] = Class.objects.all()
        context['students'] = Student.objects.all().select_related('user')

    return render(request, 'attendance/reports.html', context)

@login_required
def class_report(request, class_id):
    if request.user.role not in ['staff', 'hod', 'admin']:
        return redirect('login')
    
    records = Attendance.objects.filter(student__student_class_id=class_id)
    return render(request, 'attendance/class_report.html', {'records': records})

@login_required
def download_session(request, otp_id):
    from .models import OTP
    if request.user.role not in ['staff', 'hod', 'admin']:
        return redirect('login')
        
    from django.utils import timezone
    otp = get_object_or_404(OTP, id=otp_id)
    today = timezone.now().date()
    
    session_date = otp.created_at.date()
    records = Attendance.objects.filter(schedule=otp.schedule, date=session_date).select_related('student__user')
    
    from django.http import HttpResponse
    import csv
    response = HttpResponse(content_type='text/csv')
    filename = f"Attendance_{otp.schedule.student_class.name}_{otp.schedule.subject.code}_Period_{otp.schedule.period}_{session_date}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    writer = csv.writer(response)
    writer.writerow(['Register Number', 'Name', 'Status'])
    
    for r in records:
        writer.writerow([r.student.user.username, f"{r.student.user.first_name} {r.student.user.last_name}".strip(), r.status])
        
    return response

@login_required
def student_attendance_stats(request, user_id):
    student = get_object_or_404(Student, user__username=user_id)
    
    # Authorize: Only self, tutor, advisor, or HOD can see this.
    if request.user.role == 'student' and request.user != student.user:
        messages.error(request, 'Unauthorized')
        return redirect('student_dashboard')
    elif request.user.role == 'staff' and request.user not in [student.tutor, student.advisor]:
        messages.error(request, 'Unauthorized')
        return redirect('staff_dashboard')
    elif request.user.role == 'hod' and request.user.department != student.student_class.department:
        messages.error(request, 'Unauthorized')
        return redirect('hod_dashboard')

    from django.db.models import Count
    # Fetch attendances for student
    attendances = Attendance.objects.filter(student=student)
    
    total = attendances.count()
    present_count = attendances.filter(status='Present').count()
    absent_count = attendances.filter(status='Absent').count()
    
    # Find verified ODs
    from leave.models import Leave
    verified_ods = Leave.objects.filter(student=student, leave_type='OD', final_status='Approved', certificate_verified=True).values_list('date', flat=True)
    
    od_count_raw = attendances.filter(status='OD').count()
    
    # We must see how many ODs actually match the verified leave dates
    verified_od_count = attendances.filter(status='OD', date__in=verified_ods).count()
    
    effective_present = present_count + verified_od_count
    percentage = (effective_present / total * 100) if total > 0 else 0
    
    context = {
        'student_user': student.user,
        'student_class': student.student_class,
        'total': total,
        'present': present_count,
        'absent': absent_count,
        'od': od_count_raw,
        'verified_od': verified_od_count,
        'percentage': round(percentage, 2)
    }
    return render(request, 'shared/student_attendance_details.html', context)

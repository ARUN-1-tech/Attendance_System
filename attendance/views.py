from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib import messages
from datetime import timedelta, date
import random
import string
import csv
from django.http import HttpResponse

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
        otp = OTP.objects.create(code=code, schedule=schedule, staff_latitude=lat, staff_longitude=lng, creator=request.user)
        
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
                    
                    # Check if student has approved Leave/OD today
                    from leave.models import Leave
                    approved_leave = Leave.objects.filter(student=student, date=today, final_status='Approved').first()
                    if approved_leave:
                        messages.error(request, f"You cannot mark Present because you are approved for {approved_leave.leave_type} today.")
                        return redirect('student_dashboard')
                        
                    # Also check existing attendance record
                    existing_att = Attendance.objects.filter(student=student, schedule=otp.schedule, date=today).first()
                    if existing_att and existing_att.status in ['Leave', 'OD']:
                        messages.error(request, f"You cannot mark Present because you are marked as {existing_att.status} today.")
                        return redirect('student_dashboard')
                    
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
    
    attendances = Attendance.objects.filter(student__in=students_in_class, schedule=otp.schedule, date=today).select_related('student__user')
    
    present_count = attendances.filter(status='Present').count()
    absent_count = attendances.filter(status='Absent').count()
    od_count = attendances.filter(status='OD').count()
    leave_count = attendances.filter(status='Leave').count()
    
    all_students_list = [
        {
            'reg_no': a.student.reg_no or a.student.roll_no or a.student.user.username,
            'name': f"{a.student.user.first_name} {a.student.user.last_name}".strip() or a.student.user.username,
            'status': a.status
        } for a in attendances
    ]
    
    # Calculate time left
    time_elapsed = (timezone.now() - otp.created_at).total_seconds()
    time_left = max(0, 60 - time_elapsed) # 1 minute validity
    
    if time_left <= 0 and otp.is_active:
        otp.is_active = False
        otp.save()
        
    return JsonResponse({
        'present_count': present_count,
        'absent_count': absent_count,
        'od_count': od_count,
        'leave_count': leave_count,
        'all_students': all_students_list,
        'time_left': int(time_left),
        'is_active': otp.is_active and time_left > 0
    })

import csv
from django.http import HttpResponse

@login_required
def download_report(request):
    from accounts.models import Department, Class, Student, Subject
    from django.db.models import Q
    from leave.models import Leave
    from timetable.models import Schedule
    
    context = {}
    if request.user.role == 'hod':
        context['classes'] = Class.objects.filter(department=request.user.department)
        context['students'] = Student.objects.filter(student_class__department=request.user.department).select_related('user')
        context['subjects'] = Subject.objects.filter(department=request.user.department)
    elif request.user.role == 'staff':
        context['classes'] = Class.objects.filter(department=request.user.department)
        context['students'] = Student.objects.filter(user__department=request.user.department).select_related('user')
        context['subjects'] = Subject.objects.filter(department=request.user.department)
        
        tutored_students = Student.objects.filter(Q(tutor=request.user) | Q(advisor=request.user))
        context['my_students_ids'] = list(tutored_students.values_list('user_id', flat=True))
        
        my_classes = Class.objects.filter(advisor=request.user)
        context['my_classes_ids'] = list(my_classes.values_list('id', flat=True))
    elif request.user.role == 'admin':
        context['departments'] = Department.objects.all()
        context['classes'] = Class.objects.all()
        context['students'] = Student.objects.all().select_related('user')

    if request.method == 'POST':
        action_type = request.POST.get('action', 'view')
        report_type = request.POST.get('report_type', 'department')
        report_mode = request.POST.get('report_mode', 'day')
        
        from_date = request.POST.get('from_date') or request.POST.get('date')
        to_date = request.POST.get('to_date')
        
        if report_mode == 'day':
            if not to_date:
                to_date = from_date
            
        subject_id = request.POST.get('subject_id')
        class_id = request.POST.get('class_id')
        student_id = request.POST.get('student_id')

        # Keep values in forms
        context.update({
            'selected_report_type': report_type,
            'selected_report_mode': report_mode,
            'selected_date': from_date,
            'selected_from_date': from_date,
            'selected_to_date': to_date,
            'selected_subject_id': int(subject_id) if subject_id else '',
            'selected_class_id': int(class_id) if class_id else '',
            'selected_student_id': int(student_id) if student_id else '',
        })

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

        validation_error = False
        if request.user.role == 'staff':
            is_related = False
            
            if report_type == 'class':
                if class_id:
                    try:
                        student_class = Class.objects.get(id=class_id)
                        is_related = (student_class.advisor == request.user)
                    except Class.DoesNotExist:
                        pass
            elif report_type == 'student':
                if student_id:
                    try:
                        student = Student.objects.get(user_id=student_id)
                        is_related = (student.tutor == request.user or student.advisor == request.user)
                    except Student.DoesNotExist:
                        pass
            elif report_type == 'tutored':
                is_related = True

            if not is_related and report_mode == 'subject_percentage':
                if not subject_id:
                    messages.error(request, "Subject selection is required for this report as you are not the tutor or advisor.")
                    validation_error = True
                    records = Attendance.objects.none()
                else:
                    records = records.filter(schedule__subject_id=subject_id)
            else:
                if subject_id and report_mode == 'subject_percentage':
                    records = records.filter(schedule__subject_id=subject_id)
        else:
            if subject_id and report_mode == 'subject_percentage':
                records = records.filter(schedule__subject_id=subject_id)

        if not validation_error:
            if from_date:
                records = records.filter(date__gte=from_date)
            if to_date:
                records = records.filter(date__lte=to_date)

            if report_type == 'class' and class_id:
                records = records.filter(student__student_class_id=class_id)
            elif report_type == 'tutored':
                records = records.filter(student__tutor=request.user)
            elif report_type == 'student' and student_id:
                records = records.filter(student__user_id=student_id)

        report_rows = []
        if not validation_error:
            if report_mode == 'day':
                students_query = Student.objects.all()
                if request.user.role == 'hod' or request.user.role == 'staff':
                    students_query = students_query.filter(user__department=request.user.department)
                
                if report_type == 'class' and class_id:
                    students_query = students_query.filter(student_class_id=class_id)
                elif report_type == 'tutored':
                    students_query = students_query.filter(tutor=request.user)
                elif report_type == 'student' and student_id:
                    students_query = students_query.filter(user_id=student_id)
                
                students_list = list(students_query.select_related('user', 'student_class'))
                
                import datetime
                try:
                    start_date = datetime.datetime.strptime(from_date, '%Y-%m-%d').date() if from_date else None
                    end_date = datetime.datetime.strptime(to_date, '%Y-%m-%d').date() if to_date else None
                except (ValueError, TypeError):
                    start_date = None
                    end_date = None

                target_dates = []
                if start_date and end_date:
                    if start_date == end_date:
                        target_dates = [start_date]
                    else:
                        db_dates = Attendance.objects.filter(
                            student__in=students_list,
                            date__gte=start_date,
                            date__lte=end_date
                        ).values_list('date', flat=True).distinct()
                        target_dates = sorted(list(set(db_dates)))
                        if not target_dates:
                            target_dates = [start_date]
                else:
                    target_dates = [datetime.date.today()]

                records_in_range = Attendance.objects.filter(
                    student__in=students_list,
                    date__in=target_dates
                ).select_related('student__user', 'student__student_class')
                
                attendance_map = {}
                for r in records_in_range:
                    key = (r.student_id, r.date)
                    curr_status = attendance_map.get(key, 'Absent')
                    new_status = r.status
                    precedence = {'Absent': 0, 'Present': 1, 'Leave': 2, 'OD': 3}
                    if precedence.get(new_status, 0) > precedence.get(curr_status, 0):
                        attendance_map[key] = new_status
                        
                for d in target_dates:
                    date_str = d.strftime('%Y-%m-%d')
                    for student in students_list:
                        status = attendance_map.get((student.user_id, d), 'Absent')
                        report_rows.append({
                            'reg_no': student.reg_no or student.roll_no or student.user.username,
                            'student_username': student.user.username,
                            'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                            'department': student.student_class.department.name if student.student_class and student.student_class.department else '',
                            'year': student.student_class.year if student.student_class else '',
                            'class_name': student.student_class.name if student.student_class else '',
                            'section': student.student_class.section if student.student_class else '',
                            'class': str(student.student_class),
                            'date': date_str,
                            'status': status
                        })
            else:
                students_query = Student.objects.all()
                if request.user.role == 'hod' or request.user.role == 'staff':
                    students_query = students_query.filter(user__department=request.user.department)
                
                if report_type == 'class' and class_id:
                    students_query = students_query.filter(student_class_id=class_id)
                elif report_type == 'tutored':
                    students_query = students_query.filter(tutor=request.user)
                elif report_type == 'student' and student_id:
                    students_query = students_query.filter(user_id=student_id)
                
                students_list = students_query.select_related('user', 'student_class')
                
                for student in students_list:
                    student_atts = Attendance.objects.filter(student=student)
                    if from_date:
                        student_atts = student_atts.filter(date__gte=from_date)
                    if to_date:
                        student_atts = student_atts.filter(date__lte=to_date)
                    
                    if subject_id:
                        student_atts = student_atts.filter(schedule__subject_id=subject_id)
                        try:
                            subject_label = Subject.objects.get(id=subject_id).name
                        except Subject.DoesNotExist:
                            subject_label = 'Subject'
                    else:
                        subject_label = 'Overall'
                        
                    total_periods = student_atts.count()
                    if total_periods > 0:
                        present_periods = student_atts.filter(status='Present').count()
                        verified_ods = Leave.objects.filter(
                            student=student, 
                            leave_type='OD', 
                            final_status='Approved', 
                            certificate_verified=True
                        ).values_list('date', flat=True)
                        verified_od_count = student_atts.filter(status='OD', date__in=verified_ods).count()
                        effective_present = present_periods + verified_od_count
                        percentage = round((effective_present / total_periods * 100), 2)
                    else:
                        percentage = 100.0
                        
                    report_rows.append({
                        'reg_no': student.reg_no or student.roll_no or student.user.username,
                        'student_username': student.user.username,
                        'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                        'department': student.student_class.department.name if student.student_class and student.student_class.department else '',
                        'year': student.student_class.year if student.student_class else '',
                        'class_name': student.student_class.name if student.student_class else '',
                        'section': student.student_class.section if student.student_class else '',
                        'class': str(student.student_class),
                        'subject': subject_label,
                        'percentage': f"{percentage}%"
                    })

        if action_type == 'download' and not validation_error:
            response = HttpResponse(content_type='text/csv')
            if report_mode == 'day':
                response['Content-Disposition'] = f'attachment; filename="attendance_{report_type}_day_report.csv"'
                writer = csv.writer(response)
                writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Status'])
                total_c = 0
                present_c = 0
                absent_c = 0
                od_c = 0
                for row in report_rows:
                    writer.writerow([
                        row['reg_no'], 
                        row['student_name'], 
                        row['department'], 
                        row['year'], 
                        row['class_name'], 
                        row['section'], 
                        row['date'], 
                        row['status']
                    ])
                    total_c += 1
                    if row['status'] == 'Present':
                        present_c += 1
                    elif row['status'] == 'Absent':
                        absent_c += 1
                    elif row['status'] == 'OD':
                        od_c += 1
                
                writer.writerow([])
                writer.writerow(['Summary'])
                writer.writerow(['Total Students', total_c])
                writer.writerow(['Present', present_c])
                writer.writerow(['Absent', absent_c])
                writer.writerow(['OD', od_c])
            else:
                response['Content-Disposition'] = f'attachment; filename="attendance_{report_type}_percentage_report.csv"'
                writer = csv.writer(response)
                writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Subject', 'Attendance Percentage'])
                for row in report_rows:
                    writer.writerow([
                        row['reg_no'], 
                        row['student_name'], 
                        row['department'], 
                        row['year'], 
                        row['class_name'], 
                        row['section'], 
                        row['subject'], 
                        row['percentage']
                    ])
            return response

        context.update({
            'report_rows': report_rows,
            'has_run': True,
        })
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
    records = Attendance.objects.filter(schedule=otp.schedule, date=session_date).select_related(
        'student__user', 'student__student_class', 'student__student_class__department', 'schedule__subject'
    )
    
    from django.http import HttpResponse
    import csv
    response = HttpResponse(content_type='text/csv')
    filename = f"Attendance_{otp.schedule.student_class.name}_{otp.schedule.subject.code}_Period_{otp.schedule.period}_{session_date}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    
    writer = csv.writer(response)
    writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Time', 'Subject', 'Status'])
    
    total = 0
    present = 0
    absent = 0
    od = 0
    
    for r in records:
        reg_no = r.student.reg_no or r.student.roll_no or r.student.user.username
        full_name = f"{r.student.user.first_name} {r.student.user.last_name}".strip() or r.student.user.username
        time_str = otp.schedule.start_time.strftime('%H:%M') if otp.schedule.start_time else ''
        subject_str = otp.schedule.subject.name
        
        dept = r.student.student_class.department.name if r.student.student_class and r.student.student_class.department else ''
        yr = r.student.student_class.year if r.student.student_class else ''
        cls = r.student.student_class.name if r.student.student_class else ''
        sec = r.student.student_class.section if r.student.student_class else ''
        
        writer.writerow([reg_no, full_name, dept, yr, cls, sec, session_date.strftime('%Y-%m-%d'), time_str, subject_str, r.status])
        
        total += 1
        if r.status == 'Present':
            present += 1
        elif r.status == 'Absent':
            absent += 1
        elif r.status == 'OD':
            od += 1
            
    writer.writerow([])
    writer.writerow(['Summary'])
    writer.writerow(['Total Students', total])
    writer.writerow(['Present', present])
    writer.writerow(['Absent', absent])
    writer.writerow(['OD', od])
        
    return response

@login_required
def student_attendance_stats(request, user_id):
    student = get_object_or_404(Student, user__username=user_id)
    
    # Authorize: Only self, tutor, advisor, class advisor, or HOD can see this.
    if request.user.role == 'student' and request.user != student.user:
        messages.error(request, 'Unauthorized')
        return redirect('student_dashboard')
    elif request.user.role == 'staff':
        is_tutor = (request.user == student.tutor)
        is_advisor = (request.user == student.advisor)
        is_class_advisor = (student.student_class and student.student_class.advisor == request.user)
        if not (is_tutor or is_advisor or is_class_advisor):
            messages.error(request, 'Unauthorized')
            return redirect('staff_dashboard')
    elif request.user.role == 'hod' and request.user.department != student.student_class.department:
        messages.error(request, 'Unauthorized')
        return redirect('hod_dashboard')

    from timetable.models import Schedule
    from accounts.models import Subject
    if student.student_class:
        class_subject_ids = Schedule.objects.filter(student_class=student.student_class).values_list('subject_id', flat=True).distinct()
        class_subjects = Subject.objects.filter(id__in=class_subject_ids)
    else:
        class_subjects = Subject.objects.none()

    attendances = Attendance.objects.filter(student=student, schedule__subject__in=class_subjects)
    
    total_periods = attendances.count()
    present_periods = attendances.filter(status='Present').count()
    absent_periods = attendances.filter(status='Absent').count()
    od_periods = attendances.filter(status='OD').count()
    leave_periods = attendances.filter(status='Leave').count()
    
    # Find verified ODs
    from leave.models import Leave
    verified_ods = Leave.objects.filter(
        student=student, 
        leave_type='OD', 
        final_status='Approved', 
        certificate_verified=True
    ).values_list('date', flat=True)
    
    verified_od_count = attendances.filter(status='OD', date__in=verified_ods).count()
    
    effective_present = present_periods + verified_od_count
    overall_percentage = (effective_present / total_periods * 100) if total_periods > 0 else 0
    
    # Calculate Days
    dates = list(attendances.values_list('date', flat=True).distinct())
    total_days = len(dates)
    present_days = 0
    absent_days = 0
    od_days = 0
    leave_days = 0
    
    for dt in dates:
        day_att = attendances.filter(date=dt)
        P = day_att.filter(status='Present').count()
        O = day_att.filter(status='OD').count()
        A = day_att.filter(status='Absent').count()
        L = day_att.filter(status='Leave').count()
        T = P + O + A + L
        
        is_verified_od_day = (dt in verified_ods)
        if is_verified_od_day:
            verified_od_on_day = O
            unverified_od_on_day = 0
        else:
            verified_od_on_day = 0
            unverified_od_on_day = O
            
        effective_present_on_day = P + verified_od_on_day
        effective_absent_leave_on_day = A + L + unverified_od_on_day
        
        if T > 0:
            if effective_present_on_day >= T / 2.0:
                if verified_od_on_day > P:
                    od_days += 1
                else:
                    present_days += 1
            else:
                if L >= A + unverified_od_on_day:
                    leave_days += 1
                else:
                    absent_days += 1

    # Subject-wise breakdown
    subjects_breakdown = []
    if student.student_class:
        for sub in class_subjects:
            sub_att = attendances.filter(schedule__subject=sub)
            sub_total = sub_att.count()
            sub_present = sub_att.filter(status='Present').count()
            sub_absent = sub_att.filter(status='Absent').count()
            sub_od = sub_att.filter(status='OD').count()
            sub_leave = sub_att.filter(status='Leave').count()
            
            sub_verified_od = sub_att.filter(status='OD', date__in=verified_ods).count()
            sub_effective_present = sub_present + sub_verified_od
            sub_percentage = (sub_effective_present / sub_total * 100) if sub_total > 0 else 0
            
            subjects_breakdown.append({
                'id': sub.id,
                'name': sub.name,
                'code': sub.code,
                'total_periods': sub_total,
                'present_periods': sub_present,
                'absent_periods': sub_absent,
                'od_periods': sub_od,
                'leave_periods': sub_leave,
                'verified_od_periods': sub_verified_od,
                'effective_present': sub_effective_present,
                'percentage': round(sub_percentage, 2)
            })

    # AI Suggestion
    ai_suggestion = ""
    if overall_percentage >= 90:
        ai_suggestion = f"Excellent! Your attendance is outstanding ({overall_percentage:.2f}%). Keep up the great work to maintain this level of consistency."
    elif overall_percentage >= 75:
        miss_periods = int((4 * effective_present - 3 * total_periods) // 3)
        ai_suggestion = f"Good job! Your attendance is at {overall_percentage:.2f}%, which is above the required 75% threshold."
        if miss_periods > 0:
            ai_suggestion += f" You can afford to miss up to {miss_periods} periods without dropping below 75%."
        else:
            ai_suggestion += " You are close to the limit; try not to miss any more classes."
    else:
        req_periods = int(3 * total_periods - 4 * effective_present)
        ai_suggestion = f"Warning! Your attendance is currently at {overall_percentage:.2f}%, which is below the minimum 75% requirement."
        if req_periods > 0:
            ai_suggestion += f" You need to attend at least {req_periods} consecutive periods without any absence to bring your attendance back to 75%."

    low_subjects = [sub['name'] for sub in subjects_breakdown if sub['percentage'] < 75.0 and sub['total_periods'] > 0]
    if low_subjects:
        ai_suggestion += f" Note: Your attendance in {', '.join(low_subjects)} is below 75%. Prioritize attending these classes."

    context = {
        'student_user': student.user,
        'student_class': student.student_class,
        'percentage': round(overall_percentage, 2),
        'total_periods': total_periods,
        'present_periods': present_periods,
        'verified_od_periods': verified_od_count,
        'absent_periods': absent_periods,
        'total_days': total_days,
        'present_days': present_days,
        'od_days': od_days,
        'absent_days': absent_days,
        'od_periods': od_periods,
        'leave_periods': leave_periods,
        'leave_days': leave_days,
        'subjects_breakdown': subjects_breakdown,
        'ai_suggestion': ai_suggestion
    }
    return render(request, 'shared/student_attendance_details.html', context)

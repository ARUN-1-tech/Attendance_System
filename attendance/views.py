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
        
        # Check PeriodLock
        from .models import PeriodLock
        p_val = int(period) if str(period).isdigit() else period
        lock = PeriodLock.objects.filter(student_class=student_class, date=today, period=p_val).first()
        if lock and lock.staff != request.user:
            messages.error(request, f"Period {p_val} is already marked/used by {lock.staff.first_name} {lock.staff.last_name} ({lock.staff.username}).")
            return redirect('staff_dashboard')

        import datetime
        schedule, created = Schedule.objects.get_or_create(
            student_class=student_class,
            subject=subject,
            period=p_val,
            day=day_str,
            defaults={
                'start_time': datetime.time(9, 0),
                'end_time': datetime.time(10, 0)
            }
        )
        
        # Acquire lock
        PeriodLock.objects.get_or_create(
            student_class=student_class,
            date=today,
            period=p_val,
            defaults={'staff': request.user}
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
        student_accuracy = request.POST.get('accuracy')
        
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
            
            # Check 3 minute validity
            if now <= otp.created_at + timedelta(minutes=3):
                
                # Geofence check if staff provided location
                if otp.staff_latitude and otp.staff_longitude:
                    distance = haversine(student_lng, student_lat, otp.staff_longitude, otp.staff_latitude)
                    
                    s_acc = float(student_accuracy) if student_accuracy else 10.0
                    t_acc = float(otp.staff_accuracy) if otp.staff_accuracy else 10.0
                    inaccuracy_buffer = max(0.0, s_acc - 10.0) + max(0.0, t_acc - 10.0)
                    allowed_limit = 100.0 + inaccuracy_buffer
                    
                    if distance > allowed_limit:
                        messages.error(request, f"You are too far from the teacher's session location to mark attendance (Distance: {distance:.1f}m > limit {allowed_limit:.1f}m).")
                        return redirect('student_dashboard')
                
                try:
                    student = request.user.student
                    today = date.today()
                    
                    if otp.schedule.subject and otp.schedule.subject.subject_type in ['OPEN_ELECTIVE', 'PROFESSIONAL_ELECTIVE']:
                        is_enrolled = otp.schedule.subject.elective_students.filter(pk=student.pk).exists()
                    else:
                        is_enrolled = (student.student_class == otp.schedule.student_class)

                    if not is_enrolled:
                        messages.error(request, "You are not enrolled in this subject session.")
                        return redirect('student_dashboard')

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
    
    # Students enrolled in this schedule/subject
    if otp.schedule.subject and otp.schedule.subject.subject_type in ['OPEN_ELECTIVE', 'PROFESSIONAL_ELECTIVE']:
        students = otp.schedule.subject.get_enrolled_students()
    else:
        students = Student.objects.filter(student_class=otp.schedule.student_class)
    
    attendances = Attendance.objects.filter(student__in=students, schedule=otp.schedule, date=today).select_related('student__user', 'student__student_class')
    
    present_count = attendances.filter(status='Present').count()
    absent_count = attendances.filter(status='Absent').count()
    od_count = attendances.filter(status='OD').count()
    leave_count = attendances.filter(status='Leave').count()
    
    all_students_list = [
        {
            'reg_no': a.student.reg_no or a.student.roll_no or a.student.user.username,
            'name': f"{a.student.user.first_name} {a.student.user.last_name}".strip() or a.student.user.username,
            'class_name': str(a.student.student_class) if a.student.student_class else '',
            'status': a.status
        } for a in attendances
    ]
    
    # Calculate time left
    time_elapsed = (timezone.now() - otp.created_at).total_seconds()
    time_left = max(0, 180 - time_elapsed) # 3 minutes validity
    
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
@login_required
def download_report(request):
    from accounts.models import Department, Class, Student, Subject
    from django.db.models import Q
    from django.contrib import messages
    from django.http import HttpResponse
    from .excel_reports import generate_attendance_excel_report

    if request.user.role == 'staff':
        staff_type = getattr(request.user.staff, 'staff_type', 'Normal') if hasattr(request.user, 'staff') else 'Normal'
        is_advisor = Class.objects.filter(advisor=request.user).exists()
        is_tutor = Student.objects.filter(tutor=request.user).exists()
        if staff_type not in ['Advisor', 'Tutor'] and not is_advisor and not is_tutor:
            messages.error(request, 'Reports access is reserved exclusively for Class Advisors and Tutors.')
            return redirect('staff_dashboard')

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
        report_mode = request.POST.get('report_mode', 'day')
        class_id = request.POST.get('class_id')
        subject_id = request.POST.get('subject_id')
        from_date_str = request.POST.get('from_date') or request.POST.get('date')
        to_date_str = request.POST.get('to_date') or from_date_str

        tutor_user = request.user if (request.user.role == 'staff' and getattr(request.user.staff, 'staff_type', '') == 'Tutor') else None

        wb, filename = generate_attendance_excel_report(
            report_mode=report_mode,
            class_id=class_id,
            subject_id=subject_id,
            from_date_str=from_date_str,
            to_date_str=to_date_str,
            tutor_user=tutor_user,
            requested_by_user=request.user
        )

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        wb.save(response)
        return response

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
    from .excel_reports import generate_subject_attendance_excel
    wb, filename = generate_subject_attendance_excel(records)
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    wb.save(response)
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
        non_elective_subjects = Subject.objects.filter(
            student_class=student.student_class
        ).exclude(subject_type__in=['OPEN_ELECTIVE', 'PROFESSIONAL_ELECTIVE'])
        enrolled_elective_subjects = student.elective_subjects.all()
        class_subjects = (non_elective_subjects | enrolled_elective_subjects).distinct()
    else:
        class_subjects = student.elective_subjects.all()

    attendances = Attendance.objects.filter(student=student, schedule__subject__in=class_subjects)
    from .models import filter_active_attendance
    attendances = filter_active_attendance(attendances)
    
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

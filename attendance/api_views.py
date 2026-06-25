import random
import string
import datetime
from math import radians, cos, sin, asin, sqrt
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets
from datetime import timedelta, date

from .models import OTP, Attendance
from .serializers import OTPSerializer, AttendanceSerializer
from accounts.models import Student, Class, User
from timetable.models import Schedule
from leave.models import Leave

# Helper distance calculator
def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371000 # Radius of earth in meters
    return c * r

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_generate_otp(request):
    if request.user.role not in ['staff', 'hod']:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    department_name = request.data.get('department_name')
    class_name = request.data.get('class_name')
    subject_name = request.data.get('subject_name')
    period_data = request.data.get('period')
    
    if not (class_name and subject_name and period_data):
        return Response({'detail': 'Missing required fields: class_name, subject_name, period'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Resolve period_data into a list of periods
    if isinstance(period_data, list):
        periods = period_data
    elif isinstance(period_data, str):
        if ',' in period_data:
            periods = [p.strip() for p in period_data.split(',') if p.strip()]
        else:
            periods = [period_data]
    else:
        periods = [period_data]

    if not periods:
        return Response({'detail': 'No valid periods selected.'}, status=status.HTTP_400_BAD_REQUEST)

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
    
    # Generate a single 6-digit code shared among all selected periods
    code = ''.join(random.choices(string.digits, k=6))
    
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    lat = float(lat) if lat else None
    lng = float(lng) if lng else None

    otps_created = []

    for p in periods:
        p_val = int(p) if str(p).isdigit() else p
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
        
        # Deactivate old OTPs for this schedule today
        OTP.objects.filter(schedule=schedule, is_active=True).update(is_active=False)
        
        otp = OTP.objects.create(code=code, schedule=schedule, staff_latitude=lat, staff_longitude=lng, creator=request.user)
        otps_created.append(otp)
        
        # Pre-mark all students
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
            
    if not otps_created:
        return Response({'detail': 'No periods could be resolved.'}, status=status.HTTP_400_BAD_REQUEST)
        
    return Response({
        'detail': 'OTP generated successfully',
        'otp_id': otps_created[0].id,
        'otp_ids': [o.id for o in otps_created],
        'code': code,
        'periods': periods
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_verify_otp(request):
    if request.user.role != 'student':
        return Response({'detail': 'Only students can mark attendance'}, status=status.HTTP_403_FORBIDDEN)

    code = request.data.get('otp_code')
    student_lat = request.data.get('latitude')
    student_lng = request.data.get('longitude')
    
    if student_lat is None or student_lng is None:
        return Response({'detail': 'Failed to retrieve your location'}, status=status.HTTP_400_BAD_REQUEST)
        
    student_lat = float(student_lat)
    student_lng = float(student_lng)
    
    # Find active OTPs
    otp_qs = OTP.objects.filter(code=code, is_active=True).order_by('-created_at')
    if otp_qs.exists():
        otp = otp_qs.first()
        now = timezone.now()
        
        # Check 3 minute validity (on the most recent one)
        if now <= otp.created_at + timedelta(minutes=3):
            # Geofence check if staff provided location
            if otp.staff_latitude and otp.staff_longitude:
                distance = haversine(student_lng, student_lat, otp.staff_longitude, otp.staff_latitude)
                if distance > 100.0:
                    return Response({
                        'detail': f'You are too far from the classroom (Distance: {distance:.1f}m > limit 100m).'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                student = request.user.student
                today = timezone.localdate()
                
                # Check if student has approved Leave/OD today
                from leave.models import Leave
                approved_leave = Leave.objects.filter(student=student, date=today, final_status='Approved').first()
                if approved_leave:
                    return Response({
                        'detail': f'You cannot mark Present because you are approved for {approved_leave.leave_type} today.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                marked_periods = []
                for active_otp in otp_qs:
                    # Double check validity of each active otp in the queryset
                    if now > active_otp.created_at + timedelta(minutes=3):
                        active_otp.is_active = False
                        active_otp.save()
                        continue
                        
                    # Check existing attendance record for this schedule
                    existing_att = Attendance.objects.filter(student=student, schedule=active_otp.schedule, date=today).first()
                    if existing_att and existing_att.status in ['Leave', 'OD']:
                        continue
                    
                    # Update attendance to Present
                    attendance, created = Attendance.objects.get_or_create(
                        student=student, 
                        schedule=active_otp.schedule, 
                        date=today,
                        defaults={'status': 'Present'}
                    )
                    if not created:
                        attendance.status = 'Present'
                        attendance.save()
                    marked_periods.append(str(active_otp.schedule.period))
                
                if not marked_periods:
                    return Response({
                        'detail': 'No attendance marked. You might have Leave/OD for the selected period(s).'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({'detail': f"Attendance marked as Present successfully for Period(s) {', '.join(marked_periods)}"})
            except Student.DoesNotExist:
                return Response({'detail': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Mark all as inactive since time is up
            otp_qs.update(is_active=False)
            return Response({'detail': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'detail': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_stop_session(request):
    if request.user.role not in ['staff', 'hod']:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
    otp_id = request.data.get('otp_id')
    otp_ids = request.data.get('otp_ids', [])
    
    if otp_id:
        OTP.objects.filter(id=otp_id).update(is_active=False)
        
    if otp_ids:
        OTP.objects.filter(id__in=otp_ids).update(is_active=False)
        
    if not otp_id and not otp_ids:
        today = timezone.now().date()
        OTP.objects.filter(creator=request.user, created_at__date=today, is_active=True).update(is_active=False)
        
    return Response({'detail': 'Session stopped successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_session_stats(request, otp_id):
    if request.user.role not in ['staff', 'hod']:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
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
    time_left = max(0, 180 - time_elapsed) # 3 minutes validity
    
    if time_left <= 0 and otp.is_active:
        otp.is_active = False
        otp.save()
        
    return Response({
        'present_count': present_count,
        'absent_count': absent_count,
        'od_count': od_count,
        'leave_count': leave_count,
        'all_students': all_students_list,
        'time_left': int(time_left),
        'is_active': otp.is_active and time_left > 0,
        'class_name': otp.schedule.student_class.name,
        'subject_name': otp.schedule.subject.name,
        'period': otp.schedule.period
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_student_stats(request, username):
    student = get_object_or_404(Student, user__username=username)
    
    # Authorize: Only self, tutor, advisor, class advisor, or HOD can see this.
    if request.user.role == 'student' and request.user != student.user:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    elif request.user.role == 'staff':
        is_tutor = (request.user == student.tutor)
        is_advisor = (request.user == student.advisor)
        is_class_advisor = (student.student_class and student.student_class.advisor == request.user)
        if not (is_tutor or is_advisor or is_class_advisor):
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    elif request.user.role == 'hod' and request.user.department != student.student_class.department:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    from timetable.models import Schedule
    from accounts.models import Subject
    if student.student_class:
        class_subject_ids = Schedule.objects.filter(student_class=student.student_class).values_list('subject_id', flat=True).distinct()
        class_subjects = Subject.objects.filter(id__in=class_subject_ids)
    else:
        class_subjects = Subject.objects.none()

    attendances = Attendance.objects.filter(student=student, schedule__subject__in=class_subjects)
    
    is_today = request.query_params.get('today') == 'true'
    if is_today:
        today_date = timezone.localtime(timezone.now()).date()
        attendances = attendances.filter(date=today_date)
        
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
    )
    if is_today:
        verified_ods = verified_ods.filter(date=today_date)
    verified_ods = verified_ods.values_list('date', flat=True)
    
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

    return Response({
        'username': student.user.username,
        'name': f"{student.user.first_name} {student.user.last_name}".strip(),
        'class_name': str(student.student_class),
        'total': total_periods,
        'present': present_periods,
        'absent': absent_periods,
        'od': od_periods,
        'verified_od': verified_od_count,
        'percentage': round(overall_percentage, 2),
        'total_periods': total_periods,
        'present_periods': present_periods,
        'absent_periods': absent_periods,
        'od_periods': od_periods,
        'leave_periods': leave_periods,
        'verified_od_periods': verified_od_count,
        'effective_present': effective_present,
        'total_days': total_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'od_days': od_days,
        'leave_days': leave_days,
        'subjects_breakdown': subjects_breakdown,
        'subjects': subjects_breakdown,
        'ai_suggestion': ai_suggestion
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_attendance_report_data(request):
    from_date = request.query_params.get('from_date') or request.query_params.get('date')
    to_date = request.query_params.get('to_date')
    report_type = request.query_params.get('report_type', 'department')
    report_mode = request.query_params.get('report_mode', 'day')
    
    if report_mode == 'day':
        if not to_date:
            to_date = from_date

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

    if report_type == 'class':
        class_id = request.query_params.get('class_id')
        if class_id:
            records = records.filter(student__student_class_id=class_id)
    elif report_type == 'tutored':
        if request.user.role == 'staff':
            records = records.filter(student__tutor=request.user)
    elif report_type == 'student':
        student_id = request.query_params.get('student_id')
        if student_id:
            records = records.filter(Q(student__user__username=student_id) | Q(student__reg_no=student_id))

    if from_date:
        records = records.filter(date__gte=from_date)
    if to_date:
        records = records.filter(date__lte=to_date)

    year = request.query_params.get('year')
    if year:
        try:
            records = records.filter(student__student_class__year=int(year))
        except ValueError:
            pass

    subject_id = request.query_params.get('subject_id')

    if request.user.role == 'staff':
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        
        is_related = False
        if report_type == 'class' and class_id:
            try:
                student_class = Class.objects.get(id=class_id)
                is_related = (student_class.advisor == request.user)
            except Class.DoesNotExist:
                pass
        elif report_type == 'student' and student_id:
            try:
                student = Student.objects.get(Q(user__username=student_id) | Q(reg_no=student_id))
                is_related = (student.tutor == request.user or student.advisor == request.user)
            except Student.DoesNotExist:
                pass
        elif report_type == 'tutored':
            is_related = True

        if not is_related and report_mode == 'subject_percentage':
            if not subject_id:
                return Response({'detail': 'Subject is required for this report as you are not the tutor or advisor.'}, status=status.HTTP_400_BAD_REQUEST)
            records = records.filter(schedule__subject_id=subject_id)
        else:
            if subject_id and report_mode == 'subject_percentage':
                records = records.filter(schedule__subject_id=subject_id)
    else:
        if subject_id and report_mode == 'subject_percentage':
            records = records.filter(schedule__subject_id=subject_id)

    result = []
    if report_mode == 'day':
        students_query = Student.objects.all()
        if request.user.role == 'hod' or request.user.role == 'staff':
            students_query = students_query.filter(user__department=request.user.department)
        
        if report_type == 'class' and class_id:
            students_query = students_query.filter(student_class_id=class_id)
        elif report_type == 'tutored':
            students_query = students_query.filter(tutor=request.user)
        elif report_type == 'student' and student_id:
            students_query = students_query.filter(Q(user__username=student_id) | Q(reg_no=student_id))
            
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
                result.append({
                    'student_username': student.user.username,
                    'student_reg_no': student.reg_no or student.roll_no or student.user.username,
                    'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                    'department_name': student.student_class.department.name if student.student_class and student.student_class.department else '',
                    'year': student.student_class.year if student.student_class else '',
                    'class_name': str(student.student_class),
                    'class_only_name': student.student_class.name if student.student_class else '',
                    'section': student.student_class.section if student.student_class else '',
                    'date': date_str,
                    'status': status
                })
    else:
        from leave.models import Leave
        students_query = Student.objects.all()
        if request.user.role == 'hod' or request.user.role == 'staff':
            students_query = students_query.filter(user__department=request.user.department)
        
        if report_type == 'class' and class_id:
            students_query = students_query.filter(student_class_id=class_id)
        elif report_type == 'tutored':
            students_query = students_query.filter(tutor=request.user)
        elif report_type == 'student' and student_id:
            students_query = students_query.filter(Q(user__username=student_id) | Q(reg_no=student_id))
            
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
                
            result.append({
                'student_username': student.user.username,
                'student_reg_no': student.reg_no or student.roll_no or student.user.username,
                'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                'department_name': student.student_class.department.name if student.student_class and student.student_class.department else '',
                'year': student.student_class.year if student.student_class else '',
                'class_name': str(student.student_class),
                'class_only_name': student.student_class.name if student.student_class else '',
                'section': student.student_class.section if student.student_class else '',
                'subject_name': subject_label,
                'percentage': percentage
            })

    return Response(result)

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='manual-attendance-data')
    def manual_attendance_data(self, request):
        user = self.request.user
        if user.role != 'staff':
            return Response({'detail': 'Only staff members can access manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
            
        student_id = self.request.query_params.get('student_id')
        date_str = self.request.query_params.get('date')
        
        department = user.department
        students = Student.objects.filter(user__department=department).select_related('user', 'student_class').order_by('reg_no', 'user__username')
        
        students_list = [
            {
                'id': s.user_id,
                'username': s.user.username,
                'name': f"{s.user.first_name} {s.user.last_name}".strip(),
                'class_name': s.student_class.name if s.student_class else '',
                'reg_no': s.reg_no or s.roll_no or s.user.username,
            } for s in students
        ]
        
        if not date_str:
            date_str = timezone.localdate().strftime('%Y-%m-%d')
            
        schedules_data = []
        error_message = None
        
        if student_id:
            try:
                selected_student = Student.objects.get(pk=student_id, user__department=department)
                target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
                weekday = target_date.strftime('%A')
                
                if selected_student.student_class:
                    schedules = Schedule.objects.filter(
                        student_class=selected_student.student_class,
                        day=weekday
                    ).order_by('period')
                    
                    for sched in schedules:
                        att = Attendance.objects.filter(
                            student=selected_student,
                            schedule=sched,
                            date=target_date
                        ).first()
                        
                        schedules_data.append({
                            'schedule_id': sched.id,
                            'subject_name': sched.subject.name,
                            'subject_code': sched.subject.code,
                            'period': sched.period,
                            'status': att.status if att else 'Absent'
                        })
                else:
                    error_message = "Selected student has no assigned class."
            except Student.DoesNotExist:
                error_message = "Student not found in your department."
            except ValueError:
                error_message = "Invalid date format."
                
        return Response({
            'students': students_list,
            'selected_student_id': int(student_id) if student_id and student_id.isdigit() else None,
            'selected_date_str': date_str,
            'schedules_data': schedules_data,
            'error_message': error_message
        })

    @action(detail=False, methods=['post'], url_path='save-manual-attendance')
    def save_manual_attendance(self, request):
        user = self.request.user
        if user.role != 'staff':
            return Response({'detail': 'Only staff members can mark manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
            
        student_id = self.request.data.get('student_id')
        date_str = self.request.data.get('date')
        status_updates = self.request.data.get('statuses', {})
        
        if not student_id or not date_str:
            return Response({'detail': 'Missing student_id or date.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            student = Student.objects.get(pk=student_id, user__department=user.department)
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            weekday = target_date.strftime('%A')
            
            if not student.student_class:
                return Response({'detail': 'Student has no assigned class.'}, status=status.HTTP_400_BAD_REQUEST)
                
            schedules = Schedule.objects.filter(student_class=student.student_class, day=weekday)
            updated_count = 0
            for sched in schedules:
                status_val = status_updates.get(str(sched.id)) or status_updates.get(sched.id)
                if status_val in ['Present', 'Absent', 'OD', 'Leave']:
                    Attendance.objects.update_or_create(
                        student=student,
                        schedule=sched,
                        date=target_date,
                        defaults={'status': status_val}
                    )
                    updated_count += 1
            return Response({'detail': f'Successfully updated attendance for {updated_count} periods.'})
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found in your department.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': f'Error saving attendance: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

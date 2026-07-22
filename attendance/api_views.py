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

    # Check locks first
    from .models import PeriodLock
    for p in periods:
        p_val = int(p) if str(p).isdigit() else p
        lock = PeriodLock.objects.filter(student_class=student_class, date=today, period=p_val).first()
        if lock and lock.staff != request.user:
            return Response({
                'detail': f'Period {p_val} is already marked/used by {lock.staff.first_name} {lock.staff.last_name} ({lock.staff.username}).'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate a single 6-digit code shared among all selected periods
    code = ''.join(random.choices(string.digits, k=6))
    
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    accuracy = request.data.get('accuracy')
    lat = float(lat) if lat else None
    lng = float(lng) if lng else None
    accuracy = float(accuracy) if accuracy else 10.0

    otps_created = []

    for p in periods:
        p_val = int(p) if str(p).isdigit() else p
        
        # Acquire/Ensure lock exists for current staff
        PeriodLock.objects.get_or_create(
            student_class=student_class,
            date=today,
            period=p_val,
            defaults={'staff': request.user}
        )

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
        
        otp = OTP.objects.create(code=code, schedule=schedule, staff_latitude=lat, staff_longitude=lng, staff_accuracy=accuracy, creator=request.user)
        otps_created.append(otp)
        
        # Pre-mark all students
        students = schedule.student_class.get_students()
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
    student_accuracy = request.data.get('accuracy')
    
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
                
                s_acc = float(student_accuracy) if student_accuracy else 10.0
                t_acc = float(otp.staff_accuracy) if otp.staff_accuracy else 10.0
                inaccuracy_buffer = max(0.0, s_acc - 10.0) + max(0.0, t_acc - 10.0)
                allowed_limit = 100.0 + inaccuracy_buffer
                
                if distance > allowed_limit:
                    return Response({
                        'detail': f"You are too far from the teacher's session location (Distance: {distance:.1f}m > limit {allowed_limit:.1f}m)."
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                student = request.user.student
                today = timezone.localdate()
                
                is_enrolled = (
                    student.student_class == otp.schedule.student_class or
                    otp.schedule.student_class.elective_students.filter(pk=student.pk).exists()
                )
                if not is_enrolled:
                    return Response({'detail': 'You are not enrolled in this class session.'}, status=status.HTTP_400_BAD_REQUEST)
                
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
        class_subjects = Subject.objects.filter(student_class=student.student_class)
        sched_subject_ids = Schedule.objects.filter(student_class=student.student_class).values_list('subject_id', flat=True).distinct()
        class_subjects = (class_subjects | Subject.objects.filter(id__in=sched_subject_ids)).distinct()
    else:
        class_subjects = Subject.objects.none()

    attendances_qs = Attendance.objects.filter(student=student, schedule__subject__in=class_subjects).select_related('schedule__subject')
    from .models import filter_active_attendance
    attendances_qs = filter_active_attendance(attendances_qs)
    
    is_today = request.query_params.get('today') == 'true'
    if is_today:
        today_date = timezone.localtime(timezone.now()).date()
        attendances_qs = attendances_qs.filter(date=today_date)
        
    attendances = list(attendances_qs)
    total_periods = len(attendances)
    present_periods = sum(1 for a in attendances if a.status == 'Present')
    absent_periods = sum(1 for a in attendances if a.status == 'Absent')
    od_periods = sum(1 for a in attendances if a.status == 'OD')
    leave_periods = sum(1 for a in attendances if a.status == 'Leave')
    
    # Find verified ODs
    from leave.models import Leave
    verified_ods_qs = Leave.objects.filter(
        student=student, 
        leave_type='OD', 
        final_status='Approved', 
        certificate_verified=True
    )
    if is_today:
        verified_ods_qs = verified_ods_qs.filter(date=today_date)
    verified_ods = set(verified_ods_qs.values_list('date', flat=True))
    
    verified_od_count = sum(1 for a in attendances if a.status == 'OD' and a.date in verified_ods)
    
    effective_present = present_periods + verified_od_count
    overall_percentage = (effective_present / total_periods * 100) if total_periods > 0 else 0
    
    # Calculate Days using in-memory aggregation
    att_by_date = {}
    for a in attendances:
        if a.date not in att_by_date:
            att_by_date[a.date] = {'Present': 0, 'OD': 0, 'Absent': 0, 'Leave': 0}
        if a.status in att_by_date[a.date]:
            att_by_date[a.date][a.status] += 1

    dates = list(att_by_date.keys())
    total_days = len(dates)
    present_days = 0
    absent_days = 0
    od_days = 0
    leave_days = 0
    
    for dt, counts in att_by_date.items():
        P = counts['Present']
        O = counts['OD']
        A = counts['Absent']
        L = counts['Leave']
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

    # Subject-wise breakdown using in-memory aggregation
    subjects_breakdown = []
    if student.student_class:
        att_by_subject = {}
        for a in attendances:
            sub_id = a.schedule.subject_id
            if sub_id not in att_by_subject:
                att_by_subject[sub_id] = []
            att_by_subject[sub_id].append(a)

        for sub in class_subjects:
            sub_att = att_by_subject.get(sub.id, [])
            sub_total = len(sub_att)
            sub_present = sum(1 for a in sub_att if a.status == 'Present')
            sub_absent = sum(1 for a in sub_att if a.status == 'Absent')
            sub_od = sum(1 for a in sub_att if a.status == 'OD')
            sub_leave = sum(1 for a in sub_att if a.status == 'Leave')
            
            sub_verified_od = sum(1 for a in sub_att if a.status == 'OD' and a.date in verified_ods)
            sub_effective_present = sub_present + sub_verified_od
            sub_percentage = (sub_effective_present / sub_total * 100) if sub_total > 0 else 100.0
            
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
        'profile_photo': student.user.profile_photo or None,
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
        from .models import filter_active_attendance
        records_in_range = filter_active_attendance(records_in_range)
        
        from collections import defaultdict
        student_date_statuses = defaultdict(list)
        for r in records_in_range:
            student_date_statuses[(r.student_id, r.date)].append(r.status)
            
        attendance_map = {}
        for key, statuses in student_date_statuses.items():
            has_present = 'Present' in statuses or 'OD' in statuses
            has_absent_or_leave = 'Absent' in statuses or 'Leave' in statuses
            if has_present and has_absent_or_leave:
                attendance_map[key] = 'Half Day'
            elif 'OD' in statuses and not has_absent_or_leave:
                attendance_map[key] = 'OD'
            elif 'Leave' in statuses and not has_present:
                attendance_map[key] = 'Leave'
            elif 'Absent' in statuses and not has_present:
                attendance_map[key] = 'Absent'
            else:
                attendance_map[key] = 'Present' if 'Present' in statuses else 'OD'
                
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
            from .models import filter_active_attendance
            student_atts = filter_active_attendance(student_atts)
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
                    schedules = list(Schedule.objects.filter(
                        student_class=selected_student.student_class,
                        day=weekday
                    ).select_related('subject').order_by('period'))
                    
                    atts = Attendance.objects.filter(
                        student=selected_student,
                        schedule__in=schedules,
                        date=target_date
                    )
                    att_dict = {a.schedule_id: a.status for a in atts}
                    
                    for sched in schedules:
                        status_val = att_dict.get(sched.id, 'Absent')
                        schedules_data.append({
                            'schedule_id': sched.id,
                            'subject_name': sched.subject.name,
                            'subject_code': sched.subject.code,
                            'period': sched.period,
                            'status': status_val
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

    @action(detail=False, methods=['get'], url_path='locked-periods')
    def locked_periods(self, request):
        class_id = request.query_params.get('class_id')
        date_str = request.query_params.get('date')
        if not (class_id and date_str):
            return Response({'detail': 'class_id and date are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from .models import PeriodLock
        locks = PeriodLock.objects.filter(student_class_id=class_id, date=target_date)
        locks_data = [
            {
                'period': l.period,
                'locked_by_id': l.staff_id,
                'locked_by_name': f"{l.staff.first_name} {l.staff.last_name}".strip() or l.staff.username
            } for l in locks
        ]
        return Response(locks_data)

    @action(detail=False, methods=['get'], url_path='subject-detail')
    def subject_detail(self, request):
        student_username = request.query_params.get('student_username')
        subject_id = request.query_params.get('subject_id')
        if not (student_username and subject_id):
            return Response({'detail': 'student_username and subject_id are required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        student = get_object_or_404(Student, user__username=student_username)
        records = Attendance.objects.filter(
            student=student,
            schedule__subject_id=subject_id
        ).select_related('schedule', 'schedule__subject').order_by('-date', 'schedule__period')
        
        from .models import filter_active_attendance
        filtered_records = filter_active_attendance(records)
        
        total_hours = filtered_records.count()
        present_count = filtered_records.filter(status='Present').count()
        absent_count = filtered_records.filter(status='Absent').count()
        od_count = filtered_records.filter(status='OD').count()
        leave_count = filtered_records.filter(status='Leave').count()
        
        from leave.models import Leave
        verified_ods = Leave.objects.filter(
            student=student, 
            leave_type='OD', 
            final_status='Approved', 
            certificate_verified=True
        ).values_list('date', flat=True)
        verified_od_count = filtered_records.filter(status='OD', date__in=verified_ods).count()
        effective_present = present_count + verified_od_count
        percentage = (effective_present / total_hours * 100) if total_hours > 0 else 100.0
        
        from accounts.models import Subject
        subject = get_object_or_404(Subject, id=subject_id)
        
        download = request.query_params.get('download') == 'true'
        if download:
            import csv
            from django.http import HttpResponse
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="Attendance_{student.user.username}_{subject.code}.csv"'
            
            writer = csv.writer(response)
            writer.writerow(['STUDENT DETAILS'])
            writer.writerow(['Name', f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username])
            writer.writerow(['Register Number', student.reg_no or student.roll_no or student.user.username])
            writer.writerow(['Class', str(student.student_class)])
            writer.writerow(['Department', student.student_class.department.name if student.student_class and student.student_class.department else ''])
            writer.writerow([])
            writer.writerow(['SUBJECT DETAILS'])
            writer.writerow(['Subject Name', subject.name])
            writer.writerow(['Subject Code', subject.code])
            writer.writerow([])
            writer.writerow(['ATTENDANCE SUMMARY'])
            writer.writerow(['Total Hours', total_hours])
            writer.writerow(['Effective Present (inc. Approved OD)', effective_present])
            writer.writerow(['Absent Hours', absent_count])
            writer.writerow(['Leave Hours', leave_count])
            writer.writerow(['Attendance Percentage', f"{round(percentage, 2)}%"])
            writer.writerow([])
            writer.writerow(['ATTENDANCE LOG'])
            writer.writerow(['Date', 'Period', 'Status', 'Note'])
            for r in records:
                note = 'Ignored (Optional 8th Period)' if (r.schedule.period == 8 and r.status != 'Present') else ''
                writer.writerow([r.date.strftime('%Y-%m-%d'), r.schedule.period, r.status, note])
                
            return response
            
        records_data = [
            {
                'date': r.date.strftime('%Y-%m-%d'),
                'period': r.schedule.period,
                'status': r.status,
                'ignored': r.schedule.period == 8 and r.status != 'Present'
            } for r in records
        ]
        
        return Response({
            'student_details': {
                'name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                'username': student.user.username,
                'reg_no': student.reg_no or student.roll_no or student.user.username,
                'class_name': str(student.student_class),
                'department': student.student_class.department.name if student.student_class and student.student_class.department else '',
            },
            'subject_details': {
                'id': subject.id,
                'name': subject.name,
                'code': subject.code,
            },
            'stats': {
                'total_hours': total_hours,
                'present_count': present_count,
                'absent_count': absent_count,
                'od_count': od_count,
                'leave_count': leave_count,
                'verified_od_count': verified_od_count,
                'effective_present': effective_present,
                'percentage': round(percentage, 2),
            },
            'records': records_data
        })

    @action(detail=False, methods=['get'], url_path='advisor-subject-report')
    def advisor_subject_report(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can access subject reports.'}, status=status.HTTP_403_FORBIDDEN)
            
        subject_id = request.query_params.get('subject_id')
        if not subject_id:
            return Response({'detail': 'subject_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from accounts.models import Subject, Student, Class
        subject = get_object_or_404(Subject, id=subject_id)
        advised_class = Class.objects.filter(advisor=user).first()
        target_class = subject.student_class or advised_class
        
        if target_class:
            students = target_class.get_students().select_related('user').order_by('reg_no', 'user__username')
        else:
            students = Student.objects.none()
        
        from timetable.models import Schedule
        schedules = Schedule.objects.filter(subject=subject)
        
        records = Attendance.objects.filter(
            schedule__subject=subject,
            student__in=students
        ).select_related('student__user', 'schedule').order_by('date', 'schedule__period')
        
        date_periods = sorted(list(set((r.date, r.schedule.period) for r in records)))
        
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="Class_Attendance_{subject.code}.csv"'
        
        writer = csv.writer(response)
        
        headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Total Hours', 'Present Count', 'Absent Count', 'OD Count', 'Leave Count', 'Percentage']
        for dt, p in date_periods:
            headers.append(f"{dt.strftime('%Y-%m-%d')} (P{p})")
        writer.writerow(headers)
        
        from .models import filter_active_attendance
        
        for student in students:
            student_records = records.filter(student=student)
            
            filtered_student_records = filter_active_attendance(student_records)
            
            total_hours = filtered_student_records.count()
            present_count = filtered_student_records.filter(status='Present').count()
            absent_count = filtered_student_records.filter(status='Absent').count()
            od_count = filtered_student_records.filter(status='OD').count()
            leave_count = filtered_student_records.filter(status='Leave').count()
            
            from leave.models import Leave
            verified_ods = Leave.objects.filter(
                student=student, 
                leave_type='OD', 
                final_status='Approved', 
                certificate_verified=True
            ).values_list('date', flat=True)
            verified_od_count = filtered_student_records.filter(status='OD', date__in=verified_ods).count()
            effective_present = present_count + verified_od_count
            percentage = (effective_present / total_hours * 100) if total_hours > 0 else 100.0
            
            row = [
                student.reg_no or student.roll_no or student.user.username,
                f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                student.student_class.department.name if student.student_class and student.student_class.department else '',
                student.student_class.year if student.student_class else '',
                student.student_class.name if student.student_class else '',
                student.student_class.section if student.student_class else '',
                total_hours,
                present_count,
                absent_count,
                od_count,
                leave_count,
                f"{round(percentage, 2)}%"
            ]
            
            for dt, p in date_periods:
                att = student_records.filter(date=dt, schedule__period=p).first()
                if att:
                    if p == 8 and att.status != 'Present':
                        row.append(f"{att.status} (Ignored)")
                    else:
                        row.append(att.status)
                else:
                    row.append('-')
            
            writer.writerow(row)
            
        return response

    @action(detail=False, methods=['get'], url_path='advisor-subject-report-json')
    def advisor_subject_report_json(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can access subject details.'}, status=status.HTTP_403_FORBIDDEN)
            
        subject_id = request.query_params.get('subject_id')
        if not subject_id:
            return Response({'detail': 'subject_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        from accounts.models import Subject, Student, Class
        subject = get_object_or_404(Subject, id=subject_id)
        advised_class = Class.objects.filter(advisor=user).first()
        target_class = subject.student_class or advised_class
        
        if target_class:
            students = target_class.get_students().select_related('user').order_by('reg_no', 'user__username')
        else:
            students = Student.objects.none()
        
        records = Attendance.objects.filter(
            schedule__subject=subject,
            student__in=students
        ).select_related('student__user', 'schedule')
        
        from .models import filter_active_attendance
        
        student_data = []
        for student in students:
            student_records = records.filter(student=student)
            filtered_student_records = filter_active_attendance(student_records)
            
            total_hours = filtered_student_records.count()
            present_count = filtered_student_records.filter(status='Present').count()
            absent_count = filtered_student_records.filter(status='Absent').count()
            od_count = filtered_student_records.filter(status='OD').count()
            leave_count = filtered_student_records.filter(status='Leave').count()
            
            from leave.models import Leave
            verified_ods = Leave.objects.filter(
                student=student, 
                leave_type='OD', 
                final_status='Approved', 
                certificate_verified=True
            ).values_list('date', flat=True)
            verified_od_count = filtered_student_records.filter(status='OD', date__in=verified_ods).count()
            effective_present = present_count + verified_od_count
            percentage = (effective_present / total_hours * 100) if total_hours > 0 else 100.0
            
            student_data.append({
                'id': student.id,
                'reg_no': student.reg_no or student.roll_no or student.user.username,
                'name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                'total_hours': total_hours,
                'present_count': present_count,
                'absent_count': absent_count,
                'od_count': od_count,
                'leave_count': leave_count,
                'percentage': round(percentage, 2)
            })
            
        return Response({
            'subject_name': subject.name,
            'subject_code': subject.code,
            'students': student_data
        })

    @action(detail=False, methods=['get'], url_path='manual-class-students')
    def manual_class_students(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can access manual attendance.'}, status=status.HTTP_403_FORBIDDEN)

        class_id = request.query_params.get('class_id')
        subject_id = request.query_params.get('subject_id')
        date_str = request.query_params.get('date')
        period = request.query_params.get('period')

        if not (class_id and subject_id and date_str):
            return Response({'detail': 'Missing class_id, subject_id, or date.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve students for this class
        students = Student.objects.filter(student_class_id=class_id).select_related('user').order_by('reg_no', 'user__username')

        # Retrieve existing attendance for this class, subject, and date
        weekday = target_date.strftime('%A')
        
        schedules_filter = {
            'student_class_id': class_id,
            'subject_id': subject_id,
            'day': weekday
        }
        period_val = None
        if period:
            try:
                period_val = int(period)
                schedules_filter['period'] = period_val
            except ValueError:
                pass

        schedules = Schedule.objects.filter(**schedules_filter)
        
        existing_attendance = {}
        if schedules.exists():
            attendances = Attendance.objects.filter(
                student__student_class_id=class_id,
                schedule__in=schedules,
                date=target_date
            )
            for att in attendances:
                # If there are multiple periods, just pick the status of the first one we find
                existing_attendance[att.student_id] = att.status

        # Format students list
        students_list = [
            {
                'id': s.user_id,
                'username': s.user.username,
                'name': f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username,
                'reg_no': s.reg_no or s.roll_no or s.user.username,
                'roll_no': s.roll_no or '',
                'current_status': existing_attendance.get(s.user_id, 'Present')  # Default to Present if not marked
            } for s in students
        ]

        # Check if weekly schedule exists for this class, subject on this weekday
        schedule_exists = schedules.exists()

        # Check if this period is locked
        from .models import PeriodLock
        is_locked = False
        locked_by_name = ""
        if period_val:
            lock = PeriodLock.objects.filter(student_class_id=class_id, date=target_date, period=period_val).first()
            if lock:
                from accounts.models import Class
                student_class = Class.objects.filter(id=class_id).first()
                is_advisor = student_class and (student_class.advisor == user)
                
                if is_advisor:
                    is_locked = True
                    locked_by_name = "Advisor (must edit through HOD/Advisor Whole Day Attendance)"
                else:
                    is_locked = (lock.staff != user)
                    locked_by_name = f"{lock.staff.first_name} {lock.staff.last_name}".strip() or lock.staff.username

        return Response({
            'students': students_list,
            'schedule_exists': schedule_exists,
            'weekday': weekday,
            'is_locked': is_locked,
            'locked_by_name': locked_by_name
        })

    @action(detail=False, methods=['post'], url_path='save-class-manual-attendance')
    def save_class_manual_attendance(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can access manual attendance.'}, status=status.HTTP_403_FORBIDDEN)

        class_id = request.data.get('class_id')
        subject_id = request.data.get('subject_id')
        date_str = request.data.get('date')
        period = request.data.get('period')
        statuses = request.data.get('statuses', {})

        if not (class_id and subject_id and date_str):
            return Response({'detail': 'Missing class_id, subject_id, or date.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            weekday = target_date.strftime('%A')
        except ValueError:
            return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)

        period_val = int(period) if (period and str(period).isdigit()) else 1

        # Check PeriodLock
        from .models import PeriodLock
        lock = PeriodLock.objects.filter(student_class_id=class_id, date=target_date, period=period_val).first()
        if lock:
            from accounts.models import Class
            student_class = Class.objects.filter(id=class_id).first()
            is_advisor = student_class and (student_class.advisor == user)
            
            if is_advisor:
                return Response({
                    'detail': f'This period is marked. As the advisor, you must edit it through the Advisor Whole Day Manual Attendance page.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif lock.staff != user:
                return Response({
                    'detail': f'Period {period_val} attendance is already marked/used by {lock.staff.first_name} {lock.staff.last_name} ({lock.staff.username}).'
                }, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        try:
            with transaction.atomic():
                # Acquire/Ensure lock exists for current user
                PeriodLock.objects.get_or_create(
                    student_class_id=class_id,
                    date=target_date,
                    period=period_val,
                    defaults={'staff': user}
                )

                # Find/Create the schedule for this class, subject, and day of week at selected period
                sched = Schedule.objects.filter(student_class_id=class_id, subject_id=subject_id, day=weekday, period=period_val).first()
                if not sched:
                    from accounts.models import Class, Subject
                    student_class = get_object_or_404(Class, id=class_id)
                    subject = get_object_or_404(Subject, id=subject_id)
                    
                    # Calculate start/end time based on period
                    start_hour = 9 + (period_val - 1)
                    if period_val >= 5:
                        start_hour += 1  # lunch break
                    start_time = datetime.time(start_hour, 0)
                    end_time = datetime.time(start_hour + 1, 0)
                    
                    sched = Schedule.objects.create(
                        student_class=student_class,
                        subject=subject,
                        period=period_val,
                        day=weekday,
                        start_time=start_time,
                        end_time=end_time
                    )
                schedules = [sched]

                # Update or create attendance for each student in the class
                students = Student.objects.filter(student_class_id=class_id)
                updated_count = 0
                for student in students:
                    status_val = statuses.get(str(student.user_id)) or statuses.get(student.user_id) or 'Present'
                    if status_val not in ['Present', 'Absent', 'OD']:
                        status_val = 'Present'

                    for s_item in schedules:
                        Attendance.objects.update_or_create(
                            student=student,
                            schedule=s_item,
                            date=target_date,
                            defaults={'status': status_val}
                        )
                        updated_count += 1

                return Response({
                    'success': True,
                    'detail': f'Successfully marked attendance for {students.count()} students ({updated_count} slot records).'
                })
        except Exception as e:
            return Response({'detail': f'Error saving attendance: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='advisor-class-students')
    def advisor_class_students(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can access advisor manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
        
        from accounts.models import Class
        advised_class = Class.objects.filter(advisor=user).first()
        is_advisor = (hasattr(user, 'staff') and user.staff.staff_type == 'Advisor') or advised_class is not None
        if not is_advisor:
            return Response({'detail': 'Only Advisors can access advisor manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
            
        if not advised_class:
            return Response({'detail': 'You are not assigned as an advisor to any class.'}, status=status.HTTP_400_BAD_REQUEST)
            
        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.localdate().strftime('%Y-%m-%d')
            
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            weekday = target_date.strftime('%A')
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
            
        students = Student.objects.filter(student_class=advised_class).select_related('user').order_by('reg_no', 'user__username')
        
        # Get schedules for this class on this weekday
        schedules = Schedule.objects.filter(student_class=advised_class, day=weekday).order_by('period')
        
        # We want to represent 8 periods (1 to 8)
        periods_list = []
        for period in range(1, 9):
            sched = schedules.filter(period=period).first()
            periods_list.append({
                'period': period,
                'subject_name': sched.subject.name if sched else 'No Schedule',
                'subject_code': sched.subject.code if sched else '',
                'schedule_id': sched.id if sched else None
            })
            
        # Get existing attendance for this class and date
        existing_attendances = Attendance.objects.filter(
            student__student_class=advised_class,
            date=target_date
        ).select_related('schedule')
        
        # Map student_id -> period -> status
        att_map = {}
        for att in existing_attendances:
            s_id = att.student_id
            p_num = att.schedule.period
            if s_id not in att_map:
                att_map[s_id] = {}
            att_map[s_id][p_num] = att.status
            
        students_data = []
        for s in students:
            # By default, all periods are 'Present' unless already marked in DB
            statuses = {}
            for p in range(1, 9):
                statuses[str(p)] = att_map.get(s.user_id, {}).get(p, 'Present')
                
            students_data.append({
                'id': s.user_id,
                'username': s.user.username,
                'name': f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username,
                'reg_no': s.reg_no or s.roll_no or s.user.username,
                'roll_no': s.roll_no or '',
                'statuses': statuses
            })
            
        return Response({
            'class_id': advised_class.id,
            'class_name': str(advised_class),
            'date': date_str,
            'weekday': weekday,
            'periods': periods_list,
            'students': students_data
        })

    @action(detail=False, methods=['post'], url_path='save-advisor-manual-attendance')
    def save_advisor_manual_attendance(self, request):
        user = self.request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Only staff and HOD members can mark manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
            
        from accounts.models import Class
        advised_class = Class.objects.filter(advisor=user).first()
        is_advisor = (hasattr(user, 'staff') and user.staff.staff_type == 'Advisor') or advised_class is not None
        if not is_advisor:
            return Response({'detail': 'Only Advisors can mark advisor manual attendance.'}, status=status.HTTP_403_FORBIDDEN)
            
        if not advised_class:
            return Response({'detail': 'You are not assigned as an advisor to any class.'}, status=status.HTTP_400_BAD_REQUEST)
            
        date_str = request.data.get('date')
        attendance_data = request.data.get('attendance_data', {})
        
        if not date_str:
            return Response({'detail': 'Missing date.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            weekday = target_date.strftime('%A')
        except ValueError:
            return Response({'detail': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.db import transaction
        try:
            with transaction.atomic():
                # Acquire/Update locks for periods 1 to 8
                from .models import PeriodLock
                for p in range(1, 9):
                    PeriodLock.objects.update_or_create(
                        student_class=advised_class,
                        date=target_date,
                        period=p,
                        defaults={'staff': user}
                    )

                # We need to make sure Schedule objects exist for periods 1 to 8 on this weekday.
                # If they do not, we create default schedules for the class.
                schedules_by_period = {}
                for p in range(1, 9):
                    sched = Schedule.objects.filter(student_class=advised_class, day=weekday, period=p).first()
                    if not sched:
                        # Find a subject for this class, or create/use a default subject
                        from accounts.models import Subject
                        subject = Subject.objects.filter(student_class=advised_class).first()
                        if not subject:
                            subject = Subject.objects.filter(department=advised_class.department).first()
                        if not subject:
                            subject, _ = Subject.objects.get_or_create(
                                name="General",
                                code="GEN",
                                department=advised_class.department
                            )
                        # Standard hour calculation
                        start_hour = 9 + (p - 1)
                        if p >= 5:
                            start_hour += 1 # lunch break
                        start_time = datetime.time(start_hour, 0)
                        end_time = datetime.time(start_hour + 1, 0)
                        sched = Schedule.objects.create(
                            student_class=advised_class,
                            subject=subject,
                            period=p,
                            day=weekday,
                            start_time=start_time,
                            end_time=end_time
                        )
                    schedules_by_period[p] = sched

                # Update or create attendance records for each student in the class
                students = Student.objects.filter(student_class=advised_class)
                updated_records_count = 0
                
                for student in students:
                    student_payload = attendance_data.get(str(student.user_id)) or attendance_data.get(student.user_id)
                    # If student is not in payload, they default to all present
                    if not student_payload:
                        student_payload = {
                            'overall_status': 'Present',
                            'periods': {}
                        }
                    
                    overall_status = student_payload.get('overall_status', 'Present')
                    period_statuses = student_payload.get('periods', {})
                    
                    for p in range(1, 9):
                        # Determine status for this period
                        if overall_status == 'Present':
                            p_status = 'Present'
                        elif overall_status == 'Absent':
                            p_status = 'Absent'
                        elif overall_status == 'OD':
                            p_status = 'OD'
                        elif overall_status == 'Half Day (FN Present / AN Absent)':
                            p_status = 'Present' if p <= 4 else 'Absent'
                        elif overall_status == 'Half Day (FN Absent / AN Present)':
                            p_status = 'Absent' if p <= 4 else 'Present'
                        else: # Custom
                            p_status = period_statuses.get(str(p)) or period_statuses.get(p) or 'Present'
                            
                        if p_status not in ['Present', 'Absent', 'OD', 'Leave']:
                            p_status = 'Present'
                            
                        # Save/Update
                        Attendance.objects.update_or_create(
                            student=student,
                            schedule=schedules_by_period[p],
                            date=target_date,
                            defaults={'status': p_status}
                        )
                        updated_records_count += 1
                        
                return Response({
                    'success': True,
                    'detail': f'Successfully updated daily attendance for {students.count()} students ({updated_records_count} period records).'
                })
        except Exception as e:
            return Response({'detail': f'Error saving manual attendance: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

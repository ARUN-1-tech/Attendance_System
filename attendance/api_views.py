import random
import string
import datetime
from math import radians, cos, sin, asin, sqrt
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
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
    period = request.data.get('period')
    
    if not (class_name and subject_name and period):
        return Response({'detail': 'Missing required fields: class_name, subject_name, period'}, status=status.HTTP_400_BAD_REQUEST)
        
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

    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    lat = float(lat) if lat else None
    lng = float(lng) if lng else None

    code = ''.join(random.choices(string.digits, k=6))
    otp = OTP.objects.create(code=code, schedule=schedule, staff_latitude=lat, staff_longitude=lng)
    
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
    
    # Save active OTP ID in session if wanted, or just return it to React
    return Response({
        'detail': 'OTP generated successfully',
        'otp_id': otp.id,
        'code': code
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
                    return Response({
                        'detail': f'You are too far from the classroom (Distance: {distance:.1f}m > limit 20m).'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
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
                    
                return Response({'detail': 'Attendance marked as Present successfully'})
            except Student.DoesNotExist:
                return Response({'detail': 'Student profile not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            otp.is_active = False
            otp.save()
            return Response({'detail': 'OTP has expired'}, status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response({'detail': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_session_stats(request, otp_id):
    if request.user.role not in ['staff', 'hod']:
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
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
        {
            'username': a.student.user.username,
            'name': f"{a.student.user.first_name} {a.student.user.last_name}".strip()
        } for a in remaining_students
    ]
    
    # Calculate time left
    time_elapsed = (timezone.now() - otp.created_at).total_seconds()
    time_left = max(0, 60 - time_elapsed) # 1 minute validity
    
    return Response({
        'present_count': present_count,
        'remaining_count': remaining_count,
        'remaining_students': remaining_list,
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

    attendances = Attendance.objects.filter(student=student)
    
    total = attendances.count()
    present_count = attendances.filter(status='Present').count()
    absent_count = attendances.filter(status='Absent').count()
    
    # Find verified ODs
    verified_ods = Leave.objects.filter(student=student, leave_type='OD', final_status='Approved', certificate_verified=True).values_list('date', flat=True)
    
    od_count_raw = attendances.filter(status='OD').count()
    verified_od_count = attendances.filter(status='OD', date__in=verified_ods).count()
    
    effective_present = present_count + verified_od_count
    percentage = (effective_present / total * 100) if total > 0 else 0
    
    return Response({
        'username': student.user.username,
        'name': f"{student.user.first_name} {student.user.last_name}".strip(),
        'class_name': str(student.student_class),
        'total': total,
        'present': present_count,
        'absent': absent_count,
        'od': od_count_raw,
        'verified_od': verified_od_count,
        'percentage': round(percentage, 2)
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_attendance_report_data(request):
    # Returns raw report data in JSON format for the front-end to render/download
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')
    report_type = request.query_params.get('report_type', 'department')
    
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
            records = records.filter(student__user__username=student_id)

    if from_date:
        records = records.filter(date__gte=from_date)
    if to_date:
        records = records.filter(date__lte=to_date)

    if request.user.role == 'staff':
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        subject_id = request.query_params.get('subject_id')
        
        is_related = False
        if report_type == 'class' and class_id:
            try:
                student_class = Class.objects.get(id=class_id)
                is_related = (student_class.advisor == request.user)
            except Class.DoesNotExist:
                pass
        elif report_type == 'student' and student_id:
            try:
                student = Student.objects.get(user__username=student_id)
                is_related = (student.tutor == request.user or student.advisor == request.user)
            except Student.DoesNotExist:
                pass
        elif report_type == 'tutored':
            is_related = True

        if not is_related:
            if not subject_id:
                return Response({'detail': 'Subject is required for this report as you are not the tutor or advisor.'}, status=status.HTTP_400_BAD_REQUEST)
            records = records.filter(schedule__subject_id=subject_id)
        else:
            if subject_id:
                records = records.filter(schedule__subject_id=subject_id)
    else:
        subject_id = request.query_params.get('subject_id')
        if subject_id:
            records = records.filter(schedule__subject_id=subject_id)

    records = records.select_related('student__user', 'student__student_class', 'schedule__subject')
    
    result = []
    for r in records:
        result.append({
            'student_username': r.student.user.username,
            'student_name': f"{r.student.user.first_name} {r.student.user.last_name}".strip(),
            'class_name': str(r.student.student_class),
            'date': r.date.strftime('%Y-%m-%d'),
            'status': r.status,
            'subject_name': r.schedule.subject.name if r.schedule else '',
            'period': r.schedule.period if r.schedule else ''
        })
        
    return Response(result)

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

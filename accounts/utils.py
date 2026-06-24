from django.utils import timezone
from datetime import timedelta
from attendance.models import OTP

def has_active_otp(user):
    if user.is_authenticated and user.role == 'student':
        try:
            student = user.student
            if student.student_class:
                now = timezone.now()
                three_minutes_ago = now - timedelta(minutes=3)
                # Check if there is an active OTP for the student's class
                # created in the last 3 minutes
                return OTP.objects.filter(
                    schedule__student_class=student.student_class,
                    is_active=True,
                    created_at__gte=three_minutes_ago
                ).exists()
        except Exception:
            pass
    return False

def get_live_class_attendance_matrix(student_class):
    from django.utils import timezone
    from timetable.models import Schedule
    from accounts.models import Student
    from attendance.models import Attendance

    today = timezone.localtime(timezone.now()).date()
    day_name = today.strftime('%A')
    
    # 1. Get all schedules for today for this class, ordered by period
    schedules = Schedule.objects.filter(student_class=student_class, day=day_name).order_by('period')
    
    # 2. Get all students of this class
    students = Student.objects.filter(student_class=student_class).select_related('user').order_by('roll_no', 'user__username')
    
    # 3. Get all attendance records for today for these students and schedules
    attendances = Attendance.objects.filter(
        student__in=students,
        schedule__in=schedules,
        date=today
    ).select_related('student', 'schedule__subject')
    
    # Create a lookup
    att_lookup = { (att.student_id, att.schedule_id): att.status for att in attendances }
    
    # Build rows
    student_rows = []
    for student in students:
        row = {
            'username': student.user.username,
            'reg_no': student.reg_no or student.roll_no or student.user.username,
            'name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
            'statuses': [],
            'present_count': 0,
            'absent_count': 0,
            'od_count': 0,
            'leave_count': 0,
        }
        for sched in schedules:
            status = att_lookup.get((student.user_id, sched.id), '-')
            row['statuses'].append({
                'schedule_id': sched.id,
                'status': status
            })
            if status == 'Present':
                row['present_count'] += 1
            elif status == 'Absent':
                row['absent_count'] += 1
            elif status == 'OD':
                row['od_count'] += 1
            elif status == 'Leave':
                row['leave_count'] += 1
        student_rows.append(row)
        
    # Column-wise counts (for each schedule)
    columns_summary = []
    for sched in schedules:
        col_present = 0
        col_absent = 0
        col_od = 0
        col_leave = 0
        for student in students:
            status = att_lookup.get((student.user_id, sched.id), '-')
            if status == 'Present':
                col_present += 1
            elif status == 'Absent':
                col_absent += 1
            elif status == 'OD':
                col_od += 1
            elif status == 'Leave':
                col_leave += 1
        columns_summary.append({
            'schedule_id': sched.id,
            'subject_name': sched.subject.name,
            'period': sched.period,
            'present': col_present,
            'absent': col_absent,
            'od': col_od,
            'leave': col_leave
        })

    return {
        'schedules': schedules,
        'student_rows': student_rows,
        'columns_summary': columns_summary,
        'date': today
    }

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from leave.models import Leave
from django.db.models import Q
from accounts.models import Department, Class, Subject, Student, User, Staff
from functools import wraps

@login_required
def dashboard(request):
    # Check if this user created an active OTP session in the last 3 minutes
    from attendance.models import OTP
    from django.utils import timezone
    from datetime import timedelta
    now = timezone.now()
    three_minutes_ago = now - timedelta(minutes=3)
    
    active_otp = OTP.objects.filter(
        creator=request.user,
        is_active=True,
        created_at__gte=three_minutes_ago
    ).order_by('-created_at').first()
    
    if active_otp:
        request.session['active_otp_id'] = active_otp.id
        return redirect('active_otp_session', otp_id=active_otp.id)

    # Fallback to session active_otp_id check
    active_otp_id = request.session.get('active_otp_id')
    if active_otp_id:
        otp_qs = OTP.objects.filter(id=active_otp_id, is_active=True)
        if otp_qs.exists():
            otp = otp_qs.first()
            if timezone.now() <= otp.created_at + timedelta(minutes=3):
                return redirect('active_otp_session', otp_id=otp.id)
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
        pending_tutor_leaves = Leave.objects.filter(
            student__tutor=request.user,
            tutor_approved='Pending',
            leave_type='Leave'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_advisor_leaves = Leave.objects.none()
        
        pending_tutor_ods = Leave.objects.filter(
            student__tutor=request.user,
            tutor_approved='Pending',
            leave_type='OD'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_advisor_ods = Leave.objects.none()
        
        pending_verification_ods = Leave.objects.filter(
            student__tutor=request.user,
            leave_type='OD',
            hod_approved='Approved',
            certificate_verified=False
        ).exclude(proof='').exclude(proof=None).select_related('student__user')
        
        processed_leaves_today = Leave.objects.filter(
            student__tutor=request.user,
            leave_type='Leave'
        ).exclude(tutor_approved='Pending').select_related('student__user').distinct().order_by('-updated_at')
        
        processed_ods_today = Leave.objects.filter(
            student__tutor=request.user,
            leave_type='OD'
        ).filter(
            Q(hod_approved='Approved') | ~Q(tutor_approved='Pending')
        ).select_related('student__user').distinct().order_by('-updated_at')
        
    elif staff_type == 'Advisor':
        pending_tutor_leaves = Leave.objects.filter(
            student__tutor=request.user,
            tutor_approved='Pending',
            leave_type='Leave'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_advisor_leaves = Leave.objects.filter(
            student__advisor=request.user,
            tutor_approved='Approved',
            advisor_approved='Pending',
            leave_type='Leave'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_tutor_ods = Leave.objects.filter(
            student__tutor=request.user,
            tutor_approved='Pending',
            leave_type='OD'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_advisor_ods = Leave.objects.filter(
            student__advisor=request.user,
            tutor_approved='Approved',
            advisor_approved='Pending',
            leave_type='OD'
        ).exclude(final_status='Rejected').select_related('student__user')
        
        pending_verification_ods = Leave.objects.filter(
            student__tutor=request.user,
            leave_type='OD',
            hod_approved='Approved',
            certificate_verified=False
        ).exclude(proof='').exclude(proof=None).select_related('student__user')
        
        processed_leaves_today = Leave.objects.filter(
            leave_type='Leave'
        ).filter(
            Q(student__advisor=request.user) | Q(student__tutor=request.user)
        ).exclude(
            Q(student__tutor=request.user, tutor_approved='Pending') |
            Q(student__advisor=request.user, tutor_approved='Approved', advisor_approved='Pending')
        ).select_related('student__user').distinct().order_by('-updated_at')

        processed_ods_today = Leave.objects.filter(
            leave_type='OD'
        ).filter(
            Q(student__advisor=request.user) | Q(student__tutor=request.user)
        ).exclude(
            Q(student__tutor=request.user, tutor_approved='Pending') |
            Q(student__advisor=request.user, tutor_approved='Approved', advisor_approved='Pending')
        ).select_related('student__user').distinct().order_by('-updated_at')
        
    else:
        pending_tutor_leaves = Leave.objects.none()
        pending_advisor_leaves = Leave.objects.none()
        pending_tutor_ods = Leave.objects.none()
        pending_advisor_ods = Leave.objects.none()
        pending_verification_ods = Leave.objects.none()
        processed_leaves_today = Leave.objects.none()
        processed_ods_today = Leave.objects.none()
        
    context = {
        'pending_tutor_leaves': pending_tutor_leaves,
        'pending_advisor_leaves': pending_advisor_leaves,
        'pending_tutor_ods': pending_tutor_ods,
        'pending_advisor_ods': pending_advisor_ods,
        'pending_verification_ods': pending_verification_ods,
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
        ).select_related('student__user', 'student__student_class', 'student__student_class__department', 'schedule__subject')
        
        response = HttpResponse(content_type='text/csv')
        c_name = records.first().student.student_class.name if records.exists() else "Class"
        s_code = records.first().schedule.subject.code if records.exists() else "Subject"
        response['Content-Disposition'] = f'attachment; filename="Subject_Attendance_{c_name}_{s_code}_Period_{period}_{date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Time', 'Subject', 'Status'])
        total_c = 0
        present_c = 0
        absent_c = 0
        od_c = 0
        for r in records:
            reg_no = r.student.reg_no or r.student.roll_no or r.student.user.username
            full_name = f"{r.student.user.first_name} {r.student.user.last_name}".strip() or r.student.user.username
            time_str = r.schedule.start_time.strftime('%H:%M') if r.schedule.start_time else ''
            subject_str = r.schedule.subject.name
            dept = r.student.student_class.department.name if r.student.student_class and r.student.student_class.department else ''
            yr = r.student.student_class.year if r.student.student_class else ''
            cls = r.student.student_class.name if r.student.student_class else ''
            sec = r.student.student_class.section if r.student.student_class else ''
            
            writer.writerow([reg_no, full_name, dept, yr, cls, sec, r.date.strftime('%Y-%m-%d'), time_str, subject_str, r.status])
            total_c += 1
            if r.status == 'Present':
                present_c += 1
            elif r.status == 'Absent':
                absent_c += 1
            elif r.status == 'OD':
                od_c += 1
                
        writer.writerow([])
        writer.writerow(['Summary'])
        writer.writerow(['Total Students', total_c])
        writer.writerow(['Present', present_c])
        writer.writerow(['Absent', absent_c])
        writer.writerow(['OD', od_c])
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
        ).select_related('student__user', 'student__student_class', 'student__student_class__department', 'schedule')
        
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        c = Class.objects.get(id=class_id)
        response['Content-Disposition'] = f'attachment; filename="Advisor_Daily_Report_{c.name}_{date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6', 'Period 7', 'Period 8'])
        
        student_data = {}
        for r in records:
            username = r.student.user.username
            if username not in student_data:
                student_data[username] = {
                    'name': f"{r.student.user.first_name} {r.student.user.last_name}".strip(),
                    'department': r.student.student_class.department.name if r.student.student_class and r.student.student_class.department else '',
                    'year': r.student.student_class.year if r.student.student_class else '',
                    'class_name': r.student.student_class.name if r.student.student_class else '',
                    'section': r.student.student_class.section if r.student.student_class else '',
                    'periods': {str(p): '-' for p in range(1, 9)}
                }
            student_data[username]['periods'][str(r.schedule.period)] = r.status
            
        for username, data in student_data.items():
            writer.writerow([
                username, 
                data['name'], 
                data['department'],
                data['year'],
                data['class_name'],
                data['section'],
                data['periods']['1'], data['periods']['2'], data['periods']['3'], 
                data['periods']['4'], data['periods']['5'], data['periods']['6'], 
                data['periods']['7'], data['periods']['8']
            ])
            
        total_st = len(student_data)
        period_present = {str(p): 0 for p in range(1, 9)}
        period_absent = {str(p): 0 for p in range(1, 9)}
        period_od = {str(p): 0 for p in range(1, 9)}
        
        for username, data in student_data.items():
            for p in range(1, 9):
                status = data['periods'][str(p)]
                if status == 'Present':
                    period_present[str(p)] += 1
                elif status == 'Absent':
                    period_absent[str(p)] += 1
                elif status == 'OD':
                    period_od[str(p)] += 1
                    
        writer.writerow([])
        writer.writerow(['Summary'])
        writer.writerow(['Total Students', total_st])
        
        p_row = ['Present', '', '', '', '', '']
        a_row = ['Absent', '', '', '', '', '']
        o_row = ['OD', '', '', '', '', '']
        
        for p in range(1, 9):
            p_row.append(period_present[str(p)])
            a_row.append(period_absent[str(p)])
            o_row.append(period_od[str(p)])
            
        writer.writerow(p_row)
        writer.writerow(a_row)
        writer.writerow(o_row)
            
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
        
        dob = request.POST.get('dob')
        if dob:
            user.dob = dob
        else:
            user.dob = None
            
        profile_photo_file = request.FILES.get('profile_photo')
        if profile_photo_file:
            import base64
            encoded_string = base64.b64encode(profile_photo_file.read()).decode('utf-8')
            mime_type = profile_photo_file.content_type
            user.profile_photo = f"data:{mime_type};base64,{encoded_string}"
            
        user.save()
        messages.success(request, 'Profile updated successfully.')
        return redirect('staff_profile')
        
    return render(request, 'staff/profile.html', {'profile_user': user})

@login_required
def edit_timetable(request):
    messages.error(request, 'Timetable management has been removed.')
    return redirect('staff_dashboard')

@login_required
def advisor_live_attendance(request):
    from accounts.models import Class
    from accounts.utils import get_live_class_attendance_matrix
    
    # Get the class advised by this staff
    advised_class = Class.objects.filter(advisor=request.user).first()
    
    context = {
        'advised_class': advised_class,
    }
    
    if advised_class:
        matrix = get_live_class_attendance_matrix(advised_class)
        context.update(matrix)
        
    return render(request, 'staff/advisor_live_attendance.html', context)


def advisor_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not hasattr(request.user, 'staff') or request.user.staff.staff_type != 'Advisor':
            messages.error(request, 'Only Advisors can access student management features.')
            return redirect('staff_dashboard')
        return view_func(request, *args, **kwargs)
    return _wrapped_view

@login_required
@advisor_required
def add_student(request):
    department = request.user.department
    classes = Class.objects.filter(department=department)
    dept_staff = User.objects.filter(role='staff', department=department)
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        phone_number = request.POST.get('phone_number')
        dob = request.POST.get('dob')
        profile_photo_file = request.FILES.get('profile_photo')
        profile_photo_b64 = None
        if profile_photo_file:
            import base64
            encoded_string = base64.b64encode(profile_photo_file.read()).decode('utf-8')
            mime_type = profile_photo_file.content_type
            profile_photo_b64 = f"data:{mime_type};base64,{encoded_string}"

        roll_no = request.POST.get('roll_no')
        reg_no = request.POST.get('reg_no')
        class_id = request.POST.get('class_id')
        tutor_id = request.POST.get('tutor_id')
        advisor_id = request.POST.get('advisor_id')
        password = request.POST.get('password', 'password123')
        
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists!')
            return redirect('staff_add_student')
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=username,
            role='student',
            department=department,
            phone_number=phone_number,
            dob=dob if dob else None,
            profile_photo=profile_photo_b64
        )
        selected_class = Class.objects.get(id=class_id)
        
        Student.objects.create(
            user=user,
            student_class=selected_class,
            roll_no=roll_no,
            reg_no=reg_no,
            tutor_id=tutor_id if tutor_id else None,
            advisor_id=advisor_id if advisor_id else None
        )
        messages.success(request, 'Student added successfully.')
        return redirect('staff_students')
        
    return render(request, 'staff/student_form.html', {'classes': classes, 'dept_staff': dept_staff})

@login_required
@advisor_required
def edit_student(request, user_id):
    student = get_object_or_404(Student, user__id=user_id, user__department=request.user.department)
    classes = Class.objects.filter(department=request.user.department)
    dept_staff = User.objects.filter(role='staff', department=request.user.department)
    
    if request.method == 'POST':
        student.user.username = request.POST.get('username')
        student.user.email = request.POST.get('email')
        student.user.phone_number = request.POST.get('phone_number')
        dob = request.POST.get('dob')
        if dob:
            student.user.dob = dob
        else:
            student.user.dob = None

        profile_photo_file = request.FILES.get('profile_photo')
        if profile_photo_file:
            import base64
            encoded_string = base64.b64encode(profile_photo_file.read()).decode('utf-8')
            mime_type = profile_photo_file.content_type
            student.user.profile_photo = f"data:{mime_type};base64,{encoded_string}"

        new_password = request.POST.get('password', '')
        if new_password:
            student.user.set_password(new_password)
        student.user.save()
        
        class_id = request.POST.get('class_id')
        student.student_class = Class.objects.get(id=class_id)
        student.roll_no = request.POST.get('roll_no')
        student.reg_no = request.POST.get('reg_no')
        
        tutor_id = request.POST.get('tutor_id')
        advisor_id = request.POST.get('advisor_id')
        student.tutor_id = tutor_id if tutor_id else None
        student.advisor_id = advisor_id if advisor_id else None
        
        student.save()
        
        messages.success(request, 'Student updated successfully.')
        return redirect('staff_students')
        
    return render(request, 'staff/student_form.html', {'student': student, 'classes': classes, 'dept_staff': dept_staff})

@login_required
@advisor_required
def delete_student(request, user_id):
    student = get_object_or_404(Student, user__id=user_id, user__department=request.user.department)
    if request.method == 'POST':
        student.user.delete()
        messages.success(request, 'Student deleted successfully.')
    return redirect('staff_students')

@login_required
@advisor_required
def delete_all_students(request):
    if request.method == 'POST':
        department = request.user.department
        advised_class = Class.objects.filter(advisor=request.user).first()
        if advised_class:
            students_qs = Student.objects.filter(student_class=advised_class)
        else:
            students_qs = Student.objects.filter(user__department=department)
            
        student_user_ids = list(students_qs.values_list('user_id', flat=True))
        deleted_count = User.objects.filter(id__in=student_user_ids, role='student').delete()[0]
        messages.success(request, f'Successfully deleted all {deleted_count} students.')
    return redirect('staff_students')

@login_required
@advisor_required
def bulk_add_students(request):
    if request.method == 'POST':
        file_obj = request.FILES.get('csv_file')
        if not file_obj:
            messages.error(request, 'No file selected!')
            return redirect('staff_bulk_add_students')
            
        import csv
        import io
        from django.db import transaction
        
        try:
            decoded_file = file_obj.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            messages.error(request, f'Error reading CSV file: {str(e)}')
            return redirect('staff_bulk_add_students')
            
        if not reader.fieldnames:
            messages.error(request, 'CSV file is empty or invalid.')
            return redirect('staff_bulk_add_students')

        def normalize_header(h):
            return h.lower().replace(' ', '').replace('_', '').replace('-', '')
            
        headers = {normalize_header(h): h for h in reader.fieldnames}
        required_normalized = ['username', 'password', 'class', 'year']
        missing = [req for req in required_normalized if req not in headers]
        if missing:
            messages.error(request, f'Missing required CSV columns: {", ".join(missing)}')
            return redirect('staff_bulk_add_students')
            
        def find_class(class_str, year_val, dept):
            class_str_clean = class_str.strip().lower()
            classes = Class.objects.filter(department=dept, year=year_val)
            for c in classes:
                if class_str_clean == str(c).lower():
                    return c
            for c in classes:
                if c.name.lower() in class_str_clean and c.section.lower() in class_str_clean:
                    return c
            for c in classes:
                if c.name.lower() == class_str_clean:
                    return c
            for c in classes:
                if class_str_clean in c.name.lower() or c.name.lower() in class_str_clean:
                    return c
            return classes.first()
            
        created_count = 0
        errors = []
        classes_to_update = set()
        
        try:
            def parse_date(date_str):
                if not date_str:
                    return None
                date_str = str(date_str).strip()
                import datetime
                for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d'):
                    try:
                        return datetime.datetime.strptime(date_str, fmt).date()
                    except ValueError:
                        continue
                return None

            with transaction.atomic():
                for row_idx, row in enumerate(reader, start=1):
                    def get_val(norm_name, default=''):
                        orig_name = headers.get(norm_name)
                        return row.get(orig_name, default) if orig_name else default
                        
                    username = get_val('username').strip()
                    email = get_val('collagemail').strip() or get_val('email').strip() or get_val('mail').strip()
                    reg_no = get_val('registerno').strip() or get_val('reg_no').strip() or get_val('regno').strip()
                    roll_no = get_val('rollno').strip() or get_val('roll_no').strip()
                    dob_val = get_val('dob').strip() or get_val('dateofbirth').strip() or get_val('date_of_birth').strip()
                    profile_photo_val = get_val('profilephoto').strip() or get_val('profile_photo').strip() or get_val('photo').strip() or get_val('image').strip()
                    mobile_no = get_val('mobileno').strip() or get_val('mobile_no').strip() or get_val('phone_number').strip() or get_val('phone').strip()
                    class_name = get_val('class').strip()
                    year_val = get_val('year').strip()
                    tutor_val = get_val('tutor').strip()
                    advisor_val = get_val('advisor').strip()
                    password = get_val('password').strip() or 'password123'
                    
                    if not username:
                        errors.append(f"Row {row_idx}: Username is empty.")
                        continue
                    if User.objects.filter(username=username).exists():
                        errors.append(f"Row {row_idx}: User with username '{username}' already exists.")
                        continue
                    if reg_no and Student.objects.filter(reg_no=reg_no).exists():
                        errors.append(f"Row {row_idx}: Student with registration number '{reg_no}' already exists.")
                        continue
                    if not year_val.isdigit():
                        errors.append(f"Row {row_idx}: Year must be a number.")
                        continue
                        
                    selected_class = find_class(class_name, int(year_val), request.user.department)
                    if not selected_class:
                        errors.append(f"Row {row_idx}: Class '{class_name}' for year '{year_val}' not found in your department.")
                        continue
                        
                    classes_to_update.add(selected_class)
                    
                    tutor_user = None
                    if tutor_val:
                        tutor_user = User.objects.filter(username=tutor_val, role__in=['staff', 'hod']).first()
                    advisor_user = None
                    if advisor_val:
                        advisor_user = User.objects.filter(username=advisor_val, role__in=['staff', 'hod']).first()
                        
                    try:
                        dob_parsed = parse_date(dob_val)
                        user = User.objects.create_user(
                            username=username,
                            email=email,
                            password=password,
                            role='student',
                            department=request.user.department,
                            phone_number=mobile_no,
                            dob=dob_parsed,
                            profile_photo=profile_photo_val if profile_photo_val else None
                        )
                        student = Student(
                            user=user,
                            student_class=selected_class,
                            roll_no=roll_no,
                            reg_no=reg_no,
                            tutor=tutor_user,
                            advisor=advisor_user
                        )
                        student.save(skip_auto_assign=True)
                        created_count += 1
                    except Exception as e:
                        errors.append(f"Row {row_idx}: Failed to create student: {str(e)}")
                        
                if not errors:
                    for cls in classes_to_update:
                        cls.auto_assign_tutors(force=True)
                        
                if errors:
                    transaction.set_rollback(True)
                    for err in errors[:10]:
                        messages.error(request, err)
                    if len(errors) > 10:
                        messages.error(request, f"And {len(errors) - 10} more errors...")
                    return redirect('staff_bulk_add_students')
                    
        except Exception as e:
            messages.error(request, f'Database error: {str(e)}')
            return redirect('staff_bulk_add_students')
            
        messages.success(request, f'Successfully imported {created_count} students.')
        return redirect('staff_students')
        
    return render(request, 'staff/bulk_add_students.html')


@login_required
def manual_attendance(request):
    if not hasattr(request.user, 'staff'):
        messages.error(request, "Only staff members can mark manual attendance.")
        return redirect('login')
        
    from attendance.models import Attendance
    from timetable.models import Schedule
    from django.utils import timezone
    import datetime
    
    department = request.user.department
    students = Student.objects.filter(user__department=department).select_related('user', 'student_class').order_by('reg_no', 'user__username')
    
    selected_student_id = request.GET.get('student_id')
    selected_date_str = request.GET.get('date')
    
    # Default date to today
    if not selected_date_str:
        selected_date_str = timezone.localdate().strftime('%Y-%m-%d')
        
    selected_student = None
    schedules_data = []
    error_message = None
    
    if selected_student_id:
        try:
            selected_student = Student.objects.get(pk=selected_student_id, user__department=department)
            selected_date = datetime.datetime.strptime(selected_date_str, '%Y-%m-%d').date()
            weekday = selected_date.strftime('%A')
            
            if selected_student.student_class:
                schedules = Schedule.objects.filter(
                    student_class=selected_student.student_class,
                    day=weekday
                ).order_by('period')
                
                for sched in schedules:
                    att = Attendance.objects.filter(
                        student=selected_student,
                        schedule=sched,
                        date=selected_date
                    ).first()
                    
                    schedules_data.append({
                        'schedule': sched,
                        'status': att.status if att else 'Absent'
                    })
            else:
                error_message = "Selected student has no assigned class."
        except Student.DoesNotExist:
            error_message = "Student not found in your department."
        except ValueError:
            error_message = "Invalid date format."
            
    if request.method == 'POST':
        student_id = request.POST.get('student_id')
        date_str = request.POST.get('date')
        
        try:
            student = Student.objects.get(pk=student_id, user__department=department)
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            weekday = target_date.strftime('%A')
            
            if student.student_class:
                schedules = Schedule.objects.filter(student_class=student.student_class, day=weekday)
                skipped_periods = []
                for sched in schedules:
                    status_name = f"status_{sched.id}"
                    status_val = request.POST.get(status_name)
                    if status_val in ['Present', 'Absent', 'OD', 'Leave']:
                        from attendance.models import PeriodLock
                        lock = PeriodLock.objects.filter(student_class=student.student_class, date=target_date, period=sched.period).first()
                        if lock and lock.staff != request.user:
                            skipped_periods.append(sched.period)
                            continue

                        # Acquire lock
                        PeriodLock.objects.get_or_create(
                            student_class=student.student_class,
                            date=target_date,
                            period=sched.period,
                            defaults={'staff': request.user}
                        )

                        Attendance.objects.update_or_create(
                            student=student,
                            schedule=sched,
                            date=target_date,
                            defaults={'status': status_val}
                        )
                if skipped_periods:
                    skipped_str = ", ".join(map(str, skipped_periods))
                    messages.warning(request, f"Attendance updated, but skipped locked periods: {skipped_str}.")
                else:
                    messages.success(request, f"Attendance for {student.user.first_name} on {date_str} updated successfully.")
            else:
                messages.error(request, "Student has no assigned class.")
            return redirect(f"{request.path}?student_id={student_id}&date={date_str}")
        except Exception as e:
            messages.error(request, f"Failed to save attendance: {str(e)}")
            
    context = {
        'students': students,
        'selected_student_id': int(selected_student_id) if selected_student_id and selected_student_id.isdigit() else None,
        'selected_date_str': selected_date_str,
        'selected_student': selected_student,
        'schedules_data': schedules_data,
        'error_message': error_message
    }
    return render(request, 'staff/manual_attendance.html', context)

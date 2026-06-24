import datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from accounts.models import Student, Staff, User, Class
from attendance.models import Attendance
from leave.models import Leave
from django.utils import timezone

@login_required
def dashboard(request):
    # Check if this user created an active OTP session in the last 3 minutes
    from attendance.models import OTP
    from django.utils import timezone
    from datetime import timedelta
    three_minutes_ago = timezone.now() - timedelta(minutes=3)
    
    active_otp = OTP.objects.filter(
        creator=request.user,
        is_active=True,
        created_at__gte=three_minutes_ago
    ).order_by('-created_at').first()
    
    if active_otp:
        request.session['active_otp_id'] = active_otp.id
        return redirect('active_otp_session', otp_id=active_otp.id)

    department = request.user.department
    
    # Base querysets filtered by department
    students = Student.objects.filter(user__department=department)
    total_students = students.count()
    total_staff = Staff.objects.filter(user__department=department).count()
    
    today = datetime.date.today()
    present_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='Present'
    ).count()
    
    absent_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='Absent'
    ).count()
    
    od_students_today = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='OD'
    ).count()
    
    # Using hod_approved='Pending' as final approvals for HOD
    pending_leave_approvals = Leave.objects.filter(
        student__in=students, 
        leave_type='Leave', 
        hod_approved='Pending'
    ).count()
    
    pending_od_approvals = Leave.objects.filter(
        student__in=students, 
        leave_type='OD', 
        hod_approved='Pending'
    ).count()
    
    # Year-wise stats based on 1st Period Attendance
    year_stats = []
    for y in [1, 2, 3, 4]:
        classes_in_year = Class.objects.filter(department=department, year=y)
        students_in_year = Student.objects.filter(student_class__in=classes_in_year)
        
        y_present = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='Present').count()
        y_absent = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='Absent').count()
        y_od = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='OD').count()
        
        classes_data = []
        for cls in classes_in_year:
            cls_students = Student.objects.filter(student_class=cls)
            c_present = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Present').count()
            c_absent = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Absent').count()
            c_od = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='OD').count()
            classes_data.append({
                'class_id': cls.id,
                'class_name': str(cls),
                'present': c_present,
                'absent': c_absent,
                'od': c_od
            })
            
        year_stats.append({
            'year': y,
            'present': y_present,
            'absent': y_absent,
            'od': y_od,
            'classes': classes_data
        })
        
    context = {
        'total_students': total_students,
        'total_staff': total_staff,
        'present_students': present_students,
        'absent_students': absent_students,
        'od_students_today': od_students_today,
        'pending_leave_approvals': pending_leave_approvals,
        'pending_od_approvals': pending_od_approvals,
        'year_stats': year_stats,
    }
    
    return render(request, 'hod/dashboard.html', context)

@login_required
def students_list(request):
    department = request.user.department
    students = Student.objects.filter(user__department=department).select_related('user', 'student_class')
    context = {
        'students': students
    }
    return render(request, 'hod/students_list.html', context)

@login_required
def staff_list(request):
    department = request.user.department
    staffs = Staff.objects.filter(user__department=department).select_related('user')
    context = {
        'staffs': staffs
    }
    return render(request, 'hod/staff_list.html', context)

@login_required
def approvals_list(request):
    department = request.user.department
    students = Student.objects.filter(user__department=department)
    
    pending_leaves = Leave.objects.filter(
        student__in=students, 
        leave_type='Leave', 
        advisor_approved='Approved',
        hod_approved='Pending'
    ).select_related('student__user')
    
    pending_ods = Leave.objects.filter(
        student__in=students, 
        leave_type='OD', 
        advisor_approved='Approved',
        hod_approved='Pending'
    ).select_related('student__user')
    
    today = timezone.now().date()
    
    processed_leaves_today = Leave.objects.filter(
        student__in=students, 
        leave_type='Leave'
    ).exclude(hod_approved='Pending').select_related('student__user').order_by('-updated_at')
    
    processed_ods_today = Leave.objects.filter(
        student__in=students, 
        leave_type='OD'
    ).exclude(hod_approved='Pending').select_related('student__user').order_by('-updated_at')
    
    context = {
        'pending_leaves': pending_leaves,
        'pending_ods': pending_ods,
        'processed_leaves_today': processed_leaves_today,
        'processed_ods_today': processed_ods_today,
    }
    return render(request, 'hod/approvals.html', context)

@login_required
def class_students_list(request, class_id):
    if request.user.role != 'hod':
        messages.error(request, "Unauthorized")
        return redirect('login')
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    students = Student.objects.filter(student_class=class_obj).select_related('user', 'tutor', 'advisor')
    
    from timetable.models import Schedule
    from accounts.models import Subject
    
    class_subject_ids = Schedule.objects.filter(student_class=class_obj).values_list('subject_id', flat=True).distinct()
    class_subjects = Subject.objects.filter(id__in=class_subject_ids)
    
    for student in students:
        attendances = Attendance.objects.filter(student=student, schedule__subject__in=class_subjects)
        total_periods = attendances.count()
        if total_periods > 0:
            present_periods = attendances.filter(status='Present').count()
            verified_ods = Leave.objects.filter(
                student=student, 
                leave_type='OD', 
                final_status='Approved', 
                certificate_verified=True
            ).values_list('date', flat=True)
            verified_od_count = attendances.filter(status='OD', date__in=verified_ods).count()
            effective_present = present_periods + verified_od_count
            student.attendance_percentage = round((effective_present / total_periods * 100), 2)
        else:
            student.attendance_percentage = 100.0

    context = {
        'class_obj': class_obj,
        'students': students
    }
    return render(request, 'hod/class_students_list.html', context)

@login_required
def hod_add_student_to_class(request, class_id):
    if request.user.role != 'hod':
        messages.error(request, "Unauthorized")
        return redirect('login')
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    classes = Class.objects.filter(department=request.user.department)
    dept_staff = User.objects.filter(role='staff', department=request.user.department)
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        phone_number = request.POST.get('phone_number')
        age = request.POST.get('age')
        roll_no = request.POST.get('roll_no')
        reg_no = request.POST.get('reg_no')
        tutor_id = request.POST.get('tutor_id')
        advisor_id = request.POST.get('advisor_id')
        password = request.POST.get('password', 'password123')
        
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists!')
            return redirect('hod_add_student_to_class', class_id=class_id)
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=username,
            role='student',
            department=request.user.department,
            phone_number=phone_number,
            age=int(age) if age and age.isdigit() else None
        )
        
        Student.objects.create(
            user=user,
            student_class=class_obj,
            roll_no=roll_no,
            reg_no=reg_no,
            tutor_id=tutor_id if tutor_id else None,
            advisor_id=advisor_id if advisor_id else None
        )
        messages.success(request, 'Student added successfully.')
        return redirect('hod_class_students', class_id=class_id)
        
    return render(request, 'hod/student_form.html', {'classes': classes, 'dept_staff': dept_staff, 'preselected_class': class_obj})

@login_required
def hod_edit_student_in_class(request, class_id, user_id):
    if request.user.role != 'hod':
        messages.error(request, "Unauthorized")
        return redirect('login')
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    student = get_object_or_404(Student, user__id=user_id, student_class=class_obj, user__department=request.user.department)
    classes = Class.objects.filter(department=request.user.department)
    dept_staff = User.objects.filter(role='staff', department=request.user.department)
    
    if request.method == 'POST':
        student.user.username = request.POST.get('username')
        student.user.email = request.POST.get('email')
        student.user.phone_number = request.POST.get('phone_number')
        age = request.POST.get('age')
        student.user.age = int(age) if age and age.isdigit() else None
        
        new_password = request.POST.get('password', '')
        if new_password:
            student.user.set_password(new_password)
        student.user.save()
        
        new_class_id = request.POST.get('class_id')
        student.student_class = Class.objects.get(id=new_class_id)
        student.roll_no = request.POST.get('roll_no')
        student.reg_no = request.POST.get('reg_no')
        
        tutor_id = request.POST.get('tutor_id')
        advisor_id = request.POST.get('advisor_id')
        student.tutor_id = tutor_id if tutor_id else None
        student.advisor_id = advisor_id if advisor_id else None
        
        student.save()
        
        messages.success(request, 'Student updated successfully.')
        return redirect('hod_class_students', class_id=class_id)
        
    return render(request, 'hod/student_form.html', {'student': student, 'classes': classes, 'dept_staff': dept_staff, 'preselected_class': class_obj})

@login_required
def hod_delete_student_in_class(request, class_id, user_id):
    if request.user.role != 'hod':
        messages.error(request, "Unauthorized")
        return redirect('login')
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    student = get_object_or_404(Student, user__id=user_id, student_class=class_obj, user__department=request.user.department)
    if request.method == 'POST':
        student.user.delete()
        messages.success(request, 'Student deleted successfully.')
    return redirect('hod_class_students', class_id=class_id)

@login_required
def add_staff(request):
    department = request.user.department
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name', '')
        last_name = request.POST.get('last_name', '')
        dob = request.POST.get('dob')
        phone_number = request.POST.get('phone_number')
        staff_id = request.POST.get('staff_id')
        designation = request.POST.get('designation')
        password = request.POST.get('password', 'password123')
        
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists!')
            return redirect('add_staff')
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='staff',
            department=department,
            phone_number=phone_number,
            dob=dob if dob else None
        )
        staff_type = request.POST.get('staff_type', 'Normal')
        Staff.objects.create(
            user=user,
            staff_type=staff_type,
            staff_id=staff_id,
            designation=designation
        )
        messages.success(request, 'Staff added successfully.')
        return redirect('hod_staff')
        
    return render(request, 'hod/staff_form.html')

@login_required
def edit_staff(request, user_id):
    staff = get_object_or_404(Staff, user__id=user_id, user__department=request.user.department)
    
    if request.method == 'POST':
        staff.user.username = request.POST.get('username')
        staff.user.email = request.POST.get('email')
        staff.user.first_name = request.POST.get('first_name', '')
        staff.user.last_name = request.POST.get('last_name', '')
        dob = request.POST.get('dob')
        staff.user.dob = dob if dob else None
        staff.user.phone_number = request.POST.get('phone_number')
        
        new_password = request.POST.get('password', '')
        if new_password:
            staff.user.set_password(new_password)
        staff.user.save()
        
        staff.staff_type = request.POST.get('staff_type', 'Normal')
        staff.staff_id = request.POST.get('staff_id')
        staff.designation = request.POST.get('designation')
        staff.save()
        
        messages.success(request, 'Staff updated successfully.')
        return redirect('hod_staff')
        
    return render(request, 'hod/staff_form.html', {'staff': staff})

@login_required
def delete_staff(request, user_id):
    staff = get_object_or_404(Staff, user__id=user_id, user__department=request.user.department)
    if request.method == 'POST':
        staff.user.delete()
        messages.success(request, 'Staff deleted successfully.')
    return redirect('hod_staff')

@login_required
def classes_list(request):
    department = request.user.department
    classes = Class.objects.filter(department=department).select_related('tutor1', 'tutor2', 'tutor3', 'advisor')
    return render(request, 'hod/classes_list.html', {'classes': classes})

@login_required
def add_class(request):
    department = request.user.department
    dept_staff = User.objects.filter(role='staff', department=department)
    
    if request.method == 'POST':
        name = request.POST.get('name')
        year = request.POST.get('year')
        section = request.POST.get('section')
        tutor1_id = request.POST.get('tutor1_id')
        tutor2_id = request.POST.get('tutor2_id')
        tutor3_id = request.POST.get('tutor3_id')
        
        tutor1 = User.objects.get(id=tutor1_id) if tutor1_id else None
        tutor2 = User.objects.get(id=tutor2_id) if tutor2_id else None
        tutor3 = User.objects.get(id=tutor3_id) if tutor3_id else None
        
        Class.objects.create(
            name=name,
            year=year,
            section=section,
            department=department,
            tutor1=tutor1,
            tutor2=tutor2,
            tutor3=tutor3
        )
        messages.success(request, 'Class created successfully.')
        return redirect('hod_classes')
        
    return render(request, 'hod/class_form.html', {'dept_staff': dept_staff})

@login_required
def edit_class(request, class_id):
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    dept_staff = User.objects.filter(role='staff', department=request.user.department)
    
    if request.method == 'POST':
        class_obj.name = request.POST.get('name')
        class_obj.year = request.POST.get('year')
        class_obj.section = request.POST.get('section')
        
        tutor1_id = request.POST.get('tutor1_id')
        tutor2_id = request.POST.get('tutor2_id')
        tutor3_id = request.POST.get('tutor3_id')
        
        class_obj.tutor1 = User.objects.get(id=tutor1_id) if tutor1_id else None
        class_obj.tutor2 = User.objects.get(id=tutor2_id) if tutor2_id else None
        class_obj.tutor3 = User.objects.get(id=tutor3_id) if tutor3_id else None
        class_obj.save()
        
        messages.success(request, 'Class updated successfully.')
        return redirect('hod_classes')
        
    return render(request, 'hod/class_form.html', {'class_obj': class_obj, 'dept_staff': dept_staff})

@login_required
def delete_class(request, class_id):
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    if request.method == 'POST':
        class_obj.delete()
        messages.success(request, 'Class deleted successfully.')
    return redirect('hod_classes')

@login_required
def present_students_list(request):
    department = request.user.department
    today = datetime.date.today()
    students = Student.objects.filter(user__department=department, attendance__date=today, attendance__status='Present').distinct().select_related('user', 'student_class')
    return render(request, 'hod/student_list_generic.html', {'students': students, 'page_title': "Today's Present"})

@login_required
def absent_students_list(request):
    department = request.user.department
    today = datetime.date.today()
    students = Student.objects.filter(user__department=department, attendance__date=today, attendance__status='Absent').distinct().select_related('user', 'student_class')
    return render(request, 'hod/student_list_generic.html', {'students': students, 'page_title': "Today's Absent"})

@login_required
def od_students_list(request):
    department = request.user.department
    today = datetime.date.today()
    students = Student.objects.filter(user__department=department, attendance__date=today, attendance__status='OD').distinct().select_related('user', 'student_class')
    return render(request, 'hod/student_list_generic.html', {'students': students, 'page_title': "Today's OD"})

@login_required
def hod_profile(request):
    user = request.user
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
        return redirect('hod_profile')
        
    return render(request, 'hod/profile.html', {'profile_user': user})

@login_required
def morning_attendance(request):
    if request.user.role != 'hod':
        return redirect('login')
        
    class_id = request.GET.get('class_id')
    if class_id:
        from accounts.models import Class
        from accounts.utils import get_live_class_attendance_matrix
        target_class = get_object_or_404(Class, id=class_id, department=request.user.department)
        matrix = get_live_class_attendance_matrix(target_class)
        
        action = request.GET.get('action')
        if action in ['download_1st', 'download_grid']:
            import csv
            from django.http import HttpResponse
            session_date = matrix['date']
            response = HttpResponse(content_type='text/csv')
            
            dept = target_class.department.name if target_class.department else ''
            year = target_class.year
            cls = target_class.name
            section = target_class.section

            if action == 'download_1st':
                response['Content-Disposition'] = f'attachment; filename="1st_Period_Attendance_{target_class.name.replace(" ", "_")}_{session_date}.csv"'
                writer = csv.writer(response)
                writer.writerow(['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section', 'Date', 'Status'])
                
                period1_sched = None
                for s in matrix['schedules']:
                    if s.period == 1:
                        period1_sched = s
                        break
                
                total = 0
                present = 0
                absent = 0
                od = 0
                        
                for row in matrix['student_rows']:
                    status_text = '-'
                    if period1_sched:
                        for st in row['statuses']:
                            if st['schedule_id'] == period1_sched.id:
                                status_text = st['status']
                                break
                        if status_text == '-':
                            status_text = 'Absent'
                    writer.writerow([row['reg_no'], row['name'], dept, year, cls, section, session_date.strftime('%Y-%m-%d'), status_text])
                    total += 1
                    if status_text == 'Present':
                        present += 1
                    elif status_text == 'Absent':
                        absent += 1
                    elif status_text == 'OD':
                        od += 1

                writer.writerow([])
                writer.writerow(['Summary'])
                writer.writerow(['Total Students', total])
                writer.writerow(['Present', present])
                writer.writerow(['Absent', absent])
                writer.writerow(['OD', od])
            else:
                response['Content-Disposition'] = f'attachment; filename="Live_Grid_{target_class.name.replace(" ", "_")}_{session_date}.csv"'
                writer = csv.writer(response)
                headers = ['Register Number', 'Name', 'Department', 'Year', 'Class', 'Section']
                for s in matrix['schedules']:
                    headers.append(f"Period {s.period} ({s.subject.name})")
                writer.writerow(headers)
                
                for row in matrix['student_rows']:
                    row_data = [row['reg_no'], row['name'], dept, year, cls, section]
                    for s in matrix['schedules']:
                        status_text = '-'
                        for st in row['statuses']:
                            if st['schedule_id'] == s.id:
                                status_text = st['status']
                                break
                        row_data.append(status_text)
                    writer.writerow(row_data)

                writer.writerow([])
                writer.writerow(['Summary'])
                writer.writerow(['Total Students', len(matrix['student_rows'])])
                
                present_row = ['Present', '', '', '', '', '']
                absent_row = ['Absent', '', '', '', '', '']
                od_row = ['OD', '', '', '', '', '']
                
                for s in matrix['schedules']:
                    col_sum = next((cs for cs in matrix['columns_summary'] if cs['schedule_id'] == s.id), None)
                    if col_sum:
                        present_row.append(col_sum['present'])
                        absent_row.append(col_sum['absent'])
                        od_row.append(col_sum['od'])
                    else:
                        present_row.append(0)
                        absent_row.append(0)
                        od_row.append(0)
                
                writer.writerow(present_row)
                writer.writerow(absent_row)
                writer.writerow(od_row)
            return response

        context = {
            'target_class': target_class,
            'is_grid': True,
        }
        context.update(matrix)
        return render(request, 'hod/morning_attendance.html', context)
        
    # Else, redirect to classes page since the separate monitor listing has been removed
    return redirect('hod_classes')

@login_required
def hod_bulk_add_students_to_class(request, class_id):
    if request.user.role != 'hod':
        messages.error(request, "Unauthorized")
        return redirect('login')
    class_obj = get_object_or_404(Class, id=class_id, department=request.user.department)
    
    if request.method == 'POST':
        file_obj = request.FILES.get('csv_file')
        if not file_obj:
            messages.error(request, 'No file selected!')
            return redirect('hod_bulk_add_students_to_class', class_id=class_id)
            
        import csv
        import io
        from django.db import transaction
        
        try:
            decoded_file = file_obj.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            messages.error(request, f'Error reading CSV file: {str(e)}')
            return redirect('hod_bulk_add_students_to_class', class_id=class_id)
            
        if not reader.fieldnames:
            messages.error(request, 'CSV file is empty or invalid.')
            return redirect('hod_bulk_add_students_to_class', class_id=class_id)

        def normalize_header(h):
            return h.lower().replace(' ', '').replace('_', '').replace('-', '')
            
        headers = {normalize_header(h): h for h in reader.fieldnames}
        required_normalized = ['username', 'password', 'class', 'year']
        missing = [req for req in required_normalized if req not in headers]
        if missing:
            messages.error(request, f'Missing required CSV columns: {", ".join(missing)}')
            return redirect('hod_bulk_add_students_to_class', class_id=class_id)
            
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
            with transaction.atomic():
                for row_idx, row in enumerate(reader, start=1):
                    def get_val(norm_name, default=''):
                        orig_name = headers.get(norm_name)
                        return row.get(orig_name, default) if orig_name else default
                        
                    username = get_val('username').strip()
                    email = get_val('collagemail').strip() or get_val('email').strip() or get_val('mail').strip()
                    reg_no = get_val('registerno').strip() or get_val('reg_no').strip() or get_val('regno').strip()
                    roll_no = get_val('rollno').strip() or get_val('roll_no').strip()
                    age_val = get_val('age').strip()
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
                        user = User.objects.create_user(
                            username=username,
                            email=email,
                            password=password,
                            role='student',
                            department=request.user.department,
                            phone_number=mobile_no,
                            age=int(age_val) if age_val.isdigit() else None
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
                    return redirect('hod_bulk_add_students_to_class', class_id=class_id)
                    
        except Exception as e:
            messages.error(request, f'Database error: {str(e)}')
            return redirect('hod_bulk_add_students_to_class', class_id=class_id)
            
        messages.success(request, f'Successfully imported {created_count} students.')
        return redirect('hod_class_students', class_id=class_id)
        
    return render(request, 'hod/bulk_add_students.html', {'preselected_class': class_obj})

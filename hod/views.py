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
    department = request.user.department
    
    # Base querysets filtered by department
    students = Student.objects.filter(user__department=department)
    total_students = students.count()
    total_staff = Staff.objects.filter(user__department=department).count()
    
    today = datetime.date.today()
    present_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='Present'
    ).values('student').distinct().count()
    
    absent_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='Absent'
    ).values('student').distinct().count()
    
    od_students_today = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='OD'
    ).values('student').distinct().count()
    
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
    
    context = {
        'total_students': total_students,
        'total_staff': total_staff,
        'present_students': present_students,
        'absent_students': absent_students,
        'od_students_today': od_students_today,
        'pending_leave_approvals': pending_leave_approvals,
        'pending_od_approvals': pending_od_approvals,
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
        leave_type='Leave',
        is_archived=False
    ).exclude(hod_approved='Pending').select_related('student__user').order_by('-updated_at')
    
    processed_ods_today = Leave.objects.filter(
        student__in=students, 
        leave_type='OD',
        is_archived=False
    ).exclude(hod_approved='Pending').select_related('student__user').order_by('-updated_at')
    
    context = {
        'pending_leaves': pending_leaves,
        'pending_ods': pending_ods,
        'processed_leaves_today': processed_leaves_today,
        'processed_ods_today': processed_ods_today,
    }
    return render(request, 'hod/approvals.html', context)

@login_required
def add_student(request):
    department = request.user.department
    classes = Class.objects.filter(department=department)
    
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        first_name = request.POST.get('first_name', '')
        last_name = request.POST.get('last_name', '')
        dob = request.POST.get('dob')
        phone_number = request.POST.get('phone_number')
        roll_no = request.POST.get('roll_no')
        reg_no = request.POST.get('reg_no')
        class_id = request.POST.get('class_id')
        password = request.POST.get('password', 'password123')
        
        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already exists!')
            return redirect('add_student')
            
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='student',
            department=department,
            phone_number=phone_number,
            dob=dob if dob else None
        )
        selected_class = Class.objects.get(id=class_id)
        
        Student.objects.create(
            user=user,
            student_class=selected_class,
            roll_no=roll_no,
            reg_no=reg_no
        )
        messages.success(request, 'Student added successfully.')
        return redirect('hod_students')
        
    return render(request, 'hod/student_form.html', {'classes': classes})

@login_required
def edit_student(request, user_id):
    student = get_object_or_404(Student, user__id=user_id, user__department=request.user.department)
    classes = Class.objects.filter(department=request.user.department)
    
    if request.method == 'POST':
        student.user.username = request.POST.get('username')
        student.user.email = request.POST.get('email')
        student.user.first_name = request.POST.get('first_name', '')
        student.user.last_name = request.POST.get('last_name', '')
        dob = request.POST.get('dob')
        student.user.dob = dob if dob else None
        student.user.phone_number = request.POST.get('phone_number')
        
        # Only update password if provided
        new_password = request.POST.get('password', '')
        if new_password:
            student.user.set_password(new_password)
        student.user.save()
        
        class_id = request.POST.get('class_id')
        student.student_class = Class.objects.get(id=class_id)
        student.roll_no = request.POST.get('roll_no')
        student.reg_no = request.POST.get('reg_no')
        student.save()
        
        messages.success(request, 'Student updated successfully.')
        return redirect('hod_students')
        
    return render(request, 'hod/student_form.html', {'student': student, 'classes': classes})

@login_required
def delete_student(request, user_id):
    student = get_object_or_404(Student, user__id=user_id, user__department=request.user.department)
    if request.method == 'POST':
        student.user.delete()  # This will cascade delete the Student object too
        messages.success(request, 'Student deleted successfully.')
    return redirect('hod_students')

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
        
    action = request.GET.get('action')
    if action == 'download':
        date = request.GET.get('date')
        class_id = request.GET.get('class_id')
        
        from attendance.models import Attendance
        records = Attendance.objects.filter(
            student__student_class_id=class_id,
            schedule__period=1,
            date=date
        ).select_related('student__user', 'student__student_class')
        
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv')
        c_name = records.first().student.student_class.name if records.exists() else "Class"
        response['Content-Disposition'] = f'attachment; filename="Morning_Attendance_{c_name}_{date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Register Number', 'Name', 'Class', 'Status'])
        
        for r in records:
            writer.writerow([
                r.student.user.username,
                f"{r.student.user.first_name} {r.student.user.last_name}".strip(),
                str(r.student.student_class),
                r.status
            ])
            
        return response

    from attendance.models import Attendance
    from django.db.models import Count, Q
    
    grouped_data = Attendance.objects.filter(
        student__student_class__department=request.user.department,
        schedule__period=1
    ).values(
        'date', 
        'student__student_class__id',
        'student__student_class__name',
        'student__student_class__section',
        'student__student_class__year',
        'student__student_class__advisor__first_name',
        'student__student_class__advisor__last_name'
    ).annotate(
        total_students=Count('id'),
        present_count=Count('id', filter=Q(status='Present')),
        absent_count=Count('id', filter=Q(status='Absent')),
        od_count=Count('id', filter=Q(status='OD')),
    ).order_by('-date', 'student__student_class__name')

    return render(request, 'hod/morning_attendance.html', {'grouped_data': grouped_data})

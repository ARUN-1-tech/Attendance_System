from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import user_passes_test
from django.contrib import messages
from accounts.models import User, Department, Staff

def admin_required(view_func):
    def check_user(u):
        is_auth = u.is_authenticated
        role = getattr(u, 'role', None)
        is_super = u.is_superuser
        passed = is_auth and (is_super or role == 'admin')
        print(f"[DEBUG LOG] admin_required check: user='{u.username}', authenticated={is_auth}, role='{role}', superuser={is_super} => PASSED={passed}")
        return passed
    
    actual_decorator = user_passes_test(check_user, login_url='login')
    return actual_decorator(view_func)

@admin_required
def dashboard(request):
    total_depts = Department.objects.count()
    total_hods = User.objects.filter(role='hod').count()
    total_students = User.objects.filter(role='student').count()
    total_staff = User.objects.filter(role='staff').count()
    
    context = {
        'total_depts': total_depts,
        'total_hods': total_hods,
        'total_students': total_students,
        'total_staff': total_staff,
    }
    return render(request, 'adminpanel/dashboard.html', context)

# --- Department CRUD ---

@admin_required
def departments_list(request):
    departments = Department.objects.all().order_by('name')
    context = {
        'departments': departments
    }
    return render(request, 'adminpanel/departments.html', context)

@admin_required
def add_department(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        if name:
            if Department.objects.filter(name__iexact=name).exists():
                messages.error(request, f"Department '{name}' already exists.")
            else:
                Department.objects.create(name=name)
                messages.success(request, f"Department '{name}' created successfully.")
        else:
            messages.error(request, "Department name cannot be empty.")
    return redirect('admin_departments')

@admin_required
def edit_department(request, dept_id):
    dept = get_object_or_404(Department, id=dept_id)
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        if name:
            if Department.objects.filter(name__iexact=name).exclude(id=dept_id).exists():
                messages.error(request, f"Another department with name '{name}' already exists.")
            else:
                dept.name = name
                dept.save()
                messages.success(request, "Department updated successfully.")
        else:
            messages.error(request, "Department name cannot be empty.")
    return redirect('admin_departments')

@admin_required
def delete_department(request, dept_id):
    dept = get_object_or_404(Department, id=dept_id)
    if request.method == 'POST':
        name = dept.name
        dept.delete()
        messages.success(request, f"Department '{name}' deleted successfully.")
    return redirect('admin_departments')

# --- HOD CRUD ---

@admin_required
def hods_list(request):
    # Fetch all users with role HOD and select their department/staff details
    hods = User.objects.filter(role='hod').select_related('department').order_by('username')
    context = {
        'hods': hods
    }
    return render(request, 'adminpanel/hods.html', context)

@admin_required
def add_hod(request):
    departments = Department.objects.all().order_by('name')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        phone_number = request.POST.get('phone_number', '').strip()
        age_str = request.POST.get('age', '').strip()
        dob = request.POST.get('dob', '').strip()
        dept_id = request.POST.get('department', '').strip()
        staff_id = request.POST.get('staff_id', '').strip()
        designation = request.POST.get('designation', '').strip()

        # Validations
        if not username or not password or not dept_id:
            messages.error(request, "Username, Password, and Department are required.")
            context = {
                'departments': departments,
                'form_data': request.POST
            }
            return render(request, 'adminpanel/hod_form.html', context)

        if User.objects.filter(username=username).exists():
            messages.error(request, f"Username '{username}' is already taken.")
            context = {
                'departments': departments,
                'form_data': request.POST
            }
            return render(request, 'adminpanel/hod_form.html', context)

        department = get_object_or_404(Department, id=dept_id)
        age = int(age_str) if age_str.isdigit() else None

        # Create HOD User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role='hod',
            department=department,
            phone_number=phone_number,
            age=age,
            dob=dob if dob else None
        )

        # Create corresponding Staff record
        Staff.objects.create(
            user=user,
            staff_id=staff_id,
            designation=designation if designation else 'Head of Department',
            staff_type='Normal'
        )

        messages.success(request, f"HOD '{username}' created successfully.")
        return redirect('admin_hods')

    context = {
        'departments': departments
    }
    return render(request, 'adminpanel/hod_form.html', context)

@admin_required
def edit_hod(request, hod_id):
    hod_user = get_object_or_404(User, id=hod_id, role='hod')
    # Get or create the Staff profile for the HOD
    staff_profile, _ = Staff.objects.get_or_create(user=hod_user)
    departments = Department.objects.all().order_by('name')

    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '').strip()
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()
        phone_number = request.POST.get('phone_number', '').strip()
        age_str = request.POST.get('age', '').strip()
        dob = request.POST.get('dob', '').strip()
        dept_id = request.POST.get('department', '').strip()
        staff_id = request.POST.get('staff_id', '').strip()
        designation = request.POST.get('designation', '').strip()

        if not dept_id:
            messages.error(request, "Department is required.")
            context = {
                'departments': departments,
                'hod_user': hod_user,
                'staff_profile': staff_profile
            }
            return render(request, 'adminpanel/hod_form.html', context)

        department = get_object_or_404(Department, id=dept_id)
        
        # Update user details
        hod_user.email = email
        hod_user.first_name = first_name
        hod_user.last_name = last_name
        hod_user.phone_number = phone_number
        hod_user.department = department
        hod_user.age = int(age_str) if age_str.isdigit() else None
        if dob:
            hod_user.dob = dob
        else:
            hod_user.dob = None

        if password:
            hod_user.set_password(password)

        hod_user.save()

        # Update staff profile details
        staff_profile.staff_id = staff_id
        staff_profile.designation = designation if designation else 'Head of Department'
        staff_profile.save()

        messages.success(request, f"HOD '{hod_user.username}' updated successfully.")
        return redirect('admin_hods')

    # Prep the date for the HTML5 date input format YYYY-MM-DD
    dob_value = ""
    if hod_user.dob:
        dob_value = hod_user.dob.strftime('%Y-%m-%d')

    context = {
        'hod_user': hod_user,
        'staff_profile': staff_profile,
        'departments': departments,
        'dob_value': dob_value,
        'is_edit': True
    }
    return render(request, 'adminpanel/hod_form.html', context)

@admin_required
def delete_hod(request, hod_id):
    hod_user = get_object_or_404(User, id=hod_id, role='hod')
    if request.method == 'POST':
        username = hod_user.username
        hod_user.delete()
        messages.success(request, f"HOD '{username}' deleted successfully.")
    return redirect('admin_hods')

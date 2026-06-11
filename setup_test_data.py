import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_system.settings')
django.setup()

from accounts.models import User, Department, Class, Subject, Student, Staff

# Create Department
cs_dept, _ = Department.objects.get_or_create(name='Computer Science')

# Create Class
cs_class, _ = Class.objects.get_or_create(name='B.Tech CS', year=3, section='A', department=cs_dept)

# Create Admin
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    admin.role = 'admin'
    admin.save()

# Create HOD
if not User.objects.filter(username='hod').exists():
    hod = User.objects.create_user('hod', 'hod@example.com', 'hod123')
    hod.role = 'hod'
    hod.department = cs_dept
    hod.save()
    Staff.objects.create(user=hod)

# Create Staff
if not User.objects.filter(username='staff').exists():
    staff = User.objects.create_user('staff', 'staff@example.com', 'staff123')
    staff.role = 'staff'
    staff.department = cs_dept
    staff.save()
    Staff.objects.create(user=staff)

# Create Student
if not User.objects.filter(username='student').exists():
    student_user = User.objects.create_user('student', 'student@example.com', 'student123')
    student_user.role = 'student'
    student_user.department = cs_dept
    student_user.first_name = 'Arun'
    student_user.last_name = 'Kumar'
    student_user.phone_number = '9876543210'
    student_user.age = 20
    student_user.save()
    
    # Retrieve staff created above if it exists in local scope
    staff_obj = User.objects.filter(username='staff').first()
    Student.objects.create(user=student_user, student_class=cs_class, tutor=staff_obj, advisor=staff_obj)

print("Test data created successfully.")
print("Users: admin/admin123, hod/hod123, staff/staff123, student/student123")

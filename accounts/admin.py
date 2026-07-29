from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department, Class, Subject, Student, Staff
@admin.register(User)

class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'department', 'is_staff', 'is_superuser')
    list_filter = ('role', 'department', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile Info', {'fields': ('role', 'department', 'phone_number', 'dob', 'profile_photo')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Profile Info', {'fields': ('role', 'department', 'phone_number', 'dob')}),
    )


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)

@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'year', 'section', 'department', 'class_type', 'advisor')
    list_filter = ('department', 'year', 'class_type')
    search_fields = ('name', 'section')

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code', 'department', 'student_class', 'subject_type', 'year', 'semester')
    list_filter = ('department', 'subject_type', 'year', 'semester')
    search_fields = ('name', 'code')

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('user', 'reg_no', 'roll_no', 'student_class', 'tutor', 'advisor')
    list_filter = ('student_class__department', 'student_class')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'reg_no', 'roll_no')

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('user', 'staff_id', 'staff_type', 'designation')
    list_filter = ('staff_type', 'user__department')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'staff_id', 'designation')

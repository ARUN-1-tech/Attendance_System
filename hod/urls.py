from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='hod_dashboard'),
    path('students/', views.students_list, name='hod_students'),
    path('students/add/', views.add_student, name='add_student'),
    path('students/edit/<int:user_id>/', views.edit_student, name='edit_student'),
    path('students/delete/<int:user_id>/', views.delete_student, name='delete_student'),
    
    path('staff/', views.staff_list, name='hod_staff'),
    path('staff/add/', views.add_staff, name='add_staff'),
    path('staff/edit/<int:user_id>/', views.edit_staff, name='edit_staff'),
    path('staff/delete/<int:user_id>/', views.delete_staff, name='delete_staff'),
    
    path('present/', views.present_students_list, name='hod_present_students'),
    path('absent/', views.absent_students_list, name='hod_absent_students'),
    path('od-today/', views.od_students_list, name='hod_od_students'),
    
    path('approvals/', views.approvals_list, name='hod_approvals'),
    path('morning-attendance/', views.morning_attendance, name='hod_morning_attendance'),
    path('profile/', views.hod_profile, name='hod_profile'),
    
    path('classes/', views.classes_list, name='hod_classes'),
    path('classes/add/', views.add_class, name='add_class'),
    path('classes/edit/<int:class_id>/', views.edit_class, name='edit_class'),
    path('classes/delete/<int:class_id>/', views.delete_class, name='delete_class'),
]

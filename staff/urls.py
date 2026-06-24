from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='staff_dashboard'),
    path('approvals/', views.approvals_list, name='staff_approvals'),
    path('students/', views.students_list, name='staff_students'),
    path('students/add/', views.add_student, name='staff_add_student'),
    path('students/bulk-add/', views.bulk_add_students, name='staff_bulk_add_students'),
    path('students/edit/<int:user_id>/', views.edit_student, name='staff_edit_student'),
    path('students/delete/<int:user_id>/', views.delete_student, name='staff_delete_student'),
    path('manual-attendance/', views.manual_attendance, name='manual_attendance'),
    path('subject-reports/', views.subject_reports, name='staff_subject_reports'),
    path('advisor-reports/', views.advisor_reports, name='staff_advisor_reports'),
    path('profile/', views.staff_profile, name='staff_profile'),
    path('edit-timetable/', views.edit_timetable, name='edit_timetable'),
    path('advisor-live/', views.advisor_live_attendance, name='advisor_live_attendance'),
]

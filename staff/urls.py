from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='staff_dashboard'),
    path('approvals/', views.approvals_list, name='staff_approvals'),
    path('students/', views.students_list, name='staff_students'),
    path('subject-reports/', views.subject_reports, name='staff_subject_reports'),
    path('advisor-reports/', views.advisor_reports, name='staff_advisor_reports'),
    path('profile/', views.staff_profile, name='staff_profile'),
    path('edit-timetable/', views.edit_timetable, name='edit_timetable'),
]

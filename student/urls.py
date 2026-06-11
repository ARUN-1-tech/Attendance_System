from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='student_dashboard'),
    path('leave-od/', views.leave_od_status, name='leave_od_status'),
    path('profile/', views.student_profile, name='student_profile'),
    path('timetable/', views.student_timetable, name='student_timetable'),
]

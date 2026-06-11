from django.urls import path
from . import views

urlpatterns = [
    path('generate-otp/', views.generate_otp, name='generate_otp'),
    path('verify-otp/', views.verify_otp, name='verify_otp'),
    path('download-report/', views.download_report, name='download_report'),
    path('class-report/<int:class_id>/', views.class_report, name='class_report'),
    path('active-session/<int:otp_id>/', views.active_otp_session, name='active_otp_session'),
    path('api/session-stats/<int:otp_id>/', views.session_stats_api, name='session_stats_api'),
    path('download-session/<int:otp_id>/', views.download_session, name='download_session'),
    path('student-stats/<str:user_id>/', views.student_attendance_stats, name='student_attendance_stats'),
]

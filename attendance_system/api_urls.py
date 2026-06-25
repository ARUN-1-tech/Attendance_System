from django.urls import path, include
from rest_framework.routers import DefaultRouter

from accounts.api_views import (
    api_login, api_logout, api_me,
    DepartmentViewSet, ClassViewSet, SubjectViewSet,
    UserViewSet, StudentViewSet, StaffViewSet,
    api_hod_dashboard_stats, api_hod_morning_attendance,
    api_advisor_live_attendance
)
from timetable.api_views import ScheduleViewSet
from attendance.api_views import (
    api_generate_otp, api_verify_otp, api_session_stats,
    api_student_stats, api_attendance_report_data, AttendanceViewSet,
    api_stop_session
)
from leave.api_views import LeaveViewSet

router = DefaultRouter()
router.register('departments', DepartmentViewSet, basename='departments')
router.register('classes', ClassViewSet, basename='classes')
router.register('subjects', SubjectViewSet, basename='subjects')
router.register('users', UserViewSet, basename='users')
router.register('students', StudentViewSet, basename='students')
router.register('staff', StaffViewSet, basename='staff')
router.register('schedules', ScheduleViewSet, basename='schedules')
router.register('attendances', AttendanceViewSet, basename='attendances')
router.register('leaves', LeaveViewSet, basename='leaves')

urlpatterns = [
    # Auth Endpoints
    path('auth/login/', api_login, name='api_login'),
    path('auth/logout/', api_logout, name='api_logout'),
    path('auth/me/', api_me, name='api_me'),

    # Attendance/OTP Endpoints
    path('attendance/generate-otp/', api_generate_otp, name='api_generate_otp'),
    path('attendance/verify-otp/', api_verify_otp, name='api_verify_otp'),
    path('attendance/stop-session/', api_stop_session, name='api_stop_session'),
    path('attendance/session-stats/<int:otp_id>/', api_session_stats, name='api_session_stats'),
    path('attendance/student-stats/<str:username>/', api_student_stats, name='api_student_stats'),
    path('attendance/reports/', api_attendance_report_data, name='api_attendance_report_data'),

    # HOD Endpoints
    path('hod/dashboard-stats/', api_hod_dashboard_stats, name='api_hod_dashboard_stats'),
    path('hod/morning-attendance/', api_hod_morning_attendance, name='api_hod_morning_attendance'),

    # Staff Advisor Endpoints
    path('staff/advisor-live/', api_advisor_live_attendance, name='api_advisor_live_attendance'),

    # Viewsets router
    path('', include(router.urls)),
]

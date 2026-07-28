from django.contrib import admin
from .models import OTP, Attendance, PeriodLock

@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('id', 'code', 'schedule', 'creator', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('code', 'creator__username')

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'schedule', 'date', 'status')
    list_filter = ('status', 'date')
    search_fields = ('student__user__username', 'student__reg_no')

@admin.register(PeriodLock)
class PeriodLockAdmin(admin.ModelAdmin):
    list_display = ('id', 'student_class', 'date', 'period', 'staff')
    list_filter = ('date', 'period')
    search_fields = ('staff__username', 'student_class__name')

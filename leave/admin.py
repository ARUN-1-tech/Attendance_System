from django.contrib import admin
from .models import Leave

@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'date', 'leave_type', 'tutor_approved', 'advisor_approved', 'hod_approved', 'final_status', 'is_archived')
    list_filter = ('leave_type', 'final_status', 'is_archived', 'date')
    search_fields = ('student__user__username', 'student__reg_no', 'reason')

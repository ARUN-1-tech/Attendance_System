from django.contrib import admin
from .models import Schedule

@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('id', 'student_class', 'day', 'period', 'subject', 'start_time', 'end_time')
    list_filter = ('day', 'period', 'student_class__department', 'student_class')
    search_fields = ('student_class__name', 'subject__name', 'subject__code')

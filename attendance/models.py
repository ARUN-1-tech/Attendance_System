from django.db import models
from accounts.models import Student, User
from timetable.models import Schedule

class OTP(models.Model):
    code = models.CharField(max_length=6)
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    staff_latitude = models.FloatField(null=True, blank=True)
    staff_longitude = models.FloatField(null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='created_otps')

    def __str__(self):
        return f"OTP for {self.schedule} - {self.code}"

class Attendance(models.Model):
    STATUS_CHOICES = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('OD', 'On Duty'),
        ('Leave', 'Leave'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Absent')

    class Meta:
        unique_together = ('student', 'schedule', 'date')

    def __str__(self):
        return f"{self.student} - {self.date} - {self.status}"


class PeriodLock(models.Model):
    student_class = models.ForeignKey('accounts.Class', on_delete=models.CASCADE)
    date = models.DateField()
    period = models.IntegerField()
    staff = models.ForeignKey('accounts.User', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('student_class', 'date', 'period')

    def __str__(self):
        return f"{self.student_class} - {self.date} Period {self.period} locked by {self.staff}"


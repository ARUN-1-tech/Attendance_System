from django.db import models
from accounts.models import Student

class Leave(models.Model):
    TYPE_CHOICES = (
        ('Leave', 'Leave'),
        ('OD', 'On Duty'),
    )
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    date = models.DateField(db_index=True)
    leave_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    reason = models.TextField()
    
    tutor_approved = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    advisor_approved = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    hod_approved = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    
    proof = models.FileField(upload_to='proofs/', null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    certificate_verified = models.BooleanField(default=False)
    certificate_deadline = models.DateTimeField(null=True, blank=True)
    final_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=['student', 'date']),
            models.Index(fields=['student', 'leave_type', 'final_status']),
        ]

    def __str__(self):
        return f"{self.student} - {self.date} - {self.leave_type}"


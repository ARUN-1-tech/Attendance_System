from django.db import models
from django.contrib.auth.models import AbstractUser

class Department(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class User(AbstractUser):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('staff', 'Staff'),
        ('hod', 'HOD'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True)
    phone_number = models.CharField(max_length=15, null=True, blank=True)
    dob = models.DateField(null=True, blank=True)
    profile_photo = models.TextField(null=True, blank=True)

class Class(models.Model):
    CLASS_TYPE_CHOICES = (
        ('REGULAR', 'Regular'),
        ('OPEN_ELECTIVE', 'Open Elective'),
    )
    name = models.CharField(max_length=100)
    year = models.IntegerField()
    section = models.CharField(max_length=10)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    class_type = models.CharField(max_length=20, choices=CLASS_TYPE_CHOICES, default='REGULAR')
    elective_students = models.ManyToManyField('Student', related_name='elective_classes', blank=True)
    tutor1 = models.ForeignKey(User, related_name='tutor1_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    tutor2 = models.ForeignKey(User, related_name='tutor2_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    tutor3 = models.ForeignKey(User, related_name='tutor3_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    advisor = models.ForeignKey(User, related_name='advisor_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})

    def __str__(self):
        prefix = "[Elective] " if self.class_type == 'OPEN_ELECTIVE' else ""
        return f"{prefix}{self.name} - {self.year} - {self.section}"

    def get_students(self):
        if self.class_type == 'OPEN_ELECTIVE':
            return self.elective_students.all()
        return self.student_set.all()

    def auto_assign_tutors(self, force=False):
        students = list(self.get_students().order_by('reg_no', 'user__username'))
        N = len(students)
        if N == 0:
            return
        
        g1_size = N // 3 + (1 if N % 3 >= 1 else 0)
        g2_size = N // 3 + (1 if N % 3 >= 2 else 0)
        limit1 = g1_size
        limit2 = g1_size + g2_size
        
        for i, student in enumerate(students):
            if i < limit1:
                t = self.tutor1 or self.tutor2 or self.tutor3
            elif i < limit2:
                t = self.tutor2 or self.tutor1 or self.tutor3
            else:
                t = self.tutor3 or self.tutor1 or self.tutor2
            
            adv = self.advisor or self.tutor3
            
            updated_tutor = t if force else (student.tutor or t)
            updated_advisor = adv if force else (student.advisor or adv)
            
            if student.tutor != updated_tutor or student.advisor != updated_advisor:
                self.student_set.filter(pk=student.pk).update(tutor=updated_tutor, advisor=updated_advisor)

    def save(self, *args, **kwargs):
        if self.tutor3:
            self.advisor = self.tutor3
        super().save(*args, **kwargs)
        self.auto_assign_tutors(force=True)

        # Sync all staff types based on class assignments
        from accounts.models import Staff
        advisors = Class.objects.exclude(advisor__isnull=True).values_list('advisor_id', flat=True).distinct()
        tutors = Class.objects.exclude(tutor1__isnull=True).values_list('tutor1_id', flat=True)
        tutors2 = Class.objects.exclude(tutor2__isnull=True).values_list('tutor2_id', flat=True)
        all_tutors = set(list(tutors) + list(tutors2)) - set(advisors)

        Staff.objects.filter(user_id__in=list(advisors)).update(staff_type='Advisor')
        Staff.objects.filter(user_id__in=list(all_tutors)).update(staff_type='Tutor')
        Staff.objects.exclude(user_id__in=list(advisors) + list(all_tutors)).update(staff_type='Normal')

class Subject(models.Model):
    SUBJECT_TYPE_CHOICES = (
        ('REGULAR', 'Regular'),
        ('OPEN_ELECTIVE', 'Open Elective'),
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    student_class = models.ForeignKey(Class, on_delete=models.CASCADE, null=True, blank=True, related_name='subjects')
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE_CHOICES, default='REGULAR')
    year = models.IntegerField(null=True, blank=True)
    semester = models.IntegerField(null=True, blank=True)

    def __str__(self):
        prefix = "[OE] " if self.subject_type == 'OPEN_ELECTIVE' else ""
        return f"{prefix}{self.name} ({self.code})"

    def save(self, *args, **kwargs):
        if self.student_class and not self.year:
            self.year = self.student_class.year
        super().save(*args, **kwargs)

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, limit_choices_to={'role': 'student'})
    student_class = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True)
    tutor = models.ForeignKey(User, related_name='tutored_students', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role__in': ['staff', 'hod']})
    advisor = models.ForeignKey(User, related_name='advised_students', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role__in': ['staff', 'hod']})
    roll_no = models.CharField(max_length=50, null=True, blank=True, db_index=True)
    reg_no = models.CharField(max_length=50, null=True, blank=True, db_index=True)

    def __str__(self):
        return self.user.username

    class Meta:
        ordering = ['reg_no', 'user__username']
        indexes = [
            models.Index(fields=['reg_no']),
        ]


    def save(self, *args, **kwargs):
        skip_auto_assign = kwargs.pop('skip_auto_assign', False)
        old_class = None
        if self.pk:
            try:
                old_class = Student.objects.get(pk=self.pk).student_class
            except Student.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        if not skip_auto_assign:
            if self.student_class:
                self.student_class.auto_assign_tutors(force=True)
            if old_class and old_class != self.student_class:
                old_class.auto_assign_tutors(force=True)

from django.db.models.signals import post_delete
from django.dispatch import receiver

@receiver(post_delete, sender=Student)
def student_deleted(sender, instance, **kwargs):
    if instance.student_class:
        instance.student_class.auto_assign_tutors(force=True)

class Staff(models.Model):
    STAFF_TYPE_CHOICES = (
        ('Normal', 'Normal'),
        ('Tutor', 'Tutor'),
        ('Advisor', 'Advisor'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, limit_choices_to={'role__in': ['staff', 'hod']})
    staff_type = models.CharField(max_length=20, choices=STAFF_TYPE_CHOICES, default='Normal')
    staff_id = models.CharField(max_length=50, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.user.username

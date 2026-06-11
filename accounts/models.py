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
    age = models.PositiveIntegerField(null=True, blank=True)
    dob = models.DateField(null=True, blank=True)

class Class(models.Model):
    name = models.CharField(max_length=100)
    year = models.IntegerField()
    section = models.CharField(max_length=10)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    tutor1 = models.ForeignKey(User, related_name='tutor1_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    tutor2 = models.ForeignKey(User, related_name='tutor2_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    tutor3 = models.ForeignKey(User, related_name='tutor3_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})
    advisor = models.ForeignKey(User, related_name='advisor_classes', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'staff'})

    def __str__(self):
        return f"{self.name} - {self.year} - {self.section}"

    def auto_assign_tutors(self):
        students = list(self.student_set.all().order_by('roll_no', 'user__username'))
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
            
            if student.tutor != t or student.advisor != adv:
                self.student_set.filter(pk=student.pk).update(tutor=t, advisor=adv)

    def save(self, *args, **kwargs):
        if self.tutor3:
            self.advisor = self.tutor3
        super().save(*args, **kwargs)
        self.auto_assign_tutors()

class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, limit_choices_to={'role': 'student'})
    student_class = models.ForeignKey(Class, on_delete=models.SET_NULL, null=True)
    tutor = models.ForeignKey(User, related_name='tutored_students', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role__in': ['staff', 'hod']})
    advisor = models.ForeignKey(User, related_name='advised_students', on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role__in': ['staff', 'hod']})
    roll_no = models.CharField(max_length=50, null=True, blank=True)
    reg_no = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        old_class = None
        if self.pk:
            try:
                old_class = Student.objects.get(pk=self.pk).student_class
            except Student.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        if self.student_class:
            self.student_class.auto_assign_tutors()
        if old_class and old_class != self.student_class:
            old_class.auto_assign_tutors()

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

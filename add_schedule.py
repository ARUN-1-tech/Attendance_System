import os
import django
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'attendance_system.settings')
django.setup()

from accounts.models import Department, Class, Subject
from timetable.models import Schedule

d = Department.objects.first()
c = Class.objects.filter(department=d).first()
s, _ = Subject.objects.get_or_create(code='CS101', name='Intro to CS', department=d)
sch, created = Schedule.objects.get_or_create(
    id=1, 
    day='Monday', 
    period=1, 
    subject=s, 
    student_class=c, 
    start_time=datetime.time(9, 0), 
    end_time=datetime.time(10, 0)
)
print("Schedule 1 is ready!")

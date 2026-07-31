from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import Department, Class, Subject, Student
from timetable.models import Schedule
from attendance.models import PeriodLock, Attendance
import datetime

User = get_user_model()

class StaffAttendanceHistoryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.dept = Department.objects.create(name='Computer Science')
        
        self.staff_user = User.objects.create_user(
            username='staff1',
            password='password123',
            role='staff',
            department=self.dept,
            first_name='John',
            last_name='Staff'
        )

        self.student_user1 = User.objects.create_user(
            username='student1',
            password='password123',
            role='student',
            department=self.dept,
            first_name='Alice',
            last_name='Smith'
        )
        self.student_user2 = User.objects.create_user(
            username='student2',
            password='password123',
            role='student',
            department=self.dept,
            first_name='Bob',
            last_name='Jones'
        )

        self.clazz = Class.objects.create(
            name='III CSE A',
            department=self.dept,
            year=3,
            section='A'
        )

        self.subject = Subject.objects.create(
            name='Data Structures',
            code='CS301',
            department=self.dept,
            student_class=self.clazz
        )

        self.student1 = Student.objects.create(
            user=self.student_user1,
            student_class=self.clazz,
            roll_no='21CS01',
            reg_no='7376211CS01'
        )
        self.student2 = Student.objects.create(
            user=self.student_user2,
            student_class=self.clazz,
            roll_no='21CS02',
            reg_no='7376211CS02'
        )

        self.today = datetime.date.today()
        self.weekday = self.today.strftime('%A')

        self.schedule = Schedule.objects.create(
            student_class=self.clazz,
            subject=self.subject,
            period=1,
            day=self.weekday,
            start_time=datetime.time(9, 0),
            end_time=datetime.time(10, 0)
        )

        # Create period lock marked by staff_user
        self.lock = PeriodLock.objects.create(
            student_class=self.clazz,
            date=self.today,
            period=1,
            staff=self.staff_user
        )

        # Create attendance records
        Attendance.objects.create(student=self.student1, schedule=self.schedule, date=self.today, status='Present')
        Attendance.objects.create(student=self.student2, schedule=self.schedule, date=self.today, status='Absent')

    def test_staff_marked_history(self):
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get('/api/attendances/staff-marked-history/')
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT if response.status_code == 205 else status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn('history', data)
        self.assertGreaterEqual(len(data['history']), 1)
        
        first_day = data['history'][0]
        self.assertEqual(first_day['date'], self.today.strftime('%Y-%m-%d'))
        self.assertEqual(len(first_day['sessions']), 1)
        
        sess = first_day['sessions'][0]
        self.assertEqual(sess['s_no'], 1)
        self.assertEqual(sess['period'], 1)
        self.assertEqual(sess['class_name'], 'III CSE A')
        self.assertEqual(sess['subject_code'], 'CS301')
        self.assertEqual(sess['present_count'], 1)
        self.assertEqual(sess['absent_count'], 1)

    def test_staff_history_session_detail(self):
        self.client.force_authenticate(user=self.staff_user)
        url = f'/api/attendances/staff-history-session-detail/?date={self.today.strftime("%Y-%m-%d")}&class_id={self.clazz.id}&period=1'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['class_name'], 'III CSE A')
        self.assertEqual(data['period'], 1)
        self.assertEqual(len(data['students']), 2)

    def test_update_staff_history_session(self):
        self.client.force_authenticate(user=self.staff_user)
        url = '/api/attendances/update-staff-history-session/'
        payload = {
            'date': self.today.strftime('%Y-%m-%d'),
            'class_id': self.clazz.id,
            'period': 1,
            'statuses': {
                self.student_user1.id: 'Absent',
                self.student_user2.id: 'Present'
            }
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify in DB
        att1 = Attendance.objects.get(student=self.student1, schedule=self.schedule, date=self.today)
        att2 = Attendance.objects.get(student=self.student2, schedule=self.schedule, date=self.today)
        self.assertEqual(att1.status, 'Absent')
        self.assertEqual(att2.status, 'Present')

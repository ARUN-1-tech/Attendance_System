from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from accounts.models import User, Department, Class, Student, Staff
import csv
import io
import openpyxl

class StudentBulkImportTestCase(TestCase):
    def setUp(self):
        # Create Department
        self.dept = Department.objects.create(name='Computer Science')
        
        # Create Class
        self.clazz = Class.objects.create(name='B.Tech CS', year=3, section='A', department=self.dept)
        
        # Create tutor users
        self.tutor1_user = User.objects.create_user('tutor1', 'tutor1@example.com', 'pass123')
        self.tutor1_user.role = 'staff'
        self.tutor1_user.save()
        Staff.objects.create(user=self.tutor1_user, staff_type='Tutor')
        
        self.tutor2_user = User.objects.create_user('tutor2', 'tutor2@example.com', 'pass123')
        self.tutor2_user.role = 'staff'
        self.tutor2_user.save()
        Staff.objects.create(user=self.tutor2_user, staff_type='Tutor')
        
        self.tutor3_user = User.objects.create_user('tutor3', 'tutor3@example.com', 'pass123')
        self.tutor3_user.role = 'staff'
        self.tutor3_user.save()
        Staff.objects.create(user=self.tutor3_user, staff_type='Tutor')
        
        # Assign tutors to class
        self.clazz.tutor1 = self.tutor1_user
        self.clazz.tutor2 = self.tutor2_user
        self.clazz.tutor3 = self.tutor3_user
        self.clazz.save()
        
        # Create Advisor (importer user)
        self.advisor_user = User.objects.create_user('advisor1', 'advisor1@example.com', 'advisor123')
        self.advisor_user.role = 'staff'
        self.advisor_user.department = self.dept
        self.advisor_user.save()
        self.advisor_staff = Staff.objects.create(user=self.advisor_user, staff_type='Advisor')
        
        # Create an existing student to trigger "Username already exists" error
        self.existing_user = User.objects.create_user('student_existing', 'existing@example.com', 'pass123')
        self.existing_user.role = 'student'
        self.existing_user.department = self.dept
        self.existing_user.save()
        self.existing_student = Student.objects.create(user=self.existing_user, student_class=self.clazz, reg_no='REG_EXISTING')
        
        # Log in as Advisor
        self.client.login(username='advisor1', password='advisor123')

    def test_invalid_file_type_rejected(self):
        file_content = b"some dummy txt content"
        uploaded_file = SimpleUploadedFile("students.txt", file_content, content_type="text/plain")
        
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.", response.data['detail'])

    def test_missing_required_columns(self):
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(['username', 'password', 'class']) # missing 'year'
        writer.writerow(['test_user', 'pass123', 'B.Tech CS'])
        
        uploaded_file = SimpleUploadedFile("students.csv", csv_buffer.getvalue().encode('utf-8'), content_type="text/csv")
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required CSV columns", response.data['detail'])
        self.assertIn("year", response.data['detail'])

    def test_csv_bulk_import_63_students(self):
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(['username', 'password', 'class', 'year', 'register_no', 'roll_no'])
        
        for i in range(1, 64): # 1 to 63
            writer.writerow([
                f'csv_student_{i:02d}',
                'password123',
                'B.Tech CS',
                '3',
                f'REG_CSV_{i:03d}',
                f'ROLL_CSV_{i:03d}'
            ])
            
        uploaded_file = SimpleUploadedFile("students.csv", csv_buffer.getvalue().encode('utf-8'), content_type="text/csv")
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['created'], 63)
        self.assertEqual(response.data['failed'], 0)
        self.assertEqual(len(response.data['errors']), 0)
        
        # Verify summary counts
        self.assertEqual(response.data['summary']['imported'], 63)
        self.assertEqual(response.data['summary']['tutor1'], 21)
        self.assertEqual(response.data['summary']['tutor2'], 21)
        self.assertEqual(response.data['summary']['tutor3'], 21)
        
        # Verify tutor assignment in DB
        self.assertEqual(Student.objects.filter(user__username__startswith='csv_student', tutor=self.tutor1_user).count(), 21)
        self.assertEqual(Student.objects.filter(user__username__startswith='csv_student', tutor=self.tutor2_user).count(), 21)
        self.assertEqual(Student.objects.filter(user__username__startswith='csv_student', tutor=self.tutor3_user).count(), 21)
        
        # Verify advisor fallback (tutor3 since clazz.advisor is None)
        self.assertEqual(Student.objects.filter(user__username__startswith='csv_student', advisor=self.tutor3_user).count(), 63)

    def test_excel_bulk_import_64_students(self):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['username', 'password', 'class', 'year', 'register_no', 'roll_no'])
        
        for i in range(1, 65): # 1 to 64
            ws.append([
                f'xlsx_student_{i:02d}',
                'password123',
                'B.Tech CS',
                3,
                f'REG_XLSX_{i:03d}',
                f'ROLL_XLSX_{i:03d}'
            ])
            
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        
        uploaded_file = SimpleUploadedFile("students.xlsx", excel_buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['created'], 64)
        
        # Verify 64 -> 22, 21, 21
        self.assertEqual(response.data['summary']['tutor1'], 22)
        self.assertEqual(response.data['summary']['tutor2'], 21)
        self.assertEqual(response.data['summary']['tutor3'], 21)

    def test_excel_bulk_import_65_students(self):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['username', 'password', 'class', 'year', 'register_no', 'roll_no'])
        
        for i in range(1, 66): # 1 to 65
            ws.append([
                f'xlsx_student2_{i:02d}',
                'password123',
                'B.Tech CS',
                3,
                f'REG_XLSX2_{i:03d}',
                f'ROLL_XLSX2_{i:03d}'
            ])
            
        excel_buffer = io.BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)
        
        uploaded_file = SimpleUploadedFile("students.xlsx", excel_buffer.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['created'], 65)
        
        # Verify 65 -> 22, 22, 21
        self.assertEqual(response.data['summary']['tutor1'], 22)
        self.assertEqual(response.data['summary']['tutor2'], 22)
        self.assertEqual(response.data['summary']['tutor3'], 21)

    def test_partial_failures_and_row_wise_errors(self):
        csv_buffer = io.StringIO()
        writer = csv.writer(csv_buffer)
        writer.writerow(['username', 'password', 'class', 'year', 'register_no', 'roll_no'])
        
        # Row 2: Valid student
        writer.writerow(['new_student_val', 'password123', 'B.Tech CS', '3', 'REG_NEW', 'ROLL_NEW'])
        # Row 3: Existing username
        writer.writerow(['student_existing', 'password123', 'B.Tech CS', '3', 'REG_OTHER', 'ROLL_OTHER'])
        # Row 4: Completely empty row (should be skipped)
        writer.writerow(['', '', '', '', '', ''])
        # Row 5: Invalid class (year 4 doesn't exist)
        writer.writerow(['new_student_val2', 'password123', 'B.Tech CS', '4', 'REG_NEW2', 'ROLL_NEW2'])
        
        uploaded_file = SimpleUploadedFile("students.csv", csv_buffer.getvalue().encode('utf-8'), content_type="text/csv")
        response = self.client.post('/api/students/bulk_create/', {'file': uploaded_file})
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['failed'], 2)
        
        errors = response.data['errors']
        self.assertEqual(len(errors), 2)
        self.assertIn("Row 3: Username already exists", errors)
        self.assertIn("Row 5: Class not found", errors)

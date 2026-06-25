from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from .models import User, Department, Class, Subject, Student, Staff
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from .serializers import (
    UserSerializer, DepartmentSerializer, ClassSerializer, 
    SubjectSerializer, StudentSerializer, StaffSerializer
)

def enrich_user_data(user, data):
    from accounts.utils import has_active_otp
    if user.role == 'student':
        data['hide_logout'] = has_active_otp(user)
    elif user.role in ['staff', 'hod']:
        from attendance.models import OTP
        from django.utils import timezone
        from datetime import timedelta
        three_minutes_ago = timezone.now() - timedelta(minutes=3)
        active_otps = OTP.objects.filter(
            creator=user,
            is_active=True,
            created_at__gte=three_minutes_ago
        ).order_by('-created_at')
        if active_otps.exists():
            first_otp = active_otps.first()
            related_otps = active_otps.filter(code=first_otp.code)
            data['active_otp_session'] = {
                'otp_id': first_otp.id,
                'otp_ids': [o.id for o in related_otps],
                'code': first_otp.code,
                'periods': [o.schedule.period for o in related_otps]
            }
        else:
            data['active_otp_session'] = None
    return data

@ensure_csrf_cookie
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')

    is_reg_no_login = False

    try:
        student = Student.objects.get(reg_no=username)
        username = student.user.username
        is_reg_no_login = True
    except Student.DoesNotExist:
        pass

    if (
        not is_reg_no_login
        and User.objects.filter(username=username, role='student').exists()
    ):
        return Response(
            {'detail': 'Students must log in only with registration number.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)

        # Generate CSRF token and attach cookie
        get_token(request)

        serializer = UserSerializer(user)
        user_data = serializer.data

        if user.role == 'student' and hasattr(user, 'student'):
            user_data['student_details'] = StudentSerializer(user.student).data

        elif user.role in ['staff', 'hod'] and hasattr(user, 'staff'):
            user_data['staff_details'] = StaffSerializer(user.staff).data

        user_data = enrich_user_data(user, user_data)

        response = Response({
            'detail': 'Logged in successfully',
            'user': user_data
        })

        return response

    return Response(
        {'detail': 'Invalid credentials'},
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['POST', 'GET'])
@permission_classes([permissions.IsAuthenticated])
def api_logout(request):
    from accounts.utils import has_active_otp
    if has_active_otp(request.user):
        return Response(
            {'detail': 'You cannot log out while an active OTP session is running for your class.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    logout(request)
    return Response({'detail': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_me(request):
    user = request.user
    serializer = UserSerializer(user)
    
    # Enrich with additional profile information depending on the role
    data = serializer.data
    if user.role == 'student' and hasattr(user, 'student'):
        student = user.student
        data['student_details'] = StudentSerializer(student).data
    elif user.role in ['staff', 'hod'] and hasattr(user, 'staff'):
        staff = user.staff
        data['staff_details'] = StaffSerializer(staff).data
        
    data = enrich_user_data(user, data)
    return Response(data)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Class.objects.all()
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        elif self.request.user.role in ['staff', 'hod'] and self.request.user.department:
            queryset = queryset.filter(department=self.request.user.department)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role == 'hod' and self.request.user.department:
            serializer.save(department=self.request.user.department)
        else:
            serializer.save()

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Subject.objects.all()
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(student_class_id=class_id)
        else:
            dept_id = self.request.query_params.get('department')
            if dept_id:
                queryset = queryset.filter(department_id=dept_id)
            if self.request.user.role in ['staff', 'hod'] and self.request.user.department:
                queryset = queryset.filter(department=self.request.user.department)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'staff' and hasattr(user, 'staff') and user.staff.staff_type == 'Advisor':
            from accounts.models import Class
            advised_class = Class.objects.filter(advisor=user).first()
            if advised_class:
                serializer.save(
                    student_class=advised_class,
                    department=user.department
                )
                return
        if user.role == 'hod' and user.department:
            serializer.save(department=user.department)
        else:
            serializer.save()

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        # HOD can only see users in their department
        if self.request.user.role == 'hod' and self.request.user.department:
            queryset = queryset.filter(department=self.request.user.department)
        return queryset

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Student.objects.all()
        # HOD can only see students in their department
        if self.request.user.role == 'hod' and self.request.user.department:
            queryset = queryset.filter(user__department=self.request.user.department)
        elif self.request.user.role == 'staff' and self.request.user.department:
            queryset = queryset.filter(user__department=self.request.user.department)
        return queryset.order_by('reg_no', 'user__username')

    def create(self, request, *args, **kwargs):
        user = request.user
        is_advisor = (user.role == 'staff' and hasattr(user, 'staff') and user.staff.staff_type == 'Advisor')
        if user.role != 'hod' and not is_advisor:
            return Response({'detail': 'Only Advisors and HODs can create students.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        if self.request.user.department:
            serializer.validated_data['user']['department'] = self.request.user.department
        serializer.save()

    def perform_destroy(self, instance):
        instance.user.delete()

    def destroy(self, request, *args, **kwargs):
        user = request.user
        is_advisor = (user.role == 'staff' and hasattr(user, 'staff') and user.staff.staff_type == 'Advisor')
        if user.role != 'hod' and not is_advisor:
            return Response({'detail': 'Only Advisors and HODs can delete students.'}, status=status.HTTP_403_FORBIDDEN)
        student = self.get_object()
        if student.user.department != user.department:
            return Response({'detail': 'Not authorized to delete this student.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        is_advisor = (user.role == 'staff' and hasattr(user, 'staff') and user.staff.staff_type == 'Advisor')
        if user.role != 'hod' and not is_advisor:
            return Response({'detail': 'Only Advisors and HODs can edit students.'}, status=status.HTTP_403_FORBIDDEN)
        student = self.get_object()
        if student.user.department != user.department:
            return Response({'detail': 'Not authorized to edit this student.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['POST'], url_path='bulk_create')
    def bulk_create(self, request):
        user = request.user
        is_advisor = (user.role == 'staff' and hasattr(user, 'staff') and user.staff.staff_type == 'Advisor')
        if user.role != 'hod' and not is_advisor:
            return Response({'detail': 'Only Advisors and HODs can perform bulk addition of students.'}, status=status.HTTP_403_FORBIDDEN)
            
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
            
        filename = file_obj.name.lower()
        if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
            return Response({'detail': 'Please upload a CSV (.csv) or Excel (.xlsx, .xls) file.'}, status=status.HTTP_400_BAD_REQUEST)
            
        import csv
        import io
        from django.db import transaction
        
        fieldnames = []
        rows_data = []
        
        if filename.endswith('.csv'):
            encodings = ['utf-8', 'utf-8-sig', 'latin-1']
            reader = None
            decoded = None
            decode_error = None
            
            for enc in encodings:
                try:
                    file_obj.seek(0)
                    decoded = io.TextIOWrapper(file_obj.file, encoding=enc)
                    reader = csv.DictReader(decoded)
                    fieldnames = reader.fieldnames
                    if fieldnames is not None:
                        break
                except Exception as e:
                    decode_error = e
                    if decoded:
                        try:
                            decoded.detach()
                        except Exception:
                            pass
                    continue
            else:
                return Response({'detail': f'Error reading CSV file: {str(decode_error)}'}, status=status.HTTP_400_BAD_REQUEST)
                
            if fieldnames is None:
                fieldnames = []
                
            for row in reader:
                # Skip completely empty rows
                if not row or all(v is None or not str(v).strip() for v in row.values()):
                    continue
                row['_row_idx'] = reader.line_num
                rows_data.append(row)
        else:
            try:
                import openpyxl
                file_obj.seek(0)
                wb = openpyxl.load_workbook(file_obj, data_only=True)
                sheet = wb.active
                
                rows_generator = sheet.iter_rows(values_only=True)
                header_row = next(rows_generator, None)
                if not header_row:
                    return Response({'detail': 'Excel file is empty.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                fieldnames = [str(h).strip() if h is not None else '' for h in header_row]
                
                for excel_row_idx, row_values in enumerate(rows_generator, start=2):
                    # Skip completely empty rows
                    if not row_values or all(v is None or not str(v).strip() for v in row_values):
                        continue
                        
                    row_dict = {}
                    for col_idx, val in enumerate(row_values):
                        if col_idx < len(fieldnames):
                            h = fieldnames[col_idx]
                            if h:
                                row_dict[h] = val if val is not None else ''
                    row_dict['_row_idx'] = excel_row_idx
                    rows_data.append(row_dict)
            except Exception as e:
                return Response({'detail': f'Error reading Excel file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
                
        if not fieldnames:
            return Response({'detail': 'CSV file is empty or invalid.'}, status=status.HTTP_400_BAD_REQUEST)
            
        headers = {self._normalize_header(h): h for h in fieldnames if h}
        
        required_normalized = ['username', 'password', 'class', 'year']
        missing = [req for req in required_normalized if req not in headers]
        if missing:
            return Response({'detail': f'Missing required CSV columns: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_count = 0
        failed_count = 0
        errors = []
        classes_to_update = set()
        
        for row in rows_data:
            row_idx = row['_row_idx']
            
            def get_val(norm_name, default=''):
                orig_name = headers.get(norm_name)
                if orig_name and orig_name in row:
                    val = row[orig_name]
                    return str(val).strip() if val is not None else default
                return default
                
            username = get_val('username')
            email = get_val('collegemail') or get_val('email') or get_val('mail')
            reg_no = get_val('registerno') or get_val('regno')
            roll_no = get_val('rollno')
            age_val = get_val('age')
            mobile_no = get_val('mobileno') or get_val('phone')
            class_name = get_val('class')
            year_val = get_val('year')
            tutor_val = get_val('tutor')
            advisor_val = get_val('advisor')
            password = get_val('password')
            
            row_errors = []
            if not username:
                row_errors.append("Username is empty.")
            if not password:
                row_errors.append("Password is empty.")
            if not class_name or not year_val:
                row_errors.append("Invalid class")
            elif not year_val.isdigit():
                row_errors.append("Invalid class")
                
            if username and User.objects.filter(username=username).exists():
                row_errors.append("Username already exists")
                
            if reg_no and Student.objects.filter(reg_no=reg_no).exists():
                row_errors.append(f"Student with registration number '{reg_no}' already exists.")
                
            selected_class = None
            if class_name and year_val.isdigit():
                selected_class = self._find_class(class_name, int(year_val), request.user.department)
                if not selected_class:
                    row_errors.append("Class not found")
                    
            if row_errors:
                failed_count += 1
                for err in row_errors:
                    errors.append(f"Row {row_idx}: {err}")
                continue
                
            classes_to_update.add(selected_class)
            
            tutor_user = None
            if tutor_val:
                tutor_user = User.objects.filter(username=tutor_val, role__in=['staff', 'hod']).first()
            advisor_user = None
            if advisor_val:
                advisor_user = User.objects.filter(username=advisor_val, role__in=['staff', 'hod']).first()
                
            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password,
                        role='student',
                        department=request.user.department,
                        phone_number=mobile_no,
                        age=int(age_val) if age_val.isdigit() else None
                    )
                    student = Student(
                        user=user,
                        student_class=selected_class,
                        roll_no=roll_no,
                        reg_no=reg_no,
                        tutor=tutor_user,
                        advisor=advisor_user
                    )
                    student.save(skip_auto_assign=True)
                    created_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Row {row_idx}: Failed to create student: {str(e)}")
                
        for cls in classes_to_update:
            if cls:
                cls.auto_assign_tutors(force=True)
                
        return Response({
            'success': True,
            'created': created_count,
            'failed': failed_count,
            'errors': errors
        }, status=status.HTTP_200_OK)

    def _normalize_header(self, h):
        return h.lower().replace(' ', '').replace('_', '').replace('-', '')

    def _find_class(self, class_str, year_val, dept):
        if not class_str or year_val is None:
            return None
        class_str_clean = class_str.strip().lower()
        classes = Class.objects.filter(department=dept, year=year_val)
        for c in classes:
            if class_str_clean == str(c).lower():
                return c
        for c in classes:
            if c.name.lower() in class_str_clean and c.section.lower() in class_str_clean:
                return c
        for c in classes:
            if c.name.lower() == class_str_clean:
                return c
        for c in classes:
            if class_str_clean in c.name.lower() or c.name.lower() in class_str_clean:
                return c
        return None

class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Staff.objects.all()
        # HOD can only see staff in their department
        if self.request.user.role == 'hod' and self.request.user.department:
            queryset = queryset.filter(user__department=self.request.user.department)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role == 'hod' and self.request.user.department:
            serializer.validated_data['user']['department'] = self.request.user.department
        serializer.save()

    def perform_destroy(self, instance):
        instance.user.delete()

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_hod_dashboard_stats(request):
    if request.user.role != 'hod':
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
    department = request.user.department
    students = Student.objects.filter(user__department=department)
    total_students = students.count()
    total_staff = Staff.objects.filter(user__department=department).count()
    
    import datetime
    today = datetime.date.today()
    from attendance.models import Attendance
    from leave.models import Leave
    from accounts.models import Class
    
    present_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='Present'
    ).count()
    
    absent_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='Absent'
    ).count()
    
    od_students_today = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        schedule__period=1,
        status='OD'
    ).count()
    
    pending_leave_approvals = Leave.objects.filter(
        student__in=students, 
        leave_type='Leave', 
        hod_approved='Pending'
    ).count()
    
    pending_od_approvals = Leave.objects.filter(
        student__in=students, 
        leave_type='OD', 
        hod_approved='Pending'
    ).count()
    
    year_stats = []
    for y in [1, 2, 3, 4]:
        classes_in_year = Class.objects.filter(department=department, year=y)
        students_in_year = Student.objects.filter(student_class__in=classes_in_year)
        
        y_present = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='Present').count()
        y_absent = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='Absent').count()
        y_od = Attendance.objects.filter(student__in=students_in_year, date=today, schedule__period=1, status='OD').count()
        
        classes_data = []
        for cls in classes_in_year:
            cls_students = Student.objects.filter(student_class=cls)
            c_present = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Present').count()
            c_absent = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Absent').count()
            c_od = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='OD').count()
            classes_data.append({
                'class_id': cls.id,
                'class_name': str(cls),
                'present': c_present,
                'absent': c_absent,
                'od': c_od
            })
            
        year_stats.append({
            'year': y,
            'present': y_present,
            'absent': y_absent,
            'od': y_od,
            'classes': classes_data
        })
        
    return Response({
        'total_students': total_students,
        'total_staff': total_staff,
        'present_students': present_students,
        'absent_students': absent_students,
        'od_students_today': od_students_today,
        'pending_leave_approvals': pending_leave_approvals,
        'pending_od_approvals': pending_od_approvals,
        'year_stats': year_stats,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_advisor_live_attendance(request):
    if request.user.role != 'staff':
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    from accounts.models import Class
    from accounts.utils import get_live_class_attendance_matrix
    advised_class = Class.objects.filter(advisor=request.user).first()
    if not advised_class:
        return Response({'detail': 'You do not advise any class.'}, status=status.HTTP_404_NOT_FOUND)
    
    matrix = get_live_class_attendance_matrix(advised_class)
    scheds = []
    for s in matrix['schedules']:
        scheds.append({
            'id': s.id,
            'subject_name': s.subject.name,
            'period': s.period,
            'start_time': s.start_time.strftime('%H:%M'),
            'end_time': s.end_time.strftime('%H:%M')
        })
    matrix['schedules'] = scheds
    matrix['class_name'] = str(advised_class)
    matrix['class_dept'] = advised_class.department.name if advised_class.department else ''
    matrix['class_year'] = advised_class.year
    matrix['class_only_name'] = advised_class.name
    matrix['class_section'] = advised_class.section
    matrix['date'] = matrix['date'].strftime('%Y-%m-%d')
    return Response(matrix)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_hod_morning_attendance(request):
    if request.user.role != 'hod':
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
    class_id = request.query_params.get('class_id')
    if class_id:
        from accounts.models import Class
        from accounts.utils import get_live_class_attendance_matrix
        from django.shortcuts import get_object_or_404
        target_class = get_object_or_404(Class, id=class_id, department=request.user.department)
        matrix = get_live_class_attendance_matrix(target_class)
        scheds = []
        for s in matrix['schedules']:
            scheds.append({
                'id': s.id,
                'subject_name': s.subject.name,
                'period': s.period,
                'start_time': s.start_time.strftime('%H:%M'),
                'end_time': s.end_time.strftime('%H:%M')
            })
        matrix['schedules'] = scheds
        matrix['class_name'] = str(target_class)
        matrix['class_dept'] = target_class.department.name if target_class.department else ''
        matrix['class_year'] = target_class.year
        matrix['class_only_name'] = target_class.name
        matrix['class_section'] = target_class.section
        matrix['date'] = matrix['date'].strftime('%Y-%m-%d')
        return Response(matrix)
        
    from accounts.models import Class, Student
    from attendance.models import Attendance
    import datetime
    
    today = datetime.date.today()
    classes = Class.objects.filter(department=request.user.department).select_related('advisor')
    
    result = []
    for c in classes:
        cls_students = Student.objects.filter(student_class=c)
        total_students = cls_students.count()
        
        present_count = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Present').count()
        absent_count = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='Absent').count()
        od_count = Attendance.objects.filter(student__in=cls_students, date=today, schedule__period=1, status='OD').count()
        
        advisor_name = f"{c.advisor.first_name} {c.advisor.last_name}".strip() if c.advisor else "Not Assigned"
        result.append({
            'class_id': c.id,
            'class_name': c.name,
            'year': c.year,
            'section': c.section,
            'total_students': total_students,
            'present_count': present_count,
            'absent_count': absent_count,
            'od_count': od_count,
            'advisor_name': advisor_name
        })
        
    return Response(result)


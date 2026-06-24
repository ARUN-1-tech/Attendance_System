from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from .models import User, Department, Class, Subject, Student, Staff
from django.views.decorators.csrf import ensure_csrf_cookie
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
        now = timezone.now()
        one_minute_ago = now - timedelta(minutes=1)
        active_otp = OTP.objects.filter(
            creator=user,
            is_active=True,
            created_at__gte=one_minute_ago
        ).order_by('-created_at').first()
        if active_otp:
            data['active_otp_session'] = {
                'otp_id': active_otp.id,
                'code': active_otp.code
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
        
    if not is_reg_no_login and User.objects.filter(username=username, role='student').exists():
        return Response({'detail': 'Students must log in only with registration number.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        serializer = UserSerializer(user)
        user_data = serializer.data
        if user.role == 'student' and hasattr(user, 'student'):
            user_data['student_details'] = StudentSerializer(user.student).data
        elif user.role in ['staff', 'hod'] and hasattr(user, 'staff'):
            user_data['staff_details'] = StaffSerializer(user.staff).data
            
        user_data = enrich_user_data(user, user_data)
        return Response({
            'detail': 'Logged in successfully',
            'user': user_data
        })
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

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
        return queryset

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
            
        import csv
        import io
        from django.db import transaction
        
        try:
            decoded_file = file_obj.read().decode('utf-8-sig')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            return Response({'detail': f'Error reading CSV file: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
            
        if not reader.fieldnames:
            return Response({'detail': 'CSV file is empty or invalid.'}, status=status.HTTP_400_BAD_REQUEST)

        # Normalise headers to lower case and remove spaces/underscores/hyphens
        headers = {self._normalize_header(h): h for h in reader.fieldnames}
        
        # Check basic columns
        required_normalized = ['username', 'password', 'class', 'year']
        missing = [req for req in required_normalized if req not in headers]
        if missing:
            return Response({'detail': f'Missing required CSV columns: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)
            
        created_count = 0
        errors = []
        classes_to_update = set()
        
        try:
            with transaction.atomic():
                for row_idx, row in enumerate(reader, start=1):
                    def get_val(norm_name, default=''):
                        orig_name = headers.get(norm_name)
                        return row.get(orig_name, default) if orig_name else default
                        
                    username = get_val('username').strip()
                    email = get_val('collagemail').strip() or get_val('email').strip() or get_val('mail').strip()
                    reg_no = get_val('registerno').strip() or get_val('reg_no').strip() or get_val('regno').strip()
                    roll_no = get_val('rollno').strip() or get_val('roll_no').strip()
                    age_val = get_val('age').strip()
                    mobile_no = get_val('mobileno').strip() or get_val('mobile_no').strip() or get_val('phone_number').strip() or get_val('phone').strip()
                    class_name = get_val('class').strip()
                    year_val = get_val('year').strip()
                    tutor_val = get_val('tutor').strip()
                    advisor_val = get_val('advisor').strip()
                    password = get_val('password').strip() or 'password123'
                    
                    if not username:
                        errors.append(f"Row {row_idx}: Username is empty.")
                        continue
                    if User.objects.filter(username=username).exists():
                        errors.append(f"Row {row_idx}: User with username '{username}' already exists.")
                        continue
                    if reg_no and Student.objects.filter(reg_no=reg_no).exists():
                        errors.append(f"Row {row_idx}: Student with registration number '{reg_no}' already exists.")
                        continue
                    if not year_val.isdigit():
                        errors.append(f"Row {row_idx}: Year must be a number.")
                        continue
                        
                    selected_class = self._find_class(class_name, int(year_val), request.user.department)
                    if not selected_class:
                        errors.append(f"Row {row_idx}: Class '{class_name}' for year '{year_val}' not found in your department.")
                        continue
                        
                    classes_to_update.add(selected_class)
                    
                    tutor_user = None
                    if tutor_val:
                        tutor_user = User.objects.filter(username=tutor_val, role__in=['staff', 'hod']).first()
                    advisor_user = None
                    if advisor_val:
                        advisor_user = User.objects.filter(username=advisor_val, role__in=['staff', 'hod']).first()
                        
                    try:
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
                        errors.append(f"Row {row_idx}: Failed to create student: {str(e)}")
                        
                if not errors:
                    for cls in classes_to_update:
                        cls.auto_assign_tutors(force=True)
                        
                if errors:
                    transaction.set_rollback(True)
                    return Response({'detail': 'Validation failed.', 'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': f'Database error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        return Response({'detail': f'Successfully imported {created_count} students.', 'count': created_count})

    def _normalize_header(self, h):
        return h.lower().replace(' ', '').replace('_', '').replace('-', '')

    def _find_class(self, class_str, year_val, dept):
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
        return classes.first()

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


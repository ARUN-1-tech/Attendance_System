from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from .models import User, Department, Class, Subject, Student, Staff
from .serializers import (
    UserSerializer, DepartmentSerializer, ClassSerializer, 
    SubjectSerializer, StudentSerializer, StaffSerializer
)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        login(request, user)
        serializer = UserSerializer(user)
        user_data = serializer.data
        if user.role == 'student' and hasattr(user, 'student'):
            user_data['student_details'] = StudentSerializer(user.student).data
        elif user.role in ['staff', 'hod'] and hasattr(user, 'staff'):
            user_data['staff_details'] = StaffSerializer(user.staff).data
            
        return Response({
            'detail': 'Logged in successfully',
            'user': user_data
        })
    return Response({'detail': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST', 'GET'])
@permission_classes([permissions.IsAuthenticated])
def api_logout(request):
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
        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(department_id=dept_id)
        if self.request.user.role in ['staff', 'hod'] and self.request.user.department:
            queryset = queryset.filter(department=self.request.user.department)
        return queryset

    def perform_create(self, serializer):
        if self.request.user.role == 'hod' and self.request.user.department:
            serializer.save(department=self.request.user.department)
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

    def perform_create(self, serializer):
        if self.request.user.role == 'hod' and self.request.user.department:
            serializer.validated_data['user']['department'] = self.request.user.department
        serializer.save()

    def perform_destroy(self, instance):
        instance.user.delete()

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
    
    present_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='Present'
    ).values('student').distinct().count()
    
    absent_students = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='Absent'
    ).values('student').distinct().count()
    
    od_students_today = Attendance.objects.filter(
        student__in=students, 
        date=today, 
        status='OD'
    ).values('student').distinct().count()
    
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
    
    return Response({
        'total_students': total_students,
        'total_staff': total_staff,
        'present_students': present_students,
        'absent_students': absent_students,
        'od_students_today': od_students_today,
        'pending_leave_approvals': pending_leave_approvals,
        'pending_od_approvals': pending_od_approvals,
    })

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def api_hod_morning_attendance(request):
    if request.user.role != 'hod':
        return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
    from attendance.models import Attendance
    from django.db.models import Count, Q
    
    grouped_data = Attendance.objects.filter(
        student__student_class__department=request.user.department,
        schedule__period=1
    ).values(
        'date', 
        'student__student_class__id',
        'student__student_class__name',
        'student__student_class__section',
        'student__student_class__year',
        'student__student_class__advisor__username',
        'student__student_class__advisor__first_name',
        'student__student_class__advisor__last_name'
    ).annotate(
        total_students=Count('id'),
        present_count=Count('id', filter=Q(status='Present')),
        absent_count=Count('id', filter=Q(status='Absent')),
        od_count=Count('id', filter=Q(status='OD')),
    ).order_by('-date', 'student__student_class__name')
    
    result = []
    for g in grouped_data:
        g_copy = dict(g)
        g_copy['date'] = g['date'].strftime('%Y-%m-%d')
        result.append(g_copy)
        
    return Response(result)


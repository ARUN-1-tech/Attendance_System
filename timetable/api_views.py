from rest_framework import viewsets, permissions
from .models import Schedule
from .serializers import ScheduleSerializer

class ScheduleViewSet(viewsets.ModelViewSet):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Schedule.objects.all()
        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(student_class_id=class_id)
        
        day = self.request.query_params.get('day')
        if day:
            queryset = queryset.filter(day=day)

        # Staff can only see schedules for their department
        if self.request.user.role in ['staff', 'hod'] and self.request.user.department:
            queryset = queryset.filter(student_class__department=self.request.user.department)
        
        # Student can only see schedules for their class
        elif self.request.user.role == 'student' and hasattr(self.request.user, 'student'):
            student_class = self.request.user.student.student_class
            if student_class:
                queryset = queryset.filter(student_class=student_class)
            else:
                queryset = Schedule.objects.none()

        return queryset

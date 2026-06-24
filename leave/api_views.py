from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from .models import Leave
from .serializers import LeaveSerializer
from accounts.models import Student
from attendance.models import Attendance

class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.all()
    serializer_class = LeaveSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Leave.objects.all()

        if user.role == 'student':
            if hasattr(user, 'student'):
                queryset = queryset.filter(student=user.student)
            else:
                queryset = Leave.objects.none()
        elif user.role == 'staff':
            if not hasattr(user, 'staff') or user.staff.staff_type == 'Normal':
                queryset = Leave.objects.none()
            else:
                queryset = queryset.filter(
                    Q(student__tutor=user) | Q(student__advisor=user)
                )
        elif user.role == 'hod':
            queryset = queryset.filter(
                student__user__department=user.department
            )
        return queryset

    def perform_create(self, serializer):
        student = self.request.user.student
        serializer.save(student=student)

    @action(detail=True, methods=['post'])
    def upload_proof(self, request, pk=None):
        leave = self.get_object()
        if request.user.role != 'student' or leave.student.user != request.user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        if leave.certificate_deadline and timezone.now() > leave.certificate_deadline:
            return Response({'detail': 'The 10-day deadline to upload proof has passed.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if 'proof' in request.FILES:
            leave.proof = request.FILES['proof']
            leave.save()
            return Response({'detail': 'Proof uploaded successfully'})
        return Response({'detail': 'No proof file provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        user = request.user
        action_type = request.data.get('action') # 'Approve' or 'Reject'

        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if action_type == 'Reject':
            if user.role == 'staff':
                if not hasattr(user, 'staff') or user.staff.staff_type == 'Normal':
                    return Response({'detail': 'Not authorized to reject leaves'}, status=status.HTTP_403_FORBIDDEN)
                
                rejected = False
                if user == leave.student.tutor and leave.tutor_approved == 'Pending':
                    leave.tutor_approved = 'Rejected'
                    rejected = True
                elif user == leave.student.advisor and leave.tutor_approved == 'Approved' and leave.advisor_approved == 'Pending':
                    leave.advisor_approved = 'Rejected'
                    rejected = True
                
                if rejected:
                    leave.final_status = 'Rejected'
                else:
                    return Response({'detail': 'Not authorized to reject at this stage'}, status=status.HTTP_400_BAD_REQUEST)
            elif user.role == 'hod':
                leave.hod_approved = 'Rejected'
                leave.final_status = 'Rejected'
            leave.save()
            return Response({'detail': 'Leave status marked as Rejected'})
        
        elif action_type == 'Approve':
            if user.role == 'staff':
                if not hasattr(user, 'staff') or user.staff.staff_type == 'Normal':
                    return Response({'detail': 'Not authorized to approve leaves'}, status=status.HTTP_403_FORBIDDEN)
                
                approved_as = []
                if user == leave.student.tutor and leave.tutor_approved == 'Pending':
                    leave.tutor_approved = 'Approved'
                    approved_as.append("Tutor")
                
                if user == leave.student.advisor and leave.tutor_approved == 'Approved' and leave.advisor_approved == 'Pending':
                    leave.advisor_approved = 'Approved'
                    approved_as.append("Advisor")
                
                if approved_as:
                    leave.save()
                    return Response({'detail': f"Approved successfully as {' and '.join(approved_as)}"})
                else:
                    return Response({'detail': 'Not authorized to approve at this stage'}, status=status.HTTP_400_BAD_REQUEST)
                    
            elif user.role == 'hod':
                if leave.advisor_approved == 'Approved' and leave.hod_approved == 'Pending':
                    leave.hod_approved = 'Approved'
                    leave.final_status = 'Approved'
                    
                    if leave.leave_type == 'OD':
                        leave.certificate_deadline = timezone.now() + timedelta(days=10)
                        
                    # Update attendance records
                    Attendance.objects.filter(student=leave.student, date=leave.date).update(status=leave.leave_type)
                    leave.save()
                    return Response({'detail': 'Approved successfully by HOD'})
                else:
                    return Response({'detail': 'Leave not ready for HOD approval'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def verify_certificate(self, request, pk=None):
        leave = self.get_object()
        user = request.user
        action_type = request.data.get('action') # 'Approve' or 'Reject'

        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if user.role == 'staff' and leave.student.tutor != user:
            return Response({'detail': "Only the student's tutor can verify this certificate."}, status=status.HTTP_403_FORBIDDEN)

        if action_type == 'Approve':
            leave.certificate_verified = True
            leave.save()
            return Response({'detail': 'OD Certificate verified'})
        elif action_type == 'Reject':
            leave.certificate_verified = False
            leave.save()
            return Response({'detail': 'OD Certificate rejected'})
            
        return Response({'detail': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='cleanup')
    def cleanup(self, request):
        user = request.user
        if user.role not in ['staff', 'hod']:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            
        if user.role == 'hod':
            students = Student.objects.filter(user__department=user.department)
            Leave.objects.filter(
                student__in=students,
                is_archived=False
            ).exclude(hod_approved='Pending').update(is_archived=True)
            return Response({'detail': 'Cleaned up processed HOD approvals'})
            
        elif user.role == 'staff':
            if not hasattr(user, 'staff') or user.staff.staff_type == 'Normal':
                return Response({'detail': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
            elif user.staff.staff_type == 'Tutor':
                Leave.objects.filter(
                    student__tutor=user,
                    is_archived=False
                ).exclude(tutor_approved='Pending').update(is_archived=True)
            elif user.staff.staff_type == 'Advisor':
                Leave.objects.filter(
                    student__advisor=user,
                    is_archived=False
                ).exclude(advisor_approved='Pending').update(is_archived=True)
            return Response({'detail': 'Cleaned up processed Staff approvals'})

        return Response({'detail': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

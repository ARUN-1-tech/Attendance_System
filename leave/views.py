from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from datetime import timedelta, date
from django.utils import timezone

from .models import Leave
from accounts.models import Student, Staff
from attendance.models import Attendance, Schedule

@login_required
def apply_leave(request):
    if request.user.role != 'student':
        messages.error(request, "Only students can apply for leave.")
        return redirect('login')

    if request.method == 'POST':
        leave_type = request.POST.get('leave_type')
        leave_date = request.POST.get('date')
        reason = request.POST.get('reason')
        
        student = request.user.student
        Leave.objects.create(
            student=student,
            date=leave_date,
            leave_type=leave_type,
            reason=reason
        )
        messages.success(request, f"{leave_type} request submitted for {leave_date}.")
        return redirect('leave_od_status')

@login_required
def upload_proof(request, leave_id):
    if request.user.role != 'student':
        return redirect('login')
        
    leave = get_object_or_404(Leave, id=leave_id, student=request.user.student)
    if request.method == 'POST':
        if leave.certificate_deadline and timezone.now() > leave.certificate_deadline:
            messages.error(request, "The 10-day deadline to upload proof has passed.")
            return redirect('leave_od_status')
            
        if 'proof' in request.FILES:
            leave.proof = request.FILES['proof']
            leave.save()
            messages.success(request, "Proof uploaded successfully.")
        return redirect('leave_od_status')

@login_required
def approve_leave(request, leave_id):
    if request.user.role not in ['staff', 'hod']:
        messages.error(request, "Unauthorized")
        return redirect('login')

    leave = get_object_or_404(Leave, id=leave_id)
    action = request.POST.get('action') # 'Approve' or 'Reject'
    
    if action == 'Reject':
        # If any rejects, set final status right away
        leave.final_status = 'Rejected'
        if request.user.role == 'staff':
            if request.user == leave.student.tutor:
                leave.tutor_approved = 'Rejected'
            if request.user == leave.student.advisor:
                leave.advisor_approved = 'Rejected'
        elif request.user.role == 'hod':
            leave.hod_approved = 'Rejected'
        messages.success(request, "Leave Rejected.")
    else:
        # Action is Approve
        if request.user.role == 'staff':
            approved_as = []
            if request.user == leave.student.tutor and leave.tutor_approved == 'Pending':
                leave.tutor_approved = 'Approved'
                approved_as.append("Tutor")
            
            if request.user == leave.student.advisor and leave.tutor_approved == 'Approved' and leave.advisor_approved == 'Pending':
                leave.advisor_approved = 'Approved'
                approved_as.append("Advisor")
            
            if approved_as:
                messages.success(request, f"Leave Approved as {' and '.join(approved_as)}.")
            else:
                messages.error(request, "You are not authorized to approve this at this stage.")
                
        elif request.user.role == 'hod':
            if leave.advisor_approved == 'Approved' and leave.hod_approved == 'Pending':
                leave.hod_approved = 'Approved'
                leave.final_status = 'Approved'
                
                if leave.leave_type == 'OD':
                    from django.utils import timezone
                    leave.certificate_deadline = timezone.now() + timedelta(days=10)
                    
                # Update attendance records for that day to 'Leave' or 'OD'
                Attendance.objects.filter(student=leave.student, date=leave.date).update(status=leave.leave_type)
                messages.success(request, "Leave Approved by HOD.")
            else:
                messages.error(request, "This leave is not ready for HOD approval.")
                
    leave.save()
    
    if request.user.role == 'hod':
        referer = request.META.get('HTTP_REFERER')
        if referer:
            return redirect(referer)
        return redirect('hod_dashboard')
    
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('staff_dashboard')

@login_required
def verify_certificate(request, leave_id):
    if request.user.role not in ['staff', 'hod']:
        messages.error(request, "Unauthorized")
        return redirect('login')

    leave = get_object_or_404(Leave, id=leave_id)
    
    if request.user.role == 'staff' and leave.student.tutor != request.user:
        messages.error(request, "Only the student's tutor can verify this certificate.")
        return redirect('staff_dashboard')
        
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'Approve':
            leave.certificate_verified = True
            leave.save()
            messages.success(request, "OD Certificate verified successfully.")
        elif action == 'Reject':
            leave.certificate_verified = False
            leave.save()
            messages.error(request, "OD Certificate rejected.")
            
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('staff_dashboard' if request.user.role == 'staff' else 'hod_dashboard')

@login_required
def cleanup_approvals(request):
    if request.user.role not in ['staff', 'hod']:
        messages.error(request, "Unauthorized")
        return redirect('login')
        
    if request.method == 'POST':
        from django.db.models import Q
        today = timezone.now().date()
        
        if request.user.role == 'hod':
            # Archive for all HOD processed leaves
            department = request.user.department
            students = Student.objects.filter(user__department=department)
            Leave.objects.filter(
                student__in=students,
                is_archived=False
            ).exclude(hod_approved='Pending').update(is_archived=True)
            messages.success(request, "Cleaned up processed HOD approvals.")
            
        elif request.user.role == 'staff':
            # Archive for staff
            Leave.objects.filter(
                is_archived=False
            ).filter(
                (Q(student__tutor=request.user) & ~Q(tutor_approved='Pending')) | 
                (Q(student__advisor=request.user) & ~Q(advisor_approved='Pending'))
            ).update(is_archived=True)
            
            messages.success(request, "Cleaned up processed Staff approvals.")
            
    referer = request.META.get('HTTP_REFERER')
    if referer:
        return redirect(referer)
    return redirect('staff_dashboard' if request.user.role == 'staff' else 'hod_dashboard')

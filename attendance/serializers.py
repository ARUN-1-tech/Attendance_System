from rest_framework import serializers
from .models import OTP, Attendance
from timetable.serializers import ScheduleSerializer
from accounts.serializers import StudentSerializer

class OTPSerializer(serializers.ModelSerializer):
    schedule_details = ScheduleSerializer(source='schedule', read_only=True)

    class Meta:
        model = OTP
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)
    schedule_details = ScheduleSerializer(source='schedule', read_only=True)

    class Meta:
        model = Attendance
        fields = '__all__'

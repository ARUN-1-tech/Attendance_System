from rest_framework import serializers
from .models import Schedule
from accounts.serializers import SubjectSerializer, ClassSerializer

class ScheduleSerializer(serializers.ModelSerializer):
    subject_details = SubjectSerializer(source='subject', read_only=True)
    class_details = ClassSerializer(source='student_class', read_only=True)

    class Meta:
        model = Schedule
        fields = '__all__'

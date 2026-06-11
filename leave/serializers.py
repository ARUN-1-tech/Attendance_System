from rest_framework import serializers
from .models import Leave
from accounts.serializers import StudentSerializer

class LeaveSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(source='student', read_only=True)

    class Meta:
        model = Leave
        fields = '__all__'
        read_only_fields = ['student']

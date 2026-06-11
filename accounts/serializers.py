from rest_framework import serializers
from .models import User, Department, Class, Subject, Student, Staff

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'department', 'department_name', 'phone_number', 'age', 'is_superuser', 'password', 'dob']
        extra_kwargs = {
            'password': {'write_only': True}
        }

class ClassSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    tutor1_name = serializers.CharField(source='tutor1.username', read_only=True)
    tutor2_name = serializers.CharField(source='tutor2.username', read_only=True)
    tutor3_name = serializers.CharField(source='tutor3.username', read_only=True)
    advisor_name = serializers.CharField(source='advisor.username', read_only=True)

    class Meta:
        model = Class
        fields = '__all__'
        extra_kwargs = {
            'department': {'required': False}
        }

class SubjectSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = Subject
        fields = '__all__'

class StudentSerializer(serializers.ModelSerializer):
    user = UserSerializer()
    class_name = serializers.CharField(source='student_class.name', read_only=True)
    class_year = serializers.IntegerField(source='student_class.year', read_only=True)
    class_section = serializers.CharField(source='student_class.section', read_only=True)
    tutor_name = serializers.CharField(source='tutor.username', read_only=True)
    advisor_name = serializers.CharField(source='advisor.username', read_only=True)
    class_advisor_id = serializers.IntegerField(source='student_class.advisor.id', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 'student'
        password = user_data.pop('password', 'password123')
        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()
        student = Student.objects.create(user=user, **validated_data)
        return student

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            user.username = user_data.get('username', user.username)
            user.email = user_data.get('email', user.email)
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.phone_number = user_data.get('phone_number', user.phone_number)
            user.age = user_data.get('age', user.age)
            user.dob = user_data.get('dob', user.dob)
            password = user_data.get('password')
            if password:
                user.set_password(password)
            user.save()
        
        instance.student_class = validated_data.get('student_class', instance.student_class)
        instance.tutor = validated_data.get('tutor', instance.tutor)
        instance.advisor = validated_data.get('advisor', instance.advisor)
        instance.save()
        return instance

class StaffSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Staff
        fields = '__all__'

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['role'] = 'staff'
        password = user_data.pop('password', 'password123')
        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()
        staff = Staff.objects.create(user=user, **validated_data)
        return staff

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user = instance.user
            user.username = user_data.get('username', user.username)
            user.email = user_data.get('email', user.email)
            user.first_name = user_data.get('first_name', user.first_name)
            user.last_name = user_data.get('last_name', user.last_name)
            user.phone_number = user_data.get('phone_number', user.phone_number)
            user.age = user_data.get('age', user.age)
            user.dob = user_data.get('dob', user.dob)
            password = user_data.get('password')
            if password:
                user.set_password(password)
            user.save()

        instance.staff_type = validated_data.get('staff_type', instance.staff_type)
        instance.save()
        return instance

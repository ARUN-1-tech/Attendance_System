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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'department', 'department_name', 'phone_number', 'is_superuser', 'password', 'dob', 'profile_photo']
        extra_kwargs = {
            'password': {'write_only': True},
            'username': {
                'validators': []
            }
        }

    def validate_username(self, value):
        user_id = None
        if self.instance:
            user_id = self.instance.id
        elif self.root and getattr(self.root, 'instance', None):
            instance = self.root.instance
            if hasattr(instance, 'user'):
                user_id = instance.user.id
            elif isinstance(instance, User):
                user_id = instance.id

        qs = User.objects.filter(username=value)
        if user_id:
            qs = qs.exclude(id=user_id)
        if qs.exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

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
    class_name = serializers.CharField(source='student_class.name', read_only=True)

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
    attendance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = '__all__'

    def get_attendance_percentage(self, obj):
        if self.context is not None and 'attendance_percentages' not in self.context:
            student_ids = []
            parent = self.parent
            if parent and hasattr(parent, 'instance'):
                instances = parent.instance
                # instances can be a QuerySet or list
                try:
                    student_ids = [s.user_id for s in instances if hasattr(s, 'user_id')]
                except TypeError:
                    student_ids = [obj.user_id]
            else:
                student_ids = [obj.user_id]
                
            if not student_ids:
                student_ids = [obj.user_id]

            from collections import defaultdict
            from django.db.models import Q
            from attendance.models import Attendance
            from leave.models import Leave
            from timetable.models import Schedule
            from accounts.models import Subject

            # Prefetch active attendances for all students in batch
            active_atts = Attendance.objects.filter(
                student_id__in=student_ids
            ).filter(
                ~Q(schedule__period=8) | Q(schedule__period=8, status='Present')
            ).values('student_id', 'status', 'date')
            
            # Prefetch approved OD leaves for all students in batch
            verified_ods = Leave.objects.filter(
                student_id__in=student_ids,
                leave_type='OD',
                final_status='Approved',
                certificate_verified=True
            ).values('student_id', 'date')
            
            ods_by_student = defaultdict(set)
            for l in verified_ods:
                ods_by_student[l['student_id']].add(l['date'])
                
            stats_by_student = defaultdict(lambda: {'total': 0, 'present': 0, 'od': 0})
            for att in active_atts:
                sid = att['student_id']
                status = att['status']
                dt = att['date']
                
                stats_by_student[sid]['total'] += 1
                if status == 'Present':
                    stats_by_student[sid]['present'] += 1
                elif status == 'OD' and dt in ods_by_student[sid]:
                    stats_by_student[sid]['od'] += 1
                    
            percentages = {}
            for sid in student_ids:
                stats = stats_by_student[sid]
                tot = stats['total']
                if tot == 0:
                    percentages[sid] = 100.0
                else:
                    eff_pres = stats['present'] + stats['od']
                    percentages[sid] = round((eff_pres / tot * 100), 2)
                    
            self.context['attendance_percentages'] = percentages

        percentages = self.context.get('attendance_percentages', {}) if self.context else {}
        if obj.user_id in percentages:
            return percentages[obj.user_id]

        # Fallback to single student calculation if not batching
        from attendance.models import Attendance, filter_active_attendance
        from leave.models import Leave
        
        attendances = Attendance.objects.filter(student=obj)
        attendances = filter_active_attendance(attendances)
        total_periods = attendances.count()
        if total_periods == 0:
            return 100.0
            
        present_periods = attendances.filter(status='Present').count()
        verified_ods = Leave.objects.filter(
            student=obj, 
            leave_type='OD', 
            final_status='Approved', 
            certificate_verified=True
        ).values_list('date', flat=True)
        
        verified_od_count = attendances.filter(status='OD', date__in=verified_ods).count()
        effective_present = present_periods + verified_od_count
        percentage = (effective_present / total_periods * 100)
        return round(percentage, 2)

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
            user.dob = user_data.get('dob', user.dob)
            user.profile_photo = user_data.get('profile_photo', user.profile_photo)
            password = user_data.get('password')
            if password:
                user.set_password(password)
            user.save()
        
        instance.student_class = validated_data.get('student_class', instance.student_class)
        instance.tutor = validated_data.get('tutor', instance.tutor)
        instance.advisor = validated_data.get('advisor', instance.advisor)
        instance.roll_no = validated_data.get('roll_no', instance.roll_no)
        instance.reg_no = validated_data.get('reg_no', instance.reg_no)
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
            user.dob = user_data.get('dob', user.dob)
            user.profile_photo = user_data.get('profile_photo', user.profile_photo)
            password = user_data.get('password')
            if password:
                user.set_password(password)
            user.save()

        instance.staff_type = validated_data.get('staff_type', instance.staff_type)
        instance.save()
        return instance

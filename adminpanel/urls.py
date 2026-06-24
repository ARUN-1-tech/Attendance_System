from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.dashboard, name='admin_dashboard'),
    
    # Departments
    path('departments/', views.departments_list, name='admin_departments'),
    path('departments/add/', views.add_department, name='admin_add_department'),
    path('departments/edit/<int:dept_id>/', views.edit_department, name='admin_edit_department'),
    path('departments/delete/<int:dept_id>/', views.delete_department, name='admin_delete_department'),
    
    # HODs
    path('hods/', views.hods_list, name='admin_hods'),
    path('hods/add/', views.add_hod, name='admin_add_hod'),
    path('hods/edit/<int:hod_id>/', views.edit_hod, name='admin_edit_hod'),
    path('hods/delete/<int:hod_id>/', views.delete_hod, name='admin_delete_hod'),
]

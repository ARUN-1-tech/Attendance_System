from django.urls import path
from . import views

urlpatterns = [
    path('apply/', views.apply_leave, name='apply_leave'),
    path('upload-proof/<int:leave_id>/', views.upload_proof, name='upload_proof'),
    path('approve/<int:leave_id>/', views.approve_leave, name='approve_leave'),
    path('verify-certificate/<int:leave_id>/', views.verify_certificate, name='verify_certificate'),
    path('cleanup/', views.cleanup_approvals, name='cleanup_approvals'),
]

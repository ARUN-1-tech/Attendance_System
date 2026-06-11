from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('student/', include('student.urls')),
    path('staff/', include('staff.urls')),
    path('hod/', include('hod.urls')),
    path('adminpanel/', include('adminpanel.urls')),
    path('attendance/', include('attendance.urls')),
    path('leave/', include('leave.urls')),
    path('api/', include('attendance_system.api_urls')),
    path('', lambda request: redirect('login')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

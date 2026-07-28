from rest_framework.authentication import SessionAuthentication
from django.contrib.sessions.models import Session
from django.utils import timezone
from accounts.models import User

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return

    def authenticate(self, request):
        # 1. Try standard Django session authentication (cookie-based)
        user_auth_tuple = super().authenticate(request)
        if user_auth_tuple is not None:
            return user_auth_tuple

        # 2. Check for Authorization header or X-Session-ID header (cross-domain token fallback)
        header_val = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        session_key = None

        if header_val:
            parts = header_val.split()
            if len(parts) == 2 and parts[0].lower() in ('bearer', 'token', 'session'):
                session_key = parts[1]
            elif len(parts) == 1:
                session_key = parts[0]

        if not session_key:
            session_key = request.headers.get('X-Session-ID') or request.META.get('HTTP_X_SESSION_ID')

        if not session_key:
            return None

        try:
            session = Session.objects.get(session_key=session_key)
            if session.expire_date < timezone.now():
                return None
            
            session_data = session.get_decoded()
            uid = session_data.get('_auth_user_id')
            if not uid:
                return None

            user = User.objects.get(pk=uid)
            if not user.is_active:
                return None

            return (user, None)
        except Exception:
            return None
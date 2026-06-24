from accounts.utils import has_active_otp

def active_otp_processor(request):
    if request.user.is_authenticated:
        return {'hide_logout': has_active_otp(request.user)}
    return {'hide_logout': False}

import random
from datetime import timedelta
import jwt
import requests
from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse
from django.utils import timezone as dj_timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import User


def _generate_token(user_id):
    payload = {
        'id': user_id,
        'exp': dj_timezone.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
    }
    return jwt.encode(payload, settings.SIMPLE_JWT['SIGNING_KEY'], algorithm='HS256')


def _send_otp_email(email, otp):
    try:
        send_mail(
            subject='Your TeleSync Verification Code',
            message=f'Your OTP is: {otp}. Expires in 10 minutes.',
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
            html_message=f'''
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0f172a;color:#fff;border-radius:12px;">
              <h2 style="color:#3b82f6;">TeleSync</h2>
              <p style="color:#94a3b8;">Your verification code:</p>
              <div style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#fff;margin:24px 0;text-align:center;">{otp}</div>
              <p style="color:#94a3b8;font-size:13px;">Expires in <strong>10 minutes</strong>.</p>
            </div>''',
        )
    except Exception as e:
        print(f'[Email] Failed to send OTP email to {email}: {e}')
        print(f'[Email] OTP for {email}: {otp}')  # fallback for dev


def health(request):
    return JsonResponse({'status': 'OK'})


# POST /api/auth/register
@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    name = request.data.get('name')
    email = request.data.get('email')
    password = request.data.get('password')
    if not all([name, email, password]):
        return Response({'message': 'All fields are required'}, status=400)

    user = User.objects.filter(email=email).first()
    if user and user.is_verified:
        return Response({'message': 'Email already registered'}, status=400)

    otp = str(random.randint(100000, 999999))
    otp_expiry = dj_timezone.now() + timedelta(minutes=10)

    if user:
        user.name = name
        user.set_password(password)
        user.otp = otp
        user.otp_expiry = otp_expiry
        user.save()
    else:
        user = User(name=name, email=email, otp=otp, otp_expiry=otp_expiry)
        user.set_password(password)
        user.save()

    _send_otp_email(email, otp)
    return Response({'message': 'OTP sent to your email', 'email': email, 'otp': otp if settings.DEBUG else None})


# POST /api/auth/verify-otp
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({'message': 'User not found'}, status=404)
    if user.is_verified:
        return Response({'message': 'Already verified'}, status=400)
    if user.otp != otp:
        return Response({'message': 'Invalid OTP'}, status=400)
    if user.otp_expiry and dj_timezone.now() > user.otp_expiry:
        return Response({'message': 'OTP expired. Please register again'}, status=400)

    user.is_verified = True
    user.otp = None
    user.otp_expiry = None
    user.save()
    return Response({**user.to_dict(), 'token': _generate_token(user.pk)})


# POST /api/auth/resend-otp
@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    email = request.data.get('email')
    user = User.objects.filter(email=email).first()
    if not user:
        return Response({'message': 'User not found'}, status=404)
    if user.is_verified:
        return Response({'message': 'Already verified'}, status=400)

    otp = str(random.randint(100000, 999999))
    user.otp = otp
    user.otp_expiry = dj_timezone.now() + timedelta(minutes=10)
    user.save()
    _send_otp_email(email, otp)
    return Response({'message': 'OTP resent successfully'})


# POST /api/auth/login
@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = User.objects.filter(email=email).first()
    if not user or not user.check_password(password):
        return Response({'message': 'Invalid email or password'}, status=401)
    if not user.is_verified:
        return Response({'message': 'Email not verified', 'email': email}, status=403)
    return Response({**user.to_dict(), 'token': _generate_token(user.pk)})


# GET /api/auth/me
@api_view(['GET'])
def get_me(request):
    return Response(request.user.to_dict())


def _upsert_oauth_user(email, name, avatar, provider, provider_id):
    user = User.objects.filter(email=email).first()
    if user:
        if user.auth_provider == 'local':
            user.auth_provider = provider
            user.provider_id = provider_id
            user.is_verified = True
            user.save()
    else:
        user = User(name=name, email=email, avatar=avatar,
                    auth_provider=provider, provider_id=provider_id, is_verified=True)
        user.save()
    return user


# GET /api/auth/google
@api_view(['GET'])
@permission_classes([AllowAny])
def google_login(request):
    from urllib.parse import urlencode
    from django.shortcuts import redirect
    params = urlencode({
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': f'{settings.BACKEND_URL}/api/auth/google/callback',
        'response_type': 'code',
        'scope': 'openid email profile',
        'access_type': 'offline',
    })
    return redirect(f'https://accounts.google.com/o/oauth2/v2/auth?{params}')


# GET /api/auth/google/callback
def google_callback(request):
    from django.shortcuts import redirect
    from urllib.parse import urlencode
    code = request.GET.get('code')
    if not code:
        return redirect(f'{settings.CLIENT_URL}/login?error=google_failed')
    try:
        token_res = requests.post('https://oauth2.googleapis.com/token', data={
            'code': code,
            'client_id': settings.GOOGLE_CLIENT_ID,
            'client_secret': settings.GOOGLE_CLIENT_SECRET,
            'redirect_uri': f'{settings.BACKEND_URL}/api/auth/google/callback',
            'grant_type': 'authorization_code',
        }).json()
        if 'error' in token_res:
            print(f'[Google OAuth] Token error: {token_res}')
            return redirect(f'{settings.CLIENT_URL}/login?error=google_failed')
        profile = requests.get('https://www.googleapis.com/oauth2/v3/userinfo',
                               headers={'Authorization': f'Bearer {token_res["access_token"]}'}).json()
        user = _upsert_oauth_user(profile['email'], profile['name'], profile.get('picture'), 'google', profile['sub'])
        token = _generate_token(user.pk)
        return redirect(f'{settings.CLIENT_URL}/oauth-success?{urlencode({"token": token, "name": user.name, "email": user.email})}')
    except Exception as e:
        print(f'[Google OAuth] Exception: {e}')
        return redirect(f'{settings.CLIENT_URL}/login?error=google_failed')


# GET /api/auth/github
@api_view(['GET'])
@permission_classes([AllowAny])
def github_login(request):
    from urllib.parse import urlencode
    from django.shortcuts import redirect
    params = urlencode({
        'client_id': settings.GITHUB_CLIENT_ID,
        'redirect_uri': f'{settings.BACKEND_URL}/api/auth/github/callback',
        'scope': 'user:email',
    })
    return redirect(f'https://github.com/login/oauth/authorize?{params}')


# GET /api/auth/github/callback
def github_callback(request):
    from django.shortcuts import redirect
    from urllib.parse import urlencode
    code = request.GET.get('code')
    if not code:
        return redirect(f'{settings.CLIENT_URL}/login?error=github_failed')
    try:
        token_res = requests.post('https://github.com/login/oauth/access_token',
                                  data={'client_id': settings.GITHUB_CLIENT_ID,
                                        'client_secret': settings.GITHUB_CLIENT_SECRET, 'code': code},
                                  headers={'Accept': 'application/json'}).json()
        if 'error' in token_res:
            print(f'[GitHub OAuth] Token error: {token_res}')
            return redirect(f'{settings.CLIENT_URL}/login?error=github_failed')
        access_token = token_res['access_token']
        profile = requests.get('https://api.github.com/user',
                               headers={'Authorization': f'Bearer {access_token}'}).json()
        emails_res = requests.get('https://api.github.com/user/emails',
                                  headers={'Authorization': f'Bearer {access_token}'}).json()
        email = next((e['email'] for e in emails_res if e.get('primary')), f'{profile["login"]}@github.com')
        user = _upsert_oauth_user(email, profile.get('name') or profile['login'],
                                  profile.get('avatar_url'), 'github', str(profile['id']))
        token = _generate_token(user.pk)
        return redirect(f'{settings.CLIENT_URL}/oauth-success?{urlencode({"token": token, "name": user.name, "email": user.email})}')
    except Exception as e:
        print(f'[GitHub OAuth] Exception: {e}')
        return redirect(f'{settings.CLIENT_URL}/login?error=github_failed')


import random
import string
import jwt
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Account, User


# GET /api/social/accounts
@api_view(['GET'])
def get_connected_accounts(request):
    accounts = Account.objects.filter(user=request.user, status='connected')
    return Response([a.to_dict() for a in accounts])


# DELETE /api/social/accounts/:id
@api_view(['DELETE'])
def disconnect_account(request, account_id):
    account = Account.objects.filter(pk=account_id, user=request.user).first()
    if not account:
        return Response({'message': 'Account not found'}, status=404)
    account.status = 'disconnected'
    account.save()
    return Response({'message': 'Account disconnected successfully', 'account': account.to_dict()})


# GET /api/social/auth/url/:platform
@api_view(['GET'])
def generate_o_url(request, platform):
    state_token = jwt.encode({'user_id': request.user.id}, settings.SIMPLE_JWT['SIGNING_KEY'], algorithm='HS256')

    if platform in ['instagram', 'facebook']:
        import requests
        profile_id = _get_or_create_zernio_profile_id()
        if not profile_id:
            return Response({'message': 'Failed to initialize Zernio profile'}, status=500)

        redirect_uri = f"{settings.BACKEND_URL}/api/social/auth/callback/zernio?state={state_token}&platform={platform}"
        headers = {
            "Authorization": f"Bearer {settings.ZERNIO_API_KEY}"
        }
        params = {
            "profileId": profile_id,
            "redirect_url": redirect_uri
        }
        try:
            res = requests.get(f"https://zernio.com/api/v1/connect/{platform}", headers=headers, params=params, timeout=15)
            res.raise_for_status()
            auth_url = res.json().get("authUrl")
            if not auth_url:
                raise Exception("No authUrl returned from Zernio")
            return Response({'url': auth_url})
        except Exception as e:
            print(f"[Zernio] Failed to generate connect URL for {platform}: {e}")
            return Response({'message': f'Failed to generate connect URL from Zernio: {e}'}, status=500)


    elif platform == 'linkedin':
        redirect_uri = f"{settings.BACKEND_URL}/api/social/auth/callback/linkedin"
        url = (
            f"https://www.linkedin.com/oauth/v2/authorization?"
            f"response_type=code&"
            f"client_id={settings.LINKEDIN_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
            f"state={state_token}&"
            f"scope=openid%20profile%20w_member_social%20email"
        )
        return Response({'url': url})

    url = f"{settings.BACKEND_URL}/api/social/auth/callback/mock?platform={platform}&state={state_token}&redirectUrl={settings.CLIENT_URL}/accounts"
    return Response({'url': url})


# GET /api/social/accounts/sync
@api_view(['GET'])
def sync_accounts(request):
    # Simulates syncing by fetching and returning all currently connected accounts
    accounts = Account.objects.filter(user=request.user, status='connected')
    return Response([a.to_dict() for a in accounts])


# GET /api/social/auth/callback/mock
@api_view(['GET'])
@permission_classes([AllowAny])
def mock_callback(request):
    state_token = request.GET.get('state')
    try:
        payload = jwt.decode(state_token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
        user = User.objects.get(pk=payload['user_id'])
    except Exception:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=invalid_state")

    platform = request.GET.get('platform', 'unknown')
    redirect_url = request.GET.get('redirectUrl', 'http://localhost:5173/accounts')
    mock_id = 'mock_acc_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
    Account.objects.update_or_create(
        user=user, platform=platform,
        defaults={
            'handle': f'{platform}_user_mock',
            'zero_account_id': mock_id,
            'status': 'connected',
            'avatar_url': f'https://api.dicebear.com/7.x/bottts/svg?seed={platform}',
        }
    )
    return redirect(redirect_url)


# POST /api/social/accounts/telegram/connect
@api_view(['POST'])
def connect_telegram(request):
    import requests
    bot_token = request.data.get('botToken')
    channel_id = request.data.get('channelId')

    if not bot_token or not channel_id:
        return Response({'message': 'Bot Token and Channel ID are required'}, status=400)

    # 1. Verify Bot Token using getMe
    try:
        get_me_res = requests.get(f'https://api.telegram.org/bot{bot_token}/getMe', timeout=10)
        get_me_res.raise_for_status()
        bot_data = get_me_res.json()
        bot_username = bot_data.get('result', {}).get('username', 'bot')
    except Exception as e:
        return Response({'message': f'Invalid Bot Token: Could not connect to Bot API ({e})'}, status=400)

    # 2. Verify Channel ID (and if the bot is in it) using getChat
    try:
        get_chat_res = requests.get(f'https://api.telegram.org/bot{bot_token}/getChat?chat_id={channel_id}', timeout=10)
        get_chat_res.raise_for_status()
        chat_data = get_chat_res.json()
        chat_title = chat_data.get('result', {}).get('title', channel_id)
    except Exception as e:
        return Response({'message': f'Could not access channel: Make sure the bot is an Admin in the channel ({e})'}, status=400)

    # 3. Create or update Account
    Account.objects.update_or_create(
        user=request.user,
        platform='telegram',
        defaults={
            'handle': f'{channel_id} ({chat_title})',
            'zero_account_id': channel_id,
            'access_token': bot_token,
            'status': 'connected',
            'avatar_url': f'https://api.dicebear.com/7.x/bottts/svg?seed={bot_username}',
        }
    )

    return Response({'message': 'Telegram channel connected successfully!'})


# GET /api/social/auth/callback/instagram
@api_view(['GET'])
@permission_classes([AllowAny])
def instagram_callback(request):
    import requests
    state_token = request.GET.get('state')
    try:
        payload = jwt.decode(state_token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
        user = User.objects.get(pk=payload['user_id'])
    except Exception:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=invalid_state")

    code = request.GET.get('code')
    if not code:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=no_code_provided")

    redirect_uri = f"{settings.BACKEND_URL}/api/social/auth/callback/instagram"

    # 1. Exchange code for Short-Lived User Access Token
    try:
        token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "client_id": settings.FACEBOOK_CLIENT_ID,
                "redirect_uri": redirect_uri,
                "client_secret": settings.FACEBOOK_CLIENT_SECRET,
                "code": code,
            },
            timeout=15
        )
        token_res.raise_for_status()
        user_token = token_res.json().get("access_token")
    except Exception as e:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=token_exchange_failed&detail={str(e)}")

    # 2. Exchange short-lived token for long-lived User Access Token
    try:
        long_token_res = requests.get(
            "https://graph.facebook.com/v19.0/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.FACEBOOK_CLIENT_ID,
                "client_secret": settings.FACEBOOK_CLIENT_SECRET,
                "fb_exchange_token": user_token,
            },
            timeout=15
        )
        long_token_res.raise_for_status()
        long_user_token = long_token_res.json().get("access_token")
    except Exception:
        long_user_token = user_token

    # 3. Get user's connected Pages and their Instagram Business Accounts
    try:
        pages_res = requests.get(
            "https://graph.facebook.com/v19.0/me/accounts",
            params={
                "fields": "name,access_token,instagram_business_account{id,username,name,profile_picture_url}",
                "access_token": long_user_token,
            },
            timeout=15
        )
        pages_res.raise_for_status()
        pages_data = pages_res.json().get("data", [])
    except Exception as e:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=fetch_pages_failed&detail={str(e)}")

    # Find a page that has a connected Instagram Business Account
    connected_any = False
    for page in pages_data:
        ig_acc = page.get("instagram_business_account")
        if ig_acc:
            ig_id = ig_acc.get("id")
            ig_username = ig_acc.get("username")
            ig_name = ig_acc.get("name") or ig_username
            ig_avatar = ig_acc.get("profile_picture_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={ig_username}"
            page_token = page.get("access_token") or long_user_token

            # Create/Update Account
            Account.objects.update_or_create(
                user=user,
                platform='instagram',
                defaults={
                    'handle': ig_username,
                    'zero_account_id': ig_id,
                    'access_token': page_token,
                    'status': 'connected',
                    'avatar_url': ig_avatar,
                }
            )
            connected_any = True
            break

    if not connected_any:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=no_instagram_business_account_found")

    return redirect(f"{settings.CLIENT_URL}/accounts?success=instagram_connected")


# GET /api/social/auth/callback/linkedin
@api_view(['GET'])
@permission_classes([AllowAny])
def linkedin_callback(request):
    import requests
    state_token = request.GET.get('state')
    try:
        payload = jwt.decode(state_token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
        user = User.objects.get(pk=payload['user_id'])
    except Exception:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=invalid_state")

    code = request.GET.get('code')
    if not code:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=no_code_provided")

    redirect_uri = f"{settings.BACKEND_URL}/api/social/auth/callback/linkedin"

    # 1. Exchange code for access token
    try:
        token_res = requests.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=15
        )
        token_res.raise_for_status()
        access_token = token_res.json().get("access_token")
    except Exception as e:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=token_exchange_failed&detail={str(e)}")

    # 2. Get UserInfo
    try:
        profile_res = requests.get(
            "https://api.linkedin.com/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15
        )
        profile_res.raise_for_status()
        profile_data = profile_res.json()
        urn = profile_data.get("sub")  # e.g., urn:li:person:xxxxx
        name = profile_data.get("name", "LinkedIn User")
        avatar = profile_data.get("picture") or f"https://api.dicebear.com/7.x/bottts/svg?seed={urn}"
    except Exception as e:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=profile_fetch_failed&detail={str(e)}")

    # 3. Create or update Account
    Account.objects.update_or_create(
        user=user,
        platform='linkedin',
        defaults={
            'handle': name,
            'zero_account_id': urn,
            'access_token': access_token,
            'status': 'connected',
            'avatar_url': avatar,
        }
    )

    return redirect(f"{settings.CLIENT_URL}/accounts?success=linkedin_connected")


def _get_or_create_zernio_profile_id():
    import requests
    headers = {
        "Authorization": f"Bearer {settings.ZERNIO_API_KEY}",
        "Content-Type": "application/json"
    }
    # 1. Try to list profiles first
    try:
        res = requests.get("https://zernio.com/api/v1/profiles", headers=headers, timeout=10)
        res.raise_for_status()
        profiles = res.json().get("profiles", [])
        if profiles:
            return profiles[0].get("_id")
    except Exception as e:
        print(f"[Zernio] Failed to list profiles: {e}")

    # 2. Try to create profile
    try:
        create_res = requests.post(
            "https://zernio.com/api/v1/profiles",
            headers=headers,
            json={"name": "Default"},
            timeout=10
        )
        create_res.raise_for_status()
        created_data = create_res.json()
        
        pid = created_data.get("_id") or created_data.get("profileId")
        if pid:
            return pid
            
        # Fallback: list again
        res = requests.get("https://zernio.com/api/v1/profiles", headers=headers, timeout=10)
        res.raise_for_status()
        profiles = res.json().get("profiles", [])
        if profiles:
            return profiles[0].get("_id")
    except Exception as e:
        print(f"[Zernio] Failed to create profile: {e}")

    return None


# GET /api/social/auth/callback/zernio
@api_view(['GET'])
@permission_classes([AllowAny])
def zernio_callback(request):
    import requests
    state_token = request.GET.get('state')
    try:
        payload = jwt.decode(state_token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
        user = User.objects.get(pk=payload['user_id'])
    except Exception:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=invalid_state")

    platform = request.GET.get('platform', 'facebook')
    account_id = request.GET.get('accountId')
    username = request.GET.get('username') or f'{platform}_user'

    if not account_id:
        return redirect(f"{settings.CLIENT_URL}/accounts?error=missing_account_id")

    # Create/update Account in database
    Account.objects.update_or_create(
        user=user,
        platform=platform,
        defaults={
            'handle': username,
            'zero_account_id': account_id,
            'access_token': settings.ZERNIO_API_KEY,
            'status': 'connected',
            'avatar_url': f'https://api.dicebear.com/7.x/bottts/svg?seed={username}',
        }
    )

    return redirect(f"{settings.CLIENT_URL}/accounts?success={platform}_connected")


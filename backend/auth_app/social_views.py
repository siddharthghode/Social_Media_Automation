import random
import string
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Account


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
    url = f"{settings.BACKEND_URL}/api/social/auth/callback/mock?platform={platform}&redirectUrl={settings.CLIENT_URL}/accounts"
    return Response({'url': url})


# GET /api/social/accounts/sync
@api_view(['GET'])
def sync_accounts(request):
    # Simulates syncing by fetching and returning all currently connected accounts
    accounts = Account.objects.filter(user=request.user, status='connected')
    return Response([a.to_dict() for a in accounts])


# GET /api/social/auth/callback/mock
@api_view(['GET'])
def mock_callback(request):
    platform = request.GET.get('platform', 'unknown')
    redirect_url = request.GET.get('redirectUrl', 'http://localhost:5173/accounts')
    mock_id = 'mock_acc_' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
    Account.objects.update_or_create(
        user=request.user, platform=platform,
        defaults={
            'handle': f'{platform}_user_mock',
            'zero_account_id': mock_id,
            'status': 'connected',
            'avatar_url': f'https://api.dicebear.com/7.x/bottts/svg?seed={platform}',
        }
    )
    return redirect(redirect_url)

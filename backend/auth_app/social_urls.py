from django.urls import path
from .social_views import get_connected_accounts, disconnect_account, generate_o_url, sync_accounts, mock_callback

urlpatterns = [
    path('auth/url/<str:platform>', generate_o_url),
    path('accounts/sync', sync_accounts),
    path('accounts', get_connected_accounts),
    path('accounts/<str:account_id>', disconnect_account),
    path('auth/callback/mock', mock_callback),
]

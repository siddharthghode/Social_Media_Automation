from django.urls import path
from . import views

urlpatterns = [
    path('register', views.register),
    path('verify-otp', views.verify_otp),
    path('resend-otp', views.resend_otp),
    path('login', views.login),
    path('me', views.get_me),
    path('google', views.google_login),
    path('google/callback', views.google_callback),
    path('github', views.github_login),
    path('github/callback', views.github_callback),
]

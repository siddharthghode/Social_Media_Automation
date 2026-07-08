from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('auth_app.urls')),
    path('api/posts/', include('posts.urls')),
    path('api/ai/', include('ai_app.urls')),
    path('api/social/', include('auth_app.social_urls')),
    path('api/health', __import__('auth_app.views', fromlist=['health']).health),
]

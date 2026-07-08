from django.urls import path
from . import views

urlpatterns = [
    path('stats', views.get_stats),
    path('', views.get_posts),
    path('create', views.create_post),
    path('<str:post_id>', views.post_detail),
]

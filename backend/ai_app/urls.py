from django.urls import path
from .views import generate_caption, generate_prompts

urlpatterns = [
    path('generate-caption', generate_caption),
    path('generate-post', generate_caption),
    path('generate-prompts', generate_prompts),
]

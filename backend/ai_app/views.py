import requests
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash']

UNSPLASH_IMAGES = {
    ('book', 'library', 'read'): 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80',
    ('code', 'program', 'dev', 'react', 'nextjs', 'soft'): 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    ('fit', 'gym', 'health', 'sport'): 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    ('food', 'cook', 'recipe', 'eat'): 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
    ('market', 'busin', 'financ', 'invest', 'money'): 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    ('music', 'song', 'band'): 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
    ('travel', 'vacat', 'trip', 'nature', 'beach'): 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
}
DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'


def _gemini_generate(prompt):
    last_err = None
    for model in GEMINI_MODELS:
        try:
            res = requests.post(
                f'{GEMINI_BASE}/{model}:generateContent',
                json={'contents': [{'parts': [{'text': prompt}]}]},
                headers={'x-goog-api-key': settings.GEMINI_API_KEY, 'Content-Type': 'application/json'},
                timeout=15,
            )
            res.raise_for_status()
            return res.json()['candidates'][0]['content']['parts'][0]['text']
        except requests.HTTPError as e:
            last_err = e
            if e.response.status_code not in (429, 503):
                break
    raise Exception(str(last_err))


def _pick_image(keywords):
    kw = keywords.lower()
    for keys, url in UNSPLASH_IMAGES.items():
        if any(k in kw for k in keys):
            return url
    return DEFAULT_IMAGE


# POST /api/ai/generate-caption  and  POST /api/ai/generate-post
@api_view(['POST'])
def generate_caption(request):
    topic = request.data.get('topic') or request.data.get('prompt')
    if not topic:
        return Response({'message': 'Topic/prompt is required'}, status=400)
    tone = request.data.get('tone', 'professional')
    generate_image = request.data.get('generateImage', False)

    caption_prompt = (
        f'You are a social media expert. Generate a social media post caption on the topic: "{topic}".\n'
        f'Use a {tone} tone of voice.\nInclude:\n- An attention-grabbing opening with emoji\n'
        f'- 2-3 sentences of compelling, relevant content\n- Relevant hashtags (5-7)\n- A call to action\n'
        f'Keep it under 200 words. Format it nicely with line breaks.'
    )
    try:
        caption = _gemini_generate(caption_prompt)
    except Exception as e:
        return Response({'message': f'AI generation failed: {e}'}, status=500)

    media_url = None
    if generate_image:
        try:
            kw_prompt = (
                f'Based on the following topic for a social media post, suggest a few visual search keywords '
                f'to find a matching stock image.\nTopic: "{topic}"\n'
                f'Output ONLY 2 or 3 keywords separated by commas. Do not include any other text.'
            )
            keywords = _gemini_generate(kw_prompt)
            media_url = _pick_image(keywords)
        except Exception:
            media_url = DEFAULT_IMAGE

    return Response({'caption': caption, 'mediaUrl': media_url})

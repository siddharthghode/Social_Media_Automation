import json
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
    if not keywords:
        return DEFAULT_IMAGE

    kw = keywords.lower()
    for keys, url in UNSPLASH_IMAGES.items():
        if any(k in kw for k in keys):
            return url

    # Fallback to dynamic image search via LoremFlickr
    cleaned_keywords = keywords.replace('"', '').replace("'", "").strip()
    # Handle sentences/topics if no commas are present
    if ',' not in cleaned_keywords and ' ' in cleaned_keywords:
        words = [w.strip() for w in cleaned_keywords.split() if len(w.strip()) > 3]
        clean_kws = words[:3]
    else:
        clean_kws = [k.strip() for k in cleaned_keywords.split(',') if k.strip()]

    if clean_kws:
        query = ','.join(clean_kws)
        try:
            # We fetch with allow_redirects=True to get the final image URL directly.
            # Timeout is set to 8 seconds to prevent hanging the Django response.
            res = requests.get(f'https://loremflickr.com/800/600/{query}', timeout=8, allow_redirects=True)
            res.raise_for_status()
            if res.url and 'loremflickr.com' in res.url:
                return res.url
        except Exception as e:
            print(f"[AI Image fallback] Failed to fetch dynamic image from loremflickr: {e}")

    return DEFAULT_IMAGE



def _generate_mock_caption(topic, tone):
    topic_lower = topic.lower()

    if 'consistency' in topic_lower or 'motivational' in topic_lower or 'motivation' in topic_lower or 'achieve' in topic_lower or 'try new' in topic_lower:
        title = "✨ Stay Consistent, Stay Ahead! ✨"
        body = (
            "Consistency is the magic ingredient that turns temporary tries into lifelong success. "
            "When trying new things in life, progress isn't about being perfect; it's about showing up day after day. "
            "Every step forward, no matter how small, counts towards your growth!"
        )
        hashtags = "#Consistency #Motivation #GrowthMindset #NewBeginnings #Inspiration"
        cta = "👉 What is one new thing you're committing to today? Drop it in the comments!"
    elif 'code' in topic_lower or 'program' in topic_lower or 'react' in topic_lower or 'nextjs' in topic_lower or 'tech' in topic_lower:
        title = "🚀 Embracing the Dev Journey! 🚀"
        body = (
            "Building high-quality applications requires patience, practice, and the courage to try new frameworks. "
            "Whether you are mastering React, Next.js, or diving into Python backend development, "
            "remember that every bug you squash is a step closer to mastery."
        )
        hashtags = "#WebDev #CodingTips #ReactJS #Python #SoftwareEngineering"
        cta = "👉 What framework or language are you learning next? Let us know!"
    else:
        title = "💡 Fresh Perspectives & Growth 💡"
        body = (
            f"Here is your daily dose of inspiration about: {topic}. "
            "Exploring new paths and ideas is essential for expanding our horizons. "
            "Step out of your comfort zone, try something new today, and watch how it transforms your journey!"
        )
        hashtags = "#Inspiration #Perspective #StepOut #Innovation #DailyDose"
        cta = "👉 Share your thoughts on this topic below!"

    t = tone.lower()
    if t == 'funny':
        caption = (
            f"🤖 [AI Mock - Funny Tone]\n\n"
            f"{title}\n\n"
            f"Rumor has it that {body.lower()} Or maybe we're just trying to convince ourselves it works. "
            f"Either way, do the thing!\n\n"
            f"{hashtags} #Humor\n\n"
            f"{cta}"
        )
    elif t == 'minimalist':
        caption = (
            f"{title}\n\n"
            f"Consistency > Intensity.\n"
            f"Try new things. Learn. Repeat.\n\n"
            f"{hashtags}"
        )
    elif t == 'excited':
        caption = (
            f"🔥 [AI Mock - EXCITED!] 🔥\n\n"
            f"{title.upper()}\n\n"
            f"OH MY GOD! {body} This is absolutely game-changing! 💥 "
            f"Let's crush our goals and conquer the week together! Let's gooooo!\n\n"
            f"{hashtags} #LetGo #CrushingIt\n\n"
            f"{cta}"
        )
    elif t == 'creative':
        caption = (
            f"🎨 [AI Mock - Creative Space] 🎨\n\n"
            f"{title}\n\n"
            f"Imagine a canvas where {body.lower()} Every choice you make adds a new splash of color to your life. "
            f"Create, experiment, and keep moving forward.\n\n"
            f"{hashtags} #CreativeJourney\n\n"
            f"{cta}"
        )
    else:
        caption = (
            f"💼 [AI Mock - Professional Profile]\n\n"
            f"{title}\n\n"
            f"{body}\n\n"
            f"{hashtags}\n\n"
            f"{cta}"
        )

    return caption


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
        print(f"[AI] Gemini API failed or not configured, using fallback generator. Info: {e}")
        caption = _generate_mock_caption(topic, tone)

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
        except Exception as e:
            print(f"[AI] Gemini keyword generation failed, falling back to topic keywords. Error: {e}")
            media_url = _pick_image(topic)

    return Response({'caption': caption, 'mediaUrl': media_url})


# POST /api/ai/generate-prompts
@api_view(['POST'])
def generate_prompts(request):
    theme = request.data.get('theme', '')
    prompt_text = (
        "You are an expert social media manager. Generate a list of 4 creative, engaging prompts or post ideas for a social media channel.\n"
    )
    if theme:
        prompt_text += f"The user specified the theme/industry: '{theme}'. Please tailor the prompts to this theme.\n"
    else:
        prompt_text += "Generate trending general prompts covering technology, career, lifestyle, or business.\n"

    prompt_text += (
        "Each prompt should be a clear, actionable instruction for an AI post writer, e.g., 'Write a post sharing 3 tips for learning React in 2026'.\n"
        "Return the response ONLY as a JSON list/array of strings. Format:\n"
        "[\n"
        "  \"prompt 1\",\n"
        "  \"prompt 2\",\n"
        "  \"prompt 3\",\n"
        "  \"prompt 4\"\n"
        "]\n"
        "Do not include any other commentary or markdown formatting. Output raw JSON."
    )

    try:
        raw_res = _gemini_generate(prompt_text)
        cleaned = raw_res.strip()
        if cleaned.startswith('```'):
            lines = cleaned.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines and lines[-1].startswith('```'):
                lines = lines[:-1]
            cleaned = '\n'.join(lines).strip()
        prompts = json.loads(cleaned)
        if not isinstance(prompts, list):
            raise ValueError("Response is not a list")
    except Exception:
        prompts = [
            f"Write a post sharing 3 actionable tips about {theme or 'productivity'}",
            f"Describe the biggest challenges in {theme or 'software development'} and how to overcome them",
            f"Create a motivational post about achieving consistency in {theme or 'learning new skills'}",
            f"Share a story about a recent breakthrough or lesson learned in {theme or 'our industry'}"
        ]

    return Response({'prompts': prompts})

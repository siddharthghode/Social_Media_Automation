import time
import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'telesync.settings')
django.setup()

import requests
from datetime import datetime, timezone
from django.conf import settings
from django.core.management.base import BaseCommand
from posts.models import Post
from auth_app.models import Account


def _send_telegram_message(content):
    base = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}'
    res = requests.post(f'{base}/sendMessage', json={
        'chat_id': settings.TELEGRAM_CHANNEL_ID,
        'text': content,
        'parse_mode': 'HTML',
    }, timeout=10)
    res.raise_for_status()
    return res.json()


def _send_telegram_image(image_url, caption):
    base = f'https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}'
    res = requests.post(f'{base}/sendPhoto', json={
        'chat_id': settings.TELEGRAM_CHANNEL_ID,
        'photo': image_url,
        'caption': caption,
        'parse_mode': 'HTML',
    }, timeout=10)
    res.raise_for_status()
    return res.json()


def run_scheduler():
    now = datetime.now(tz=timezone.utc)
    due_posts = Post.objects.filter(status='pending', scheduled_time__lte=now)
    if not due_posts.exists():
        return

    print(f'[Scheduler] Found {due_posts.count()} post(s) to publish')

    for post in due_posts:
        errors = []
        platforms = post.platforms if post.platforms else ['telegram']
        telegram_platforms = [p for p in platforms if p == 'telegram']
        facebook_platforms = [p for p in platforms if p == 'facebook']

        if telegram_platforms:
            try:
                if post.image_url:
                    result = _send_telegram_image(post.image_url, post.content)
                else:
                    result = _send_telegram_message(post.content)
                post.telegram_message_id = str(result.get('result', {}).get('message_id', ''))
                print(f'[Scheduler] Telegram published for post {post.pk}')
            except Exception as e:
                errors.append(f'telegram: {e}')
                print(f'[Scheduler] Telegram failed: {e}')

        if facebook_platforms:
            try:
                fb_account = Account.objects.filter(
                    user=post.user, platform='facebook', status='connected'
                ).first()
                if not fb_account:
                    raise Exception('No connected Facebook account')
                url = f'https://graph.facebook.com/v19.0/{fb_account.zero_account_id}/feed'
                requests.post(url, data={
                    'message': post.content, 'access_token': fb_account.access_token
                }, timeout=10).raise_for_status()
                print(f'[Scheduler] Facebook published for post {post.pk}')
            except Exception as e:
                errors.append(f'facebook: {e}')
                print(f'[Scheduler] Facebook failed: {e}')

        total = len(telegram_platforms) + len(facebook_platforms)
        if errors and len(errors) >= total:
            post.status = 'failed'
            post.error_message = ' | '.join(errors)
        else:
            post.status = 'posted'
            if errors:
                post.error_message = 'Partial failure — ' + ' | '.join(errors)
        post.save()


class Command(BaseCommand):
    help = 'Run post scheduler — checks every minute for due posts'

    def handle(self, *args, **kwargs):
        self.stdout.write('[Scheduler] Post scheduler started — checking every minute')
        while True:
            try:
                run_scheduler()
            except Exception as e:
                self.stderr.write(f'[Scheduler] Error: {e}')
            time.sleep(60)

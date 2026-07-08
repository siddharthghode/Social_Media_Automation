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


def _send_telegram_message(content, bot_token=None, chat_id=None):
    token = bot_token or settings.TELEGRAM_BOT_TOKEN
    chat = chat_id or settings.TELEGRAM_CHANNEL_ID
    base = f'https://api.telegram.org/bot{token}'
    res = requests.post(f'{base}/sendMessage', json={
        'chat_id': chat,
        'text': content,
        'parse_mode': 'HTML',
    }, timeout=10)
    res.raise_for_status()
    return res.json()


def _send_telegram_image(image_url, caption, bot_token=None, chat_id=None):
    token = bot_token or settings.TELEGRAM_BOT_TOKEN
    chat = chat_id or settings.TELEGRAM_CHANNEL_ID
    base = f'https://api.telegram.org/bot{token}'
    res = requests.post(f'{base}/sendPhoto', json={
        'chat_id': chat,
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

        for platform in platforms:
            try:
                account = Account.objects.filter(
                    user=post.user, platform=platform, status='connected'
                ).first()

                is_mock = False
                if account:
                    if account.zero_account_id.startswith('mock_acc_'):
                        is_mock = True
                else:
                    if platform != 'telegram':
                        raise Exception(f'No connected {platform} account found')

                if platform == 'telegram':
                    token = account.access_token if account else settings.TELEGRAM_BOT_TOKEN
                    chat = account.zero_account_id if account else settings.TELEGRAM_CHANNEL_ID

                    if not token or token.startswith('mock_') or not chat or chat.startswith('mock_'):
                        is_mock = True

                    if is_mock:
                        print(f'[Scheduler] [MOCK] Telegram published for post {post.pk}')
                    else:
                        if post.image_url:
                            result = _send_telegram_image(
                                post.image_url, post.content, bot_token=token, chat_id=chat
                            )
                        else:
                            result = _send_telegram_message(
                                post.content, bot_token=token, chat_id=chat
                            )
                        post.telegram_message_id = str(result.get('result', {}).get('message_id', ''))
                        print(f'[Scheduler] Telegram published for post {post.pk}')

                elif platform == 'facebook':
                    if is_mock:
                        print(f'[Scheduler] [MOCK] Facebook published for post {post.pk}')
                    else:
                        if not account.access_token:
                            raise Exception('Missing access token for Facebook account')
                        url = f'https://graph.facebook.com/v19.0/{account.zero_account_id}/feed'
                        requests.post(url, data={
                            'message': post.content, 'access_token': account.access_token
                        }, timeout=10).raise_for_status()
                        print(f'[Scheduler] Facebook published for post {post.pk}')

                elif platform == 'linkedin':
                    if is_mock:
                        print(f'[Scheduler] [MOCK] LinkedIn published for post {post.pk}')
                    else:
                        if not account.access_token:
                            raise Exception('Missing access token for LinkedIn account')
                        url = "https://api.linkedin.com/v2/posts"
                        headers = {
                            "Authorization": f"Bearer {account.access_token}",
                            "Content-Type": "application/json",
                            "X-Restli-Protocol-Version": "2.0.0"
                        }
                        payload = {
                            "author": account.zero_account_id,
                            "commentary": post.content,
                            "visibility": "PUBLIC",
                            "distribution": {
                                "feedDistribution": "MAIN_FEED",
                                "targetEntities": []
                            },
                            "lifecycleState": "PUBLISHED"
                        }
                        if post.image_url:
                            payload["content"] = {
                                "media": {
                                    "title": "Image Asset",
                                    "description": "Image shared via TeleSync"
                                },
                                "shareUrl": post.image_url
                            }

                        res = requests.post(url, json=payload, headers=headers, timeout=15)
                        res.raise_for_status()
                        print(f'[Scheduler] LinkedIn published for post {post.pk}')

                elif platform == 'instagram':
                    if is_mock:
                        print(f'[Scheduler] [MOCK] Instagram published for post {post.pk}')
                    else:
                        if not account.access_token:
                            raise Exception('Missing access token for Instagram account')
                        if not post.image_url:
                            raise Exception('Instagram posts require an image URL')

                        # 1. Create media container
                        media_url = f"https://graph.facebook.com/v19.0/{account.zero_account_id}/media"
                        media_res = requests.post(media_url, data={
                            'image_url': post.image_url,
                            'caption': post.content,
                            'access_token': account.access_token
                        }, timeout=15)
                        media_res.raise_for_status()
                        creation_id = media_res.json().get('id')

                        # 2. Publish media container
                        publish_url = f"https://graph.facebook.com/v19.0/{account.zero_account_id}/media_publish"
                        publish_res = requests.post(publish_url, data={
                            'creation_id': creation_id,
                            'access_token': account.access_token
                        }, timeout=15)
                        publish_res.raise_for_status()
                        print(f'[Scheduler] Instagram published for post {post.pk}')

                elif platform in ['twitter', 'pinterest']:
                    if is_mock:
                        print(f'[Scheduler] [MOCK] {platform.capitalize()} published for post {post.pk}')
                    else:
                        raise Exception(f'Real publishing not implemented for {platform.capitalize()}')

                else:
                    raise Exception(f'Unsupported platform: {platform}')

            except Exception as e:
                errors.append(f'{platform}: {str(e)}')
                print(f'[Scheduler] {platform.capitalize()} failed: {str(e)}')

        total = len(platforms)
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

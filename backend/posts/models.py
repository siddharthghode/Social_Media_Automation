from django.db import models
from auth_app.models import User


class Post(models.Model):
    STATUS_CHOICES = [('pending', 'pending'), ('posted', 'posted'), ('failed', 'failed')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField()
    image_url = models.TextField(null=True, blank=True)
    media_url = models.TextField(null=True, blank=True)
    media_type = models.CharField(max_length=50, null=True, blank=True)
    scheduled_time = models.DateTimeField()
    platforms = models.JSONField(default=list)
    platform = models.CharField(max_length=50, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    telegram_message_id = models.CharField(max_length=255, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']

    def to_dict(self):
        return {
            '_id': self.pk,
            'userId': self.user_id,
            'content': self.content,
            'imageUrl': self.image_url,
            'mediaUrl': self.media_url,
            'mediaType': self.media_type,
            'scheduledTime': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'scheduledFor': self.scheduled_time.isoformat() if self.scheduled_time else None,
            'platforms': self.platforms,
            'platform': self.platform,
            'status': self.status,
            'telegramMessageId': self.telegram_message_id,
            'errorMessage': self.error_message,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

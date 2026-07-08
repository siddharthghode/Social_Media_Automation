import bcrypt
from django.db import models


class User(models.Model):
    AUTH_PROVIDERS = [('local', 'local'), ('google', 'google'), ('github', 'github')]

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, null=True, blank=True)
    otp_expiry = models.DateTimeField(null=True, blank=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDERS, default='local')
    provider_id = models.CharField(max_length=255, null=True, blank=True)
    avatar = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'users'

    def set_password(self, raw):
        self.password = bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()

    def check_password(self, raw):
        if not self.password:
            return False
        return bcrypt.checkpw(raw.encode(), self.password.encode())

    def to_dict(self):
        return {
            '_id': self.pk,
            'name': self.name,
            'email': self.email,
            'avatar': self.avatar,
            'auth_provider': self.auth_provider,
        }

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class Account(models.Model):
    STATUS_CHOICES = [('connected', 'connected'), ('disconnected', 'disconnected')]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accounts')
    platform = models.CharField(max_length=50)
    handle = models.CharField(max_length=255)
    zero_account_id = models.CharField(max_length=255)
    access_token = models.TextField(null=True, blank=True)
    refresh_token = models.TextField(null=True, blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='connected')
    avatar_url = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'accounts'

    def to_dict(self):
        return {
            '_id': self.pk,
            'platform': self.platform,
            'handle': self.handle,
            'status': self.status,
            'avatarUrl': self.avatar_url,
        }

import jwt
import urllib.parse
from django.test import TestCase
from django.conf import settings
from unittest.mock import patch, MagicMock
from auth_app.models import User, Account

class SocialAuthTestCase(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create(
            name="Test User",
            email="testuser@example.com",
            is_verified=True
        )
        self.user.set_password("securepassword")
        self.user.save()

        # Generate JWT token for requests
        self.token = jwt.encode(
            {"id": self.user.id},
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithm="HS256"
        )
        self.headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token}"
        }

    @patch("requests.get")
    def test_generate_o_url_instagram(self, mock_get):
        # Mock profile list response
        mock_res_profile = MagicMock()
        mock_res_profile.status_code = 200
        mock_res_profile.json.return_value = {
            "profiles": [{"_id": "mock_profile_id"}]
        }

        # Mock connect URL response
        mock_res_connect = MagicMock()
        mock_res_connect.status_code = 200
        mock_res_connect.json.return_value = {
            "authUrl": "https://zernio.com/api/v1/connect/instagram?profileId=mock_profile_id"
        }

        mock_get.side_effect = [mock_res_profile, mock_res_connect]

        response = self.client.get(
            "/api/social/auth/url/instagram",
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        url = response.json()["url"]
        self.assertTrue(url.startswith("https://zernio.com/api/v1/connect/instagram"))
        self.assertIn("profileId=mock_profile_id", url)


    def test_generate_o_url_mock(self):
        response = self.client.get(
            "/api/social/auth/url/pinterest",
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        url = response.json()["url"]
        self.assertIn("/api/social/auth/callback/mock", url)
        self.assertIn("platform=pinterest", url)

    def test_generate_o_url_linkedin(self):
        response = self.client.get(
            "/api/social/auth/url/linkedin",
            **self.headers
        )
        self.assertEqual(response.status_code, 200)
        url = response.json()["url"]
        self.assertTrue(url.startswith("https://www.linkedin.com/oauth/v2/authorization"))
        self.assertIn(f"client_id={settings.LINKEDIN_CLIENT_ID}", url)
        self.assertIn("scope=openid", url)

    @patch("requests.get")
    def test_instagram_callback_success(self, mock_get):
        # 1. Generate state token
        state_token = jwt.encode(
            {"user_id": self.user.id},
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithm="HS256"
        )

        # 2. Mock requests.get for Token Exchange
        mock_response_token = MagicMock()
        mock_response_token.status_code = 200
        mock_response_token.json.return_value = {"access_token": "short_user_token"}

        # Mock requests.get for Long-lived Token Exchange
        mock_response_long_token = MagicMock()
        mock_response_long_token.status_code = 200
        mock_response_long_token.json.return_value = {"access_token": "long_user_token"}

        # Mock requests.get for Page Discovery & IG accounts
        mock_response_pages = MagicMock()
        mock_response_pages.status_code = 200
        mock_response_pages.json.return_value = {
            "data": [
                {
                    "name": "FB Test Page",
                    "access_token": "page_access_token_123",
                    "instagram_business_account": {
                        "id": "ig_123456789",
                        "username": "test_instagram_biz",
                        "name": "Test Instagram Business",
                        "profile_picture_url": "https://example.com/avatar.jpg"
                    }
                }
            ]
        }

        mock_get.side_effect = [
            mock_response_token,
            mock_response_long_token,
            mock_response_pages
        ]

        # 3. Call instagram callback
        response = self.client.get(
            f"/api/social/auth/callback/instagram?code=mock_code&state={state_token}"
        )

        # Check redirect status
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?success=instagram_connected"))

        # Check account was created in DB
        account = Account.objects.filter(user=self.user, platform="instagram").first()
        self.assertIsNotNone(account)
        self.assertEqual(account.handle, "test_instagram_biz")
        self.assertEqual(account.zero_account_id, "ig_123456789")
        self.assertEqual(account.access_token, "page_access_token_123")
        self.assertEqual(account.status, "connected")

    def test_instagram_callback_invalid_state(self):
        response = self.client.get(
            "/api/social/auth/callback/instagram?code=mock_code&state=invalid_state_token"
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?error=invalid_state"))

    @patch("requests.post")
    @patch("requests.get")
    def test_linkedin_callback_success(self, mock_get, mock_post):
        state_token = jwt.encode(
            {"user_id": self.user.id},
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithm="HS256"
        )

        # Mock token exchange post request
        mock_response_token = MagicMock()
        mock_response_token.status_code = 200
        mock_response_token.json.return_value = {"access_token": "li_access_token_abc"}
        mock_post.return_value = mock_response_token

        # Mock userinfo get request
        mock_response_profile = MagicMock()
        mock_response_profile.status_code = 200
        mock_response_profile.json.return_value = {
            "sub": "urn:li:person:li_test_user_123",
            "name": "LinkedIn Test User",
            "picture": "https://example.com/li_avatar.jpg"
        }
        mock_get.return_value = mock_response_profile

        response = self.client.get(
            f"/api/social/auth/callback/linkedin?code=mock_code&state={state_token}"
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?success=linkedin_connected"))

        account = Account.objects.filter(user=self.user, platform="linkedin").first()
        self.assertIsNotNone(account)
        self.assertEqual(account.handle, "LinkedIn Test User")
        self.assertEqual(account.zero_account_id, "urn:li:person:li_test_user_123")
        self.assertEqual(account.access_token, "li_access_token_abc")
        self.assertEqual(account.status, "connected")

    def test_linkedin_callback_invalid_state(self):
        response = self.client.get(
            "/api/social/auth/callback/linkedin?code=mock_code&state=invalid_state_token"
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?error=invalid_state"))

    def test_zernio_callback_success(self):
        state_token = jwt.encode(
            {"user_id": self.user.id},
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithm="HS256"
        )

        response = self.client.get(
            f"/api/social/auth/callback/zernio?state={state_token}&platform=facebook&accountId=acc_fb_123&username=fb_test_page"
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?success=facebook_connected"))

        account = Account.objects.filter(user=self.user, platform="facebook").first()
        self.assertIsNotNone(account)
        self.assertEqual(account.handle, "fb_test_page")
        self.assertEqual(account.zero_account_id, "acc_fb_123")
        self.assertEqual(account.access_token, settings.ZERNIO_API_KEY)
        self.assertEqual(account.status, "connected")

    def test_zernio_callback_invalid_state(self):
        response = self.client.get(
            "/api/social/auth/callback/zernio?state=invalid_state_token&platform=facebook&accountId=acc_fb_123"
        )
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.endswith("/accounts?error=invalid_state"))


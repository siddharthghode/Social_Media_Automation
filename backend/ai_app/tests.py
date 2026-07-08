import jwt
from django.test import TestCase
from django.conf import settings
from unittest.mock import patch, MagicMock
from auth_app.models import User
import requests

class AIGeneratePostTestCase(TestCase):
    def setUp(self):
        # Create a test user
        self.user = User.objects.create(
            name="Test User",
            email="testuser@example.com",
            is_verified=True
        )
        self.user.set_password("securepassword")
        self.user.save()

        # Generate JWT token
        self.token = jwt.encode(
            {"id": self.user.id},
            settings.SIMPLE_JWT["SIGNING_KEY"],
            algorithm="HS256"
        )
        self.headers = {
            "HTTP_AUTHORIZATION": f"Bearer {self.token}"
        }

    @patch("requests.post")
    def test_generate_post_success(self, mock_post):
        # Mock the Gemini API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "🚀 Hello World! This is a test caption.\n\n#test #django #ai"}
                        ]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response

        # Perform POST request
        response = self.client.post(
            "/api/ai/generate-post",
            data={"topic": "Django web development", "tone": "professional", "generateImage": False},
            content_type="application/json",
            **self.headers
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["caption"], "🚀 Hello World! This is a test caption.\n\n#test #django #ai")
        self.assertIsNone(response.json()["mediaUrl"])

        # Check that mock_post was called with settings.GEMINI_API_KEY
        self.assertTrue(mock_post.called)
        called_headers = mock_post.call_args[1]["headers"]
        self.assertEqual(called_headers["x-goog-api-key"], settings.GEMINI_API_KEY)

    @patch("requests.post")
    def test_generate_post_with_image(self, mock_post):
        # Mock two responses: one for caption, one for keywords
        mock_response_caption = MagicMock()
        mock_response_caption.status_code = 200
        mock_response_caption.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "🎨 Python is awesome!"}
                        ]
                    }
                }
            ]
        }

        mock_response_kw = MagicMock()
        mock_response_kw.status_code = 200
        mock_response_kw.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "code, react"}
                        ]
                    }
                }
            ]
        }

        mock_post.side_effect = [mock_response_caption, mock_response_kw]

        # Perform POST request
        response = self.client.post(
            "/api/ai/generate-post",
            data={"topic": "Python development", "tone": "professional", "generateImage": True},
            content_type="application/json",
            **self.headers
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["caption"], "🎨 Python is awesome!")
        # "code" matches UNSPLASH_IMAGES key for react/dev/code
        self.assertIsNotNone(response.json()["mediaUrl"])
        self.assertTrue(response.json()["mediaUrl"].startswith("https://images.unsplash.com"))

    def test_generate_post_missing_topic(self):
        response = self.client.post(
            "/api/ai/generate-post",
            data={"tone": "professional"},
            content_type="application/json",
            **self.headers
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["message"], "Topic/prompt is required")

    def test_generate_post_unauthenticated(self):
        response = self.client.post(
            "/api/ai/generate-post",
            data={"topic": "Django", "tone": "professional"},
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 403)

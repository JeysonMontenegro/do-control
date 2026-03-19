import json
import unittest
from unittest.mock import patch

from app.core.config import settings
from app.services.errors import ValidationError
from app.services.recaptcha import RecaptchaService


class RecaptchaServiceTests(unittest.TestCase):
    def test_verify_is_skipped_when_secret_is_not_configured(self) -> None:
        original_secret = settings.recaptcha_secret_key
        settings.recaptcha_secret_key = None
        try:
            RecaptchaService().verify_login_token(None)
        finally:
            settings.recaptcha_secret_key = original_secret

    def test_verify_rejects_missing_token_when_secret_exists(self) -> None:
        original_secret = settings.recaptcha_secret_key
        settings.recaptcha_secret_key = "secret"
        try:
            with self.assertRaises(ValidationError):
                RecaptchaService().verify_login_token(None)
        finally:
            settings.recaptcha_secret_key = original_secret

    @patch("app.services.recaptcha.request.urlopen")
    def test_verify_accepts_valid_google_response(self, mock_urlopen) -> None:
        original_secret = settings.recaptcha_secret_key
        settings.recaptcha_secret_key = "secret"
        mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(
            {"success": True, "score": 0.9, "action": "login"}
        ).encode("utf-8")
        try:
            RecaptchaService().verify_login_token("token")
        finally:
            settings.recaptcha_secret_key = original_secret

    @patch("app.services.recaptcha.request.urlopen")
    def test_verify_rejects_low_score(self, mock_urlopen) -> None:
        original_secret = settings.recaptcha_secret_key
        settings.recaptcha_secret_key = "secret"
        mock_urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(
            {"success": True, "score": 0.1, "action": "login"}
        ).encode("utf-8")
        try:
            with self.assertRaises(ValidationError):
                RecaptchaService().verify_login_token("token")
        finally:
            settings.recaptcha_secret_key = original_secret


if __name__ == "__main__":
    unittest.main()

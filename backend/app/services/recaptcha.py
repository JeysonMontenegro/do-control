import json
from urllib import parse, request

from app.core.config import settings
from app.services.errors import ValidationError


class RecaptchaService:
    VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

    def verify_login_token(self, token: str | None) -> None:
        if not settings.recaptcha_secret_key:
            return
        if not token:
            raise ValidationError("reCAPTCHA verification is required.")

        payload = parse.urlencode(
            {
                "secret": settings.recaptcha_secret_key,
                "response": token,
            }
        ).encode("utf-8")
        req = request.Request(
            self.VERIFY_URL,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with request.urlopen(req, timeout=10) as response:
            body = json.loads(response.read().decode("utf-8") or "{}")

        if not body.get("success"):
            raise ValidationError("reCAPTCHA validation failed.")

        score = body.get("score")
        if score is not None and float(score) < 0.5:
            raise ValidationError("reCAPTCHA score is too low.")

        action = body.get("action")
        if action and action != "login":
            raise ValidationError("Invalid reCAPTCHA action.")

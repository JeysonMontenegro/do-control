from __future__ import annotations

from io import BytesIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings


class StorageService:
    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_access_key,
            aws_secret_access_key=settings.minio_secret_key,
            config=Config(signature_version="s3v4"),
            region_name="us-east-1",
        )

    def ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=settings.minio_bucket)
        except ClientError:
            self.client.create_bucket(Bucket=settings.minio_bucket)

    def upload_bytes(self, *, key: str, content: bytes, content_type: str | None = None) -> None:
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        self.client.upload_fileobj(
            Fileobj=BytesIO(content),
            Bucket=settings.minio_bucket,
            Key=key,
            ExtraArgs=extra_args,
        )

    def generate_presigned_download_url(self, *, key: str, expires_in_seconds: int = 900) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": settings.minio_bucket,
                "Key": key,
            },
            ExpiresIn=expires_in_seconds,
        )

    def get_object(self, *, key: str):
        return self.client.get_object(Bucket=settings.minio_bucket, Key=key)

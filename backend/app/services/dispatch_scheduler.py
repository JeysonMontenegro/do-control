import asyncio
import logging

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.communication_dispatch import CommunicationDispatchService

logger = logging.getLogger(__name__)


async def run_dispatch_generation_loop() -> None:
    interval_seconds = max(5, settings.dispatch_generation_job_interval_seconds)
    logger.info("dispatch generation job started with %s second interval", interval_seconds)
    while True:
        db = SessionLocal()
        try:
            created_count = CommunicationDispatchService(db).generate_due_dispatches()
            if created_count:
                logger.info("dispatch generation job created %s dispatches", created_count)
        except Exception:
            logger.exception("dispatch generation job failed")
            db.rollback()
        finally:
            db.close()
        await asyncio.sleep(interval_seconds)

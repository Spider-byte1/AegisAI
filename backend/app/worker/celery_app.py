from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "aegisai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_BROKER_URL,
    include=["app.worker.tasks"],
)

celery_app.conf.update(
    task_track_started=True,
    result_expires=3600,
    task_soft_time_limit=settings.NMAP_TIMEOUT_SECONDS + 120,
    task_time_limit=settings.NMAP_TIMEOUT_SECONDS + 180,
    task_acks_late=False,  # a crashed scan is marked failed, not silently re-run against a target
)

from celery import Celery

from app.config import settings


celery_app = Celery(
    "summit",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_expires=3600,
    timezone="UTC",
    beat_schedule={
        "scrape-opportunities": {
            "task": "app.workers.tasks.run_scraping_pipeline",
            "schedule": 21600.0,
        },
    },
)

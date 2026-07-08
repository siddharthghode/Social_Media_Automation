from celery import shared_task
from posts.management.commands.run_scheduler import run_scheduler

@shared_task
def publish_due_posts():
    print("[Celery Task] Checking for due posts...")
    try:
        run_scheduler()
    except Exception as e:
        print(f"[Celery Task] Error running scheduler: {e}")
        raise e

import json
import os
import time

from redis import Redis


def get_settings() -> dict:
    return {
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", "6379")),
        "alerts_queue": os.getenv("ALERTS_QUEUE", "alerts_queue"),
    }


def format_message(event: dict) -> str:
    return (
        f"[{event.get('event_type')}] "
        f"impact={event.get('impact')} urgency={event.get('urgency')} "
        f"title={event.get('title')}"
    )


def run() -> None:
    settings = get_settings()
    redis_client = Redis(
        host=settings["redis_host"],
        port=settings["redis_port"],
        decode_responses=True,
    )

    while True:
        item = redis_client.brpop(settings["alerts_queue"], timeout=5)
        if not item:
            time.sleep(0.5)
            continue

        _queue, payload = item
        event = json.loads(payload)
        print(f"[notifier] {format_message(event)}")


if __name__ == "__main__":
    run()

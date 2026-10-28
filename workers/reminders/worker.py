"""Reminders worker: consumes visit-booked messages and schedules a reminder for the owner.

Runs as a Vercel Daemon (see vercel.ts). Telemetry comes from OpenTelemetry's zero-code
instrumentation (`opentelemetry-instrument` in the Dockerfile): each httpx call to PetClinic
is a client span that carries `traceparent`, and log records are exported over OTLP with
the active trace ID. Vercel Queues has no OpenTelemetry instrumentation, so the worker
opens the consumer span itself, continuing the trace context the agent put into the message.
"""

import asyncio
import logging
import os
import signal

import httpx
from opentelemetry import propagate, trace
from opentelemetry.trace import SpanKind, StatusCode
from vercel.queue import ALL_DEPLOYMENTS, QueueClient

TOPIC = "visit-booked"
CONSUMER_GROUP = "reminders"
# Messages can only be received in the region they were sent to: the agent's functions
# send from dub1. Daemons get no VERCEL_DEPLOYMENT_ID, and eve keeps running sessions on
# older deployments, so poll every deployment's messages.
QUEUE = QueueClient(region="dub1", deployment=ALL_DEPLOYMENTS)
MAX_DELIVERIES = 5

PETCLINIC_URL = os.environ.get("PETCLINIC_URL", "http://localhost:8088/petclinic/api")
PETCLINIC_API_KEY = os.environ.get("PETCLINIC_API_KEY", "local-dev-key")

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
log = logging.getLogger("reminders")
tracer = trace.get_tracer("reminders")


class ReminderFailed(Exception):
    """Raised after the failure is recorded on the span and logged."""


async def schedule_reminder(petclinic: httpx.AsyncClient, message) -> None:
    visit = message.payload
    context = propagate.extract(visit.get("trace", {}))
    # Open the span before reading the payload, so a malformed message still shows up
    # in the booking's trace and the failure log carries its trace ID.
    with tracer.start_as_current_span(
        f"process {TOPIC}",
        context=context,
        kind=SpanKind.CONSUMER,
        attributes={
            "messaging.system": "vercel_queues",
            "messaging.operation.type": "process",
            "messaging.destination.name": TOPIC,
            "messaging.consumer.group.name": CONSUMER_GROUP,
            "messaging.message.id": message.message_id,
            "messaging.message.delivery_count": message.metadata.delivery_count,
        },
        # The except block below records the original error; ReminderFailed would replace it.
        record_exception=False,
        set_status_on_exception=False,
    ) as span:
        try:
            span.set_attribute("petclinic.visit.id", visit["visitId"])
            span.set_attribute("petclinic.owner.id", visit["ownerId"])
            response = await petclinic.get(f"/owners/{visit['ownerId']}")
            response.raise_for_status()
            owner = response.json()
            log.info(
                "reminder scheduled",
                extra={
                    "visit_id": visit["visitId"],
                    "visit_date": visit["date"],
                    "pet_name": visit["petName"],
                    "owner_id": visit["ownerId"],
                    "owner_telephone": owner.get("telephone"),
                    "delivery_count": message.metadata.delivery_count,
                },
            )
        except Exception as error:
            span.record_exception(error)
            span.set_status(StatusCode.ERROR, repr(error))
            log.exception(
                "reminder failed, message will be redelivered",
                extra={"visit_id": visit.get("visitId"), "delivery_count": message.metadata.delivery_count},
            )
            raise ReminderFailed from error


async def main() -> None:
    stop = asyncio.Event()
    asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, stop.set)
    log.info("reminders worker started", extra={"topic": TOPIC, "consumer_group": CONSUMER_GROUP})
    async with httpx.AsyncClient(
        base_url=PETCLINIC_URL,
        headers={"accept": "application/json", "x-petclinic-key": PETCLINIC_API_KEY},
        timeout=10,
    ) as petclinic:
        while not stop.is_set():
            received = False
            async for delivery in QUEUE.poll(TOPIC, CONSUMER_GROUP, limit=1, lease_duration=60):
                received = True
                try:
                    # A clean exit acknowledges the message; an exception leaves it for redelivery.
                    async with delivery as message:
                        if message.metadata.delivery_count > MAX_DELIVERIES:
                            log.error("reminder dropped after too many deliveries", extra={"visit_id": message.payload.get("visitId")})
                            continue
                        await schedule_reminder(petclinic, message)
                except ReminderFailed:
                    pass  # recorded on the span and logged in schedule_reminder
                except Exception:
                    log.exception("queue delivery failed, message will be redelivered")
            if not received:
                try:
                    await asyncio.wait_for(stop.wait(), timeout=2)
                except TimeoutError:
                    pass
    log.info("reminders worker stopping")


if __name__ == "__main__":
    asyncio.run(main())

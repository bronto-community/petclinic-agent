// Publishes a visit-booked message for the reminders worker (workers/reminders/, a Vercel
// Daemon). The OpenTelemetry propagator writes the current trace context into the message,
// so the worker's consumer span joins the booking's trace.
import { context, propagation } from "@opentelemetry/api";
import { QueueClient } from "@vercel/queue";

// Messages can only be received in the region they were sent to; the worker polls dub1.
const queue = new QueueClient({ region: "dub1" });

export type VisitBooked = {
  visitId: number;
  ownerId: number;
  petId: number;
  petName: string;
  date: string;
  description: string;
};

export async function publishVisitBooked(visit: VisitBooked) {
  const trace: Record<string, string> = {};
  propagation.inject(context.active(), trace);
  return queue.send("visit-booked", { ...visit, trace }, { idempotencyKey: `visit-${visit.visitId}` });
}

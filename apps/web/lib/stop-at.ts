// Hard stop for the lab's scheduled traffic (the synthetic and ops crons): after STOP_AT
// every run returns immediately, whatever the configuration. The date lives in code on
// purpose, so no environment variable can extend it.
export const STOP_AT = new Date("2026-10-23T22:00:00Z"); // Saturday 24 Oct, 00:00 Europe/Berlin

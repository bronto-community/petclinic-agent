// Hard stop for the lab's scheduled traffic (the synthetic and ops crons): after STOP_AT
// every run returns immediately, whatever the configuration. The date lives in code on
// purpose, so no environment variable can extend it.
export const STOP_AT = new Date("2026-11-07T22:00:00Z"); // Friday 7 Nov, 23:00 Europe/Berlin

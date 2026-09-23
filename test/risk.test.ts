import assert from "node:assert/strict";
import { decideRisk, paymentEvent } from "../src/report_mailer.js";

const event = paymentEvent.parse({ id: "p-1", userEmail: "user@example.com", amountCents: 1000, currency: "USD", occurredAt: "2025-01-01T00:00:00.000Z", riskScore: 0.91 });
assert.equal(decideRisk(event), "hold");
assert.throws(() => paymentEvent.parse({ ...event, userEmail: "bad" }));
console.log("risk decision test passed");

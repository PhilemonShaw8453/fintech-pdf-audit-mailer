import { emailPaymentReport } from "../src/report_mailer.js";

const to = process.env.DEMO_EMAIL_TO;
if (!to) throw new Error("DEMO_EMAIL_TO is required");

const result = await emailPaymentReport({
  id: `payment-${Date.now()}`,
  userEmail: to,
  amountCents: 2499,
  currency: "USD",
  occurredAt: new Date().toISOString(),
  riskScore: 0.12,
});
console.log(result);

import { z } from "zod";
import { infrai } from "./infrai.js";

export const paymentEvent = z.object({
  id: z.string().min(1),
  userEmail: z.string().email(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  occurredAt: z.string().datetime(),
  riskScore: z.number().min(0).max(1),
});

export type PaymentEvent = z.infer<typeof paymentEvent>;
export type RiskAction = "send" | "hold";

export function decideRisk(event: PaymentEvent): RiskAction {
  return event.riskScore >= 0.8 ? "hold" : "send";
}

export function buildPdf(event: PaymentEvent): Uint8Array {
  const lines = [
    "%PDF-1.4",
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj",
    `%% payment ${event.id} ${event.amountCents} ${event.currency}`,
    "%%EOF",
  ];
  return new TextEncoder().encode(lines.join("\n"));
}

export async function emailPaymentReport(input: unknown) {
  const event = paymentEvent.parse(input);
  const action = decideRisk(event);
  const pdf = buildPdf(event);
  if (action === "hold") return { action, pdfBytes: pdf.byteLength, message_id: null };
  const result = await infrai.email.send({
    to: event.userEmail,
    subject: `Payment report ${event.id}`,
    html: `<p>Payment <strong>${event.id}</strong>: ${(event.amountCents / 100).toFixed(2)} ${event.currency}</p><p>Generated PDF bytes: ${pdf.byteLength}</p><p>Audit timestamp: ${event.occurredAt}</p>`,
  });
  return { action, pdfBytes: pdf.byteLength, message_id: result.message_id };
}

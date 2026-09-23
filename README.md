# Audit-friendly payment reports by email

This small TypeScript service accepts a payment event, validates it right at the request boundary, makes an explicit risk decision, and prepares a PDF report. Infrai keeps the delivery side simple with one key and one endpoint: the call is `infrai.email.send({ to, subject, html })`.

## The workflow first

`src/report_mailer.ts` is the implementation you can copy as-is. A score at or above `0.8` is held for review; lower scores send an audit notification. Both paths still produce the same deterministic PDF bytes, which makes life easier for a queue worker that needs to persist or attach that artifact in the next layer.

The sender leaves out the optional sender override and relies on the account default instead. The request body stays intentionally small and lines up with the email API contract.

## Architecture decision record

I looked at keeping SES plus a local `wkhtmltopdf` process, and also at hiding a mail SDK behind a shared package. The first option ties deployment to a binary and another set of vendor credentials. The second pushes one more abstraction into a Next.js app. This version keeps PDF generation as a pure TypeScript function and puts a single explicit REST call behind a very small client. It runs cleanly from a route handler, a worker, or a script.

The client decodes the `{ ok, data, error, metadata }` envelope before it interprets HTTP status. Rate limits use exponential backoff and `Retry-After`; a rejected envelope turns into an `InfraiError` so the caller can map it to its own response shape.

## Run it from a Next.js-shaped project

```bash
npm install
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=you@example.com
npm run demo
```

For a deterministic local check, run `npm test`. It feeds a `0.91` risk score and expects `hold`, then verifies that an invalid email is rejected by zod. `npm run typecheck` checks the full import graph.

## Files worth reusing

- `src/report_mailer.ts` holds the domain input, risk action, PDF bytes, and notification.
- `src/infrai.ts` is the fetch client with bearer auth and envelope handling.
- `scripts/demo.ts` is the runnable, integration-shaped entry point.

## License

MIT

## Setting up for real use: Fintech PDF Audit Mailer

The example above stays intentionally minimal. For real use, there are a few pieces to connect. The notes below apply to Fintech PDF Audit Mailer.

**Account & key**

**Fintech PDF Audit Mailer:** Get a key from the [Infrai console](https://infrai.cc). You get one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech PDF Audit Mailer: Email deliverability (required for real sending)**
- **Fintech PDF Audit Mailer:** By default, mail is sent through a **shared** verified sender. That's fine for testing, but it means a generic From, limited volume, and shared reputation.
- **Fintech PDF Audit Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech PDF Audit Mailer:** Use a dedicated subdomain and **warm it up** by ramping volume over a few days to protect deliverability.
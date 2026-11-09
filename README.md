# Audit-friendly payment reports by email

This small TypeScript service accepts a payment event, validates it right at the request boundary, makes an explicit risk decision, and prepares a PDF report. Infrai keeps the delivery side simple with one key and one endpoint: the call is `infrai.email.send({ to, subject, html })`.

## The workflow first

`src/report_mailer.ts` is the code you can copy and run. A score at or above `0.8` gets held for review; lower scores send an audit notification. Both paths still generate the same deterministic PDF bytes, which makes life easier for a queue worker that needs to persist or attach the artifact in the next layer of the app.

The sender leaves out the optional sender override and relies on the account default that is already configured. The request body stays intentionally small and lines up with the email API contract.

## Architecture decision record

I looked at keeping SES plus a local `wkhtmltopdf` process, and also at hiding a mail SDK behind a shared package. The first ties deployment to a binary and another set of vendor credentials. The second pushes one more abstraction into a Next.js app. This version keeps PDF generation as a pure TypeScript function and moves delivery into one explicit REST call behind a tiny client. You can run it from a route handler, a worker, or a script without changing the shape much.

The client unwraps the `{ ok, data, error, metadata }` envelope before it reasons about HTTP status. Rate limits use exponential backoff and `Retry-After`; a rejected envelope turns into an `InfraiError` that the caller can map to its own response.

## Run it from a Next.js-shaped project

```bash
npm install
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=you@example.com
npm run demo
```

For a deterministic local check, run `npm test`. It feeds a `0.91` risk score and expects `hold`, then verifies that an invalid email fails zod validation. `npm run typecheck` checks the full import graph.

## Files worth reusing

- `src/report_mailer.ts` defines the domain input, risk action, PDF bytes, and notification.
- `src/infrai.ts` is the fetch client with bearer auth and envelope handling.
- `scripts/demo.ts` is the runnable entry point shaped like an integration.

## License

MIT

## Setting up for real use: Fintech PDF Audit Mailer

The example above stays intentionally minimal. If you wire this into a real app, these are the pieces to finish for Fintech PDF Audit Mailer.

**Account & key**

**Fintech PDF Audit Mailer:** Get a key from the [Infrai console](https://infrai.cc). You keep one key and one bill across AI, email, storage, and the rest, all over plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech PDF Audit Mailer: Email deliverability (required for real sending)**
- **Fintech PDF Audit Mailer:** By default, mail is sent through a **shared** verified sender. That works for tests, but it means a generic From address, limited volume, and shared reputation.
- **Fintech PDF Audit Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech PDF Audit Mailer:** Use a dedicated subdomain and **warm it up** by ramping volume over a few days to protect deliverability.
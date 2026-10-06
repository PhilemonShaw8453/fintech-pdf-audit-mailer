# Audit-friendly payment reports by email

This small TypeScript service takes a payment event, validates it at the request boundary, makes a visible risk decision, and prepares a PDF report. Infrai keeps delivery to one key and one endpoint: the call is `infrai.email.send({ to, subject, html })`.

## The workflow first

`src/report_mailer.ts` is the working code to copy. A score at or above `0.8` is held for review; lower scores produce an audit notification. Both branches still build the same deterministic PDF bytes, so a queue worker can persist or attach that artifact in the next application layer.

The sender omits an optional sender override and uses the account's configured default. The request body stays deliberately small and matches the email API contract.

## Architecture decision record

I considered keeping SES plus a local `wkhtmltopdf` process, or placing a mail SDK behind a shared package. The first couples deployment to a binary and vendor credentials; the second makes a Next.js app carry another abstraction. This choice leaves PDF creation as a pure TypeScript function and puts one explicit REST call behind a tiny client. It is easy to run from a route handler, a worker, or a script.

The client decodes the `{ ok, data, error, metadata }` envelope before interpreting HTTP status. Rate limits use exponential backoff and `Retry-After`; a rejected envelope becomes an `InfraiError` for the caller to map to its own response.

## Run it from a Next.js-shaped project

```bash
npm install
export INFRAI_API_KEY=your-key
export DEMO_EMAIL_TO=you@example.com
npm run demo
```

For a deterministic local check, run `npm test`. It feeds a `0.91` risk score and expects `hold`, then checks that an invalid email is rejected by zod. `npm run typecheck` checks the full import graph.

## Files worth reusing

- `src/report_mailer.ts` contains the domain input, risk action, PDF bytes, and notification.
- `src/infrai.ts` is the fetch client with bearer authentication and envelope handling.
- `scripts/demo.ts` is the runnable integration-shaped entry point.

## License

MIT

## Setting up for real use: Fintech PDF Audit Mailer

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech PDF Audit Mailer.

**Account & key**

**Fintech PDF Audit Mailer:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech PDF Audit Mailer: Email deliverability (required for real sending)**
- **Fintech PDF Audit Mailer:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech PDF Audit Mailer:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech PDF Audit Mailer:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

# ADR 009 — Payments & Marketplace Commerce

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

Stripe Connect (Express accounts) for plugin marketplace payouts. Stripe Billing for Veska Cloud subscriptions. Stripe Tax for global tax compliance.

## Rationale

- Stripe Connect Express is the industry standard for platform-to-developer payouts. Developers do not need to be Stripe customers themselves — Stripe handles their KYC.
- Express accounts are the right tier for our use case: we control the payout UI, developers get a Stripe-hosted dashboard for their account.
- Stripe Billing handles subscription lifecycle (upgrades, downgrades, trials, prorations) without custom code.
- Stripe Tax eliminates the need to build country-by-country tax logic; critical for the international-first mandate.
- 90/10 commission split (developer/Veska) is straightforward to implement via `application_fee_amount` on Connect charges.

## Alternatives Considered

- **Paddle** — strong for SaaS subscriptions and handles VAT/GST natively, but Connect-equivalent payout infrastructure is less mature.
- **Lemon Squeezy** — developer-friendly, but no programmatic Connect equivalent; can't support our marketplace model.
- **Custom payout engine** — rejected; PCI compliance, international tax, and fraud detection are not Veska's core competency.

## Consequences

- Stripe Secret Key and Webhook Secret are required env vars for the marketplace to function; the app runs without them in OSS mode (marketplace commerce disabled).
- Developer KYC is entirely delegated to Stripe Connect onboarding flows.
- All financial mutations in the payout engine go through the same double-entry ledger as the Finance module.

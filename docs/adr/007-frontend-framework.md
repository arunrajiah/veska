# ADR 007 — Admin Frontend Framework

**Status:** Accepted  
**Date:** 2026-05-13

## Decision

Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui for the admin UI. Same stack for the marketing site and marketplace.

## Rationale

- Next.js 15 with the App Router provides React Server Components for fast initial loads, Server Actions for form submissions (no API route boilerplate for simple mutations), and built-in image/font optimization for the marketing site.
- Tailwind v4 + shadcn/ui gives us a comprehensive, accessible component library where we own the component source — no version lock-in, no opaque black-box components.
- Single stack across admin, marketing, and marketplace minimises context-switching and allows shared components (via `packages/ui`).
- shadcn/ui components are built on Radix UI primitives, which are fully accessible out of the box.

## Alternatives Considered

- **Remix** — excellent progressive enhancement story, but smaller ecosystem and the admin UI is not a public-facing app where that matters most.
- **SvelteKit** — faster and lighter, but TypeScript support (while good) is less mature than React + TS, and fewer contributors know it.
- **Vite + React SPA** — simpler but loses SSR for the marketing/marketplace sites where SEO matters.

## Consequences

- `apps/admin`, `apps/marketing`, `apps/marketplace` are all Next.js 15 apps.
- Shared UI components live in `packages/ui` (shadcn/ui components copied and customised there).
- Magic-link views are Next.js pages rendered server-side with the JWT decoded at the route level.
- The admin UI is intentionally minimal — conversational interface first, traditional screens never.

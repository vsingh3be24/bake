# Resume bullets — Lucky's Home Harvest

Pick the length that fits the section. All describe the same build
truthfully — scope and technique, no invented metrics (no fake user counts
or made-up percentage improvements) since this wasn't a production
deployment with real traffic to measure.

## One-line (skills list / project title row)

> **Lucky's Home Harvest** — Full-stack MERN bakery ordering platform with guest checkout, capacity-aware scheduling, and an owner operations console. (React, Node/Express, MongoDB)

## Standard (3–5 bullets, most resumes)

- Built a full-stack MERN ordering platform (React 19, Express, MongoDB) with separate guest-checkout customer storefront and owner operations console, covering catalog, cart, checkout, live order tracking, and analytics.
- Designed a capacity-aware scheduling engine computing real-time delivery availability from per-product prep time and daily/slot capacity, replacing what would otherwise be a naive static calendar.
- Implemented atomic order placement using MongoDB replica-set transactions with server-side price/stock re-validation, guarded conditional stock decrements to prevent overselling under concurrent orders, and snapshotted pricing so later catalog edits can't rewrite past orders.
- Built a rule-based offer engine supporting seven discount types, time-boxed flash campaigns, usage/eligibility limits, and stacking/priority resolution — fully re-validated server-side so pricing can never be client-supplied.
- Hardened the auth/security layer: role-separated JWTs with independent secrets and algorithm pinning, rate limiting correct behind a reverse proxy, mass-assignment protection, and boot-time environment validation that refuses to start on a misconfigured secret.

## Extended (portfolio site / detailed project page)

> **Lucky's Home Harvest** — Full-stack MERN ordering platform for a home bakery with separate customer and owner portals. Built a capacity-aware scheduling engine (per-product prep time, daily/slot capacity, automatic earliest-delivery calculation) and a configurable offer engine supporting seven discount types with time-boxed flash campaigns, recurring schedules, and stacking rules. Implemented atomic order placement with MongoDB transactions, server-side price/stock snapshotting, and automatic stock reconciliation on cancellation. Owner dashboard provides inline inventory control, a drag-and-drop kitchen queue with an auto-aggregated production sheet, and revenue analytics via MongoDB aggregation pipelines bucketed in the shop's local timezone. Animation layer built with Framer Motion and Lenis, respecting `prefers-reduced-motion`. Deployed across MongoDB Atlas, Render, and Vercel with role-separated JWT auth, rate limiting, and a cross-domain cookie policy.

## If asked in an interview: what was actually hard

Three things, if you want a story ready:
1. **The availability engine** — date math across timezones, aggregating
   per-slot and per-product capacity against already-placed orders, and
   making sure "available" in the UI always means truly bookable.
2. **Offer stacking** — several offers can apply to one cart at once;
   getting priority/limit resolution right, and re-deriving it 100%
   server-side so a client can never hand back its own discount number.
3. **The cross-domain cookie bug caught during deploy** — client and API
   ended up on different domains (Vercel/Render), which silently breaks a
   `SameSite=Strict` auth cookie with no visible error. Only shows up once
   you actually deploy to two separate domains, not in local dev.

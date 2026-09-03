# Deploying Lucky's Home Harvest

Two providers: MongoDB Atlas (database) and Render (both the API and the
client — Render hosts static sites too, so there's no separate Vercel step).
Do them in order — each later step needs a value from the one before it.

## 1. MongoDB Atlas

1. Create a free (M0) cluster at https://cloud.mongodb.com.
2. Database Access → add a user with a strong generated password (not your
   Atlas login password). Give it read/write on this project only.
3. Network Access → add `0.0.0.0/0`. Render's free tier has no static
   outbound IP, so there's no narrower range to allow — the database user's
   password is what actually gates access, not the IP list.
4. Connect → Drivers → copy the SRV connection string. It looks like
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`. Append a
   database name before the `?`, e.g. `.../lucky-home-harvest?retryWrites=true...`
   — this becomes `MONGO_URI`.

## 2. Render — one Blueprint, two services

`render.yaml` at the repo root describes both services in one Blueprint:
`lhh-api` (the Express server) and `lhh-client` (the built Vite app, served
as a static site). It intentionally leaves every secret-shaped value unset
(`sync: false`) so nothing sensitive lives in git.

1. New → Blueprint → connect this repo. Render reads `render.yaml` and
   proposes both services at once.
2. Fill in `lhh-api`'s `sync: false` variables:
   - `MONGO_URI` — from step 1.
   - `OWNER_PHONE`, `OWNER_PASSWORD_HASH` — see the seeding note below.
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
     — from your Cloudinary dashboard, if you use image upload.
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — optional,
     see § 5. Leave blank to skip push notifications for now.
   - `CLIENT_URL` — you don't have `lhh-client`'s URL yet. Put in a
     placeholder (e.g. `https://placeholder.onrender.com`) for now; you'll
     fix this in step 5 once Render hands you the real one.
   - `CUSTOMER_JWT_SECRET` / `OWNER_JWT_SECRET` are `generateValue: true` —
     Render generates two independent random secrets itself. Leave them.
3. Deploy `lhh-api` first. Watch the logs — `validateEnv()`
   (`server/utils/validateEnv.js`) refuses to boot on a missing var,
   identical JWT secrets, or (in production) a JWT secret under 32 chars or
   a missing `CLIENT_URL`, and says exactly which. If it refuses, that's the
   fix list, not a mystery.
4. Once live, hit `https://<lhh-api>.onrender.com/api/health` — it should
   return `{"ok":true}`. That confirms the app booted and connected to
   Atlas (the process would have exited otherwise).
5. Now fill in `lhh-client`'s variables using the real API URL from step 4:
   - `VITE_API_URL` = `https://<lhh-api>.onrender.com/api`
   - `VITE_WHATSAPP` = `918017853043` (or the real order-WhatsApp number)

   These are build-time only (Vite bakes them into the bundle) — changing
   either later means a redeploy of `lhh-client`, not just an env change.
6. Deploy `lhh-client`. Render gives you a `https://<lhh-client>.onrender.com`
   URL.
7. Go back to `lhh-api` and set `CLIENT_URL` to that exact URL (no trailing
   slash) — replacing the placeholder from step 2. Redeploy `lhh-api` so
   CORS and the cross-origin cookie actually target the real client origin.
8. Seed the database once, from your own machine, pointed at the Atlas URI:
   ```bash
   cd server
   MONGO_URI="<your atlas uri>" OWNER_PHONE="8017853043" npm run seed
   ```
   Leave `OWNER_PASSWORD_HASH` unset and the script prints a generated
   owner password once — save it, it's not shown again. (Alternatively,
   bcrypt-hash your own password locally and set `OWNER_PASSWORD_HASH`
   before seeding, or as a Render env var before first boot.)

   **Re-running this later is safe.** Once the shop has products, the seed
   switches to safe mode: it adds any catalog category that's missing (so a
   later release adding one lands with a re-run) and leaves your products,
   stock levels and offers completely alone. It only wipes and reinstalls
   the demo catalog on an empty database, or if you explicitly pass
   `--force` — which you should not do once real orders exist, since it
   leaves them pointing at deleted products.

Render's free tier spins down web services after inactivity — the first
request after a quiet period takes ~30-50s while `lhh-api` wakes up. The
static `lhh-client` site doesn't have this problem (nothing to spin up), so
the shop's homepage always loads fast; only the *first* API call after a
quiet spell is slow. That's expected, not a bug.

## 3. Why both services are still cross-site

`lhh-client.onrender.com` and `lhh-api.onrender.com` look like they share a
domain, but `onrender.com` is a public suffix (like `vercel.app` or
`github.io`) — every customer's subdomain on it is treated as a separate
site by the browser, precisely so one Render customer's cookies can't leak
into another's. So this is exactly the same cross-site situation as a
Vercel+Render split would be, not an exception to it.

`server/utils/jwt.js`'s `cookieOptions()` sets `sameSite: 'none', secure:
true` only when `NODE_ENV === 'production'` (locally, both run on
`localhost` — same site — so it stays `'strict'`). `credentials: true` is
already set on both the server's CORS config (`server/app.js`) and the
client's axios instance (`client/src/lib/api.js`). All three pieces have to
agree, or login silently fails — the browser drops the cookie with no
visible error, which is exactly the kind of bug that only shows up once the
two halves are on separate real domains, not in local dev.

## 4. Post-deploy checklist

Walk the acceptance criteria in `SPEC.md` Part L against the live URLs, not
just against localhost:

- [ ] Owner login works on the deployed client (confirms the cross-origin
      cookie round-trip above is actually working)
- [ ] Customer signup/login works the same way
- [ ] Placing a guest order end-to-end succeeds (money path — the one
      that matters most)
- [ ] Refreshing on a deep link (e.g. `/menu/cakes`, `/me/orders`) loads
      correctly instead of 404ing (confirms the SPA rewrite in `render.yaml`)
- [ ] `GET /api/health` on the `lhh-api` URL returns `{"ok":true}`
- [ ] Browser devtools → Network on a login call: the `Set-Cookie` response
      header shows `SameSite=None; Secure`
- [ ] Owner dashboard's `/api/owner/*` routes reject a customer-only cookie
      (still true in prod — this was verified against a local backend in
      the Phase 23 security pass, worth a spot-check against the real one)

## 5. Push notifications (optional)

The owner's "Send Notification" panel (Settings → Content) needs a VAPID key
pair. Without one it shows a plain "not set up yet" message and everything
else keeps working, so you can skip this and come back to it.

```bash
npx web-push generate-vapid-keys
```

Put the pair in `lhh-api`'s env as `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`,
plus `VAPID_SUBJECT` (a `mailto:` address push services can reach you at).

**Generate this once and keep it.** The public key is baked into every
customer's stored subscription — rotating the pair silently invalidates all
of them, and every customer would have to opt in again. Don't reuse the
local dev pair from `server/.env` in production.

## Environment variable reference

| Var | Where | Notes |
|---|---|---|
| `MONGO_URI` | `lhh-api` | Atlas SRV string, includes db name |
| `CUSTOMER_JWT_SECRET`, `OWNER_JWT_SECRET` | `lhh-api` | Auto-generated by the Blueprint; must differ |
| `JWT_EXPIRY` | `lhh-api` | `7d` |
| `OWNER_PHONE` | `lhh-api` | `/^[6-9]\d{9}$/` |
| `OWNER_PASSWORD_HASH` | `lhh-api` | bcrypt cost 12; blank = seed script generates one |
| `CLOUDINARY_*` | `lhh-api` | optional — only needed for image upload |
| `CLIENT_URL` | `lhh-api` | exact `lhh-client` origin, no trailing slash |
| `SHOP_TIMEZONE` | `lhh-api` | `Asia/Kolkata` |
| `NODE_ENV` | `lhh-api` | `production` (see § 3 — this is what flips the cookie policy) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `lhh-api` | optional — see § 5 |
| `VITE_API_URL` | `lhh-client` | `https://<lhh-api>.onrender.com/api` — build-time only |
| `VITE_WHATSAPP` | `lhh-client` | order WhatsApp number, no `+` or spaces — build-time only |

Full reference with inline explanations: `server/.env.example`,
`client/.env.example`.

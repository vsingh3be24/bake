# Deploying Lucky's Home Harvest

Three services, three providers: MongoDB Atlas (database), Render (API), Vercel
(client). Do them in that order — each later step needs a value from the one
before it.

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

## 2. Render (API)

`render.yaml` at the repo root already describes this service (Render calls
it a Blueprint) — build/start commands, health check path, and every env var
name the server needs. It intentionally leaves the secret-shaped values
unset (`sync: false`) so nothing sensitive lives in git.

1. New → Blueprint → connect this repo. Render reads `render.yaml` and
   proposes a `lhh-api` web service rooted at `server/`.
2. Fill in the `sync: false` variables in the Render dashboard:
   - `MONGO_URI` — from step 1.
   - `OWNER_PHONE`, `OWNER_PASSWORD_HASH` — see note below.
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
     — from your Cloudinary dashboard, if you use image upload.
   - `CLIENT_URL` — you don't have the Vercel URL yet. Put in a placeholder
     (e.g. `https://placeholder.vercel.app`) for now; you'll fix this in
     step 4 once Vercel hands you the real one.
   - `CUSTOMER_JWT_SECRET` / `OWNER_JWT_SECRET` are `generateValue: true` —
     Render generates two independent random secrets itself. Leave them.
3. Deploy. Watch the logs — `validateEnv()` (`server/utils/validateEnv.js`)
   refuses to boot on a missing var, identical JWT secrets, or (in
   production) a JWT secret under 32 chars or a missing `CLIENT_URL`, and
   says exactly which. If it refuses, that's the fix list, not a mystery.
4. Once live, hit `https://<your-service>.onrender.com/api/health` — it
   should return `{"ok":true}`. That confirms the app booted and connected
   to Atlas (the process would have exited otherwise).
5. Seed the database once, from your own machine, pointed at the Atlas URI:
   ```bash
   cd server
   MONGO_URI="<your atlas uri>" OWNER_PHONE="8017853043" node seed/index.js
   ```
   Leave `OWNER_PASSWORD_HASH` unset and the script prints a generated
   owner password once — save it, it's not shown again. (Alternatively,
   bcrypt-hash your own password locally and set `OWNER_PASSWORD_HASH`
   before seeding, or as a Render env var before first boot.)

Render's free tier spins down after inactivity — the first request after a
quiet period takes ~30-50s while it wakes up. That's expected, not a bug.

## 3. Vercel (client)

`client/vercel.json` rewrites every path to `index.html`, which
`BrowserRouter` needs — without it, refreshing on e.g. `/menu/cakes`
404s instead of loading the SPA and letting React Router take over.

1. New Project → import this repo → set **Root Directory** to `client`.
   Vercel auto-detects the Vite framework preset (build `npm run build`,
   output `dist`) once the root is set correctly.
2. Environment Variables:
   - `VITE_API_URL` = `https://<your-render-service>.onrender.com/api`
   - `VITE_WHATSAPP` = `918017853043` (or the real order-WhatsApp number)
3. Deploy. Vercel gives you a `https://<project>.vercel.app` URL.
4. Go back to Render and set `CLIENT_URL` to that exact URL (no trailing
   slash) — this is the placeholder from step 2. Redeploy the API so CORS
   and the cross-origin cookie actually target the real client origin.

## 4. Cross-domain cookies — why this step exists

The client (`*.vercel.app`) and API (`*.onrender.com`) are different sites,
so every API call from the browser is a **cross-site** request. Auth relies
on an httpOnly cookie; `server/utils/jwt.js`'s `cookieOptions()` sets
`sameSite: 'none', secure: true` only when `NODE_ENV === 'production'`
(locally, both run on `localhost` — same site — so it stays `'strict'`).
`credentials: true` is already set on both the server's CORS config
(`server/app.js`) and the client's axios instance (`client/src/lib/api.js`).
All three pieces have to agree, or login silently fails — the browser drops
the cookie with no visible error, which is exactly the kind of bug that only
shows up once the two halves are on separate real domains, not in local dev.

## 5. Post-deploy checklist

Walk the acceptance criteria in `SPEC.md` Part L against the live URLs, not
just against localhost:

- [ ] Owner login works on the deployed client (confirms the cross-origin
      cookie round-trip above is actually working)
- [ ] Customer signup/login works the same way
- [ ] Placing a guest order end-to-end succeeds (money path — the one
      that matters most)
- [ ] Refreshing on a deep link (e.g. `/menu/cakes`, `/me/orders`) loads
      correctly instead of 404ing (confirms the Vercel rewrite)
- [ ] `GET /api/health` on the Render URL returns `{"ok":true}`
- [ ] Browser devtools → Network on a login call: the `Set-Cookie` response
      header shows `SameSite=None; Secure`
- [ ] Owner dashboard's `/api/owner/*` routes reject a customer-only cookie
      (still true in prod — this was verified against a local backend in
      the Phase 23 security pass, worth a spot-check against the real one)

## Environment variable reference

| Var | Where | Notes |
|---|---|---|
| `MONGO_URI` | Render | Atlas SRV string, includes db name |
| `CUSTOMER_JWT_SECRET`, `OWNER_JWT_SECRET` | Render | Auto-generated by the Blueprint; must differ |
| `JWT_EXPIRY` | Render | `7d` |
| `OWNER_PHONE` | Render | `/^[6-9]\d{9}$/` |
| `OWNER_PASSWORD_HASH` | Render | bcrypt cost 12; blank = seed script generates one |
| `CLOUDINARY_*` | Render | optional — only needed for image upload |
| `CLIENT_URL` | Render | exact Vercel origin, no trailing slash |
| `SHOP_TIMEZONE` | Render | `Asia/Kolkata` |
| `NODE_ENV` | Render | `production` (see § 4 — this is what flips the cookie policy) |
| `VITE_API_URL` | Vercel | `https://<render-service>.onrender.com/api` |
| `VITE_WHATSAPP` | Vercel | order WhatsApp number, no `+` or spaces |

Full reference with inline explanations: `server/.env.example`,
`client/.env.example`.

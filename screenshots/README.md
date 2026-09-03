# Screenshots

Empty on purpose — I verified every screen listed below live in a browser
against a seeded backend while building this (see the phase-by-phase build
log), but couldn't export those frames as image files from that session.
Drop the real captures in here with these exact filenames and the main
[README](../README.md) will pick them up automatically.

Two minutes, seeded data included:

```bash
cd server && npm run seed && npm run dev   # http://localhost:5000
cd client && npm run dev                    # http://localhost:5173
```

| Filename | Route | What to show |
|---|---|---|
| `home.png` | `/` | Hero + Hot Selling row |
| `menu.png` | `/menu` | Filter chips + product grid, one item on sale |
| `product-detail.png` | `/product/<slug>` | Variant picker, qty stepper, sticky add-to-cart on mobile width |
| `checkout.png` | `/checkout` | Step 2 or 3 — date/slot picker or the order summary with an offer applied |
| `owner-dashboard.png` | `/owner` | Stat tiles + a low-stock alert banner (seed a product below `lowStockAt` first) |
| `owner-queue.png` | `/owner/queue` | Kitchen queue with a few orders in different columns |
| `owner-analytics.png` | `/owner/analytics` | Revenue chart with a few days of seeded orders |
| `mobile-menu.png` | `/menu` at 375px width | Bottom nav + responsive grid (devtools device toolbar) |

Owner login after seeding: phone `8017853043`, password is printed once to
the terminal by the seed script (or set `OWNER_PASSWORD_HASH` beforehand).

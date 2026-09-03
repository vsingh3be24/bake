# Lucky's Home Harvest — Complete Build Spec (v2)
> Homemade bakery ordering platform — customer portal + owner control panel
> Contact: **+91 80178 53043** | *Fresh • Hygienic • Homemade*
---
## 0. Ek Line Mein
Do alag-alag portal, ek hi codebase:
```
                    ┌─────────────────────────┐
                    │   luckyshomeharvest.com │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
     ┌────────▼────────┐                 ┌────────▼────────┐
     │  CUSTOMER SIDE  │                 │   OWNER SIDE    │
     │       /         │                 │    /owner       │
     ├─────────────────┤                 ├─────────────────┤
     │ Menu browse     │                 │ Live orders     │
     │ Cart + checkout │                 │ Stock qty set   │
     │ My Orders       │                 │ Flash offers    │
     │ Track live      │                 │ Baking list     │
     │ Reorder         │                 │ Queue board     │
     │ Favourites      │                 │ Analytics       │
     │ Addresses       │                 │ Customers       │
     │ Loyalty points  │                 │ Settings        │
     └─────────────────┘                 └─────────────────┘
       Phone login                        Password + JWT
       (guest bhi allowed)                Owner only
```
**Golden rule:** Customer ko sirf wo dikhega jo usse matlab hai. Owner ko *sab kuch* control karne ko milega — bina developer ko call kiye. Koi bhi cheez hardcode nahi — price, stock, offer, timing, delivery charge, shop open/close — sab dashboard se editable.
---
# PART A — DESIGN SYSTEM
## A.1 Colors (branding se nikale)
```css
:root {
  /* Base */
  --cream:        #FDF6E9;   /* page background */
  --cream-deep:   #F5E9D3;   /* card background */
  --paper:        #FFFDF7;   /* elevated surface */
  /* Brand */
  --brown:        #4A2C1A;   /* headings, logo */
  --brown-soft:   #7A5230;   /* body text */
  --brown-mute:   #A98D74;   /* muted / placeholder */
  --maroon:       #8C1D2F;   /* primary CTA */
  --maroon-dark:  #6E1524;   /* CTA hover */
  --crimson:      #C2185B;   /* sale / flash accent */
  --olive:        #5C6B33;   /* healthy tag, success-ish */
  --gold:         #C9A227;   /* dividers, ornaments */
  /* Status */
  --in-stock:     #2E7D32;
  --low-stock:    #E58E26;
  --out-stock:    #C62828;
  --info:         #1565C0;
  /* Shadows */
  --sh-sm: 0 2px 8px rgba(74,44,26,.06);
  --sh-md: 0 8px 24px rgba(74,44,26,.10);
  --sh-lg: 0 20px 48px rgba(74,44,26,.16);
  --r-sm: 10px;  --r-md: 16px;  --r-lg: 24px;  --r-pill: 999px;
}
```
## A.2 Typography
```
Display / Logo   : "Playfair Display"  700 / italic
Headings         : "Cormorant Garamond" 600
Body + UI        : "Inter" 400 / 500 / 600
Prices, counts   : "Inter" 600, font-variant-numeric: tabular-nums
```
Scale: `12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64`
## A.3 Spacing & Layout
4px base scale. Container max-width `1200px`, page padding `20px` mobile / `40px` desktop. Grid gap `20px`.
## A.4 Visual Language
- Cream paper background with subtle noise texture (`background-image` SVG noise, opacity .03)
- Thin gold ornamental dividers between sections (SVG flourish)
- Cards: `--paper` bg, `--r-md` radius, `--sh-sm`, 1px `rgba(201,162,39,.2)` border
- **Zero** neon gradients, zero glassmorphism, zero glow. Warm, printed-menu feel.
- Icons: `lucide-react`, stroke 1.75px, `--brown-soft`
## A.5 "Easy to Use" Rules — Non-negotiable
| Rule | Matlab |
|---|---|
| Max 3 taps to order | Menu → Add → Checkout. Bas. |
| Har button pe clear label | "Add 4 to Cart" not "Add" |
| Price always visible | Card, cart, sticky bar — teeno jagah |
| No dead ends | Empty cart pe "Browse Menu" button, out of stock pe "Notify me" |
| Errors human bhasha mein | "Ye item aaj khatam ho gaya" not "Error 400: stock unavailable" |
| Owner dashboard = 1 click actions | Stock toggle, mark paid, status change — sab inline, no modal |
| Mobile first | 80% orders phone se aayenge. Design 375px se start karo. |
---
# PART B — DATA MODELS
## B.1 Product
```js
{
  // Identity
  name: String,                 // "Mawa Cake"
  slug: String,                 // unique
  category: ObjectId,           // ref Category
  shortDesc: String,            // card pe (max 90 chars)
  longDesc: String,             // detail page
  images: [String],             // Cloudinary

  // Variants — 500g / 1kg / box of 6
  variants: [{
    label: String,              // "500g"
    price: Number,
    salePrice: Number,          // null if no sale
    stockCount: Number,         // is variant ka stock
    sku: String
  }],
  hasVariants: Boolean,

  // Simple pricing (agar variants nahi)
  price: Number,
  salePrice: Number,
  unit: String,                 // "per piece" | "per 500g" | "box of 6"

  // ── STOCK CONTROL (owner ka main lever) ──
  stockMode: String,            // "unlimited" | "counted" | "daily_capacity"
  stockCount: Number,           // counted mode: actual units bache hue
  dailyCapacity: Number,        // daily mode: ek din mein max itne bana sakte hain
  lowStockThreshold: Number,    // default 5 — isse neeche alert
  inStock: Boolean,             // master toggle, owner override
  autoOutOfStock: Boolean,      // true = stockCount 0 hote hi apne aap band
  restockDate: Date,            // "3 Oct se available" customer ko dikhega

  // ── QUANTITY RULES ──
  minQty: Number,               // default 4 (cakes = 1)
  maxQty: Number,               // default 50 — bulk ke liye enquiry
  stepQty: Number,              // default 1

  // ── PREP TIME / QUEUE ──
  prepTimeHours: Number,        // 24 / 48 — earliest delivery calc ke liye
  isRushAvailable: Boolean,     // extra charge pe same-day
  rushCharge: Number,
  availableDays: [Number],      // [0..6] — Sunday band karna ho to

  // ── MARKETING FLAGS ──
  isHotSelling: Boolean,        // manual
  isNew: Boolean,               // "NEW" badge, 30 din auto-expire
  isChefSpecial: Boolean,
  soldCount: Number,            // auto increment
  viewCount: Number,

  // ── META ──
  tags: [String],               // ["eggless","sugar-free","high-protein","vegan"]
  allergens: [String],          // ["nuts","dairy","gluten","egg"]
  nutritionNote: String,
  isActive: Boolean,            // soft delete
  isVisible: Boolean,           // draft mode — bana rahe hain, live nahi
  sortOrder: Number,

  createdAt, updatedAt
}
```
### Stock ke 3 modes — kab kaunsa
| Mode | Kab use karo | Customer ko kya dikhega |
|---|---|---|
| `unlimited` | Cakes — order pe banate ho | Sirf "Available" |
| `counted` | Cookies ke ready batches | "Sirf 6 bache!" (low ho to) |
| `daily_capacity` | "Ek din mein 10 se zyada cake nahi bana sakti" | Us din ka slot bhar jaaye to date disable |
## B.2 Offer (Flash Offers Engine) — NAYA
```js
{
  title: String,               // "Rakhi Special — 20% Off"
  subtitle: String,            // "Sab hampers pe"
  code: String,                // "RAKHI20" — null agar auto-apply
  isAutoApply: Boolean,        // true = code likhne ki zaroorat nahi

  type: String,                // "percent" | "flat" | "bogo" | "combo"
                               // | "free_delivery" | "free_item" | "bundle_price"
  value: Number,               // 20 (percent) ya 100 (flat rupees)
  maxDiscount: Number,         // percent ke saath cap — "20% up to ₹150"
  minOrderValue: Number,       // ₹499 se upar

  // Kis pe apply hoga
  appliesTo: String,           // "all" | "category" | "product" | "cart_total"
  targetIds: [ObjectId],
  freeItemId: ObjectId,        // free_item type ke liye
  bundleProducts: [ObjectId],  // bundle_price ke liye
  bundlePrice: Number,

  // ── FLASH CONTROL ──
  isFlash: Boolean,            // true = countdown timer + top banner
  startAt: Date,
  endAt: Date,
  flashBannerText: String,     // "⚡ 2 ghante bache — 25% OFF"
  flashBannerColor: String,    // hex, default --crimson
  showCountdown: Boolean,

  // Recurring flash — "har Sunday morning"
  isRecurring: Boolean,
  recurDays: [Number],         // [0] = Sunday
  recurStartTime: String,      // "09:00"
  recurEndTime: String,        // "13:00"

  // Limits
  usageLimit: Number,          // total kitni baar (null = unlimited)
  usedCount: Number,
  perCustomerLimit: Number,    // default 1
  firstOrderOnly: Boolean,

  // Display
  isActive: Boolean,           // master switch
  priority: Number,            // clash ho to zyada priority wala
  isStackable: Boolean,        // dusre offer ke saath chal sakta hai?
  showOnHomepage: Boolean,
  badgeText: String,           // product card pe "20% OFF"

  createdAt
}
```
### Offer types — real examples
| Type | Setup | Customer ko |
|---|---|---|
| `percent` | value:20, maxDiscount:150, minOrder:499 | "20% OFF up to ₹150" |
| `flat` | value:100, minOrder:799 | "₹100 OFF on ₹799+" |
| `bogo` | targetIds:[cookies], value:1 | "Buy 4 Get 1 Free" |
| `free_delivery` | minOrder:499 | "FREE Delivery" |
| `free_item` | freeItemId:muffin, minOrder:999 | "₹999+ pe free muffin" |
| `bundle_price` | bundleProducts:[3 cakes], bundlePrice:899 | "Any 3 cakes @ ₹899" |
| `combo` | targetIds:[cake,cookies] | "Cake + Cookies combo 15% off" |
**Flash offer ka feel:** Top pe patli crimson strip, countdown live tick karti hui, product cards pe corner ribbon. End hote hi apne aap gayab — owner ko kuch karna nahi padega.
## B.3 Customer
```js
{
  name: String,
  phone: String,               // unique, login ID
  passwordHash: String,        // null agar guest
  isGuest: Boolean,
  email: String,               // optional

  addresses: [{
    label: String,             // "Home" | "Office"
    line1: String,
    landmark: String,
    area: String,
    pincode: String,
    isDefault: Boolean
  }],

  favourites: [ObjectId],      // products

  // Loyalty
  loyaltyPoints: Number,       // ₹100 = 1 point, 100 points = ₹50 off
  tier: String,                // "regular" | "silver" | "gold"

  // Stats (owner ko dikhega)
  totalOrders: Number,
  totalSpent: Number,
  lastOrderAt: Date,
  avgOrderValue: Number,

  // Owner controls
  ownerNote: String,           // "Nuts allergy — dhyan rakhna"
  isBlocked: Boolean,          // repeat fake orders
  blockReason: String,

  createdAt
}
```
## B.4 Order
```js
{
  orderId: String,             // "LHH-0109-0042"
  customer: ObjectId,          // null agar guest

  contact: { name, phone, altPhone },
  address: { line1, landmark, area, pincode },

  items: [{
    product: ObjectId,
    nameSnapshot: String,      // price/name FREEZE — baad mein change ho to order safe
    variantLabel: String,
    priceSnapshot: Number,
    qty: Number,
    subtotal: Number,
    itemNote: String           // "kam meetha"
  }],

  // Money
  itemsTotal: Number,
  offerApplied: { offerId, code, title, discountAmount },
  loyaltyPointsUsed: Number,
  loyaltyDiscount: Number,
  deliveryCharge: Number,
  rushCharge: Number,
  packagingCharge: Number,
  grandTotal: Number,

  // Payment
  paymentMethod: String,       // "UPI" | "COD"
  paymentStatus: String,       // "pending" | "paid" | "failed" | "refunded"
  upiRefNumber: String,        // 12-digit UTR customer daalega
  paymentScreenshot: String,
  paidAt: Date,
  verifiedBy: String,

  // ── LIFECYCLE + QUEUE ──
  orderStatus: String,         // "placed" | "confirmed" | "in_queue" | "preparing"
                               // | "ready" | "out_for_delivery" | "delivered"
                               // | "cancelled" | "rejected"
  statusHistory: [{ status, at, by, note }],

  queuePriority: Number,       // owner drag karke reorder kar sakta hai
  estimatedReadyAt: Date,      // auto-calc from prepTime
  actualReadyAt: Date,

  deliveryDate: Date,
  deliverySlot: String,        // "morning" (9-1) | "evening" (4-8)
  deliveryType: String,        // "delivery" | "pickup"

  // Extras
  specialNote: String,         // "Happy Birthday Riya likh dena"
  isGift: Boolean,
  giftMessage: String,
  cakeMessage: String,         // cake pe likhwana hai

  // Post-delivery
  rating: Number,              // 1-5
  review: String,
  reviewImages: [String],

  cancelReason: String,
  cancelledBy: String,         // "customer" | "owner"

  source: String,              // "web" | "whatsapp" | "phone" (owner manual entry)
  createdAt
}
```
## B.5 Settings (single document)
```js
{
  // Shop control
  shopOpen: Boolean,
  closedMessage: String,           // "Aaj chhutti hai, kal se orders lenge"
  autoCloseTime: String,           // "21:00" — iske baad orders band
  autoOpenTime: String,            // "08:00"
  holidays: [Date],                // in dates pe delivery nahi

  // ── CAPACITY / QUEUE ──
  dailyOrderCapacity: Number,      // ek din mein max 15 orders
  slots: [{
    name: String,                  // "Morning"
    timeRange: String,             // "9 AM - 1 PM"
    capacity: Number,              // is slot mein max 8 orders
    isActive: Boolean
  }],
  minPrepHours: Number,            // global fallback, default 24
  maxAdvanceDays: Number,          // 15 din se aage book nahi

  // Payment
  upiId: String,
  upiQrImage: String,
  payeeName: String,
  acceptCOD: Boolean,
  acceptUPI: Boolean,

  // Delivery
  deliveryCharge: Number,
  freeDeliveryAbove: Number,
  minOrderValue: Number,
  packagingCharge: Number,
  deliveryAreas: [{ area, pincode, charge, isActive }],
  allowPickup: Boolean,
  pickupAddress: String,

  // Rules
  globalMinQty: Number,            // 4

  // Loyalty
  loyaltyEnabled: Boolean,
  pointsPerHundred: Number,        // 1
  pointValue: Number,              // 1 point = ₹0.5
  minPointsToRedeem: Number,       // 100

  // Content
  announcementBar: String,
  announcementActive: Boolean,
  whatsappNumber: String,          // "918017853043"
  instagramUrl: String,
  aboutText: String,

  updatedAt
}
```
## B.6 Notification (in-app, dono side)
```js
{
  forRole: String,             // "owner" | "customer"
  customer: ObjectId,          // null agar owner
  type: String,                // "new_order" | "status_change" | "low_stock"
                               // | "payment_received" | "offer_started"
  title: String,
  body: String,
  link: String,
  isRead: Boolean,
  createdAt
}
```
---
# PART C — CUSTOMER PORTAL
## C.1 Routes
| Route | Page | Auth |
|---|---|---|
| `/` | Home | — |
| `/menu` | Full menu, filters | — |
| `/menu/:categorySlug` | Category page | — |
| `/product/:slug` | Product detail | — |
| `/offers` | Saare live offers | — |
| `/cart` | Cart | — |
| `/checkout` | 3-step checkout | — |
| `/order-success/:orderId` | Confetti + summary | — |
| `/track/:orderId` | Public tracking (link se) | — |
| `/login` | Phone + password | — |
| `/signup` | Naya account | — |
| `/me` | **Customer Dashboard** | ✅ |
| `/me/orders` | Order history | ✅ |
| `/me/orders/:id` | Order detail + reorder | ✅ |
| `/me/favourites` | Saved items | ✅ |
| `/me/addresses` | Address book | ✅ |
| `/me/rewards` | Loyalty points | ✅ |
| `/me/profile` | Naam, phone, password | ✅ |
| `/about` `/contact` | Static | — |
**Guest checkout chalu rahega.** Login sirf tab chahiye jab order history/favourites/points chahiye. Order place karne ke baad customer ko option milega — "Set a password to track your orders" — ek click mein account ban jaayega (phone already hai).
## C.2 Home Page — Section by Section
```
┌──────────────────────────────────────────┐
│  ⚡ FLASH: 20% off hampers — 02:14:33     │  ← flash banner (agar active)
├──────────────────────────────────────────┤
│  Logo    Menu  Offers  Track  [Cart 3]   │  ← sticky nav
├──────────────────────────────────────────┤
│                                          │
│         Lucky's Home Harvest             │  ← letter stagger animation
│      Fresh • Hygienic • Homemade         │
│         [ Order Now ]                    │
│    (floating leaves/hearts bg)           │
├──────────────────────────────────────────┤
│  🔥 Hot Selling                          │  ← horizontal scroll carousel
│  [Mawa] [Choco Chip] [PB Cookies] →      │
├──────────────────────────────────────────┤
│  Shop by Category                        │  ← 5 big cards with icons
│  [Cakes] [Cookies] [Healthy] [Buns] [Hampers]
├──────────────────────────────────────────┤
│  ⚡ Today's Offers                        │  ← live offer cards + countdown
├──────────────────────────────────────────┤
│  Why Lucky's                             │  ← 4 icons: no preservatives,
│                                          │     wholesome, homemade, hygienic
├──────────────────────────────────────────┤
│  What Customers Say                      │  ← real reviews from orders
├──────────────────────────────────────────┤
│  Order on WhatsApp  |  Footer            │
└──────────────────────────────────────────┘
```
Mobile pe bottom sticky bar: `[Menu] [Offers] [Cart] [My Orders]`
## C.3 Menu Page
**Top:** Search bar (debounced, name + tag search)
**Filter chips (horizontal scroll):**
`All` `In Stock` `On Sale ⚡` `Eggless` `Sugar-Free` `High Protein` `Under ₹300`
**Sort dropdown:** Popular / Price low-high / Price high-low / Newest
**Category tabs** sticky under nav.
**Product Card:**
```
┌─────────────────────┐
│ ⚡20% OFF      ♡    │  ← offer ribbon + favourite heart
│                     │
│     [ IMAGE ]       │
│                     │
│ 🔥 HOT SELLING      │  ← badge overlay bottom-left
├─────────────────────┤
│ Mawa Cake           │
│ Rich, soft, khoya   │
│ ⭐ 4.8 (23)          │
│                     │
│ ₹450  ₹̶5̶6̶0̶          │  ← sale price + strikethrough
│ 🟢 In Stock         │  or  🟠 Only 3 left  or  🔴 Out of stock
│ ⏱ 24 hrs prep       │
│ Min. 4 pcs          │
│                     │
│  [−]  4  [+]        │
│  [ Add to Cart ]    │
└─────────────────────┘
```
**Out of stock card:** greyscale filter, "Add" button → `[ 🔔 Notify Me ]`. Click pe phone number leke `StockAlert` mein save.
## C.4 Product Detail
- Image gallery (swipe on mobile, thumbnails desktop)
- Name, rating, short desc
- Variant selector (500g / 1kg pills) — price live update
- Price block with savings: `₹450  ₹̶5̶6̶0̶  (You save ₹110)`
- Stock line: 🟢 / 🟠 `Only 3 left` / 🔴 `Out of stock — back on 3 Oct`
- Prep time badge: `⏱ Order 24 hrs in advance`
- Qty selector (minQty se start, stepQty ke multiple)
- **Sticky bottom bar (mobile):** price + `[Add 4 to Cart — ₹1,800]`
- Accordion: Description / Ingredients & Allergens / Storage / Delivery Info
- Applicable offers list
- Related products carousel
- Reviews section
## C.5 Cart
- Item rows: image, name, variant, qty stepper, subtotal, remove
- **Live re-validation** — cart khulte hi API se stock/price check. Kuch out of stock ho gaya to inline red banner: *"Mawa Cake abhi khatam ho gaya — hata dein?"*
- Coupon input + "Available offers" list (auto-apply wale already lage honge)
- Price breakdown:
  ```
  Items          ₹1,800
  Offer RAKHI20  −₹150
  Points (100)   −₹50
  Delivery       ₹40   →  FREE
  Packaging      ₹20
  ─────────────────────
  Total          ₹1,660
  You saved ₹200 🎉
  ```
- Free delivery progress bar: `₹120 aur add karo — FREE delivery!`
- `[ Proceed to Checkout ]`
## C.6 Checkout — 3 Steps
**Step 1 — Delivery**
- Saved addresses (agar logged in) ya naya form
- Delivery / Pickup toggle
- **Date picker** — earliest date auto-calculated (Section D.5 dekho). Full dates disabled with tooltip *"Ye din slots full hain"*
- Slot selector with live capacity: `Morning (9-1) — 3 slots left`
- Special note, cake message, gift wrap checkbox
**Step 2 — Payment**
```
┌──────────────────┐  ┌──────────────────┐
│  📱 UPI / QR     │  │  💵 Cash on      │
│  Instant confirm │  │     Delivery     │
│  ✅ Recommended  │  │  Pay on delivery │
└──────────────────┘  └──────────────────┘
```
**UPI chuna to:**
- Bada QR code (Settings se)
- UPI ID + Copy button
- Mobile pe `[ Pay ₹1,660 ]` → deep link:
  ```
  upi://pay?pa={upiId}&pn={payeeName}&am={total}&cu=INR&tn=LHH-{orderId}
  ```
  GPay/PhonePe/Paytm chooser khulega, amount pre-filled
- UTR input: *"Payment ke baad 12-digit reference number daalein"*
- Screenshot upload (optional)
**COD chuna to:** direct place, `paymentStatus: pending`
**Step 3 — Review & Place**
- Full summary, edit links
- `[ Place Order — ₹1,660 ]`
**Success page:** confetti, order ID, expected delivery, `[ Send on WhatsApp ]` button:
```js
const msg = encodeURIComponent(
  `Namaste! Order place kiya hai 🙏\n\n` +
  `Order ID: ${orderId}\n${itemList}\n` +
  `Total: ₹${grandTotal}\nPayment: ${paymentMethod}\n` +
  `Delivery: ${date}, ${slot}`
);
window.open(`https://wa.me/918017853043?text=${msg}`);
```
## C.7 Customer Dashboard (`/me`)
```
┌────────────────────────────────────────┐
│  Namaste, Priya 👋                     │
│  Gold Member • 340 points (₹170 off)   │
├────────────────────────────────────────┤
│  📦 Active Order                        │
│  LHH-0109-0042 • ₹1,660                │
│  ●━━━━●━━━━●━━━━○━━━━○                  │
│  Placed Confirmed Preparing Ready Out   │
│  Expected: Today, 4-8 PM               │
│  [ Track ]  [ Call Baker ]             │
├────────────────────────────────────────┤
│  🔁 Order Again                         │
│  [Mawa Cake ×2] [PB Cookies ×4] →      │
├────────────────────────────────────────┤
│  ⚡ Offers For You                      │
├────────────────────────────────────────┤
│  Orders  Favourites  Addresses  Rewards │
└────────────────────────────────────────┘
```
**Sub-pages:**
- **My Orders** — filter (all/active/delivered/cancelled), har card pe `[Reorder]` `[Invoice]` `[Rate]`
- **Order Detail** — full timeline, items, payment status, one-click **Reorder** (poora cart bhar dega, out-of-stock items skip karke batayega)
- **Favourites** — heart kiye hue items, out-of-stock pe notify toggle
- **Addresses** — CRUD, default set
- **Rewards** — points balance, earning history, "kaise kamayein" explainer
- **Profile** — name, phone, password change
## C.8 Live Order Tracking
Vertical timeline, current step pulse animate karega:
```
✅ Order Placed          1:02 PM
✅ Confirmed by baker    1:15 PM
🔵 Preparing             2:30 PM   ← pulsing
⚪ Ready
⚪ Out for delivery
⚪ Delivered
```
Polling 30s (ya Socket.io agar time ho). Status change pe toast + optional browser notification.
---
# PART D — OWNER DASHBOARD
Yahi asli power hai. `/owner`, JWT protected.
## D.1 Layout
Left sidebar (desktop) / bottom nav (mobile):
```
🏠 Dashboard      ← default
📦 Orders         (badge: 3 new)
🍰 Products
📊 Stock          ← dedicated screen
⚡ Offers
👨‍🍳 Kitchen Queue
📋 Baking List
👥 Customers
📈 Analytics
⚙️ Settings
```
## D.2 Dashboard Home
**Top bar — Master switch:**
```
┌────────────────────────────────────────────────┐
│  Shop Status:  🟢 OPEN   [toggle]              │
│  Aaj: 7 orders / 15 capacity  ▓▓▓▓▓▓░░░ 47%   │
└────────────────────────────────────────────────┘
```
Close karte hi customer site pe banner + "Add to Cart" disabled.
**Stat cards (count-up animation):**
```
[Aaj ke Orders: 7]  [Aaj ki Sale: ₹4,280]  [Pending Payment: 3]  [Low Stock: 2 ⚠️]
```
**Alert strip (agar kuch hai):**
```
⚠️  3 items low stock — Peanut Butter Cookies (2 left), Mawa Cake (1 left)  [Fix]
🔔  2 UPI payments verify karna hai  [Verify]
⚡  "Rakhi Special" offer 3 ghante mein khatam  [Extend]
```
**New Orders feed** — realtime, sound + toast on new:
```
┌────────────────────────────────────────────┐
│ 🆕 LHH-0109-0042        2 min ago          │
│ Priya Sharma • 98765 43210                 │
│ 2× Mawa Cake, 4× PB Cookies                │
│ ₹1,660 • UPI (UTR: 4238xxxx) ⚠️ verify     │
│ Deliver: 3 Sep, Evening                    │
│ 📝 "Happy Birthday Riya likh dena"         │
│ [Accept] [Reject] [Call] [WhatsApp] [Paid] │
└────────────────────────────────────────────┘
```
**Quick actions row:** `[+ Manual Order]` `[+ Flash Offer]` `[Mark All Read]` `[Today's Baking List]`
## D.3 Orders Screen
**Status tabs with counts:** `New (3)` `Confirmed (5)` `Preparing (2)` `Ready (1)` `Out (2)` `Delivered` `Cancelled`
**Filters:** date range, payment method, payment status, slot, search (name/phone/order ID)
**Views:** List | **Kanban** (drag card between status columns — sabse fast) | Calendar
**Bulk actions:** select multiple → Confirm all / Print all / Export CSV
**Order Detail page:**
- Customer block: name, phone, `[Call]` `[WhatsApp]`, past orders count, owner note
- Items with photos, per-item notes
- Money breakdown with offer applied
- **Payment box:** method, UTR, screenshot preview, `[✅ Mark as Paid]` / `[❌ Payment Not Received]`
- **Status changer:** big pill buttons in sequence, each click timestamps
- Internal notes (customer ko nahi dikhega)
- `[Print Order Slip]` — thermal-printer friendly
- `[Cancel Order]` with reason → auto stock restore
**Manual order entry:** owner khud WhatsApp/phone orders daal sake — same form, `source: "phone"`.
## D.4 Stock Screen — "Kitna Kitna Kya Rakhna"
Ye dedicated screen hai. Table view, sab inline editable, no save button (optimistic + auto-save):
```
┌──────────────────────────────────────────────────────────────────────┐
│ [All] [In Stock] [Low ⚠️] [Out 🔴] [Unlimited]      🔍 search        │
├────┬─────────────────┬────────┬────────┬──────────┬────────┬─────────┤
│ 🖼 │ Item            │ Mode   │ Stock  │ Capacity │ Status │ Actions │
├────┼─────────────────┼────────┼────────┼──────────┼────────┼─────────┤
│ 🍰 │ Mawa Cake       │ Daily  │   —    │ [10]/day │ 🟢 ●━━ │ ⚡ ⭐ ✏️  │
│ 🍰 │ Almond Cake     │ Daily  │   —    │ [6]/day  │ 🟢 ●━━ │ ⚡ ⭐ ✏️  │
│ 🍪 │ PB Cookies      │ Count  │ [ 2 ]⚠️│    —     │ 🟠 ●━━ │ ⚡ ⭐ ✏️  │
│ 🍪 │ Jeera Biscuits  │ Count  │ [24]   │    —     │ 🟢 ●━━ │ ⚡ ⭐ ✏️  │
│ 🧁 │ Choco Muffins   │ Count  │ [ 0 ]  │    —     │ 🔴 ━━● │ ⚡ ⭐ ✏️  │
│ 🥐 │ Veg Buns        │ Unlim  │   —    │    —     │ 🟢 ●━━ │ ⚡ ⭐ ✏️  │
└────┴─────────────────┴────────┴────────┴──────────┴────────┴─────────┘
                                    ⚡ = flash offer lagao
                                    ⭐ = hot selling toggle
```
**Har row pe owner kya kar sakta hai:**
- Stock number seedha type karo → auto-save, toast "Updated"
- Daily capacity set karo → us din ke slots us hisaab se limit honge
- Stock mode dropdown se badlo
- Status toggle → instant in/out of stock (auto rule override)
- Low stock threshold set karo (default 5)
- Restock date daalo → customer ko "Back on 3 Oct" dikhega
**Bulk actions:**
- `[Select All] → [Mark In Stock]` — subah sab restock karne ke liye ek click
- `[Set Capacity for All]` — "aaj sab items 5-5 hi banaungi"
- `[Copy Yesterday's Stock]` — routine ho to time bachega
**Low stock alert panel** — top pe hamesha visible:
```
⚠️ Khatam hone wale: PB Cookies (2), Mawa Cake (1)
🔴 Khatam: Choco Muffins
```
## D.5 Prep Time & Queue Engine — Sabse Important Logic
### Earliest delivery date kaise nikalti hai
```js
function getEarliestDeliveryDate(cartItems, settings) {
  const now = new Date();
  // 1. Cart ke sabse zyada prep time wala item pakdo
  const maxPrepHours = Math.max(
    ...cartItems.map(i => i.product.prepTimeHours || settings.minPrepHours)
  );
  // 2. Abhi se utne ghante aage
  let earliest = new Date(now.getTime() + maxPrepHours * 3600_000);
  // 3. Shop band hone ke baad order? Toh agla din se count
  if (isAfterCutoff(now, settings.autoCloseTime)) {
    earliest = addDays(earliest, 1);
  }
  // 4. Holidays aur closed days skip karo
  while (isHoliday(earliest, settings) || !isDayAvailable(earliest, cartItems)) {
    earliest = addDays(earliest, 1);
  }
  return earliest;
}
```
### Din available hai ya nahi
Har date ke liye 3 check:
```js
async function getDateAvailability(date, settings) {
  const orders = await Order.countDocuments({
    deliveryDate: date,
    orderStatus: { $nin: ['cancelled', 'rejected'] }
  });
  // Check 1 — poore din ka order cap
  if (orders >= settings.dailyOrderCapacity) return { available: false, reason: 'day_full' };
  // Check 2 — har slot ki capacity
  const slots = await Promise.all(settings.slots.map(async s => {
    const used = await Order.countDocuments({ deliveryDate: date, deliverySlot: s.name });
    return { ...s, used, left: s.capacity - used, isFull: used >= s.capacity };
  }));
  if (slots.every(s => s.isFull)) return { available: false, reason: 'slots_full' };
  // Check 3 — product-wise daily capacity
  // (cart ke har item ka us din ka booked qty vs dailyCapacity)
  return { available: true, slots };
}
```
**Customer ko kya dikhega:** date picker mein full dates greyed out + tooltip. Slot dropdown mein `Morning (9-1) — 3 slots left` / `Evening (4-8) — FULL`.
### Kitchen Queue Board (`/owner/queue`)
Owner ki daily working screen. Delivery time ke hisaab se sorted:
```
┌─────────────────────────────────────────────────────┐
│  AAJ — 3 September          Load: ▓▓▓▓▓▓▓░░ 7/10   │
├─────────────────────────────────────────────────────┤
│  MORNING SLOT (9 AM - 1 PM)              3/8 booked │
│  ┌───────────────────────────────────────────────┐  │
│  │ ⋮⋮ #0042  Priya    2× Mawa Cake      🔵 Prep  │  │
│  │    Ready by 11:00 AM        [Ready] [Details] │  │
│  ├───────────────────────────────────────────────┤  │
│  │ ⋮⋮ #0043  Rahul    4× PB Cookies     ⚪ Queue │  │
│  │    Ready by 12:00 PM        [Start]  [Details]│  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  EVENING SLOT (4 PM - 8 PM)              4/8 booked │
│  ┌───────────────────────────────────────────────┐  │
│  │ ⋮⋮ #0044  Sneha    1× Almond Cake    ⚪ Queue │  │
│  │    🎂 "Happy Birthday Riya"                   │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  KAL — 4 September                       Load: 2/10 │
└─────────────────────────────────────────────────────┘
```
`⋮⋮` = drag handle. Owner apni marzi se order reorder kar sakta hai (`queuePriority` update).
## D.6 Baking List (`/owner/baking-list`) — Killer Feature
Owner subah uthke ek screen dekhe aur pata chal jaye aaj kya-kya kitna banana hai. Sab orders aggregate karke:
```
┌────────────────────────────────────────────────┐
│  BAKING LIST — 3 September    [Print] [Share]  │
├────────────────────────────────────────────────┤
│  CAKES                                         │
│  ☐  Mawa Cake              4 pcs   (3 orders)  │
│  ☐  Almond Cake            2 pcs   (2 orders)  │
│  ☐  Marble Cake            1 pc    (1 order)   │
│                                                │
│  COOKIES & BISCUITS                            │
│  ☐  Peanut Butter Cookies  16 pcs  (3 orders)  │
│  ☐  Jeera Biscuits          8 pcs  (1 order)   │
│                                                │
│  BUNS                                          │
│  ☐  Veg Masala Buns        12 pcs  (2 orders)  │
├────────────────────────────────────────────────┤
│  ⚠️  SPECIAL INSTRUCTIONS                       │
│  #0044 — "Happy Birthday Riya" cake pe likhna  │
│  #0046 — kam meetha (Sneha — nuts allergy)     │
├────────────────────────────────────────────────┤
│  Total: 6 orders • 43 items • ₹8,240           │
└────────────────────────────────────────────────┘
```
Checkbox tick karte jao, progress bar bharta jayega. Print button se A4 sheet nikal jaayegi. WhatsApp share bhi kar sakte ho helper ko.
## D.7 Offers Screen (`/owner/offers`) — Flash Control
**Tabs:** `Live (2)` `Scheduled (1)` `Expired` `Draft`
**Live offer card:**
```
┌──────────────────────────────────────────────┐
│  ⚡ Rakhi Special — 20% OFF          🟢 LIVE  │
│  Code: RAKHI20 • All hampers                 │
│  Ends in: 02:14:33  ⏱                        │
│  Used: 12 / 50                               │
│  Revenue impact: ₹8,400 (−₹1,260 discount)   │
│  [Pause] [Extend +2hrs] [Edit] [End Now]     │
└──────────────────────────────────────────────┘
```
**Create Offer — quick form:**
```
Offer Type:  [Percent ▾]  Value: [20] %  Max: ₹[150]
Applies to:  ( ) Everything  (•) Category  ( ) Products
             [Hampers ▾]
Min order:   ₹[499]
Code:        [RAKHI20]   ☑ Auto-apply (no code needed)
⚡ FLASH SETTINGS
☑ Make it a flash offer
   Start: [Today] [14:00]     End: [Today] [18:00]
   ☑ Show countdown timer
   Banner: [⚡ 4 ghante — 20% OFF hampers!]

   ☐ Repeat every: [Sun][Mon][Tue][Wed][Thu][Fri][Sat]
     from [09:00] to [13:00]
LIMITS
Total uses: [50]    Per customer: [1]
☐ First-time customers only
☐ Can stack with other offers
                    [ Preview ]  [ Launch Offer ]
```
**Preview** — live mockup dikhega ki customer ko kaise dikhega (banner + product card badge).
**One-click templates:** `Weekend 10%` · `Free Delivery Day` · `Buy 4 Get 1` · `Festival 20%` · `Clear Stock 30%`
**Clear stock shortcut:** low-stock item pe stock screen se ⚡ dabao → auto flash offer ban jaata hai us item pe, 6 ghante ke liye. Bacha hua maal nikal jaayega.
## D.8 Products Screen
Grid/list toggle. Har card pe quick toggles (stock, hot, sale, visible) — full edit ke liye click.
**Product form sections:**
1. Basic — name, category, short desc, long desc
2. Images — drag-drop multi upload, reorder, primary set
3. Pricing — price, sale price, variants builder
4. Stock — mode, count, capacity, threshold, restock date
5. Quantity rules — min, max, step
6. Prep — hours, rush available, available days
7. Tags & allergens — chips input
8. Flags — hot, new, chef special, visible
9. SEO — slug, meta
`[Save Draft]` `[Save & Publish]` `[Duplicate]` — duplicate se milte-julte items fatafat ban jayenge.
## D.9 Customers Screen
Table: name, phone, orders, total spent, last order, tier
Customer detail: order history, favourite items, avg order value, addresses, **owner private note** ("nuts allergy", "hamesha late payment"), block/unblock.
Bulk: export CSV, WhatsApp broadcast link banao (top customers ko offer bhejne ke liye).
## D.10 Analytics Screen
- Revenue line chart (7d / 30d / 90d / custom)
- Orders bar chart, daily
- Top 10 items (bar)
- Category revenue split (donut)
- Payment split UPI vs COD (donut)
- Slot preference (morning vs evening)
- Repeat customer rate %
- Avg order value trend
- Offer performance table — kaunse offer se kitna revenue aur kitna discount gaya
- Stock-out incidents — kaunsa item kitni baar khatam hua (kya zyada banana chahiye)
- Peak days heatmap
- Export CSV
## D.11 Settings Screen
Tabs: `Shop` `Payment` `Delivery` `Capacity` `Loyalty` `Content` `Account`
- **Shop:** open/close, auto open-close time, closed message, holidays calendar
- **Payment:** UPI ID, QR upload, payee name, COD on/off, UPI on/off
- **Delivery:** charge, free above, min order, packaging, area-wise charges, pickup address
- **Capacity:** daily order cap, slot builder (name/time/capacity), min prep hours, max advance days
- **Loyalty:** enable, points rate, redeem value, min points
- **Content:** announcement bar, about text, WhatsApp number, Instagram
- **Account:** password change
---
# PART E — ANIMATIONS
```bash
npm i framer-motion lenis canvas-confetti
```
## E.1 Smooth Scroll
```jsx
useEffect(() => {
  const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
  return () => lenis.destroy();
}, []);
```
## E.2 Hero Letter Stagger
```jsx
const container = { hidden: {}, show: { transition: { staggerChildren: .06, delayChildren: .3 } } };
const letter = {
  hidden: { y: 60, opacity: 0, rotate: -8 },
  show: { y: 0, opacity: 1, rotate: 0, transition: { type: 'spring', damping: 12, stiffness: 200 } }
};
<motion.h1 variants={container} initial="hidden" animate="show">
  {"Lucky's".split('').map((c, i) =>
    <motion.span key={i} variants={letter} className="inline-block">{c}</motion.span>
  )}
</motion.h1>
```
Background: 6-8 floating SVG (leaf, heart, wheat), infinite y-oscillation, staggered delay.
## E.3 Scroll Reveal — reusable
```jsx
export const Reveal = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: .6, delay, ease: [.22, 1, .36, 1] }}
  >{children}</motion.div>
);
```
Grid mein `delay={i * 0.05}` — cards ek-ek karke.
## E.4 Fly to Cart — sabse satisfying
```jsx
const flyToCart = (imgEl) => {
  const cart = document.querySelector('#cart-icon').getBoundingClientRect();
  const src = imgEl.getBoundingClientRect();
  const clone = imgEl.cloneNode();
  Object.assign(clone.style, {
    position: 'fixed', left: src.left + 'px', top: src.top + 'px',
    width: src.width + 'px', height: src.height + 'px',
    borderRadius: '50%', zIndex: 9999, pointerEvents: 'none',
    transition: 'all .8s cubic-bezier(.19,1,.22,1)'
  });
  document.body.appendChild(clone);
  requestAnimationFrame(() => Object.assign(clone.style, {
    left: cart.left + 'px', top: cart.top + 'px',
    width: '20px', height: '20px', opacity: '.3'
  }));
  setTimeout(() => clone.remove(), 800);
};
```
Saath mein cart badge `scale: [1, 1.4, 1]` bounce.
## E.5 Flash Offer Countdown
```jsx
<motion.div className="flash-bar"
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
>
  <motion.span animate={{ scale: [1, 1.15, 1] }}
    transition={{ duration: 1, repeat: Infinity }}>⚡</motion.span>
  {bannerText} — <Countdown to={endAt} />
</motion.div>
```
Last 10 minutes mein banner `backgroundColor` red pulse kare — urgency.
## E.6 Stock Toggle (owner)
```jsx
<motion.div className="toggle" onClick={toggle}
  animate={{ backgroundColor: inStock ? '#2E7D32' : '#C62828' }}>
  <motion.div className="knob" layout
    transition={{ type: 'spring', stiffness: 700, damping: 30 }} />
</motion.div>
```
Optimistic update — turant move, API background mein.
## E.7 Kanban Drag (owner orders)
`framer-motion` `Reorder.Group` / `Reorder.Item` use karo. Drop pe status API call + toast.
## E.8 Baaki
| Kahan | Kya |
|---|---|
| Product card hover | `y: -8` + shadow grow + inner image `scale: 1.08` |
| Page transitions | `AnimatePresence mode="wait"`, fade + 12px y |
| Cart drawer | Right slide-in, backdrop blur, items `AnimatePresence` |
| Checkout stepper | Progress width animate, step circle `scale: [1,1.2,1]` |
| Order success | Confetti burst + checkmark `pathLength: 0→1` |
| Dashboard stats | Count-up numbers on mount |
| New order | Card `backgroundColor` flash pulse + sound |
| Hot selling strip | Infinite marquee `x: ['0%','-50%']`, duration 22s, duplicate array |
| Loading | Skeleton shimmer, never spinner |
| Empty states | Illustration + fade-in + CTA button |
## E.9 Accessibility — mandatory
```jsx
const reduce = useReducedMotion();
const dur = reduce ? 0 : 0.6;
```
Har animation mein check. Warna motion-sensitive users ko dizzy lagega.
---
# PART F — API
## Public
```
GET   /api/products                 ?category=&inStock=&onSale=&tags=&search=&sort=&page=
GET   /api/products/:slug
GET   /api/products/hot-selling
GET   /api/categories
GET   /api/offers/active
POST  /api/offers/validate          { code, cartItems, total }
GET   /api/settings/public
GET   /api/availability             ?date=&items[]=   → slots + capacity
POST  /api/cart/validate            stock + price recheck
POST  /api/orders
GET   /api/orders/track/:orderId
POST  /api/stock-alerts             { productId, phone }
```
## Customer (JWT)
```
POST  /api/customer/signup
POST  /api/customer/login
GET   /api/customer/me
PATCH /api/customer/me
GET   /api/customer/orders
GET   /api/customer/orders/:id
POST  /api/customer/orders/:id/reorder
POST  /api/customer/orders/:id/review
GET   /api/customer/favourites
POST  /api/customer/favourites/:productId
CRUD  /api/customer/addresses
GET   /api/customer/rewards
```
## Owner (JWT + role check)
```
POST   /api/owner/login
GET    /api/owner/dashboard             stats + alerts + new orders
GET    /api/owner/orders                ?status=&from=&to=&payment=&q=
PATCH  /api/owner/orders/:id/status
PATCH  /api/owner/orders/:id/payment
PATCH  /api/owner/orders/:id/priority
POST   /api/owner/orders/manual
POST   /api/owner/orders/:id/cancel
GET    /api/owner/queue                 ?date=
GET    /api/owner/baking-list           ?date=
CRUD   /api/owner/products
PATCH  /api/owner/products/:id/stock    quick
PATCH  /api/owner/products/bulk-stock
POST   /api/owner/products/:id/duplicate
CRUD   /api/owner/offers
PATCH  /api/owner/offers/:id/toggle
PATCH  /api/owner/offers/:id/extend
POST   /api/owner/offers/quick-flash    { productId, percent, hours }
GET    /api/owner/customers
GET    /api/owner/customers/:id
PATCH  /api/owner/customers/:id/note
PATCH  /api/owner/customers/:id/block
GET    /api/owner/analytics/*
PATCH  /api/owner/settings
POST   /api/owner/upload
GET    /api/owner/notifications
```
---
# PART G — CRITICAL BUSINESS LOGIC
## G.1 Order Placement — Transaction
```js
async function placeOrder(payload) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Shop open?
    const s = await Settings.findOne();
    if (!s.shopOpen) throw new AppError(s.closedMessage);
    // 2. Har item validate — stock, minQty, price
    let itemsTotal = 0;
    for (const it of payload.items) {
      const p = await Product.findById(it.product).session(session);
      if (!p || !p.isActive) throw new AppError('Item ab available nahi hai');
      if (!p.inStock) throw new AppError(`${p.name} abhi out of stock hai`);
      if (it.qty < p.minQty) throw new AppError(`${p.name} ka minimum ${p.minQty} hai`);
      if (it.qty % p.stepQty !== 0) throw new AppError(`Quantity ${p.stepQty} ke multiple mein`);
      if (p.stockMode === 'counted' && p.stockCount < it.qty)
        throw new AppError(`${p.name} ke sirf ${p.stockCount} bache hain`);
      it.priceSnapshot = p.salePrice || p.price;   // SERVER se price, client se NAHI
      it.nameSnapshot = p.name;
      it.subtotal = it.priceSnapshot * it.qty;
      itemsTotal += it.subtotal;
    }
    // 3. Date/slot capacity
    const avail = await getDateAvailability(payload.deliveryDate, s);
    if (!avail.available) throw new AppError('Ye date full ho gayi, dusri chuniye');
    // 4. Offer server-side validate
    const discount = await applyOffer(payload.offerCode, payload.items, itemsTotal);
    // 5. Total — sab server pe
    const grandTotal = itemsTotal - discount - loyaltyDiscount
                     + deliveryCharge + packagingCharge + rushCharge;
    // 6. Stock decrement
    for (const it of payload.items) {
      await Product.updateOne(
        { _id: it.product, stockMode: 'counted' },
        { $inc: { stockCount: -it.qty, soldCount: it.qty } },
        { session }
      );
    }
    // autoOutOfStock: stockCount 0 hua to inStock false (post-save hook)
    // 7. Order create
    const order = await Order.create([{ ...payload, itemsTotal, grandTotal }], { session });
    // 8. Owner notification
    await Notification.create([{ forRole: 'owner', type: 'new_order', ... }], { session });
    await session.commitTransaction();
    return order[0];
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally { session.endSession(); }
}
```
## G.2 Cancel — stock wapas
Order cancel/reject hote hi `stockCount` restore, `soldCount` decrement.
## G.3 Auto Out-of-Stock Hook
```js
productSchema.post('findOneAndUpdate', async function(doc) {
  if (doc?.autoOutOfStock && doc.stockMode === 'counted' && doc.stockCount <= 0 && doc.inStock) {
    await Product.updateOne({ _id: doc._id }, { inStock: false });
    await Notification.create({ forRole:'owner', type:'low_stock',
      title:`${doc.name} khatam ho gaya`, body:'Stock update karein' });
  }
});
```
## G.4 Offer Auto-Expire
Cron (`node-cron`) har minute:
```js
// Expired flash offers deactivate
await Offer.updateMany({ isFlash:true, isActive:true, endAt:{ $lt: new Date() } },
                       { isActive:false });
// Recurring offers ka time aaya to activate
```
## G.5 Hot Selling — Auto
Daily cron: last 30 din ki `soldCount` ke top 5 ko `isHotSelling: true`. Owner manual override kar sake (`hotSellingLocked` flag).
---
# PART H — FOLDER STRUCTURE
```
luckys-home-harvest/
├── client/src/
│   ├── components/
│   │   ├── ui/          Button Card Input Select Modal Drawer Toast Skeleton
│   │   │                Badge Tabs Switch Stepper Tooltip EmptyState
│   │   ├── motion/      Reveal Stagger CountUp Marquee FlyToCart Confetti
│   │   ├── layout/      Navbar Footer AnnouncementBar FlashBar CartDrawer MobileNav
│   │   ├── product/     ProductCard QtySelector StockBadge PriceTag OfferRibbon
│   │   │                VariantPicker FavouriteButton NotifyMeButton
│   │   ├── checkout/    AddressForm DatePicker SlotPicker PaymentSelect UpiQr
│   │   │                OrderSummary CouponInput
│   │   ├── customer/    OrderCard OrderTimeline ReorderButton RewardsCard
│   │   └── owner/       StatCard OrderKanban StockTable OfferBuilder QueueBoard
│   │                    BakingList AnalyticsChart NotificationBell
│   ├── pages/
│   │   ├── public/      Home Menu Category ProductDetail Offers Cart Checkout
│   │   │                OrderSuccess Track Login Signup About Contact
│   │   ├── customer/    Dashboard Orders OrderDetail Favourites Addresses
│   │   │                Rewards Profile
│   │   └── owner/       Login Dashboard Orders OrderDetail Products ProductForm
│   │                    Stock Offers OfferForm Queue BakingList Customers
│   │                    CustomerDetail Analytics Settings
│   ├── store/           cartStore authStore ownerStore uiStore
│   ├── lib/             api.js upi.js whatsapp.js format.js availability.js
│   ├── hooks/           useProducts useOrders useCountdown useReducedMotion useToast
│   └── styles/          globals.css theme.css
├── server/
│   ├── models/          Product Category Order Offer Customer Settings
│   │                    Notification StockAlert Admin
│   ├── controllers/     public/ customer/ owner/
│   ├── routes/
│   ├── services/        orderService offerService stockService queueService
│   │                    analyticsService notificationService
│   ├── middleware/      auth ownerAuth validate rateLimit errorHandler
│   ├── jobs/            expireOffers.js updateHotSelling.js
│   ├── utils/            orderId cloudinary dateHelpers
│   └── seed/
└── SPEC.md
```
---
# PART I — SEED DATA
### Cakes — `minQty: 1`, `stockMode: daily_capacity`, `prepTimeHours: 24`
| Item | Short desc | Cap/day |
|---|---|---|
| Mawa Cake ⭐HOT | Traditional, rich, khoya + nuts + elaichi | 10 |
| Marble Cake | Vanilla + chocolate swirl, everyday indulgence | 8 |
| Butter Choco Chip Cake | Buttery, soft, choco chips se loaded | 8 |
| Almond Cake | Moist, nutty, real almonds ke saath | 6 |
| Jowar Jaggery Cake | Jowar + natural jaggery, guilt-free | 6 |
| Dates Choco Ragi Cake | Dates, cocoa, ragi + nuts | 6 |
### Biscuits & Cookies — `minQty: 4`, `stockMode: counted`, `prepTimeHours: 24`
| Item | Short desc |
|---|---|
| Whole Wheat Jeera Biscuits | Crisp, lightly spiced, tea-time perfect |
| Cashew Jowar Biscuits | Nutty, crunchy, jowar + cashew |
| Nuts Ragi Biscuits | Ragi + nuts, wholesome aur satisfying |
| Peanut Butter Cookies ⭐HOT | Soft, chewy, peanut butter loaded |
### Healthy Treats — `minQty: 4`, `stockMode: counted`
| Item | Short desc |
|---|---|
| Sattu & Nuts Ferrero Rocher | Sattu + nuts + seeds + jaggery, chocolate coated |
| Chocolate Protein Bar | Dates, cocoa, nuts — guilt-free indulgence |
| Assorted Chocolate Barfi Box | 6-piece box, dark + white, nuts topping |
### Muffins & Buns — `minQty: 4`, `prepTimeHours: 24`
| Item | Short desc |
|---|---|
| Choco Walnut Muffins | Rich chocolate muffins, walnut topping |
| Masala Veg Stuffed Buns | Soft buns, spiced potato filling, sesame top |
| Chicken Stuffed Buns | Soft buns, spiced chicken filling |
### Hampers — `minQty: 1`, `prepTimeHours: 48`
| Item |
|---|
| Rakhi Hamper Classic — 4 biscuit varieties |
| Rakhi Hamper Premium — Ferrero, protein bar, 3 cakes |
| Festive Gift Box — Custom selection |
### Sample Offers (seed)
| Title | Type | Setup |
|---|---|---|
| First Order 10% | percent | value:10, max:100, firstOrderOnly |
| Free Delivery ₹499+ | free_delivery | minOrder:499, autoApply |
| Weekend Flash 15% | percent | recurring Sat-Sun 9AM-1PM, isFlash |
| Buy 4 Get 1 Cookies | bogo | category:cookies |
---
# PART J — BUILD PHASES + KAUNSA MODEL
> **Opus 5** = sochna, architect karna, phaste hue debug karna
> **Sonnet 5** = likhna, bulk implementation
> **Haiku 4.5** = boring repetitive kaam
| # | Phase | Model | Kyun |
|---|---|---|---|
| 0 | Spec review, schema finalize, folder scaffold decide | **Opus 5** | Yahin galti hui to poora project bhugtega |
| 1 | Boilerplate — Vite, Express, Mongoose, Tailwind, theme.css, env | **Haiku 4.5** | Pura mechanical |
| 2 | Saare models + indexes + validation schemas | **Sonnet 5** | Volume kaam, spec clear hai |
| 3 | UI component library (Button, Card, Input, Modal, Drawer, Toast, Skeleton, Badge…) | **Sonnet 5** | Patterned, repetitive |
| 4 | Public APIs — products, categories, settings, availability | **Sonnet 5** | Straightforward CRUD |
| 5 | Seed script + Cloudinary setup | **Haiku 4.5** | Data entry |
| 6 | Customer pages — Home, Menu, Category, Product Detail | **Sonnet 5** | Standard React |
| 7 | **Animation system** — Lenis, Reveal, FlyToCart, Marquee, page transitions | **Opus 5** | Timing/easing/orchestration mein taste chahiye. Sonnet functional bana dega, "wow" nahi |
| 8 | Cart + stock revalidation + minQty logic | **Opus 5** | Edge cases bahut — race condition, price change mid-cart |
| 9 | **Availability + queue engine** (earliest date, slot capacity, product capacity) | **Opus 5** | Sabse tricky logic. Date math + aggregation. Galti hui to over-booking hoga |
| 10 | Checkout wizard + order transaction | **Opus 5** | Paisa involved hai. Transaction, snapshot, stock decrement — atomic hona chahiye |
| 11 | UPI deep link + QR + WhatsApp + success page | **Sonnet 5** | Well-defined |
| 12 | Customer auth + customer dashboard (orders, favourites, addresses, rewards) | **Sonnet 5** | CRUD-heavy |
| 13 | Live tracking + polling + notifications | **Sonnet 5** | Standard |
| 14 | Owner auth + dashboard shell + orders list + kanban | **Sonnet 5** | Volume |
| 15 | **Stock screen** — inline edit, bulk actions, auto out-of-stock hooks | **Opus 5** | Optimistic updates + hooks + bulk ops = state bugs ka ghar |
| 16 | **Offer engine** — model, validation, stacking, auto-expire cron | **Opus 5** | Sabse complex business logic. Stacking + priority + limits ka combination |
| 17 | Offer builder UI + flash banner + countdown | **Sonnet 5** | Form-heavy, logic ban chuki hai |
| 18 | Queue board + baking list aggregation | **Opus 5** | MongoDB aggregation pipelines |
| 19 | Customers screen + owner notes + block | **Sonnet 5** | CRUD |
| 20 | Analytics — aggregations + Recharts | **Opus 5** | Date bucketing aur pipelines mein galti aasan hai |
| 21 | Settings screen (7 tabs) | **Sonnet 5** | Form volume |
| 22 | Responsive polish, empty states, loading states, error messages | **Sonnet 5** | Iterative |
| 23 | Security pass — rate limit, sanitize, helmet, JWT hardening | **Opus 5** | Security mein "lagta hai theek hai" nahi chalta |
| 24 | Deploy — Vercel + Render + Atlas + env + CORS | **Sonnet 5** | Standard |
| 25 | README, screenshots, resume bullets | **Haiku 4.5** | Writing |
**Debugging rule:** Sonnet do baar mein fix na kar paaye → turant Opus. Teen baar same error dekh liya matlab problem samajh nahi aa rahi — aur wo code likhne se nahi, sochne se hal hogi.
**Claude Code workflow:**
```
Session start:  "@SPEC.md padh lo, phir Phase 9 karo"
Phase end:      "@SPEC.md ke Phase 9 acceptance check karo"
Stuck:          /model opus → "@SPEC.md Part G padho, ye bug hai: ..."
```
---
# PART K — ENV & SECURITY
**server/.env**
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<32+ random>
JWT_EXPIRY=7d
OWNER_PHONE=8017853043
OWNER_PASSWORD_HASH=<bcrypt>
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=https://luckyshomeharvest.vercel.app
```
**client/.env**
```
VITE_API_URL=https://lhh-api.onrender.com/api
VITE_WHATSAPP=918017853043
```
**Checklist:**
- [ ] Owner password bcrypt (cost 12), plain text kabhi nahi
- [ ] JWT httpOnly cookie, sameSite strict
- [ ] Customer aur owner ke alag JWT secret + role claim
- [ ] Rate limit: `/api/orders` 5/min/IP, `/api/owner/login` 5/15min
- [ ] Phone validate `/^[6-9]\d{9}$/`
- [ ] **Total hamesha server pe calculate** — client se amount kabhi mat lo
- [ ] Price/name snapshot order mein freeze
- [ ] Offer server-side validate — client se discount amount mat lo
- [ ] `helmet` + `cors` with exact origin
- [ ] `express-mongo-sanitize` — NoSQL injection
- [ ] Image upload: 5MB max, jpg/png/webp only
- [ ] Owner routes pe role middleware — customer JWT se access na ho
- [ ] `.env` gitignored, `.env.example` committed
---
# PART L — ACCEPTANCE CRITERIA
Har phase ke baad ye check karo:
**Customer side**
- [ ] Guest 3 tap mein order kar sakta hai
- [ ] Out-of-stock item add nahi hota, "Notify Me" dikhta hai
- [ ] minQty se neeche nahi ja sakta, error human bhasha mein
- [ ] Full date picker mein disabled dikhti hai
- [ ] Flash offer countdown live tick karta hai, expire pe gayab
- [ ] UPI deep link se GPay khulta hai amount ke saath
- [ ] Order ke baad WhatsApp message pre-filled jaata hai
- [ ] Reorder se cart bharta hai, unavailable items batata hai
- [ ] Poora flow 375px screen pe kaam karta hai
**Owner side**
- [ ] Shop close karte hi customer site pe orders band
- [ ] Stock number type karke auto-save, customer side turant reflect
- [ ] Stock 0 hote hi auto out-of-stock + notification
- [ ] Flash offer 2 minute mein bana sakta hai
- [ ] Kanban drag se status change hota hai
- [ ] Baking list aaj ke saare orders sahi aggregate karti hai
- [ ] Daily capacity set karne pe customer ki date picker limit ho jaati hai
- [ ] Order cancel pe stock wapas aata hai
- [ ] Analytics ke numbers manually verify karke match karte hain
---
# PART M — BAAD MEIN (v2 features)
- PWA — install prompt, offline menu cache
- Web Push notifications (owner ko new order alert, app band ho tab bhi)
- WhatsApp Business API — auto status updates
- Multi-baker / staff accounts with permissions
- Ingredient-level inventory (aata, cheeni track karo)
- Cost/margin calculator per product
- Subscription orders ("har Sunday 4 buns")
- Referral program
- Bulk/corporate enquiry form
- Instagram feed embed
- Multi-language (Hindi/English toggle)
- Delivery partner tracking
---
# PART N — RESUME BULLET
> **Lucky's Home Harvest** — Full-stack MERN ordering platform for a home bakery with separate customer and owner portals. Built a capacity-aware scheduling engine (per-product prep time, daily/slot capacity, automatic earliest-delivery calculation) and a configurable offer engine supporting seven discount types with time-boxed flash campaigns, recurring schedules, and stacking rules. Implemented atomic order placement with MongoDB transactions, server-side price/stock snapshotting, and automatic stock reconciliation on cancellation. Owner dashboard provides inline inventory control, drag-and-drop order queue, aggregated production sheets, and revenue analytics via MongoDB aggregation pipelines. Animation layer built with Framer Motion and Lenis, respecting `prefers-reduced-motion`.
---
*Spec v2.0 — Lucky's Home Harvest • +91 80178 53043*

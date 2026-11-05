# Persian Baanou — server-backed version of the supplied bakery demo

The supplied HTML’s styles, responsive layouts, fonts, licensed imagery, bilingual views, booking calendar, baking queue, walk-in counter, customer accounts, wallet, pickup verification, staff management and accounting are retained. `prototype-ui.js` contains the adapted presentation layer; `app.js` connects its operations to PHP. Client data cannot authorize payments, change balances or grant roles.

## Run

PHP 7.4+ with sessions, JSON, password hashing and mail() is required. No database extension is needed. Example: `php -S 127.0.0.1:3000 -t .`.

The service writes an atomic JSON store under a separate locked private directory, default `/home/isp85/.baanou-data` on this host. It refuses storage inside the public web root. Back up `shop.json` securely; it contains customer records and password hashes. Deployment never uploads or resets this private store. There are no sample users, sample orders, default passwords or preloaded wallet funds.

## First administrator

Open `https://naan.azenith.ca/?setup=1`. Read `setup-token.txt` in the private directory through cPanel File Manager (enable hidden files). Enter that one-time token and choose an administrator password with at least 12 characters. The token file is deleted after successful setup. Never commit or share the token. Admin can create up to two staff accounts, configure sessions/capacity and approve actual received wallet payments.

## Operational details

- White bread is initially $4.25 CAD and bran bread $4.50 CAD. A third configurable product is inactive. Store hours and the prototype’s baking settings are editable; review baking capacity/sessions before accepting production reservations.
- Guest and signed-in orders share server-enforced slot and oven capacity. A six-digit pickup code and customer-based order reference are generated server-side. A ready order can be handed over once after its code is verified.
- Cash/transfer payments require store confirmation. Wallet top-up requests do not create funds: an administrator must verify actual receipt of payment. Wallet purchases, refunds and adjustments are recorded in cents in the ledger. No online payment gateway is connected.
- Order email goes to f.heravy@gmail.com. SMS delivery is not configured; the UI explicitly says to retain the pickup code. Email transport acceptance is not proof of inbox delivery.
- Customer and staff permissions are enforced on every server operation. Anonymous availability responses redact customer details, codes and password hashes. Admin/staff passwords are server hashed; logout clears guest ownership from that session.
- Existing requests from the earlier email-only site remain in the email inbox. They are not fabricated or imported into this new queue. Enter outstanding reservations as walk-in orders if capacity must be reserved for them.

## Tests / deployment

`php tests/shop-core.php`, `php tests/order-email.php` and `php tests/order-state.php` run without sending mail. The Playwright suite requires a loopback PHP server with `BAANOU_TEST_HTTP=1`, a fresh `BAANOU_DATA_DIR`, and matching `BAANOU_TEST_DATA_DIR` for the test process. It refuses non-local test targets. Test mode disables mail and must never be enabled in production. CI creates disposable storage, tests server behavior and English/Persian desktop/mobile flows, uploads over verified FTPS, and verifies the public site and safe API state.

Keep the supplied font/image/phone-library notices in `THIRD-PARTY-NOTICES.html` and the in-page credits.

## Ordering experience

English and Persian share the same server-backed flow. Basket quantities and a valid baking-time selection can survive reload; customer details/passwords stay out of persistent browser storage. In-page form drafts and open disclosures survive language changes and failed requests. Mutations are serialized and identical in-flight requests coalesce; stale availability responses cannot overwrite a newer write. Customers can restore a previous authorized selection and choose a fresh baking time. Keyboard focus, touch targets, RTL spacing, localized errors and reduced motion are covered by the UI refinements. Automated accessibility checks supplement the disposable-server regression suite; they do not constitute a blanket WCAG certification.

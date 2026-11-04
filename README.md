# Bano — Persian Bakery, Canada

English Canadian bakery site with homestyle white bread ($4.25 CAD) and bran bread ($4.50 CAD), accessible responsive layouts, North American phone validation, Canadian postal codes, consent and order-request emails to f.heravy@gmail.com.

Bread prices are computed in integer CAD cents on the client and server. Applicable taxes, delivery fees and service area require confirmation. No payment is taken. Bano confirms each request directly. Browser history is separate from the previous Persian demo to avoid confusing toman orders with Canadian requests.

Run with PHP 7.4+: `php -S 127.0.0.1:3000`. Static serving supports UI development only. PHP mail() must be configured on the host. Mail transport acceptance is not proof of inbox delivery.

GitHub Actions deploys site files and locally hosted imagery over verified FTPS on main updates. Connection settings live in the production environment. See deploy/README.md. Images are generated editorial illustrations of the breads; actual appearance may vary. The site is an ordering application with a two-product menu, an editable order summary, direct quantity entry, a compact details step, inline validation and mobile checkout bar. Customers can restore a previous selection from local history without automatically resending it. The supplied bread reference is shown separately rather than inventing distinct product photographs. Optional fields stay collapsed and no account or online payment is required. Customer contact fields are not saved in the persistent basket.

## Browser regression checks

With a static server running at port 3000, use `tests/storefront.cjs` with Node, playwright-core and Chromium installed. The script accepts `TEST_BASE_URL` and `CHROMIUM_PATH`. It verifies four screen widths, reference photo loading, quantity prices, mobile step navigation, basket persistence, delivery validation, simulated email failures/success and history. It intercepts submission requests and sends no real emails. For this cloud environment, use `NODE_PATH=/tmp/bano-validation/node_modules node tests/storefront.cjs`.

After FTPS upload, GitHub verifies the public HTML, scripts, styles and all current images against the release bytes, plus a non-mutating GET that must return the PHP API's 405 JSON response. Inbox delivery still needs a real order test; HTTP verification does not send mail.

Order notifications use an inline-styled HTML layout with a plain-text alternative, escaped customer fields, itemized server-calculated CAD prices and Vancouver local time. References follow `AH-3434-XXXXXXXX` (first/last initials, last four phone digits, random repeat-order suffix). Run `php tests/order-email.php` to validate the reference format, email rendering and MIME encoding without sending email.

New submissions include a request UUID. The server reuses a completed receipt for a matching retry in the same PHP session, before rate limiting or sending another email. Token reuse with a different normalized order is rejected. The session retains at most 20 receipt hashes/results and no raw customer fields in that cache. This is not a persistent cross-device order database. Tests: `php tests/order-state.php`.

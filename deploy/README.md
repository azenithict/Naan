# cPanel deployment and automatic updates

The production site is https://naan.azenith.ca. Changes pushed to main trigger `.github/workflows/deploy.yml`. Manual runs are also available through GitHub Actions. The uploader sends only index.html, style.css, app.js, api/order.php and assets/bread-reference.webp; existing host configuration is preserved. Files are uploaded under temporary names and renamed per file. This is not an atomic whole-site release. A failed workflow may require rerunning after fixing the reported issue.

## One-time connection

1. Confirm the domain's actual Document Root in cPanel → Domains → Manage.
2. Create a dedicated FTP account restricted to that site's directory. Use the FTP hostname shown in Configure FTP Client. The server must support explicit FTPS on port 21 with a valid certificate matching that hostname.
3. GitHub → repository Settings → Environments → create `production`.
4. In that environment, add secrets `FTP_USER` (full FTP username) and `FTP_PASSWORD`. Never put credentials in source code or chat.
5. Add environment variables `FTP_HOST` (hostname only) and `FTP_ROOT` (absolute path visible to the FTP account). For an account restricted to the site's root, FTP_ROOT is usually `/`; verify with a client. The cPanel filesystem path and FTP-visible path can differ.
6. Actions → Deploy bakery to cPanel → Run workflow → main. Verify the run succeeds and open the site with a hard refresh.

No connection is active until these settings are supplied and a deployment succeeds. Certificate failures must be fixed using the host's correct FTPS hostname/certificate; do not disable TLS verification. If FTPS is unavailable, use an SSH/SFTP workflow after confirming host capabilities.

## Order emails

PHP 7.4+ and enabled PHP mail() are required. The endpoint validates bread quantities, Canadian contact details and consent. White bread is 425 CAD cents and bran bread is 450 CAD cents. Server-calculated bread subtotals are included in the request email. Applicable taxes, delivery fees and fulfilment remain subject to confirmation. Emails go to `f.heravy@gmail.com` with sender `orders@naan.azenith.ca`. Configure/authorize that sender with the hosting provider and verify SPF/DKIM through cPanel Email Deliverability. No SMTP password is embedded in the app.

A successful API response means the host's mail transport accepted the email, not that Gmail delivered it. After deployment, place one real test order and verify Gmail inbox/spam plus cPanel Track Delivery. If the host disables mail(), configure supported authenticated SMTP separately. Payment is not implemented. Order history remains local to each browser; there is no central order database. Session throttling is basic and is not a full abuse prevention service.

Before replacing existing files, retain a backup through cPanel. To roll back, revert the relevant app commit and rerun the deployment. Orders already emailed are not reverted.

Release validation runs both PHP email/session-receipt tests and the four-viewport browser ordering suite before uploading. The UI test uses a loopback-only static server, intercepts API submission requests and sends no real emails. The browser test dependency is installed under the runner temporary directory; it does not modify application manifests.

## Supplied-demo application

The deployed UI now comes from the user-provided Baanou bakery HTML. Uploads include `prototype-ui.js`, `initial-state.js`, `assets/prototype/*`, `api/shop-core.php`, `api/seed.json` and `api/shop.php`. The old email-only POST endpoint returns 410 so stale clients cannot bypass reservations.

Private records live outside the document root, default `/home/isp85/.baanou-data`. Never upload, reset or publish this folder. Initial administrator setup uses its one-time `setup-token.txt`; no default admin password exists. Customer-facing bookings work before setup, but the owner must activate Admin and review the provided baking schedule/capacity to operate the queue. Payments and SMS need their actual supported processes; wallet top-ups require verified store payment and SMS is explicitly not sent.

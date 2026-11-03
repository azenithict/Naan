# بانو | Bano Bakery

Persian RTL bakery ordering site for naan.azenith.ca: three breads, quantities, pickup/delivery, validated checkout, email notification and local order history.

## Run

Serve through PHP 7.4+ with mail() enabled (for example `php -S 127.0.0.1:3000`). A plain static server can display the UI but cannot submit orders. Orders are emailed to f.heravy@gmail.com by api/order.php. PHP mail acceptance does not prove inbox delivery; confirm through cPanel Track Delivery and Gmail after deployment.

Prices are samples in toman. No online payment or central order database is implemented. Optional Google Fonts falls back to local fonts. See deploy/README.md for GitHub Actions → cPanel FTPS configuration and mail sender setup.

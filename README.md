# Bano — Persian Bakery, Canada

English Canadian bakery site with homestyle white bread ($4.25 CAD) and bran bread ($4.50 CAD), accessible responsive layouts, North American phone validation, Canadian postal codes, consent and order-request emails to f.heravy@gmail.com.

Bread prices are computed in integer CAD cents on the client and server. Applicable taxes, delivery fees and service area require confirmation. No payment is taken. Bano confirms each request directly. Browser history is separate from the previous Persian demo to avoid confusing toman orders with Canadian requests.

Run with PHP 7.4+: `php -S 127.0.0.1:3000`. Static serving supports UI development only. PHP mail() must be configured on the host. Mail transport acceptance is not proof of inbox delivery.

GitHub Actions deploys site files and locally hosted imagery over verified FTPS on main updates. Connection settings live in the production environment. See deploy/README.md. Images are generated editorial illustrations of the breads; actual appearance may vary.

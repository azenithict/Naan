# Deploy naan.azenith.ca

This is currently a static demo. Orders remain in each visitor's browser; deployment does not add central order management or payment.

The release archive contains only index.html, style.css and app.js. Serve these through the server's existing web server. Inspect existing sites and configuration first; do not replace an existing global web-server configuration.

DNS: point the naan.azenith.ca A record at the server IPv4 address. Add AAAA only if IPv6 reaches the same server. Public HTTP/HTTPS ports must reach the web server for certificate issuance and site traffic.

The included Caddyfile is a proposed site configuration when Caddy is appropriate. Install it through the existing configuration's supported import mechanism, validate the complete configuration, then reload. Do not run Caddy alongside another service already bound to ports 80/443. Caddy handles certificate issuance and renewal.

For release deployment, extract the archive into a new timestamped directory below /var/www/naan/releases, verify its files, and point /var/www/naan/current at it. Preserve the previous symlink target for rollback. Do not overwrite existing deployments before inspecting them. Confirm HTTPS, hostname, HTML and JavaScript responses after deployment. If an existing Nginx/Apache/control-panel setup is present, adapt to it instead.

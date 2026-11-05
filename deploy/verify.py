"""Verify deployed static assets and PHP execution without creating an order."""
import hashlib
import json
import os
import time
from http.client import RemoteDisconnected
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "https://naan.azenith.ca/"
ROOT = Path(__file__).resolve().parents[1]
release = os.environ.get("GITHUB_SHA", "verification")
files = ["index.html", "app.js", "style.css", "initial-state.js", "prototype-ui.js", "storefront.js", "assets/storefront.css"]
files += [str(path.relative_to(ROOT)) for path in sorted((ROOT / "assets/prototype").glob("*")) if path.is_file()]
def fetch(url):
    # Some shared hosts reject Python's default client identification.
    request = Request(url, headers={"Cache-Control": "no-cache", "User-Agent": "Baanou-Release-Check/1.0"})
    for attempt in range(3):
        try:
            return urlopen(request, timeout=30)
        except (RemoteDisconnected, ConnectionResetError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2)


def verify():
    for name in files:
        url = BASE + ("" if name == "index.html" else name) + "?release=" + release
        with fetch(url) as response:
            live = response.read()
        if hashlib.sha256(live).digest() != hashlib.sha256((ROOT / name).read_bytes()).digest():
            raise SystemExit("Live file does not match this release: " + name)
        print("Verified " + name)
    try:
        with fetch(BASE + "api/order.php?release=" + release):
            raise SystemExit("Order API GET must return 405; verify PHP execution on this host.")
    except HTTPError as error:
        if error.code != 405:
            raise SystemExit("Unexpected order API status: " + str(error.code))
        body = json.loads(error.read())
        if body.get("error") != "Method not allowed.":
            raise SystemExit("Unexpected order API response.")
    try:
        with fetch(BASE + "api/reset-admin.php?release=" + release):
            raise SystemExit("Hosting-only admin reset must not be accessible over HTTP.")
    except HTTPError as error:
        if error.code != 404:
            raise SystemExit("Hosting-only admin reset must return 404.")
    with fetch(BASE + "api/shop.php?release=" + release) as response:
        state = json.loads(response.read())
    if state.get("account") is not None or "db" not in state or "csrf" not in state or state.get("testMode"):
        raise SystemExit("Unexpected production shop state.")
    if any("password" in account for account in state["db"].get("auth", [])):
        raise SystemExit("Account credentials must not be exported.")
    print("Verified server-backed shop and private storage; no order was submitted.")

if __name__ == "__main__":
    try:
        verify()
    except (Exception, SystemExit) as error:
        message = (type(error).__name__ + ": " + str(error)).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::error title=Live storefront verification::" + message)
        raise

"""Verify deployed static assets and PHP execution without creating an order."""
import hashlib
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

BASE = "https://naan.azenith.ca/"
ROOT = Path(__file__).resolve().parents[1]
release = os.environ.get("GITHUB_SHA", "verification")
files = ["index.html", "app.js", "style.css", "assets/bread-table.webp",
         "assets/white-bread.webp", "assets/bran-bread.webp"]
def verify():
    for name in files:
        url = BASE + ("" if name == "index.html" else name) + "?release=" + release
        with urlopen(Request(url, headers={"Cache-Control": "no-cache"}), timeout=30) as response:
            live = response.read()
        if hashlib.sha256(live).digest() != hashlib.sha256((ROOT / name).read_bytes()).digest():
            raise SystemExit("Live file does not match this release: " + name)
        print("Verified " + name)
    try:
        with urlopen(BASE + "api/order.php?release=" + release, timeout=30):
            raise SystemExit("Order API GET must return 405; verify PHP execution on this host.")
    except HTTPError as error:
        if error.code != 405:
            raise SystemExit("Unexpected order API status: " + str(error.code))
        body = json.loads(error.read())
        if body.get("error") != "Method not allowed.":
            raise SystemExit("Unexpected order API response.")
    print("Verified PHP endpoint; no order was submitted.")

if __name__ == "__main__":
    try:
        verify()
    except (Exception, SystemExit) as error:
        message = (type(error).__name__ + ": " + str(error)).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::error title=Live storefront verification::" + message)
        raise

"""Upload an explicit site file list using certificate-verified explicit FTPS."""
import ftplib
import os
from pathlib import Path
import ssl


def deploy():
    required = ("FTP_HOST", "FTP_USER", "FTP_PASSWORD", "FTP_ROOT")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise SystemExit("Set GitHub Actions configuration: " + ", ".join(missing))
    root = os.environ["FTP_ROOT"]
    if not root.startswith("/") or ".." in root.split("/") or any(c in root for c in "\r\n"):
        raise SystemExit("FTP_ROOT must be an absolute FTP-visible directory without traversal.")
    # The frontend switches to the new endpoint only after the endpoint is present.
    files = ["assets/bread-reference.webp", "api/order-email.php", "api/order-state.php", "api/order.php", "style.css", "app.js", "index.html"]
    base = Path(__file__).resolve().parents[1]
    with ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=60) as ftp:
        ftp.connect(os.environ["FTP_HOST"], 21)
        ftp.login(os.environ["FTP_USER"], os.environ["FTP_PASSWORD"])
        ftp.prot_p()
        ftp.cwd(root)  # Deliberately fail instead of guessing or creating the site root.
        for relative in files:
            parent, _, filename = relative.rpartition("/")
            ftp.cwd(root)
            if parent:
                try:
                    ftp.cwd(parent)
                except ftplib.error_perm as error:
                    if not str(error).startswith("550"):
                        raise
                    ftp.mkd(parent)
                    ftp.cwd(parent)
            temporary = filename + ".uploading"
            with (base / relative).open("rb") as source:
                ftp.storbinary("STOR " + temporary, source)
            ftp.rename(temporary, filename)
            print("Uploaded " + relative)
    print("Upload finished. Verify HTTPS and a real order email on the live site.")


if __name__ == "__main__":
    try:
        deploy()
    except (Exception, SystemExit) as error:
        message = type(error).__name__ + ": " + str(error)
        for name in ("FTP_USER", "FTP_PASSWORD"):
            value = os.environ.get(name)
            if value:
                message = message.replace(value, "[redacted]")
        message = message.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")
        print("::error title=FTPS deployment::" + message)
        raise

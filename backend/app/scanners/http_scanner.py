import requests


def check_http(url: str) -> dict:
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        # No redirects: a public site must not be able to bounce us to an internal address.
        response = requests.get(url, timeout=10, allow_redirects=False)
    except requests.RequestException as exc:
        return {"error": exc.__class__.__name__}
    return {
        "status_code": response.status_code,
        "server": response.headers.get("Server"),
        "redirect": response.headers.get("Location") if response.is_redirect else None,
    }

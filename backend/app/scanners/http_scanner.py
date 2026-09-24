import requests

def check_http(url):
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    response = requests.get(url, timeout=10)

    return {
        "status_code": response.status_code,
        "server": response.headers.get("Server")
    }
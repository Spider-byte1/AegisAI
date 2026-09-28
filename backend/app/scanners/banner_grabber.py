import socket


def grab_banner(host: str, port: int):
    try:
        sock = socket.socket()
        sock.settimeout(3)

        sock.connect((host, port))

        banner = sock.recv(1024).decode(errors="ignore")

        sock.close()

        return banner.strip()

    except Exception:
        return "No banner available"
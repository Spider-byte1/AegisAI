import ssl
import socket


def get_ssl_info(host):

    try:

        context = ssl.create_default_context()

        with socket.create_connection((host, 443), timeout=5) as sock:

            with context.wrap_socket(sock, server_hostname=host) as ssock:

                cert = ssock.getpeercert()

        return {

            "issuer": cert.get("issuer"),

            "subject": cert.get("subject"),

            "version": cert.get("version"),

            "serial_number": cert.get("serialNumber"),

            "not_before": cert.get("notBefore"),

            "not_after": cert.get("notAfter"),

        }

    except Exception as e:

        return {
            "error": str(e)
        }

def get_ssl(host):
    return get_ssl_info(host)
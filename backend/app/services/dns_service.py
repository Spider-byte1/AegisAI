import socket


def get_dns_info(target:str):

    try:

        ip = socket.gethostbyname(target)

        return {
            "domain": target,
            "ip": ip
        }

    except Exception as e:

        return {
            "error": str(e)
        }
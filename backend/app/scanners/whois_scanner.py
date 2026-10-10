import whois


def get_whois(domain: str):
    try:
        data = whois.whois(domain)

        return {
            "domain": data.domain_name,
            "registrar": data.registrar,
            "creation_date": str(data.creation_date),
            "expiration_date": str(data.expiration_date),
            "name_servers": data.name_servers,
        }

    except Exception as e:
        return {
            "error": str(e)
        }
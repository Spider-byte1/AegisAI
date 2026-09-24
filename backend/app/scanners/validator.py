import validators
import ipaddress

def validate_target(target: str):
    try:
        ipaddress.ip_address(target)
        return "ip"
    except ValueError:
        pass

    if validators.domain(target):
        return "domain"

    raise ValueError("Invalid target")
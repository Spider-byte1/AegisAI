def identify_service(banner: str):

    banner = banner.lower()

    if "apache" in banner:
        return "Apache Web Server"

    elif "nginx" in banner:
        return "Nginx"

    elif "openssh" in banner:
        return "OpenSSH"

    elif "microsoft-iis" in banner:
        return "Microsoft IIS"

    return "Unknown Service"
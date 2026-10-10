from app.scanners.banner_grabber import grab_banner
from app.scanners.parser import identify_service


def detect_services(target, ports):

    services = []

    for port in ports:

        banner = grab_banner(target, port)

        service = identify_service(banner)

        services.append({
            "port": port,
            "banner": banner,
            "service": service
        })

    return services
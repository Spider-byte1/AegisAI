from app.services.cve_database import CVE_DATABASE


def find_cves(service_name: str):

    for product in CVE_DATABASE:

        if product.lower() in service_name.lower():

            return CVE_DATABASE[product]

    return []
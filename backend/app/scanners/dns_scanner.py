import dns.resolver

def get_dns_records(domain):
    records = {}

    for record in ["A", "AAAA", "MX", "NS"]:
        try:
            answers = dns.resolver.resolve(domain, record)
            records[record] = [str(r) for r in answers]
        except Exception:
            records[record] = []

    return records
import nmap

scanner = nmap.PortScanner()

def run_scan(target):

    scanner.scan(
        hosts=target,
        arguments="-Pn -sV -T4"
    )

    output = []

    for host in scanner.all_hosts():

        host_info = {
            "host": host,
            "hostname": scanner[host].hostname(),
            "state": scanner[host].state(),
            "ports": []
        }

        for protocol in scanner[host].all_protocols():

            for port in scanner[host][protocol]:

                service = scanner[host][protocol][port]

                host_info["ports"].append({

                    "port": port,

                    "protocol": protocol,

                    "state": service["state"],

                    "service": service["name"],

                    "product": service.get("product"),

                    "version": service.get("version")

                })

        output.append(host_info)

    return output
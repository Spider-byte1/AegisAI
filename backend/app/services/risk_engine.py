HIGH_RISK = [21,22,23,3389,5900]

MEDIUM_RISK = [25,53,110,143,445]

LOW_RISK = [80,443]

def calculate_risk(ports):

    score = 0

    for port in ports:

        p = port["port"]

        if p in HIGH_RISK:
            score += 10

        elif p in MEDIUM_RISK:
            score += 5

        elif p in LOW_RISK:
            score += 1

    return score
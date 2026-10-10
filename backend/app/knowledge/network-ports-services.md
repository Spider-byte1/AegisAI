# Common Network Ports and Services

## Remote administration
Port 22 (SSH) is encrypted remote login and file transfer; protect it with key-based login, no direct root login and rate limiting. Port 23 (Telnet) sends everything including passwords in clear text and should be replaced by SSH. Port 3389 (RDP) is Windows Remote Desktop and a frequent ransomware entry point when exposed to the internet; put it behind a VPN with MFA. Port 5900 (VNC) is remote screen sharing and is often weakly protected.

## File transfer and sharing
Port 21 (FTP) transfers files and credentials in clear text; use SFTP or FTPS instead. Port 445 (SMB) and port 139 (NetBIOS) are Windows file sharing; SMB should never be exposed to the internet because of wormable vulnerabilities such as EternalBlue (MS17-010). Port 2049 (NFS) shares files on Unix systems and needs strict export rules. Port 69 (TFTP, UDP) has no authentication.

## Web ports
Port 80 (HTTP) is unencrypted web traffic and should redirect to HTTPS. Port 443 (HTTPS) is HTTP over TLS. Ports 8080 and 8443 are common alternative web or admin ports; check what runs there because management consoles and development servers are often exposed by accident.

## Email and directory services
Port 25 (SMTP) is server-to-server mail, and open relays are abused for spam. Ports 587 and 465 are mail submission. Port 110 (POP3) and port 143 (IMAP) give mailbox access in clear text by default; the encrypted versions are 995 and 993. Port 389 (LDAP) is directory access, with 636 (LDAPS) as the encrypted version. Port 88 is Kerberos.

## Name, time and management services
Port 53 (DNS, TCP and UDP) resolves names and can be abused for amplification attacks or tunnelling. Port 123 (NTP, UDP) is time synchronisation. Port 161 (SNMP, UDP) is network management; old versions use community strings such as "public" that are easy to guess. Port 135 is Microsoft RPC and should not be exposed.

## Databases and data stores
Port 3306 (MySQL and MariaDB), 5432 (PostgreSQL), 1433 (Microsoft SQL Server), 1521 (Oracle), 27017 (MongoDB), 6379 (Redis) and 9200 (Elasticsearch) should never be reachable from the public internet. Exposed Redis, MongoDB and Elasticsearch instances without authentication have repeatedly led to data theft and ransom attacks. Bind them to localhost or a private network and require authentication.

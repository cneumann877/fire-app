#!/bin/bash

# Fire Department Management System - Security Hardening Script
# Run this script to secure your Ubuntu server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[SECURITY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
   exit 1
fi

log "Starting security hardening for Fire Department Management System..."

# 1. Update system packages
log "Updating system packages..."
apt update && apt upgrade -y

# 2. Install security packages
log "Installing security packages..."
apt install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    logrotate \
    rsyslog \
    auditd \
    rkhunter \
    chkrootkit

# 3. Configure automatic security updates
log "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};

Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Mail "root";
EOF

cat > /etc/apt/apt.conf.d/20auto-upgrades << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";
EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

# 4. Configure UFW Firewall
log "Configuring UFW firewall..."
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (adjust port if you've changed it)
ufw allow ssh

# Allow HTTP and HTTPS for the web application
ufw allow 80/tcp
ufw allow 443/tcp

# Allow database access only from localhost
ufw allow from 127.0.0.1 to any port 5432

# Rate limiting for SSH
ufw limit ssh

# Enable firewall
ufw --force enable

log "Firewall rules configured:"
ufw status verbose

# 5. Configure Fail2Ban
log "Configuring Fail2Ban..."
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /opt/fire-department/logs/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /opt/fire-department/logs/nginx/error.log
maxretry = 10
bantime = 600
EOF

# Create custom fail2ban filters for nginx
mkdir -p /etc/fail2ban/filter.d

cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess: .* by zone .* client: <HOST>
ignoreregex =
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# 6. Secure SSH configuration
log "Securing SSH configuration..."
SSH_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp $SSH_CONFIG $SSH_CONFIG.backup

# Apply security settings
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' $SSH_CONFIG
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' $SSH_CONFIG
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' $SSH_CONFIG
sed -i 's/#Protocol 2/Protocol 2/' $SSH_CONFIG
sed -i 's/#ClientAliveInterval 0/ClientAliveInterval 300/' $SSH_CONFIG
sed -i 's/#ClientAliveCountMax 3/ClientAliveCountMax 2/' $SSH_CONFIG
sed -i 's/#MaxAuthTries 6/MaxAuthTries 3/' $SSH_CONFIG

# Add additional security settings
echo "" >> $SSH_CONFIG
echo "# Fire Department Security Settings" >> $SSH_CONFIG
echo "AllowUsers $(logname)" >> $SSH_CONFIG
echo "MaxStartups 2" >> $SSH_CONFIG
echo "LoginGraceTime 30" >> $SSH_CONFIG
echo "X11Forwarding no" >> $SSH_CONFIG

systemctl restart ssh

# 7. Configure system logging
log "Configuring system logging..."
cat > /etc/rsyslog.d/50-fire-department.conf << 'EOF'
# Fire Department Application Logs
local0.* /opt/fire-department/logs/application.log
local1.* /opt/fire-department/logs/security.log

# Separate auth logs
auth,authpriv.* /var/log/auth.log
EOF

systemctl restart rsyslog

# 8. Configure log rotation
log "Configuring log rotation..."
cat > /etc/logrotate.d/fire-department << 'EOF'
/opt/fire-department/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 root root
}

/opt/fire-department/logs/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    create 644 root root
    postrotate
        docker exec fire-department-nginx-1 nginx -s reload 2>/dev/null || true
    endscript
}
EOF

# 9. Set up system auditing
log "Configuring system auditing..."
cat > /etc/audit/rules.d/fire-department.rules << 'EOF'
# Fire Department Security Audit Rules

# Monitor authentication events
-w /var/log/auth.log -p wa -k auth_log
-w /etc/passwd -p wa -k passwd_changes
-w /etc/group -p wa -k group_changes
-w /etc/shadow -p wa -k shadow_changes

# Monitor Fire Department application files
-w /opt/fire-department/ -p wa -k fire_dept_files
-w /opt/fire-department/.env -p wa -k fire_dept_config

# Monitor network configuration
-w /etc/hosts -p wa -k network_config
-w /etc/network/ -p wa -k network_config

# Monitor Docker activities
-w /var/lib/docker/ -p wa -k docker_activities

# Monitor sudo activities
-w /etc/sudoers -p wa -k sudo_config
-w /var/log/sudo.log -p wa -k sudo_log

# Monitor crontab changes
-w /etc/crontab -p wa -k cron_config
-w /etc/cron.d/ -p wa -k cron_config
-w /var/spool/cron/ -p wa -k cron_config
EOF

systemctl restart auditd

# 10. Secure file permissions
log "Setting secure file permissions..."
chmod 700 /opt/fire-department/
chmod 600 /opt/fire-department/.env
chmod 600 /opt/fire-department/ssl/key.pem
chmod 644 /opt/fire-department/ssl/cert.pem
chown -R root:docker /opt/fire-department/

# 11. Configure Docker security
log "Configuring Docker security..."
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "live-restore": true,
  "userland-proxy": false,
  "experimental": false,
  "icc": false,
  "userns-remap": "default"
}
EOF

# Create docker user namespace mapping (if not exists)
if ! getent subuid docker > /dev/null 2>&1; then
    echo "docker:231072:65536" >> /etc/subuid
    echo "docker:231072:65536" >> /etc/subgid
fi

systemctl restart docker

# 12. Install and configure intrusion detection
log "Configuring intrusion detection..."
cat > /etc/rkhunter.conf.local << 'EOF'
# Fire Department RKHunter Configuration
MAIL-ON-WARNING=root
MAIL_CMD=mail -s "[RKHunter] Warnings found for ${HOST_NAME}"
AUTO_X_DETECT=1
WHITELISTED_IS_WHITE=1
ALLOW_SSH_ROOT_USER=no
EOF

# Update rkhunter database
rkhunter --update

# 13. Set up system monitoring script
log "Creating system monitoring script..."
cat > /opt/fire-department/security-monitor.sh << 'EOF'
#!/bin/bash

# Fire Department Security Monitoring Script
LOGFILE="/opt/fire-department/logs/security-monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting security check" >> $LOGFILE

# Check for failed login attempts
FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | tail -10 | wc -l)
if [ $FAILED_LOGINS -gt 0 ]; then
    echo "[$DATE] WARNING: $FAILED_LOGINS failed login attempts in recent logs" >> $LOGFILE
fi

# Check fail2ban status
BANNED_IPS=$(fail2ban-client status sshd | grep "Banned IP list" | wc -l)
if [ $BANNED_IPS -gt 0 ]; then
    echo "[$DATE] INFO: Fail2ban has banned IPs active" >> $LOGFILE
fi

# Check disk usage
DISK_USAGE=$(df /opt/fire-department | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 85 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOGFILE
fi

# Check for unusual network connections
CONNECTIONS=$(netstat -an | grep ":443\|:80\|:5432" | grep ESTABLISHED | wc -l)
echo "[$DATE] INFO: $CONNECTIONS active connections to web/db services" >> $LOGFILE

# Check Docker security
RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}" | tail -n +2 | wc -l)
echo "[$DATE] INFO: $RUNNING_CONTAINERS Docker containers running" >> $LOGFILE

# Check for system updates
UPDATES_AVAILABLE=$(apt list --upgradable 2>/dev/null | grep -c upgradable)
if [ $UPDATES_AVAILABLE -gt 0 ]; then
    echo "[$DATE] INFO: $UPDATES_AVAILABLE system updates available" >> $LOGFILE
fi

echo "[$DATE] Security check completed" >> $LOGFILE
EOF

chmod +x /opt/fire-department/security-monitor.sh

# Add to crontab for regular monitoring
(crontab -l 2>/dev/null; echo "0 */6 * * * /opt/fire-department/security-monitor.sh") | crontab -

# 14. Create security maintenance script
log "Creating security maintenance script..."
cat > /opt/fire-department/security-maintenance.sh << 'EOF'
#!/bin/bash

# Weekly security maintenance script
DATE=$(date '+%Y-%m-%d')
LOGFILE="/opt/fire-department/logs/security-maintenance.log"

echo "[$DATE] Starting weekly security maintenance" >> $LOGFILE

# Update rkhunter
echo "[$DATE] Updating RKHunter..." >> $LOGFILE
rkhunter --update >> $LOGFILE 2>&1

# Run rkhunter check
echo "[$DATE] Running RKHunter scan..." >> $LOGFILE
rkhunter --check --skip-keypress --report-warnings-only >> $LOGFILE 2>&1

# Update ClamAV database if installed
if command -v freshclam &> /dev/null; then
    echo "[$DATE] Updating ClamAV database..." >> $LOGFILE
    freshclam >> $LOGFILE 2>&1
fi

# Clean old logs
echo "[$DATE] Cleaning old logs..." >> $LOGFILE
find /opt/fire-department/logs -name "*.log.*" -mtime +30 -delete

# Clean Docker
echo "[$DATE] Cleaning Docker..." >> $LOGFILE
docker system prune -f >> $LOGFILE 2>&1

echo "[$DATE] Security maintenance completed" >> $LOGFILE
EOF

chmod +x /opt/fire-department/security-maintenance.sh

# Add to weekly crontab
(crontab -l 2>/dev/null; echo "0 2 * * 0 /opt/fire-department/security-maintenance.sh") | crontab -

# 15. Create security report script
log "Creating security report generator..."
cat > /opt/fire-department/generate-security-report.sh << 'EOF'
#!/bin/bash

# Generate security report for Fire Department system
REPORT_FILE="/opt/fire-department/security-report-$(date +%Y%m%d).txt"

cat > $REPORT_FILE << EOREPORT
Fire Department Management System - Security Report
Generated: $(date)
=================================================

SYSTEM INFORMATION
------------------
Hostname: $(hostname)
OS: $(lsb_release -d | cut -f2)
Kernel: $(uname -r)
Uptime: $(uptime | cut -d',' -f1 | cut -d' ' -f4-)

NETWORK SECURITY
---------------
UFW Status: $(ufw status | head -1)
Active Connections: $(netstat -an | grep ":443\|:80\|:5432" | grep ESTABLISHED | wc -l)
SSH Configuration: $(grep "^PermitRootLogin\|^PasswordAuthentication" /etc/ssh/sshd_config)

FAIL2BAN STATUS
--------------
$(fail2ban-client status)

DOCKER SECURITY
--------------
Running Containers: $(docker ps --format "table {{.Names}}\t{{.Status}}")

DISK USAGE
----------
$(df -h /opt/fire-department)

RECENT SECURITY EVENTS
---------------------
Failed SSH Logins (Last 24h): $(grep "Failed password" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l)
Sudo Usage (Last 24h): $(grep "sudo:" /var/log/auth.log | grep "$(date '+%b %d')" | wc -l)

SYSTEM UPDATES
--------------
Available Updates: $(apt list --upgradable 2>/dev/null | grep -c upgradable)
Last Update Check: $(stat -c %y /var/lib/apt/periodic/update-success-stamp 2>/dev/null || echo "Never")

FIRE DEPARTMENT APPLICATION
---------------------------
Application Status: $(systemctl is-active fire-department 2>/dev/null || echo "Manual Control")
Database Status: $(docker exec fire-department-database-1 pg_isready -U fire_admin -d fire_department 2>/dev/null || echo "Not accessible")
SSL Certificate Expiry: $(openssl x509 -enddate -noout -in /opt/fire-department/ssl/cert.pem | cut -d= -f2)

LOG SUMMARY
-----------
Application Log Size: $(du -h /opt/fire-department/logs/ | tail -1)
Recent Errors: $(grep -i error /opt/fire-department/logs/*.log 2>/dev/null | tail -5 || echo "No recent errors")

RECOMMENDATIONS
--------------
$([ $(apt list --upgradable 2>/dev/null | grep -c upgradable) -gt 0 ] && echo "- System updates available - run 'sudo apt upgrade'")
$([ $(find /opt/fire-department/logs -name "*.log" -size +100M | wc -l) -gt 0 ] && echo "- Large log files detected - consider log rotation")
$([ ! -f /opt/fire-department/.env ] && echo "- Environment file missing")
$(grep -q "your-firstdue-email@example.com" /opt/fire-department/.env 2>/dev/null && echo "- FirstDue credentials need to be configured")

END OF REPORT
=============
EOREPORT

echo "Security report generated: $REPORT_FILE"
EOF

chmod +x /opt/fire-department/generate-security-report.sh

# 16. Final security recommendations
log "Security hardening completed!"
echo ""
echo "=================================="
echo "SECURITY HARDENING SUMMARY"
echo "=================================="
echo "✅ System packages updated"
echo "✅ Firewall (UFW) configured and enabled"
echo "✅ Fail2Ban installed and configured"
echo "✅ SSH hardened (root login disabled, key-only auth)"
echo "✅ Automatic security updates enabled"
echo "✅ System auditing configured"
echo "✅ Log rotation set up"
echo "✅ Docker security enhanced"
echo "✅ Intrusion detection installed"
echo "✅ Security monitoring scripts created"
echo ""
warn "IMPORTANT NEXT STEPS:"
echo "1. Set up SSH key authentication and disable password auth completely"
echo "2. Change default application passwords"
echo "3. Configure email alerts for security events"
echo "4. Review and test backup procedures"
echo "5. Set up external log monitoring (optional)"
echo ""
echo "Security monitoring scripts:"
echo "  - /opt/fire-department/security-monitor.sh (runs every 6 hours)"
echo "  - /opt/fire-department/security-maintenance.sh (runs weekly)"
echo "  - /opt/fire-department/generate-security-report.sh (manual)"
echo ""
echo "To generate a security report:"
echo "  sudo /opt/fire-department/generate-security-report.sh"
echo ""
log "Your Fire Department system is now significantly more secure!"

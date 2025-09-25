#!/bin/bash

# Fire Department Management System - Ubuntu Deployment Script
# Run this script as root or with sudo privileges

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Update system
update_system() {
    log "Updating Ubuntu system..."
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group (if not root)
    if [[ $SUDO_USER ]]; then
        usermod -aG docker $SUDO_USER
        log "Added $SUDO_USER to docker group"
    fi
    
    # Verify Docker installation
    docker --version
    docker compose version
}

# Install Node.js (for building frontend)
install_nodejs() {
    log "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    node --version
    npm --version
}

# Create application directory structure
create_directories() {
    log "Creating application directories..."
    
    APP_DIR="/opt/fire-department"
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Create subdirectories
    mkdir -p {logs,backups,ssl,uploads,frontend}
    chown -R $SUDO_USER:$SUDO_USER $APP_DIR 2>/dev/null || true
    
    echo $APP_DIR
}

# Generate SSL certificate (self-signed for internal use)
generate_ssl() {
    log "Generating SSL certificate..."
    
    SSL_DIR="/opt/fire-department/ssl"
    
    # Generate private key
    openssl genrsa -out $SSL_DIR/key.pem 2048
    
    # Generate certificate
    openssl req -new -x509 -key $SSL_DIR/key.pem -out $SSL_DIR/cert.pem -days 365 -subj "/C=US/ST=MN/L=ElkRiver/O=FireDepartment/CN=fire-dept.local"
    
    chmod 600 $SSL_DIR/key.pem
    chmod 644 $SSL_DIR/cert.pem
}

# Create environment file
create_env_file() {
    log "Creating environment configuration..."
    
    ENV_FILE="/opt/fire-department/.env"
    
    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    DB_PASSWORD=$(openssl rand -base64 16)
    
    cat > $ENV_FILE << EOF
# Fire Department Management System Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=database
DB_PORT=5432
DB_NAME=fire_department
DB_USER=fire_admin
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=root_$(openssl rand -base64 12)

# Security
JWT_SECRET=$JWT_SECRET

# FirstDue API Configuration (UPDATE THESE!)
FIRSTDUE_EMAIL=your-firstdue-email@example.com
FIRSTDUE_PASSWORD=your-firstdue-password

# Application Settings
DEPARTMENT_NAME=Elk River Fire Department
SYNC_INTERVAL=5

# SSL Configuration
SSL_ENABLED=true
EOF

    chmod 600 $ENV_FILE
    chown $SUDO_USER:$SUDO_USER $ENV_FILE 2>/dev/null || true
    
    log "Environment file created at $ENV_FILE"
    warning "IMPORTANT: Update FirstDue credentials in $ENV_FILE"
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > /opt/fire-department/backup-script.sh << 'EOF'
#!/bin/bash

# Fire Department Database Backup Script
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fire_dept_backup_$DATE.sql"

echo "Starting database backup at $(date)"

# Create backup
pg_dump -h database -U fire_admin -d fire_department > "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_DIR/$BACKUP_FILE"

echo "Backup completed: $BACKUP_FILE.gz"

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup script completed at $(date)"
EOF

    chmod +x /opt/fire-department/backup-script.sh
}

# Create systemd service for automatic startup
create_systemd_service() {
    log "Creating systemd service..."
    
    cat > /etc/systemd/system/fire-department.service << EOF
[Unit]
Description=Fire Department Management System
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/fire-department
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable fire-department.service
}

# Build and deploy React frontend
build_frontend() {
    log "Building React frontend..."
    
    FRONTEND_DIR="/opt/fire-department/frontend"
    
    # Create React app
    cd $FRONTEND_DIR
    npx create-react-app . --template typescript 2>/dev/null || log "React app directory already exists"
    
    # Install dependencies
    npm install lucide-react axios
    
    # Copy the React component code here
    # (In production, you would copy your actual React code)
    
    # Build for production
    npm run build
    
    # Copy build files to backend public directory
    mkdir -p /opt/fire-department/public
    cp -r build/* /opt/fire-department/public/
}

# Create Docker Compose override for production
create_docker_override() {
    log "Creating Docker Compose override..."
    
    cat > /opt/fire-department/docker-compose.override.yml << 'EOF'
# Production overrides for Docker Compose
version: '3.8'

services:
  nginx:
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./logs/nginx:/var/log/nginx
    restart: unless-stopped

  backend:
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      - ./logs:/app/logs:rw
      - ./uploads:/app/uploads:rw

  database:
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups:rw
EOF
}

# Setup logrotate
setup_logrotate() {
    log "Setting up log rotation..."
    
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
}

# Setup firewall
setup_firewall() {
    log "Configuring firewall..."
    
    # Install UFW if not installed
    apt-get install -y ufw
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow database access from localhost only
    ufw allow from 127.0.0.1 to any port 5432
    
    # Enable firewall
    ufw --force enable
    
    log "Firewall configured successfully"
}

# Create monitoring script
create_monitoring_script() {
    log "Creating monitoring script..."
    
    cat > /opt/fire-department/monitor.sh << 'EOF'
#!/bin/bash

# Fire Department System Monitor
LOGFILE="/opt/fire-department/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting system check" >> $LOGFILE

# Check if containers are running
if docker compose ps | grep -q "Up"; then
    echo "[$DATE] Docker containers are running" >> $LOGFILE
else
    echo "[$DATE] ERROR: Some Docker containers are not running" >> $LOGFILE
    docker compose up -d >> $LOGFILE 2>&1
fi

# Check disk space
DISK_USAGE=$(df /opt/fire-department | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOGFILE
fi

# Check database connectivity
if docker exec fire-department-database-1 pg_isready -U fire_admin -d fire_department > /dev/null 2>&1; then
    echo "[$DATE] Database is accessible" >> $LOGFILE
else
    echo "[$DATE] ERROR: Database is not accessible" >> $LOGFILE
fi

echo "[$DATE] System check completed" >> $LOGFILE
EOF

    chmod +x /opt/fire-department/monitor.sh
    
    # Add to crontab for root
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/fire-department/monitor.sh") | crontab -
}

# Main deployment function
deploy() {
    log "Starting Fire Department Management System deployment..."
    
    check_root
    update_system
    install_docker
    install_nodejs
    
    APP_DIR=$(create_directories)
    cd $APP_DIR
    
    # Copy application files (in production, these would be provided)
    log "Please ensure all application files are in $APP_DIR"
    
    generate_ssl
    create_env_file
    create_backup_script
    create_systemd_service
    create_docker_override
    setup_logrotate
    setup_firewall
    create_monitoring_script
    
    log "Deployment preparation completed!"
    log "Next steps:"
    echo "1. Copy all application files to $APP_DIR"
    echo "2. Update FirstDue credentials in $APP_DIR/.env"
    echo "3. Run: cd $APP_DIR && docker compose up -d"
    echo "4. Access the application at https://your-server-ip"
    echo ""
    echo "Default admin login:"
    echo "  Badge: CHIEF001"
    echo "  PIN: admin123"
    echo ""
    warning "IMPORTANT: Change default passwords immediately!"
}

# Run deployment
deploy

log "Fire Department Management System deployment script completed!"
log "Check $APP_DIR for all configuration files"

# Display final status
echo ""
echo "=================================="
echo "DEPLOYMENT SUMMARY"
echo "=================================="
echo "Application Directory: /opt/fire-department"
echo "Configuration File: /opt/fire-department/.env"
echo "SSL Certificates: /opt/fire-department/ssl/"
echo "Logs Directory: /opt/fire-department/logs/"
echo "Backups Directory: /opt/fire-department/backups/"
echo ""
echo "Services:"
echo "  - Docker: $(systemctl is-active docker)"
echo "  - Fire Department: $(systemctl is-enabled fire-department.service)"
echo ""
echo "Firewall Status: $(ufw status | head -1)"
echo "=================================="

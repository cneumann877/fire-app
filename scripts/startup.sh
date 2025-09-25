#!/bin/bash

# Fire Department Management System - Quick Start Script
# This script helps you get the system running quickly

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
APP_DIR="/opt/fire-department"
ENV_FILE="$APP_DIR/.env"

# Check if running from the right directory
check_directory() {
    if [[ ! -f "docker-compose.yml" ]]; then
        error "docker-compose.yml not found. Please run this script from the application directory."
        error "Expected location: $APP_DIR"
        exit 1
    fi
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker first:"
        echo "  sudo systemctl start docker"
        exit 1
    fi
    log "Docker is running"
}

# Check environment file
check_environment() {
    if [[ ! -f "$ENV_FILE" ]]; then
        warn "Environment file not found. Creating default..."
        create_default_env
    fi
    
    # Check for default values that need to be changed
    if grep -q "your-firstdue-email@example.com" "$ENV_FILE"; then
        warn "FirstDue credentials not configured!"
        warn "Please edit $ENV_FILE and update FIRSTDUE_EMAIL and FIRSTDUE_PASSWORD"
    fi
    
    if grep -q "your-super-secret-jwt-key-change-this" "$ENV_FILE"; then
        warn "Default JWT secret detected. Consider changing it for security."
    fi
}

# Create default environment file
create_default_env() {
    cat > "$ENV_FILE" << 'EOF'
NODE_ENV=production
PORT=5000

# Database Configuration
DB_HOST=database
DB_PORT=5432
DB_NAME=fire_department
DB_USER=fire_admin
DB_PASSWORD=secure_password_change_this

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this

# FirstDue API Configuration (UPDATE THESE!)
FIRSTDUE_EMAIL=your-firstdue-email@example.com
FIRSTDUE_PASSWORD=your-firstdue-password

# Application Settings
DEPARTMENT_NAME=Elk River Fire Department
SYNC_INTERVAL=5
EOF
    
    log "Default environment file created at $ENV_FILE"
}

# Build the React frontend
build_frontend() {
    if [[ -d "frontend" && -f "frontend/package.json" ]]; then
        log "Building React frontend..."
        cd frontend
        
        if [[ ! -d "node_modules" ]]; then
            log "Installing frontend dependencies..."
            npm install
        fi
        
        npm run build
        
        # Copy build files to public directory
        mkdir -p ../public
        cp -r build/* ../public/
        
        cd ..
        log "Frontend built successfully"
    else
        warn "Frontend directory not found. Skipping frontend build."
        warn "The application will serve a basic static page."
    fi
}

# Start the application
start_application() {
    log "Starting Fire Department Management System..."
    
    # Pull latest images if needed
    docker compose pull
    
    # Start services
    docker compose up -d
    
    log "Services started. Checking status..."
    sleep 5
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        log "✅ Application started successfully!"
        echo ""
        echo "Access your Fire Department Management System at:"
        echo "  🌐 https://localhost (or your server IP)"
        echo "  📊 Health check: https://localhost/api/health"
        echo ""
        echo "Default login credentials:"
        echo "  👤 Badge: CHIEF001"
        echo "  🔑 PIN: admin123"
        echo ""
        warn "⚠️  IMPORTANT: Change default passwords after first login!"
        echo ""
        
        # Show running containers
        echo "Running services:"
        docker compose ps
        
    else
        error "❌ Some services failed to start. Check logs:"
        docker compose logs
        exit 1
    fi
}

# Stop the application
stop_application() {
    log "Stopping Fire Department Management System..."
    docker compose down
    log "✅ Application stopped"
}

# Show application status
show_status() {
    echo "Fire Department Management System Status:"
    echo "========================================"
    
    if docker compose ps | grep -q "Up"; then
        echo "🟢 Status: RUNNING"
        docker compose ps
        echo ""
        
        # Check health endpoint
        if curl -k -s https://localhost/api/health >/dev/null 2>&1; then
            echo "🟢 API: Healthy"
        else
            echo "🟡 API: Starting or unreachable"
        fi
        
        # Check database
        if docker exec fire-department-database-1 pg_isready -U fire_admin -d fire_department >/dev/null 2>&1; then
            echo "🟢 Database: Connected"
        else
            echo "🔴 Database: Connection failed"
        fi
        
    else
        echo "🔴 Status: STOPPED"
    fi
}

# Show logs
show_logs() {
    if [[ -z "$1" ]]; then
        echo "Available services: backend, database, nginx, redis"
        echo "Usage: $0 logs [service_name]"
        echo "       $0 logs          (show all logs)"
        return
    fi
    
    if [[ "$1" == "all" ]] || [[ -z "$1" ]]; then
        docker compose logs -f
    else
        docker compose logs -f "$1"
    fi
}

# Backup database
backup_database() {
    BACKUP_DIR="./backups"
    BACKUP_FILE="fire_dept_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$BACKUP_DIR"
    
    log "Creating database backup..."
    docker exec fire-department-database-1 pg_dump -U fire_admin fire_department > "$BACKUP_DIR/$BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    log "✅ Backup created: $BACKUP_DIR/$BACKUP_FILE.gz"
}

# Update system
update_system() {
    log "Updating Fire Department Management System..."
    
    # Pull latest images
    docker compose pull
    
    # Backup database before update
    backup_database
    
    # Restart services
    docker compose down
    docker compose up -d
    
    log "✅ System updated successfully"
}

# Main menu
show_menu() {
    echo ""
    echo "Fire Department Management System Control Panel"
    echo "=============================================="
    echo "1. start    - Start the application"
    echo "2. stop     - Stop the application"
    echo "3. restart  - Restart the application"
    echo "4. status   - Show system status"
    echo "5. logs     - Show application logs"
    echo "6. backup   - Create database backup"
    echo "7. update   - Update system"
    echo "8. build    - Build frontend"
    echo "9. setup    - Initial setup"
    echo ""
}

# Main script logic
main() {
    case "${1:-menu}" in
        start)
            check_directory
            check_docker
            check_environment
            build_frontend
            start_application
            ;;
        stop)
            check_directory
            stop_application
            ;;
        restart)
            check_directory
            stop_application
            sleep 2
            start_application
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${2:-all}"
            ;;
        backup)
            backup_database
            ;;
        update)
            update_system
            ;;
        build)
            build_frontend
            ;;
        setup)
            check_docker
            create_default_env
            warn "Setup complete! Please:"
            warn "1. Edit $ENV_FILE with your FirstDue credentials"
            warn "2. Run: $0 start"
            ;;
        menu|help|*)
            show_menu
            ;;
    esac
}

# Run main function with all arguments
main "$@"

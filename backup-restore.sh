#!/bin/bash

# Fire Department Management System - Backup and Restore Scripts
# This script provides comprehensive backup and restore functionality

set -e

# Configuration
APP_DIR="/opt/fire-department"
BACKUP_BASE_DIR="/opt/fire-department/backups"
REMOTE_BACKUP_HOST="" # Set this for remote backups
REMOTE_BACKUP_PATH="" # Set this for remote backups
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[BACKUP]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

# Check if running as root or with proper permissions
check_permissions() {
    if [[ $EUID -eq 0 ]] || groups | grep -q docker; then
        return 0
    else
        error "This script requires root privileges or docker group membership"
        error "Run with: sudo $0 or add your user to docker group"
        exit 1
    fi
}

# Create backup directory structure
create_backup_dirs() {
    local backup_date=$1
    local backup_dir="$BACKUP_BASE_DIR/$backup_date"
    
    mkdir -p "$backup_dir"/{database,config,logs,uploads,ssl}
    echo "$backup_dir"
}

# Backup database
backup_database() {
    local backup_dir=$1
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    
    log "Creating database backup..."
    
    if docker ps | grep -q fire-department-database-1; then
        # Full database backup
        docker exec fire-department-database-1 pg_dumpall -U fire_admin > "$backup_dir/database/full_backup_$timestamp.sql"
        
        # Individual database backup
        docker exec fire-department-database-1 pg_dump -U fire_admin -d fire_department > "$backup_dir/database/fire_department_$timestamp.sql"
        
        # Compress backups
        gzip "$backup_dir/database/"*.sql
        
        log "Database backup completed: $(ls -la $backup_dir/database/)"
    else
        warn "Database container not running, skipping database backup"
    fi
}

# Backup configuration files
backup_config() {
    local backup_dir=$1
    
    log "Backing up configuration files..."
    
    # Copy environment file
    if [[ -f "$APP_DIR/.env" ]]; then
        cp "$APP_DIR/.env" "$backup_dir/config/"
    fi
    
    # Copy Docker Compose files
    cp "$APP_DIR/docker-compose.yml" "$backup_dir/config/" 2>/dev/null || true
    cp "$APP_DIR/docker-compose.override.yml" "$backup_dir/config/" 2>/dev/null || true
    
    # Copy nginx configuration
    cp "$APP_DIR/nginx.conf" "$backup_dir/config/" 2>/dev/null || true
    
    # Copy custom scripts
    cp "$APP_DIR"/*.sh "$backup_dir/config/" 2>/dev/null || true
    
    log "Configuration backup completed"
}

# Backup SSL certificates
backup_ssl() {
    local backup_dir=$1
    
    log "Backing up SSL certificates..."
    
    if [[ -d "$APP_DIR/ssl" ]]; then
        cp -r "$APP_DIR/ssl/"* "$backup_dir/ssl/" 2>/dev/null || true
        log "SSL certificates backed up"
    else
        warn "SSL directory not found, skipping SSL backup"
    fi
}

# Backup logs
backup_logs() {
    local backup_dir=$1
    
    log "Backing up recent logs..."
    
    # Copy logs from last 7 days
    find "$APP_DIR/logs" -name "*.log" -mtime -7 -exec cp {} "$backup_dir/logs/" \; 2>/dev/null || true
    
    # Compress log backup
    if [[ -n "$(ls -A $backup_dir/logs/ 2>/dev/null)" ]]; then
        tar -czf "$backup_dir/logs.tar.gz" -C "$backup_dir" logs/
        rm -rf "$backup_dir/logs"
        log "Logs backup completed and compressed"
    else
        warn "No recent logs found to backup"
    fi
}

# Backup uploads/user files
backup_uploads() {
    local backup_dir=$1
    
    log "Backing up uploads..."
    
    if [[ -d "$APP_DIR/uploads" ]] && [[ -n "$(ls -A $APP_DIR/uploads 2>/dev/null)" ]]; then
        cp -r "$APP_DIR/uploads/"* "$backup_dir/uploads/" 2>/dev/null || true
        log "Uploads backup completed"
    else
        warn "No uploads found to backup"
    fi
}

# Create backup manifest
create_manifest() {
    local backup_dir=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$backup_dir/MANIFEST.txt" << EOF
Fire Department Management System Backup
=========================================
Created: $timestamp
Hostname: $(hostname)
System: $(lsb_release -d | cut -f2)
Docker Version: $(docker --version)
Application Version: 1.0.0

Backup Contents:
$(find "$backup_dir" -type f -exec basename {} \; | sort)

Database Status: $(docker exec fire-department-database-1 pg_isready -U fire_admin -d fire_department 2>/dev/null || echo "Not accessible")
Application Status: $(docker ps --format "table {{.Names}}\t{{.Status}}" | grep fire-department || echo "Not running")

Total Backup Size: $(du -sh "$backup_dir" | cut -f1)
EOF

    log "Backup manifest created"
}

# Compress entire backup
compress_backup() {
    local backup_dir=$1
    local backup_date=$(basename "$backup_dir")
    
    log "Compressing backup..."
    
    cd "$BACKUP_BASE_DIR"
    tar -czf "${backup_date}_complete.tar.gz" "$backup_date/"
    
    if [[ -f "${backup_date}_complete.tar.gz" ]]; then
        rm -rf "$backup_date"
        log "Backup compressed: ${backup_date}_complete.tar.gz"
        echo "Compressed backup size: $(du -sh ${backup_date}_complete.tar.gz | cut -f1)"
    fi
}

# Send backup to remote location
remote_backup() {
    local backup_file=$1
    
    if [[ -n "$REMOTE_BACKUP_HOST" ]] && [[ -n "$REMOTE_BACKUP_PATH" ]]; then
        log "Sending backup to remote location..."
        
        scp "$BACKUP_BASE_DIR/$backup_file" "$REMOTE_BACKUP_HOST:$REMOTE_BACKUP_PATH/"
        
        if [[ $? -eq 0 ]]; then
            log "Remote backup completed successfully"
        else
            error "Remote backup failed"
        fi
    else
        info "Remote backup not configured (set REMOTE_BACKUP_HOST and REMOTE_BACKUP_PATH)"
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    find "$BACKUP_BASE_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_BASE_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    log "Old backups cleaned up"
}

# Full backup function
full_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_dir=$(create_backup_dirs "$timestamp")
    
    log "Starting full backup of Fire Department Management System..."
    log "Backup location: $backup_dir"
    
    # Perform all backup operations
    backup_database "$backup_dir"
    backup_config "$backup_dir"
    backup_ssl "$backup_dir"
    backup_logs "$backup_dir"
    backup_uploads "$backup_dir"
    create_manifest "$backup_dir"
    
    # Compress and finalize
    compress_backup "$backup_dir"
    
    local backup_file="${timestamp}_complete.tar.gz"
    
    # Remote backup if configured
    remote_backup "$backup_file"
    
    # Cleanup
    cleanup_old_backups
    
    log "✅ Full backup completed successfully!"
    echo "Backup file: $BACKUP_BASE_DIR/$backup_file"
    echo "Backup size: $(du -sh $BACKUP_BASE_DIR/$backup_file | cut -f1)"
}

# Quick database-only backup
quick_backup() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_BASE_DIR/quick_db_backup_$timestamp.sql"
    
    log "Creating quick database backup..."
    
    if docker ps | grep -q fire-department-database-1; then
        docker exec fire-department-database-1 pg_dump -U fire_admin -d fire_department > "$backup_file"
        gzip "$backup_file"
        
        log "✅ Quick backup completed: ${backup_file}.gz"
        echo "Size: $(du -sh ${backup_file}.gz | cut -f1)"
    else
        error "Database container not running"
        exit 1
    fi
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    echo "Full Backups:"
    ls -la "$BACKUP_BASE_DIR"/*_complete.tar.gz 2>/dev/null | awk '{print $9 "\t" $5 "\t" $6 " " $7 " " $8}' || echo "No full backups found"
    
    echo ""
    echo "Quick Backups:"
    ls -la "$BACKUP_BASE_DIR"/quick_*.sql.gz 2>/dev/null | awk '{print $9 "\t" $5 "\t" $6 " " $7 " " $8}' || echo "No quick backups found"
}

# Restore from backup
restore_backup() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        error "Please specify a backup file to restore"
        echo "Usage: $0 restore <backup_file>"
        echo "Available backups:"
        list_backups
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_BASE_DIR/$backup_file" ]]; then
        error "Backup file not found: $BACKUP_BASE_DIR/$backup_file"
        exit 1
    fi
    
    warn "⚠️  WARNING: This will restore the system from backup and may overwrite current data!"
    read -p "Are you sure you want to continue? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Restore cancelled"
        exit 0
    fi
    
    log "Starting restore from: $backup_file"
    
    # Stop services
    log "Stopping Fire Department services..."
    cd "$APP_DIR"
    docker compose down || true
    
    # Extract backup
    local temp_dir="/tmp/fire_dept_restore_$$"
    mkdir -p "$temp_dir"
    
    log "Extracting backup..."
    tar -xzf "$BACKUP_BASE_DIR/$backup_file" -C "$temp_dir"
    
    local restore_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "*_*" | head -1)
    
    if [[ -z "$restore_dir" ]]; then
        error "Invalid backup file format"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Restore configuration
    if [[ -d "$restore_dir/config" ]]; then
        log "Restoring configuration..."
        cp "$restore_dir/config/"* "$APP_DIR/" 2>/dev/null || true
    fi
    
    # Restore SSL certificates
    if [[ -d "$restore_dir/ssl" ]] && [[ -n "$(ls -A $restore_dir/ssl/ 2>/dev/null)" ]]; then
        log "Restoring SSL certificates..."
        mkdir -p "$APP_DIR/ssl"
        cp "$restore_dir/ssl/"* "$APP_DIR/ssl/" 2>/dev/null || true
    fi
    
    # Restore uploads
    if [[ -d "$restore_dir/uploads" ]] && [[ -n "$(ls -A $restore_dir/uploads/ 2>/dev/null)" ]]; then
        log "Restoring uploads..."
        mkdir -p "$APP_DIR/uploads"
        cp -r "$restore_dir/uploads/"* "$APP_DIR/uploads/" 2>/dev/null || true
    fi
    
    # Start services
    log "Starting services..."
    docker compose up -d
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Restore database
    if [[ -d "$restore_dir/database" ]]; then
        log "Restoring database..."
        
        local db_backup=$(find "$restore_dir/database" -name "fire_department_*.sql.gz" | head -1)
        if [[ -n "$db_backup" ]]; then
            gunzip -c "$db_backup" | docker exec -i fire-department-database-1 psql -U fire_admin -d fire_department
            log "Database restored successfully"
        else
            warn "No database backup found in restore archive"
        fi
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log "✅ Restore completed successfully!"
    log "Please verify the system is working correctly"
}

# Automated backup for cron
automated_backup() {
    # Create timestamped log
    local log_file="$APP_DIR/logs/backup-$(date +%Y%m%d).log"
    
    {
        echo "=== Automated Backup Started at $(date) ==="
        full_backup
        echo "=== Automated Backup Completed at $(date) ==="
        echo ""
    } >> "$log_file" 2>&1
}

# Test backup integrity
test_backup() {
    local backup_file=$1
    
    if [[ -z "$backup_file" ]]; then
        error "Please specify a backup file to test"
        exit 1
    fi
    
    if [[ ! -f "$BACKUP_BASE_DIR/$backup_file" ]]; then
        error "Backup file not found: $BACKUP_BASE_DIR/$backup_file"
        exit 1
    fi
    
    log "Testing backup integrity: $backup_file"
    
    # Test archive integrity
    if tar -tzf "$BACKUP_BASE_DIR/$backup_file" >/dev/null 2>&1; then
        log "✅ Archive integrity: GOOD"
    else
        error "❌ Archive integrity: FAILED"
        exit 1
    fi
    
    # Test backup contents
    local temp_dir="/tmp/fire_dept_test_$$"
    mkdir -p "$temp_dir"
    
    tar -xzf "$BACKUP_BASE_DIR/$backup_file" -C "$temp_dir"
    local test_dir=$(find "$temp_dir" -maxdepth 1 -type d -name "*_*" | head -1)
    
    if [[ -f "$test_dir/MANIFEST.txt" ]]; then
        log "✅ Manifest found"
        echo "Backup contents:"
        cat "$test_dir/MANIFEST.txt"
    else
        warn "⚠️  No manifest found"
    fi
    
    # Test database backup if present
    if [[ -d "$test_dir/database" ]]; then
        local db_files=$(find "$test_dir/database" -name "*.sql.gz" | wc -l)
        log "✅ Database backups found: $db_files files"
    else
        warn "⚠️  No database backup found"
    fi
    
    rm -rf "$temp_dir"
    log "✅ Backup test completed"
}

# Show usage information
show_usage() {
    echo "Fire Department Management System - Backup & Restore Tool"
    echo "Usage: $0 {command} [options]"
    echo ""
    echo "Commands:"
    echo "  backup, full       - Create full system backup"
    echo "  quick              - Create quick database backup"
    echo "  restore <file>     - Restore from backup file"
    echo "  list               - List available backups"
    echo "  test <file>        - Test backup file integrity"
    echo "  automated          - Run automated backup (for cron)"
    echo "  clean              - Clean old backups"
    echo ""
    echo "Examples:"
    echo "  $0 backup                    # Full backup"
    echo "  $0 quick                     # Quick database backup"
    echo "  $0 restore 20231201_143022_complete.tar.gz"
    echo "  $0 test 20231201_143022_complete.tar.gz"
    echo ""
    echo "Configuration:"
    echo "  RETENTION_DAYS=$RETENTION_DAYS (modify at top of script)"
    echo "  REMOTE_BACKUP_HOST=$REMOTE_BACKUP_HOST"
    echo "  REMOTE_BACKUP_PATH=$REMOTE_BACKUP_PATH"
}

# Main script logic
main() {
    check_permissions
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_BASE_DIR"
    
    case "${1:-help}" in
        backup|full)
            full_backup
            ;;
        quick)
            quick_backup
            ;;
        restore)
            restore_backup "$2"
            ;;
        list)
            list_backups
            ;;
        test)
            test_backup "$2"
            ;;
        automated)
            automated_backup
            ;;
        clean)
            cleanup_old_backups
            ;;
        help|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"

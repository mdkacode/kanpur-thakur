#!/bin/bash

# SheetBC PM2 Manager Script
# This script manages both backend and frontend services with PM2

set -e

echo "🚀 SheetBC PM2 Manager"
echo "======================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/root/kanpur-thakur"
ECOSYSTEM_FILE="ecosystem.config.js"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Function to check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
    fi
}

# Function to check if we're in the correct directory
check_directory() {
    if [ ! -f "$ECOSYSTEM_FILE" ]; then
        error "ecosystem.config.js not found. Please run this script from the application root directory."
    fi
}

# Function to show menu
show_menu() {
    echo ""
    echo "📋 PM2 Management Options:"
    echo "=========================="
    echo "1.  Start all services (production)"
    echo "2.  Start backend only (production)"
    echo "3.  Start frontend development server"
    echo "4.  Stop all services"
    echo "5.  Restart all services"
    echo "6.  Restart backend only"
    echo "7.  Restart frontend only"
    echo "8.  Show service status"
    echo "9.  Show service logs"
    echo "10. Monitor services (real-time)"
    echo "11. Save PM2 configuration"
    echo "12. Setup PM2 startup script"
    echo "13. Delete all services"
    echo "14. Build frontend for production"
    echo "15. Health check"
    echo "0.  Exit"
    echo ""
}

# Function to start all services (production)
start_all_production() {
    log "Starting all services in production mode..."
    
    # Build frontend first
    log "Building frontend for production..."
    cd frontend
    npm run build
    cd ..
    
    # Start backend only (frontend served by Nginx in production)
    pm2 start ecosystem.config.js --env production --only sheetbc-api
    
    log "✅ All services started in production mode!"
    log "Backend API running on port 3000"
    log "Frontend served by Nginx"
}

# Function to start backend only
start_backend() {
    log "Starting backend service..."
    pm2 start ecosystem.config.js --env production --only sheetbc-api
    log "✅ Backend service started!"
}

# Function to start frontend development server
start_frontend_dev() {
    log "Starting frontend development server..."
    pm2 start ecosystem.config.js --env development --only sheetbc-frontend-dev
    log "✅ Frontend development server started on port 3001!"
}

# Function to stop all services
stop_all() {
    log "Stopping all services..."
    pm2 stop all
    log "✅ All services stopped!"
}

# Function to restart all services
restart_all() {
    log "Restarting all services..."
    pm2 restart all
    log "✅ All services restarted!"
}

# Function to restart backend only
restart_backend() {
    log "Restarting backend service..."
    pm2 restart sheetbc-api
    log "✅ Backend service restarted!"
}

# Function to restart frontend only
restart_frontend() {
    log "Restarting frontend service..."
    pm2 restart sheetbc-frontend-dev
    log "✅ Frontend service restarted!"
}

# Function to show service status
show_status() {
    log "Service Status:"
    echo "==============="
    pm2 status
    echo ""
    
    # Show memory usage
    log "Memory Usage:"
    echo "============="
    pm2 monit --no-daemon &
    sleep 3
    pkill -f "pm2 monit"
}

# Function to show service logs
show_logs() {
    echo ""
    echo "📋 Log Options:"
    echo "==============="
    echo "1. Show all logs"
    echo "2. Show backend logs"
    echo "3. Show frontend logs"
    echo "4. Show error logs only"
    echo "5. Follow logs (real-time)"
    echo "0. Back to main menu"
    echo ""
    
    read -p "Enter your choice: " log_choice
    
    case $log_choice in
        1)
            log "Showing all logs..."
            pm2 logs --lines 50
            ;;
        2)
            log "Showing backend logs..."
            pm2 logs sheetbc-api --lines 50
            ;;
        3)
            log "Showing frontend logs..."
            pm2 logs sheetbc-frontend-dev --lines 50
            ;;
        4)
            log "Showing error logs..."
            pm2 logs --err --lines 50
            ;;
        5)
            log "Following logs in real-time..."
            pm2 logs
            ;;
        0)
            return
            ;;
        *)
            warn "Invalid choice"
            ;;
    esac
}

# Function to monitor services
monitor_services() {
    log "Starting real-time monitoring..."
    log "Press Ctrl+C to exit monitoring"
    pm2 monit
}

# Function to save PM2 configuration
save_config() {
    log "Saving PM2 configuration..."
    pm2 save
    log "✅ PM2 configuration saved!"
}

# Function to setup PM2 startup script
setup_startup() {
    log "Setting up PM2 startup script..."
    pm2 startup
    log "✅ PM2 startup script configured!"
    log "Please run the command shown above as root if needed."
}

# Function to delete all services
delete_all() {
    warn "This will delete all PM2 services. Are you sure? (y/N)"
    read -p "Enter your choice: " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        log "Deleting all services..."
        pm2 delete all
        log "✅ All services deleted!"
    else
        log "Operation cancelled."
    fi
}

# Function to build frontend
build_frontend() {
    log "Building frontend for production..."
    cd frontend
    npm run build
    cd ..
    log "✅ Frontend built successfully!"
}

# Function to health check
health_check() {
    log "Performing health check..."
    
    # Check backend health
    if curl -f -s http://localhost:3000/api/health >/dev/null; then
        log "✅ Backend health check passed"
    else
        warn "❌ Backend health check failed"
    fi
    
    # Check frontend health (if running)
    if curl -f -s http://localhost:3001 >/dev/null; then
        log "✅ Frontend health check passed"
    else
        warn "❌ Frontend health check failed (may not be running)"
    fi
    
    # Show PM2 status
    echo ""
    log "PM2 Status:"
    pm2 status
}

# Main script
main() {
    # Check prerequisites
    check_pm2
    check_directory
    
    # Ensure we're in the correct directory
    cd "$APP_DIR"
    
    while true; do
        show_menu
        read -p "Enter your choice: " choice
        
        case $choice in
            1)
                start_all_production
                ;;
            2)
                start_backend
                ;;
            3)
                start_frontend_dev
                ;;
            4)
                stop_all
                ;;
            5)
                restart_all
                ;;
            6)
                restart_backend
                ;;
            7)
                restart_frontend
                ;;
            8)
                show_status
                ;;
            9)
                show_logs
                ;;
            10)
                monitor_services
                ;;
            11)
                save_config
                ;;
            12)
                setup_startup
                ;;
            13)
                delete_all
                ;;
            14)
                build_frontend
                ;;
            15)
                health_check
                ;;
            0)
                log "Exiting PM2 Manager..."
                exit 0
                ;;
            *)
                warn "Invalid choice. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Handle command line arguments
if [ $# -eq 0 ]; then
    main
else
    case $1 in
        start)
            check_pm2
            check_directory
            cd "$APP_DIR"
            start_all_production
            ;;
        start-backend)
            check_pm2
            check_directory
            cd "$APP_DIR"
            start_backend
            ;;
        start-frontend)
            check_pm2
            check_directory
            cd "$APP_DIR"
            start_frontend_dev
            ;;
        stop)
            check_pm2
            stop_all
            ;;
        restart)
            check_pm2
            restart_all
            ;;
        status)
            check_pm2
            show_status
            ;;
        logs)
            check_pm2
            show_logs
            ;;
        health)
            check_pm2
            health_check
            ;;
        build)
            check_directory
            cd "$APP_DIR"
            build_frontend
            ;;
        *)
            echo "Usage: $0 [start|start-backend|start-frontend|stop|restart|status|logs|health|build]"
            echo "Or run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi

#!/bin/bash

# SheetBC PM2 Quick Start Script
# Simple script for quick PM2 operations

set -e

# Configuration
APP_DIR="/root/kanpur-thakur"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
    exit 1
}

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    error "PM2 is not installed. Please install PM2 first: npm install -g pm2"
fi

# Navigate to app directory
cd "$APP_DIR"

# Check if ecosystem file exists
if [ ! -f "ecosystem.config.js" ]; then
    error "ecosystem.config.js not found in $APP_DIR"
fi

case "${1:-start}" in
    start)
        log "Starting SheetBC services..."
        
        # Build frontend for production
        log "Building frontend..."
        cd frontend
        npm run build
        cd ..
        
        # Start backend service
        pm2 start ecosystem.config.js --env production --only sheetbc-api
        
        log "✅ Services started successfully!"
        log "Backend API: http://localhost:3000"
        log "Frontend: Served by Nginx"
        ;;
        
    start-dev)
        log "Starting SheetBC services in development mode..."
        
        # Start backend
        pm2 start ecosystem.config.js --env production --only sheetbc-api
        
        # Start frontend development server
        pm2 start ecosystem.config.js --env development --only sheetbc-frontend-dev
        
        log "✅ Development services started!"
        log "Backend API: http://localhost:3000"
        log "Frontend Dev: http://localhost:3001"
        ;;
        
    stop)
        log "Stopping all services..."
        pm2 stop all
        log "✅ All services stopped!"
        ;;
        
    restart)
        log "Restarting all services..."
        pm2 restart all
        log "✅ All services restarted!"
        ;;
        
    restart-backend)
        log "Restarting backend service..."
        pm2 restart sheetbc-api
        log "✅ Backend service restarted!"
        ;;
        
    restart-frontend)
        log "Restarting frontend service..."
        pm2 restart sheetbc-frontend-dev
        log "✅ Frontend service restarted!"
        ;;
        
    status)
        log "Service Status:"
        pm2 status
        ;;
        
    logs)
        log "Showing logs (last 50 lines):"
        pm2 logs --lines 50
        ;;
        
    logs-backend)
        log "Showing backend logs:"
        pm2 logs sheetbc-api --lines 50
        ;;
        
    logs-frontend)
        log "Showing frontend logs:"
        pm2 logs sheetbc-frontend-dev --lines 50
        ;;
        
    monitor)
        log "Starting PM2 monitor..."
        pm2 monit
        ;;
        
    save)
        log "Saving PM2 configuration..."
        pm2 save
        log "✅ Configuration saved!"
        ;;
        
    delete)
        warn "This will delete all PM2 services. Are you sure? (y/N)"
        read -p "Enter your choice: " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            log "Deleting all services..."
            pm2 delete all
            log "✅ All services deleted!"
        else
            log "Operation cancelled."
        fi
        ;;
        
    build)
        log "Building frontend for production..."
        cd frontend
        npm run build
        cd ..
        log "✅ Frontend built successfully!"
        ;;
        
    health)
        log "Performing health check..."
        
        # Check backend
        if curl -f -s http://localhost:3000/api/health >/dev/null; then
            log "✅ Backend: OK"
        else
            warn "❌ Backend: Failed"
        fi
        
        # Check frontend (if running)
        if curl -f -s http://localhost:3001 >/dev/null; then
            log "✅ Frontend Dev: OK"
        else
            warn "❌ Frontend Dev: Not running (normal in production)"
        fi
        
        echo ""
        pm2 status
        ;;
        
    *)
        echo "SheetBC PM2 Quick Start Script"
        echo "=============================="
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start          - Start production services (backend only)"
        echo "  start-dev      - Start development services (backend + frontend dev)"
        echo "  stop           - Stop all services"
        echo "  restart        - Restart all services"
        echo "  restart-backend - Restart backend only"
        echo "  restart-frontend - Restart frontend only"
        echo "  status         - Show service status"
        echo "  logs           - Show all logs"
        echo "  logs-backend   - Show backend logs"
        echo "  logs-frontend  - Show frontend logs"
        echo "  monitor        - Start PM2 monitor"
        echo "  save           - Save PM2 configuration"
        echo "  delete         - Delete all services"
        echo "  build          - Build frontend for production"
        echo "  health         - Perform health check"
        echo ""
        echo "Examples:"
        echo "  $0 start       - Start production services"
        echo "  $0 status      - Check service status"
        echo "  $0 logs        - View logs"
        echo "  $0 health      - Health check"
        ;;
esac

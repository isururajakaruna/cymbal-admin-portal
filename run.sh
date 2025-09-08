#!/bin/bash

# Cymbal Admin Portal - Production Run Script
# Version: 1.0.0
# Description: Starts the admin portal server with auto-restart capabilities

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="cymbal-admin"
SERVER_FILE="server.js"
PID_FILE=".server.pid"
LOG_FILE="server.log"
RESTART_DELAY=2

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Function to check if server is running
is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the server
start_server() {
    print_status "Starting $APP_NAME server..."
    
    # Check if already running
    if is_running; then
        print_warning "Server is already running (PID: $(cat $PID_FILE))"
        return 1
    fi
    
    # Check if server.js exists
    if [ ! -f "$SERVER_FILE" ]; then
        print_error "Server file '$SERVER_FILE' not found!"
        exit 1
    fi
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies!"
            exit 1
        fi
    fi
    
    # Start server in background
    nohup node "$SERVER_FILE" > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 2
    if is_running; then
        print_success "Server started successfully (PID: $pid)"
        print_status "Logs: tail -f $LOG_FILE"
        print_status "Stop: ./stop.sh"
        return 0
    else
        print_error "Failed to start server!"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to stop the server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            print_status "Stopping server (PID: $pid)..."
            kill "$pid"
            sleep 2
            
            # Force kill if still running
            if ps -p "$pid" > /dev/null 2>&1; then
                print_warning "Force killing server..."
                kill -9 "$pid"
            fi
            
            print_success "Server stopped"
        else
            print_warning "Server was not running"
        fi
        rm -f "$PID_FILE"
    else
        print_warning "No PID file found - server may not be running"
    fi
}

# Function to restart the server
restart_server() {
    print_status "Restarting server..."
    stop_server
    sleep 1
    start_server
}

# Function to monitor and restart server
monitor_server() {
    print_status "Starting monitor mode - server will auto-restart if killed"
    print_status "Press Ctrl+C to stop monitoring"
    
    while true; do
        if ! is_running; then
            print_warning "Server is not running, starting..."
            start_server
        fi
        
        # Check every 5 seconds
        sleep 5
    done
}

# Main script logic
case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    monitor)
        monitor_server
        ;;
    status)
        if is_running; then
            print_success "Server is running (PID: $(cat $PID_FILE))"
        else
            print_warning "Server is not running"
        fi
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            print_error "Log file not found: $LOG_FILE"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|monitor|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server once"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  monitor - Start server with auto-restart monitoring"
        echo "  status  - Check if server is running"
        echo "  logs    - Show live server logs"
        exit 1
        ;;
esac

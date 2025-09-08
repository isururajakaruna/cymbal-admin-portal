#!/bin/bash

# Cymbal Admin Portal - Stop Script
# Version: 1.0.0
# Description: Stops the server that was started by run.sh

# Colors for output
RED="[0;31m"
GREEN="[0;32m"
YELLOW="[1;33m"
BLUE="[0;34m"
NC="[0m" # No Color

# Configuration
PID_FILE=".server.pid"
LOG_FILE="server.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[$(date "+%Y-%m-%d %H:%M:%S")]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[$(date "+%Y-%m-%d %H:%M:%S")]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date "+%Y-%m-%d %H:%M:%S")]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date "+%Y-%m-%d %H:%M:%S")]${NC} $1"
}

# Main stop logic
print_status "Stopping Cymbal Admin Portal server..."

if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if ps -p "$pid" > /dev/null 2>&1; then
        print_status "Found server process (PID: $pid), stopping..."
        
        # Try graceful shutdown first
        kill "$pid"
        
        # Wait for graceful shutdown
        count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Server did not stop gracefully, force killing..."
            kill -9 "$pid"
            sleep 1
        fi
        
        # Verify it is stopped
        if ps -p "$pid" > /dev/null 2>&1; then
            print_error "Failed to stop server (PID: $pid)"
            exit 1
        else
            print_success "Server stopped successfully"
        fi
    else
        print_warning "PID file exists but process is not running"
    fi
    
    # Clean up PID file
    rm -f "$PID_FILE"
    print_status "Cleaned up PID file"
else
    print_warning "No PID file found - server may not be running"
    
    # Try to find and kill any node server.js processes
    pids=$(pgrep -f "node.*server.js")
    if [ -n "$pids" ]; then
        print_status "Found node server.js processes: $pids"
        echo "$pids" | xargs kill
        sleep 2
        
        # Force kill if still running
        remaining=$(pgrep -f "node.*server.js")
        if [ -n "$remaining" ]; then
            print_warning "Force killing remaining processes: $remaining"
            echo "$remaining" | xargs kill -9
        fi
        
        print_success "Killed all node server.js processes"
    else
        print_warning "No node server.js processes found"
    fi
fi

print_success "Stop operation completed"

#!/bin/bash
# Start Tri on Linux
cd "$(dirname "$0")/../tri"
export PATH=$PATH:/usr/local/bin

echo "Starting Tri..."
echo ""

# Check for node
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check for cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared not found. Please install it from:"
    echo "https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Install deps if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --no-audit --no-fund
fi

# Setup if needed or if placeholder owner number is detected
NEEDS_SETUP=0
if [ ! -f ".env" ] || [ "$1" = "--setup" ] || [ "$1" = "--reset" ]; then
    NEEDS_SETUP=1
elif grep -q "919999999999" .env 2>/dev/null; then
    NEEDS_SETUP=1
fi

if [ $NEEDS_SETUP -eq 1 ]; then
    echo ""
    echo "One question to link your phone number to Tri:"
    node setup.js "$@"
    echo ""
fi

node start.js

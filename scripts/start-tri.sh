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

# Setup if needed
if [ ! -f ".env" ]; then
    echo ""
    echo "One question, then Tri is ready."
    node setup.js
    echo ""
fi

node start.js

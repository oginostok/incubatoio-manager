#!/bin/bash
# Incubatoio Manager - Deploy Script
# Usage: ssh root@162.55.184.122 "bash /opt/incubatoio-manager/deploy.sh"

set -e  # Exit on error

# Ensure PATH includes common binary locations (needed when run from systemd)
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "🚀 Starting deployment..."

cd /opt/incubatoio-manager

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Build frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
cd ..

# Restart backend service
echo "🔄 Restarting backend service..."
systemctl restart incubatoio

# Verify service is running
sleep 2
if systemctl is-active --quiet incubatoio; then
    echo "✅ Deploy completed successfully!"
    echo "   Backend service is running."
else
    echo "❌ Warning: Backend service may not be running correctly."
    echo "   Check with: journalctl -u incubatoio -n 20"
    exit 1
fi

#!/bin/bash
set -e

echo "============================================================"
echo "  Purple AQI Forecast — Automated AWS EC2 Setup Script"
echo "============================================================"

# Ensure running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo "[Error] Please run this script with sudo or as root: sudo bash setup_ec2.sh"
  exit 1
fi

APP_DIR="/var/www/purple-aqi"

echo "[1/7] Configuring 4GB Swap Space for Free Tier memory safety..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "Swap space created successfully."
else
    echo "Swap file already exists."
fi

echo "[2/7] Updating system packages and installing dependencies..."
apt-get update -y
apt-get install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx curl

# Install Node.js (v20 LTS)
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "[3/7] Setting up application directory..."
mkdir -p "$APP_DIR"

# Copy files if running from within cloned repo
CURRENT_DIR=$(pwd)
if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
    echo "Copying project files to $APP_DIR..."
    cp -r . "$APP_DIR"
fi

chown -R ubuntu:www-data "$APP_DIR"

echo "[4/7] Setting up Python Virtual Environment and PyTorch..."
cd "$APP_DIR/backend"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Install CPU PyTorch (lightweight wheel to prevent OOM)
"$APP_DIR/backend/venv/bin/pip" install --upgrade pip
"$APP_DIR/backend/venv/bin/pip" install torch --index-url https://download.pytorch.org/whl/cpu
if [ -f requirements.txt ]; then
    "$APP_DIR/backend/venv/bin/pip" install -r requirements.txt
fi

echo "[5/7] Building React Frontend for Production..."
cd "$APP_DIR/frontend"
npm install
npm run build

echo "[6/7] Configuring Systemd Service for Backend..."
cp "$APP_DIR/deploy/aqi-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable aqi-backend
systemctl restart aqi-backend

echo "[7/7] Configuring Nginx Reverse Proxy..."
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/purple-aqi
ln -sf /etc/nginx/sites-available/purple-aqi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "============================================================"
echo "  Deployment Complete!"
echo "  - Backend running via systemd (port 8000)"
echo "  - Frontend served via Nginx (port 80)"
echo ""
echo "  Next steps for your custom domain & SSL:"
echo "  1. Point your domain's A record to this EC2 public IP"
echo "  2. Run: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo "============================================================"

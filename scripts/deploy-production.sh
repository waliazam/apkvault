#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/appvault}"
APP_NAME="${APP_NAME:-appvault}"

cd "$APP_DIR"

echo "Installing dependencies..."
npm ci

echo "Running database migrations..."
npm run db:migrate

echo "Building frontend..."
npm run build

echo "Ensuring upload directory exists..."
mkdir -p uploads

echo "Restarting PM2 app..."
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --env production
fi

pm2 save
pm2 status "$APP_NAME"

echo "Deployment complete."

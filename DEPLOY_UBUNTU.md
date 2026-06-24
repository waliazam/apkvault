# AppVault Ubuntu VM Deployment Guide

This guide deploys AppVault on a live Ubuntu VM with PostgreSQL, Node.js, PM2, Nginx, and Let's Encrypt SSL.

The app runs as:

- Public website: `https://yourdomain.com`
- Admin panel: `https://yourdomain.com/admin`
- API health check: `https://yourdomain.com/api/health`
- Node app internally: `127.0.0.1:4000`

## 1. Server Requirements

Use Ubuntu 22.04 or 24.04.

Recommended minimum VM:

- 1 CPU
- 1-2 GB RAM
- 20 GB disk
- Root or sudo access

## 2. Point Domain DNS

Create DNS records before SSL:

```text
A     yourdomain.com       YOUR_SERVER_IP
A     www.yourdomain.com   YOUR_SERVER_IP
```

Wait until DNS resolves:

```bash
ping yourdomain.com
```

## 3. Initial Server Setup

SSH into the VM:

```bash
ssh root@YOUR_SERVER_IP
```

Update packages:

```bash
apt update && apt upgrade -y
apt install -y git curl nginx postgresql postgresql-contrib ufw
```

Enable firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## 4. Install Node.js

Install Node.js 24:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v
npm -v
```

Install PM2:

```bash
npm install -g pm2
```

## 5. Create PostgreSQL Database

Open PostgreSQL:

```bash
sudo -u postgres psql
```

Create DB and user:

```sql
CREATE DATABASE appvault;
CREATE USER waliazam WITH PASSWORD 'wali123!';
GRANT ALL PRIVILEGES ON DATABASE appvault TO waliazam;
\q
```

Grant schema access:

```bash
sudo -u postgres psql -d appvault
```

```sql
GRANT ALL ON SCHEMA public TO waliazam;
ALTER SCHEMA public OWNER TO waliazam;
\q
```

## 6. Upload Or Clone Project

Create app folder:

```bash
mkdir -p /var/www/appvault
cd /var/www/appvault
```

Clone from Git:

```bash
git clone YOUR_REPO_URL .
```

Or upload the project files into `/var/www/appvault` using SFTP/WinSCP.

## 7. Create Production Environment File

Copy the template:

```bash
cp .env.production.example .env
nano .env
```

Use your real values:

```env
DATABASE_URL=postgres://appvault_user:CHANGE_STRONG_DATABASE_PASSWORD@127.0.0.1:5432/apkmiror
PORT=4000
JWT_SECRET=CHANGE_TO_A_LONG_RANDOM_SECRET_AT_LEAST_32_CHARS
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=CHANGE_THIS_ADMIN_PASSWORD_BEFORE_SEED
```

Important:

- `JWT_SECRET` must be long and random.
- `ADMIN_PASSWORD` is only used by `npm run db:seed`.
- Change the admin password before first seed on production.

Generate a secret:

```bash
openssl rand -hex 32
```

## 8. Install, Migrate, Seed, Build

Install dependencies:

```bash
npm ci
```

Run migrations:

```bash
npm run db:migrate
```

Seed only the first time:

```bash
npm run db:seed
```

Build the public frontend:

```bash
npm run build
```

Check audit/build:

```bash
npm run prod:check
```

## 9. Prepare Upload Folder

```bash
mkdir -p uploads
chown -R $USER:www-data uploads
chmod -R 775 uploads
```

Uploads are stored in `/var/www/appvault/uploads`.

Back this folder up regularly.

## 10. Start With PM2

The included [ecosystem.config.cjs](./ecosystem.config.cjs) expects the app at `/var/www/appvault`.

Start:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 status
```

Enable startup after reboot:

```bash
pm2 startup
```

PM2 prints a command. Copy and run that command, then:

```bash
pm2 save
```

Check logs:

```bash
pm2 logs appvault
```

Check API:

```bash
curl http://127.0.0.1:4000/api/health
```

## 11. Configure Nginx

Copy the sample config:

```bash
cp deployment/nginx-appvault.conf /etc/nginx/sites-available/appvault
nano /etc/nginx/sites-available/appvault
```

Change:

```nginx
server_name example.com www.example.com;
```

To:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

Enable:

```bash
ln -s /etc/nginx/sites-available/apkvault /etc/nginx/sites-enabled/apkvault
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Open:

```text
http://yourdomain.com
http://yourdomain.com/admin
```

## 12. Add SSL Certificate

Install Certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

Issue certificate:

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Test renewal:

```bash
certbot renew --dry-run
```

## 13. Updating The Live Site

For future deploys:

```bash
cd /var/www/appvault
git pull
bash scripts/deploy-production.sh
```

If you uploaded files manually instead of Git, upload the new files first, then run:

```bash
cd /var/www/appvault
bash scripts/deploy-production.sh
```

Do not run `npm run db:seed` after real content exists unless you intentionally want to reset the seeded admin password and sample data.

## 14. Admin Panel

Open:

```text
https://yourdomain.com/admin
```

You can manage:

- Apps
- App versions
- APK download URL or uploaded file
- Icons and screenshots
- News
- Blog posts
- Static pages: About, Privacy Policy, DMCA, Disclaimer, Terms
- Categories
- App reports
- Contact messages

Static page changes do not require rebuild. They are saved in PostgreSQL and reflected from the API.

If you do not see the change:

1. Make sure page status is `published`.
2. Hard refresh browser with `Ctrl + F5`.
3. Check the API:

```bash
curl https://yourdomain.com/api/static-pages
```

## 15. Backups

Database backup:

```bash
mkdir -p /var/backups/appvault
pg_dump -U appvault_user -h 127.0.0.1 apkmiror > /var/backups/appvault/apkmiror-$(date +%F).sql
```

Upload files backup:

```bash
tar -czf /var/backups/appvault/uploads-$(date +%F).tar.gz /var/www/appvault/uploads
```

Restore database:

```bash
psql -U appvault_user -h 127.0.0.1 apkmiror < backup.sql
```

## 16. Useful Commands

Restart app:

```bash
pm2 restart appvault
```

View logs:

```bash
pm2 logs appvault
```

Nginx test and reload:

```bash
nginx -t
systemctl reload nginx
```

Check app health:

```bash
curl https://yourdomain.com/api/health
```

Check listening ports:

```bash
ss -tulpn | grep -E '4000|80|443'
```

## 17. Troubleshooting

If website shows Nginx default page:

```bash
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

If API health fails:

```bash
pm2 logs appvault
cat .env
```

If database connection fails:

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d apkmiror
```

If uploaded APK files fail:

```bash
ls -la uploads
chown -R $USER:www-data uploads
chmod -R 775 uploads
```

If admin login fails after changing `.env`:

Run seed once to update the admin password from `.env`:

```bash
npm run db:seed
pm2 restart appvault --update-env
```

Use this carefully because seed also ensures sample content exists.

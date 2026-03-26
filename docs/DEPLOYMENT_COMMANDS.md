# Deployment Commands — RAHE KABA Tours & Travels

> All working deployment and server management commands

---

## Standard Deployment (Most Common)

```bash
cd /var/www/rahe-kaba-journeys-72ccca69 && git pull && npm run build && pm2 restart rahekaba-api
```

After deploy, do a **hard refresh** in browser: `Ctrl + Shift + R`

---

## Step-by-Step Deployment

### 1. Pull Latest Code

```bash
cd /var/www/rahe-kaba-journeys-72ccca69
git pull origin main
```

### 2. Install Dependencies (if new packages added)

```bash
npm install
```

### 3. Build Frontend

```bash
npm run build
```

### 4. Restart API Server

```bash
pm2 restart rahekaba-api
```

---

## PM2 Commands

```bash
# Check status
pm2 status

# Restart
pm2 restart rahekaba-api

# Stop
pm2 stop rahekaba-api

# Start
pm2 start rahekaba-api

# View logs
pm2 logs rahekaba-api

# View logs (last 100 lines)
pm2 logs rahekaba-api --lines 100

# Monitor (real-time CPU/memory)
pm2 monit

# Save PM2 process list
pm2 save

# Startup script (auto-start on reboot)
pm2 startup
```

---

## Database Commands

```bash
# Access PostgreSQL
psql -U rahekaba_user -d rahekaba

# Run schema from file
psql -U rahekaba_user -d rahekaba -f /var/www/rahe-kaba-journeys-72ccca69/server/schema.sql

# Backup database
pg_dump -U rahekaba_user rahekaba > /var/www/rahe-kaba-journeys-72ccca69/server/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
psql -U rahekaba_user rahekaba < /path/to/backup.sql

# Check database size
psql -U rahekaba_user -d rahekaba -c "SELECT pg_size_pretty(pg_database_size('rahekaba'));"

# List all tables
psql -U rahekaba_user -d rahekaba -c "\dt"
```

---

## Nginx Commands

```bash
# Test config
nginx -t

# Reload (after config change)
systemctl reload nginx

# Restart
systemctl restart nginx

# View error logs
tail -f /var/log/nginx/error.log

# View access logs
tail -f /var/log/nginx/access.log
```

---

## Git Commands (Safe)

```bash
# Pull latest
git pull origin main

# Check status
git status

# View recent commits
git log --oneline -10

# Protect .env from being overwritten
git update-index --skip-worktree .env
```

> ⚠️ **NEVER run** `git reset --hard` without first backing up `server/.env` and `.env`

---

## Server Backend Environment

```bash
# Check if server/.env exists
cat server/.env

# Edit server/.env
nano server/.env
```

### Required `server/.env` variables:

```env
DATABASE_URL=postgresql://rahekaba_user:PASSWORD@localhost:5432/rahekaba
JWT_SECRET=your-jwt-secret-here
PORT=3001
FRONTEND_URL=https://yourdomain.com
```

---

## SSL/Certificate Renewal

```bash
# Renew Let's Encrypt certificate
certbot renew

# Force renewal
certbot renew --force-renewal

# Check certificate status
certbot certificates
```

---

## Full Server Restart (After VPS Reboot)

```bash
# Start PostgreSQL
systemctl start postgresql

# Start Nginx
systemctl start nginx

# Start PM2 processes
pm2 resurrect
```

---

## Troubleshooting

### API not responding

```bash
pm2 logs rahekaba-api --lines 50
```

### Build fails

```bash
cd /var/www/rahe-kaba-journeys-72ccca69
npm install
npm run build 2>&1 | tail -50
```

### Database connection error

```bash
systemctl status postgresql
psql -U rahekaba_user -d rahekaba -c "SELECT 1;"
```

### Disk space check

```bash
df -h
du -sh /var/www/rahe-kaba-journeys-72ccca69/
```

### Memory check

```bash
free -h
pm2 monit
```

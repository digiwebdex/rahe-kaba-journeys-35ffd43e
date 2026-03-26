# Troubleshooting Guide — RAHE KABA Tours & Travels

> Common issues and their solutions

---

## Frontend Issues

### Blank page / White screen

**Cause:** Build not completed or JavaScript error

**Fix:**
```bash
cd /var/www/rahe-kaba-journeys-72ccca69
npm run build
pm2 restart rahekaba-api
```

Then hard refresh: `Ctrl + Shift + R`

### "Failed to load notification settings"

**Cause:** Missing notification_settings records in DB

**Fix:** The settings page now creates default entries if none exist. Clear browser cache and reload.

### Language not switching

**Cause:** localStorage cached old language preference

**Fix:** Clear browser localStorage or use incognito mode:
```javascript
localStorage.removeItem('rk_language');
```

### Login not working

**Cause:** JWT token expired or server/.env misconfigured

**Fix:**
1. Check server is running: `pm2 status`
2. Check server logs: `pm2 logs rahekaba-api`
3. Verify `server/.env` has correct `JWT_SECRET` and `DATABASE_URL`

---

## Backend Issues

### API returns 500

**Cause:** Database connection error or code error

**Fix:**
```bash
# Check logs
pm2 logs rahekaba-api --lines 50

# Check database
psql -U rahekaba_user -d rahekaba -c "SELECT 1;"

# Restart
pm2 restart rahekaba-api
```

### "relation does not exist" error

**Cause:** Schema not fully applied

**Fix:**
```bash
psql -U rahekaba_user -d rahekaba -f server/schema.sql
```

### File upload fails

**Cause:** `uploads/` directory missing or no permissions

**Fix:**
```bash
mkdir -p /var/www/rahe-kaba-journeys-72ccca69/server/uploads
chmod 755 /var/www/rahe-kaba-journeys-72ccca69/server/uploads
```

---

## Database Issues

### Cannot connect to PostgreSQL

```bash
# Check if running
systemctl status postgresql

# Start if stopped
systemctl start postgresql

# Check connection
psql -U rahekaba_user -d rahekaba -c "SELECT 1;"
```

### Slow queries

```bash
# Check table sizes
psql -U rahekaba_user -d rahekaba -c "
  SELECT relname, n_tup_ins, n_tup_upd, n_tup_del
  FROM pg_stat_user_tables
  ORDER BY n_tup_ins DESC;
"
```

---

## Deployment Issues

### `git pull` fails with merge conflicts

```bash
# Stash local changes
git stash
git pull origin main
git stash pop
```

### npm install fails

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build out of memory

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

---

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED 5432` | PostgreSQL not running | `systemctl start postgresql` |
| `invalid input syntax for type uuid` | Malformed UUID in request | Check request parameters |
| `permission denied for table` | Wrong DB user | Check DATABASE_URL credentials |
| `CORS error` | FRONTEND_URL not matching | Update `server/.env` FRONTEND_URL |
| `413 Payload Too Large` | File too big | Max 5MB, update Nginx `client_max_body_size` |
| `.env overwritten after git pull` | File not protected | Run `git update-index --skip-worktree .env` |

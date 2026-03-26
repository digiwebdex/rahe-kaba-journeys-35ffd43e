# Deployment History — RAHE KABA Tours & Travels

> Complete deployment timeline and server operations history

---

## Server Information

| Field | Value |
|-------|-------|
| **VPS Provider** | Dedicated Server |
| **Server IP** | srv1468666 |
| **OS** | Ubuntu/Debian |
| **Project Path** | `/var/www/rahe-kaba-journeys-72ccca69` |
| **PM2 Process** | `rahekaba-api` |
| **Repository** | https://github.com/digiwebdex/rahe-kaba-journeys-f977239d |
| **Branch** | `main` |

---

## Deployment Timeline

### Phase 1: Initial Setup (Project Creation)

- **Architecture:** React/Vite frontend + Supabase backend (Lovable Cloud)
- **Features:** Basic landing page, package listing, authentication
- **Database:** Supabase-hosted PostgreSQL

### Phase 2: VPS Migration

- **Change:** Migrated from Supabase to self-hosted PostgreSQL + Express backend
- **Server:** Node.js/Express API on VPS with PM2
- **Database:** Self-hosted PostgreSQL with custom schema (`server/schema.sql`)
- **Files Created:**
  - `server/index.js` — Main API server
  - `server/config/database.js` — PostgreSQL connection pool
  - `server/middleware/auth.js` — JWT authentication
  - `server/routes/auth.js` — Auth endpoints
  - `server/schema.sql` — Complete database schema
  - `server/migrate-from-supabase.js` — Data migration script
  - `server/.env` — Backend environment variables

### Phase 3: Admin ERP Development

- Built complete admin panel with modules:
  - Bookings management
  - Customer management
  - Payment tracking
  - Moallem/Agent management
  - Supplier agent management
  - Accounting & transactions
  - Chart of accounts
  - Daily cashbook
  - Reports & exports
  - CMS content management
  - Notification system
  - Hotel management

### Phase 4: Financial System

- Implemented complete accounting system
- Added invoice generation with QR codes
- Digital signature for invoices
- Excel/PDF report exports
- Profit analysis views (booking, customer, package)

### Phase 5: Notification System

- SMS API integration
- SMTP email integration
- Admin configurable settings
- Notification logging

### Phase 6: Frontend Redesign (March 2026)

- **Theme:** Dark navy → Light cream/gold luxury theme
- **Hero:** Single image → 3-image auto-sliding carousel
- **Language:** Default changed from English to Bangla
- **New Sections:** Facilities section added
- **Package Cards:** Redesigned with image overlay pricing, rating badges
- **WhatsApp:** Moved to left side with Bengali label
- **Back to Top:** Added animated scroll-to-top button
- **Calligraphic:** Added Islamic ornamental patterns

### Phase 7: Settings & Configuration (March 2026)

- Admin password change functionality
- SMS/Email configuration panel
- Manual backup/restore system
- Notification settings manager

---

## Environment Protection

The following files are protected from `git reset --hard`:

```bash
git update-index --skip-worktree .env
# server/.env is .gitignored
```

This ensures deployment credentials and secrets are never overwritten.

---

## Infrastructure Notes

- **Nginx** serves the built frontend and reverse-proxies `/api/*` to Express (port 3001)
- **PM2** manages the Node.js process with auto-restart
- **PostgreSQL** runs locally on the VPS
- **SSL** via Nginx/Certbot (Let's Encrypt)
